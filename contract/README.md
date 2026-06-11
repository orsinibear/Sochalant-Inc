# SoChalant Smart Contracts 🏗️

This repository contains the Uniswap v4 hook and Reactive Network infrastructure for the SoChalant protocol.

## 📁 Contract Structure

- **`src/SochalantHook.sol`**: The core Uniswap v4 hook. It manages pool state, tracks swap volume and volatility, and triggers risk updates.
- **`src/RiskEngine.sol`**: A library that calculates a real-time risk score based on price movement, swap size, volatility, and volume imbalance.
- **`src/TrancheManager.sol`**: Handles the internal accounting for senior and junior risk tranches.
- **`src/ReactiveOracleSync.sol`**: The Reactive Contract that lives on the Reactive Network. It monitors hook events and autonomously triggers callbacks for hedging.
- **`src/HedgeCallbackReceiver.sol`**: The entry point for Reactive Network callbacks on the destination chain (Unichain Sepolia).

## 🔄 Reactive Flow

1. **`SochalantHook`** -> Emits `ReactiveRiskUpdate`.
2. **`ReactiveOracleSync`** -> Catch event -> Evaluates if `riskScore > 70`.
3. **`ReactiveOracleSync`** -> Emits `Callback` to `HedgeCallbackReceiver`.
4. **`HedgeCallbackReceiver`** -> `triggerHedge()` -> Logs final action and updates state.

## 🚀 Usage

### Build
```shell
forge build
```

### Test
```shell
forge test
```

### Deploy
Deployment scripts are located in `script/`. Use the following command to deploy on Unichain Sepolia:

```shell
forge script script/SochalantDeploy.s.sol --rpc-url $UNICHAIN_RPC --private-key $PRIVATE_KEY --broadcast
```

## 📜 License
MIT
