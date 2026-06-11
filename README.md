# Sochalant — Uniswap v4 Hook for Tranched Liquidity & Dynamic Hedging

## Contract Addresses (Unichain Sepolia)

| Component | Address |
|---|---|
| **SochalantHook** | [`0x06D616E99B52d1533bf8E6c8e8ACAD6E4907C8c0`](https://sepolia.uniscan.xyz/address/0x06D616E99B52d1533bf8E6c8e8ACAD6E4907C8c0) |
| PoolManager | [`0x00B036B58a818B1BC34d502D3fE730Db729e62AC`](https://sepolia.uniscan.xyz/address/0x00B036B58a818B1BC34d502D3fE730Db729e62AC) |
| Test Token A | [`0x74F23A03Ba43Ed2De41f14f85122c8C08b7318F1`](https://sepolia.uniscan.xyz/address/0x74F23A03Ba43Ed2De41f14f85122c8C08b7318F1) |
| Test Token B | [`0xb59BE515C6F6F543E5FB2f047672113AeAdBEf45`](https://sepolia.uniscan.xyz/address/0xb59BE515C6F6F543E5FB2f047672113AeAdBEf45) |

## Links

| Resource | Link |
|---|---|
| **Frontend (Vercel)** | [https://so-chalant.vercel.app](https://so-chalant.vercel.app) |
| **Hook on Explorer** | [sepolia.uniscan.xyz](https://sepolia.uniscan.xyz/address/0x06D616E99B52d1533bf8E6c8e8ACAD6E4907C8c0) |
| **Presentation** | [https://docs.google.com/presentation/d/1vUnnuRt9CxxZe-v1HlfIVsVIczbiJY0cOziqVGo3nMk/edit?usp=sharing](https://docs.google.com/presentation/d/1vUnnuRt9CxxZe-v1HlfIVsVIczbiJY0cOziqVGo3nMk/edit?usp=sharing) |
| **Demo Video** | *[insert link]* |

## On-Chain Interactions

| Action | Transaction Hash | Explorer |
|---|---|---|
| Hook Deployment (CREATE2) | `0x9ba7ac942ba68822df708163b0dc33e0d1b7d7b98b395638b43d9675c66f96d4` | [View](https://sepolia.uniscan.xyz/tx/0x9ba7ac942ba68822df708163b0dc33e0d1b7d7b98b395638b43d9675c66f96d4) |
| Pool Initialization | `0xcc4f85aad835f0e44a4120bda63b8e31dc0ae051999b1ab897319faa8b615ab2` | [View](https://sepolia.uniscan.xyz/tx/0xcc4f85aad835f0e44a4120bda63b8e31dc0ae051999b1ab897319faa8b615ab2) |
| Liquidity Addition (via LiquidityAdder) | `0x698f4b8706f7530a237d6c0858200c122cc8b33e82cbf9a2dfa3908d9f7b9a2e` | [View](https://sepolia.uniscan.xyz/tx/0x698f4b8706f7530a237d6c0858200c122cc8b33e82cbf9a2dfa3908d9f7b9a2e) |
| Swap (via SwapHelper) | `0x6914584675e7f5d260d33b6ccea655c8f0dc9160d382f9b1e861d627095d9c44` | [View](https://sepolia.uniscan.xyz/tx/0x6914584675e7f5d260d33b6ccea655c8f0dc9160d382f9b1e861d627095d9c44) |

---

## Problem

Uniswap v4 pools expose powerful hooks for customizing AMM behavior, but LPs face two unsolved problems:

1. **No risk-tiered exposure** — All LPs share the same impermanent loss and fee return regardless of risk appetite.
2. **No automated hedging** — Pools don't react to market conditions. Volatility spikes can wipe out LP returns before anyone can rebalance.

## Solution: Sochalant Hook

Sochalant attaches to a Uniswap v4 pool and introduces **tranched liquidity** and **dynamic hedging** entirely inside the hook — no external oracles, no keeper bots, no additional infrastructure.

## How It Works

### 1. Tranched Liquidity (`_beforeAddLiquidity`)

When an LP adds liquidity, the hook intercepts the call via `beforeAddLiquidity` and splits the position into two tranches:

- **Senior tranche (70%)** — Lower risk, lower fee exposure
- **Junior tranche (30%)** — Higher risk, higher fee exposure

The split ratio is stored on-chain and readable via `getPosition(address)`.

### 2. Risk Engine & Dynamic Hedging (`_beforeSwap` / `_afterSwap`)

Every swap triggers the hook:

- **`_beforeSwap`** — Records the pool's `sqrtPriceX96` as `lastPrice` on first touch.
- **`_afterSwap`** — Computes:
  - **Price delta** — change in `sqrtPriceX96` since last swap
  - **Swap size** — absolute notional flow from the swap
  - **Volatility accumulator** — running sum of normalized price changes
  - **Risk score** (0–100) — weighted combination of price impact, volume impact, and volatility

```solidity
riskScore = priceDelta * 40% + swapSize/liquidity * 30% + volatility * 30%
```

If the risk score exceeds **70**, hedging activates at **100% intensity**.  
If the risk score drops below **40**, intensity decays by 10 per swap until it reaches 0 and hedging turns off.

All state is stored in a `VaultState` struct keyed by `poolId`:

```solidity
struct VaultState {
    uint256 lastPrice;
    uint256 riskScore;
    uint256 volatility;
    bool hedgeActive;
    uint256 hedgeIntensity;
}
```

## Architecture

```
┌─────────────────────────────────────────────────┐
│               PoolManager (v4-core)              │
│  ┌───────────────────────────────────────────┐   │
│  │         SochalantHook                      │   │
│  │  ┌─────────────┐  ┌──────────────────┐   │   │
│  │  │ Tranche     │  │  RiskEngine       │   │   │
│  │  │ Manager     │  │  (library)        │   │   │
│  │  │             │  │  - risk score     │   │   │
│  │  │ - positions │  │  - risk level     │   │   │
│  │  │ - split     │  │                   │   │   │
│  │  └─────────────┘  └──────────────────┘   │   │
│  │                                           │   │
│  │  VaultState: lastPrice, riskScore,        │   │
│  │  volatility, hedgeActive, hedgeIntensity  │   │
│  └───────────────────────────────────────────┘   │
│                                                 │
│  LiquidityAdder                 SwapHelper       │
│  (unlock → modifyLiquidity)    (unlock → swap)  │
└─────────────────────────────────────────────────┘
```

## Steps to Test

### Prerequisites

- Foundry (forge, cast)
- RPC endpoint for Unichain Sepolia: `https://sepolia.unichain.org`
- A funded wallet on Unichain Sepolia

### 1. Verify Hook Permissions

```bash
cast call 0x06D616E99B52d1533bf8E6c8e8ACAD6E4907C8c0 \
  "getHookPermissions()(bool,bool,bool,bool,bool,bool,bool,bool,bool,bool,bool,bool,bool,bool)" \
  --rpc-url https://sepolia.unichain.org
```

Expect `beforeSwap=true`, `afterSwap=true`, `beforeAddLiquidity=true` (rest `false`).

### 2. Check Vault State

```bash
cast call 0x06D616E99B52d1533bf8E6c8e8ACAD6E4907C8c0 \
  "vaultState(bytes32)(uint256,uint256,uint256,bool)" \
  0x3943e7e886711995f0f319cbc14096cb7c904539c722fa26f3e2d93c45f95d71 \
  --rpc-url https://sepolia.unichain.org
```

After a swap, this returns `(sqrtPriceX96, riskScore, volatility, hedgeActive)`.

### 3. Check Tranched Position

```bash
cast call 0x06D616E99B52d1533bf8E6c8e8ACAD6E4907C8c0 \
  "getPosition(address)(uint256,uint256,uint256)" \
  0x2a617739e71e83386fe98f9f3bb8cebd5e304541 \
  --rpc-url https://sepolia.unichain.org
```

Returns `(seniorLiquidity, juniorLiquidity, totalLiquidity)`.

### 4. Run Setup (Deploy Tokens, Initialize Pool, Add Liquidity)

```bash
PRIVATE_KEY=<your_key> forge script script/SetupPool.s.sol:SetupPool \
  --rpc-url https://sepolia.unichain.org --broadcast --slow
```

### 5. Run a Swap

```bash
PRIVATE_KEY=<your_key> forge script script/Swap.s.sol:Swap \
  --rpc-url https://sepolia.unichain.org --broadcast --slow
```

### 6. Redeploy & Update (if modifying the hook)

```bash
PRIVATE_KEY=<your_key> POOL_MANAGER=0x00B036B58a818B1BC34d502D3fE730Db729e62AC \
  forge script script/SochalantDeploy.s.sol:SochalantDeploy \
  --rpc-url https://sepolia.unichain.org --broadcast --slow
```

Then update the `HOOK` constant in `SetupPool.s.sol` and `Swap.s.sol` with the new address and re-run steps 4–5.

## Source Files

| File | Purpose |
|---|---|
| `src/SochalantHook.sol` | Main hook — calls `_createPosition`, computes risk, manages hedge state |
| `src/TrancheManager.sol` | Position storage and 70/30 senior/junior split |
| `src/RiskEngine.sol` | Pure library for risk score calculation |
| `script/SochalantDeploy.s.sol` | CREATE2 deployment via HookMiner |
| `script/SetupPool.s.sol` | Deploys tokens, initializes pool, adds liquidity |
| `script/Swap.s.sol` | Executes a swap to trigger hook callbacks |

## Tech Stack

- **Uniswap v4-core** — PoolManager, hooks architecture
- **v4-hooks-public** — BaseHook, HookMiner
- **Foundry** — Development, testing, deployment
- **Unichain Sepolia** — L2 testnet deployment target