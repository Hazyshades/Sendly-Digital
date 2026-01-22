/**
 * zkTLS HTTP API Service
 * 
 * HTTP API wrapper for the3cloud/zktls binary
 * 
 * Input JSON format is based on testdata/input.json from zktls repository
 */

// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const execAsync = promisify(exec);
const app = express();
const PORT = process.env.PORT || 3001;
const ZKTLS_BINARY = process.env.ZKTLS_BINARY || process.env.ZKTLS_PATH || '/root/Sendly/zktls-service/zktls/target/release/zktls';
// Default to r0 (Risc0) backend to avoid InvalidCertificate issue in SP1 with Twitter API
// Can switch to sp1 via env: ZKTLS_BACKEND=sp1
const ZKTLS_BACKEND = process.env.ZKTLS_BACKEND || 'r0';
const API_KEY = process.env.ZKTLS_API_KEY;

// Reclaim Protocol (kept on backend; do NOT expose secrets to frontend)
const RECLAIM_APP_ID = process.env.RECLAIM_APP_ID;
const RECLAIM_APP_SECRET = process.env.RECLAIM_APP_SECRET;
// Optional callback URL for server-to-server proof delivery
const RECLAIM_APP_CALLBACK_URL = process.env.RECLAIM_APP_CALLBACK_URL; // e.g. https://your-domain.com/api/reclaim/callback

// Privy (server-side OAuth token fetch)
const PRIVY_APP_ID = process.env.PRIVY_APP_ID;
const PRIVY_API_BASE_URL = process.env.PRIVY_API_BASE_URL || 'https://auth.privy.io';

// Twitter OAuth (server-side code exchange)
const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID;
const TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET;
// Twitter OAuth 1.0a (API key/secret)
const TWITTER_API_KEY = process.env.TWITTER_API_KEY;
const TWITTER_API_SECRET = process.env.TWITTER_API_SECRET;
// Twitch OAuth (client id is public but kept server-side when possible)
const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;

const oauth1RequestSecrets = new Map();

function percentEncode(value) {
  return encodeURIComponent(value)
    .replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

function buildOAuth1Header({ method, url, consumerKey, consumerSecret, token, tokenSecret, extraParams = {} }) {
  const parsedUrl = new URL(url);
  const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}${parsedUrl.pathname}`;

  const oauthParams = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_version: '1.0',
  };

  if (token) oauthParams.oauth_token = token;
  Object.entries(extraParams).forEach(([key, value]) => {
    if (value != null) {
      oauthParams[key] = String(value);
    }
  });

  const queryParams = [];
  parsedUrl.searchParams.forEach((value, key) => {
    queryParams.push([key, value]);
  });

  const allParams = [
    ...queryParams,
    ...Object.entries(oauthParams).filter(([key]) => key !== 'oauth_signature'),
  ];

  allParams.sort((a, b) => {
    if (a[0] === b[0]) {
      return a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0;
    }
    return a[0] < b[0] ? -1 : 1;
  });

  const paramString = allParams
    .map(([key, value]) => `${percentEncode(key)}=${percentEncode(value)}`)
    .join('&');

  const baseString = [
    method.toUpperCase(),
    percentEncode(baseUrl),
    percentEncode(paramString),
  ].join('&');

  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret || '')}`;
  const signature = crypto
    .createHmac('sha1', signingKey)
    .update(baseString)
    .digest('base64');

  oauthParams.oauth_signature = signature;

  const header = 'OAuth ' + Object.keys(oauthParams)
    .sort()
    .map((key) => `${percentEncode(key)}="${percentEncode(oauthParams[key])}"`)
    .join(', ');

  return { header, oauthParams };
}

// Provider IDs (configure per env; twitter default from Reclaim Dev Tool)
const RECLAIM_PROVIDER_ID_TWITTER =
  process.env.RECLAIM_PROVIDER_ID_TWITTER || 'e6fe962d-8b4e-4ce5-abcc-3d21c88bd64a';
const RECLAIM_PROVIDER_ID_TELEGRAM = process.env.RECLAIM_PROVIDER_ID_TELEGRAM;
const RECLAIM_PROVIDER_ID_TWITCH = process.env.RECLAIM_PROVIDER_ID_TWITCH || '6eefbc3f-9dd9-4466-a18f-ab9eea03d884'
const RECLAIM_PROVIDER_ID_INSTAGRAM = process.env.RECLAIM_PROVIDER_ID_INSTAGRAM;
const RECLAIM_PROVIDER_ID_TIKTOK = process.env.RECLAIM_PROVIDER_ID_TIKTOK;
const RECLAIM_PROVIDER_ID_GMAIL = process.env.RECLAIM_PROVIDER_ID_GMAIL;
const RECLAIM_PROVIDER_ID_LINKEDIN = process.env.RECLAIM_PROVIDER_ID_LINKEDIN;
const RECLAIM_PROVIDER_ID_GITHUB = process.env.RECLAIM_PROVIDER_ID_GITHUB;

