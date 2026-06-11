"use client";

import { useCallback, useMemo, useState } from "react";
import {
  useAccount,
  useChainId,
  useReadContract,
  useWaitForTransactionReceipt,
  useWatchContractEvent,
  useWriteContract,
} from "wagmi";
import { maxUint256, parseUnits, type Address } from "viem";
import { waitForTransactionReceipt } from "wagmi/actions";
import { unichainSepolia } from "viem/chains";
import type { ReactiveEvent } from "@/components/ReactiveEventsPanel";
import {
  hedgeCallbackReceiverAbi,
  mockErc20Abi,
  sochalantHookAbi,
} from "@/lib/abis";
import { contracts, poolKey, TOKENS } from "@/lib/contracts";
import { wagmiConfig } from "@/lib/wagmi";
import { combineVaults, emptyVault, mapVault } from "@/lib/format";
import { riskLevelFromIndex } from "@/lib/hedge-status";
import {
  calculateRiskScore,
  createInitialPoolState,
  generateSimulationData,
} from "@/lib/risk-engine";
import type { PoolState, RiskBreakdown } from "@/lib/types";

export type TokenKey = "A" | "B";

const SWAP_PRESETS = [
  { label: "Calm Buy", priceChange: 2e16, volume: 5e17, isBuy: true },
  { label: "Heavy Sell", priceChange: 1e17, volume: 1e18, isBuy: false },
  { label: "Volatility Spike", priceChange: 8e17, volume: 2e18, isBuy: true },
] as const;

function mapPoolState(data: {
  lastPrice: bigint;
  volatility: bigint;
  buyVolume: bigint;
  sellVolume: bigint;
  riskScore: bigint;
  riskLevel: number;
  hedgeActive: boolean;
  hedgeIntensity: bigint;
}): PoolState {
  return {
    lastPrice: Number(data.lastPrice),
    volatility: Number(data.volatility),
    buyVolume: Number(data.buyVolume),
    sellVolume: Number(data.sellVolume),
    riskScore: Number(data.riskScore),
    riskLevel: riskLevelFromIndex(data.riskLevel),
    hedgeActive: data.hedgeActive,
    hedgeIntensity: Number(data.hedgeIntensity),
  };
}

