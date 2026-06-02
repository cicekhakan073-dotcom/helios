"use client";

/**
 * useAuth + useSession + useSignIn — TanStack Query hook'ları.
 *
 * UI sadece bunları tüketir; HTTP fetch ya da Wallets Kit signTransaction
 * doğrudan import edilmez.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchSession, logoutSession, type SessionInfo } from "./client";
import { signInWithStellar } from "./sign";

const SESSION_QUERY_KEY = ["helios-auth", "session"] as const;

export function useSession(opts?: { enabled?: boolean }) {
  return useQuery<SessionInfo | null>({
    queryKey: [...SESSION_QUERY_KEY],
    queryFn: fetchSession,
    enabled: opts?.enabled ?? true,
    staleTime: 60 * 1000, // 1dk: oturum okuması ucuz, ama her render fetch'lemek istemiyoruz
    retry: false,
  });
}

export function useSignIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (address: string) => signInWithStellar(address),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...SESSION_QUERY_KEY] });
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: logoutSession,
    onSuccess: () => {
      qc.setQueryData([...SESSION_QUERY_KEY], null);
    },
  });
}

/** Convenience: hem session hem mutator'ları aynı çağrıdan döndürür. */
export function useAuth() {
  const session = useSession();
  const signIn = useSignIn();
  const logout = useLogout();
  return {
    session: session.data ?? null,
    isLoading: session.isLoading,
    isAuthenticated: !!session.data,
    signIn,
    logout,
  };
}
