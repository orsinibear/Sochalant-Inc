"use client";

import { COLORS } from "@/lib/constants";
import type { RiskLevel } from "@/lib/types";

interface RiskGaugeProps {
  score: number;
  level: RiskLevel;
}

const levelColors: Record<RiskLevel, string> = {
  Low: COLORS.navy,
  Medium: COLORS.peach,
  High: COLORS.red,
};

export function RiskGauge({ score, level }: RiskGaugeProps) {
  const clamped = Math.min(100, Math.max(0, score));

  return (
    <div className="border border-[var(--cream-dark)] bg-white p-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-medium uppercase tracking-widest text-[var(--navy-muted)]">
            Risk Score
          </h2>
          <p className="mt-1 text-xs text-[var(--navy-muted)]">
            Live IL exposure signal (0–100)
          </p>
        </div>
        <span
          className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-white"
          style={{ backgroundColor: levelColors[level] }}
        >
          {level}
        </span>
      </div>

      <div className="mt-6 flex items-end gap-4">
        <span
          className="font-mono text-5xl font-bold leading-none"
          style={{ color: levelColors[level] }}
        >
          {Math.round(clamped)}
        </span>
        <span className="mb-1 text-sm text-[var(--navy-muted)]">/ 100</span>
      </div>

      <div className="mt-6 h-3 w-full border border-[var(--cream-dark)] bg-[var(--cream)]">
        <div
          className="h-full transition-all duration-500"
          style={{
            width: `${clamped}%`,
            backgroundColor: levelColors[level],
          }}
        />
      </div>

      <div className="mt-2 flex justify-between text-xs text-[var(--navy-muted)]">
        <span>Low (0–30)</span>
        <span>Medium (31–70)</span>
        <span>High (71–100)</span>
      </div>
    </div>
  );
}
