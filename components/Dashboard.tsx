"use client";

import { Header } from "@/components/Header";
import { StatCard } from "@/components/StatCard";
import { RiskGauge } from "@/components/RiskGauge";
import { TranchePanel } from "@/components/TranchePanel";
import { HedgeStatus } from "@/components/HedgeStatus";
import { DepositPanel } from "@/components/DepositPanel";
import { RiskBreakdownPanel } from "@/components/RiskBreakdownPanel";
import { SwapSimulator } from "@/components/SwapSimulator";
import { SimulationPanel } from "@/components/SimulationPanel";
import { ReactiveEventsPanel } from "@/components/ReactiveEventsPanel";
import { useSochalant } from "@/hooks/useSochalant";
import { formatTokenAmount } from "@/lib/format";
import { COLORS } from "@/lib/constants";

export function Dashboard() {
  const {
    poolState,
    vault,
    breakdown,
    simulationData,
    swapLog,
    reactiveEvents,
    stats,
    tokenKey,
    setTokenKey,
    tokenBalance,
    isConnected,
    isWrongChain,
    isPending,
    pendingAction,
    mint,
    deposit,
    withdraw,
    simulateSwap,
    swapPresets,
  } = useSochalant();

  return (
    <div className="min-h-screen bg-[var(--cream)]">
      <Header />

      <main id="dashboard" className="mx-auto max-w-7xl px-6 py-8">
        <section className="mb-8 border border-[var(--cream-dark)] bg-white p-6">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-widest text-[var(--navy-muted)]">
              Artium V4 Hook Bootcamp · Unichain Sepolia
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--navy)]">
              Structured LP protection with risk tranching and adaptive hedging
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--navy-muted)]">
              Live on-chain dashboard connected to SochalantHook. Mint test
              tokens, deposit into tranched vaults, and trigger risk evaluation
              via <code className="font-mono text-xs">simulateSwap()</code>.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3 text-xs">
            {["Predict Risk", "Distribute Risk", "Hedge Risk"].map(
              (step, i) => (
                <span
                  key={step}
                  className="flex items-center gap-2 border border-[var(--cream-dark)] px-3 py-1.5 text-[var(--navy)]"
                >
                  <span
                    className="flex h-5 w-5 items-center justify-center text-[10px] font-bold text-white"
                    style={{
                      backgroundColor:
                        i === 0
                          ? COLORS.navy
                          : i === 1
                            ? COLORS.peach
                            : COLORS.red,
                    }}
                  >
                    {i + 1}
                  </span>
                  {step}
                </span>
              ),
            )}
          </div>
        </section>

        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total LP Value"
            value={formatTokenAmount(stats.totalValue)}
            subtext={`Est. Fees: $${stats.estFees.toFixed(2)}`}
          />
          <StatCard
            label="Risk Score"
            value={String(Math.round(poolState.riskScore))}
            subtext={poolState.riskLevel + " exposure"}
            accent={
              poolState.riskLevel === "High"
                ? "red"
                : poolState.riskLevel === "Medium"
                  ? "peach"
                  : "navy"
            }
          />
          <StatCard
            label="Hedge Status"
            value={poolState.hedgeActive ? "Active" : "Idle"}
            subtext={`${poolState.hedgeIntensity}% intensity`}
            accent={poolState.hedgeActive ? "red" : "navy"}
          />
          <StatCard
            label="Senior APY"
            value={`${stats.seniorApy}%`}
            subtext={`Junior: ${stats.juniorApy}%`}
            accent="peach"
          />
        </section>

        <section className="mb-8 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <RiskGauge
              score={poolState.riskScore}
              level={poolState.riskLevel}
            />
            <TranchePanel
              vault={vault}
              seniorApy={stats.seniorApy}
              juniorApy={stats.juniorApy}
            />
            <SimulationPanel
              data={simulationData}
              ilReduction={stats.ilReduction}
              yieldImprovement={stats.yieldImprovement}
            />
          </div>

          <div className="space-y-6">
            <DepositPanel
              tokenKey={tokenKey}
              onTokenChange={setTokenKey}
              tokenBalance={tokenBalance}
              isConnected={isConnected}
              isWrongChain={isWrongChain}
              isPending={isPending}
              pendingAction={pendingAction}
              onMint={mint}
              onDeposit={deposit}
              onWithdraw={withdraw}
            />
            <HedgeStatus poolState={poolState} />
            <RiskBreakdownPanel
              breakdown={breakdown}
              buyVolume={poolState.buyVolume}
              sellVolume={poolState.sellVolume}
              volatility={poolState.volatility}
            />
            <SwapSimulator
              presets={swapPresets}
              onSimulate={simulateSwap}
              swapLog={swapLog}
              isPending={isPending}
              isWrongChain={isWrongChain}
              isConnected={isConnected}
            />
            <ReactiveEventsPanel events={reactiveEvents} />
          </div>
        </section>
      </main>

      <footer
        className="border-t border-[var(--cream-dark)] px-6 py-6 text-center text-xs text-white/60"
        style={{ backgroundColor: COLORS.navy }}
      >
        Sochalant · Uniswap v4 Hook · Built for Artium V4 Hook Bootcamp
      </footer>
    </div>
  );
}
