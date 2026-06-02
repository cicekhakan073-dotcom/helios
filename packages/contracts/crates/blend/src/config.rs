//! Blend pool config — runtime'da geçirilen adresler.
//!
//! AUDIT §1 / STELLAR_STACK.md §5 — testnet adresleri (yorum):
//!
//!   backstop (V2):    `CBDVWXT433PRVTUNM56C3JREF3HIZHRBA64NB2C3B2UNCKIS65ZYCLZA`
//!   poolFactory (V2): `CDV6RX4CGPCOKGTBFS52V3LMWQGZN3LCQTXF5RVPOOCG4XVMHXQ4NTF6`
//!   emitter:          `CC3WJVJINN4E3LPMNTWKK7LQZLYDQMZHZA7EZGXATPHHBPKNZRIO3KZ6`
//!   TestnetV2 pool:   `CCEBVDYM32YNYCVNRXQKDFFPISJJCV557CDZEIRBEE4NCV4KHPQ44HGF`
//!
//! Adresler **PROMPT 15** deploy script'i tarafından `.env`/`addresses.json`'a
//! yazılır. Bu modül yalnızca tip + struct sağlar — adres deposu DEĞİL.

use soroban_sdk::{contracttype, Address};

/// Helios'un kullandığı Blend pool referansları.
///
/// `pool` zorunlu (hangi Blend pool'una bağlandık). `backstop` ve
/// `emitter` ileride (PROMPT 15+) gerekirse eklenir; şimdilik opsiyonel
/// kalsın diye `Option` yerine ayrı struct.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PoolSet {
    /// Hedef Blend v2 pool kontrat adresi.
    /// # DOĞRULA — testnet reset'te değişebilir.
    pub pool: Address,
    /// Backstop kontrat adresi (yedek likidite havuzu).
    /// # DOĞRULA — STELLAR_STACK.md §5'teki örnek adres.
    pub backstop: Address,
    /// Pool factory kontrat adresi (yeni pool oluşturma — Helios kullanmıyor).
    /// # DOĞRULA.
    pub pool_factory: Address,
}
