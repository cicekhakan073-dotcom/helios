//! Storage TTL sabitleri — AUDIT 2026-05-31 §2.4.
//!
//! Soroban'da `persistent` ve `instance` storage'ın TTL'i vardır; süre dolarsa
//! veri arşivlenir ve okuma başarısız olur. Bu sabitler her yazma fn'inde
//! `env.storage().persistent().extend_ttl(key, LOW, HIGH)` çağrısını besler.
//!
//! Sayılar **ledger** cinsinden. Stellar testnet ortalama ~5 saniye ledger
//! aralığı varsayımıyla:
//!   gün × (86400 / 5) = ledger
//!
//! NOT — Bu modül **sadece sabit** sağlar; gerçek extend mantığı her kontrat
//! içinde Soroban Env üzerinden çağrılır (no_std + soroban-sdk env'sine
//! erişim gerekir, shared'da generic bir helper yazmak no_std'ı patlatır).

// 5 saniye/ledger × 86400 saniye/gün
const LEDGERS_PER_DAY: u32 = 17_280;

// -- Persistent storage (pozisyon defteri, keeper opt-in kayıtları) ----------

pub const PERSISTENT_TTL_BUMP_LOW: u32 = 30 * LEDGERS_PER_DAY; // ≈ 518_400 ledger (30 gün)
pub const PERSISTENT_TTL_BUMP_HIGH: u32 = 60 * LEDGERS_PER_DAY; // ≈ 1_036_800 ledger (60 gün)

// -- Instance storage (kontrat config, admin, fee rate) ----------------------

pub const INSTANCE_TTL_BUMP_LOW: u32 = 7 * LEDGERS_PER_DAY; // ≈ 120_960 ledger (7 gün)
pub const INSTANCE_TTL_BUMP_HIGH: u32 = 30 * LEDGERS_PER_DAY; // ≈ 518_400 ledger (30 gün)

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ttl_low_hep_high_altinda() {
        assert!(PERSISTENT_TTL_BUMP_LOW < PERSISTENT_TTL_BUMP_HIGH);
        assert!(INSTANCE_TTL_BUMP_LOW < INSTANCE_TTL_BUMP_HIGH);
    }

    #[test]
    fn ttl_sayilar_audit_dokumaniyla_eslesir() {
        // AUDIT §2.4: persistent low=30d, high=60d
        assert_eq!(PERSISTENT_TTL_BUMP_LOW, 30 * 17_280);
        assert_eq!(PERSISTENT_TTL_BUMP_HIGH, 60 * 17_280);
        // AUDIT §2.4: instance low=7d, high=30d
        assert_eq!(INSTANCE_TTL_BUMP_LOW, 7 * 17_280);
        assert_eq!(INSTANCE_TTL_BUMP_HIGH, 30 * 17_280);
    }
}
