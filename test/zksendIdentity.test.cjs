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
