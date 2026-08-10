const { test } = require('node:test');
const assert = require('node:assert/strict');

async function loadTokenAmount() {
  return import('../src/lib/tokenAmount.ts');
}

test('micro-unit string converts to human amount', async () => {
  const { normalizeTokenAmount, formatTokenAmountString } = await loadTokenAmount();
  assert.equal(normalizeTokenAmount('1000000', { unit: 'micro' }), 1);
  assert.equal(formatTokenAmountString('2500000', { unit: 'micro' }), '2.5');
});

test('human decimal string is not divided again', async () => {
  const { normalizeTokenAmount, formatTokenAmountString } = await loadTokenAmount();
  assert.equal(normalizeTokenAmount('10.5', { unit: 'human' }), 10.5);
  assert.equal(normalizeTokenAmount('10.5', { unit: 'micro' }), 10.5);
  assert.equal(formatTokenAmountString('3.25', { unit: 'human' }), '3.25');
});

test('human integer string passes through', async () => {
  const { normalizeTokenAmount } = await loadTokenAmount();
  assert.equal(normalizeTokenAmount('42', { unit: 'human' }), 42);
});

test('zero and empty values', async () => {
  const { normalizeTokenAmount, formatTokenAmountString } = await loadTokenAmount();
  assert.equal(normalizeTokenAmount('0', { unit: 'micro' }), 0);
  assert.equal(normalizeTokenAmount('', { unit: 'human' }), 0);
  assert.equal(formatTokenAmountString('0', { unit: 'micro' }), '0');
});

test('bigint micro-units', async () => {
  const { normalizeTokenAmount } = await loadTokenAmount();
  assert.equal(normalizeTokenAmount(5_000_000n, { unit: 'micro' }), 5);
});

test('formatDisplayAmount rounds to decimals', async () => {
  const { formatDisplayAmount } = await loadTokenAmount();
  assert.equal(formatDisplayAmount(1.23456, 2), '1.23');
  assert.equal(formatDisplayAmount(1.23556, 2), '1.24');
  assert.equal(formatDisplayAmount('414.97', 2), '414.97');
  assert.equal(formatDisplayAmount(Number.NaN, 2), '0.00');
});

test('no double conversion for already formatted blockchain amounts', async () => {
  const { normalizeTokenAmount, formatTokenAmountString } = await loadTokenAmount();
  const human = formatTokenAmountString('12.34', { unit: 'human' });
  assert.equal(normalizeTokenAmount(human, { unit: 'human' }), 12.34);
});

test('gift_cards_graph sent amounts stay human (no micro division)', async () => {
  const { normalizeTokenAmount, formatTokenAmountString } = await loadTokenAmount();
  const storedAmount = '25';
  const displayed = formatTokenAmountString(storedAmount, { unit: 'human' });
  assert.equal(displayed, '25');
  assert.equal(normalizeTokenAmount(displayed, { unit: 'human' }), 25);
  assert.notEqual(normalizeTokenAmount(storedAmount, { unit: 'micro' }), 25);
});


test('toMicro converts common human amounts', async () => {
  const { toMicro } = await loadTokenAmount();
  assert.equal(toMicro('0.1'), 100000n);
  assert.equal(toMicro('1'), 1000000n);
  assert.equal(toMicro('0.000001'), 1n);
  assert.equal(toMicro('123.456789'), 123456789n);
});

test('fromMicro converts micro amounts to exact strings', async () => {
  const { fromMicro } = await loadTokenAmount();
  assert.equal(fromMicro(100000n), '0.1');
  assert.equal(fromMicro(1000000n), '1');
  assert.equal(fromMicro(1n), '0.000001');
  assert.equal(fromMicro(123456789n), '123.456789');
  assert.equal(fromMicro(0n), '0');
});

test('toMicro/fromMicro round-trip', async () => {
  const { toMicro, fromMicro } = await loadTokenAmount();
  assert.equal(fromMicro(toMicro('0.1')), '0.1');
  assert.equal(fromMicro(toMicro('1')), '1');
  assert.equal(fromMicro(toMicro('0.000001')), '0.000001');
  assert.equal(fromMicro(toMicro('123.456789')), '123.456789');
  assert.equal(toMicro(fromMicro(100000n)), 100000n);
  assert.equal(toMicro(fromMicro(1n)), 1n);
  assert.equal(toMicro(fromMicro(123456789n)), 123456789n);
});

test('toMicro rejects invalid input', async () => {
  const { toMicro } = await loadTokenAmount();
  for (const bad of ['', '   ', 'abc', '1.2.3', '1.', '.5', 'NaN', '1e6']) {
    assert.throws(() => toMicro(bad), /Invalid token amount/);
  }
});

test('toMicro truncates beyond 6 decimals', async () => {
  const { toMicro, fromMicro } = await loadTokenAmount();
  // Deterministic truncate (not round): digits beyond 6 are discarded
  assert.equal(toMicro('0.1234567'), 123456n);
  assert.equal(toMicro('1.0000009'), 1000000n);
  assert.equal(toMicro('0.9999999'), 999999n);
  assert.equal(fromMicro(toMicro('0.123456789')), '0.123456');
});
