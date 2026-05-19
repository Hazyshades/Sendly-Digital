# Sendly Architecture

Sendly is a USDC-first payment product for sending money to a social username instead of a wallet address. The current architecture combines Web2-style identity, Circle Developer-Controlled Wallets, Arc Testnet contracts, CCTP Bridge Kit, zkTLS payments, and NFT Gift Cards.

The product goal is to hide wallet addresses, chain choice, gas tokens, and bridge complexity from end users while still keeping payments auditable on-chain.

## Implemented Now

| Area | Status | Main implementation |
|---|---|---|
| NFT Gift Card creation | Implemented | Circle wallet approve + ERC-721 mint on Arc Testnet |
| Circle Developer-Controlled Wallets | Implemented | `DeveloperWalletService`, backend Circle API calls |
| Bridge Kit / CCTP | Implemented | `@circle-fin/bridge-kit` + viem adapter |
| Payments via zkTLS | Implemented | `zkSEND` contract + social identity hash + zkTLS verification |

## Planned Next

| Area | Status | Notes |
|---|---|---|
| Circle Agentic Stack: Gateway | Frontend and backend implemented, testing in progress | Gateway UI, direct frontend flow, Supabase backend with Unified Balance Kit |
| Circle Agentic Stack: Agent Wallet | Planned | Agent wallet flow for automated and policy-controlled payments |
| Circle Agentic Stack: x402 Nanopayments | Planned | HTTP 402 paid-action flow for agent and API payments |
| Modular Wallet | Testing in progress | Passcode/passkey-based self-custody UX |

## High-Level System

```mermaid
flowchart LR
    User[User] --> UI[Sendly Web App]
    UI --> Identity[Linked Social Account]
    UI --> WalletChoice[Wallet Source Toggle]

    WalletChoice --> BrowserWallet[Browser Wallet]
    WalletChoice --> CircleWallet[Circle Developer-Controlled Wallet]

    CircleWallet --> CircleAPI[Circle APIs]
    CircleAPI --> DevWallets[Developer Wallets]
    CircleAPI --> Gateway[Circle Gateway / Unified Balance]
    CircleAPI --> Bridge[CCTP Bridge Kit]

    UI --> Supabase[Supabase Edge Functions]
    Supabase --> DB[(Supabase DB)]
    Supabase --> PaidGateway[x402 Gateway]

    UI --> Contracts[Arc Testnet Contracts]
    BrowserWallet --> Contracts
    DevWallets --> Contracts
    Gateway --> Contracts
    Bridge --> Contracts

    Contracts --> ZkTLS[zkTLS Verification]
    ZkTLS --> Identity
```

## Identity and Wallet Resolution

The user connects one of their social accounts to Sendly, for example an account from Twitter/X, Telegram, GitHub, or another supported social network. Sendly stores the linked platform identity and uses it as the human-readable payment target.

The wallet layer resolves that connected social account to a Circle wallet through a fallback chain:

1. Connected wallet address, when the user already has an external wallet.
2. Linked social account: platform, social user ID, and username.
3. Privy user ID as the final identity anchor.

The resolved wallet metadata is stored in `developer_wallets`, including Circle wallet IDs, wallet set IDs, blockchain, account type, state, and social identity fields.

```mermaid
sequenceDiagram
    participant User
    participant UI as Sendly UI
    participant Social as Social Account
    participant Hook as useCircleWallet
    participant Edge as Supabase Edge
    participant DB as developer_wallets
    participant Circle as Circle Developer Wallets

    User->>UI: Connect social account
    UI->>Social: OAuth / account authorization
    Social-->>UI: platform, social user ID, username
    UI->>Hook: Resolve wallet for linked social account
    Hook->>Edge: Query by connected address
    Edge->>DB: Find wallet by address

    alt Wallet found by address
        DB-->>Edge: wallet
    else Try social identity
        Edge->>DB: Find wallet by platform/userId/username
        DB-->>Edge: wallet or empty
    else Try Privy identity
        Edge->>DB: Find wallet by privy_user_id
        DB-->>Edge: wallet or empty
    end

    alt No Circle wallet exists
        Edge->>Circle: Create developer-controlled wallet
        Circle-->>Edge: walletId, address
        Edge->>DB: Store wallet + social binding
    end

    Edge-->>Hook: Circle wallet address and metadata
    Hook-->>UI: Internal wallet ready
```

## zkTLS Direct Payments

