"use client";

import { COLORS } from "@/lib/constants";
import { contracts } from "@/lib/contracts";

export interface ReactiveEvent {
  id: string;
  type: "HedgeTriggered" | "HedgeUnwound" | "PriceFeedUpdated" | "ReactiveRiskUpdate";
  message: string;
  timestamp: number;
}

interface ReactiveEventsPanelProps {
  events: ReactiveEvent[];
}

const typeColors: Record<ReactiveEvent["type"], string> = {
  HedgeTriggered: COLORS.red,
  HedgeUnwound: COLORS.navy,
  PriceFeedUpdated: COLORS.peach,
  ReactiveRiskUpdate: COLORS.navyMuted,
};

export function ReactiveEventsPanel({ events }: ReactiveEventsPanelProps) {
  const short = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`;

  return (
    <div className="border border-[var(--cream-dark)] bg-white p-6">
      <h2 className="text-sm font-medium uppercase tracking-widest text-[var(--navy-muted)]">
        Reactive Network
      </h2>
      <p className="mt-1 text-xs text-[var(--navy-muted)]">
        HedgeCallbackReceiver events on Unichain Sepolia
      </p>
      <p className="mt-2 font-mono text-[10px] text-[var(--navy-muted)]">
        {short(contracts.callback)}
      </p>

      {events.length === 0 ? (
        <div className="mt-4 border border-dashed border-[var(--cream-dark)] p-4 text-center text-xs text-[var(--navy-muted)]">
          No callback events yet. Trigger high-risk swaps to simulate the Reactive flow,
          or wire <code className="font-mono">useWatchContractEvent</code> per{" "}
          <code className="font-mono">contract/frontend.md</code>.
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {events.map((event) => (
            <li
              key={event.id}
              className="flex items-start gap-3 border border-[var(--cream-dark)] p-3 text-xs"
            >
              <span
                className="mt-0.5 shrink-0 px-1.5 py-0.5 font-mono font-medium text-white"
                style={{ backgroundColor: typeColors[event.type] }}
              >
                {event.type.replace("Reactive", "").replace("Hedge", "")}
              </span>
              <div>
                <p className="text-[var(--navy)]">{event.message}</p>
                <p className="mt-1 font-mono text-[10px] text-[var(--navy-muted)]">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 border border-[var(--cream-dark)] bg-[var(--cream)] p-3 text-xs text-[var(--navy-muted)]">
        Cross-chain flow: SochalantHook emits ReactiveRiskUpdate → ReactiveOracleSync
        (Lasna) → HedgeCallbackReceiver.triggerHedge() / unwindHedge()
      </div>
    </div>
  );
}
