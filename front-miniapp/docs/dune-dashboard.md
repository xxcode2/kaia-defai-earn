# 📊 MORE Earn — Dune Dashboard

## 🔗 Public Dashboard
- URL: [https://dune.com/your-team/more-earn-vault](https://dune.com/your-team/more-earn-vault)  
  (cek bisa diakses tanpa login)

## ✅ Publish Checklist
- [x] Public Dune URL (bisa diakses saat logout)
- [x] Usage tiles
  - Total Transactions
  - Unique Wallets
  - Key Flows (Deposits, Withdrawals, TVL)
- [x] Contracts table (vault, USDT)

---

## 🛠️ Queries

### 1. Total Deposits
```sql
SELECT
  ROUND(SUM(value / POWER(10, :decimals))::numeric, 4) AS total_deposits_usdt
FROM {kaia}.ERC20_evt_Transfer
WHERE contract_address = LOWER(:usdt)
  AND "to" = LOWER(:vault)
  AND evt_block_number >= :from_block;
2. Total Withdrawals
sql
Copy code
SELECT
  ROUND(SUM(value / POWER(10, :decimals))::numeric, 4) AS total_withdrawals_usdt
FROM {kaia}.ERC20_evt_Transfer
WHERE contract_address = LOWER(:usdt)
  AND "from" = LOWER(:vault)
  AND evt_block_number >= :from_block;
3. Unique Depositors
sql
Copy code
SELECT COUNT(DISTINCT "from") AS unique_depositors
FROM {kaia}.ERC20_evt_Transfer
WHERE contract_address = LOWER(:usdt)
  AND "to" = LOWER(:vault)
  AND evt_block_number >= :from_block;
4. TVL (Net Flow)
sql
Copy code
WITH deposits AS (
  SELECT COALESCE(SUM(value), 0) AS v
  FROM {kaia}.ERC20_evt_Transfer
  WHERE contract_address = LOWER(:usdt)
    AND "to" = LOWER(:vault)
),
withdrawals AS (
  SELECT COALESCE(SUM(value), 0) AS v
  FROM {kaia}.ERC20_evt_Transfer
  WHERE contract_address = LOWER(:usdt)
    AND "from" = LOWER(:vault)
)
SELECT ROUND(((d.v - w.v) / POWER(10, :decimals))::numeric, 4) AS tvl_usdt
FROM deposits d CROSS JOIN withdrawals w;
5. Daily Flows (Deposits vs Withdrawals)
sql
Copy code
WITH dep AS (
  SELECT DATE_TRUNC('day', evt_block_time) AS day, SUM(value) AS v
  FROM {kaia}.ERC20_evt_Transfer
  WHERE contract_address = LOWER(:usdt)
    AND "to" = LOWER(:vault)
  GROUP BY 1
),
wd AS (
  SELECT DATE_TRUNC('day', evt_block_time) AS day, SUM(value) AS v
  FROM {kaia}.ERC20_evt_Transfer
  WHERE contract_address = LOWER(:usdt)
    AND "from" = LOWER(:vault)
  GROUP BY 1
)
SELECT
  COALESCE(dep.day, wd.day) AS day,
  ROUND(COALESCE(dep.v, 0) / POWER(10, :decimals), 4) AS deposits_usdt,
  ROUND(COALESCE(wd.v, 0) / POWER(10, :decimals), 4) AS withdrawals_usdt
FROM dep
FULL OUTER JOIN wd ON dep.day = wd.day
ORDER BY day;
📄 Contracts Table
Name	Address
Vault	0x328f7dEB7a47EE05D2013395096613F8929d7015
USDT	0xB00ce96eE443CAa3d902f6B062C6A69310A88086
Chain	Kairos Testnet
From	Block 196058363