zkTLS Direct Payments are instant private transfers to a social username. The sender enters a recipient handle and amount. The recipient later proves ownership of that social account with zkTLS, without sharing passwords or private credentials, and the proof is submitted on-chain to release the funds.

This mode is different from Gift Cards: no NFT card is created. The core asset is the locked payment in the `zkSEND` contract, keyed by the recipient's social identity hash.

The UI supports two payment sources:

- Browser Wallet: the user signs transactions with an injected wallet.
- Internal Wallet: Sendly uses the user's Circle Developer-Controlled Wallet.

For the internal wallet path, the frontend prepares contract calls and sends them through `DeveloperWalletService`. The backend keeps Circle credentials out of the browser.

```mermaid
sequenceDiagram
    participant Sender
    participant UI as SendPaymentForm
    participant Toggle as WalletSourceToggle
    participant Hook as useCircleWallet
    participant DWS as DeveloperWalletService
    participant Circle as Circle API
    participant Chain as Arc Testnet
    participant ZkSend as zkSEND Contract
    participant ZkTLS as zkTLS Backend
    participant Recipient

    Sender->>UI: Enter recipient username and amount
    Sender->>Toggle: Select Browser Wallet or Internal Wallet
    UI->>Hook: Resolve sender Circle wallet if needed
    Hook-->>UI: Circle wallet address

    UI->>Chain: Check USDC balance
    UI->>DWS: approve USDC spending
    DWS->>Circle: Create approval transaction
    Circle->>Chain: Submit approval
    UI->>DWS: createPayment(recipientHash, amount)
    DWS->>Circle: Execute contract call
    Circle->>ZkSend: Lock funds for recipient social hash
    ZkSend-->>UI: paymentId / txHash

    Recipient->>ZkTLS: Prove social account ownership
    ZkTLS-->>ZkSend: Submit zk-proof on-chain
    ZkSend-->>Recipient: Transfer stablecoins to recipient wallet
```

## Circle Gateway and Unified Balance

Gateway is part of the next Circle Agentic Stack phase. The frontend and backend implementations already exist, and the feature is currently in testing.

Sendly has two Gateway implementations because they serve different execution contexts.

| Layer | Purpose | Implementation |
|---|---|---|
| Frontend Gateway | Interactive user wallet flow | Direct viem calls, EIP-712 signing, Gateway REST API |
| Backend Unified Balance | Server-side Circle wallet flow | Supabase Edge Functions with Unified Balance Kit |

The frontend flow is useful when the user signs in the browser. The backend flow is useful when Sendly operates through Circle Developer-Controlled Wallets and the entity secret stays server-side.

```mermaid
sequenceDiagram
    participant User
    participant UI as Gateway UI
    participant Service as gatewayService
    participant Client as GatewayClient
    participant Wallet as User Wallet
    participant GatewayWallet as GatewayWallet Contract
    participant GatewayAPI as Circle Gateway API
    participant GatewayMinter as GatewayMinter Contract

    User->>UI: Open /gateway
    UI->>Service: getBalances(address)
    Service->>Client: GET /v1/balances
    Client->>GatewayAPI: Fetch unified balance
    GatewayAPI-->>UI: Balance by chain

    User->>UI: Deposit USDC
    UI->>Service: deposit(chain, amount)
    Service->>Wallet: Check balance and allowance
    Service->>Wallet: approve(GatewayWallet, amount)
    Service->>GatewayWallet: deposit(USDC, amount)
    GatewayWallet-->>UI: Deposit tx

    User->>UI: Transfer to another chain
    UI->>Service: transfer(source, destination, amount, recipient)
    Service->>Wallet: Sign EIP-712 burn intent
    Service->>Client: POST /v1/transfer
    Client->>GatewayAPI: Submit burn intent + signature
    GatewayAPI-->>Client: Attestation + operator signature
    Service->>GatewayMinter: gatewayMint(...)
    GatewayMinter-->>UI: Mint tx
```

### Backend Unified Balance Flow

```mermaid
sequenceDiagram
    participant UI as Sendly UI / API Client
    participant Edge as Supabase Edge
    participant UBK as Unified Balance Kit
    participant Adapter as Circle Wallets Adapter
    participant Circle as Circle APIs
    participant Gateway as Circle Gateway

    UI->>Edge: gateway-balances / gateway-deposit / gateway-spend
    Edge->>Adapter: Create Circle wallet adapter
    Adapter->>Circle: Authenticate server-side

    alt Query balances
        Edge->>UBK: getBalances()
        UBK->>Gateway: Read unified balance
    else Deposit
        Edge->>UBK: deposit(wallet, chain, amount)
        UBK->>Gateway: Approve and deposit USDC
    else Spend
        Edge->>UBK: spend(source, destination, recipient, amount)
        UBK->>Gateway: Burn and mint across chains
    end

    UBK-->>Edge: Operation result
    Edge-->>UI: Balance, transaction, or spend result
```

