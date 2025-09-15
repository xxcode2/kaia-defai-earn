<div align="center">
  <img src="front-miniapp/public/brand/more1.png" alt="Vault UI Preview" width="300"/>
</div>

# MORE Earn — Mini dApp on Kaia

**MORE Earn** is a DeFi mini dApp built for the **Kaia** ecosystem.  
Its mission is simple: provide users with an easy way to **deposit USDT** and earn yield via an auto-compounding vault — enriched with **missions, leaderboard, analytics, and referral features** for gamification and adoption.

---

## ✨ Features

### 🏦 Core DeFi
- **Flexible Deposit** → deposit USDT into the Vault and receive proportional shares.
- **Withdraw** → redeem USDT anytime, converted from user shares.
- **TVL Tracker** → displays vault total assets in real-time.
- **Auto-compounding** → steady target APY (default 5%).

### 🔒 Locked Deposit (Demo Mode)
- Simulated lock plans: 30, 60, 90 days with higher APY (7%–10%).
- Locked positions stored off-chain for demo & missions.
- Progresses the **“Use Locked (Demo) once”** mission.

### 🕹 Missions & Gamification
- On-chain & off-chain missions (connect wallet, first deposit, withdraw, referral, etc.).
- Persisted in `localStorage` per user address.
- Reward points accumulate into **tiers** and **badges**.

### 🏆 Leaderboard
- Top 100 depositors ranked by total USDT deposits (on-chain).
- Personal mission/referral points included in total.

### 📊 Analytics
- Shows:
  - **Current TVL**
  - **Unique users**
  - **Total deposits & withdrawals**
- **TVL snapshot** (roadmap: store daily snapshots for sparklines).

### 👤 Profile
- User’s vault balance + estimated daily & monthly yield.
- Tier badges (Bronze, Silver, Gold, Diamond).
- Referral link generator → copy & share to earn referral points.

---

## 🛠 Tech Stack

- **Framework:** [Next.js 14 (App Router)](https://nextjs.org/) + React Server Components
- **Language:** TypeScript
- **UI:** TailwindCSS, shadcn/ui components
- **Blockchain:**  
  - [Ethers v6](https://docs.ethers.org/) for on-chain interactions  
  - Kaia Kairos testnet / Kaia mainnet
- **Wallet Integration:**  
  - LINE **Dapp Portal SDK** + **LIFF** (LINE Mini App)  
  - EIP-1193 `walletProvider.request(...)`
- **State & Data:** React hooks + localStorage
- **Analytics & Logs:** On-chain log parser (`getLogs`, Deposit/Withdraw)

---

## 🚀 Getting Started

### 1. Clone repo & install dependencies
```bash
git clone https://github.com/xxcode2/kaia-defai-earn.git
cd kaia-defai-earn/front-miniapp
npm install
```

2. Configure .env.local

Create a .env.local file in the project root:

NEXT_PUBLIC_CHAIN_ID=1001
NEXT_PUBLIC_RPC_HTTP=https://public-en-kairos.node.kaia.io

NEXT_PUBLIC_VAULT=0xYourVaultAddress
NEXT_PUBLIC_USDT=0xYourUSDTAddress
NEXT_PUBLIC_VAULT_FROM_BLOCK=0

NEXT_PUBLIC_APY=5
NEXT_PUBLIC_SCOPE=https://kairos.scope.kaia.io

# LINE Mini dApp
NEXT_PUBLIC_LIFF_ID=your-liff-id
NEXT_PUBLIC_DAPP_PORTAL_CLIENT_ID=your-client-id

3. Run development server
npm run dev


Open http://localhost:3000

4. Build for production
npm run build
npm run start

### 📌 Roadmap
## Q1 2025

✅ Flexible deposit & withdraw

✅ Missions system (localStorage)

✅ Leaderboard (top 100 on-chain)

✅ Profile tiers & badges

✅ Basic analytics (TVL, users, deposits/withdraws)

## Q2 2025

⏳ On-chain locked deposits (if vault contract supports depositLocked)

⏳ Daily TVL snapshot & sparkline charts

⏳ Share referral link via LINE share target picker

⏳ Enhanced analytics dashboard (APY trend, user growth)

## Q3 2025

⏳ Multi-vault support (multiple stablecoins/tokens)

⏳ Mobile-first optimization for LINE Mini App

⏳ Off-chain missions with backend verification

⏳ Public API for leaderboard & analytics

## Q4 2025

⏳ Governance features (vote on vault parameters)

⏳ NFT badges for high tiers

⏳ Expansion from Kaia testnet → Kaia mainnet

### 📷 UI Preview

Earn Tab: deposit (flexible & locked), withdraw

Missions Tab: gamified tasks for engagement

Activity Tab: on-chain deposit/withdraw logs

Profile Tab: balance, tier, referral

Leaderboard Tab: top depositor ranking

Analytics Tab: TVL, users, deposit/withdraw summary

### 🤝 Contributing

Pull Requests and Issues are welcome!
Standard workflow:

Fork → branch → PR

Provide a clear description of your feature/fix

Follow TypeScript + Tailwind coding style
