const { test } = require('node:test');
const assert = require('node:assert/strict');
const { register } = require('node:module');
const { pathToFileURL } = require('node:url');
const path = require('path');

register(pathToFileURL(path.join(__dirname, 'ts-alias-loader.mjs')));

const store = new Map();
const memoryStorage = {
  getItem(key) {
    return store.has(key) ? store.get(key) : null;
  },
  setItem(key, value) {
    store.set(key, String(value));
  },
  removeItem(key) {
    store.delete(key);
  },
};

global.window = { localStorage: memoryStorage };
global.localStorage = memoryStorage;

function jwtFor(payload) {
  const encode = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.sig`;
}

async function loadSession() {
  return import('../src/lib/zk-oauth/telegramSession.ts');
}

test('live Telegram JWT persists socialUserId and is treated as connected', async () => {
  store.clear();
  const session = await loadSession();
  const token = jwtFor({
    telegram_user_id: '4242',
    username: 'baseszxc',
    exp: Math.floor(Date.now() / 1000) + 3600,
  });
  localStorage.setItem('telegram_oauth_token', token);

  const live = session.readLiveTelegramIdentity();
  assert.deepEqual(live, { socialUserId: '4242', username: 'baseszxc' });
  assert.equal(session.readLiveTelegramAccessToken(), token);
  assert.deepEqual(session.readPersistedTelegramIdentity(), live);
});

test('expired Telegram JWT is not live but keeps persisted identity', async () => {
  store.clear();
  const session = await loadSession();
  const liveToken = jwtFor({
    telegram_user_id: '4242',
    username: 'baseszxc',
    exp: Math.floor(Date.now() / 1000) + 3600,
  });
  localStorage.setItem('telegram_oauth_token', liveToken);
  session.readLiveTelegramIdentity();

  const expiredToken = jwtFor({
    telegram_user_id: '4242',
    username: 'baseszxc',
    exp: Math.floor(Date.now() / 1000) - 10,
  });
  localStorage.setItem('telegram_oauth_token', expiredToken);
  localStorage.setItem('telegram_oauth', expiredToken);

  assert.equal(session.readLiveTelegramIdentity(), null);
  assert.equal(session.readLiveTelegramAccessToken(), null);
  assert.deepEqual(session.readPersistedTelegramIdentity(), {
    socialUserId: '4242',
    username: 'baseszxc',
  });
});

test('JWT without telegram user id is not an identity', async () => {
  store.clear();
  const session = await loadSession();
  const token = jwtFor({
    username: 'baseszxc',
    exp: Math.floor(Date.now() / 1000) + 3600,
  });
  localStorage.setItem('telegram_oauth_token', token);
  assert.equal(session.readLiveTelegramIdentity(), null);
  assert.equal(session.readPersistedTelegramIdentity(), null);
});

test('clearPersistedTelegramIdentity drops the stored Telegram id', async () => {
  store.clear();
  const session = await loadSession();
  session.persistTelegramIdentity({ socialUserId: '4242', username: 'baseszxc' });
  session.clearPersistedTelegramIdentity();
  assert.equal(session.readPersistedTelegramIdentity(), null);
});
