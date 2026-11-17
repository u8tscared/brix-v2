import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { HardHat, LayoutGrid, List, Map as MapIcon, Plus, Search } from 'lucide-react';
import { Button, EmptyState, IconTile, Input, PageHeader, Segmented } from '@/components/ui';
import { money } from '@/lib/format';
import type { ChantierStatus } from '@/lib/types';
import { useChantierViews } from './lib/useChantier';
import { useChantiersSeed } from './store';
import { ChantierTable } from './components/list/ChantierTable';
import { ChantierMap } from './components/list/ChantierMap';
import { NewChantierSheet } from './components/list/NewChantierSheet';
import { ChantierCards } from './components/list/ChantierCards';
import { KpiBand, VersusBars } from './components/common/KpiBand';

type View = 'cartes' | 'liste' | 'carte';

type Filter = 'actifs' | ChantierStatus | 'tous';

const ORDER: Record<ChantierStatus, number> = { en_cours: 0, reception: 1, en_pause: 2, a_planifier: 3, termine: 4 };

export default function ChantiersList() {
  useChantiersSeed();
  const views = useChantierViews();
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState<Filter>('actifs');
  const [view, setView] = useState<View>(() => {
    try {
      const v = localStorage.getItem('brix-chantiers-view2') as View | null;
      return v && ['cartes', 'liste', 'carte'].includes(v) ? v : 'cartes';
    } catch {
      return 'cartes';
    }
  });
  const [q, setQ] = useState('');
  const creating = params.get('nouveau') === '1';
  const setCreating = (on: boolean) => {
    const p = new URLSearchParams(params);
    if (on) p.set('nouveau', '1');
    else p.delete('nouveau');
    setParams(p, { replace: true });
  };
  const changeView = (v: View) => {
    setView(v);
    try {
      localStorage.setItem('brix-chantiers-view2', v);
    } catch {
      /* stockage indisponible */
    }
  };

  const count = (f: Filter) => views.filter((v) => (f === 'tous' ? true : f === 'actifs' ? v.ch.status !== 'termine' : v.ch.status === f)).length;

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return views
      .filter((v) => (filter === 'tous' ? true : filter === 'actifs' ? v.ch.status !== 'termine' : v.ch.status === filter))
      .filter((v) => !needle || [v.ch.name, v.client?.name, v.ch.city, v.ch.address].some((s) => s?.toLowerCase().includes(needle)))
      .sort((a, b) => Number(!!b.ch.pinned) - Number(!!a.ch.pinned) || ORDER[a.ch.status] - ORDER[b.ch.status] || a.ch.endDate.localeCompare(b.ch.endDate));
  }, [views, filter, q]);

  const active = views.filter((v) => v.ch.status === 'en_cours');
  const inProgressAmount = active.reduce((s, v) => s + v.ch.budgetHt, 0);
  const avgMargin = active.length ? active.reduce((s, v) => s + v.m.realMarginRate * v.ch.budgetHt, 0) / Math.max(1, inProgressAmount) : 0;
  const avgPlanned = active.length ? active.reduce((s, v) => s + v.m.plannedMarginRate * v.ch.budgetHt, 0) / Math.max(1, inProgressAmount) : 0;
  const watch = views.filter((v) => v.ch.status !== 'termine' && v.m.risk !== 'faible');

  const toProduce = active.reduce((s, v) => s + v.ch.budgetHt * (1 - v.ch.progress / 100), 0);
  const filters = (
    [
      ['actifs', 'Actifs'],
      ['en_cours', 'En cours'],
      ['a_planifier', 'À planifier'],
      ['en_pause', 'En pause'],
      ['reception', 'Réception'],
      ['termine', 'Terminés'],
      ['tous', 'Tous'],
    ] as [Filter, string][]
  )
    .filter(([f]) => f === 'actifs' || f === 'tous' || f === filter || count(f) > 0)
    .map(([value, label]) => ({ value, label, count: count(value) }));

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<IconTile name="HardHat" dept="chantiers" size="lg" />}
        title="Chantiers"
        subtitle={views.length ? `${active.length} en cours, ${count('a_planifier')} à planifier` : 'Suivez avancement, marge et photos de chaque chantier.'}
        actions={
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)} className="max-sm:w-full">
            Nouveau chantier
          </Button>
        }
      />

      {views.length > 0 && (
        <KpiBand
          hero={{
            label: 'Marge réelle des chantiers en cours',
            value: avgMargin,
            format: (n) => `${Math.round(n)} %`,
            sub: avgMargin < avgPlanned - 2 ? `${Math.round(avgPlanned - avgMargin)} pts sous le devis` : 'conforme au devis',
            extra: <VersusBars real={avgMargin} planned={avgPlanned} realLabel="Réelle" plannedLabel="Au devis" />,
          }}
          items={[
            { label: 'En cours', value: inProgressAmount, format: (n) => money(n, true), sub: `${active.length} chantier${active.length > 1 ? 's' : ''} HT` },
            { label: 'Reste à produire', value: toProduce, format: (n) => money(n, true), sub: 'avant facturation finale' },
            { label: 'À surveiller', value: watch.length, tone: watch.length ? 'warn' : 'ok', sub: watch.length ? watch.map((w) => w.client?.name.split(' ').slice(-1)[0]).join(', ') : 'tout est dans les clous' },
          ]}
        />
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <Segmented value={filter} onChange={setFilter} options={filters} />
        <div className="flex flex-1 items-center gap-2 lg:justify-end">
          <Input icon={<Search />} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chantier, client, ville" className="min-w-0 flex-1 lg:max-w-72" />
          <Segmented
            value={view}
            onChange={changeView}
            options={[
              { value: 'cartes', label: <span className="flex items-center gap-1.5" aria-label="Cartes"><LayoutGrid className="h-3.5 w-3.5" /><span className="max-sm:hidden">Cartes</span></span> },
              { value: 'liste', label: <span className="flex items-center gap-1.5" aria-label="Liste"><List className="h-3.5 w-3.5" /><span className="max-sm:hidden">Liste</span></span> },
              { value: 'carte', label: <span className="flex items-center gap-1.5" aria-label="Plan"><MapIcon className="h-3.5 w-3.5" /><span className="max-sm:hidden">Plan</span></span> },
            ]}
          />
        </div>
      </div>

      {views.length === 0 ? (
        <EmptyState
          icon={<HardHat />}
          title="Aucun chantier pour l'instant"
          text="Un chantier naît d'un devis signé. Créez-le en 20 secondes : client, adresse, dates et équipe."
          action={<Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>Créer mon premier chantier</Button>}
        />
      ) : rows.length === 0 ? (
        <EmptyState icon={<Search />} title="Aucun chantier ne correspond" text="Changez le filtre ou la recherche." action={<Button onClick={() => { setFilter('tous'); setQ(''); }}>Tout afficher</Button>} />
      ) : (
        <div key={view} className="animate-fade-up">
          {view === 'cartes' ? <ChantierCards rows={rows} /> : view === 'liste' ? <ChantierTable rows={rows} /> : <ChantierMap rows={rows} />}
        </div>
      )}

      <NewChantierSheet open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}
