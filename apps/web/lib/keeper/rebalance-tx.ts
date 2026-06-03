/**
 * Keeper rebalance tx — server-side build + simulate + sign (keeper keypair) + send + poll.
 *
 * Güvenlik:
 *  - KEEPER_SECRET yalnız server env'de; bu modül "use server" sınırına çağrılır.
 *  - Imza yapan Keypair'in public key'i `get_keeper()` ile birebir eşleşmeli; ön
 *    doğrulama route'ta yapılır.
 *  - Tek InvokeHostFunctionOp, MEMO_NONE.
 */

import { getAddresses } from "@helios/sdk";
import {
  Account,
  Address,
  BASE_FEE,
  Contract,
  Keypair,
  Memo,
  Networks,
  rpc,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";

function getServer(): rpc.Server {
  const url = getAddresses().rpcUrl;
  return new rpc.Server(url, { allowHttp: false });
}

function scvI128(value: bigint): xdr.ScVal {
  return xdr.ScVal.scvI128(
    new xdr.Int128Parts({
      hi: xdr.Int64.fromString(((value >> 64n) & 0xffffffffffffffffn).toString()),
      lo: xdr.Uint64.fromString((value & 0xffffffffffffffffn).toString()),
    }),
  );
}

function scvVecAddresses(addrs: string[]): xdr.ScVal {
  return xdr.ScVal.scvVec(addrs.map((a) => Address.fromString(a).toScVal()));
}

function scvVecI128(values: bigint[]): xdr.ScVal {
  return xdr.ScVal.scvVec(values.map((v) => scvI128(v)));
}

export interface RebalanceParams {
  /** Keeper public address (G…) — `init` sırasında set edilen rol. */
  caller: string;
  /** Pozisyon sahibi (opt-in vermiş). */
  user: string;
  /** Asset (SAC). */
  assetSac: string;
  /** Kapatılacak borç (underlying, bigint). */
  debtAmount: bigint;
  /** Çekilecek teminat (underlying, bigint). */
  collateralAmount: bigint;
  /** HF okuması için reserve asset listesi. */
  assetsForHf: string[];
  /** HF okuması için fiyat listesi (assetsForHf ile paralel, i128). */
  pricesForHf: bigint[];
}

export interface RebalanceResult {
  ok: boolean;
  hash?: string;
  ledger?: number;
  reason?: string;
}

export async function rebalanceWithKeeper(
  params: RebalanceParams,
  keeperSecret: string,
): Promise<RebalanceResult> {
  const keypair = Keypair.fromSecret(keeperSecret);
  if (keypair.publicKey() !== params.caller) {
    return {
      ok: false,
      reason: "Keeper keypair publicKey ile caller eşleşmiyor (env yanlış olabilir).",
    };
  }

  const server = getServer();
  let source: Account;
  try {
    const acc = await server.getAccount(keypair.publicKey());
    source = new Account(acc.accountId(), acc.sequenceNumber());
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? `getAccount: ${err.message}` : "getAccount başarısız",
    };
  }

  const { helios } = getAddresses();
  const keeper = new Contract(helios.keeper);
  const op = keeper.call(
    "rebalance",
    Address.fromString(params.caller).toScVal(),
    Address.fromString(params.user).toScVal(),
    Address.fromString(params.assetSac).toScVal(),
    scvI128(params.debtAmount),
    scvI128(params.collateralAmount),
    scvVecAddresses(params.assetsForHf),
    scvVecI128(params.pricesForHf),
  );

  const raw = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
    memo: Memo.none(),
  })
    .addOperation(op)
    .setTimeout(60)
    .build();

  // Simulate
  let sim: rpc.Api.SimulateTransactionResponse;
  try {
    sim = await server.simulateTransaction(raw);
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? `simulate: ${err.message}` : "simulate başarısız",
    };
  }
  if ("error" in sim && sim.error) {
    return { ok: false, reason: `host error: ${sim.error}` };
  }

  const prepared = rpc.assembleTransaction(raw, sim).build();
  prepared.sign(keypair);

  let sendResp: rpc.Api.SendTransactionResponse;
  try {
    sendResp = await server.sendTransaction(prepared);
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? `send: ${err.message}` : "send başarısız",
    };
  }
  if (sendResp.status === "ERROR") {
    return {
      ok: false,
      reason: `RPC reddetti: ${sendResp.errorResult?.toXDR("base64") ?? "no detail"}`,
    };
  }

  const hash = sendResp.hash;
  for (let attempt = 0; attempt < 15; attempt++) {
    await new Promise<void>((r) => setTimeout(r, 2000));
    let txResp: rpc.Api.GetTransactionResponse;
    try {
      txResp = await server.getTransaction(hash);
    } catch {
      continue;
    }
    if (txResp.status === rpc.Api.GetTransactionStatus.NOT_FOUND) continue;
    if (txResp.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      return { ok: true, hash, ledger: txResp.ledger };
    }
    if (txResp.status === rpc.Api.GetTransactionStatus.FAILED) {
      return {
        ok: false,
        hash,
        reason: `Tx revert: ${txResp.resultXdr.toXDR("base64").slice(0, 80)}…`,
      };
    }
  }
  return { ok: false, hash, reason: "Tx 30sn içinde sonuçlanmadı." };
}

/** keeper kontratının `get_keeper()` view'inden kayıtlı rol adresini oku.
 *  Cron başlangıcında env keypair public key ile karşılaştırmak için. */
export async function fetchOnchainKeeperRole(): Promise<string | null> {
  const server = getServer();
  const { helios } = getAddresses();
  const source = new Account("GAQUEFDOXDAFEE7R3LKDA3BUGDTNJBFQZP7MPHEGZIJVWBWCABV7APYM", "0");
  const contract = new Contract(helios.keeper);
  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(contract.call("get_keeper"))
    .setTimeout(30)
    .build();
  try {
    const sim = await server.simulateTransaction(tx);
    if ("error" in sim && sim.error) return null;
    if (!("result" in sim) || !sim.result) return null;
    const addr = Address.fromScVal(sim.result.retval).toString();
    return addr;
  } catch {
    return null;
  }
}
