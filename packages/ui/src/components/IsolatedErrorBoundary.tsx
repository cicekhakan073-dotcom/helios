"use client";

/**
 * IsolatedErrorBoundary — sayfayı çökertmeden tek bir alt ağacı yakalar.
 *
 * Riskli yer: RiskRadar (worker), HfProjectionChart/visx (grafik), Copilot
 * (stream). Biri patlarsa fallback gösterir, sayfanın geri kalanı yaşar.
 * "Tekrar dene" reset key'i çocukları yeniden mount eder.
 */

import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  /** Fallback başlığı. */
  label: string;
  children: ReactNode;
  /** Reset etmek için kullanıcıya gösterilecek metin (default: "Tekrar dene"). */
  retryLabel?: string;
  /** Geliştirme/üretim log için isteğe bağlı raporlayıcı. */
  onError?: (err: Error, info: ErrorInfo) => void;
}

interface State {
  err: Error | null;
  resetKey: number;
}

export class IsolatedErrorBoundary extends Component<Props, State> {
  override state: State = { err: null, resetKey: 0 };

  static getDerivedStateFromError(err: Error): Partial<State> {
    return { err };
  }

  override componentDidCatch(err: Error, info: ErrorInfo): void {
    this.props.onError?.(err, info);
  }

  private handleReset = (): void => {
    this.setState((s) => ({ err: null, resetKey: s.resetKey + 1 }));
  };

  override render(): ReactNode {
    if (this.state.err) {
      return (
        <div
          role="alert"
          className="rounded-md border border-warn bg-warn-soft p-4 flex flex-col gap-2 text-caption"
        >
          <strong className="text-text-high">{this.props.label}</strong>
          <span className="text-text-medium">
            Bu bileşen hata verdi; sayfanın geri kalanı çalışmaya devam ediyor.
          </span>
          <span className="font-mono text-micro text-text-low break-all">
            {this.state.err.message}
          </span>
          <button
            type="button"
            onClick={this.handleReset}
            className="self-start mt-1 rounded-md bg-space-700 text-text-high h-8 px-3 hover:bg-space-600"
          >
            {this.props.retryLabel ?? "Tekrar dene"}
          </button>
        </div>
      );
    }
    return <div key={this.state.resetKey}>{this.props.children}</div>;
  }
}
