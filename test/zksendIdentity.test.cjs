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

async function loadClaimService() {
  return import('../src/lib/zksend/claimService.ts');
}

async function loadSocialRecipient() {
  return import('../src/lib/zksend/socialRecipient.ts');
}

async function loadUserLookup() {
  return import('../src/lib/twitch/userLookup.ts');
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

test('twitch username hash matches human send and is looked up alongside uid hash', async () => {
  const {
    generateSocialIdentityHash,
    generateTwitchUidIdentityHash,
    twitchIdentityHashes,
    twitchHandleForIdentityHash,
  } = await loadIdentity();
  const { keccak256, toUtf8Bytes } = await import('ethers');

  const usernameHash = generateSocialIdentityHash('twitch', 'Kurdypel');
  assert.equal(usernameHash, keccak256(toUtf8Bytes('twitch:kurdypel')));
  assert.equal(
    usernameHash,
    '0x66d507b1373f5af660f7d688faee10157b86a4d080004dd07fa405f018f3fc0f',
  );

  const uidHash = generateTwitchUidIdentityHash('12345');
  assert.equal(uidHash, keccak256(toUtf8Bytes('twitch:uid:12345')));
  assert.notEqual(usernameHash, uidHash);

  const hashes = twitchIdentityHashes('kurdypel', '12345');
  assert.deepEqual(hashes, [uidHash, usernameHash]);
  assert.deepEqual(twitchIdentityHashes('kurdypel', null), [usernameHash]);
  assert.deepEqual(twitchIdentityHashes('', '12345'), [uidHash]);

  assert.equal(twitchHandleForIdentityHash(uidHash, 'kurdypel', '12345'), 'uid:12345');
  assert.equal(twitchHandleForIdentityHash(usernameHash, 'kurdypel', '12345'), 'kurdypel');
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
    gmailAccessToken: 'gmail-token-value',
  };

  const expected = {
    twitter: {
      requestUrl: 'https://api.x.com/1.1/account/verify_credentials.json?skip_status=true',
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
    gmail: {
      requestUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
      regexPattern: '"email"\\s*:\\s*"(?<username>[^"]+)"',
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
    if (platform === 'github' || platform === 'telegram' || platform === 'linkedin' || platform === 'gmail') {
      assert.ok(desc.accessToken);
    }
  }

  // Twitter OAuth2 path when OAuth1 absent
  const oauth2 = buildZkFetchDescriptor(
    'twitter',
    { twitterAccessToken: 'oauth2-only-token-xx' },
    { getReclaimApiUrl: (p) => p },
  );
  assert.equal(oauth2.requestUrl, 'https://api.x.com/2/users/me');
  assert.equal(oauth2.regexPattern, '"username":"(?<username>[^"]+)"');
  assert.equal(oauth2.accessToken, 'oauth2-only-token-xx');
});

function fakeZkFetchProof(username) {
  return {
    signatures: ['0xsig1', '0xsig2'],
    extractedParameterValues: { username },
  };
}

function baseExecutor(overrides = {}) {
  return {
    walletSource: 'external',
    chainId: 5042002,
    zksendAddress: '0x3',
    recipientAddress: '0x1111111111111111111111111111111111111111',
    loginUsername: 'alice',
    platform: 'twitter',
    resolveCurrency: () => 'USDC',
    proofSession: {
      async run() {
        throw new Error('ProofSession should not run for zkFetch platforms');
      },
    },
    ...overrides,
  };
}

async function withFakeProve(fn) {
  const orig = globalThis.fetch;
  let proveCalls = 0;
  globalThis.fetch = async (url) => {
    const href = String(url);
    if (href.includes('/api/reclaim/zkfetch/prove')) {
      proveCalls += 1;
      return {
        ok: true,
        json: async () => ({ proof: fakeZkFetchProof('alice') }),
        text: async () => '',
      };
    }
    throw new Error(`unexpected fetch ${href}`);
  };
  try {
    return await fn({ proveCalls: () => proveCalls });
  } finally {
    globalThis.fetch = orig;
  }
}

test('claimPayments zkFetch twitter uses token source without UI bag', async () => {
  const { claimPayments } = await loadClaimService();
  await withFakeProve(async ({ proveCalls }) => {
    const result = await claimPayments({
      payments: [
        {
          paymentId: '42',
          sender: '0xabc',
          platform: 'twitter',
          amount: '1',
          token: '0x1',
        },
      ],
      executorContext: baseExecutor({
        tokenSource: {
          read: () => ({ twitterAccessToken: 'tw-oauth2-token-value' }),
        },
      }),
    });
    assert.equal(proveCalls(), 1);
    assert.equal(result.length, 1);
    assert.equal(result[0].paymentId, '42');
    assert.ok(result[0].txHash);
  });
});

test('claimPayments zkFetch fails before chain when token is missing', async () => {
  const { claimPayments } = await loadClaimService();
  let chainTouched = false;
  const orig = globalThis.fetch;
  globalThis.fetch = async () => {
    chainTouched = true;
    throw new Error('fetch should not run without a token');
  };
  try {
    await assert.rejects(
      () =>
        claimPayments({
          payments: [
            {
              paymentId: '42',
              sender: '0xabc',
              platform: 'twitter',
              amount: '1',
              token: '0x1',
            },
          ],
          executorContext: baseExecutor({
            tokenSource: { read: () => ({}) },
          }),
        }),
      /Connect Twitter or login with Privy/,
    );
    assert.equal(chainTouched, false);
  } finally {
    globalThis.fetch = orig;
  }
});

async function withGmailProve(extractedEmail, fn) {
  const orig = globalThis.fetch;
  const proveBodies = [];
  globalThis.fetch = async (url, init) => {
    const href = String(url);
    if (href.includes('/api/reclaim/zkfetch/prove')) {
      proveBodies.push(JSON.parse(String(init?.body ?? '{}')));
      return {
        ok: true,
        json: async () => ({ proof: fakeZkFetchProof(extractedEmail) }),
        text: async () => '',
      };
    }
    throw new Error(`unexpected fetch ${href}`);
  };
  try {
    return await fn({ proveBodies });
  } finally {
    globalThis.fetch = orig;
  }
}

test('claimPayments gmail uses zkFetch then pays', async () => {
  const { claimPayments } = await loadClaimService();
  await withGmailProve('alice@gmail.com', async ({ proveBodies }) => {
    const result = await claimPayments({
      payments: [
        {
          paymentId: '7',
          sender: '0xabc',
          platform: 'gmail',
          amount: '1',
          token: '0x1',
        },
      ],
      executorContext: baseExecutor({
        platform: 'gmail',
        loginUsername: 'alice@gmail.com',
        tokenSource: { read: () => ({ gmailAccessToken: 'gmail-token-value' }) },
      }),
    });
    assert.equal(proveBodies.length, 1);
    assert.equal(proveBodies[0].platform, 'gmail');
    assert.equal(proveBodies[0].accessToken, 'gmail-token-value');
    assert.equal(proveBodies[0].requestUrl, 'https://www.googleapis.com/oauth2/v3/userinfo');
    assert.equal(result[0].paymentId, '7');
    assert.ok(result[0].txHash);
  });
});

test('claimPayments gmail fails before chain when token is missing', async () => {
  const { claimPayments } = await loadClaimService();
  let chainTouched = false;
  const orig = globalThis.fetch;
  globalThis.fetch = async () => {
    chainTouched = true;
    throw new Error('fetch should not run without a token');
  };
  try {
    await assert.rejects(
      () =>
        claimPayments({
          payments: [
            {
              paymentId: '7',
              sender: '0xabc',
              platform: 'gmail',
              amount: '1',
              token: '0x1',
            },
          ],
          executorContext: baseExecutor({
            platform: 'gmail',
            loginUsername: 'alice@gmail.com',
            tokenSource: { read: () => ({}) },
          }),
        }),
      /Connect Gmail to generate proof/,
    );
    assert.equal(chainTouched, false);
  } finally {
    globalThis.fetch = orig;
  }
});

test('claimPayments gmail email mismatch fails before chain', async () => {
  const { claimPayments } = await loadClaimService();
  await withGmailProve('bob@gmail.com', async () => {
    await assert.rejects(
      () =>
        claimPayments({
          payments: [
            {
              paymentId: '7',
              sender: '0xabc',
              platform: 'gmail',
              amount: '1',
              token: '0x1',
            },
          ],
          executorContext: baseExecutor({
            platform: 'gmail',
            loginUsername: 'alice@gmail.com',
            tokenSource: { read: () => ({ gmailAccessToken: 'gmail-token-value' }) },
          }),
        }),
      /Proof username mismatch/,
    );
  });
});

async function withTwitchClaimFetch(fn) {
  const orig = globalThis.fetch;
  const proveBodies = [];
  globalThis.fetch = async (url, init) => {
    const href = String(url);
    if (href.includes('api.twitch.tv/helix/users')) {
      return {
        ok: true,
        json: async () => ({ data: [{ id: '126247254', login: 'kurdypel' }] }),
        text: async () => '',
      };
    }
    if (href.includes('/api/reclaim/zkfetch/prove')) {
      proveBodies.push(JSON.parse(String(init?.body ?? '{}')));
      return {
        ok: true,
        json: async () => ({
          proof: {
            signatures: ['0xsig1', '0xsig2'],
            extractedParameterValues: { userId: '126247254' },
          },
        }),
        text: async () => '',
      };
    }
    throw new Error(`unexpected fetch ${href}`);
  };
  try {
    return await fn({ proveBodies });
  } finally {
    globalThis.fetch = orig;
  }
}

test('claimPayments Twitch login-hash row posts prove username as login', async () => {
  const { claimPayments } = await loadClaimService();
  const { generateSocialIdentityHash, generateTwitchUidIdentityHash } = await loadIdentity();
  const loginHash = generateSocialIdentityHash('twitch', 'kurdypel');
  const uidHash = generateTwitchUidIdentityHash('126247254');

  await withTwitchClaimFetch(async ({ proveBodies }) => {
    const result = await claimPayments({
      payments: [
        {
          paymentId: '396',
          sender: '0xabc',
          platform: 'twitch',
          amount: '1',
          token: '0x1',
          socialIdentityHash: loginHash,
        },
      ],
      executorContext: baseExecutor({
        platform: 'twitch',
        loginUsername: 'kurdypel',
        primaryIdentityHash: uidHash,
        tokenSource: { read: () => ({ twitchAccessToken: 'twitch-token-value' }) },
      }),
    });
    assert.equal(result[0].paymentId, '396');
    assert.equal(proveBodies.length, 1);
    assert.equal(proveBodies[0].username, 'kurdypel');
  });
});

test('claimPayments Twitch uid-hash row posts prove username as uid:{id}', async () => {
  const { claimPayments } = await loadClaimService();
  const { generateTwitchUidIdentityHash } = await loadIdentity();
  const uidHash = generateTwitchUidIdentityHash('126247254');

  await withTwitchClaimFetch(async ({ proveBodies }) => {
    await claimPayments({
      payments: [
        {
          paymentId: '12',
          sender: '0xabc',
          platform: 'twitch',
          amount: '1',
          token: '0x1',
          socialIdentityHash: uidHash,
        },
      ],
      executorContext: baseExecutor({
        platform: 'twitch',
        loginUsername: 'kurdypel',
        tokenSource: { read: () => ({ twitchAccessToken: 'twitch-token-value' }) },
      }),
    });
    assert.equal(proveBodies[0].username, 'uid:126247254');
  });
});

test('readTwitchHelixId maps id without breaking preview fields', async () => {
  const { readTwitchHelixId } = await loadUserLookup();
  assert.equal(readTwitchHelixId({ id: '126247254' }), '126247254');
  assert.equal(readTwitchHelixId({ user_id: 99 }), '99');
  assert.equal(readTwitchHelixId({ userId: '7' }), '7');
  assert.equal(readTwitchHelixId({ login: 'kurdypel' }), undefined);
});

test('Twitch human send writes uid hash after successful resolve', async () => {
  const { resolveSocialRecipient } = await loadSocialRecipient();
  const { generateTwitchUidIdentityHash, generateSocialIdentityHash } = await loadIdentity();
  const { keccak256, toUtf8Bytes } = await import('ethers');

  const resolved = await resolveSocialRecipient('twitch', '@Kurdypel', async () => ({
    userId: '126247254',
    login: 'kurdypel',
  }));

  assert.equal(resolved.normalizedUsername, 'kurdypel');
  assert.equal(resolved.recipientIdentityHash, generateTwitchUidIdentityHash('126247254'));
  assert.equal(resolved.recipientIdentityHash, keccak256(toUtf8Bytes('twitch:uid:126247254')));
  assert.notEqual(resolved.recipientIdentityHash, generateSocialIdentityHash('twitch', 'kurdypel'));
});

test('Twitch human send fails closed when lookup has no id', async () => {
  const { resolveSocialRecipient } = await loadSocialRecipient();
  const { generateSocialIdentityHash } = await loadIdentity();
  const loginHash = generateSocialIdentityHash('twitch', 'kurdypel');
  let producedHash = null;

  await assert.rejects(async () => {
    const resolved = await resolveSocialRecipient('twitch', 'kurdypel', async () => null);
    producedHash = resolved.recipientIdentityHash;
  }, /Could not resolve Twitch user/);

  assert.equal(producedHash, null);
  assert.ok(loginHash);
});

