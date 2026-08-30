import { expect, test } from './fixtures';

test.describe('main-to-zk route boundary', () => {
  test('preserves every P0 payment path and query when main host redirects', async ({ app }, testInfo) => {
    test.skip(testInfo.project.name !== 'main-desktop', 'Main-host redirect coverage belongs to the main desktop project.');

    const routes = [
      '/payments?tab=receive&from=e2e',
      '/creator?draft=e2e',
      '/pay/e2e-checkout?currency=USDC',
      '/agent/receipts?repo=sendly',
    ];

    for (const route of routes) {
      await app.gotoMain(route);
      await expect(app.page).toHaveURL(`${app.zkUrl}${route}`);
    }
  });

  test('routes the zk root to Payments', async ({ app }, testInfo) => {
    test.skip(testInfo.project.name !== 'zk-desktop', 'Zk-root coverage belongs to the zk desktop project.');

    await app.gotoZk('/');
    await expect(app.page).toHaveURL(`${app.zkUrl}/payments`);
    await expect(app.page.getByRole('tab', { name: 'Send' })).toBeVisible();
  });
});
