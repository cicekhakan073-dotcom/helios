/**
 * Soroban RPC client (`@stellar/stellar-sdk` major 15.x).
 *
 * Read-only `simulateTransaction` ile contract method'larını çağırır;
 * tx yayınlama PROMPT 22'de gelir.
 *
 * STELLAR_STACK §1 pin: `@stellar/stellar-sdk@15.1.0`. Eski 12/13 API'sini
 * varsayma — `rpc.Server` namespace + `simulateTransaction` patterns 15.x.
 */

import { rpc } from "@stellar/stellar-sdk";

import { getAddresses } from "../addresses";

let _server: rpc.Server | null = null;

export function getRpcServer(): rpc.Server {
  if (_server) return _server;
  const { rpcUrl } = getAddresses();
  _server = new rpc.Server(rpcUrl, {
    allowHttp: rpcUrl.startsWith("http://"),
  });
  return _server;
}

export type SimulationResult = rpc.Api.SimulateTransactionResponse;