async function fetchPrivyOAuthTokens(privyAccessToken) {
  if (!PRIVY_APP_ID) {
    throw new Error('Missing PRIVY_APP_ID');
  }
  const url = `${PRIVY_API_BASE_URL.replace(/\/$/, '')}/api/v1/users/me`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'privy-app-id': PRIVY_APP_ID,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${privyAccessToken}`,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Privy /users/me failed: ${res.status} ${body}`);
  }

  const json = await res.json();
  const oauthTokens = json?.oauth_tokens || json?.user?.oauth_tokens || null;
  if (!oauthTokens) {
    return [];
  }
  return Array.isArray(oauthTokens) ? oauthTokens : [oauthTokens];
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Simple API key authentication (optional)
const requireAuth = (req, res, next) => {
  if (!API_KEY) {
    return next();
  }
  
  const providedKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  if (providedKey !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
  }
  next();
};

// Reclaim endpoints don't require auth (they use Reclaim's own security)
const noAuth = (req, res, next) => next();

/**
 * Convert string to hex format (0x...)
 */
function stringToHex(str) {
  return '0x' + Buffer.from(str, 'utf8').toString('hex');
}

/**
 * Parse URL and extract host, port, path
 */
function parseUrl(urlString) {
  try {
    const url = new URL(urlString);
    const host = url.hostname;
    const port = url.port || (url.protocol === 'https:' ? 443 : 80);
    const path = url.pathname + url.search;
    
    return {
      host,
      port: parseInt(port, 10),
      path: path || '/',
      isHttps: url.protocol === 'https:',
    };
  } catch (error) {
    throw new Error(`Invalid URL: ${urlString}`);
  }
}

/**
 * Build RAW HTTP request
 */
function buildRawHttpRequest(url, method = 'GET', headers = {}) {
  const parsed = parseUrl(url);
  const hostHeader = parsed.port === 443 || parsed.port === 80
    ? parsed.host
    : `${parsed.host}:${parsed.port}`;
  
  // Base headers
  const defaultHeaders = {
    'Host': hostHeader,
    'Accept': '*/*',
    'User-Agent': 'zkTLS/1.0',
  };
  
  // Merge headers
  const allHeaders = { ...defaultHeaders, ...headers };
  
  // Build RAW HTTP request
  const requestLine = `${method} ${parsed.path} HTTP/1.1\r\n`;
  const headerLines = Object.entries(allHeaders)
    .map(([key, value]) => `${key}: ${value}\r\n`)
    .join('');
  
  const rawRequest = requestLine + headerLines + '\r\n';
  
  return {
    rawRequest,
    parsedUrl: parsed,
  };
}

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      version: '1.0.0',
      service: 'zktls-service',
      reclaim_configured: !!(RECLAIM_APP_ID && RECLAIM_APP_SECRET),
      port: PORT,
    };
    
    // Try to check zktls binary if configured (optional)
    if (ZKTLS_BINARY && ZKTLS_BINARY !== '/root/Sendly/zktls-service/zktls/target/release/zktls') {
      try {
        const { stdout } = await execAsync(`${ZKTLS_BINARY} --version`, { timeout: 5000 });
        health.zktls_version = stdout.trim();
        health.backend = ZKTLS_BACKEND;
      } catch (error) {
        health.zktls_note = 'zktls binary not available (optional for Reclaim Protocol)';
      }
    }
    
    res.json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: 'Service error',
      message: error.message,
    });
  }
});

const SUPPORTED_PLATFORMS = new Set([
  'twitter',
  'twitch',
  'github',
  'instagram',
  'tiktok',
  'gmail',
  'linkedin',
  'telegram',
]);

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch (_) {
    return value;
  }
}

function normalizePlatform(platform) {
  const decoded = safeDecode(String(platform || '')).trim().toLowerCase();
  const normalized = decoded === 'x' ? 'twitter' : decoded;
  return SUPPORTED_PLATFORMS.has(normalized) ? normalized : '';
}

function normalizeUsername(username) {
  const decoded = safeDecode(String(username || '')).trim();
  if (!decoded) return '';
  return decoded.toLowerCase();
}

function getReclaimProviderId(platform) {
  const p = normalizePlatform(platform);
  if (!p) return undefined;
  if (p === 'twitter') return RECLAIM_PROVIDER_ID_TWITTER;
  if (p === 'telegram') return RECLAIM_PROVIDER_ID_TELEGRAM;
  if (p === 'twitch') return RECLAIM_PROVIDER_ID_TWITCH;
  if (p === 'instagram') return RECLAIM_PROVIDER_ID_INSTAGRAM;
  if (p === 'tiktok') return RECLAIM_PROVIDER_ID_TIKTOK;
  if (p === 'gmail') return RECLAIM_PROVIDER_ID_GMAIL;
  if (p === 'linkedin') return RECLAIM_PROVIDER_ID_LINKEDIN;
  if (p === 'github') return RECLAIM_PROVIDER_ID_GITHUB;
  return undefined;
}

function buildIdentity(platform, username) {
  const p = normalizePlatform(platform);
  const u = normalizeUsername(username);
  if (!p || !u) {
    return '';
  }
  return `${p}:${u}`;
}

/**
 * Reclaim: build proof request config (server-side)
 * Docs: https://docs.reclaimprotocol.org/js-sdk/preparing-request
 */
