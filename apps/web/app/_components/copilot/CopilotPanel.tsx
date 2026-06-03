"use client";

/**
 * CopilotPanel — /api/copilot tüketicisi (AI SDK v6 useChat).
 *
 * - Oturumsuz → sign-in yönlendirmesi (route zaten 401; UI bunu zarif karşılar).
 * - Mesaj listesi: `message.parts[]` v6 standardı (text part + tool-* part).
 * - Tool kartları ŞEFFAF: hangi tool + girdi + dönen değer görünür.
 * - HF değeri (sayı) HealthFactorBadge ile görsel destek.
 * - aria-live="polite" streaming bölge; klavye gönderme; status'a göre loading/error.
 */

import { useChat } from "@ai-sdk/react";
import { useSession } from "@helios/sdk";
import { HealthFactorBadge } from "@helios/ui";
import { DefaultChatTransport, type UIMessage } from "ai";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

const QUICK_QUESTIONS = [
  "2x XLM riskim ne?",
  "Bu leverage güvenli mi?",
  "HF'm 1.2'ye düşerse ne olur?",
  "Açık pozisyonumu yorumla.",
];

export interface CopilotContextSnapshot {
  /** Sayfa adı — chat'e bağlam ipucu için. */
  page: "open" | "dashboard";
  /** Open wizard seçimi. */
  wizard?: {
    assetId: string;
    leverageBps: number;
    principalRaw?: string;
  };
  /** Dashboard pozisyon özeti — underlying. */
  position?: {
    assetId: string;
    collateralUnderlying: number;
    debtUnderlying: number;
    hfFloat: number | null;
    leverageX: number | null;
  };
}

interface Props {
  open: boolean;
  onClose: () => void;
  context: CopilotContextSnapshot;
}

export function CopilotPanel({ open, onClose, context }: Props) {
  const sessionQ = useSession({ enabled: open });
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);
  const contextHint = useMemo(() => formatContextHint(context), [context]);

  const { messages, sendMessage, status, stop, regenerate, error } = useChat({
    transport: useMemo(() => new DefaultChatTransport({ api: "/api/copilot" }), []),
  });

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, status]);

  if (!open) return null;

  return (
    <aside
      role="dialog"
      aria-label="Helios AI Copilot"
      className="fixed inset-y-0 right-0 w-full max-w-md bg-space-900 border-l border-border-default shadow-2xl flex flex-col z-50"
    >
      <header className="flex items-center justify-between gap-3 p-4 border-b border-border-subtle">
        <div className="flex flex-col">
          <h2 className="text-h3 text-text-high m-0">AI Strategy Copilot</h2>
          <span className="text-caption text-text-low">Eğitim amaçlı · testnet · unaudited</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Copilot'u kapat"
          className="rounded-md bg-space-700 text-text-high h-9 w-9 hover:bg-space-600"
        >
          ✕
        </button>
      </header>

      {sessionQ.isLoading ? (
        <div className="flex-1 grid place-items-center text-text-low">Oturum kontrol ediliyor…</div>
      ) : !sessionQ.data ? (
        <SignInGate />
      ) : (
        <>
          <div
            ref={listRef}
            aria-live="polite"
            className="flex-1 overflow-y-auto p-4 flex flex-col gap-4"
          >
            {messages.length === 0 && <EmptyState context={context} />}
            {messages.map((m) => (
              <MessageRow key={m.id} message={m} />
            ))}
            {status === "submitted" && <ThinkingDot />}
            {error && (
              <div
                role="alert"
                className="rounded-md border border-danger bg-danger-soft p-3 text-caption text-danger flex flex-col gap-1"
              >
                <strong>Copilot hatası</strong>
                <span className="font-mono text-micro break-all">{error.message}</span>
                <button
                  type="button"
                  onClick={() => void regenerate()}
                  className="self-start mt-1 rounded-md bg-space-700 text-text-high px-3 h-8 hover:bg-space-600"
                >
                  Yeniden dene
                </button>
              </div>
            )}
          </div>

          <QuickChips
            disabled={status === "submitted" || status === "streaming"}
            onPick={(text) => void sendMessage({ text: `${contextHint}\n\n${text}`.trim() })}
          />

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const trimmed = input.trim();
              if (!trimmed || status === "submitted" || status === "streaming") return;
              void sendMessage({ text: `${contextHint}\n\n${trimmed}`.trim() });
              setInput("");
            }}
            className="border-t border-border-subtle p-3 flex flex-col gap-2"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder="Bir soru sor — örn. '2x XLM riskim ne?'"
              rows={2}
              className="w-full resize-none rounded-md bg-space-700 border border-border-default p-3 text-body text-text-high focus-visible:outline-2 focus-visible:outline-aurora-teal"
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-caption text-text-low">Yatırım tavsiyesi değildir.</span>
              {status === "streaming" ? (
                <button
                  type="button"
                  onClick={() => void stop()}
                  className="rounded-md bg-space-700 text-text-high px-3 h-9 hover:bg-space-600"
                >
                  Durdur
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim() || status === "submitted"}
                  className="rounded-md bg-aurora-amber text-text-on-aurora px-4 h-9 font-semibold hover:bg-aurora-amber-glow disabled:opacity-50"
                >
                  Gönder
                </button>
              )}
            </div>
          </form>
        </>
      )}
    </aside>
  );
}

