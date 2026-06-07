# Deployment Guide — HedgeGuard-2.0

## Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation) installed
- Wallet private key with testnet ETH on **Unichain Sepolia** (chain 1301)
- Wallet private key with testnet tokens on **Reactive Lasna** (chain 5318007)
- Unichain Sepolia PoolManager address: `0x00B036B58a818B1BC34d502D3fE730Db729e62AC`
- Unichain Sepolia Callback Proxy: `0x9299472A6399Fd1027ebF067571Eb3e3D7837FC4`

## Environment variables

Create a `.env` file (never commit it):

```bash
# Required
PRIVATE_KEY=0x...
POOL_MANAGER=0x00B036B58a818B1BC34d502D3fE730Db729e62AC

# For the Lasna deployment (set after Unichain deployment)
HOOK_ADDRESS=<sochalant_hook_address_from_step_1>
CALLBACK_ADDRESS=<hedge_callback_address_from_step_1>
UNICHAIN_CHAIN_ID=1301

# Optional verification
ETHERSCAN_API_KEY=your_key
```

Load it:

```bash
source .env
```

On Windows PowerShell:

```powershell
$env:PRIVATE_KEY = "0x..."
$env:POOL_MANAGER = "0x00B036B58a818B1BC34d502D3fE730Db729e62AC"
```

---

## Step 1 — Build

```bash
forge build
```

Expected output: `Compiler run successful`

---

## Step 2 — Run tests

```bash
forge test
```

Expected: 20 tests pass, 0 failed.

---

## Step 3 — Deploy SochalantHook + HedgeCallbackReceiver (Unichain Sepolia)

```bash
forge script script/SochalantDeploy.s.sol:SochalantDeploy \
  --rpc-url unichain_sepolia \
  --broadcast \
  --verify
```

The script will:

1. Deploy `SochalantHook` with CREATE2 — brute-forces a salt so the address ends with `0xC0` (permission bits for `beforeSwap` + `afterSwap`)
2. Deploy `HedgeCallbackReceiver`, linking it to the hook
3. Deploy two `MockERC20` tokens (TokenA, TokenB)
4. Whitelist both tokens on the hook

**Output** — note these addresses from the console logs:

```
SochalantHook deployed at: 0xD998C72e625ffF81F5D65C43D56022836Bcc40c0
HedgeCallbackReceiver deployed at: 0xF8d7f7b1054913258902A275eE2C565eB5041A9D
TokenA: 0xdFDCF162de160694d5a2a7Ed23DEED80368Eac72
TokenB: 0x57aE1e414d8e3EAe1EC4e717005A367288676E69
```

**If `--verify` fails** (Unichain Sepolia may not be on Sourcify yet), skip verification:

```bash
forge script script/SochalantDeploy.s.sol:SochalantDeploy \
  --rpc-url unichain_sepolia \
  --broadcast
```

---

## Step 4 — Update callback sender

After ReactiveOracleSync is deployed on Lasna (next step), update the callback sender on HedgeCallbackReceiver so it only accepts calls from the Reactive contract:

```bash
cast send $CALLBACK_ADDRESS \
  "setCallbackSender(address)" \
  $REACTIVE_ORACLE_ADDRESS \
  --rpc-url unichain_sepolia \
  --private-key $PRIVATE_KEY
```

Alternatively, this can be done after step 5.

---

## Step 5 — Deploy ReactiveOracleSync (Reactive Lasna)

First set the addresses from Step 3:

```powershell
$env:HOOK_ADDRESS = "0xD998C72e625ffF81F5D65C43D56022836Bcc40c0"   # from step 3
$env:CALLBACK_ADDRESS = "0xF8d7f7b1054913258902A275eE2C565eB5041A9D"   # from step 3
$env:UNICHAIN_CHAIN_ID = "1301"
```

Then deploy:

```bash
forge script script/SochalantDeploy.s.sol:SochalantDeploy \
  --sig "deployLasna()" \
  --rpc-url reactive_lasna \
  --broadcast
```

Expected output:

```
ReactiveOracleSync deployed at: 0x...
```

The constructor automatically subscribes to `ReactiveRiskUpdate` and `ReactiveHedgeAction` events from the SochalantHook on Unichain Sepolia.

---

## Step 6 — Verify deployment

Check that the Reactive subscription worked:

```bash
cast call $REACTIVE_ORACLE_ADDRESS \
  "hookAddress()" \
  --rpc-url reactive_lasna
# Should return the SochalantHook address

cast call $REACTIVE_ORACLE_ADDRESS \
  "callbackAddress()" \
  --rpc-url reactive_lasna
# Should return the HedgeCallbackReceiver address

cast call $REACTIVE_ORACLE_ADDRESS \
  "unichainSepoliaChainId()" \
  --rpc-url reactive_lasna
# Should return 1301
```

---

## Step 7 — Full end-to-end test

```bash
# 1. Mint test tokens
cast send $TOKEN_A "mint(address,uint256)" $YOUR_ADDRESS 10000000000000000000000 \
  --rpc-url unichain_sepolia --private-key $PRIVATE_KEY

# 2. Approve hook
cast send $TOKEN_A "approve(address,uint256)" $SOCHALANT_HOOK 10000000000000000000000 \
  --rpc-url unichain_sepolia --private-key $PRIVATE_KEY

# 3. Deposit
cast send $SOCHALANT_HOOK "deposit(address,uint256)" $TOKEN_A 1000000000000000000000 \
  --rpc-url unichain_sepolia --private-key $PRIVATE_KEY

# 4. Check vault
cast call $SOCHALANT_HOOK "getVault(address,address)" $YOUR_ADDRESS $TOKEN_A \
  --rpc-url unichain_sepolia
```

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `CREATE2` loop does not find a valid salt | Increase loop max from 50,000 in `SochalantDeploy.s.sol:27` |
| `--verify` does not work | Skip `--verify` — Unichain Sepolia may not be indexed by Sourcify/Blockscout yet |
| Transaction underpriced | Unichain Sepolia gas is low; if needed, add `--with-gas-price` flag |
| Reactive Network RPC down | Check https://dev.reactive.network for current RPC endpoints |

## Quick reference

```bash
# Build
forge build

# Test
forge test

# Deploy to Unichain Sepolia
forge script script/SochalantDeploy.s.sol:SochalantDeploy \
  --rpc-url unichain_sepolia --broadcast

# Deploy to Reactive Lasna
forge script script/SochalantDeploy.s.sol:SochalantDeploy \
  --sig "deployLasna()" \
  --rpc-url reactive_lasna --broadcast
```
