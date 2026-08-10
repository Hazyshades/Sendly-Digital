import {
  createInternalWallet,
  E2E_INTERNAL_WALLET_ADDRESS,
  expect,
  test,
  type E2EApp,
} from './fixtures';

const twitterIdentity = {
  platform: 'twitter' as const,
  socialUserId: 'e2e-twitter-id',
  username: 'alice',
};

const githubIdentity = {
  platform: 'github' as const,
  socialUserId: 'e2e-github-id',
  username: 'octocat',
};

const existingInternalWallet = createInternalWallet({
  social_platform: 'twitter',
  social_user_id: twitterIdentity.socialUserId,
  social_username: twitterIdentity.username,
  privy_user_id: `zk-oauth:twitter:${twitterIdentity.socialUserId}`,
});

async function openDesktopIdentities(app: E2EApp) {
  await app.gotoZk('/payments');
  await app.page.getByRole('button', { name: 'Expand payment identities panel' }).click();

  const panel = app.page.getByRole('complementary', { name: 'Payment identities' });
  await expect(panel).toBeVisible();
  return panel;
}

test.describe('Payment identities on zk desktop', () => {
  test.describe('available identity states', () => {
    test.use({ scenario: { identities: [] } });

    test('connects a supported identity and keeps Instagram visibly unavailable', async ({ app }, testInfo) => {
      test.skip(testInfo.project.name !== 'zk-desktop', 'Desktop identities coverage belongs to the zk desktop project.');

      const panel = await openDesktopIdentities(app);

      await expect(panel.getByText('Available to connect', { exact: true })).toBeVisible();
      await expect(panel.getByRole('button', { name: 'Connect Twitter / X' })).toBeVisible();
      await expect(panel.getByText('Instagram', { exact: true })).toBeVisible();
      await expect(panel.getByText('Coming soon', { exact: true }).first()).toBeVisible();
      await expect(panel.getByRole('button', { name: 'Connect Instagram' })).toHaveCount(0);

      // The browser fixture completes the OAuth popup through local storage.
      await panel.getByRole('button', { name: 'Connect Twitter / X' }).press('Enter');

      await expect(panel.getByRole('button', { name: 'Manage Twitter / X' })).toBeVisible();
      await expect(panel.getByText('Connected', { exact: true })).toBeVisible();
      await expect(panel.getByText('Primary', { exact: true })).toBeVisible();
    });
  });

  test.describe('connected identity management', () => {
    test.use({ scenario: { identities: [twitterIdentity, githubIdentity] } });

    test('sets a connected identity as primary and disconnects it through Manage', async ({ app }, testInfo) => {
      test.skip(testInfo.project.name !== 'zk-desktop', 'Desktop identities coverage belongs to the zk desktop project.');

      const panel = await openDesktopIdentities(app);

      await expect(panel.getByText('Connected identities', { exact: true })).toBeVisible();
      await expect(panel.getByRole('button', { name: 'Manage Twitter / X' })).toBeVisible();
      await expect(panel.getByRole('button', { name: 'Manage GitHub' })).toBeVisible();
      await expect(panel.getByText('Primary', { exact: true })).toBeVisible();

      await panel.getByRole('button', { name: 'Manage GitHub' }).click();
      await expect(app.page.getByRole('menuitem', { name: 'Set as primary' })).toBeVisible();
      await app.page.getByRole('menuitem', { name: 'Set as primary' }).click();

      await panel.getByRole('button', { name: 'Manage GitHub' }).click();
      await expect(app.page.getByRole('menuitem', { name: 'Set as primary' })).toHaveCount(0);
      await app.page.getByRole('menuitem', { name: 'Disconnect' }).click();

      await expect(panel.getByRole('button', { name: 'Connect GitHub' })).toBeVisible();
      await expect(panel.getByRole('button', { name: 'Manage GitHub' })).toHaveCount(0);
    });
  });
});

test.describe('Payment identities in the compact zk shell', () => {
  test.use({ scenario: { identities: [twitterIdentity, githubIdentity] } });

  test('opens the Social Sheet and manages the same connected identities', async ({ app }, testInfo) => {
    test.skip(testInfo.project.name !== 'zk-mobile', 'Compact identities coverage belongs to the zk mobile project.');

    await app.gotoZk('/payments');
    await app.page.getByRole('button', { name: 'Social', exact: true }).click();

    const sheet = app.page.getByRole('dialog', { name: 'Payment identities' });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole('button', { name: 'Manage Twitter / X' })).toBeVisible();
    await expect(sheet.getByRole('button', { name: 'Manage GitHub' })).toBeVisible();

    await sheet.getByRole('button', { name: 'Manage GitHub' }).click();
    await expect(app.page.getByRole('menuitem', { name: 'Set as primary' })).toBeVisible();
    await app.page.getByRole('menuitem', { name: 'Set as primary' }).click();

    await sheet.getByRole('button', { name: 'Manage GitHub' }).click();
    await expect(app.page.getByRole('menuitem', { name: 'Set as primary' })).toHaveCount(0);
    await app.page.getByRole('menuitem', { name: 'Disconnect' }).click();

    await expect(sheet.getByRole('button', { name: 'Connect GitHub' })).toBeVisible();
  });
});

