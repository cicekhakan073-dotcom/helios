import { describe, expect, it } from "vitest";

import { network } from "./index";

describe("@helios/sdk smoke", () => {
  it("network sabiti testnet olarak işaretli", () => {
    expect(network.id).toBe("testnet");
    expect(network.passphrase).toContain("Test SDF Network");
  });

  it("1 + 1 = 2 (Vitest çalışıyor sanity)", () => {
    expect(1 + 1).toBe(2);
  });
});