app.get('/api/reclaim/config', noAuth, async (req, res) => {
  try {
    if (!RECLAIM_APP_ID || !RECLAIM_APP_SECRET) {
      return res.status(500).json({
        error: 'Reclaim is not configured on backend',
        required: ['RECLAIM_APP_ID', 'RECLAIM_APP_SECRET'],
      });
    }

    const { platform, username, paymentId, recipient, redirectUrl } = req.query;
    if (!platform) {
      return res.status(400).json({ error: 'Missing required query param: platform' });
    }

    const providerId = getReclaimProviderId(platform);
    if (!providerId) {
      return res.status(400).json({
        error: 'Unsupported platform or missing RECLAIM_PROVIDER_ID_* env var',
        platform,
      });
    }

    const { ReclaimProofRequest } = await import('@reclaimprotocol/js-sdk');

    const reclaimProofRequest = await ReclaimProofRequest.init(
      RECLAIM_APP_ID,
      RECLAIM_APP_SECRET,
      providerId
    );

    const identity = buildIdentity(platform, username);
    if (!identity) {
      return res.status(400).json({ error: 'Missing required query params: platform and username' });
    }

    // Context is returned in proof and helps correlate with zkSEND payment
    const contextAddress = recipient || 'anonymous';
    const contextMessage = identity;
    reclaimProofRequest.setContext(contextAddress, contextMessage);

    // Optional: redirect user after proof generation (useful for mobile QR flow)
    if (redirectUrl) {
      try {
        reclaimProofRequest.setRedirectUrl(String(redirectUrl));
      } catch (_) {}
    }

    // Optional: set backend callback url (Reclaim will POST proofs server-to-server)
    if (RECLAIM_APP_CALLBACK_URL) {
      // useJson=true => send proof as raw JSON
      reclaimProofRequest.setAppCallbackUrl(RECLAIM_APP_CALLBACK_URL, true);
    }

    const reclaimProofRequestConfig = reclaimProofRequest.toJsonString();
    return res.json({ reclaimProofRequestConfig });
  } catch (error) {
    console.error('[Reclaim] Failed to build config:', error);
    return res.status(500).json({ error: error.message || 'Failed to build Reclaim config' });
  }
});

/**
 * Reclaim: verify proofs (server-side)
 * Docs: https://docs.reclaimprotocol.org/js-sdk/verifying-proofs
 */
app.post('/api/reclaim/verify', noAuth, async (req, res) => {
  try {
    const proofs = req.body?.proofs;
    if (!proofs) {
      return res.status(400).json({ error: 'Missing body.proofs' });
    }

    const { verifyProof } = await import('@reclaimprotocol/js-sdk');
    const isValid = await verifyProof(proofs);

    // Best-effort context extraction (structure varies by provider/SDK)
    const proof0 = Array.isArray(proofs) ? proofs[0] : proofs;
    const claimData = proof0?.claimData || proof0?.claim || proof0?.claimInfo || null;
    const contextStr = claimData?.context || proof0?.context || null;

    let context = null;
    if (contextStr && typeof contextStr === 'string') {
      try {
        context = JSON.parse(contextStr);
      } catch (_) {
        context = { raw: contextStr };
      }
    }

    return res.json({ isValid, context });
  } catch (error) {
    console.error('[Reclaim] verify failed:', error);
    return res.status(500).json({ error: error.message || 'Failed to verify proofs' });
  }
});

/**
 * Reclaim zkFetch: generate frontend session signature (server-side).
 * Docs: https://docs.reclaimprotocol.org/zkfetch/installation
 */
app.post('/api/reclaim/zkfetch/signature', noAuth, async (req, res) => {
  try {
    if (!RECLAIM_APP_ID || !RECLAIM_APP_SECRET) {
      return res.status(500).json({
        error: 'Reclaim is not configured on backend',
        required: ['RECLAIM_APP_ID', 'RECLAIM_APP_SECRET'],
      });
    }

    const { allowedUrls, expiresAt } = req.body || {};
    if (!Array.isArray(allowedUrls) || allowedUrls.length === 0) {
      return res.status(400).json({ error: 'Missing body.allowedUrls (array)' });
    }

    const sanitizedUrls = allowedUrls
      .map((url) => String(url).trim())
      .filter((url) => url.length > 0);

    if (sanitizedUrls.length === 0) {
      return res.status(400).json({ error: 'allowedUrls must contain at least one non-empty URL' });
    }

    const { generateSessionSignature } = await import('@reclaimprotocol/zk-fetch');
    const signature = await generateSessionSignature({
      applicationId: RECLAIM_APP_ID,
      applicationSecret: RECLAIM_APP_SECRET,
      allowedUrls: sanitizedUrls,
      expiresAt: typeof expiresAt === 'number' ? expiresAt : undefined,
    });

    return res.json({ signature });
  } catch (error) {
    console.error('[Reclaim] zkFetch signature failed:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate zkFetch signature' });
  }
});

/**
 * Twitter OAuth: exchange authorization code for access token (server-side).
 */
