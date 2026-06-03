import { DisclaimerStrip, Skeleton } from "@helios/ui";

interface Props {
  title?: string;
  /** Skeleton bloklarının yüksekliği. */
  blocks?: number;
}

export function PageLoading({ title, blocks = 3 }: Props) {
  return (
    <>
      <DisclaimerStrip />
      <main className="mx-auto max-w-5xl px-6 py-12 flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          {title ? (
            <h1 className="text-h1 text-text-high m-0">{title}</h1>
          ) : (
            <Skeleton variant="line" width="40%" height="36px" />
          )}
          <Skeleton variant="line" width="60%" height="14px" />
        </div>
        {Array.from({ length: blocks }).map((_, i) => (
          <Skeleton key={i} variant="card" height="120px" />
        ))}
      </main>
    </>
  );
}
