/**
 * HF TS aynası — Rust `shared::hf` testleriyle birebir parity testi.
 *
 * Bu testler Rust testleri ile **aynı sabit girdileri** kullanır; sayılar
 * uyumsuz olursa drift var demektir.
 *   - Rust: `packages/contracts/crates/shared/src/hf.rs` `mod tests`
 *   - TS: bu dosya
 */

import { describe, expect, it } from "vitest";

import {
  BPS_DENOM,
  effectiveCollateral,
  effectiveLiability,
  HF_CAUTION_MIN_BPS,
  HF_HEALTHY_MIN_BPS,
  HF_LIQUIDATION_BPS,
  HF_SCALE,
  HfError,
  healthFactorBps,
  hfBpsToFloat,
  liquidationPrice,
  projectHfBps,
  riskBand,
} from "./index";

describe("HF sabitleri Rust ile birebir", () => {
  it("HF_HEALTHY_MIN_BPS=150, CAUTION=120, LIQ=100", () => {
    expect(HF_HEALTHY_MIN_BPS).toBe(150n);
    expect(HF_CAUTION_MIN_BPS).toBe(120n);
    expect(HF_LIQUIDATION_BPS).toBe(100n);
  });
  it("BPS_DENOM=10000, HF_SCALE=100", () => {
    expect(BPS_DENOM).toBe(10_000n);
    expect(HF_SCALE).toBe(100n);
  });
});

describe("riskBand — Rust band_sinirlari_dogru ile aynı sınırlar", () => {
  it("eşiklerin sağ/sol komşusu", () => {
    expect(riskBand(150n)).toBe("healthy");
    expect(riskBand(149n)).toBe("caution");
    expect(riskBand(120n)).toBe("caution");
    expect(riskBand(119n)).toBe("danger");
    expect(riskBand(100n)).toBe("danger");
    expect(riskBand(99n)).toBe("liquidatable");
    expect(riskBand(0n)).toBe("liquidatable");
  });
});

describe("effectiveCollateral / effectiveLiability — Rust testleriyle aynı", () => {
  it("c_factor 0.85 uygulanır (raw=10000 → 8500)", () => {
    expect(effectiveCollateral(10_000n, 8500)).toBe(8500n);
  });
  it("l_factor 0.80 büyütür (raw=8000 → 10000)", () => {
    expect(effectiveLiability(8_000n, 8000)).toBe(10_000n);
  });
  it("c_factor > 1.0 InvalidParams", () => {
    expect(() => effectiveCollateral(1000n, 11_000)).toThrow(HfError);
  });
  it("l_factor sıfır InvalidParams", () => {
    expect(() => effectiveLiability(1000n, 0)).toThrow(HfError);
  });
});

describe("healthFactorBps — Rust testleriyle aynı", () => {
  it("coll=20K, liab=10K → HF=200 (2.00)", () => {
    expect(healthFactorBps(20_000n, 10_000n)).toBe(200n);
  });
  it("coll=10K, liab=10K → HF=100 (sınır)", () => {
    expect(healthFactorBps(10_000n, 10_000n)).toBe(100n);
  });
  it("liability=0 → ZeroDebt", () => {
    expect(() => healthFactorBps(10_000n, 0n)).toThrow(HfError);
  });
  it("negatif input → InvalidParams", () => {
    expect(() => healthFactorBps(-1n, 100n)).toThrow(HfError);
    expect(() => healthFactorBps(100n, -1n)).toThrow(HfError);
  });
});

describe("projectHfBps — Rust testleriyle birebir şok değerleri", () => {
  it("-20% şokta HF 1.50 → 1.20", () => {
    // coll=15000, liab=10000 → başlangıç HF=150
    expect(healthFactorBps(15_000n, 10_000n)).toBe(150n);
    // -20% → coll=12000 → HF=120
    expect(projectHfBps(15_000n, 10_000n, -2000)).toBe(120n);
  });
  it("-40% şokta HF 0.90 (Liquidatable)", () => {
    expect(projectHfBps(15_000n, 10_000n, -4000)).toBe(90n);
    expect(riskBand(projectHfBps(15_000n, 10_000n, -4000))).toBe("liquidatable");
  });
  it("+20% şokta HF 1.80", () => {
    expect(projectHfBps(15_000n, 10_000n, 2000)).toBe(180n);
  });
  it("-100% şok → multiplier=0 → HF=0", () => {
    expect(projectHfBps(15_000n, 10_000n, -10_000)).toBe(0n);
  });
  it("liability=0 → ZeroDebt", () => {
    expect(() => projectHfBps(15_000n, 0n, -2000)).toThrow(HfError);
  });
});

describe("liquidationPrice — Rust elle hesap testiyle aynı", () => {
  it("current=2000, coll=15000, liab=10000 → 1333", () => {
    expect(liquidationPrice(2000n, 15_000n, 10_000n)).toBe(1333n);
  });
  it("liability=0 → 0", () => {
    expect(liquidationPrice(2000n, 15_000n, 0n)).toBe(0n);
  });
  it("collateral=0 → InvalidParams", () => {
    expect(() => liquidationPrice(2000n, 0n, 100n)).toThrow(HfError);
  });
});

describe("compose — Rust compose_effective_ve_hf_blend_paramlariyla_uyumlu ile aynı", () => {
  it("raw_coll=10K c=0.85, raw_liab=5K l=0.80 → HF=136 (Caution)", () => {
    const ec = effectiveCollateral(10_000n, 8500);
    const el = effectiveLiability(5_000n, 8000);
    expect(ec).toBe(8500n);
    expect(el).toBe(6250n);
    const hf = healthFactorBps(ec, el);
    expect(hf).toBe(136n);
    expect(riskBand(hf)).toBe("caution");
  });
});

describe("hfBpsToFloat — UI yardımcısı", () => {
  it("150 → 1.5, 136 → 1.36", () => {
    expect(hfBpsToFloat(150n)).toBe(1.5);
    expect(hfBpsToFloat(136n)).toBe(1.36);
  });
});