app.post('/api/twitter/oauth/exchange', noAuth, async (req, res) => {
  try {
    if (!TWITTER_CLIENT_ID) {
      return res.status(500).json({ error: 'Missing TWITTER_CLIENT_ID' });
    }

    const { code, redirectUri, codeVerifier } = req.body || {};
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Missing body.code (string)' });
    }
    if (!redirectUri || typeof redirectUri !== 'string') {
      return res.status(400).json({ error: 'Missing body.redirectUri (string)' });
    }

    const params = new URLSearchParams();
    params.set('grant_type', 'authorization_code');
    params.set('client_id', TWITTER_CLIENT_ID);
    params.set('code', code);
    params.set('redirect_uri', redirectUri);
    if (codeVerifier && typeof codeVerifier === 'string') {
      params.set('code_verifier', codeVerifier);
    }

    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    };

    if (TWITTER_CLIENT_SECRET) {
      const basic = Buffer.from(`${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`).toString('base64');
      headers.Authorization = `Basic ${basic}`;
    }

    const tokenRes = await fetch('https://api.x.com/2/oauth2/token', {
      method: 'POST',
      headers,
      body: params.toString(),
    });

    const bodyText = await tokenRes.text().catch(() => '');
    if (!tokenRes.ok) {
      console.error('[Twitter OAuth] token exchange failed:', {
        status: tokenRes.status,
        body: bodyText.slice(0, 1000),
      });
      return res.status(tokenRes.status).json({
        error: 'Twitter token exchange failed',
        status: tokenRes.status,
        body: bodyText.slice(0, 1000),
      });
    }

    let tokenJson;
    try {
      tokenJson = JSON.parse(bodyText);
    } catch (parseError) {
      return res.status(500).json({ error: 'Failed to parse Twitter token response' });
    }

    return res.json({
      success: true,
      accessToken: tokenJson.access_token,
      refreshToken: tokenJson.refresh_token,
      scope: tokenJson.scope,
      tokenType: tokenJson.token_type,
      expiresIn: tokenJson.expires_in,
    });
  } catch (error) {
    console.error('[Twitter OAuth] exchange failed:', error);
    return res.status(500).json({ error: error.message || 'Twitter OAuth exchange failed' });
  }
});

/**
 * Twitter OAuth 1.0a: request token
 */
app.post('/api/twitter/oauth1/request-token', noAuth, async (req, res) => {
  try {
    if (!TWITTER_API_KEY || !TWITTER_API_SECRET) {
      return res.status(500).json({ error: 'Missing TWITTER_API_KEY or TWITTER_API_SECRET' });
    }

    const { callbackUrl } = req.body || {};
    if (!callbackUrl || typeof callbackUrl !== 'string') {
      return res.status(400).json({ error: 'Missing body.callbackUrl (string)' });
    }

    const url = 'https://api.x.com/oauth/request_token';
    const { header } = buildOAuth1Header({
      method: 'POST',
      url,
      consumerKey: TWITTER_API_KEY,
      consumerSecret: TWITTER_API_SECRET,
      extraParams: { oauth_callback: callbackUrl },
    });

    const tokenRes = await fetch(url, {
      method: 'POST',
      headers: { Authorization: header },
    });

    const bodyText = await tokenRes.text().catch(() => '');
    if (!tokenRes.ok) {
      console.error('[Twitter OAuth1] request token failed:', {
        status: tokenRes.status,
        body: bodyText.slice(0, 1000),
      });
      return res.status(tokenRes.status).json({
        error: 'Twitter OAuth1 request token failed',
        status: tokenRes.status,
        body: bodyText.slice(0, 1000),
      });
    }

    const params = new URLSearchParams(bodyText);
    const oauthToken = params.get('oauth_token');
    const oauthTokenSecret = params.get('oauth_token_secret');
    if (!oauthToken || !oauthTokenSecret) {
      return res.status(500).json({ error: 'Missing oauth_token in response' });
    }

    oauth1RequestSecrets.set(oauthToken, oauthTokenSecret);

    return res.json({
      success: true,
      oauthToken,
    });
  } catch (error) {
    console.error('[Twitter OAuth1] request token error:', error);
    return res.status(500).json({ error: error.message || 'Twitter OAuth1 request token failed' });
  }
});

/**
 * Twitter OAuth 1.0a: access token exchange
 */
