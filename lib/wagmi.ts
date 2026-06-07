"use client";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { unichainSepolia } from "viem/chains";

const rpcUrl =
  process.env.NEXT_PUBLIC_UNICHAIN_SEPOLIA_RPC_URL ?? "https://sepolia.unichain.org";

export const wagmiConfig = getDefaultConfig({
  appName: "Sochalant",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "00000000000000000000000000000000",
  chains: [unichainSepolia],
  transports: {
    [unichainSepolia.id]: http(rpcUrl),
  },
  ssr: true,
});
