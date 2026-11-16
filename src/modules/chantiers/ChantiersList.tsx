import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { HardHat, List, Map as MapIcon, Plus, Search } from 'lucide-react';
import { Button, Card, EmptyState, Input, PageHeader, Segmented, Stat } from '@/components/ui';
import { money } from '@/lib/format';
import type { ChantierStatus } from '@/lib/types';
import { useChantierViews } from './lib/useChantier';
import { useChantiersSeed } from './store';
import { ChantierTable } from './components/list/ChantierTable';
import { ChantierMap } from './components/list/ChantierMap';
import { NewChantierSheet } from './components/list/NewChantierSheet';

type Filter = 'actifs' | ChantierStatus | 'tous';

const ORDER: Record<ChantierStatus, number> = { en_cours: 0, reception: 1, en_pause: 2, a_planifier: 3, termine: 4 };

export default function ChantiersList() {
  useChantiersSeed();
  const views = useChantierViews();
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState<Filter>('actifs');
  const [view, setView] = useState<'liste' | 'carte'>(() => {
    try {
      return (localStorage.getItem('brix-chantiers-view') as 'liste' | 'carte') || 'liste';
    } catch {
      return 'liste';
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
  const changeView = (v: 'liste' | 'carte') => {
    setView(v);
    try {
      localStorage.setItem('brix-chantiers-view', v);
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

  return (
    <div className="space-y-5">
      <PageHeader
        title="Chantiers"
        subtitle={views.length ? `${active.length} en cours · ${count('a_planifier')} à planifier` : 'Suivez avancement, marge et photos de chaque chantier.'}
        actions={
          <>
            <Segmented
              value={view}
              onChange={changeView}
              options={[
                { value: 'liste', label: <span className="flex items-center gap-1.5"><List className="h-3.5 w-3.5" />Liste</span> },
                { value: 'carte', label: <span className="flex items-center gap-1.5"><MapIcon className="h-3.5 w-3.5" />Carte</span> },
              ]}
            />
            <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>
              Nouveau chantier
            </Button>
          </>
        }
      />

      {views.length > 0 && (
        <Card className="grid grid-cols-2 gap-px overflow-hidden bg-line md:grid-cols-4">
          <Stat className="bg-white" label="Marge réelle moyenne" value={`${Math.round(avgMargin)} %`} hero sub={`prévue ${Math.round(avgPlanned)} % au devis`} />
          <Stat className="bg-white" label="En cours" value={money(inProgressAmount, true)} sub={`${active.length} chantiers HT`} />
          <Stat className="bg-white" label="Reste à produire" value={money(active.reduce((s, v) => s + v.ch.budgetHt * (1 - v.ch.progress / 100), 0), true)} sub="sur les chantiers en cours" />
          <Stat className="bg-white" label="À surveiller" value={String(watch.length)} sub={watch.length ? watch.map((w) => w.client?.name.split(' ').slice(-1)[0]).join(', ') : 'tout est dans les clous'} />
        </Card>
      )}

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'actifs', label: 'Actifs', count: count('actifs') },
            { value: 'en_cours', label: 'En cours', count: count('en_cours') },
            { value: 'a_planifier', label: 'À planifier', count: count('a_planifier') },
            { value: 'en_pause', label: 'En pause', count: count('en_pause') },
            { value: 'reception', label: 'Réception', count: count('reception') },
            { value: 'termine', label: 'Terminés', count: count('termine') },
            { value: 'tous', label: 'Tous', count: count('tous') },
          ]}
        />
        <Input icon={<Search />} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher un chantier, un client, une ville" className="md:w-80" />
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
      ) : view === 'liste' ? (
        <ChantierTable rows={rows} />
      ) : (
        <ChantierMap rows={rows} />
      )}

      <NewChantierSheet open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}
