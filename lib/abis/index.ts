/**
 * Full ABIs extracted from contract/frontend.md (Forge-generated).
 * Regenerate with: node scripts/extract-abis.mjs
 */
import type { Abi } from "viem";
import hedgeCallbackReceiverAbiJson from "./generated/hedge-callback-receiver.json";
import mockErc20AbiJson from "./generated/mock-erc20.json";
import sochalantHookAbiJson from "./generated/sochalant-hook.json";

export const sochalantHookAbi = sochalantHookAbiJson as Abi;
export const hedgeCallbackReceiverAbi = hedgeCallbackReceiverAbiJson as Abi;
export const mockErc20Abi = mockErc20AbiJson as Abi;

/** @deprecated Use mockErc20Abi — kept for compatibility */
export const erc20Abi = mockErc20Abi;
