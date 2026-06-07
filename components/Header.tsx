"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { COLORS } from "@/lib/constants";

export function Header() {
  return (
    <header
      className="border-b border-[var(--cream-dark)]"
      style={{ backgroundColor: COLORS.navy }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center border border-white/20 text-sm font-bold text-white"
            style={{ backgroundColor: COLORS.red }}
          >
            S
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-white">Sochalant</h1>
            <p className="text-xs text-white/60">Uniswap v4 LP Protection</p>
          </div>
        </div>

        <nav className="hidden items-center gap-8 text-sm text-white/70 md:flex">
          <a href="#dashboard" className="hover:text-white">
            Dashboard
          </a>
          <a href="#vault" className="hover:text-white">
            Vault
          </a>
          <a href="#simulation" className="hover:text-white">
            Simulation
          </a>
        </nav>

        <ConnectButton
          chainStatus="icon"
          accountStatus="address"
          showBalance={false}
        />
      </div>
    </header>
  );
}
