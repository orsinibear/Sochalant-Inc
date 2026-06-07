"use client";

import { COLORS } from "@/lib/constants";
import type { RiskBreakdown } from "@/lib/types";

interface RiskBreakdownPanelProps {
  breakdown: RiskBreakdown;
  buyVolume: number;
  sellVolume: number;
  volatility: number;
}

const factors = [
  { key: "priceImpact" as const, label: "Price Delta", weight: "30%" },
  { key: "volumeImpact" as const, label: "Swap Volume", weight: "25%" },
  { key: "volatilityImpact" as const, label: "Volatility", weight: "25%" },
  { key: "imbalanceImpact" as const, label: "Buy/Sell Imbalance", weight: "20%" },
];

export function RiskBreakdownPanel({
  breakdown,
  buyVolume,
  sellVolume,
  volatility,
}: RiskBreakdownPanelProps) {
  const maxImpact = Math.max(
    breakdown.priceImpact,
    breakdown.volumeImpact,
    breakdown.volatilityImpact,
    breakdown.imbalanceImpact,
    1,
  );

  return (
    <div className="border border-[var(--cream-dark)] bg-white p-6">
      <h2 className="text-sm font-medium uppercase tracking-widest text-[var(--navy-muted)]">
        Risk Engine
      </h2>
      <p className="mt-1 text-xs text-[var(--navy-muted)]">
        Weighted score components mirroring on-chain RiskEngine.sol
      </p>

      <div className="mt-6 space-y-4">
        {factors.map(({ key, label, weight }) => (
          <div key={key}>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--navy-muted)]">
                {label}{" "}
                <span className="text-xs">({weight})</span>
              </span>
              <span className="font-mono text-[var(--navy)]">
                {breakdown[key].toFixed(1)}
              </span>
            </div>
            <div className="mt-1 h-2 w-full border border-[var(--cream-dark)] bg-[var(--cream)]">
              <div
                className="h-full"
                style={{
                  width: `${(breakdown[key] / maxImpact) * 100}%`,
                  backgroundColor: COLORS.navy,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3 border-t border-[var(--cream-dark)] pt-4 text-center">
        <div>
          <p className="text-xs text-[var(--navy-muted)]">Buy Vol</p>
          <p className="font-mono text-sm font-medium text-[var(--navy)]">
            {(buyVolume / 1e18).toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-xs text-[var(--navy-muted)]">Sell Vol</p>
          <p className="font-mono text-sm font-medium text-[var(--navy)]">
            {(sellVolume / 1e18).toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-xs text-[var(--navy-muted)]">Volatility</p>
          <p className="font-mono text-sm font-medium text-[var(--navy)]">
            {(volatility / 1e6).toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}