## CCTP Bridge Kit

Gateway is used for unified-balance transfers. Bridge Kit is used for direct CCTP bridging, for example Arc Testnet to Base Sepolia.

```mermaid
sequenceDiagram
    participant User
    participant UI as Bridge Dialog
    participant Config as bridgeConfig
    participant Service as bridgeService
    participant Kit as Circle Bridge Kit
    participant Adapter as Viem Adapter
    participant Source as Source Chain
    participant Dest as Destination Chain

    User->>UI: Select route and amount
    UI->>Config: validateBridgeRouteByAddresses()
    Config-->>UI: Route is supported
    UI->>Service: bridge(route, amount)
    Service->>Adapter: createAdapterFromProvider(window.ethereum)
    Service->>Kit: bridge({from, to, amount})
    Kit->>Source: approve USDC
    Kit->>Source: depositForBurn
    Kit->>Kit: Fetch CCTP attestation
    Kit->>Dest: mint
    Kit-->>UI: burnTxHash, mintTxHash
```

## NFT Gift Cards

NFT Gift Cards are a separate mode from zkTLS Direct Payments. In this flow, the sender creates a card with a custom message and USDC/AUSD value. The card is minted as an ERC-721 NFT, while the value stays locked until the recipient claims it.

The recipient authenticates through a social login flow and receives both the NFT card and the redeemable value. This mode is designed for gifts, tips, and personalized transfers where the message and card object matter as much as the payment.

```mermaid
sequenceDiagram
    participant Sender
    participant UI as CreateGiftCard
    participant Hook as useCircleWallet
    participant DWS as DeveloperWalletService
    participant Circle as Circle API
    participant Chain as Arc Testnet
    participant Gift as GiftCard Contract
    participant Recipient
    participant Social as Social Login

    Sender->>UI: Enter value, recipient, and custom message
    Sender->>UI: Select Browser Wallet or Internal Wallet
    UI->>Hook: Resolve sender Circle wallet if needed
    Hook-->>UI: Circle wallet
    UI->>DWS: approve card value
    DWS->>Circle: Create approval transaction
    Circle->>Chain: Submit approval
    UI->>DWS: createGiftCard(value, message, recipient)
    DWS->>Circle: Create mint transaction
    Circle->>Gift: Mint ERC-721 gift card and lock value
    Gift-->>UI: tokenId / txHash

    Recipient->>Social: Authenticate social account
    Social-->>Gift: Recipient identity confirmed
    Gift-->>Recipient: Transfer NFT + redeemable value
```

## x402 Nanopayments Gateway

x402 Nanopayments are planned as part of the Circle Agentic Stack. External agents or clients will call a paid endpoint. If the request has no payment credential, the gateway responds with HTTP 402. After payment, the action executes and the result is returned with a payment receipt.

Target paid actions include recipient resolution, tip preparation, bulk tipping, zkTLS social resolve, and zkTLS claim preparation. Every paid action should be logged with amount, status, and correlation ID.

```mermaid
sequenceDiagram
    participant Client as External Agent / Client
    participant Gateway as Paid Action Gateway
    participant Payment as Payment Verifier
    participant DB as paid action audit log
    participant Service as Sendly Action

    Client->>Gateway: Request paid action
    alt No valid payment
        Gateway-->>Client: 402 Payment Required + challenge
        Client->>Payment: Pay requested amount
        Payment-->>Client: Payment credential
        Client->>Gateway: Retry with credential
    end

    Gateway->>Payment: Verify payment
    Payment-->>Gateway: Payment accepted
    Gateway->>Service: Execute action
    Service-->>Gateway: Verified result
    Gateway->>DB: Log paid action
    Gateway-->>Client: Result + Payment-Receipt
```

## Data Model Notes

The architecture relies on these important database areas:

- `developer_wallets`: Circle wallet ID, wallet set ID, wallet address, blockchain, account type, state, and social identity binding.
- Social identity columns: user type, social platform, social user ID, social username, and Privy user ID.
- Paid action audit log: payment action type, payment amount, status, and correlation ID.
