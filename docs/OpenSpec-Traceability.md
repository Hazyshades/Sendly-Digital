# OpenSpec Traceability

Maps **OpenSpec main-spec requirements** (`openspec/specs/`) to implementation paths across Sendly repositories. Use this index when reviewing shipped behavior, onboarding, or updating docs after `openspec archive`.

**Audience:** engineers, hackathon reviewers, spec authors.

**Narrative architecture** (workflows, diagrams, product context) lives in [Architecture](./Architecture.md) and [Agent Treasury](./Agent-Treasury.md). This file is the requirement → code index only.

## Phase-1 scope

Tables cover capabilities promoted to `openspec/specs/` at the time of this document:

| Capability | Spec file | Requirements |
|---|---|---|
| `agent-treasury-doc` | `openspec/specs/agent-treasury-doc/spec.md` | 7 |
| `architecture-overview` | `openspec/specs/architecture-overview/spec.md` | 5 |

**Out of scope (phase 1):**

- Creator paywall (`social-x402-paywall-zksend`)
- Citation demo (`/lepton/citation`)
- Capabilities that exist only in `openspec/changes/` or archive and are not yet main specs
- Gateway, gift cards, modular wallet, and other product areas without a main spec

Extend this doc when new capabilities are archived to `openspec/specs/`.

## How to read tables

| Column | Meaning |
|---|---|
| **Requirement** | Header from the capability's `spec.md` (`### Requirement: …`) |
| **Repo** | `Sendly-App`, `sendly-supabase`, `sendly-contracts`, or `docs` |
| **Path(s)** | Relative to that repo's root; comma-separated when multiple |
| **Notes** | Endpoints, migrations, UI routes, or doc sections |

## Maintenance

Update traceability rows when:

1. **`openspec archive`** creates or modifies a capability in `openspec/specs/`
2. Implementation paths move materially (e.g. function split, route rename)
3. A requirement is added, renamed, or removed in a main spec

Add a new `## Capability: <name>` section per promoted capability. Keep paths at module or route level — not every function.

**Future improvement:** script to diff `openspec/specs/*/spec.md` requirement headers against table rows.

## Related docs

- [Architecture](./Architecture.md) — product-wide architecture
- [Agent Treasury](./Agent-Treasury.md) — GitHub / Twitch agent workflows
- OpenSpec main specs — `openspec/specs/` (local; gitignored in Sendly-App)

---

## Capability: `agent-treasury-doc`

Spec: `openspec/specs/agent-treasury-doc/spec.md`

| Requirement | Repo | Path(s) | Notes |
|---|---|---|---|
| Agent Treasury document exists at docs path | docs | `docs/Agent-Treasury.md` | Purpose, scope, exclusions |
| Document encodes architectural decisions | docs | `docs/Agent-Treasury.md` | § Architectural Decisions table |
| GitHub Agent Workflow documented | sendly-supabase | `functions/arc/creator-paywall/index.ts`, `prPayout.ts` | `POST /webhooks/github`, `GET /pr-payouts`; webhook ~L1240, receipts ~L1319 |
| GitHub Agent Workflow documented | sendly-supabase | `migrations/050_github_pr_payout_agent.sql` | `pr_payout_policies`, `github_pr_payouts` |
| GitHub Agent Workflow documented | sendly-contracts | `zktls_payments/ZkSend.sol` | `createPayment` to `github:{login}` identity hash |
| GitHub Agent Workflow documented | Sendly-App | `src/lib/paywall/prPayoutAPI.ts`, `src/pages/LeptonReceiptsRoute.tsx`, `src/pages/LeptonRepoSettingsRoute.tsx`, `src/pages/LeptonPrBountyRoute.tsx`, `src/components/lepton/LeptonReceiptsPage.tsx`, `src/components/lepton/LeptonRepoSettingsPage.tsx` | Human UI; routes in `src/App.tsx` |
| Twitch Agent Workflow documented | sendly-supabase | `functions/arc/creator-paywall/index.ts`, `twitchEventSubClient.ts`, `twitchPayoutCore.ts`, `twitchWebhook.ts` | `POST /webhooks/twitch`, `GET /twitch-payouts`; raid handler ~L1530 |
| Twitch Agent Workflow documented | sendly-supabase | `migrations/052_twitch_raid_payouts.sql` | `twitch_campaigns`, `twitch_payout_policies`, receipts |
| Twitch Agent Workflow documented | sendly-contracts | `zktls_payments/ZkSend.sol` | Payout to `twitch:uid:{id}` |
| Twitch Agent Workflow documented | Sendly-App | `src/lib/paywall/twitchPayoutAPI.ts`, `src/pages/LeptonTwitchCampaignRoute.tsx`, `src/pages/LeptonTwitchReceiptsRoute.tsx`, `src/components/lepton/LeptonTwitchCampaignPage.tsx`, `src/components/lepton/LeptonTwitchReceiptsPage.tsx` | uid-aware claim; routes in `src/App.tsx` |
| Twitch Agent Workflow documented | zktls-service | Twitch uid provider | Identity `twitch:uid:{user_id}` for claim proof |
| Agent discovery section documents public endpoints | sendly-supabase | `functions/arc/creator-paywall/llm.txt`, `openapi.json` | SoT for agent machine docs |
| Agent discovery section documents public endpoints | Sendly-App | `scripts/sync-agent-docs.mjs`, `public/llm.txt`, `public/llms.txt`, `public/openapi.json` | Build-time sync; `GET /lepton-hackathon` served from Edge Function |
| Agent discovery section documents public endpoints | Sendly-App | `src/lib/paywall/leptonCatalogAPI.ts`, `src/components/lepton/LeptonCatalogView.tsx` | Frontend catalog consumer |
| Source of truth matrix | docs | `docs/Agent-Treasury.md` | § Source of Truth table |
| Source of truth matrix | sendly-supabase | `functions/arc/creator-paywall/` | Backend SoT |
| Source of truth matrix | Sendly-App | `src/lib/paywall/prPayoutAPI.ts`, `src/lib/paywall/twitchPayoutAPI.ts`, `src/components/lepton/` | Frontend SoT for Lepton UI |
| Cross-link to Architecture | docs | `docs/Agent-Treasury.md` | Link to `./Architecture.md` in intro |

---

## Capability: `architecture-overview`

Spec: `openspec/specs/architecture-overview/spec.md`

| Requirement | Repo | Path(s) | Notes |
|---|---|---|---|
| Implemented Now lists Agent Treasury | docs | `docs/Architecture.md` | § Implemented Now table, Agent Treasury row (~L17) |
| Agent Wallet status reflects partial implementation | docs | `docs/Architecture.md` | § Planned Next, Agent Wallet row (~L24) |
| Identity section acknowledges zk OAuth parallel stack | docs | `docs/Architecture.md` | § Identity and Wallet Resolution (~L58–68) |
| Identity section acknowledges zk OAuth parallel stack | Sendly-App | `src/components/DeveloperWallet.tsx`, `src/lib/zk-oauth/` | `checkWalletWithFallback()`, zk OAuth wallet lookup |
| Architecture links to Agent Treasury doc | docs | `docs/Architecture.md` | Intro link to `./Agent-Treasury.md` (~L7) |
| Architecture links to OpenSpec traceability doc | docs | `docs/Architecture.md` | Intro link to `./OpenSpec-Traceability.md` |
| Minimal patch scope preserved | docs | `docs/Architecture.md`, `docs/OpenSpec-Traceability.md` | Workflows in Agent-Treasury; traceability tables here only — not in Architecture.md |
