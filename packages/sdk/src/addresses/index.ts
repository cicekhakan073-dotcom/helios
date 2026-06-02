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
    /** Pool'un kendi oracle adresi (AUDIT 2026-06-02 §6.1).
     *  HF tutarlılığı için Helios fiyat okumaları buraya gider — Blend'in iç
     *  HF kaynağıyla aynı oracle. Reflector instance'ları referans olarak kalır. */
    poolOracle: string;
    backstop: string;
    poolFactory: string;
    emitter: string;
  };
  reflector: {
    stellarDex: string;
    externalCexDex: string;
  };
  /** Helios MVP'de aktif desteklenen pool reserve SAC adresleri (Path B).
   *  Helios destekli her asset için pool'da zaten reserve var. */
  tokens: {
    xlmSac: string;
    usdcSac: string;
    wbtcSac: string;
    wethSac: string;
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
    strategyRouter: "CBOQUIOAXTKAG7WFEPJRZMRKPOBJRNQCAKBXMK5PRIMMPB5QT3TMGDUR",
    keeper: "CDWMZI7CCSUZ6SNTACYGUHDVDGY4J4BZDKVZ4HTRRSGKBBIMXBE4DUMU",
  },
  blend: {
    pool: "CCEBVDYM32YNYCVNRXQKDFFPISJJCV557CDZEIRBEE4NCV4KHPQ44HGF",
    poolOracle: "CAZOKR2Y5E2OSWSIBRVZMJ47RUTQPIGVWSAQ2UISGAVC46XKPGDG5PKI",
    backstop: "CBDVWXT433PRVTUNM56C3JREF3HIZHRBA64NB2C3B2UNCKIS65ZYCLZA",
    poolFactory: "CDV6RX4CGPCOKGTBFS52V3LMWQGZN3LCQTXF5RVPOOCG4XVMHXQ4NTF6",
    emitter: "CC3WJVJINN4E3LPMNTWKK7LQZLYDQMZHZA7EZGXATPHHBPKNZRIO3KZ6",
  },
  reflector: {
    stellarDex: "CAVLP5DH2GJPZMVO7IJY4CVOD5MWEFTJFVPD2YY2FQXOQHRGHK4D6HLP",
    externalCexDex: "CCYOZJCOPG34LLQQ7N24YXBM7LL62R7ONMZ3G6WZAAYPB5OYKOMJRN63",
  },
  tokens: {
    xlmSac:  "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
    usdcSac: "CAQCFVLOBK5GIULPNZRGATJJMIZL5BSP7X5YJVMGCPTUEPFM4AVSRCJU",
    wbtcSac: "CAP5AMC2OHNVREO66DFIN6DHJMPOBAJ2KCDDIMFBR7WWJH5RZBFM3UEI",
    wethSac: "CAZAQB3D7KSLSNOSQKYD2V4JP5V2Y3B4RDJZRLBFCCIXDCTE3WHSY3UE",
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
      poolOracle: fromEnv("NEXT_PUBLIC_BLEND_POOL_ORACLE", FALLBACK.blend.poolOracle),
      backstop: fromEnv("NEXT_PUBLIC_BLEND_BACKSTOP", FALLBACK.blend.backstop),
      poolFactory: fromEnv("NEXT_PUBLIC_BLEND_POOL_FACTORY", FALLBACK.blend.poolFactory),
      emitter: fromEnv("NEXT_PUBLIC_BLEND_EMITTER", FALLBACK.blend.emitter),
    },
    reflector: {
      stellarDex: fromEnv("NEXT_PUBLIC_REFLECTOR_STELLAR_DEX", FALLBACK.reflector.stellarDex),
      externalCexDex: fromEnv("NEXT_PUBLIC_REFLECTOR_EXT_CEX_DEX", FALLBACK.reflector.externalCexDex),
    },
    tokens: {
      xlmSac:  fromEnv("NEXT_PUBLIC_XLM_SAC",        FALLBACK.tokens.xlmSac),
      usdcSac: fromEnv("NEXT_PUBLIC_MOCK_USDC_SAC",  FALLBACK.tokens.usdcSac),
      wbtcSac: fromEnv("NEXT_PUBLIC_MOCK_WBTC_SAC",  FALLBACK.tokens.wbtcSac),
      wethSac: fromEnv("NEXT_PUBLIC_MOCK_WETH_SAC",  FALLBACK.tokens.wethSac),
    },
    rpcUrl: fromEnv("NEXT_PUBLIC_SOROBAN_RPC_URL", FALLBACK.rpcUrl),
  };
}

/** Helios asset id → resmî Blend reserve SAC adresi (Path B). */
export function sacAddressFor(assetId: AssetId): string {
  const a = getAddresses().tokens;
  switch (assetId) {
    case "USDC": return a.usdcSac;
    case "XLM":  return a.xlmSac;
    case "wBTC": return a.wbtcSac;
    case "wETH": return a.wethSac;
  }
}

/** Helios asset id ↔ Reflector feed + asset variant eşleşmesi (AUDIT §2.2). */
export type AssetId = "USDC" | "XLM" | "wBTC" | "wETH";

export const ASSETS: readonly AssetId[] = ["USDC", "XLM", "wBTC", "wETH"];

export interface AssetMeta {
  id: AssetId;
  label: string;
  decimals: number;
  /** SAC adresinin okunduğu env key (NEXT_PUBLIC_*).
   *  Path B sonrası tüm 4 asset'in resmî reserve SAC'ı var. */
  sacAddressEnvKey: string;
  /** Reflector lastprice() çağrısında verilecek asset şekli (referans).
   *  HF için bu DEĞİL — getAddresses().blend.poolOracle kullanılır. */
  reflector:
    | { kind: "Stellar"; sacAddressEnvKey: string }
    | { kind: "Other"; symbol: string };
  /** Hangi Reflector feed'i referans olarak kullanır. */
  feed: "stellarDex" | "externalCexDex";
}

export const ASSET_META: Record<AssetId, AssetMeta> = {
  USDC: {
    id: "USDC",
    label: "USDC",
    decimals: 7,
    sacAddressEnvKey: "NEXT_PUBLIC_MOCK_USDC_SAC",
    reflector: { kind: "Stellar", sacAddressEnvKey: "NEXT_PUBLIC_MOCK_USDC_SAC" },
    feed: "stellarDex",
  },
  XLM: {
    id: "XLM",
    label: "XLM",
    decimals: 7,
    sacAddressEnvKey: "NEXT_PUBLIC_XLM_SAC",
    reflector: { kind: "Stellar", sacAddressEnvKey: "NEXT_PUBLIC_XLM_SAC" },
    feed: "stellarDex",
  },
  wBTC: {
    id: "wBTC",
    label: "wBTC",
    decimals: 8,
    sacAddressEnvKey: "NEXT_PUBLIC_MOCK_WBTC_SAC",
    reflector: { kind: "Other", symbol: "BTC" },
    feed: "externalCexDex",
  },
  wETH: {
    id: "wETH",
    label: "wETH",
    decimals: 18,
    sacAddressEnvKey: "NEXT_PUBLIC_MOCK_WETH_SAC",
    reflector: { kind: "Other", symbol: "ETH" },
    feed: "externalCexDex",
  },
};