app.post('/api/twitter/oauth1/access-token', noAuth, async (req, res) => {
  try {
    if (!TWITTER_API_KEY || !TWITTER_API_SECRET) {
      return res.status(500).json({ error: 'Missing TWITTER_API_KEY or TWITTER_API_SECRET' });
    }

    const { oauthToken, oauthVerifier } = req.body || {};
    if (!oauthToken || typeof oauthToken !== 'string') {
      return res.status(400).json({ error: 'Missing body.oauthToken (string)' });
    }
    if (!oauthVerifier || typeof oauthVerifier !== 'string') {
      return res.status(400).json({ error: 'Missing body.oauthVerifier (string)' });
    }

    const tokenSecret = oauth1RequestSecrets.get(oauthToken);
    if (!tokenSecret) {
      return res.status(400).json({ error: 'Unknown oauthToken; restart OAuth1 flow' });
    }

    const url = 'https://api.x.com/oauth/access_token';
    const { header } = buildOAuth1Header({
      method: 'POST',
      url,
      consumerKey: TWITTER_API_KEY,
      consumerSecret: TWITTER_API_SECRET,
      token: oauthToken,
      tokenSecret,
      extraParams: { oauth_verifier: oauthVerifier },
    });

    const bodyParams = new URLSearchParams();
    bodyParams.set('oauth_verifier', oauthVerifier);

    const tokenRes = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: header,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: bodyParams.toString(),
    });

    const bodyText = await tokenRes.text().catch(() => '');
    if (!tokenRes.ok) {
      console.error('[Twitter OAuth1] access token failed:', {
        status: tokenRes.status,
        body: bodyText.slice(0, 1000),
      });
      return res.status(tokenRes.status).json({
        error: 'Twitter OAuth1 access token failed',
        status: tokenRes.status,
        body: bodyText.slice(0, 1000),
      });
    }

    oauth1RequestSecrets.delete(oauthToken);

    const params = new URLSearchParams(bodyText);
    return res.json({
      success: true,
      oauthToken: params.get('oauth_token'),
      oauthTokenSecret: params.get('oauth_token_secret'),
      userId: params.get('user_id'),
      screenName: params.get('screen_name'),
    });
  } catch (error) {
    console.error('[Twitter OAuth1] access token error:', error);
    return res.status(500).json({ error: error.message || 'Twitter OAuth1 access token failed' });
  }
});

/**
 * Twitter diagnostics: check access to user-context v2 endpoints.
 */
app.post('/api/twitter/diagnose', noAuth, async (req, res) => {
  try {
    const { accessToken, username } = req.body || {};
    if (!accessToken || typeof accessToken !== 'string') {
      return res.status(400).json({ error: 'Missing body.accessToken (string)' });
    }

    const diagnostics = {};

    const userHeaders = { Authorization: `Bearer ${accessToken}` };
    const meUrl = 'https://api.x.com/2/users/me?user.fields=username';
    const meRes = await fetch(meUrl, { method: 'GET', headers: userHeaders });
    const meBody = await meRes.text().catch(() => '');
    diagnostics.userContextMe = {
      status: meRes.status,
      body: meBody.slice(0, 2000),
      headers: {
        accessLevel: meRes.headers.get('x-access-level') || null,
        requestId: meRes.headers.get('x-request-id') || null,
        wwwAuthenticate: meRes.headers.get('www-authenticate') || null,
      },
    };

    if (username && typeof username === 'string') {
      const safeUsername = encodeURIComponent(username);
      const byUsernameUrl = `https://api.x.com/2/users/by/username/${safeUsername}`;
      const userByRes = await fetch(byUsernameUrl, { method: 'GET', headers: userHeaders });
      const userByBody = await userByRes.text().catch(() => '');
      diagnostics.userContextByUsername = {
        status: userByRes.status,
        body: userByBody.slice(0, 2000),
        headers: {
          accessLevel: userByRes.headers.get('x-access-level') || null,
          requestId: userByRes.headers.get('x-request-id') || null,
          wwwAuthenticate: userByRes.headers.get('www-authenticate') || null,
        },
      };
    }

    if (TWITTER_CLIENT_ID && TWITTER_CLIENT_SECRET && username && typeof username === 'string') {
      const params = new URLSearchParams();
      params.set('grant_type', 'client_credentials');

      const basic = Buffer.from(`${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`).toString('base64');
      const appTokenRes = await fetch('https://api.x.com/2/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'Authorization': `Basic ${basic}`,
        },
        body: params.toString(),
      });
      const appTokenBody = await appTokenRes.text().catch(() => '');

      let appAccessToken = '';
      try {
        const parsed = JSON.parse(appTokenBody);
        appAccessToken = parsed?.access_token || '';
      } catch (_) {
        appAccessToken = '';
      }

      diagnostics.appOnlyToken = {
        status: appTokenRes.status,
        body: appTokenBody.slice(0, 2000),
      };

      if (appAccessToken) {
        const safeUsername = encodeURIComponent(username);
        const byUsernameUrl = `https://api.x.com/2/users/by/username/${safeUsername}`;
        const appByRes = await fetch(byUsernameUrl, {
          method: 'GET',
          headers: { Authorization: `Bearer ${appAccessToken}` },
        });
        const appByBody = await appByRes.text().catch(() => '');
        diagnostics.appOnlyByUsername = {
          status: appByRes.status,
          body: appByBody.slice(0, 2000),
          headers: {
            accessLevel: appByRes.headers.get('x-access-level') || null,
            requestId: appByRes.headers.get('x-request-id') || null,
            wwwAuthenticate: appByRes.headers.get('www-authenticate') || null,
          },
        };
      }
    }

    console.log('[Twitter Diagnose] result:', JSON.stringify(diagnostics, null, 2));
    return res.json({ ok: true, diagnostics });
  } catch (error) {
    console.error('[Twitter Diagnose] failed:', error);
    return res.status(500).json({ error: error.message || 'Twitter diagnose failed' });
  }
});

/**
 * Reclaim zkFetch: generate proof on backend (browser-safe).
 * Avoids .node/native dependencies in frontend bundlers.
 */
