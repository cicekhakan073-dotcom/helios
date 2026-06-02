import { describe, expect, it } from "vitest";

import { brand } from "./index";

describe("@helios/ui smoke", () => {
  it("brand sabiti dürüstlük disclaimer'ını içeriyor", () => {
    expect(brand.disclaimer).toContain("Unaudited");
    expect(brand.disclaimer).toContain("Testnet");
    expect(brand.disclaimer).toContain("Not financial advice");
  });

  it("jsdom ortamı kurulu (document var)", () => {
    expect(typeof document).toBe("object");
    expect(document.createElement("div").tagName).toBe("DIV");
  });
});
