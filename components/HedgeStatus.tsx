"use client";

import { getHedgeUiState } from "@/lib/hedge-status";
import { COLORS } from "@/lib/constants";
import type { PoolState } from "@/lib/types";

interface HedgeStatusProps {
  poolState: PoolState;
}

export function HedgeStatus({ poolState }: HedgeStatusProps) {
  const ui = getHedgeUiState(poolState);

  return (
    <div className="border border-[var(--cream-dark)] bg-white p-6">
      <h2 className="text-sm font-medium uppercase tracking-widest text-[var(--navy-muted)]">
        Hedge Status
      </h2>
      <p className="mt-1 text-xs text-[var(--navy-muted)]">
        Thresholds per contract/frontend.md
      </p>

      <div
        className="mt-4 border p-4"
        style={{ borderColor: ui.color, backgroundColor: ui.bgColor }}
      >
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: ui.color }} />
          <span className="text-lg font-semibold" style={{ color: ui.color }}>
            {ui.label}
          </span>
        </div>
        <p className="mt-2 text-sm text-[var(--navy-muted)]">{ui.description}</p>
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--navy-muted)]">Intensity</span>
            <span className="font-mono font-medium text-[var(--navy)]">
              {ui.intensity}%
            </span>
          </div>
          <div className="mt-1 h-2 w-full border border-[var(--cream-dark)] bg-[var(--cream)]">
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${ui.intensity}%`,
                backgroundColor: ui.intensity > 0 ? ui.color : COLORS.navyMuted,
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 text-center text-xs sm:grid-cols-4">
          {[
            { range: "0–30", label: "Safe / Decaying", active: poolState.riskScore <= 30 },
            { range: "31–40", label: "Low risk", active: poolState.riskScore > 30 && poolState.riskScore <= 40 },
            { range: "41–70", label: "Partial", active: poolState.riskScore > 40 && poolState.riskScore <= 70 },
            { range: "71–100", label: "Full hedge", active: poolState.riskScore > 70 },
          ].map(({ range, label, active }) => (
            <div
              key={range}
              className="border p-2"
              style={{
                borderColor: active ? ui.color : "var(--cream-dark)",
                backgroundColor: active ? ui.bgColor : "white",
              }}
            >
              <p className="font-medium text-[var(--navy)]">{label}</p>
              <p className="text-[var(--navy-muted)]">{range}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
