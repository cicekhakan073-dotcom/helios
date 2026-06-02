/**
 * Helios contract method'ları için ScVal helper'ları.
 *
 * `Address` parametrelerini scval'a çevirir; dönüş tipleri `scValToNative`
 * tarafından native'e çevrilir.
 */

import { Address, type xdr } from "@stellar/stellar-sdk";

export function addressArg(addr: string): xdr.ScVal {
  return Address.fromString(addr).toScVal();
}
