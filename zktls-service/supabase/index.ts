import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'npm:@supabase/supabase-js@2';

const app = new Hono();

app.use('*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  allowMethods: ['POST', 'GET', 'OPTIONS', 'PUT', 'DELETE', 'PATCH'],
  credentials: false,
  maxAge: 86400,
  exposeHeaders: ['Content-Length', 'Content-Type'],
}));

app.options('*', async (c) => c.noContent(204));
app.use('*', logger(console.log));

let supabaseUrl: string | undefined;
let supabaseKey: string | undefined;
let supabase: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!supabase) {
    supabaseUrl = Deno.env.get('SUPABASE_URL');
    supabaseKey = Deno.env.get('SERVICE_ROLE_KEY');

    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL is not set in environment variables');
    }

    if (!supabaseKey) {
      throw new Error(
        'SERVICE_ROLE_KEY is not set. ' +
        'Please add it in Supabase Dashboard: Edge Functions → Functions Secrets → Add new secret. ' +
        'Key name: SERVICE_ROLE_KEY (without SUPABASE_ prefix). ' +
        'Value: your service_role key from Settings → API → Project API keys → service_role'
      );
    }

    supabase = createClient(supabaseUrl, supabaseKey);
  }
  return supabase;
}

function normalizeWalletAddress(address: string | null | undefined) {
  return typeof address === 'string' ? address.trim().toLowerCase() : null;
}

app.get('/', async (c) => {
  return c.json({
    status: 'ok',
    message: 'zkSEND Edge Function is running',
    timestamp: new Date().toISOString(),
    routes: [
      'POST /payments',
      'PATCH /payments/:paymentId/claim',
    ],
  });
});

app.post('/payments', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const paymentIdRaw = body?.paymentId ?? body?.payment_id;
    const senderAddressRaw = body?.senderAddress ?? body?.sender_address;
    const recipientIdentityHash = body?.recipientIdentityHash ?? body?.recipient_identity_hash;
    const platformRaw = body?.platform ?? body?.social_platform;
    const amountRaw = body?.amount;
    const currencyRaw = body?.currency;
    const txHash = body?.txHash ?? body?.tx_hash ?? null;

    const paymentId = paymentIdRaw != null ? String(paymentIdRaw).trim() : '';
    if (!paymentId || !/^\d+$/.test(paymentId)) {
      return c.json({ error: 'Invalid or missing paymentId' }, 400);
    }

    const senderAddress = normalizeWalletAddress(senderAddressRaw);
    if (!senderAddress) {
      return c.json({ error: 'Missing senderAddress' }, 400);
    }

    const normalizedPlatform = String(platformRaw || '').toLowerCase().trim();
    if (!normalizedPlatform) {
      return c.json({ error: 'Missing platform' }, 400);
    }

    const amount = amountRaw != null ? String(amountRaw) : '';
    if (!amount) {
      return c.json({ error: 'Missing amount' }, 400);
    }

    const currency = currencyRaw != null ? String(currencyRaw).toUpperCase().trim() : '';
    if (!currency) {
      return c.json({ error: 'Missing currency' }, 400);
    }

    const identityHash = recipientIdentityHash != null ? String(recipientIdentityHash).trim() : '';
    if (!identityHash) {
      return c.json({ error: 'Missing recipientIdentityHash' }, 400);
    }

    const client = getSupabaseClient();
    const { data, error } = await client
      .from('zksend_payments')
      .upsert(
        {
          payment_id: paymentId,
          sender_address: senderAddress,
          recipient_identity_hash: identityHash,
          social_platform: normalizedPlatform,
          amount,
          currency,
          tx_hash: txHash,
          claimed: false,
          claimed_at: null,
        },
        { onConflict: 'payment_id' }
      )
      .select('*')
      .single();

    if (error) {
      console.error('[zkSEND] Failed to store payment:', error);
      return c.json({ error: 'Failed to store zkSEND payment' }, 500);
    }

    return c.json({ success: true, payment: data });
  } catch (error) {
    console.error('[zkSEND] Payment insert error:', error);
    return c.json({ error: 'Failed to store zkSEND payment' }, 500);
  }
});

app.patch('/payments/:paymentId/claim', async (c) => {
  try {
    const paymentId = String(c.req.param('paymentId') || '').trim();
    if (!paymentId || !/^\d+$/.test(paymentId)) {
      return c.json({ error: 'Invalid or missing paymentId' }, 400);
    }

    const body = await c.req.json().catch(() => ({}));
    const recipientWalletRaw = body?.recipientWallet ?? body?.recipient_wallet;
    const claimTxHash = body?.claimTxHash ?? body?.claim_tx_hash ?? null;
    const senderAddressRaw = body?.senderAddress ?? body?.sender_address;
    const recipientIdentityHash = body?.recipientIdentityHash ?? body?.recipient_identity_hash;
    const platformRaw = body?.platform ?? body?.social_platform;
    const amountRaw = body?.amount;
    const currencyRaw = body?.currency;
    const txHash = body?.txHash ?? body?.tx_hash ?? null;

    const recipientWallet = normalizeWalletAddress(recipientWalletRaw);
    if (!recipientWallet) {
      return c.json({ error: 'Missing recipientWallet' }, 400);
    }

    const senderAddress = normalizeWalletAddress(senderAddressRaw);
    const normalizedPlatform = String(platformRaw || '').toLowerCase().trim();
    const amount = amountRaw != null ? String(amountRaw) : '';
    const currency = currencyRaw != null ? String(currencyRaw).toUpperCase().trim() : '';
    const identityHash = recipientIdentityHash != null ? String(recipientIdentityHash).trim() : '';

    if (!senderAddress || !normalizedPlatform || !amount || !currency || !identityHash) {
      return c.json(
        {
          error: 'Missing required fields for claim upsert',
          required: ['senderAddress', 'recipientIdentityHash', 'platform', 'amount', 'currency'],
        },
        400
      );
    }

    const client = getSupabaseClient();
    const { data, error } = await client
      .from('zksend_payments')
      .upsert(
        {
          payment_id: paymentId,
          sender_address: senderAddress,
          recipient_identity_hash: identityHash,
          social_platform: normalizedPlatform,
          amount,
          currency,
          tx_hash: txHash,
          recipient_wallet: recipientWallet,
          claimed: true,
          claimed_at: new Date().toISOString(),
          claim_tx_hash: claimTxHash,
        },
        { onConflict: 'payment_id' }
      )
      .select('*')
      .single();

    if (error) {
      console.error('[zkSEND] Failed to update claim:', error);
      return c.json({ error: 'Failed to update zkSEND claim' }, 500);
    }

    return c.json({ success: true, payment: data });
  } catch (error) {
    console.error('[zkSEND] Claim update error:', error);
    return c.json({ error: 'Failed to update zkSEND claim' }, 500);
  }
});

export default app;