export function useSochalant() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const isWrongChain = isConnected && chainId !== unichainSepolia.id;

  const [tokenKey, setTokenKey] = useState<TokenKey>("A");
  const [swapLog, setSwapLog] = useState<string[]>([]);
  const [reactiveEvents, setReactiveEvents] = useState<ReactiveEvent[]>([]);
  const [lastSwapParams, setLastSwapParams] = useState<{
    priceChange: number;
    volume: number;
  } | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  const selectedToken = TOKENS[tokenKey].address;

  const pushLog = useCallback((entry: string) => {
    setSwapLog((prev) => [entry, ...prev.slice(0, 4)]);
  }, []);

  const pushReactiveEvent = useCallback(
    (event: Omit<ReactiveEvent, "id" | "timestamp">) => {
      setReactiveEvents((prev) => [
        { ...event, id: crypto.randomUUID(), timestamp: Date.now() },
        ...prev.slice(0, 9),
      ]);
    },
    [],
  );

  const { data: poolStateRaw, refetch: refetchPoolState } = useReadContract({
    address: contracts.hook,
    abi: sochalantHookAbi,
    functionName: "getPoolState",
    args: [poolKey],
    query: { refetchInterval: 8_000 },
  });

  const { data: vaultARaw, refetch: refetchVaultA } = useReadContract({
    address: contracts.hook,
    abi: sochalantHookAbi,
    functionName: "getVault",
    args: address ? [address, contracts.tokenA] : undefined,
    query: { enabled: !!address },
  });

  const { data: vaultBRaw, refetch: refetchVaultB } = useReadContract({
    address: contracts.hook,
    abi: sochalantHookAbi,
    functionName: "getVault",
    args: address ? [address, contracts.tokenB] : undefined,
    query: { enabled: !!address },
  });

  const { data: tokenBalance, refetch: refetchBalance } = useReadContract({
    address: selectedToken,
    abi: mockErc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: selectedToken,
    abi: mockErc20Abi,
    functionName: "allowance",
    args: address ? [address, contracts.hook] : undefined,
    query: { enabled: !!address },
  });

  const poolState = useMemo(() => {
    if (!poolStateRaw) return createInitialPoolState();
    return mapPoolState(poolStateRaw as Parameters<typeof mapPoolState>[0]);
  }, [poolStateRaw]);

  const vaultA = useMemo(
    () =>
      vaultARaw
        ? mapVault(vaultARaw as Parameters<typeof mapVault>[0])
        : emptyVault(),
    [vaultARaw],
  );
  const vaultB = useMemo(
    () =>
      vaultBRaw
        ? mapVault(vaultBRaw as Parameters<typeof mapVault>[0])
        : emptyVault(),
    [vaultBRaw],
  );
  const vault = useMemo(
    () => (tokenKey === "A" ? vaultA : vaultB),
    [tokenKey, vaultA, vaultB],
  );
  const combinedVault = useMemo(
    () => combineVaults(vaultA, vaultB),
    [vaultA, vaultB],
  );

  const breakdown: RiskBreakdown = useMemo(() => {
    const params = lastSwapParams ?? { priceChange: 0, volume: 0 };
    return calculateRiskScore(
      params.priceChange,
      params.volume,
      1e18,
      poolState.volatility,
      poolState.buyVolume,
      poolState.sellVolume,
    ).breakdown;
  }, [lastSwapParams, poolState]);

  const simulationData = useMemo(() => generateSimulationData(30), []);

  const stats = useMemo(() => {
    const lastPoint = simulationData[simulationData.length - 1];
    const ilReduction =
      lastPoint.ilUnprotected > 0
        ? ((lastPoint.ilUnprotected - lastPoint.ilSochalant) /
            lastPoint.ilUnprotected) *
          100
        : 0;
    const yieldImprovement =
      lastPoint.unprotected > 0
        ? ((lastPoint.sochalant - lastPoint.unprotected) /
            lastPoint.unprotected) *
          100
        : 0;

    const totalVolume = poolState.buyVolume + poolState.sellVolume;
    const estFees = (totalVolume * 0.003) / 1e18; // 0.3% fee tier

    return {
      totalValue: combinedVault.seniorValue + combinedVault.juniorValue,
      seniorApy: 8.2 + poolState.volatility / 5e5,
      juniorApy: 14.6 + poolState.volatility / 2e5,
      ilReduction: Math.round(ilReduction),
      yieldImprovement: yieldImprovement.toFixed(1),
      estFees,
    };
  }, [combinedVault, simulationData]);

  const refetchAll = useCallback(async () => {
    await Promise.all([
      refetchPoolState(),
      refetchVaultA(),
      refetchVaultB(),
      refetchBalance(),
      refetchAllowance(),
    ]);
  }, [
    refetchPoolState,
    refetchVaultA,
    refetchVaultB,
    refetchBalance,
    refetchAllowance,
  ]);

  useWatchContractEvent({
    address: contracts.hook,
    abi: sochalantHookAbi,
    eventName: "PoolStateUpdated",
    onLogs(logs) {
      const log = logs[0] as unknown as {
        args: { riskScore?: bigint; riskLevel?: number };
      };
      if (!log?.args?.riskScore) return;
      const level = riskLevelFromIndex(Number(log.args.riskLevel ?? 0));
      pushLog(
        `PoolStateUpdated · score ${log.args.riskScore.toString()} · ${level}`,
      );
      refetchPoolState();
    },
  });

  useWatchContractEvent({
    address: contracts.hook,
    abi: sochalantHookAbi,
    eventName: "HedgeUpdated",
    onLogs(logs) {
      const log = logs[0] as unknown as {
        args: { active?: boolean; intensity?: bigint };
      };
      pushLog(
        `HedgeUpdated · ${log?.args?.active ? "active" : "idle"} · ${log?.args?.intensity?.toString() ?? "0"}%`,
      );
      refetchPoolState();
    },
  });

  useWatchContractEvent({
    address: contracts.hook,
    abi: sochalantHookAbi,
    eventName: "ReactiveRiskUpdate",
    onLogs(logs) {
      const log = logs[0] as unknown as {
        args: { riskScore?: bigint; volatility?: bigint };
      };
      pushReactiveEvent({
        type: "ReactiveRiskUpdate",
        message: `Risk score ${log?.args?.riskScore?.toString() ?? "?"} · vol ${log?.args?.volatility?.toString() ?? "?"}`,
      });
    },
  });

  useWatchContractEvent({
    address: contracts.callback,
    abi: hedgeCallbackReceiverAbi,
    eventName: "HedgeTriggered",
    onLogs(logs) {
      const log = logs[0] as unknown as {
        args: { poolId?: string; riskScore?: bigint };
      };
      pushReactiveEvent({
        type: "HedgeTriggered",
        message: `Hedge triggered · pool ${String(log?.args?.poolId).slice(0, 10)}… · score ${log?.args?.riskScore?.toString() ?? "?"}`,
      });
    },
  });

  useWatchContractEvent({
    address: contracts.callback,
    abi: hedgeCallbackReceiverAbi,
    eventName: "HedgeUnwound",
    onLogs(logs) {
      const log = logs[0] as unknown as { args: { poolId?: string } };
      pushReactiveEvent({
        type: "HedgeUnwound",
        message: `Hedge unwound · pool ${String(log?.args?.poolId).slice(0, 10)}…`,
      });
    },
  });

  useWatchContractEvent({
    address: contracts.callback,
    abi: hedgeCallbackReceiverAbi,
    eventName: "PriceFeedUpdated",
    onLogs(logs) {
      const log = logs[0] as unknown as {
        args: { price?: bigint; volatility?: bigint };
      };
      pushReactiveEvent({
        type: "PriceFeedUpdated",
        message: `Price feed updated · ${log?.args?.price?.toString() ?? "?"} · vol ${log?.args?.volatility?.toString() ?? "?"}`,
      });
    },
  });

  const { writeContractAsync, isPending: isWritePending } = useWriteContract();

  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: txHash,
    query: { enabled: !!txHash },
  });

  const isPending = isWritePending || isConfirming || !!pendingAction;

  const runTx = useCallback(
    async (label: string, fn: () => Promise<`0x${string}`>) => {
      setPendingAction(label);
      try {
        const hash = await fn();
        setTxHash(hash);
        pushLog(`${label} · tx ${hash.slice(0, 10)}…`);
        await waitForTransactionReceipt(wagmiConfig, { hash });
        await refetchAll();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Transaction failed";
        pushLog(`${label} failed · ${message.slice(0, 60)}`);
        throw error;
      } finally {
        setPendingAction(null);
      }
    },
    [pushLog, refetchAll],
  );

  const mint = useCallback(
    async (amount: string, token: Address = selectedToken) => {
      if (!address) return;
      const parsed = parseUnits(amount, 18);
      await runTx("Mint", () =>
        writeContractAsync({
          address: token,
          abi: mockErc20Abi,
          functionName: "mint",
          args: [address, parsed],
        }),
      );
    },
    [address, selectedToken, runTx, writeContractAsync],
  );

  const deposit = useCallback(
    async (amount: string, token: Address = selectedToken) => {
      if (!address) return;
      const parsed = parseUnits(amount, 18);

      const currentAllowance = (allowance as bigint | undefined) ?? BigInt(0);
      if (currentAllowance < parsed) {
        await runTx("Approve", () =>
          writeContractAsync({
            address: token,
            abi: mockErc20Abi,
            functionName: "approve",
            args: [contracts.hook, maxUint256],
          }),
        );
      }

      await runTx("Deposit", () =>
        writeContractAsync({
          address: contracts.hook,
          abi: sochalantHookAbi,
          functionName: "deposit",
          args: [token, parsed],
        }),
      );
    },
    [address, allowance, selectedToken, runTx, writeContractAsync],
  );

  const withdraw = useCallback(
    async (amount: string, token: Address = selectedToken) => {
      if (!address) return;
      const parsed = parseUnits(amount, 18);
      await runTx("Withdraw", () =>
        writeContractAsync({
          address: contracts.hook,
          abi: sochalantHookAbi,
          functionName: "withdraw",
          args: [token, parsed],
        }),
      );
    },
    [address, selectedToken, runTx, writeContractAsync],
  );

  const simulateSwap = useCallback(
    async (params: {
      priceChange: number;
      volume: number;
      isBuy: boolean;
      label?: string;
    }) => {
      setLastSwapParams({
        priceChange: params.priceChange,
        volume: params.volume,
      });
      await runTx(params.label ?? "SimulateSwap", () =>
        writeContractAsync({
          address: contracts.hook,
          abi: sochalantHookAbi,
          functionName: "simulateSwap",
          args: [
            poolKey,
            BigInt(params.priceChange),
            BigInt(params.volume),
            params.isBuy,
          ],
        }),
      );
    },
    [runTx, writeContractAsync],
  );

  const tokenBalanceFormatted = tokenBalance
    ? Number(tokenBalance as bigint) / 1e18
    : 0;

  return {
    poolState,
    vault,
    combinedVault,
    breakdown,
    simulationData,
    swapLog,
    reactiveEvents,
    stats,
    tokenKey,
    setTokenKey,
    tokenBalance: tokenBalanceFormatted,
    isConnected,
    isWrongChain,
    isPending,
    pendingAction,
    mint,
    deposit,
    withdraw,
    simulateSwap,
    swapPresets: SWAP_PRESETS,
    refetchAll,
  };
}