/* ───────────────────────── Message rendering ───────────────────────── */

function MessageRow({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex flex-col gap-2 ${isUser ? "items-end" : "items-start"}`}>
      <div
        className={`max-w-[90%] rounded-lg px-3 py-2 text-body whitespace-pre-wrap ${
          isUser
            ? "bg-aurora-amber/15 text-text-high"
            : "bg-space-700 border border-border-default text-text-high"
        }`}
      >
        {message.parts.map((part, i) => {
          if (part.type === "text") {
            return <span key={i}>{(part as { type: "text"; text: string }).text}</span>;
          }
          if (typeof part.type === "string" && part.type.startsWith("tool-")) {
            return <ToolCallCard key={i} part={part} />;
          }
          return null;
        })}
      </div>
    </div>
  );
}

interface ToolPart {
  type: string;
  state?: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
}

function ToolCallCard({ part }: { part: ToolPart }) {
  const toolName = part.type.replace(/^tool-/, "");
  const state = part.state ?? "input-available";
  const output = part.output as Record<string, unknown> | undefined;

  return (
    <details className="my-2 rounded-md border border-border-subtle bg-space-800 overflow-hidden">
      <summary className="cursor-pointer px-3 py-2 text-caption text-text-low flex items-center gap-2 hover:text-text-high">
        <span className="text-aurora-teal">🛠</span>
        <span className="font-mono">{toolName}</span>
        <span className="text-micro uppercase tracking-wider">
          {state === "output-available"
            ? "yanıt geldi"
            : state === "output-error"
              ? "hata"
              : state === "input-streaming"
                ? "giriş akıyor"
                : "giriş hazır"}
        </span>
      </summary>
      <div className="px-3 py-2 flex flex-col gap-2">
        {!!part.input && (
          <div className="flex flex-col gap-1">
            <span className="text-micro uppercase tracking-wider text-text-low">girdi</span>
            <pre className="text-caption font-mono text-text-medium overflow-x-auto">
              {JSON.stringify(part.input, null, 2)}
            </pre>
          </div>
        )}
        {output && (
          <div className="flex flex-col gap-1">
            <span className="text-micro uppercase tracking-wider text-text-low">sonuç</span>
            <ToolOutputView toolName={toolName} output={output} />
          </div>
        )}
        {part.errorText && <div className="text-caption text-danger">⚠ {part.errorText}</div>}
      </div>
    </details>
  );
}

function ToolOutputView({
  toolName,
  output,
}: {
  toolName: string;
  output: Record<string, unknown>;
}) {
  const hfFloat = typeof output["hfFloat"] === "number" ? output["hfFloat"] : null;
  const priceUsd = typeof output["priceUsd"] === "number" ? output["priceUsd"] : null;
  const freshness = typeof output["freshness"] === "string" ? output["freshness"] : null;
  const liqUsd =
    typeof output["liquidationPriceUsd"] === "number" ? output["liquidationPriceUsd"] : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {priceUsd != null && (
          <span className="text-caption rounded bg-space-700 px-2 py-1 font-mono">
            fiyat ≈ ${priceUsd.toFixed(4)}
            {freshness && (
              <span
                className={`ml-2 ${
                  freshness === "fresh"
                    ? "text-aurora-teal"
                    : freshness === "warn"
                      ? "text-aurora-amber"
                      : "text-danger"
                }`}
              >
                · {freshness}
              </span>
            )}
          </span>
        )}
        {hfFloat != null && (
          <span className="text-caption inline-flex items-center gap-2 rounded bg-space-700 px-2 py-1">
            HF: <HealthFactorBadge hf={hfFloat} />
          </span>
        )}
        {liqUsd != null && (
          <span className="text-caption rounded bg-space-700 px-2 py-1 font-mono">
            likidasyon ≈ ${liqUsd.toFixed(4)}
          </span>
        )}
      </div>
      <pre className="text-micro font-mono text-text-low overflow-x-auto">
        {JSON.stringify(output, null, 2)}
      </pre>
      <span className="text-micro text-text-low">tool: {toolName}</span>
    </div>
  );
}

/* ───────────────────────── Sub bits ───────────────────────── */

function QuickChips({ disabled, onPick }: { disabled: boolean; onPick: (text: string) => void }) {
  return (
    <div className="border-t border-border-subtle p-3 flex flex-wrap gap-2">
      {QUICK_QUESTIONS.map((q) => (
        <button
          key={q}
          type="button"
          disabled={disabled}
          onClick={() => onPick(q)}
          className="text-caption rounded-full border border-border-default bg-space-700 px-3 h-8 hover:bg-space-600 disabled:opacity-50"
        >
          {q}
        </button>
      ))}
    </div>
  );
}

function EmptyState({ context }: { context: CopilotContextSnapshot }) {
  return (
    <div className="rounded-md border border-border-subtle bg-space-800 p-4 flex flex-col gap-2 text-caption text-text-medium">
      <p className="m-0">
        Merhaba. Senin için Helios&apos;un canlı testnet verisini okuyorum: pool oracle fiyatı,
        kendi pozisyonun, reserve parametreleri, leverage projeksiyonu.
      </p>
      <p className="m-0">
        Bağlam: <code className="font-mono">{context.page}</code>
        {context.wizard && (
          <>
            {" "}
            · wizard{" "}
            <code className="font-mono">
              {context.wizard.assetId} @ {(context.wizard.leverageBps / 100).toFixed(2)}×
            </code>
          </>
        )}
        {context.position && (
          <>
            {" "}
            · pozisyon{" "}
            <code className="font-mono">
              {context.position.assetId} (HF {context.position.hfFloat?.toFixed(2) ?? "—"})
            </code>
          </>
        )}
      </p>
      <p className="m-0">Eğitim amaçlıdır; yatırım tavsiyesi değildir.</p>
    </div>
  );
}

function ThinkingDot() {
  return (
    <div className="self-start flex items-center gap-1 text-text-low text-caption">
      <span className="inline-block w-2 h-2 rounded-full bg-aurora-teal animate-pulse" />
      düşünüyorum…
    </div>
  );
}

function SignInGate() {
  return (
    <div className="flex-1 grid place-items-center p-6">
      <div className="rounded-lg bg-space-700 border border-border-default p-5 flex flex-col gap-3 text-center">
        <h3 className="text-h3 text-text-high m-0">Sign-in gerekli</h3>
        <p className="text-body text-text-medium m-0">
          Copilot oturum sahibinin Blend pozisyonunu okumak için SEP-10 ile imzalanmış oturum ister.
        </p>
        <Link
          href="/"
          className="self-center rounded-md bg-aurora-amber text-text-on-aurora h-11 px-5 inline-flex items-center font-semibold hover:bg-aurora-amber-glow"
        >
          Ana sayfaya dön → Connect & Sign-in
        </Link>
      </div>
    </div>
  );
}

function formatContextHint(ctx: CopilotContextSnapshot): string {
  const parts: string[] = [];
  if (ctx.wizard) {
    parts.push(
      `Open wizard'da ${ctx.wizard.assetId} seçili, leverage ${(ctx.wizard.leverageBps / 100).toFixed(2)}×.`,
    );
    if (ctx.wizard.principalRaw) {
      parts.push(`Principal girişi: ${ctx.wizard.principalRaw}.`);
    }
  }
  if (ctx.position) {
    parts.push(
      `Açık pozisyon: ${ctx.position.assetId}, collateral ${ctx.position.collateralUnderlying}, debt ${ctx.position.debtUnderlying}, HF ${
        ctx.position.hfFloat?.toFixed(2) ?? "—"
      }, leverage ${ctx.position.leverageX?.toFixed(2) ?? "—"}×.`,
    );
  }
  if (parts.length === 0) return "";
  return `Bağlam: ${parts.join(" ")}`;
}