test.describe('Internal Wallet lifecycle on zk desktop', () => {
  test.describe('missing social identity', () => {
    test.use({ scenario: { identities: [], internalWallet: null } });

    test('explains the social-account prerequisite instead of offering creation', async ({ app }, testInfo) => {
      test.skip(testInfo.project.name !== 'zk-desktop', 'Internal Wallet coverage belongs to the zk desktop project.');

      await app.gotoZk('/dashboard');

      await expect(app.page.getByText('Please connect a social account to create an Internal Wallet.')).toBeVisible();
      await expect(app.page.getByRole('button', { name: 'Create wallet' })).toHaveCount(0);
    });
  });

  test.describe('eligible social identity without a wallet', () => {
    test.use({ scenario: { identities: [twitterIdentity], internalWallet: null } });

    test('creates the fixture wallet and renders its address', async ({ app }, testInfo) => {
      test.skip(testInfo.project.name !== 'zk-desktop', 'Internal Wallet coverage belongs to the zk desktop project.');

      await app.gotoZk('/dashboard');

      await expect(app.page.getByRole('button', { name: 'Create wallet' })).toBeVisible();
      await app.page.getByRole('button', { name: 'Create wallet' }).click();

      await expect(app.page.getByRole('button', { name: 'Expand Internal Wallet details' })).toBeVisible();
      await app.page.getByRole('button', { name: 'Expand Internal Wallet details' }).click();
      await expect(app.page.getByText(E2E_INTERNAL_WALLET_ADDRESS, { exact: true })).toBeVisible();
      await expect(app.page.getByText('Arc Testnet', { exact: true })).toBeVisible();
      await expect(app.page.getByText('SCA', { exact: true })).toBeVisible();
      await expect(app.page.getByText('USDC', { exact: true })).toBeVisible();
      await expect(app.page.getByText('1000', { exact: true }).first()).toBeVisible();
    });
  });

  test.describe('existing fixture wallet', () => {
    test.use({ scenario: { identities: [twitterIdentity], internalWallet: existingInternalWallet } });

    test('shows details, copies its address, and requests test tokens', async ({ app }, testInfo) => {
      test.skip(testInfo.project.name !== 'zk-desktop', 'Internal Wallet coverage belongs to the zk desktop project.');

      await app.gotoZk('/dashboard');

      await expect(app.page.getByRole('button', { name: 'Expand Internal Wallet details' })).toBeVisible();
      await app.page.getByRole('button', { name: 'Expand Internal Wallet details' }).click();

      await expect(app.page.getByText(E2E_INTERNAL_WALLET_ADDRESS, { exact: true })).toBeVisible();
      await expect(app.page.getByText('Arc Testnet', { exact: true })).toBeVisible();
      await expect(app.page.getByText('SCA', { exact: true })).toBeVisible();

      await app.page.getByRole('button', { name: 'Copy', exact: true }).click();
      await expect(app.page.getByRole('button', { name: 'Copied', exact: true })).toBeVisible();
      expect(await app.readClipboard()).toBe(E2E_INTERNAL_WALLET_ADDRESS);

      await app.page.getByRole('button', { name: 'Request Testnet Tokens' }).click();
      await expect(
        app.page.getByText('Testnet tokens requested! USDC and EURC will be sent to your wallet shortly.'),
      ).toBeVisible();
    });
  });
});

for (const { name, chainId } of [
  { name: 'Base Sepolia', chainId: 84_532 },
  { name: 'Tempo Testnet', chainId: 42_431 },
]) {
  test.describe(`Internal Wallet ${name} guard`, () => {
    test.use({ scenario: { wallet: { connected: true, chainId } } });

    test('explains that wallet actions require Arc Testnet', async ({ app }, testInfo) => {
      test.skip(testInfo.project.name !== 'zk-desktop', 'Internal Wallet coverage belongs to the zk desktop project.');

      await app.gotoZk('/dashboard');

      const guard = app.page
        .getByRole('status')
        .filter({ hasText: `Internal Wallet is unavailable on ${name}.` });
      await expect(guard).toBeVisible();
      await expect(guard).toContainText('Switch to Arc Testnet to create or use an Internal Wallet.');
      await expect(app.page.getByRole('button', { name: 'Create wallet' })).toHaveCount(0);
    });
  });
}
