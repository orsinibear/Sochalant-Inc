import { COLORS } from "./constants";
import type { PoolState } from "./types";

/**
 * Hedge UI treatment from contract/frontend.md
 */
export interface HedgeUiState {
  badge: string;
  label: string;
  description: string;
  color: string;
  bgColor: string;
  intensity: number;
}

export function getHedgeUiState(poolState: PoolState): HedgeUiState {
  const { riskScore, hedgeActive, hedgeIntensity } = poolState;

  if (riskScore > 70) {
    return {
      badge: "Full Hedge",
      label: "Full hedge — consider withdrawing",
      description: "Risk score above 70. Maximum protection deployed at 100% intensity.",
      color: COLORS.red,
      bgColor: "#FDF0EE",
      intensity: hedgeActive ? Number(hedgeIntensity) : 100,
    };
  }

  if (riskScore > 40) {
    return {
      badge: "Partial Hedge",
      label: "Partial hedge",
      description: "Moderate risk (41–70). Hedge active at 50% intensity.",
      color: COLORS.peach,
      bgColor: "#FBF3EF",
      intensity: hedgeActive ? Number(hedgeIntensity) : 50,
    };
  }

  if (riskScore > 30) {
    return {
      badge: "Low Risk",
      label: "Low risk",
      description: "Score 31–40. Hedge off, conditions stable.",
      color: COLORS.navy,
      bgColor: "#EEF2F7",
      intensity: 0,
    };
  }

  return {
    badge: hedgeIntensity > 0 && hedgeIntensity < 50 ? "Unwinding" : "Safe",
    label: hedgeIntensity > 0 && hedgeIntensity < 50 ? "Hedge decaying" : "Safe",
    description:
      hedgeIntensity > 0 && hedgeIntensity < 50
        ? "Score below 30. Hedge winding down by 10% per step."
        : "Score 0–30. No hedge active.",
    color: COLORS.navy,
    bgColor: "#EEF2F7",
    intensity: Number(hedgeIntensity),
  };
}

export function riskLevelFromIndex(index: number): PoolState["riskLevel"] {
  return (["Low", "Medium", "High"] as const)[index] ?? "Low";
}
