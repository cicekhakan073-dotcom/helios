import {
  Activity,
  Brain,
  Compass,
  Layers,
  Smartphone,
  Sparkles,
  Trophy,
  type LucideIcon,
} from "lucide-react";

interface Layer {
  icon: LucideIcon;
  title: string;
  desc: string;
}

const LAYERS: Layer[] = [
  {
    icon: Brain,
    title: "AI Strategy Copilot",
    desc: "Reasoned leverage suggestions from live data + Claude Sonnet 4.6.",
  },
  {
    icon: Compass,
    title: "Risk Radar",
    desc: "HF fan chart + liquidation probability, projected under price shocks.",
  },
  {
    icon: Activity,
    title: "Auto-Rebalancer",
    desc: "Opt-in keeper; triggers a partial deleverage when HF drops below the threshold.",
  },
  {
    icon: Layers,
    title: "Multi-Asset Vaults",
    desc: "Single-asset strategies for USDC, XLM, wBTC, wETH.",
  },
  {
    icon: Sparkles,
    title: "Monte Carlo Simulator",
    desc: "Volatility-calibrated scenario distribution from Reflector price history.",
  },
  {
    icon: Trophy,
    title: "Social Leaderboard",
    desc: "Anonymous PnL ranking and strategy sharing.",
  },
  {
    icon: Smartphone,
    title: "PWA + Web Push",
    desc: "Mobile-first experience with HF threshold notifications.",
  },
];

/**
 * 7-layer summary cards — aligned with VISION.md (Helios's layered architecture).
 * Server component; can be cached long-lived under "use cache" (static content).
 */
export function SevenLayers() {
  return (
    <section className="py-20 px-6">
      <div className="mx-auto max-w-5xl flex flex-col gap-8">
        <div className="text-center">
          <h2 className="text-h1 text-text-high m-0">Core + 7 layers</h2>
          <p className="text-body text-text-medium mt-3 max-w-2xl mx-auto">
            Capabilities layered on top of the atomic flash-loan loop.
          </p>
        </div>
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 list-none p-0 m-0">
          {LAYERS.map((layer) => (
            <li
              key={layer.title}
              className="rounded-lg bg-space-700 border border-border-default p-5 flex flex-col gap-2 hover:border-border-strong transition-colors"
            >
              <layer.icon className="size-5 text-aurora-teal" aria-hidden="true" />
              <h3 className="text-h4 text-text-high m-0">{layer.title}</h3>
              <p className="text-caption text-text-medium m-0">{layer.desc}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
