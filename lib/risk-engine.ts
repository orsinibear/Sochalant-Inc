import { RISK_THRESHOLDS } from "./constants";
import type { PoolState, RiskBreakdown, RiskLevel } from "./types";

const PRICE_WEIGHT = 30;
const VOLUME_WEIGHT = 25;
const VOLATILITY_WEIGHT = 25;
const IMBALANCE_WEIGHT = 20;
const MAX_RISK_SCORE = 100;

export function getRiskLevel(riskScore: number): RiskLevel {
  if (riskScore <= RISK_THRESHOLDS.low) return "Low";
  if (riskScore <= RISK_THRESHOLDS.medium) return "Medium";
  return "High";
}

export function calculateRiskScore(
  priceDelta: number,
  swapSize: number,
  liquidity: number,
  volatilityAccumulator: number,
  buyVolume: number,
  sellVolume: number,
): { riskScore: number; riskLevel: RiskLevel; breakdown: RiskBreakdown } {
  if (liquidity === 0) {
    return {
      riskScore: 0,
      riskLevel: "Low",
      breakdown: { priceImpact: 0, volumeImpact: 0, volatilityImpact: 0, imbalanceImpact: 0 },
    };
  }

  const totalVolume = buyVolume + sellVolume;
  const imbalance =
    totalVolume === 0
      ? 0
      : (Math.abs(buyVolume - sellVolume) * 100) / totalVolume;

  const priceImpact = (priceDelta * PRICE_WEIGHT) / 1e18;
  const volumeImpact = (swapSize * VOLUME_WEIGHT) / liquidity;
  const volatilityImpact = (volatilityAccumulator * VOLATILITY_WEIGHT) / 1e18;
  const imbalanceImpact = (imbalance * IMBALANCE_WEIGHT) / 100;

  const riskScore = Math.min(
    MAX_RISK_SCORE,
    priceImpact + volumeImpact + volatilityImpact + imbalanceImpact,
  );

  return {
    riskScore,
    riskLevel: getRiskLevel(riskScore),
    breakdown: { priceImpact, volumeImpact, volatilityImpact, imbalanceImpact },
  };
}

export function evaluateHedge(
  riskScore: number,
  current: Pick<PoolState, "hedgeActive" | "hedgeIntensity">,
): Pick<PoolState, "hedgeActive" | "hedgeIntensity"> {
  if (riskScore > 70) {
    return { hedgeActive: true, hedgeIntensity: 100 };
  }
  if (riskScore > 40 && riskScore <= 70) {
    return { hedgeActive: true, hedgeIntensity: 50 };
  }
  if (riskScore < 30) {
    if (current.hedgeIntensity > 10) {
      return { hedgeActive: true, hedgeIntensity: current.hedgeIntensity - 10 };
    }
    return { hedgeActive: false, hedgeIntensity: 0 };
  }
  return current;
}

export function createInitialPoolState(): PoolState {
  return {
    lastPrice: 1e18,
    volatility: 0,
    buyVolume: 0,
    sellVolume: 0,
    riskScore: 12,
    riskLevel: "Low",
    hedgeActive: false,
    hedgeIntensity: 0,
  };
}

export function createEmptyVault(): import("./types").Vault {
  return {
    seniorLiquidity: 0,
    juniorLiquidity: 0,
    totalLiquidity: 0,
    seniorValue: 0,
    juniorValue: 0,
  };
}

export function depositToVault(
  vault: import("./types").Vault,
  amount: number,
): import("./types").Vault {
  const senior = (amount * 70) / 100;
  const junior = (amount * 30) / 100;
  return {
    seniorLiquidity: vault.seniorLiquidity + senior,
    juniorLiquidity: vault.juniorLiquidity + junior,
    totalLiquidity: vault.totalLiquidity + amount,
    seniorValue: vault.seniorValue + senior,
    juniorValue: vault.juniorValue + junior,
  };
}

export function generateSimulationData(days = 30): import("./types").SimulationPoint[] {
  const points: import("./types").SimulationPoint[] = [];
  let unprotected = 10000;
  let sochalant = 10000;

  for (let day = 1; day <= days; day++) {
    const volatility = Math.sin(day / 4) * 0.015 + (Math.random() - 0.5) * 0.008;
    const fees = 12 + Math.random() * 6;

    const ilUnprotected = Math.abs(volatility) * 800 + (day > 15 ? (day - 15) * 18 : 0);
    const ilSochalant = ilUnprotected * (day > 20 ? 0.35 : 0.55);
    const hedgeCost = day > 18 && day < 26 ? 25 + Math.random() * 15 : 0;

    unprotected = unprotected + fees - ilUnprotected;
    sochalant = sochalant + fees * 1.08 - ilSochalant - hedgeCost;

    points.push({
      day,
      unprotected: Math.round(unprotected),
      sochalant: Math.round(sochalant),
      ilUnprotected: Math.round(ilUnprotected),
      ilSochalant: Math.round(ilSochalant),
    });
  }

  return points;
}