app.post('/api/reclaim/zkfetch/prove', noAuth, async (req, res) => {
  try {
    if (!RECLAIM_APP_ID || !RECLAIM_APP_SECRET) {
      return res.status(500).json({
        error: 'Reclaim is not configured on backend',
        required: ['RECLAIM_APP_ID', 'RECLAIM_APP_SECRET'],
      });
    }

    const {
      requestUrl,
      accessToken,
      platform,
      username,
      paymentId,
      recipient,
      responseMatches,
      oauth1,
      clientId,
    } = req.body || {};
    if (!recipient || typeof recipient !== 'string') {
      return res.status(400).json({ error: 'Missing body.recipient (string)' });
    }

    const normalizedPlatform = normalizePlatform(platform);
    if (!normalizedPlatform) {
      return res.status(400).json({ error: 'Missing or unsupported body.platform' });
    }

    const identity = buildIdentity(normalizedPlatform, username);
    if (!identity) {
      return res.status(400).json({ error: 'Missing body.platform or body.username (required for on-chain claim)' });
    }

    const oauth1Token = oauth1?.token;
    const oauth1TokenSecret = oauth1?.tokenSecret;
    const useOAuth1 = typeof oauth1Token === 'string' && typeof oauth1TokenSecret === 'string';

    let effectiveAccessToken = typeof accessToken === 'string' ? accessToken : '';
    let effectiveClientId = typeof clientId === 'string' ? clientId : '';

    if (normalizedPlatform === 'twitter') {
      if (!effectiveAccessToken) {
        const authHeader = req.headers['authorization'];
        if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
          const privyAccessToken = authHeader.slice('Bearer '.length).trim();
          if (!privyAccessToken) {
            return res.status(401).json({ error: 'Missing Privy access token' });
          }

          try {
            const oauthTokens = await fetchPrivyOAuthTokens(privyAccessToken);
            const twitterToken =
              oauthTokens.find((t) => t?.provider === 'twitter' || t?.provider === 'twitter_oauth') || oauthTokens[0];
            effectiveAccessToken = twitterToken?.access_token || '';
          } catch (privyError) {
            console.error('[Reclaim] Failed to fetch Privy OAuth tokens:', privyError);
            return res.status(401).json({ error: 'Privy OAuth token retrieval failed' });
          }
        }
      }

      if (!effectiveAccessToken && !useOAuth1) {
        return res.status(401).json({ error: 'Missing Twitter OAuth access token' });
      }
    } else if (normalizedPlatform === 'twitch') {
      if (!effectiveAccessToken) {
        return res.status(401).json({ error: 'Missing Twitch OAuth access token' });
      }
      if (!effectiveClientId) {
        effectiveClientId = TWITCH_CLIENT_ID || '';
      }
      if (!effectiveClientId) {
        return res.status(400).json({ error: 'Missing Twitch client id' });
      }
    } else {
      return res.status(400).json({ error: `Unsupported platform for zkFetch: ${normalizedPlatform}` });
    }

    const effectiveRequestUrl =
      typeof requestUrl === 'string' && requestUrl.length > 0
        ? requestUrl
        : normalizedPlatform === 'twitter'
        ? useOAuth1
          ? 'https://api.x.com/1.1/account/verify_credentials.json?include_email=false&skip_status=true'
          : 'https://api.x.com/2/users/me?user.fields=username'
        : 'https://api.twitch.tv/helix/users';

    const allowedUrls = [effectiveRequestUrl];
    const contextMessage = identity;

    // Preflight check: verify tokens before invoking zkFetch
    try {
      let preflightHeaders = {
        accept: 'application/json',
      };
      if (normalizedPlatform === 'twitter') {
        if (useOAuth1) {
          const { header } = buildOAuth1Header({
            method: 'GET',
            url: effectiveRequestUrl,
            consumerKey: TWITTER_API_KEY,
            consumerSecret: TWITTER_API_SECRET,
            token: oauth1Token,
            tokenSecret: oauth1TokenSecret,
          });
          preflightHeaders.Authorization = header;
        } else {
          preflightHeaders.Authorization = `Bearer ${effectiveAccessToken}`;
        }
      } else {
        preflightHeaders.Authorization = `Bearer ${effectiveAccessToken}`;
        preflightHeaders['Client-Id'] = effectiveClientId;
      }

      const preflightRes = await fetch(effectiveRequestUrl, {
        method: 'GET',
        headers: preflightHeaders,
      });
      if (!preflightRes.ok) {
        const body = await preflightRes.text().catch(() => '');
        const headers = {
          accessLevel: preflightRes.headers.get('x-access-level') || null,
          rateLimitRemaining: preflightRes.headers.get('x-rate-limit-remaining') || null,
          rateLimitReset: preflightRes.headers.get('x-rate-limit-reset') || null,
          requestId: preflightRes.headers.get('x-request-id') || null,
          wwwAuthenticate: preflightRes.headers.get('www-authenticate') || null,
        };
        console.error(`[Reclaim] ${normalizedPlatform} preflight error:`, {
          status: preflightRes.status,
          headers,
          body: body.slice(0, 1000),
        });
        return res.status(preflightRes.status).json({
          error: `${normalizedPlatform} API returned an error for provided access token`,
          status: preflightRes.status,
          headers,
          body: body.slice(0, 1000),
        });
      }
    } catch (preflightError) {
      console.error(`[Reclaim] ${normalizedPlatform} preflight failed:`, preflightError);
      return res.status(502).json({
        error: `Failed to validate ${normalizedPlatform} access token`,
      });
    }

    const { generateSessionSignature, ReclaimClient } = await import('@reclaimprotocol/zk-fetch');
    const signature = await generateSessionSignature({
      applicationId: RECLAIM_APP_ID,
      applicationSecret: RECLAIM_APP_SECRET,
      allowedUrls,
    });

    const client = new ReclaimClient(RECLAIM_APP_ID, signature);
    let requestHeaders = { accept: 'application/json' };
    let proofHeaders = {};
    if (normalizedPlatform === 'twitter') {
      if (useOAuth1) {
        const { header } = buildOAuth1Header({
          method: 'GET',
          url: effectiveRequestUrl,
          consumerKey: TWITTER_API_KEY,
          consumerSecret: TWITTER_API_SECRET,
          token: oauth1Token,
          tokenSecret: oauth1TokenSecret,
        });
        proofHeaders = { Authorization: header };
      } else {
        proofHeaders = { Authorization: `Bearer ${effectiveAccessToken}` };
      }
    } else {
      requestHeaders = {
        ...requestHeaders,
        'Client-Id': effectiveClientId,
      };
      proofHeaders = {
        Authorization: `Bearer ${effectiveAccessToken}`,
        'Client-Id': effectiveClientId,
      };
    }

    const proof = await client.zkFetch(
      effectiveRequestUrl,
      {
        method: 'GET',
        headers: requestHeaders,
        context: {
          contextAddress: recipient,
          contextMessage,
        },
      },
      {
        headers: proofHeaders,
        responseMatches: Array.isArray(responseMatches) && responseMatches.length > 0
          ? responseMatches
          : [
              {
                type: 'regex',
                value: normalizedPlatform === 'twitter'
                  ? useOAuth1
                    ? '"screen_name":"(?<username>[^"]+)"'
                    : '"username":"(?<username>[^"]+)"'
                  : '"login":"(?<username>[^"]+)"',
              },
            ],
      }
    );

    return res.json({ proof });
  } catch (error) {
    console.error('[Reclaim] zkFetch prove failed:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate zkFetch proof' });
  }
});

