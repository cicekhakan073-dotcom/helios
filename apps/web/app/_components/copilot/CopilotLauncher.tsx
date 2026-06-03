"use client";

/**
 * CopilotLauncher — sağ alttan açılan FAB; CopilotPanel'i mount eder.
 *
 * Dashboard ve Open'a gömülür; sayfa bağlamı `context` prop'undan iletilir.
 */

import { IsolatedErrorBoundary } from "@helios/ui";
import { useState } from "react";

import { CopilotPanel, type CopilotContextSnapshot } from "./CopilotPanel";

export function CopilotLauncher({ context }: { context: CopilotContextSnapshot }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="AI Strategy Copilot'u aç"
          data-cta="copilot-open"
          className="fixed bottom-6 right-6 z-40 rounded-full bg-aurora-amber text-text-on-aurora shadow-glow-amber h-14 px-5 inline-flex items-center gap-2 font-semibold hover:bg-aurora-amber-glow"
        >
          <span aria-hidden>✦</span>
          Copilot
        </button>
      )}
      {open && (
        <IsolatedErrorBoundary label="Copilot stream hatası">
          <CopilotPanel open onClose={() => setOpen(false)} context={context} />
        </IsolatedErrorBoundary>
      )}
    </>
  );
}
