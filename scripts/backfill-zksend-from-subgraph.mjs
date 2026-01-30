/**
 * Backfill zksend_payments from The Graph Subgraph.
 * Fetches all PaymentCreated and PaymentClaimed events and upserts into Supabase.
 *
 * Prerequisites:
 *   - SUBGRAPH_QUERY_URL (default: zk-sendly Studio URL)
 *   - SUBGRAPH_AUTH (Bearer token for Studio)
 *   - SUPABASE_URL, SERVICE_ROLE_KEY
 *
 * Optional token mapping (address -> currency):
 *   - SUBGRAPH_TOKEN_USDC, SUBGRAPH_TOKEN_EURC (Arc testnet token addresses)
 *
 * Run: node scripts/backfill-zksend-from-subgraph.mjs
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUBGRAPH_URL =
  process.env.SUBGRAPH_QUERY_URL ||
  'https://api.studio.thegraph.com/query/1715476/zk-sendly/version/latest';
const SUBGRAPH_AUTH = process.env.SUBGRAPH_AUTH || 'ca9cd38eb345948d44ad2ac0960ccfe5';
const PAGE_SIZE = 100;

/** Token address (lowercase) -> currency */
const tokenToCurrency = {};
if (process.env.SUBGRAPH_TOKEN_USDC) {
  tokenToCurrency[process.env.SUBGRAPH_TOKEN_USDC.toLowerCase()] = 'USDC';
}
if (process.env.SUBGRAPH_TOKEN_EURC) {
  tokenToCurrency[process.env.SUBGRAPH_TOKEN_EURC.toLowerCase()] = 'EURC';
}
// Fallback if no env: common placeholder; user should set env for Arc testnet
if (Object.keys(tokenToCurrency).length === 0) {
  console.warn('No SUBGRAPH_TOKEN_USDC/SUBGRAPH_TOKEN_EURC set; currency may be "UNKNOWN"');
}

