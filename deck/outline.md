# MORE Earn — Kaia USDT (Pitch Outline)

## 1. Problem
- Stablecoin capital on Kaia lacks simple, transparent, mission-driven “trade-and-earn” flows inside LINE Mini Apps.
- New users need a lightweight on-ramp to *earn* with stablecoins without complex DeFi UX.

## 2. Solution
- **MORE Earn**: a minimal USDT vault on Kaia with clear APY target, deposit/withdraw, missions, referral growth.
- **LINE Mini-App** frontend: low-friction entry, social-native missions and referrals.
- **Analytics**: TVL, users, deposits, withdrawals to prove traction.

## 3. Product (today)
- Vault (testnet): deposit/withdraw (ERC-20 USDT, 6 decimals).  
- Missions: M#1 (first deposit ≥ 100), M#2 (3× deposits ≥ 10).  
- Profile: points (off-chain), referral link `?ref=0x...`.  
- Leaderboard: referrers by invited TVL.  
- Analytics page + API: TVL, users, total deposits/withdrawals (cached).

## 4. How it works (technical)
- Smart contracts (ERC4626-style compatible paths where possible).  
- On-chain events: `Deposit`, `Withdraw`, `MissionCompleted`, `Referred`.  
- Frontend: Next.js + ethers v6; RPC-only, no indexer required for demo.  
- Server routes: cached analytics; fast demo without external infra.

## 5. Go-to-Market
- LINE missions & referral loops.  
- Campaigns with merchants (earn USDT cashback missions).  
- Community “quests” to drive initial TVL + badge NFTs.

## 6. Roadmap
- Real strategy backends (conservative/moderate/aggressive), audited.  
- LIFF mini-app packaging + LINE login / DID.  
- Dune / Flipside dashboards (if Kaia supported) or community subgraph.  
- Additional stablecoin pools & cross-ecosystem quests.

## 7. Team
- Axell - Smart Contract, Frontend, Product.

## 8. Ask
- Partnerships, grants for audits, and distribution through LINE mini-apps.

## Links
- GitHub: (https://github.com/xxcode2/kaia-defai-earn)
- Demo: <demo-url>
- Docs: `/README.md`
- Analytics: `/analytics`
