import type { Page, TestInfo } from '@playwright/test';

import {
  createInternalWallet,
  E2E_ADDRESS,
  E2E_OTHER_ADDRESS,
  expect,
  test,
  type E2EApp,
} from './fixtures';

const ARC_CHAIN_ID = 5_042_002;
const BASE_SEPOLIA_CHAIN_ID = 84_532;
const directSendClaimMode = process.env.E2E_DIRECT_SEND_CLAIM_MODE === 'escrow_v2' ? 'escrow_v2' : 'legacy';

const twitterIdentity = {
  platform: 'twitter' as const,
  socialUserId: 'e2e-twitter-user',
  username: 'alice',
};

function pendingPayment(paymentId: string) {
  return {
    paymentId,
    sender: E2E_OTHER_ADDRESS,
    socialIdentityHash: `0x${'1'.repeat(64)}`,
    platform: 'twitter',
    amountWei: '5000000',
    token: '0x0000000000000000000000000000000000000001',
    recipient: E2E_ADDRESS,
    claimed: false,
    createdAt: '1',
  };
}

function requireZkDesktop(testInfo: TestInfo) {
  test.skip(
    testInfo.project.name !== 'zk-desktop',
    'Payment and remittance interaction coverage runs once in the desktop zk-host project.',
  );
}

async function openPayments(app: E2EApp) {
  await app.gotoZk('/payments');
  await expect(app.page.getByRole('tab', { name: 'Send', exact: true })).toBeVisible();
  await expect(app.page.getByLabel('Recipient')).toBeVisible();
}

async function selectSendPlatform(page: Page, platform: 'Address') {
  await page.getByRole('button', { name: 'Choose platform', exact: true }).click();
  await page.getByRole('button', { name: new RegExp(`^${platform}\\b`) }).click();
}

async function fillSocialPayment(page: Page, recipient = 'alice', amount = '12.5') {
  await page.getByLabel('Recipient').fill(recipient);
  await page.getByLabel('Amount', { exact: true }).fill(amount);
}

test.describe('zkSend social-recipient payment', () => {
  test('blocks invalid recipient and amount input before a payment can be submitted', async ({ app }, testInfo) => {
    requireZkDesktop(testInfo);
    await openPayments(app);

    const send = app.page.getByRole('button', { name: 'Send', exact: true });
    await app.page.getByLabel('Recipient').fill('@');
    await expect(
      app.page.getByText('Select a platform above and enter a valid username to send.'),
    ).toBeVisible();
    await expect(send).toBeDisabled();

    await app.page.getByLabel('Recipient').fill('alice');
    await app.page.getByLabel('Amount', { exact: true }).fill('0');
    await expect(send).toBeDisabled();
  });
});

test.describe('zkSend Internal Wallet payment', () => {
  test.use({
    scenario: {
      identities: [twitterIdentity],
      internalWallet: createInternalWallet(),
    },
  });

  test('submits a social payment through the Internal Wallet', async ({ app }, testInfo) => {
    requireZkDesktop(testInfo);
    await openPayments(app);

    const internalWallet = app.page.getByRole('button', { name: /^Internal Wallet\b/ }).first();
    await expect(internalWallet).toBeVisible();
    await internalWallet.click();
    await fillSocialPayment(app.page);

    const send = app.page.getByRole('button', { name: 'Send', exact: true });
    await expect(send).toBeEnabled();
    await send.click();
    await expect(app.page.getByText('Payment created successfully!', { exact: true })).toBeVisible();
  });
});

test.describe('zkSend external-wallet payment', () => {
  test.use({
    scenario: {
      wallet: { connected: true, address: E2E_ADDRESS, chainId: ARC_CHAIN_ID },
    },
  });

  test('submits a social payment through the injected wallet', async ({ app }, testInfo) => {
    requireZkDesktop(testInfo);
    await openPayments(app);
    await fillSocialPayment(app.page, 'alice', '3');

    const send = app.page.getByRole('button', { name: 'Send', exact: true });
    await expect(send).toBeEnabled();
    await send.click();
    await expect(app.page.getByText('Payment created successfully!', { exact: true })).toBeVisible();
  });
});