async function graphqlRequest(query, variables = {}) {
  const res = await fetch(SUBGRAPH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUBGRAPH_AUTH}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    throw new Error(`Subgraph HTTP ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(`Subgraph errors: ${JSON.stringify(json.errors)}`);
  }
  return json.data;
}

/**
 * Fetch all paymentCreateds with pagination.
 * If your Subgraph uses different field names (e.g. block instead of blockTimestamp),
 * edit the query below. You can inspect the schema in Subgraph Studio → Build → Schema.
 */
async function fetchAllPaymentCreateds() {
  const list = [];
  let skip = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const data = await graphqlRequest(
      `query PaymentCreateds($first: Int!, $skip: Int!) {
        paymentCreateds(first: $first, skip: $skip, orderBy: paymentId, orderDirection: asc) {
          id
          paymentId
          sender
          socialIdentityHash
          platform
          amount
          token
          blockNumber
          blockTimestamp
          transactionHash
        }
      }`,
      { first: PAGE_SIZE, skip }
    );
    const chunk = data?.paymentCreateds ?? [];
    if (chunk.length === 0) break;
    list.push(...chunk);
    if (chunk.length < PAGE_SIZE) break;
    skip += PAGE_SIZE;
  }
  return list;
}

/** Extract tx hash from Subgraph entity id (e.g. "0x...-0" or full hash). */
function txHashFromId(id) {
  if (!id || typeof id !== 'string') return null;
  const s = id.trim();
  if (/^0x[0-9a-fA-F]{64}$/.test(s)) return s;
  const idx = s.indexOf('-');
  return idx > 0 ? s.slice(0, idx) : s;
}

/**
 * Fetch all paymentClaimeds with pagination.
 */
async function fetchAllPaymentClaimeds() {
  const list = [];
  let skip = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const data = await graphqlRequest(
      `query PaymentClaimeds($first: Int!, $skip: Int!) {
        paymentClaimeds(first: $first, skip: $skip, orderBy: paymentId, orderDirection: asc) {
          id
          paymentId
          recipient
          socialIdentityHash
          amount
          token
          blockNumber
          blockTimestamp
          transactionHash
        }
      }`,
      { first: PAGE_SIZE, skip }
    );
    const chunk = data?.paymentClaimeds ?? [];
    if (chunk.length === 0) break;
    list.push(...chunk);
    if (chunk.length < PAGE_SIZE) break;
    skip += PAGE_SIZE;
  }
  return list;
}

function normalizeAddress(addr) {
  return typeof addr === 'string' ? addr.trim().toLowerCase() : '';
}

function currencyFromToken(tokenAddress) {
  if (!tokenAddress) return 'UNKNOWN';
  return tokenToCurrency[tokenAddress.toLowerCase()] ?? 'UNKNOWN';
}

function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey =
    process.env.SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error(
      'Set SUPABASE_URL and SERVICE_ROLE_KEY (or SUPABASE_SERVICE_ROLE_KEY) in .env'
    );
    process.exit(1);
  }
  const supabase = createClient(supabaseUrl, supabaseKey);
  return run(supabase);
}

async function run(supabase) {
  console.log('Fetching PaymentCreated events from Subgraph...');
  let createdList;
  try {
    createdList = await fetchAllPaymentCreateds();
  } catch (e) {
    console.error('Subgraph query failed. If your schema uses different field names, edit the query in this script.');
    console.error(e.message);
    process.exit(1);
  }
  console.log(`Found ${createdList.length} PaymentCreated events.`);

  console.log('Fetching PaymentClaimed events from Subgraph...');
  let claimedList;
  try {
    claimedList = await fetchAllPaymentClaimeds();
  } catch (e) {
    console.error('Subgraph PaymentClaimed query failed:', e.message);
    process.exit(1);
  }
  console.log(`Found ${claimedList.length} PaymentClaimed events.`);

  const claimedByPaymentId = {};
  for (const c of claimedList) {
    const id = c.paymentId != null ? String(c.paymentId) : null;
    if (id) claimedByPaymentId[id] = c;
  }

  const rows = [];
  for (const e of createdList) {
    const paymentId = e.paymentId != null ? String(e.paymentId) : '';
    const claim = claimedByPaymentId[paymentId] ?? null;
    const txHash = e.transactionHash ?? txHashFromId(e.id) ?? null;
    const claimTxHash = claim?.transactionHash ?? txHashFromId(claim?.id) ?? null;
    const createdAt = e.blockTimestamp
      ? new Date(Number(e.blockTimestamp) * 1000).toISOString()
      : new Date().toISOString();
    const claimedAt = claim?.blockTimestamp
      ? new Date(Number(claim.blockTimestamp) * 1000).toISOString()
      : null;

    rows.push({
      payment_id: paymentId,
      sender_address: normalizeAddress(e.sender) || (e.sender ?? ''),
      recipient_identity_hash: (e.socialIdentityHash ?? '').trim().toLowerCase().startsWith('0x')
        ? (e.socialIdentityHash ?? '').trim()
        : `0x${(e.socialIdentityHash ?? '').trim()}`,
      social_platform: (e.platform ?? '').toLowerCase().trim() || 'unknown',
      amount: String(e.amount ?? '0'),
      currency: currencyFromToken(e.token),
      recipient_wallet: claim ? normalizeAddress(claim.recipient) : null,
      claimed: !!claim,
      claimed_at: claimedAt,
      created_at: createdAt,
      tx_hash: txHash,
      claim_tx_hash: claimTxHash,
    });
  }

  if (rows.length === 0) {
    console.log('No rows to upsert.');
    return;
  }

  console.log(`Upserting ${rows.length} rows into zksend_payments...`);
  const { error } = await supabase
    .from('zksend_payments')
    .upsert(rows, { onConflict: 'payment_id' });

  if (error) {
    console.error('Supabase upsert error:', error);
    process.exit(1);
  }
  console.log('Backfill done. Rows upserted (or updated):', rows.length);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
