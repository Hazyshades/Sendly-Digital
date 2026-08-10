import { defineConfig, devices } from '@playwright/test';

const port = 4173;
const directSendClaimMode = process.env.E2E_DIRECT_SEND_CLAIM_MODE === 'escrow_v2' ? 'escrow_v2' : 'legacy';
const outputSuffix = directSendClaimMode === 'escrow_v2' ? 'escrow' : 'legacy';
const resolverRules = 'MAP localhost 127.0.0.1,MAP zk.localhost 127.0.0.1';
const localOrigin = `http://127.0.0.1:${port}`;

const e2eEnv: Record<string, string> = {
  VITE_DEV_HTTPS: 'false',
  VITE_E2E: 'true',
  VITE_ARC_RPC_URL: `${localOrigin}/__e2e__/rpc`,
  VITE_TEMPO_RPC_URL: `${localOrigin}/__e2e__/rpc`,
  VITE_BASE_RPC_URL: `${localOrigin}/__e2e__/rpc`,
  VITE_BASE_RPC_FALLBACK_URL: `${localOrigin}/__e2e__/rpc`,
  VITE_SUPABASE_FUNCTION_URL: `${localOrigin}/__e2e__/functions/v1/smart-action`,
  VITE_SUPABASE_ZKSEND_FUNCTION_URL: `${localOrigin}/__e2e__/functions/v1/smart-action`,
  VITE_ZKTLS_SERVICE_URL: `${localOrigin}/__e2e__`,
  VITE_APP_ORIGIN: `http://zk.localhost:${port}`,
  VITE_PRIVY_APP_ID: 'e2e-privy-app-id',
  VITE_WALLET_CONNECT_PROJECT_ID: 'e2e-walletconnect-project-id',
  // Both branches need a non-zero address before the browser fixture can
  // intercept their RPC calls. These are documentation/test-only addresses.
  VITE_ARC_DIRECT_SEND_CONTRACT_ADDRESS: '0x0000000000000000000000000000000000000001',
  VITE_ARC_DIRECT_SEND_V2_CONTRACT_ADDRESS: '0x0000000000000000000000000000000000000002',
  VITE_DIRECT_SEND_CLAIM_MODE: directSendClaimMode === 'escrow_v2' ? 'escrow_v2' : '',
};

const browserUse = {
  launchOptions: {
    args: [`--host-resolver-rules=${resolverRules}`],
  },
  actionTimeout: 10_000,
  navigationTimeout: 15_000,
  trace: 'on-first-retry' as const,
  screenshot: 'only-on-failure' as const,
  video: 'retain-on-failure' as const,
};

export default defineConfig({
  testDir: './test/e2e',
  testMatch: '**/*.spec.ts',
  outputDir: `test-results/${outputSuffix}`,
  // A cold Vite dependency optimization can take tens of seconds on a clean
  // CI worker. The fixtures wait for rendered UI instead of sleeping.
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  // Heavy provider bootstrap is stable with the same bounded concurrency in
  // local runs and CI. Higher machine-default worker counts starve Vite and
  // create actionability flakes without exercising different product paths.
  workers: 2,
  reporter: [
    ['list'],
    ['html', { outputFolder: `playwright-report/${outputSuffix}`, open: 'never' }],
    ['junit', { outputFile: `test-results/${outputSuffix}/junit.xml` }],
  ],
  use: browserUse,
  projects: [
    {
      name: 'main-desktop',
      use: { ...devices['Desktop Chrome'], ...browserUse, baseURL: `http://localhost:${port}` },
    },
    {
      name: 'zk-desktop',
      use: { ...devices['Desktop Chrome'], ...browserUse, baseURL: `http://zk.localhost:${port}` },
    },
    {
      name: 'zk-mobile',
      use: { ...devices['Pixel 5'], ...browserUse, baseURL: `http://zk.localhost:${port}` },
    },
  ],
  webServer: {
    command: `npm run dev:e2e -- --port ${port}`,
    url: `${localOrigin}/`,
    timeout: 120_000,
    // Always own the isolated test server. Reusing a developer server can
    // silently pick up real credentials or a different direct-send mode.
    reuseExistingServer: false,
    env: e2eEnv,
  },
});
