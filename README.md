# 🚀 SoroSub - Decentralized Recurring Payments on Stellar

> **The "Stripe of Stellar"** — A decentralized recurring payment protocol with on-chain credit scoring and Buy Now, Pay Later (BNPL) micro-loans.

[![Built on Stellar](https://img.shields.io/badge/Built%20on-Stellar-blue)](https://stellar.org)
[![Soroban](https://img.shields.io/badge/Soroban-Smart%20Contracts-purple)](https://soroban.stellar.org)
[![SCF Build-A-Thon](https://img.shields.io/badge/SCF-Build--A--Thon-orange)](https://stellar.org/community-fund)

## 🔗 Deployed Contract (Testnet)

| Property | Value |
|----------|-------|
| **Contract ID** | `CC72ORKR3TVSIZ7TOFMNTKPJJ77IL6NMQAWBWQBIBRNIHEJARBWZRBQJ` |
| **Network** | Stellar Testnet |
| **Explorer** | [View on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CC72ORKR3TVSIZ7TOFMNTKPJJ77IL6NMQAWBWQBIBRNIHEJARBWZRBQJ) |

---

## 📖 Overview

SoroSub enables **subscription-based payments on Stellar** where users approve once and the smart contract automatically pulls funds on a recurring basis. Combined with **Cred-Fi**, our on-chain credit scoring system, users can build credit history and access Buy Now, Pay Later (BNPL) micro-loans.

### Key Features

| Feature | Description |
|---------|-------------|
| 🔄 **Recurring Payments** | Approve once, auto-debit monthly using `transfer_from` |
| 📊 **Credit Scoring** | Build on-chain credit (+10 points per successful payment) |
| 💳 **BNPL Micro-Loans** | Access credit when balance is low (requires credit score >50) |
| 🔐 **Non-Custodial** | Users maintain full control of their funds |
| ⚡ **Low Fees** | Leverage Stellar's sub-cent transaction costs |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │   Dashboard  │  │  Subscribe   │  │   Credit/BNPL        │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└─────────────────────────────┬───────────────────────────────────┘
                              │ Freighter Wallet
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Stellar Network (Soroban)                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   SoroSub Contract                        │   │
│  │  • create_subscription()    • collect_payment()           │   │
│  │  • cancel_subscription()    • get_credit_score()          │   │
│  │  • get_user_debt()          • repay_debt()                │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────┐  ┌─────────────────────────────────┐   │
│  │   Token Contract     │  │      Liquidity Pool             │   │
│  │   (USDC/XLM)         │  │      (BNPL Funding)             │   │
│  └──────────────────────┘  └─────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
sorosub/
├── backend/                    # Soroban Smart Contracts
│   ├── Cargo.toml
│   └── contracts/
│       └── sorosub/
│           └── src/
│               ├── lib.rs      # Main contract logic
│               └── test.rs     # Comprehensive tests
│
└── frontend/                   # Next.js Web Application
    ├── app/                    # App router pages
    ├── components/             # React components
    ├── hooks/                  # Custom hooks
    └── lib/                    # Utilities & contract bindings
```

---

## 🔧 Smart Contract API

### Data Structures

```rust
struct Subscription {
    subscriber: Address,      // User paying
    merchant: Address,        // Recipient
    token: Address,           // Payment token (USDC/XLM)
    amount: i128,             // Amount per period
    interval: u64,            // Seconds between payments
    last_payment_time: u64,   // Last successful payment
    is_active: bool,          // Active status
    credit_score: u32,        // 0-∞, +10 per payment
}

struct UserDebt {
    amount: i128,             // Outstanding BNPL debt
    token: Address,           // Token owed
}
```

### Functions

| Function | Description | Auth Required |
|----------|-------------|---------------|
| `initialize(admin, liquidity_pool)` | One-time setup | Admin |
| `create_subscription(subscriber, merchant, token, amount, interval)` | Create new subscription | Subscriber |
| `collect_payment(subscriber, merchant)` | Process payment (with BNPL fallback) | Anyone |
| `cancel_subscription(subscriber, merchant)` | Cancel subscription | Subscriber |
| `get_subscription(subscriber, merchant)` | Query subscription details | None |
| `get_credit_score(subscriber, merchant)` | Get user's credit score | None |
| `get_user_debt(user)` | Query BNPL debt | None |
| `repay_debt(user, amount)` | Repay BNPL loan | User |
| `can_process_payment(subscriber, merchant)` | Check if payment is due | None |

### BNPL Logic

```
IF user_balance >= payment_amount:
    → Normal payment, credit_score += 10
    
ELSE IF credit_score > 50:
    → BNPL: Pay from liquidity pool
    → Record debt against user
    → Emit "BNPL Triggered" event
    
ELSE:
    → Payment fails (insufficient balance + low credit)
```

---

## 🚀 Quick Start

### Prerequisites

- [Rust](https://rustup.rs/) (1.70+)
- [Soroban CLI](https://soroban.stellar.org/docs/getting-started/setup)
- [Node.js](https://nodejs.org/) (18+)
- [pnpm](https://pnpm.io/)

### Backend Setup

```bash
# Navigate to backend
cd backend

# Build the contract
cargo build --release

# Run tests
cargo test --package sorosub

# Build WASM for deployment
soroban contract build
```

### Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install dependencies
pnpm install

# Run development server
pnpm dev
```

### Deploy to Testnet

```bash
# Configure Stellar testnet
soroban network add testnet \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015"

# Deploy contract
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/sorosub.wasm \
  --network testnet \
  --source <YOUR_SECRET_KEY>
```

---

## 🧪 Testing

All 13 tests passing:

```
running 13 tests
test test::test_initialization ... ok
test test::test_create_subscription ... ok
test test::test_process_payment ... ok
test test::test_process_payment_too_early - should panic ... ok
test test::test_process_payment_after_interval ... ok
test test::test_cancel_subscription ... ok
test test::test_payment_after_cancel - should panic ... ok
test test::test_can_process_payment ... ok
test test::test_credit_score_increment ... ok
test test::test_bnpl_trigger ... ok
test test::test_bnpl_fails_low_credit - should panic ... ok
test test::test_repay_debt ... ok
test test::test_double_initialization - should panic ... ok

test result: ok. 13 passed; 0 failed
```

---

## 🔐 Security Model

### Auth Abstraction Pattern

SoroSub uses Stellar's token allowance system for secure recurring payments:

1. **User approves once**: `token.approve(sorosub_contract, amount, expiration)`
2. **Contract pulls on schedule**: `token.transfer_from(user, merchant, amount)`
3. **Expiration protection**: Approvals have ledger-based expiration

### Security Checks

- ✅ **Interval enforcement**: Payments can only be processed after interval passes
- ✅ **Balance verification**: Checks user balance before attempting transfer
- ✅ **Credit gating**: BNPL only available with credit score >50
- ✅ **Auth requirements**: Critical functions require signatures

---

## 🗺️ Roadmap

- [x] Core subscription contract
- [x] Credit scoring system
- [x] BNPL micro-loans
- [x] Comprehensive test suite
- [ ] Testnet deployment
- [ ] Frontend integration
- [ ] Mainnet launch
- [ ] Multi-token support
- [ ] Subscription marketplace

---

## 👥 Team

| Role | Responsibility |
|------|----------------|
| **Blockchain Dev** | Smart contracts, backend, integration |
| **Frontend Dev** | React components, pages, state management |
| **UI/UX Designer** | Design system, user experience |

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🤝 Contributing

Contributions welcome! Please read our contributing guidelines before submitting PRs.

---

<p align="center">
  Built with ❤️ for the <strong>Stellar Community Fund Build-A-Thon</strong>
</p>
