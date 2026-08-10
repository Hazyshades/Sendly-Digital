import { type Page, type TestInfo } from '@playwright/test';
import {
  createInternalWallet,
  E2E_ADDRESS,
  E2E_INTERNAL_WALLET_ADDRESS,
  E2E_OTHER_ADDRESS,
  expect,
  test,
} from './fixtures';

const TWITTER_IDENTITY = {
  platform: 'twitter' as const,
  socialUserId: 'e2e-twitter-user',
  username: 'alice',
};

const E2E_USDC_ADDRESS = '0x0000000000000000000000000000000000000001';

function mainDesktopOnly(testInfo: TestInfo) {
  test.skip(
    testInfo.project.name !== 'main-desktop',
    'Gift-card coverage belongs to the main desktop project.',
  );
}

function giftCard(overrides: Record<string, unknown> = {}) {
  return {
    token_id: '42',
    chain_id: 5_042_002,
    sender_address: E2E_OTHER_ADDRESS,
    recipient_address: E2E_ADDRESS,
    recipient_type: 'address',
    amount: '2.5',
    amountWei: '2500000',
    token: E2E_USDC_ADDRESS,
    message: 'A deterministic E2E gift',
    redeemed: false,
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function pendingTwitterCard(overrides: Record<string, unknown> = {}) {
  return giftCard({
    recipient_address: null,
    recipient_type: 'twitter',
    recipient_username: TWITTER_IDENTITY.username,
    ...overrides,
  });
}

async function fillValidAddressCard(page: Page) {
  await page.getByLabel('Recipient address').fill(E2E_OTHER_ADDRESS);
  await page.getByLabel('Amount (in $)').fill('2.5');
}

async function fillValidTwitterCard(page: Page) {
  await page.getByRole('radio', { name: 'Twitter', exact: true }).click();
  await page.getByLabel('Twitter username').fill(TWITTER_IDENTITY.username);
  await page.getByLabel('Amount (in $)').fill('2.5');
}

test.describe('Gift-card P0 journeys', () => {
  test.describe('Create', () => {
    test('shows wallet guidance when no eligible wallet is available', async ({ app }, testInfo) => {
      mainDesktopOnly(testInfo);

      await app.gotoMain('/create');

      await expect(app.page.getByText('Connect your wallet', { exact: true })).toBeVisible();
      await expect(app.page.getByRole('button', { name: 'Create a card' })).toHaveCount(0);
    });

    test.describe('with an external wallet', () => {
      test.use({ scenario: { wallet: { connected: true } } });

      test('validates recipient and amount and keeps unavailable recipients disabled', async ({ app }, testInfo) => {
        mainDesktopOnly(testInfo);

        await app.gotoMain('/create');
        const { page } = app;

        await expect(page.getByRole('heading', { name: 'Create a gift card' })).toBeVisible();
        await expect(page.getByRole('radio', { name: 'TikTok', exact: true })).toBeDisabled();
        await expect(page.getByRole('radio', { name: 'Instagram', exact: true })).toBeDisabled();

        await page.getByRole('button', { name: 'Create a card' }).click();
        await expect(page.getByRole('alert')).toContainText('Please enter a valid recipient address');

        await page.getByLabel('Recipient address').fill(E2E_OTHER_ADDRESS);
        await page.getByLabel('Amount (in $)').fill('0');
        await page.getByRole('button', { name: 'Create a card' }).click();
        await expect(page.getByRole('alert')).toContainText('Please enter a valid amount');
      });

      test('creates a supported social card and exposes the share copy action', async ({ app }, testInfo) => {
        mainDesktopOnly(testInfo);

        await app.gotoMain('/create');
        await fillValidTwitterCard(app.page);
        await app.page.getByRole('button', { name: 'Create a card' }).click();

        const share = app.page.getByRole('button', { name: 'Share', exact: true });
        await expect(share).toBeEnabled();
        await share.click();
        await app.page.getByRole('menuitem', { name: 'Copy link', exact: true }).click();
        await expect.poll(() => app.readClipboard()).toContain('/spend?tokenId=1');
      });
    });

    test.describe('with an Internal Wallet', () => {
      test.use({
        scenario: {
          identities: [TWITTER_IDENTITY],
          internalWallet: createInternalWallet({
            social_platform: 'twitter',
            social_user_id: TWITTER_IDENTITY.socialUserId,
            social_username: TWITTER_IDENTITY.username,
          }),
        },
      });

      test('creates a card from the Internal Wallet fixture', async ({ app }, testInfo) => {
        mainDesktopOnly(testInfo);

        await app.gotoMain('/create');
        await expect(app.page.getByRole('radio', { name: /Internal Wallet/ })).toBeChecked();
        await fillValidAddressCard(app.page);
        await app.page.getByRole('button', { name: 'Create a card' }).click();

        await expect(app.page.getByRole('button', { name: 'Share', exact: true })).toBeEnabled();
      });
    });

    test.describe('when Internal Wallet funding fails', () => {
      test.use({
        scenario: {
          identities: [TWITTER_IDENTITY],
          internalWallet: createInternalWallet({
            social_platform: 'twitter',
            social_user_id: TWITTER_IDENTITY.socialUserId,
            social_username: TWITTER_IDENTITY.username,
          }),
          serviceError: 'Circle transaction service is unavailable',
        },
      });

      test('shows the Internal Wallet service failure without a false success state', async ({ app }, testInfo) => {
        mainDesktopOnly(testInfo);

        await app.gotoMain('/create');
        await fillValidAddressCard(app.page);
        await app.page.getByRole('button', { name: 'Create a card' }).click();

        await expect(app.page.getByRole('alert')).toContainText('Circle transaction service is unavailable');
        await expect(app.page.getByRole('button', { name: 'Share', exact: true })).toBeDisabled();
      });
    });

    test.describe('when an external wallet rejects funding', () => {
      test.use({ scenario: { wallet: { connected: true, rejectTransaction: true } } });

      test('reports a rejected external-wallet transaction', async ({ app }, testInfo) => {
        mainDesktopOnly(testInfo);

        await app.gotoMain('/create');
        await fillValidAddressCard(app.page);
        await app.page.getByRole('button', { name: 'Create a card' }).click();

        await expect(app.page.getByText('Canceled', { exact: true })).toBeVisible();
        await expect(app.page.getByRole('button', { name: 'Share', exact: true })).toBeDisabled();
      });
    });
  });

  test.describe('Pending Claims', () => {
    test.describe('with a matching social identity', () => {
      test.use({
        scenario: {
          identities: [TWITTER_IDENTITY],
          wallet: { connected: true },
          giftCards: [pendingTwitterCard()],
        },
      });

      test('shows the card and existing wallet choices', async ({ app }, testInfo) => {
        mainDesktopOnly(testInfo);

        await app.gotoMain('/my');
        const pendingTab = app.page.getByRole('tab', { name: /Pending Claims/ });
        await expect(pendingTab).toHaveText('Pending Claims (1)');
        await pendingTab.click();

        await expect(app.page.getByText('Pending Gift Cards (1)', { exact: true })).toBeVisible();
        await expect(app.page.getByRole('button', { name: 'Claim with MetaMask', exact: true })).toBeVisible();
        await expect(app.page.getByRole('button', { name: 'Use Internal Wallet', exact: true })).toBeVisible();
      });
    });

    test.describe('when the card is claimed with an Internal Wallet', () => {
      test.use({
        scenario: {
          identities: [TWITTER_IDENTITY],
          giftCards: [pendingTwitterCard()],
        },
      });

      test('auto-creates a wallet, claims, and moves the card to Received', async ({ app }, testInfo) => {
        mainDesktopOnly(testInfo);

        await app.gotoMain('/my');
        await app.page.getByRole('tab', { name: /Pending Claims/ }).click();
        await expect(app.page.getByText('Pending Gift Cards (1)', { exact: true })).toBeVisible();

        await app.page.getByRole('button', { name: 'Claim with Internal Wallet' }).click();

        await expect(app.page.getByText('Internal Wallet created successfully!', { exact: true })).toBeVisible();
        await expect(app.page.getByText(/Card claimed successfully!/)).toBeVisible();
        await expect(app.page.getByRole('button', { name: 'Spend gift card 42' })).toBeVisible();
        await expect(app.page.getByRole('tab', { name: /Received/ })).toHaveAttribute('data-state', 'active');
      });
    });
  });

  test.describe('My Cards to Spend', () => {
    test.describe('with sent and received cards', () => {
      test.use({
        scenario: {
          wallet: { connected: true },
          giftCards: [
            giftCard({
              token_id: '41',
              sender_address: E2E_ADDRESS,
              recipient_address: E2E_OTHER_ADDRESS,
              message: 'Sent card',
            }),
            giftCard({ token_id: '42', message: 'Received card' }),
          ],
        },
      });

      test('renders Sent and Received cards and opens Spend with the selected token', async ({ app }, testInfo) => {
        mainDesktopOnly(testInfo);

        await app.gotoMain('/my');
        await app.page.getByRole('tab', { name: /Sent/ }).click();
        await expect(app.page.getByText('Token ID: 41', { exact: true })).toBeVisible();

        await app.page.getByRole('tab', { name: /Received/ }).click();
        const receivedCard = app.page.getByRole('button', { name: 'Spend gift card 42' });
        await expect(receivedCard).toBeVisible();
        await receivedCard.click();

        await expect(app.page).toHaveURL(`${app.mainUrl}/spend?tokenId=42`);
        await expect(app.page.getByRole('button', { name: 'Select a service first' })).toBeVisible();
      });
    });

    test.describe('when ownership has changed', () => {
      test.use({
        scenario: {
          wallet: { connected: true },
          giftCards: [giftCard({ token_id: '43', recipient_address: E2E_OTHER_ADDRESS })],
        },
      });

      test('explains an ownership mismatch', async ({ app }, testInfo) => {
        mainDesktopOnly(testInfo);

        await app.gotoMain('/spend?tokenId=43');
        await expect(app.page.getByRole('alert')).toContainText('You do not own this gift card');
      });
    });

    test.describe('when the card is already redeemed', () => {
      test.use({
        scenario: {
          wallet: { connected: true },
          giftCards: [giftCard({ token_id: '44', redeemed: true })],
        },
      });

      test('explains an already redeemed card', async ({ app }, testInfo) => {
        mainDesktopOnly(testInfo);

        await app.gotoMain('/spend?tokenId=44');
        await expect(app.page.getByRole('alert')).toContainText('This gift card has already been redeemed');
      });
    });

    test.describe('when the token does not exist', () => {
      test.use({ scenario: { wallet: { connected: true } } });

      test('explains a missing token', async ({ app }, testInfo) => {
        mainDesktopOnly(testInfo);

        await app.gotoMain('/spend?tokenId=55123123123');

        await expect(app.page.getByRole('alert')).toContainText('Gift card not found');
      });
    });

    test.describe('when redemption is eligible', () => {
      test.use({
        scenario: {
          wallet: { connected: true },
          giftCards: [giftCard({ token_id: '45' })],
        },
      });

      test('requires a service before enabling the mocked redemption', async ({ app }, testInfo) => {
        mainDesktopOnly(testInfo);

        await app.gotoMain('/spend?tokenId=45');
        await expect(app.page.getByRole('button', { name: 'Select a service first' })).toBeDisabled();

        await app.page.getByRole('button', { name: /USDC Withdraw/ }).click();
        await app.page.getByRole('button', { name: 'Redeem for USDC Withdraw' }).click();
        await expect(
          app.page.getByRole('alert').filter({ hasText: 'Gift card redeemed successfully!' }),
        ).toBeVisible();
      });
    });
  });
});
