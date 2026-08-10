const { test } = require('node:test');
const assert = require('node:assert/strict');
const { register } = require('node:module');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

register(pathToFileURL(path.join(__dirname, 'ts-alias-loader.mjs')));

process.env.VITE_TWITCH_CLIENT_ID = process.env.VITE_TWITCH_CLIENT_ID || 'test-twitch-client';
process.env.VITE_INSTAGRAM_CLIENT_ID = process.env.VITE_INSTAGRAM_CLIENT_ID || 'test-instagram-client';

async function loadIdentity() {
  return import('../src/lib/reclaim/identity.ts');
}

async function loadRemitQuote() {
  return import('../src/components/zksend/remitQuote.ts');
}

async function loadClaimService() {
  return import('../src/lib/zksend/claimService.ts');
}

test('generateSocialIdentityHash is stable keccak for platform:username', async () => {
  const { generateSocialIdentityHash, buildSocialIdentity } = await loadIdentity();
  const { keccak256, toUtf8Bytes } = await import('ethers');

  const hash = generateSocialIdentityHash('twitter', 'Alice');
  assert.ok(hash);
  assert.match(hash, /^0x[0-9a-f]{64}$/);
  assert.equal(hash, generateSocialIdentityHash('twitter', 'alice'));
  assert.equal(hash, generateSocialIdentityHash('X', '@Alice'));
  assert.equal(hash, keccak256(toUtf8Bytes('twitter:alice')));
  assert.equal(buildSocialIdentity('github', 'SendlyDev'), 'github:sendlydev');
});

test('gmail canonical vs legacy dual-hash', async () => {
  const {
    generateSocialIdentityHash,
    generateLegacyGmailIdentityHash,
    gmailIdentityHashes,
    normalizeGmailIdentity,
  } = await loadIdentity();
  const { keccak256, toUtf8Bytes } = await import('ethers');

  assert.equal(normalizeGmailIdentity('User'), 'user@gmail.com');
  assert.equal(normalizeGmailIdentity('user@gmail.com'), 'user@gmail.com');

  const canonical = generateSocialIdentityHash('gmail', 'user@gmail.com');
  const legacy = generateLegacyGmailIdentityHash('user');
  assert.equal(canonical, keccak256(toUtf8Bytes('gmail:user@gmail.com')));
  assert.equal(legacy, keccak256(toUtf8Bytes('gmail:user')));
  assert.notEqual(canonical, legacy);

  const hashes = gmailIdentityHashes('user');
  assert.deepEqual(hashes, [canonical, legacy]);
  assert.deepEqual(gmailIdentityHashes('user@gmail.com'), [canonical, legacy]);
});

test('remitQuote AED->USDC exact bigint conversions and rounding', async () => {
  const { getRemitQuote, REMIT_FEE_AED, REMIT_RATE_USDC_PER_AED } = await loadRemitQuote();
  assert.equal(REMIT_FEE_AED, 1.5);
  assert.equal(REMIT_RATE_USDC_PER_AED, 0.2723);

  const invalid = getRemitQuote('1.00');
  assert.equal(invalid.isValid, false);
  assert.equal(invalid.recipientUsdc, '0');

  // 100.00 AED => (10000 - 150) * 2723 = 26821550 micro-USDC => 26.82155
  // protocol fee 10 bps => 26821 micro => 0.026821; total 26848371 => 26.848371
  const quote = getRemitQuote('100');
  assert.equal(quote.isValid, true);
  assert.equal(quote.recipientUsdc, '26.82155');
  assert.equal(quote.protocolFeeUsdc, '0.026821');
  assert.equal(quote.totalDebitUsdc, '26.848371');

  // Two-decimal AED cents path: 10.50 => (1050-150)*2723 = 2450700 => 2.4507
  const q2 = getRemitQuote('10.50');
  assert.equal(q2.isValid, true);
  assert.equal(q2.recipientUsdc, '2.4507');
  assert.equal(q2.protocolFeeUsdc, '0.00245');
  assert.equal(q2.totalDebitUsdc, '2.45315');
});

test('buildZkFetchDescriptor returns required fields for every platform', async () => {
  const { buildZkFetchDescriptor, ZKFETCH_PLATFORMS } = await loadClaimService();

  const tokens = {
    twitterAccessToken: 'tw-oauth2-token-value',
    oauth1Token: 'tw-oauth1',
    oauth1TokenSecret: 'tw-oauth1-secret',
    twitchAccessToken: 'twitch-token-value',
    githubAccessToken: 'gh-token-value',
    telegramAccessToken: 'tg-token-value',
    instagramAccessToken: 'ig-token-value',
    linkedinAccessToken: 'li-token-value',
  };

  const expected = {
    twitter: {
      requestUrl: 'https://api.x.com/1.1/account/verify_credentials.json?include_email=false&skip_status=true',
      regexPattern: '"screen_name":"(?<username>[^"]+)"',
    },
    twitch: {
      requestUrl: 'https://api.twitch.tv/helix/users',
      regexPattern: '"id":"(?<userId>[^"]+)"',
    },
    github: {
      requestUrl: 'https://api.github.com/user',
      regexPattern: '"login":"(?<username>[^"]+)"',
    },
    telegram: {
      requestUrl: '/api/telegram/me',
      regexPattern: '"login":"(?<username>[^"]+)"',
    },
    instagram: {
      requestUrl: 'https://graph.instagram.com/me?fields=username',
      regexPattern: '"username":"(?<username>[^"]+)"',
    },
    linkedin: {
      requestUrl: 'https://api.linkedin.com/v2/userinfo',
      regexPattern: '"name":"(?<username>[^"]+)"',
    },
  };

  assert.deepEqual([...ZKFETCH_PLATFORMS].sort(), Object.keys(expected).sort());

  for (const platform of ZKFETCH_PLATFORMS) {
    const desc = buildZkFetchDescriptor(platform, tokens, {
      getReclaimApiUrl: (p) => p,
    });
    assert.ok(desc.requestUrl, `${platform} requestUrl`);
    assert.ok(desc.regexPattern, `${platform} regexPattern`);
    assert.equal(desc.requestUrl, expected[platform].requestUrl);
    assert.equal(desc.regexPattern, expected[platform].regexPattern);
    if (platform === 'twitter') {
      assert.ok(desc.oauth1);
      assert.equal(desc.oauth1.token, 'tw-oauth1');
    }
    if (platform === 'twitch' || platform === 'instagram') {
      assert.ok(desc.clientId);
      assert.ok(desc.accessToken);
    }
    if (platform === 'github' || platform === 'telegram' || platform === 'linkedin') {
      assert.ok(desc.accessToken);
    }
  }

  // Twitter OAuth2 path when OAuth1 absent
  const oauth2 = buildZkFetchDescriptor(
    'twitter',
    { twitterAccessToken: 'oauth2-only-token-xx' },
    { getReclaimApiUrl: (p) => p },
  );
  assert.equal(oauth2.requestUrl, 'https://api.x.com/2/users/me?user.fields=username');
  assert.equal(oauth2.regexPattern, '"username":"(?<username>[^"]+)"');
  assert.equal(oauth2.accessToken, 'oauth2-only-token-xx');
});
