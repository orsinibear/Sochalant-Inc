export type RiskLevel = "Low" | "Medium" | "High";

export interface PoolState {
  lastPrice: number;
  volatility: number;
  buyVolume: number;
  sellVolume: number;
  riskScore: number;
  riskLevel: RiskLevel;
  hedgeActive: boolean;
  hedgeIntensity: number;
}

export interface Vault {
  seniorLiquidity: number;
  juniorLiquidity: number;
  totalLiquidity: number;
  seniorValue: number;
  juniorValue: number;
}

export interface SimulationPoint {
  day: number;
  unprotected: number;
  sochalant: number;
  ilUnprotected: number;
  ilSochalant: number;
}

export interface RiskBreakdown {
  priceImpact: number;
  volumeImpact: number;
  volatilityImpact: number;
  imbalanceImpact: number;
}
