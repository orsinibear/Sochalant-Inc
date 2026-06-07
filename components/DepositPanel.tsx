"use client";

import { useState } from "react";
import { formatTokenAmount } from "@/lib/format";
import { COLORS } from "@/lib/constants";
import { TOKENS } from "@/lib/contracts";
import type { TokenKey } from "@/hooks/useSochalant";

interface DepositPanelProps {
  tokenKey: TokenKey;
  onTokenChange: (key: TokenKey) => void;
  tokenBalance: number;
  isConnected: boolean;
  isWrongChain: boolean;
  isPending: boolean;
  pendingAction: string | null;
  onMint: (amount: string) => Promise<void>;
  onDeposit: (amount: string) => Promise<void>;
  onWithdraw: (amount: string) => Promise<void>;
}

export function DepositPanel({
  tokenKey,
  onTokenChange,
  tokenBalance,
  isConnected,
  isWrongChain,
  isPending,
  pendingAction,
  onMint,
  onDeposit,
  onWithdraw,
}: DepositPanelProps) {
  const [amount, setAmount] = useState("1000");
  const token = TOKENS[tokenKey];
  const disabled = !isConnected || isWrongChain || isPending;

  const handleMint = () => onMint(amount);
  const handleDeposit = () => onDeposit(amount);
  const handleWithdraw = () => onWithdraw(amount);

  return (
    <div id="vault" className="border border-[var(--cream-dark)] bg-white p-6">
      <h2 className="text-sm font-medium uppercase tracking-widest text-[var(--navy-muted)]">
        LP Vault
      </h2>
      <p className="mt-1 text-xs text-[var(--navy-muted)]">
        On-chain deposit via SochalantHook ({TOKENS.A.symbol}/{TOKENS.B.symbol})
      </p>

      {isWrongChain && (
        <p className="mt-3 border border-[var(--red)] bg-[#FDF0EE] p-2 text-xs text-[var(--red)]">
          Switch to Unichain Sepolia (chain 1301) to transact.
        </p>
      )}

      <div className="mt-6 space-y-4">
        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-[var(--navy-muted)]">
            Token
          </label>
          <div className="mt-2 flex gap-2">
            {(["A", "B"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => onTokenChange(key)}
                className="flex-1 border px-4 py-2 text-sm font-medium transition-colors"
                style={{
                  borderColor: tokenKey === key ? COLORS.navy : "var(--cream-dark)",
                  backgroundColor: tokenKey === key ? COLORS.navy : "white",
                  color: tokenKey === key ? "white" : COLORS.navy,
                }}
              >
                {TOKENS[key].symbol}
              </button>
            ))}
          </div>
          {isConnected && (
            <p className="mt-2 text-xs text-[var(--navy-muted)]">
              Wallet balance:{" "}
              <span className="font-mono font-medium text-[var(--navy)]">
                {formatTokenAmount(tokenBalance)} {token.symbol}
              </span>
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="deposit-amount"
            className="text-xs font-medium uppercase tracking-wide text-[var(--navy-muted)]"
          >
            Amount ({token.symbol})
          </label>
          <input
            id="deposit-amount"
            type="number"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-2 w-full border border-[var(--cream-dark)] bg-[var(--cream)] px-4 py-3 font-mono text-[var(--navy)] outline-none focus:border-[var(--navy)]"
            placeholder="0.00"
          />
        </div>

        <div className="grid gap-2">
          <button
            type="button"
            onClick={handleMint}
            disabled={disabled}
            className="w-full border border-[var(--navy)] py-2.5 text-sm font-semibold text-[var(--navy)] transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pendingAction === "Mint" ? "Minting…" : `Mint ${token.symbol}`}
          </button>
          <button
            type="button"
            onClick={handleDeposit}
            disabled={disabled}
            className="w-full py-2.5 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            style={{ backgroundColor: COLORS.red }}
          >
            {pendingAction === "Deposit" || pendingAction === "Approve"
              ? `${pendingAction}…`
              : "Deposit"}
          </button>
          <button
            type="button"
            onClick={handleWithdraw}
            disabled={disabled}
            className="w-full border py-2.5 text-sm font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            style={{ borderColor: COLORS.peach, color: COLORS.peach }}
          >
            {pendingAction === "Withdraw" ? "Withdrawing…" : "Withdraw"}
          </button>
        </div>

        {!isConnected && (
          <p className="text-center text-xs text-[var(--navy-muted)]">
            Connect wallet on Unichain Sepolia to mint, deposit, or withdraw.
          </p>
        )}

        <div className="border border-[var(--cream-dark)] bg-[var(--cream)] p-3 text-xs text-[var(--navy-muted)]">
          Mint is free on MockERC20. Deposit auto-splits 70/30 into senior/junior tranches.
        </div>
      </div>
    </div>
  );
}
