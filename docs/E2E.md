# P0 UI E2E

## Purpose

The P0 browser suite protects Sendly's hostname boundary, payment identities,
Internal Wallet, zkSend, remittance, and gift-card journeys. It is deliberately
mock-only: it does not authenticate with real OAuth providers, load a wallet
extension, call a funded testnet account, or mutate Supabase/Circle/chain data.

## Prerequisites

- Node `22.22.0` (`.nvmrc` is the source of truth)
- Clean dependencies: `npm ci`
- Chromium once per machine: `npx playwright install chromium`

## Commands

```bash
npm run e2e:typecheck
npm run e2e:p0
npm run e2e:p0:legacy
npm run e2e:p0:escrow
npm run e2e:p0:ui
npm run e2e:p0:debug
```

`e2e:p0` runs both the legacy direct-send and `escrow_v2` fixture variants.
The individual commands are useful while diagnosing one branch. To select a
browser project, pass Playwright arguments after `--`, for example:

```bash
npm run e2e:p0:legacy -- --project=zk-mobile
```

The projects are `main-desktop`, `zk-desktop`, and `zk-mobile`. Playwright
starts Vite in HTTP-only E2E mode and resolves `zk.localhost` inside Chromium;
developers and CI workers must not edit a system hosts file.

## Isolation guarantees

Browser fixtures create a fresh Playwright context for every test, seed only
the scenario's declared identity/wallet state, mock app-owned provider routes,
and abort unexpected live external traffic. Analytics and external font loading
are intercepted. `VITE_E2E=true` disables the real Privy provider only for the
test server and supplies deterministic browser identity data.

Specs use role, label, and visible-name locators. The P0 controls are now
semantically addressable, so no CSS/DOM-position locators or broad test IDs are
needed. Add a user-intent `data-testid` only when a future dynamic control
cannot be selected uniquely through its accessible contract.

Never store real auth-state files, wallet profiles, private keys, or provider
secrets in `test/e2e`. Generated auth state, reports, traces, screenshots,
video, and results are ignored by Git.

## Failure diagnostics

Local output is split by direct-send mode:

- `playwright-report/legacy` and `playwright-report/escrow`
- `test-results/legacy` and `test-results/escrow`

Traces are retained on first retry; screenshots and video are retained only for
failures. GitHub Actions uploads both directories even after retries are
exhausted.

## Boundary to live canaries

This PR suite is not a substitute for real provider integration validation. A
future, explicitly separate serial canary may use dedicated non-production
accounts and secrets. It must not be added to the mocked P0 command or pull
request workflow without its own design and safety review.
