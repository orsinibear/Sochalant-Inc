import { type Address } from "viem";

/** Deployed addresses from contract/frontend.md (Unichain Sepolia) */
export const DEPLOYED = {
  sochalantHook: "0xD998C72e625ffF81F5D65C43D56022836Bcc40c0" as Address,
  hedgeCallback: "0xF8d7f7b1054913258902A275eE2C565eB5041A9D" as Address,
  tokenA: "0xdFDCF162de160694d5a2a7Ed23DEED80368Eac72" as Address,
  tokenB: "0x57aE1e414d8e3EAe1EC4e717005A367288676E69" as Address,
} as const;

/** Unichain Sepolia PoolManager — contract/deploy.md */
const DEFAULT_POOL_MANAGER =
  "0x00B036B58a818B1BC34d502D3fE730Db729e62AC" as Address;

function addressFromEnv(env: string | undefined, fallback: Address): Address {
  return (env as Address) || fallback;
}

export const contracts = {
  hook: addressFromEnv(
    process.env.NEXT_PUBLIC_SOCHALANT_HOOK_ADDRESS,
    DEPLOYED.sochalantHook,
  ),
  callback: addressFromEnv(
    process.env.NEXT_PUBLIC_HEDGE_CALLBACK_ADDRESS,
    DEPLOYED.hedgeCallback,
  ),
  tokenA: addressFromEnv(process.env.NEXT_PUBLIC_TOKEN_A_ADDRESS, DEPLOYED.tokenA),
  tokenB: addressFromEnv(process.env.NEXT_PUBLIC_TOKEN_B_ADDRESS, DEPLOYED.tokenB),
  poolManager: addressFromEnv(
    process.env.NEXT_PUBLIC_POOL_MANAGER_ADDRESS,
    DEFAULT_POOL_MANAGER,
  ),
} as const;

export const poolKey = {
  currency0: contracts.tokenA,
  currency1: contracts.tokenB,
  fee: Number(process.env.NEXT_PUBLIC_POOL_FEE ?? 3000),
  tickSpacing: Number(process.env.NEXT_PUBLIC_POOL_TICK_SPACING ?? 60),
  hooks: contracts.hook,
} as const;

export const TOKENS = {
  A: { symbol: "TKA", name: "Token A", address: contracts.tokenA },
  B: { symbol: "TKB", name: "Token B", address: contracts.tokenB },
} as const;
