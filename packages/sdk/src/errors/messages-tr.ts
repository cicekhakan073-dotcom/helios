/**
 * Helios — TR mesaj sözlüğü.
 *
 * i18n-ready: yeni dil eklenirse aynı yapıyı kopya edip katman yapılır
 * (i18n provider PROMPT 33 cila adımında).
 *
 * Disiplin (CLAUDE.md):
 *   - Risk uyarıları (UnsafeHealthFactor / LeverageTooHigh) "testnet + unaudited
 *     + not financial advice" çerçevesinde
 *   - "kullanıcı suçu" tonu yok; aksiyon önerisi açık ve nazik
 */

import type { HeliosErrorName } from "./codes";

export interface UserMessage {
  /** Kısa başlık (toast / banner). */
  title: string;
  /** Açıklama paragraf (TR). */
  description: string;
  /** Aksiyon önerisi (örn. "Daha düşük leverage dene"). */
  action?: string;
  /** UI severity ipucu. */
  severity: "danger" | "warn" | "info";
}

export const HELIOS_MESSAGES_TR: Record<HeliosErrorName, UserMessage> = {
  // ---------- 1-9 generic ----------
  Unauthorized: {
    title: "Yetkisiz",
    description: "Bu işlem için yetkiniz yok. Lütfen önce oturum açın.",
    action: "Sign in",
    severity: "warn",
  },
  Paused: {
    title: "Kontrat durduruldu",
    description: "Helios kontratları geçici olarak durdurulmuş. Lütfen sonra tekrar dene.",
    severity: "warn",
  },
  InvalidParams: {
    title: "Geçersiz parametre",
    description: "İşlem parametrelerinden biri kontrat tarafından reddedildi.",
    action: "Form değerlerini kontrol et",
    severity: "warn",
  },
  NotInitialized: {
    title: "Kontrat hazır değil",
    description: "Helios kontratı henüz başlatılmamış görünüyor. Deploy script'i çalıştırıldı mı?",
    severity: "danger",
  },
  AlreadyInitialized: {
    title: "Zaten başlatıldı",
    description: "Bu kontrat zaten init edilmiş. Yeniden init etmen gerekmiyor.",
    severity: "info",
  },

  // ---------- 10-19 position lifecycle ----------
  PositionNotFound: {
    title: "Pozisyon bulunamadı",
    description: "Bu adres için açık bir pozisyon yok.",
    severity: "info",
  },
  PositionAlreadyOpen: {
    title: "Açık pozisyon var",
    description: "Bu adresin zaten açık bir pozisyonu var. Yenisini açmadan önce mevcudu kapat.",
    action: "Mevcut pozisyonu kapat",
    severity: "warn",
  },
  InsufficientCollateral: {
    title: "Yetersiz teminat",
    description: "Pozisyonun teminatı bu işlem için yeterli değil.",
    action: "Daha fazla teminat ekle veya leverage'ı düşür",
    severity: "warn",
  },
  InsufficientLiquidity: {
    title: "Havuzda likidite yetersiz",
    description: "Blend pool'da bu işlem için yeterli likidite yok. Daha küçük miktar dene.",
    severity: "warn",
  },

  // ---------- 20-29 strategy ----------
  LeverageTooHigh: {
    title: "Leverage çok yüksek",
    description:
      "Seçtiğin kaldıraç oranı izin verilen üst sınırı aşıyor. ⚠️ Testnet/unaudited demo — yatırım tavsiyesi değildir.",
    action: "Daha düşük leverage dene",
    severity: "warn",
  },
  UnsafeHealthFactor: {
    title: "Health Factor güvensiz",
    description:
      "Bu pozisyon açılış sonrası likidasyon yakınında olur. ⚠️ Risk yüksek — testnet/unaudited demo. Yatırım tavsiyesi değildir.",
    action: "Leverage'ı düşür ya da principal'ı artır",
    severity: "danger",
  },
  RouterStepFailed: {
    title: "Tx adımı başarısız",
    description: "Atomik kaldıraç akışının ara adımlarından biri başarısız oldu; tüm tx geri alındı.",
    action: "Tekrar dene",
    severity: "danger",
  },
  SlippageExceeded: {
    title: "Slippage aşıldı",
    description: "Fiyat oynaması, kabul ettiğin slippage eşiğini aştı.",
    action: "Slippage toleransını artır veya tekrar dene",
    severity: "warn",
  },
  FlashRepayFailed: {
    title: "Flash loan geri ödemesi başarısız",
    description: "Blend flash loan tx içinde geri ödenemediği için tüm akış geri alındı.",
    action: "Tekrar dene veya leverage'ı düşür",
    severity: "danger",
  },

  // ---------- 30-39 oracle (AUDIT §1.6) ----------
  OracleStale: {
    title: "Oracle bayatı",
    description:
      "Reflector fiyat güncellemesi 10 dakikadan eski. ⚠️ Güvenli işlem için fiyatın tazelenmesini bekle.",
    action: "Birkaç dakika sonra tekrar dene",
    severity: "warn",
  },
  PriceUnavailable: {
    title: "Fiyat alınamadı",
    description: "Reflector feed'inden bu varlık için fiyat verisi gelmedi.",
    severity: "warn",
  },
  PriceSanityBoundExceeded: {
    title: "Oracle fiyat sapması yüksek",
    description:
      "Son fiyat TWAP'tan %30'dan fazla saptı; manipülasyon koruması devreye girdi (AUDIT §1.6 — Blend 2025 oracle exploit yansıması).",
    action: "Birkaç dakika sonra tekrar dene",
    severity: "danger",
  },
  OracleNotConfigured: {
    title: "Oracle yapılandırılmadı",
    description: "Bu asset için Reflector feed adresi henüz bağlı değil.",
    severity: "danger",
  },

  // ---------- 40-49 blend ----------
  BlendCallFailed: {
    title: "Blend pool çağrısı başarısız",
    description: "Lending pool'a yapılan cross-contract çağrı reddedildi.",
    action: "Pozisyon parametrelerini kontrol et",
    severity: "danger",
  },
  PoolNotConfigured: {
    title: "Blend pool bağlı değil",
    description: "Helios router/keeper henüz pool adresine bağlanmamış (init eksik).",
    severity: "danger",
  },
  BlendPositionRead: {
    title: "Blend pozisyon okuması başarısız",
    description: "Pool tarafından kullanıcı pozisyonu okunamadı.",
    severity: "warn",
  },

  // ---------- 50-59 keeper ----------
  NotOptedIn: {
    title: "Keeper koruması kapalı",
    description: "Bu adres henüz Auto-Rebalancer'a opt-in vermemiş.",
    action: "Dashboard → Auto-Rebalance → Opt-in",
    severity: "info",
  },
  NoActionNeeded: {
    title: "Aksiyon gerekmiyor",
    description: "Şu anki HF, opt-in trigger eşiğinin üstünde — rebalance gerekmiyor.",
    severity: "info",
  },
  DeleverageCapExceeded: {
    title: "Deleverage cap aşıldı",
    description: "İstenen rebalance miktarı, opt-in'inin izin verdiği cap'in üstünde.",
    action: "Cap'i artır veya daha küçük rebalance dene",
    severity: "warn",
  },
  KeeperRoleRequired: {
    title: "Keeper rolü gerekiyor",
    description: "Bu çağrı yalnız atanmış keeper hesabı tarafından yapılabilir.",
    severity: "warn",
  },

  // ---------- 60-69 token ----------
  UnsupportedAsset: {
    title: "Desteklenmeyen asset",
    description: "Helios bu asset'i şu anda desteklemiyor (USDC, XLM, wBTC, wETH).",
    severity: "warn",
  },
  AssetNotInRegistry: {
    title: "Asset tanımlı değil",
    description: "Bu asset için Reflector eşlemesi yapılmamış.",
    severity: "warn",
  },

  // ---------- 70-79 storage ----------
  TtlExtendFailed: {
    title: "Storage TTL uzatılamadı",
    description: "Pozisyon kaydının ömrü uzatılırken hata oluştu.",
    severity: "warn",
  },

  // ---------- 80-89 HF ----------
  ZeroDebt: {
    title: "Borç yok",
    description: "HF hesabı için borç sıfır — risk göstergesi anlamsız.",
    severity: "info",
  },
  HfOverflow: {
    title: "HF hesabı taşması",
    description: "Sayısal hesap i128 sınırını aştı; girdileri kontrol et.",
    severity: "danger",
  },
};

