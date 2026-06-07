"use client";

import { COLORS, SENIOR_PERCENT, JUNIOR_PERCENT } from "@/lib/constants";
import type { Vault } from "@/lib/types";

interface TranchePanelProps {
  vault: Vault;
  seniorApy: number;
  juniorApy: number;
}

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);
}

export function TranchePanel({ vault, seniorApy, juniorApy }: TranchePanelProps) {
  const total = vault.totalLiquidity || 1;
  const seniorPct = (vault.seniorValue / total) * 100 || SENIOR_PERCENT;
  const juniorPct = (vault.juniorValue / total) * 100 || JUNIOR_PERCENT;

  return (
    <div className="border border-[var(--cream-dark)] bg-white p-6">
      <h2 className="text-sm font-medium uppercase tracking-widest text-[var(--navy-muted)]">
        Tranche Breakdown
      </h2>
      <p className="mt-1 text-xs text-[var(--navy-muted)]">
        70/30 senior-junior split with first-loss absorption
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="border border-[var(--cream-dark)] p-4" style={{ borderTopColor: COLORS.navy, borderTopWidth: 3 }}>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-[var(--navy)]">Senior Tranche</h3>
            <span className="text-xs font-medium text-[var(--navy-muted)]">Protected</span>
          </div>
          <p className="mt-3 font-mono text-2xl font-semibold text-[var(--navy)]">
            {formatUsd(vault.seniorValue)}
          </p>
          <p className="mt-1 text-sm text-[var(--navy-muted)]">
            {seniorPct.toFixed(0)}% allocation · {seniorApy}% APY
          </p>
          <ul className="mt-3 space-y-1 text-xs text-[var(--navy-muted)]">
            <li>Priority capital protection</li>
            <li>Protected first during hedge events</li>
          </ul>
        </div>

        <div className="border border-[var(--cream-dark)] p-4" style={{ borderTopColor: COLORS.peach, borderTopWidth: 3 }}>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-[var(--navy)]">Junior Tranche</h3>
            <span className="text-xs font-medium text-[var(--navy-muted)]">Risk Absorber</span>
          </div>
          <p className="mt-3 font-mono text-2xl font-semibold" style={{ color: COLORS.peach }}>
            {formatUsd(vault.juniorValue)}
          </p>
          <p className="mt-1 text-sm text-[var(--navy-muted)]">
            {juniorPct.toFixed(0)}% allocation · {juniorApy}% APY
          </p>
          <ul className="mt-3 space-y-1 text-xs text-[var(--navy-muted)]">
            <li>Absorbs first-loss IL exposure</li>
            <li>Capital buffer for senior layer</li>
          </ul>
        </div>
      </div>

      <div className="mt-6 flex h-4 w-full overflow-hidden border border-[var(--cream-dark)]">
        <div style={{ width: `${seniorPct}%`, backgroundColor: COLORS.navy }} />
        <div style={{ width: `${juniorPct}%`, backgroundColor: COLORS.peach }} />
      </div>
      <div className="mt-2 flex justify-between text-xs text-[var(--navy-muted)]">
        <span>Senior {SENIOR_PERCENT}%</span>
        <span>Junior {JUNIOR_PERCENT}%</span>
      </div>
    </div>
  );
}
