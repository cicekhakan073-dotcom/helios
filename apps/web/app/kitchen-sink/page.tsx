import {
  AuroraBackground,
  brand,
  Button,
  Card,
  CardHeader,
  CardMeta,
  CardTitle,
  DisclaimerStrip,
  GlassPanel,
  HealthFactorBadge,
  RiskGauge,
  StatTile,
} from "@helios/ui";
import { Activity, Coins, type LucideIcon } from "lucide-react";


/**
 * /_kitchen-sink — paylaşılan UI primitiflerinin görsel doğrulama sayfası.
 * Production'da dışlanacak (dev-only). PROMPT 6 kabul kriteri:
 *   "En az 6 UI primitifi packages/ui'den export edilip
 *    _kitchen-sink sayfasında görünüyor."
 * + HealthFactorBadge dört durum (healthy/caution/danger/liquidatable).
 */
export default function KitchenSinkPage() {
  return (
    <>
      <AuroraBackground />
      <DisclaimerStrip />
      <main className="mx-auto max-w-6xl px-6 py-16 flex flex-col gap-12">
        <Section title="Brand" meta="design-system §VISION + dürüstlük şeridi">
          <p className="text-h1 text-text-high m-0">{brand.name}</p>
          <p className="text-body text-text-medium m-0">{brand.tagline}</p>
        </Section>

        <Section title="Button" meta="primary / ghost / danger × sm / md / lg">
          <div className="flex flex-wrap gap-3">
            <Button variant="primary" size="sm">
              Primary sm
            </Button>
            <Button variant="primary" size="md">
              Primary md
            </Button>
            <Button variant="primary" size="lg">
              Primary lg
            </Button>
            <Button variant="ghost" size="md">
              Ghost
            </Button>
            <Button variant="danger" size="md">
              Danger
            </Button>
            <Button variant="primary" size="md" disabled>
              Disabled
            </Button>
          </div>
        </Section>

        <Section title="Card + GlassPanel" meta="elevated / borderedAurora / danger varyantları">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card interactive>
              <CardHeader>
                <CardTitle>Vault — USDC</CardTitle>
                <CardMeta>APY 6.4% · TVL $1.2M</CardMeta>
              </CardHeader>
              <p className="text-body text-text-medium m-0">
                Hover&apos;da elevation artar (interactive prop). Token: <code>--shadow-elev-2</code>.
              </p>
            </Card>
            <GlassPanel>
              <p className="text-h3 m-0 text-text-high">GlassPanel · default</p>
              <p className="text-body text-text-medium mt-2 mb-0">
                Backdrop-filter: blur(20px) saturate(140%). Token: <code>--glass-bg</code>.
              </p>
            </GlassPanel>
            <GlassPanel variant="elevated">
              <p className="text-h3 m-0 text-text-high">GlassPanel · elevated</p>
              <p className="text-body text-text-medium mt-2 mb-0">
                shadow-elev-3 + glow-mauve.
              </p>
            </GlassPanel>
            <GlassPanel variant="borderedAurora">
              <p className="text-h3 m-0 text-text-high">GlassPanel · aurora border</p>
              <p className="text-body text-text-medium mt-2 mb-0">
                Border: gradient(amber → mauve → teal).
              </p>
            </GlassPanel>
            <GlassPanel variant="danger">
              <p className="text-h3 m-0 text-text-high">GlassPanel · danger</p>
              <p className="text-body text-text-medium mt-2 mb-0">
                Kritik uyarı için — likidasyon yakın paneli.
              </p>
            </GlassPanel>
          </div>
        </Section>

        <Section title="StatTile" meta="KPI tile — mono + tabular-nums, opsiyonel delta">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatTile label="Toplam Collateral" value="$24,560.78" icon={Coins as LucideIcon} />
            <StatTile
              label="Net Equity"
              value="$8,134.22"
              delta={{ direction: "up", label: "+4.7%" }}
            />
            <StatTile
              label="Ortalama HF"
              value="1.42"
              delta={{ direction: "down", label: "−0.08" }}
              icon={Activity as LucideIcon}
            />
            <StatTile label="Tahmini APY" value="—" loading />
          </div>
        </Section>

        <Section
          title="HealthFactorBadge"
          meta="4 durum — renk + ikon + metin üçlüsü (color-blind safe, design-system §8.2)"
        >
          <div className="flex flex-wrap gap-3">
            <HealthFactorBadge hf={1.82} />
            <HealthFactorBadge hf={1.34} />
            <HealthFactorBadge hf={1.12} />
            <HealthFactorBadge hf={0.92} />
            <HealthFactorBadge hf={1.34} iconOnly />
          </div>
        </Section>

        <Section title="RiskGauge" meta="0..2 ölçeği, likidasyon eşik çizgisi, semi-circular SVG">
          <div className="flex flex-wrap items-end gap-8">
            <div className="flex flex-col items-center">
              <RiskGauge hf={1.85} />
              <span className="text-caption text-text-low mt-2">Sağlıklı</span>
            </div>
            <div className="flex flex-col items-center">
              <RiskGauge hf={1.34} />
              <span className="text-caption text-text-low mt-2">Dikkat</span>
            </div>
            <div className="flex flex-col items-center">
              <RiskGauge hf={1.08} />
              <span className="text-caption text-text-low mt-2">Riskli</span>
            </div>
            <div className="flex flex-col items-center">
              <RiskGauge hf={0.86} />
              <span className="text-caption text-text-low mt-2">Likidasyon</span>
            </div>
          </div>
        </Section>

        <Section title="AuroraBackground" meta="Arka planda ambient (zaten sayfa altında çalışıyor)">
          <p className="text-body text-text-medium m-0">
            Sayfanın arkasında üç yumuşak gradient blob (amber/mauve/teal) yavaş döner. Reduced-motion
            açıkken statiktir. Token: <code>--animate-aurora-*</code>.
          </p>
        </Section>
      </main>
    </>
  );
}

function Section({
  title,
  meta,
  children,
}: {
  title: string;
  meta: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <header>
        <h2 className="text-h2 text-text-high m-0">{title}</h2>
        <p className="text-caption text-text-low m-0">{meta}</p>
      </header>
      {children}
    </section>
  );
}