// ---------- Kontrat dışı kategori mesajları ----------

export const NON_CONTRACT_MESSAGES_TR = {
  walletUserRejected: {
    title: "İmza reddedildi",
    description: "Cüzdandaki imza isteği reddedildi. Devam etmek için imzalaman gerek.",
    severity: "info" as const,
  },
  walletNotInstalled: {
    title: "Cüzdan kurulu değil",
    description:
      "Seçtiğin cüzdan tarayıcında kurulu değil. Freighter (Chrome/Brave) en hızlı seçenek.",
    action: "Freighter kur",
    severity: "warn" as const,
  },
  walletWrongNetwork: {
    title: "Cüzdan yanlış ağda",
    description: "Cüzdan Stellar Testnet'e bağlı olmalı. Mainnet veya başka ağ aktif görünüyor.",
    action: "Cüzdan ağını Testnet yap",
    severity: "warn" as const,
  },
  walletConnectionFailed: {
    title: "Cüzdan bağlantısı başarısız",
    description: "Cüzdana bağlanamadık. Cüzdanın açık ve erişilebilir olduğundan emin ol.",
    action: "Tekrar dene",
    severity: "danger" as const,
  },
  authUnauthenticated: {
    title: "Oturum yok",
    description: "Bu sayfa SEP-10 oturum gerektiriyor.",
    action: "Sign in",
    severity: "warn" as const,
  },
  authChallengeFailed: {
    title: "Auth challenge başarısız",
    description: "SEP-10 challenge üretilirken hata oluştu. Tekrar dene.",
    severity: "warn" as const,
  },
  authVerifyFailed: {
    title: "Auth doğrulama başarısız",
    description:
      "İmzalı challenge sunucu tarafından reddedildi (replay/expired/imza). Tekrar imzala.",
    severity: "danger" as const,
  },
  rpcUnreachable: {
    title: "RPC erişilemedi",
    description: "Soroban RPC sunucusuna ulaşılamadı. İnternet veya endpoint'i kontrol et.",
    action: "Tekrar dene",
    severity: "warn" as const,
  },
  rpcHostError: {
    title: "RPC host hatası",
    description: "Çağrı sırasında Soroban host beklenmedik bir hata döndürdü.",
    severity: "danger" as const,
  },
  networkOffline: {
    title: "Ağ bağlantısı yok",
    description: "Tarayıcı offline görünüyor. Bağlantını kontrol et.",
    action: "Tekrar dene",
    severity: "warn" as const,
  },
  unknown: {
    title: "Bilinmeyen hata",
    description: "Beklenmedik bir hata oluştu. Tekrar denersen sorun düzelebilir.",
    action: "Tekrar dene",
    severity: "danger" as const,
  },
} satisfies Record<string, { title: string; description: string; action?: string; severity: "danger" | "warn" | "info" }>;

export type NonContractMessageKey = keyof typeof NON_CONTRACT_MESSAGES_TR;
