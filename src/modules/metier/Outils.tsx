import { lazy, Suspense, useMemo, useState, type ComponentType, type LazyExoticComponent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowUpRight, Calculator, Search, X } from 'lucide-react';
import { Button, Card, Chip, EmptyState, Icon, IconTile, Input, PageHeader, cn } from '@/components/ui';
import { useBrix } from '@/lib/store';
import { TRADES, TRADE_BY_KEY } from '@/lib/catalog';
import type { TradeKey } from '@/lib/types';
import { PageLoader } from '@/components/layout/AppShell';
import { ALL_TOOLS, type ToolMeta } from './tools/meta';
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
    if (!C)
      return (
        <EmptyState
          icon={<Calculator />}
          title="Outil introuvable"
          text="Cet outil n’existe pas ou a changé de nom."
          action={<Link to="/app/outils"><Button variant="primary">Voir tous les outils</Button></Link>}
        />
      );
    return (
      <Suspense fallback={<PageLoader />}>
        <C key={tool} />
      </Suspense>
    );
  }
  return <ToolList />;
}

type Filter = 'mine' | 'all' | TradeKey;

function ToolList() {
  const company = useBrix((s) => s.company);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('mine');
  const mine = useMemo(() => [company.trade, ...company.secondaryTrades], [company]);
  const available = ALL_TOOLS.filter((t) => TOOLS[t.key]);
  const nq = norm(q);
  const match = (t: ToolMeta) => !nq || norm(`${t.name} ${t.short} ${t.long} ${t.trades.map((k) => TRADE_BY_KEY[k]?.name).join(' ')}`).includes(nq);
  const own = available.filter((t) => t.trades.some((k) => mine.includes(k)));
  const scoped = nq || filter === 'all' ? available : filter === 'mine' ? own : available.filter((t) => t.trades.includes(filter));
  const list = scoped.filter(match);
  const featured = !nq && filter === 'mine';
  const rest = featured ? available.filter((t) => !own.includes(t)) : [];
  const trade = TRADE_BY_KEY[company.trade];
  const tradesWithTools = TRADES.filter((t) => t.key !== 'autre');

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<IconTile name="Ruler" dept="metier" size="xl" />}
        kicker={<><span className="h-1.5 w-1.5 rounded-full bg-[#f59e0b]" />{available.length} calculateurs, normes à jour</>}
        title="Outils métier"
        titleMuted="des calculs justes, en un geste."
        subtitle="Les formules et les normes sont détaillées. Le résultat part dans votre devis."
      />

      <div className="space-y-3">
        <Input icon={<Search />} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher un calcul : câble, peinture, béton…" className="max-w-md [&_input]:rounded-pill" aria-label="Chercher un calcul" />
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 py-1 scrollbar-none md:mx-0 md:flex-wrap md:px-0">
          <Chip className="shrink-0" active={filter === 'mine'} onClick={() => setFilter('mine')} icon={<Icon name={trade?.icon ?? 'Wrench'} />}>Mon métier</Chip>
          <Chip className="shrink-0" active={filter === 'all'} onClick={() => setFilter('all')}>Tous <span className="num opacity-60">{available.length}</span></Chip>
          <span aria-hidden className="mx-1 my-1.5 w-px shrink-0 bg-halo-line" />
          {tradesWithTools.map((t) => (
            <Chip key={t.key} className="shrink-0" active={filter === t.key} onClick={() => setFilter(t.key)}>{t.plural}</Chip>
          ))}
        </div>
        {q && (
          <button onClick={() => setQ('')} className="inline-flex h-8 items-center gap-1 rounded-pill px-3 text-[12.5px] font-medium text-ink-2 transition-colors hover:bg-white hover:text-ink">
            <X className="h-3.5 w-3.5" /> Effacer « {q} »
          </button>
        )}
      </div>

      {list.length > 0 ? (
        <section>
          {featured && <h2 className="mb-3 text-[17px] font-semibold tracking-[-0.025em]">Pour {trade?.plural.toLowerCase() ?? 'vous'}</h2>}
          <div key={`${filter}-${nq}`} className={cn('stagger-fast grid gap-3 [&>*]:min-w-0', featured ? 'sm:grid-cols-2 xl:grid-cols-4' : 'sm:grid-cols-2 xl:grid-cols-3')}>
            {list.map((t) => <ToolCard key={t.key} t={t} big={featured} />)}
            {featured && list.length < 4 && (
              <Link to="/app/bob" className="lift group hidden min-h-[196px] flex-col justify-between rounded-card bg-dawn-mist p-6 shadow-halo-sm sm:flex">
                <IconTile name="AudioLines" dept="bob" size="lg" />
                <div>
                  <div className="text-[15px] font-semibold tracking-[-0.02em]">Un autre calcul ?</div>
                  <div className="mt-1 text-[12.5px] leading-snug text-ink-2">Demandez-le à Bob à voix haute : « combien de sacs pour une dalle de 20 m² ? »</div>
                </div>
              </Link>
            )}
          </div>
        </section>
      ) : (
        <EmptyState icon={<Search />} title="Aucun outil trouvé" text="Essayez un autre mot, ou demandez à Bob de faire le calcul pour vous." action={<Button onClick={() => { setQ(''); setFilter('all'); }}>Voir tous les outils</Button>} />
      )}

      {featured && rest.length > 0 && (
        <section>
          <h2 className="mb-3 text-[17px] font-semibold tracking-[-0.025em]">Les autres métiers</h2>
          <div className="stagger-fast grid gap-2.5 [&>*]:min-w-0 sm:grid-cols-2 xl:grid-cols-3">
            {rest.map((t) => <ToolCard key={t.key} t={t} />)}
          </div>
        </section>
      )}
    </div>
  );
}

function ToolCard({ t, big }: { t: ToolMeta; big?: boolean }) {
  const trades = t.trades.map((k) => TRADE_BY_KEY[k]?.name.split(',')[0]).filter(Boolean);
  if (!big) {
    return (
      <Link to={`/app/outils/${t.key}`} className="row-card group">
        <IconTile name={t.icon} dept="metier" size="row" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-semibold tracking-[-0.01em]">{t.name}</div>
          <div className="truncate text-[12.5px] text-ink-3">{trades.join(' · ')}</div>
        </div>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-3 transition-transform duration-300 ease-out-quint group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink" />
      </Link>
    );
  }
  return (
    <Link to={`/app/outils/${t.key}`} className="group block">
      <Card interactive className="relative flex h-full items-center gap-4 overflow-hidden p-4 sm:min-h-[196px] sm:flex-col sm:items-stretch sm:gap-0 sm:p-6">
        <div aria-hidden className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-[radial-gradient(closest-side,#fdeccb,transparent)] opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100" />
        <div className="relative flex shrink-0 items-start justify-between">
          <span className="transition-transform duration-500 ease-spring group-hover:-rotate-6 group-hover:scale-105">
            <IconTile name={t.icon} dept="metier" size="lg" />
          </span>
          <span className="hidden h-9 w-9 place-items-center rounded-full bg-halo-track text-ink-3 transition-all duration-300 ease-out-quint group-hover:bg-ink group-hover:text-white sm:grid">
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </div>
        <div className="relative min-w-0 sm:mt-auto sm:pt-7">
          <div className="text-[16px] font-semibold tracking-[-0.025em]">{t.name}</div>
          <div className="mt-1 text-[13px] leading-snug text-ink-2">{t.long}</div>
        </div>
      </Card>
    </Link>
  );
}
