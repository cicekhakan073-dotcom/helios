"use client";

/**
 * PushPanel — Web Push abonelik + iOS install talimatı.
 *
 * SEP-10 zorunlu (server route 401'i UI'ya yansır). VAPID public key
 * `NEXT_PUBLIC_VAPID_PUBLIC_KEY` env'inde; yoksa "yapılandırılmadı".
 */

import { useSession } from "@helios/sdk";
import { useEffect, useState } from "react";

function detectClient(): {
  supported: boolean;
  permission: NotificationPermission;
  iosHint: { ios: boolean; standalone: boolean };
} {
  if (typeof navigator === "undefined" || typeof window === "undefined") {
    return {
      supported: false,
      permission: "default",
      iosHint: { ios: false, standalone: false },
    };
  }
  const supported = "serviceWorker" in navigator && "PushManager" in window;
  const permission: NotificationPermission =
    typeof Notification !== "undefined" ? Notification.permission : "default";
  const ios =
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !("MSStream" in (window as unknown as { MSStream?: unknown }));
  const standalone = window.matchMedia("(display-mode: standalone)").matches;
  return { supported, permission, iosHint: { ios, standalone } };
}

export function PushPanel() {
  const sessionQ = useSession();
  const [client] = useState(detectClient);
  const { supported, permission: initialPermission, iosHint } = client;
  const [permission, setPermission] = useState<NotificationPermission>(initialPermission);
  const [subscribed, setSubscribed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vapidKey = process.env["NEXT_PUBLIC_VAPID_PUBLIC_KEY"] ?? "";

  useEffect(() => {
    if (!supported) return;
    void (async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });
        const sub = await reg.pushManager.getSubscription();
        setSubscribed(!!sub);
      } catch (e) {
        setError(e instanceof Error ? e.message : "SW register hatası");
      }
    })();
  }, [supported]);

  async function subscribe() {
    setError(null);
    if (!vapidKey) {
      setError("NEXT_PUBLIC_VAPID_PUBLIC_KEY env yok — push yapılandırılmadı.");
      return;
    }
    setPending(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        // applicationServerKey: string | BufferSource. Base64URL string doğrudan
        // kabul edilir; buffer cast'leri SharedArrayBuffer çakışmasından kaçınır.
        applicationServerKey: vapidKey,
      });
      const resp = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!resp.ok) {
        const j: unknown = await resp.json().catch(() => null);
        let msg = `HTTP ${resp.status}`;
        if (j && typeof j === "object" && "message" in j) {
          const m = j.message;
          if (typeof m === "string") msg = m;
        }
        throw new Error(msg);
      }
      setSubscribed(true);
      setPermission(typeof Notification !== "undefined" ? Notification.permission : "granted");
    } catch (e) {
      setError(e instanceof Error ? e.message : "subscribe başarısız");
    } finally {
      setPending(false);
    }
  }

  async function unsubscribe() {
    setError(null);
    setPending(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ endpoint }),
        });
      }
      setSubscribed(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "unsubscribe başarısız");
    } finally {
      setPending(false);
    }
  }

  if (!supported) {
    return (
      <section className="rounded-md bg-space-700 border border-border-default p-4 text-caption text-text-medium">
        Push notification bu tarayıcıda desteklenmiyor.
      </section>
    );
  }
  if (!sessionQ.data?.address) {
    return (
      <section className="rounded-md bg-space-700 border border-border-default p-4 text-caption text-text-medium">
        Push aboneliği için önce SEP-10 sign-in.
      </section>
    );
  }

  return (
    <section className="rounded-md bg-space-700 border border-border-default p-4 flex flex-col gap-3">
      <header className="flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-h3 text-text-high m-0">Web push uyarıları</h3>
          <p className="text-caption text-text-low m-0">
            HF eşik aşımı + likidasyon riski bildirimleri (testnet).
          </p>
        </div>
        <span className="text-caption text-text-low">izin: {permission}</span>
      </header>

      {iosHint.ios && !iosHint.standalone && (
        <div className="rounded bg-warn-soft border border-warn p-2 text-caption text-warn">
          iOS&apos;ta push yalnız <strong>home-screen&apos;e eklenmiş PWA</strong>&apos;da çalışır
          (iOS 16.4+). Safari paylaş → &quot;Add to Home Screen&quot; → ardından açıp Subscribe.
        </div>
      )}

      <div className="flex items-center gap-3">
        {subscribed ? (
          <button
            type="button"
            onClick={() => void unsubscribe()}
            disabled={pending}
            className="rounded-md bg-space-600 text-text-high h-10 px-4 hover:bg-space-500 disabled:opacity-50"
          >
            {pending ? "…" : "Unsubscribe"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void subscribe()}
            disabled={pending || !vapidKey}
            className="rounded-md bg-aurora-amber text-text-on-aurora h-10 px-4 font-semibold disabled:opacity-50 hover:bg-aurora-amber-glow"
          >
            {pending ? "…" : "Subscribe"}
          </button>
        )}
        {!vapidKey && (
          <span className="text-caption text-warn">
            NEXT_PUBLIC_VAPID_PUBLIC_KEY env yok — push yapılandırılmadı.
          </span>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-md border border-danger bg-danger-soft p-2 text-caption text-danger"
        >
          {error}
        </div>
      )}
    </section>
  );
}