test.describe('zkSend transaction failures', () => {
  test.describe('rejected external-wallet transaction', () => {
    test.use({
      scenario: {
        wallet: {
          connected: true,
          address: E2E_ADDRESS,
          chainId: ARC_CHAIN_ID,
          rejectTransaction: true,
        },
      },
    });

    test('shows a user-rejection outcome instead of success', async ({ app }, testInfo) => {
      requireZkDesktop(testInfo);
      await openPayments(app);
      await fillSocialPayment(app.page, 'alice', '3');

      await app.page.getByRole('button', { name: 'Send', exact: true }).click();
      await expect(app.page.getByText(/User rejected/i)).toBeVisible();
      await expect(app.page.getByText('Payment created successfully!', { exact: true })).not.toBeVisible();
    });
  });

  test.describe('Internal Wallet service failure', () => {
    test.use({
      scenario: {
        identities: [twitterIdentity],
        internalWallet: createInternalWallet(),
        serviceError: 'E2E wallet service unavailable',
      },
    });

    test('renders the payment-service error without a false success state', async ({ app }, testInfo) => {
      requireZkDesktop(testInfo);
      await openPayments(app);
      await app.page.getByRole('button', { name: /^Internal Wallet\b/ }).first().click();
      await fillSocialPayment(app.page);

      await app.page.getByRole('button', { name: 'Send', exact: true }).click();
      await expect(app.page.getByText('E2E wallet service unavailable', { exact: true })).toBeVisible();
      await expect(app.page.getByText('Payment created successfully!', { exact: true })).not.toBeVisible();
    });
  });
});

test.describe('direct-address zkSend', () => {
  test.use({
    scenario: {
      wallet: { connected: true, address: E2E_ADDRESS, chainId: ARC_CHAIN_ID },
    },
  });

  test('validates an address and follows the configured instant-send or escrow outcome', async ({ app }, testInfo) => {
    requireZkDesktop(testInfo);
    await openPayments(app);
    await selectSendPlatform(app.page, 'Address');

    const recipient = app.page.getByLabel('Recipient wallet address').first();
    const send = app.page.getByRole('button', { name: 'Send', exact: true });
    await recipient.fill('not-an-address');
    await expect(
      app.page.getByText('Enter a valid wallet address (0x followed by 40 hex characters).'),
    ).toBeVisible();
    await expect(send).toBeDisabled();

    await recipient.fill(E2E_OTHER_ADDRESS);
    await app.page.getByLabel('Amount', { exact: true }).fill('3');
    await expect(send).toBeEnabled();
    await send.click();

    if (directSendClaimMode === 'escrow_v2') {
      await expect(app.page.getByText('Deposit sent. Recipient can claim from the Receive tab.')).toBeVisible();
    } else {
      await expect(app.page.getByText('Payment sent successfully!', { exact: true })).toBeVisible();
    }
  });

  test('describes the configured receive behavior for direct address payments', async ({ app }, testInfo) => {
    requireZkDesktop(testInfo);
    await openPayments(app);
    await app.page.getByRole('tab', { name: 'Receive', exact: true }).click();
    await app.page.getByRole('button', { name: 'Choose platform', exact: true }).click();
    await app.page.getByRole('button', { name: /^Address\b/ }).click();
    await app.page.getByLabel('Recipient wallet address').fill(E2E_OTHER_ADDRESS);

    if (directSendClaimMode === 'escrow_v2') {
      await expect(
        app.page.getByText(/Enter the recipient wallet address above, connect that wallet, then refresh/i),
      ).toBeVisible();
    } else {
      await expect(app.page.getByText(/Address sends use instant delivery \(legacy\)/)).toBeVisible();
    }
  });
});

