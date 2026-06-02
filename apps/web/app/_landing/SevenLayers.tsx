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
  { icon: Brain, title: "AI Strategy Copilot", desc: "Canlı veri + Claude Sonnet 4.6 ile gerekçeli kaldıraç önerisi." },
  { icon: Compass, title: "Risk Radar", desc: "HF fan grafiği + likidasyon olasılığı, fiyat şoku altında projeksiyon." },
  { icon: Activity, title: "Auto-Rebalancer", desc: "Opt-in keeper; HF eşik altı düştüğünde kısmi deleverage tetikler." },
  { icon: Layers, title: "Multi-Asset Vaults", desc: "USDC, XLM, wBTC, wETH için tek-asset stratejileri." },
  { icon: Sparkles, title: "Monte Carlo Simulator", desc: "Reflector geçmiş fiyat verisinden volatility kalibrasyonu + senaryo dağılımı." },
  { icon: Trophy, title: "Social Leaderboard", desc: "Anonim PnL sıralaması ve strateji paylaşımı." },
  { icon: Smartphone, title: "PWA + Web Push", desc: "Mobil-first deneyim, HF eşik bildirimleri." },
];

/**
 * 7 katman özet kartları — VISION.md'ye uyum (Helios'un katman mimarisi).
 * Server component, "use cache" altında uzun ömürlü cache'lenebilir (içerik statik).
 */
export function SevenLayers() {
  return (
    <section className="py-20 px-6">
      <div className="mx-auto max-w-5xl flex flex-col gap-8">
        <div className="text-center">
          <h2 className="text-h1 text-text-high m-0">Çekirdek + 7 katman</h2>
          <p className="text-body text-text-medium mt-3 max-w-2xl mx-auto">
            Atomik flash-loan döngüsünün üstüne bindirilen yetenekler.
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