/**
 * Reclaim: optional server-to-server callback endpoint.
 * If you enable `setAppCallbackUrl` on the request, Reclaim will POST proofs here.
 */
app.post('/api/reclaim/callback', noAuth, async (req, res) => {
  try {
    const body = req.body;
    const proofs =
      typeof body === 'string'
        ? JSON.parse(body)
        : typeof body?.proofs === 'string'
        ? JSON.parse(body.proofs)
        : body?.proofs || body;

    const { verifyProof } = await import('@reclaimprotocol/js-sdk');
    const isValid = await verifyProof(proofs);

    return res.json({ ok: true, isValid });
  } catch (error) {
    console.error('[Reclaim] callback failed:', error);
    return res.status(400).json({ ok: false, error: error.message || 'Invalid callback payload' });
  }
});

// Generate proof
app.post('/api/proof/generate', requireAuth, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { platform, targetUrl, extractionPattern, oauthToken } = req.body;

    // Validation
    if (!platform || !targetUrl || !oauthToken) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['platform', 'targetUrl', 'oauthToken'],
      });
    }

    if (!extractionPattern || typeof extractionPattern !== 'object') {
      return res.status(400).json({
        error: 'extractionPattern must be an object',
      });
    }

    console.log(`[zkTLS] Generating proof for platform: ${platform}, URL: ${targetUrl}, backend: ${ZKTLS_BACKEND}`);

    // Build RAW HTTP request with OAuth token
    const headers = {
      'Authorization': `Bearer ${oauthToken}`,
      'Accept': 'application/json',
    };
    
    const { rawRequest, parsedUrl } = buildRawHttpRequest(targetUrl, 'GET', headers);
    
    // Convert to hex
    const requestHex = stringToHex(rawRequest);
    
    // Build remote_addr (host:port)
    const remoteAddr = parsedUrl.isHttps 
      ? `${parsedUrl.host}:443`
      : parsedUrl.port === 80
      ? `${parsedUrl.host}:80`
      : `${parsedUrl.host}:${parsedUrl.port}`;
    
    // Build response_template based on extractionPattern
    // IMPORTANT: Temporarily using empty array, as in testdata/input.json
    // TODO: Figure out response_template format for populated arrays
    const responseTemplate = [];
    
    // Temporarily disabled - causes "missing field `type`" error
    // if (extractionPattern.username) {
    //   responseTemplate.push({
    //     keyName: 'username',
    //     parseType: 'string',
    //     parsePath: platform === 'twitter' ? '$.data.username' : '$.username',
    //   });
    // }
    // if (extractionPattern.userId) {
    //   responseTemplate.push({
    //     keyName: 'userId',
    //     parseType: 'string',
    //     parsePath: platform === 'twitter' ? '$.data.id' : '$.id',
    //   });
    // }

    // Create input JSON in zktls format (based on testdata/input.json)
    const inputData = {
      version: 1,
      request_info: {
        request: requestHex,
        remote_addr: remoteAddr,
        server_name: parsedUrl.host,
      },
      response_template: responseTemplate,
      target: {
        // Using values from testdata/input.json for testing
        client: "0x95222290dd7278aa3ddd389cc1e1d165cc4bafe5",
        prover_id: "0xe19cb336d24b30c013e7bdb2e93659d6086672be7191a02262a7e032ceb43fc9",
        submit_network_id: 1,
      },
      origin: {
        type: "secp256k1",
        // Using signature from testdata/input.json for testing
        // In production, need to use real signature
        signature: "0x61600537178396fc1cb1abf2d880d6f0805d8969f672c4181857436ae5d0225875ffd4a212ced58dabe760b7e248a3f9ab1c9acf32bce1983e05c1ba9e3e228700",
        nonce: 0,
      },
    };

    const inputFile = path.join(os.tmpdir(), `zktls_input_${crypto.randomUUID()}.json`);
    await fs.writeFile(inputFile, JSON.stringify(inputData, null, 2));
    
    // Log created JSON for debugging
    console.log('[zkTLS] Input JSON:', JSON.stringify(inputData, null, 2));

    try {
      console.log(`[zkTLS] Calling zktls binary: ${ZKTLS_BINARY}`);
      const command = `${ZKTLS_BINARY} prove -i ${inputFile} -t evm -p ${ZKTLS_BACKEND}`;
      console.log(`[zkTLS] Using backend: ${ZKTLS_BACKEND}`);
      console.log(`[zkTLS] Command: ${command}`);
      
      // Increase timeout to 10 minutes (600000 ms) for proof generation
      // Generation can take 5-10 minutes depending on complexity
      const { stdout, stderr } = await execAsync(command, { 
        timeout: 600000, // 10 minutes
        maxBuffer: 50 * 1024 * 1024, // 50MB for large proofs
        env: { ...process.env, RUST_LOG: 'info' },
        killSignal: 'SIGKILL', // Use SIGKILL instead of SIGTERM for more reliable termination
      });

      if (stderr && !stdout) {
        throw new Error(`zktls stderr: ${stderr}`);
      }

      let proofData;
      try {
        proofData = JSON.parse(stdout);
      } catch (parseError) {
        console.error('[zkTLS] Failed to parse JSON output:', stdout);
        throw new Error(`Failed to parse zktls output: ${parseError.message}`);
      }

      // Don't delete file on error for debugging
      // await fs.unlink(inputFile).catch(() => {});
      console.log(`[zkTLS] Input file preserved at: ${inputFile}`);

      const duration = Date.now() - startTime;
      console.log(`[zkTLS] Proof generated successfully in ${duration}ms`);

      // Return in format expected by frontend
      const response = {
        proof: proofData.proof || proofData.proof_hex || proofData.proof_data || JSON.stringify(proofData),
        publicInputs: proofData.public_inputs || proofData.publicInputs || proofData.public_inputs_array || [],
        verificationResult: {
          usernameHash: proofData.username_hash || proofData.usernameHash || proofData.verification_result?.usernameHash || '',
          userId: proofData.user_id || proofData.userId || proofData.verification_result?.userId,
          platform: platform,
        },
        expiresAt: Date.now() + 3600000,
        generatedAt: Date.now(),
      };

      if (!response.proof) {
        throw new Error('Proof not found in zktls output');
      }

      if (!Array.isArray(response.publicInputs) || response.publicInputs.length === 0) {
        console.warn('[zkTLS] Warning: publicInputs is empty or not an array');
      }

      res.json(response);
    } catch (error) {
      // Don't delete file on error for debugging
      // await fs.unlink(inputFile).catch(() => {});
      console.log(`[zkTLS] Input file preserved at: ${inputFile}`);
      const duration = Date.now() - startTime;
      console.error(`[zkTLS] Error generating proof (${duration}ms):`, error);
      
      // Log file content for debugging
      try {
        const fileContent = await fs.readFile(inputFile, 'utf8');
        console.error('[zkTLS] Input file content:', fileContent);
      } catch (readError) {
        // Ignore read error
      }
      
      res.status(500).json({
        error: 'Failed to generate proof',
        message: error.message,
        stderr: error.stderr || error.message,
      });
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[zkTLS] Unexpected error (${duration}ms):`, error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[zkTLS] Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 zkTLS Service running on port ${PORT}`);
  console.log(`📦 zktls binary: ${ZKTLS_BINARY}`);
  console.log(`⚙️  Backend: ${ZKTLS_BACKEND}`);
  console.log(`🔑 API Key: ${API_KEY ? 'Configured' : 'Not configured (public access)'}`);
  console.log(`\n📖 Endpoints:`);
  console.log(`   GET  /api/health`);
  console.log(`   GET  /api/reclaim/config`);
  console.log(`   POST /api/reclaim/verify`);
  console.log(`   POST /api/reclaim/zkfetch/signature`);
  console.log(`   POST /api/reclaim/zkfetch/prove`);
  console.log(`   POST /api/twitter/oauth/exchange`);
  console.log(`   POST /api/twitter/oauth1/request-token`);
  console.log(`   POST /api/twitter/oauth1/access-token`);
  console.log(`   POST /api/twitter/diagnose`);
  console.log(`   POST /api/reclaim/callback (optional)`);
  console.log(`   POST /api/proof/generate`);
});