test.describe('Receive payment UI', () => {
  test.describe('with a connected Twitter identity', () => {
    test.use({
      scenario: {
        identities: [twitterIdentity],
        wallet: { connected: true, address: E2E_ADDRESS, chainId: ARC_CHAIN_ID },
      },
    });

    test('prefills the primary identity and makes refresh available', async ({ app }, testInfo) => {
      requireZkDesktop(testInfo);
      await app.gotoZk('/payments');
      await app.page.getByRole('tab', { name: 'Receive', exact: true }).click();

      await expect(app.page.getByLabel('Username')).toHaveValue('alice');
      await expect(app.page.getByText('Twitter / X connected as @alice. Pending payments load automatically.')).toBeVisible();
      await expect(app.page.getByRole('button', { name: 'Refresh', exact: true })).toBeEnabled();
    });
  });

  test('explains the identity prerequisite before claims can be attempted', async ({ app }, testInfo) => {
    requireZkDesktop(testInfo);
    await app.gotoZk('/payments');
    await app.page.getByRole('tab', { name: 'Receive', exact: true }).click();
    await app.page.getByLabel('Username').fill('alice');

    await expect(app.page.getByText(/Connect this platform in the Accounts panel/i)).toBeVisible();
  });

  test.describe('individual eligible claim', () => {
    test.use({
      scenario: {
        identities: [twitterIdentity],
        wallet: { connected: true, address: E2E_ADDRESS, chainId: ARC_CHAIN_ID },
        payments: [pendingPayment('101')],
      },
    });

    test('claims one pending payment and removes it from the pending list', async ({ app }, testInfo) => {
      requireZkDesktop(testInfo);
      await app.gotoZk('/payments');
      await app.page.getByRole('tab', { name: 'Receive', exact: true }).click();

      const claim = app.page.getByRole('button', { name: 'Claim', exact: true });
      await expect(claim).toBeVisible();
      await claim.click();
      await expect(app.page.getByText('Payment claimed. View transaction', { exact: true })).toBeVisible();
      await expect(claim).toHaveCount(0);
    });
  });

  test.describe('claim all eligible payments', () => {
    test.use({
      scenario: {
        identities: [twitterIdentity],
        wallet: { connected: true, address: E2E_ADDRESS, chainId: ARC_CHAIN_ID },
        payments: [pendingPayment('101'), pendingPayment('102')],
      },
    });

    test('claims all eligible payments and clears the rendered pending rows', async ({ app }, testInfo) => {
      requireZkDesktop(testInfo);
      await app.gotoZk('/payments');
      await app.page.getByRole('tab', { name: 'Receive', exact: true }).click();

      const claimAll = app.page.getByRole('button', { name: 'Claim all (2 payments)', exact: true });
      await expect(claimAll).toBeVisible();
      await claimAll.click();
      await expect(app.page.getByText('All payments claimed. View transaction', { exact: true })).toBeVisible();
      await expect(app.page.getByRole('button', { name: 'Claim', exact: true })).toHaveCount(0);
    });
  });

  test.describe('direct escrow matching-wallet guard', () => {
    test.use({
      scenario: {
        wallet: { connected: true, address: E2E_ADDRESS, chainId: ARC_CHAIN_ID },
        directDeposits: [
          {
            deposit_id: '201',
            sender_address: E2E_OTHER_ADDRESS,
            recipient_wallet: E2E_OTHER_ADDRESS,
            amount: '3000000',
            token: '0x0000000000000000000000000000000000000001',
            claimed: false,
            created_at: '1',
          },
        ],
      },
    });

    test('enforces the matching-wallet guard when escrow is active and otherwise explains legacy behavior', async ({ app }, testInfo) => {
      requireZkDesktop(testInfo);

      await app.gotoZk('/payments');
      await app.page.getByRole('tab', { name: 'Receive', exact: true }).click();
      await app.page.getByRole('button', { name: 'Choose platform', exact: true }).click();
      await app.page.getByRole('button', { name: /^Address\b/ }).click();
      await app.page.getByLabel('Recipient wallet address').fill(E2E_OTHER_ADDRESS);

      const claim = app.page.getByRole('button', { name: 'Claim', exact: true });
      if (directSendClaimMode === 'escrow_v2') {
        await expect(claim).toBeVisible();
        await expect(claim).toBeDisabled();
      } else {
        await expect(app.page.getByText(/Address sends use instant delivery \(legacy\)/)).toBeVisible();
        await expect(claim).toHaveCount(0);
      }
    });
  });

});

