"use client";

import { pushAppError } from "@helios/sdk";
import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

/**
 * Client-side providers — TanStack Query istemcisi.
 *
 * Global hata yakalama: query/mutation hataları normalize edilip ToastHost'a
 * push edilir. UnsafeHealthFactor / Wallet reject / 401 vb. tutarlı UX.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
        queryCache: new QueryCache({
          onError: (err, query) => {
            // Sadece kullanıcı-tetiklemeli hatalar — sessiz background fetch'lerinde
            // toast spam yapma. `enabled: false` query'leri zaten gelmez; ama yine
            // bir kez normalize edip log'a düşür.
            const queryKey = JSON.stringify(query.queryKey);
            pushAppError(err, { durationMs: queryKey.includes("session") ? 0 : 6000 });
          },
        }),
        mutationCache: new MutationCache({
          onError: (err) => pushAppError(err),
        }),
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
