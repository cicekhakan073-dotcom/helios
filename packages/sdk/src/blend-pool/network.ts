/**
 * `@blend-capital/blend-sdk` Network adapter — Helios addresses.ts'ten doldurur.
 */

import { getAddresses } from "../addresses";

import type { Network as BlendNetwork } from "@blend-capital/blend-sdk";


export function getBlendNetwork(): BlendNetwork {
  const { rpcUrl, network } = getAddresses();
  return {
    rpc: rpcUrl,
    passphrase: network.passphrase,
  };
}