test.describe('Sendly Remit', () => {
  test('validates the AED fee threshold, shows the deterministic quote, and exposes funding choices', async ({ app }, testInfo) => {
    requireZkDesktop(testInfo);
    await app.gotoZk('/remit');

    const amount = app.page.getByLabel('Amount in AED');
    await amount.fill('1.50');
    await expect(app.page.getByText('Enter more than 1.50 AED to cover the remittance fee.')).toBeVisible();
    await expect(app.page.getByRole('button', { name: 'Send remittance', exact: true })).toBeDisabled();

    await amount.fill('100');
    await expect(app.page.getByText('26.82155 USDC', { exact: true })).toBeVisible();
    await expect(app.page.getByText('1 AED = 0.2723 USDC', { exact: true })).toBeVisible();
    await expect(app.page.getByRole('button', { name: /^Internal Wallet\b/ })).toBeDisabled();
    await expect(app.page.getByRole('button', { name: /^External Wallet\b/ })).toBeDisabled();
    await expect(app.page.getByRole('button', { name: /^UAE Bank Card\b/ })).toBeEnabled();

    await app.page.getByRole('button', { name: /^UAE Bank Card\b/ }).click();
    await expect(app.page.getByText('Settle demo pay-in with')).toBeVisible();
  });

  test.describe('wrong-network external wallet', () => {
    test.use({
      scenario: {
        wallet: { connected: true, address: E2E_ADDRESS, chainId: BASE_SEPOLIA_CHAIN_ID },
      },
    });

    test('offers Switch to Arc and returns to the normal settlement action after switching', async ({ app }, testInfo) => {
      requireZkDesktop(testInfo);
      await app.gotoZk('/remit');
      await app.page.getByLabel('Twitter username').fill('alice');

      const switchToArc = app.page.getByRole('button', { name: 'Switch to Arc Testnet', exact: true });
      await expect(switchToArc).toBeVisible();
      await switchToArc.click();
      await expect(app.page.getByRole('button', { name: 'Send remittance', exact: true })).toBeVisible();
    });
  });

  test.describe('Internal Wallet settlement', () => {
    test.use({
      scenario: {
        identities: [twitterIdentity],
        internalWallet: createInternalWallet(),
      },
    });

    test('settles, copies a normalized claim link, and resets for another payment', async ({ app }, testInfo) => {
      requireZkDesktop(testInfo);
      await app.gotoZk('/remit');
      await app.page.getByRole('button', { name: /^Internal Wallet\b/ }).click();
      await app.page.getByLabel('Twitter username').fill('@Alice');

      await app.page.getByRole('button', { name: 'Send remittance', exact: true }).click();
      await expect(app.page.getByRole('heading', { name: 'Payment sent', exact: true })).toBeVisible();
      await app.page.getByRole('button', { name: 'Copy claim link', exact: true }).click();
      await expect.poll(app.readClipboard).toBe(
        `${app.zkUrl}/payments?tab=receive&platform=twitter&username=alice`,
      );

      await app.page.getByRole('button', { name: 'Send another payment', exact: true }).click();
      await expect(app.page.getByRole('heading', { name: 'Your remittance', exact: true })).toBeVisible();
      await expect(app.page.getByLabel('Twitter username')).toHaveValue('');
    });
  });
});
