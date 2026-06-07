"use client";

import { COLORS } from "@/lib/constants";

interface SwapSimulatorProps {
  presets: ReadonlyArray<{
    label: string;
    priceChange: number;
    volume: number;
    isBuy: boolean;
  }>;
  onSimulate: (params: {
    priceChange: number;
    volume: number;
    isBuy: boolean;
    label?: string;
  }) => Promise<void>;
  swapLog: string[];
  isPending: boolean;
  isWrongChain: boolean;
  isConnected: boolean;
}

export function SwapSimulator({
  presets,
  onSimulate,
  swapLog,
  isPending,
  isWrongChain,
  isConnected,
}: SwapSimulatorProps) {
  const disabled = !isConnected || isWrongChain || isPending;

  return (
    <div className="border border-[var(--cream-dark)] bg-white p-6">
      <h2 className="text-sm font-medium uppercase tracking-widest text-[var(--navy-muted)]">
        Swap Simulator
      </h2>
      <p className="mt-1 text-xs text-[var(--navy-muted)]">
        Calls <code className="font-mono">hook.simulateSwap()</code> on Unichain Sepolia
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {presets.map((preset) => (
          <button
            key={preset.label}
            type="button"
            disabled={disabled}
            onClick={() => onSimulate({ ...preset, label: preset.label })}
            className="border border-[var(--cream-dark)] px-3 py-2 text-xs font-medium text-[var(--navy)] transition-colors hover:border-[var(--navy)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPending ? "Sending…" : preset.label}
          </button>
        ))}
      </div>

      {swapLog.length > 0 && (
        <div className="mt-4 border border-[var(--cream-dark)] bg-[var(--cream)] p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--navy-muted)]">
            On-chain Events
          </p>
          <ul className="mt-2 space-y-1">
            {swapLog.map((entry) => (
              <li key={entry} className="font-mono text-xs text-[var(--navy)]">
                {entry}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-4 text-xs text-[var(--navy-muted)]">
        Each tx updates the on-chain risk score and may activate hedging per{" "}
        <span style={{ color: COLORS.peach }}>SochalantHook._evaluateHedge()</span>.
      </p>
    </div>
  );
}
