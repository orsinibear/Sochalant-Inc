import { formatUnits } from "viem";
import type { PoolState, Vault } from "./types";

export function mapVault(raw: {
  seniorLiquidity: bigint;
  juniorLiquidity: bigint;
  totalLiquidity: bigint;
  seniorValue: bigint;
  juniorValue: bigint;
}): Vault {
  return {
    seniorLiquidity: Number(formatUnits(raw.seniorLiquidity, 18)),
    juniorLiquidity: Number(formatUnits(raw.juniorLiquidity, 18)),
    totalLiquidity: Number(formatUnits(raw.totalLiquidity, 18)),
    seniorValue: Number(formatUnits(raw.seniorValue, 18)),
    juniorValue: Number(formatUnits(raw.juniorValue, 18)),
  };
}

export function emptyVault(): Vault {
  return {
    seniorLiquidity: 0,
    juniorLiquidity: 0,
    totalLiquidity: 0,
    seniorValue: 0,
    juniorValue: 0,
  };
}

export function combineVaults(a: Vault, b: Vault): Vault {
  return {
    seniorLiquidity: a.seniorLiquidity + b.seniorLiquidity,
    juniorLiquidity: a.juniorLiquidity + b.juniorLiquidity,
    totalLiquidity: a.totalLiquidity + b.totalLiquidity,
    seniorValue: a.seniorValue + b.seniorValue,
    juniorValue: a.juniorValue + b.juniorValue,
  };
}

export function formatTokenAmount(value: number, maxDecimals = 2): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: maxDecimals });
}
