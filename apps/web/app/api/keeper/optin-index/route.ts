/**
 * POST /api/keeper/optin-index — Dashboard'dan opt-in indeksi güncelleme.
 *
 * SEP-10 oturumu gerekli; sadece kendi adresini ekleyebilir/çıkarabilir
 * (model rastgele bir adresi indekse atamasın). Kontrat authoritative;
 * indeks yalnız cron'un kimi tarayacağına ipucu.
 */

import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";

import { addOptInCandidate, removeOptInCandidate } from "../../../../lib/keeper/optin-index";

interface Body {
  action?: "add" | "remove";
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.sub) {
    return NextResponse.json({ ok: false, code: "UNAUTHORIZED" }, { status: 401 });
  }
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, code: "INVALID_BODY" }, { status: 400 });
  }
  const action = body.action === "remove" ? "remove" : "add";
  const res =
    action === "add"
      ? await addOptInCandidate(session.sub)
      : await removeOptInCandidate(session.sub);
  return NextResponse.json({
    ok: res.ok,
    action,
    user: session.sub,
    backend: "backend" in res ? res.backend : undefined,
  });
}
