# HedgeGuard-2.0 — Smart Contract Overview

## What it does

HedgeGuard-2.0 is an AI-powered LP protection protocol built as a Uniswap v4 hook. It automatically monitors pool risk and activates hedging when market conditions become dangerous.

### Core concepts

- **Tranched vaults**: When you deposit liquidity, it splits 70/30 into a senior tranche (safer, lower returns) and a junior tranche (riskier, higher returns). In losses, junior absorbs first. In profits, senior gets slightly more (110/200 vs 90/200 split).
- **Risk engine**: Each swap updates a per-pool risk score (0–100). The score considers price delta (30%), swap volume (25%), accumulated volatility (25%), and buy/sell imbalance (20%).
- **Adaptive hedge**: Score > 70 → full hedge (intensity 100). Score 40–70 → partial hedge (intensity 50). Score < 30 → hedge decays by 10 per step until off.

### Contract architecture

| Contract | Network | Purpose |
|---|---|---|
| `SochalantHook.sol` | Unichain Sepolia | Uniswap v4 hook + vault + hedge logic |
| `TrancheManager.sol` | (inherited) | Vault accounting, deposit/withdraw, PnL distribution |
| `RiskEngine.sol` | (library) | Risk score calculation |
| `HedgeCallbackReceiver.sol` | Unichain Sepolia | Receives hedge commands from Reactive Network |
| `ReactiveOracleSync.sol` | Reactive Lasna | Monitors Unichain events, triggers callbacks |
| `MockERC20.sol` | (test only) | Free-mintable ERC20 for local testing |

### Cross-chain flow

```
User swaps on Unichain
  → SochalantHook._afterSwap() updates risk score
  → emits ReactiveRiskUpdate / ReactiveHedgeAction
  → ReactiveOracleSync (on Lasna) picks up the event
  → emits Callback back to Unichain
  → HedgeCallbackReceiver.triggerHedge() / unwindHedge()
```

## How to test locally

### 1. Build

```bash
forge build
```

### 2. Run all tests (20 total)

```bash
forge test
```

### 3. Simulate the full flow manually

There is no local fork script yet, but the test suite (`test/SochalantHook.t.sol`) covers every user action. The key test helpers:

- **`simulateSwap(PoolKey, priceChange, volume, isBuy)`** — Simulate a swap event that triggers risk evaluation and hedge logic. Call it directly on the hook (no real PoolManager needed).
- **`deposit(token, amount)`** — Deposit into a vault. Token must be added via `addSupportedToken()` first.
- **`withdraw(token, shares)`** — Withdraw from vault.
- **`getVault(user, token)`** → `Vault` — Check your vault state.
- **`getPoolState(key)`** → `PoolState` — Check current risk metrics.

To walk through the full lifecycle in a local Foundry test:

```
1. Deploy SochalantHook with a mock PoolManager
2. Deploy two MockERC20 tokens
3. Call hook.addSupportedToken(token)
4. Approve token → hook, then hook.deposit(token, 1000 ether)
5. Call hook.simulateSwap(key, largePriceChange, largeVolume, true)
6. Observe PoolStateUpdated event → risk score rises
7. Simulate more swaps until score > 70
8. Observe HedgeUpdated event → hedgeActive = true, intensity = 100
9. Simulate calm swaps (score < 30) → hedge decays
```

### 4. Test the HedgeCallbackReceiver

```bash
forge test --match-contract HedgeCallbackReceiverTest
```

Calls `triggerHedge`, `unwindHedge`, `updatePriceFeed` from the authorized sender and verifies events. Unauthorized callers are rejected.
