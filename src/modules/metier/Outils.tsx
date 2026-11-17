import { lazy, Suspense, useMemo, useState, type ComponentType, type LazyExoticComponent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, Search } from 'lucide-react';
import { Badge, Card, EmptyState, Icon, Input, PageHeader } from '@/components/ui';
import { useBrix } from '@/lib/store';
import { TRADE_BY_KEY } from '@/lib/catalog';
import { PageLoader } from '@/components/layout/AppShell';
import { ALL_TOOLS, TOOL_META, type ToolMeta } from './tools/meta';
import { norm } from '@/modules/bob/nlu/text';

const TOOLS: Record<string, LazyExoticComponent<ComponentType>> = {
  'section-cable': lazy(() => import('./tools/SectionCable')),
  nfc15100: lazy(() => import('./tools/Nfc15100')),
  tableau: lazy(() => import('./tools/Tableau')),
  irve: lazy(() => import('./tools/Irve')),
  evacuation: lazy(() => import('./tools/Evacuation')),
  'bilan-thermique': lazy(() => import('./tools/BilanThermique')),
  ballon: lazy(() => import('./tools/Ballon')),
  peinture: lazy(() => import('./tools/Peinture')),
  calepinage: lazy(() => import('./tools/Calepinage')),
  cloison: lazy(() => import('./tools/Cloison')),
  menuiserie: lazy(() => import('./tools/Menuiserie')),
  toiture: lazy(() => import('./tools/Toiture')),
  beton: lazy(() => import('./tools/Beton')),
  gazon: lazy(() => import('./tools/Gazon')),
  clim: lazy(() => import('./tools/Clim')),
  express: lazy(() => import('./tools/Express')),
};

export default function Outils() {
  const { tool } = useParams();
  if (tool) {
    const C = TOOLS[tool];
    if (!C) return <EmptyState title="Outil introuvable" text="Cet outil n’existe pas ou a changé de nom." action={<Link className="text-[13px] font-medium underline" to="/app/outils">Voir tous les outils</Link>} />;
    return (
      <Suspense fallback={<PageLoader />}>
        <C />
      </Suspense>
    );
  }
  return <ToolList />;
}

function ToolList() {
  const company = useBrix((s) => s.company);
  const [q, setQ] = useState('');
  const mine = useMemo(() => [company.trade, ...company.secondaryTrades], [company]);
  const own = ALL_TOOLS.filter((t) => t.trades.some((k) => mine.includes(k)) && TOOLS[t.key]);
  const others = ALL_TOOLS.filter((t) => !own.includes(t) && TOOLS[t.key]);
  const nq = norm(q);
  const match = (t: ToolMeta) => !nq || norm(`${t.name} ${t.short} ${t.long} ${t.trades.map((k) => TRADE_BY_KEY[k]?.name).join(' ')}`).includes(nq);
  const tradeName = TRADE_BY_KEY[company.trade]?.name ?? 'votre métier';

  return (
    <div className="space-y-6">
      <PageHeader title="Outils métier" subtitle="Des calculs justes, avec les formules et les normes. Le résultat part dans votre devis en un geste." />
      <Input icon={<Search />} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher un calcul : câble, peinture, béton…" className="max-w-md" />

      {own.filter(match).length > 0 && (
        <section>
          <h2 className="mb-3 text-[15px] font-semibold">Pour {tradeName.toLowerCase().startsWith('électricien') ? 'les électriciens' : tradeName.toLowerCase()}</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {own.filter(match).map((t) => <ToolCard key={t.key} t={t} big />)}
          </div>
        </section>
      )}
      {others.filter(match).length > 0 && (
        <section>
          <h2 className="mb-3 text-[15px] font-semibold">Tous les autres outils</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {others.filter(match).map((t) => <ToolCard key={t.key} t={t} />)}
          </div>
        </section>
      )}
      {own.filter(match).length + others.filter(match).length === 0 && <EmptyState icon={<Search />} title="Aucun outil trouvé" text="Essayez un autre mot, ou demandez à Bob." />}
    </div>
  );
}

function ToolCard({ t, big }: { t: ToolMeta; big?: boolean }) {
  return (
    <Link to={`/app/outils/${t.key}`} className="group block">
      <Card className="flex h-full flex-col p-4 transition group-hover:shadow-card group-hover:[border-color:var(--line2)]">
        <div className="flex items-start gap-3">
          <span className={`grid shrink-0 place-items-center rounded-[11px] border border-line ${big ? 'h-11 w-11 bg-vi-50 text-vi-700' : 'h-10 w-10 bg-sub text-ink-2'}`}>
            <Icon name={t.icon} className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-semibold leading-snug">{TOOL_META[t.key].name}</div>
            <div className="mt-0.5 text-[12.5px] leading-snug text-ink-2">{t.long}</div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5 pt-1">
          {t.trades.slice(0, 2).map((k) => <Badge key={k}>{TRADE_BY_KEY[k]?.name.split(',')[0]}</Badge>)}
          <ArrowRight className="ml-auto h-4 w-4 text-ink-3 transition group-hover:translate-x-0.5 group-hover:text-ink" />
        </div>
      </Card>
    </Link>
  );
}
