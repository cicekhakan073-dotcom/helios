/**
 * Helios — testnet adres registry'si.
 *
 * Browser-safe: değerler `NEXT_PUBLIC_*` env değişkenlerinden okunur
 * (PROMPT 15 deploy script'i `.env.local` üretir). Server-side için
 * tüm değerler de mevcut.
 *
 * Public adresler (router/keeper/blend pool/reflector feeds) commit'lenebilir;
 * herhangi bir secret YOK.
 */

export interface HeliosAddresses {
  network: {
    id: "testnet";
    passphrase: string;
  };
  helios: {
    strategyRouter: string;
    keeper: string;
  };
  blend: {
    pool: string;
    backstop: string;
    poolFactory: string;
    emitter: string;
  };
  reflector: {
    stellarDex: string;
    externalCexDex: string;
  };
  /** RPC endpoint (Soroban). */
  rpcUrl: string;
}

const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";

function fromEnv(key: string, fallback: string): string {
  // Next.js: NEXT_PUBLIC_* prefix client'a açık; PROMPT 15 .env.local üretir.
  const v =
    typeof process !== "undefined" && process.env ? process.env[key] : undefined;
  return v ?? fallback;
}

/** Statik adres fallback'i — testnet adresleri (AUDIT §1 + STELLAR_STACK §5). */
const FALLBACK: HeliosAddresses = {
  network: { id: "testnet", passphrase: TESTNET_PASSPHRASE },
  helios: {
    strategyRouter: "CANADBXQEXJRMMRDMKTQ3LY5MNV35FC77HJGNYJWAERVUX7OE4OG32XY",
    keeper: "CDWMZI7CCSUZ6SNTACYGUHDVDGY4J4BZDKVZ4HTRRSGKBBIMXBE4DUMU",
  },
  blend: {
    pool: "CCEBVDYM32YNYCVNRXQKDFFPISJJCV557CDZEIRBEE4NCV4KHPQ44HGF",
    backstop: "CBDVWXT433PRVTUNM56C3JREF3HIZHRBA64NB2C3B2UNCKIS65ZYCLZA",
    poolFactory: "CDV6RX4CGPCOKGTBFS52V3LMWQGZN3LCQTXF5RVPOOCG4XVMHXQ4NTF6",
    emitter: "CC3WJVJINN4E3LPMNTWKK7LQZLYDQMZHZA7EZGXATPHHBPKNZRIO3KZ6",
  },
  reflector: {
    stellarDex: "CAVLP5DH2GJPZMVO7IJY4CVOD5MWEFTJFVPD2YY2FQXOQHRGHK4D6HLP",
    externalCexDex: "CCYOZJCOPG34LLQQ7N24YXBM7LL62R7ONMZ3G6WZAAYPB5OYKOMJRN63",
  },
  rpcUrl: "https://soroban-testnet.stellar.org",
};

export function getAddresses(): HeliosAddresses {
  return {
    network: { id: "testnet", passphrase: TESTNET_PASSPHRASE },
    helios: {
      strategyRouter: fromEnv("NEXT_PUBLIC_HELIOS_STRATEGY_ROUTER", FALLBACK.helios.strategyRouter),
      keeper: fromEnv("NEXT_PUBLIC_HELIOS_KEEPER", FALLBACK.helios.keeper),
    },
    blend: {
      pool: fromEnv("NEXT_PUBLIC_BLEND_POOL", FALLBACK.blend.pool),
      backstop: fromEnv("NEXT_PUBLIC_BLEND_BACKSTOP", FALLBACK.blend.backstop),
      poolFactory: fromEnv("NEXT_PUBLIC_BLEND_POOL_FACTORY", FALLBACK.blend.poolFactory),
      emitter: fromEnv("NEXT_PUBLIC_BLEND_EMITTER", FALLBACK.blend.emitter),
    },
    reflector: {
      stellarDex: fromEnv("NEXT_PUBLIC_REFLECTOR_STELLAR_DEX", FALLBACK.reflector.stellarDex),
      externalCexDex: fromEnv("NEXT_PUBLIC_REFLECTOR_EXT_CEX_DEX", FALLBACK.reflector.externalCexDex),
    },
    rpcUrl: fromEnv("NEXT_PUBLIC_SOROBAN_RPC_URL", FALLBACK.rpcUrl),
  };
}

/** Helios asset id ↔ Reflector feed + asset variant eşleşmesi (AUDIT §2.2). */
export type AssetId = "USDC" | "XLM" | "wBTC" | "wETH";

export const ASSETS: readonly AssetId[] = ["USDC", "XLM", "wBTC", "wETH"];

export interface AssetMeta {
  id: AssetId;
  label: string;
  decimals: number;
  /** Reflector lastprice() çağrısında verilecek asset şekli. */
  reflector:
    | { kind: "Stellar"; sacAddressEnvKey: string }
    | { kind: "Other"; symbol: string };
  /** Hangi Reflector feed'i kullanır. */
  feed: "stellarDex" | "externalCexDex";
}

export const ASSET_META: Record<AssetId, AssetMeta> = {
  USDC: {
    id: "USDC",
    label: "USDC",
    decimals: 7,
    reflector: { kind: "Stellar", sacAddressEnvKey: "NEXT_PUBLIC_MOCK_USDC_SAC" },
    feed: "stellarDex",
  },
  XLM: {
    id: "XLM",
    label: "XLM",
    decimals: 7,
    reflector: { kind: "Stellar", sacAddressEnvKey: "NEXT_PUBLIC_XLM_SAC" },
    feed: "stellarDex",
  },
  wBTC: {
    id: "wBTC",
    label: "wBTC",
    decimals: 8,
    reflector: { kind: "Other", symbol: "BTC" },
    feed: "externalCexDex",
  },
  wETH: {
    id: "wETH",
    label: "wETH",
    decimals: 18,
    reflector: { kind: "Other", symbol: "ETH" },
    feed: "externalCexDex",
  },
};
