"use client";

import { PageError } from "../_components/PageError";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <PageError error={error} reset={reset} title="Leaderboard hatası" />;
}
