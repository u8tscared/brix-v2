import { useMemo, useState } from 'react';
import { Inbox, Plus } from 'lucide-react';
import { Button, cn, EmptyState, PageHeader, Segmented, Stat } from '@/components/ui';
import { money } from '@/lib/format';
import { useBrix } from '@/lib/store';
import type { Lead } from '@/lib/types';
import { LeadCard } from './components/LeadCard';
import { StatStrip } from './components/StatStrip';
import { LeadSheet } from './components/LeadSheet';
import { NewLeadSheet } from './components/NewLeadSheet';
import { LEAD_FLOW, LEAD_SOURCE, LEAD_STATUS } from './lib';

type Filter = 'actives' | Lead['status'];

export default function Demandes() {
  const leads = useBrix((s) => s.leads);
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [source, setSource] = useState<'all' | Lead['source']>('all');
  const [filter, setFilter] = useState<Filter>('actives');
  const [showLost, setShowLost] = useState(false);

  const visible = useMemo(() => leads.filter((l) => source === 'all' || l.source === source).sort((a, b) => b.receivedAt.localeCompare(a.receivedAt) || (b.score ?? 0) - (a.score ?? 0)), [leads, source]);
  const open = leads.find((l) => l.id === openId) ?? null;
  const active = leads.filter((l) => !['perdu', 'gagne'].includes(l.status));
  const fresh = leads.filter((l) => l.status === 'nouveau').length;
  const potential = active.reduce((a, l) => a + (l.estimate ?? 0), 0);
  const won = leads.filter((l) => l.status === 'gagne' || l.status === 'devis').length;
  const rate = leads.length ? Math.round((won / leads.length) * 100) : 0;
  const sources = Object.keys(LEAD_SOURCE).filter((k) => leads.some((l) => l.source === k)) as Lead['source'][];

  const mobileList = visible.filter((l) => (filter === 'actives' ? !['perdu', 'gagne'].includes(l.status) : l.status === filter));
  const columns: Lead['status'][] = showLost ? [...LEAD_FLOW, 'perdu'] : LEAD_FLOW;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Demandes"
        subtitle="Site, téléphone, WhatsApp, plateformes : tout arrive ici, Bob trie et estime."
        actions={<Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>Nouvelle demande</Button>}
      />

      <StatStrip>
        <Stat label="CA possible en cours" value={money(potential, true)} hero sub={`${active.length} demandes ouvertes`} />
        <Stat label="À rappeler" value={fresh} sub={fresh ? 'Rappeler dans l\'heure double les chances' : 'Tout le monde a été rappelé'} />
        <Stat label="Transformées en devis" value={`${rate} %`} sub="sur les 30 derniers jours" />
        <Stat label="Temps de réponse" value="38 min" sub="Bob répond la nuit à votre place" />
      </StatStrip>

      <div className="flex flex-wrap items-center gap-2">
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 scrollbar-none md:mx-0 md:px-0">
          <SourceChip active={source === 'all'} onClick={() => setSource('all')} label="Toutes" count={leads.length} />
          {sources.map((k) => {
            const S = LEAD_SOURCE[k];
            return <SourceChip key={k} active={source === k} onClick={() => setSource(k)} label={S.label} icon={<S.icon className="h-3.5 w-3.5" strokeWidth={1.75} />} count={leads.filter((l) => l.source === k).length} />;
          })}
        </div>
        <div className="flex-1" />
        <button onClick={() => setShowLost((v) => !v)} className="hidden h-8 rounded-lg px-2.5 text-[12.5px] font-medium text-ink-2 hover:bg-white hover:text-ink lg:block">
          {showLost ? 'Masquer les perdues' : 'Voir les perdues'}
        </button>
      </div>

      {leads.length === 0 ? (
        <EmptyState icon={<Inbox />} title="Aucune demande pour l'instant" text="Reliez votre site, votre numéro et Habitatpresto : chaque demande arrivera ici, déjà triée par Bob." action={<Button variant="primary" onClick={() => setCreating(true)}>Ajouter une demande</Button>} />
      ) : (
        <>
          {/* Téléphone et tablette : liste filtrée par étape */}
          <div className="space-y-3 lg:hidden">
            <Segmented
              value={filter}
              onChange={setFilter}
              className="w-full"
              options={[{ value: 'actives' as Filter, label: 'En cours', count: visible.filter((l) => !['perdu', 'gagne'].includes(l.status)).length }, ...(['nouveau', 'rdv', 'devis', 'gagne', 'perdu'] as Lead['status'][]).map((st) => ({ value: st as Filter, label: LEAD_STATUS[st].label, count: visible.filter((l) => l.status === st).length }))]}
            />
            {mobileList.length ? (
              <div className="grid gap-2.5 md:grid-cols-2 stagger">
                {mobileList.map((l) => <LeadCard key={l.id} lead={l} onOpen={() => setOpenId(l.id)} />)}
              </div>
            ) : (
              <EmptyState title="Rien ici" text="Aucune demande à cette étape." />
            )}
          </div>

          {/* Ordinateur : colonnes */}
          <div className={cn('hidden gap-3 lg:grid', showLost ? 'grid-cols-6' : 'grid-cols-5')}>
            {columns.map((st) => {
              const items = visible.filter((l) => l.status === st);
              const sum = items.reduce((a, l) => a + (l.estimate ?? 0), 0);
              return (
                <div key={st} className="flex min-w-0 flex-col rounded-[14px] bg-[#ecebf4]/60 p-2">
                  <div className="flex items-center gap-2 px-1.5 pb-2 pt-1">
                    <span className="text-[13px] font-semibold">{LEAD_STATUS[st].label}</span>
                    <span className="text-[12px] text-ink-3">{items.length}</span>
                    <div className="flex-1" />
                    {sum > 0 && <span className="num text-[11.5px] text-ink-3">{money(sum, true)}</span>}
                  </div>
                  <div className="flex flex-col gap-2">
                    {items.map((l) => <LeadCard key={l.id} lead={l} compact onOpen={() => setOpenId(l.id)} />)}
                    {!items.length && <div className="rounded-xl border border-dashed border-line2 px-3 py-6 text-center text-[12px] text-ink-3">{LEAD_STATUS[st].hint}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <LeadSheet lead={open} onClose={() => setOpenId(null)} />
      <NewLeadSheet open={creating} onClose={() => setCreating(false)} onCreated={(l) => setOpenId(l.id)} />
    </div>
  );
}

function SourceChip({ active, onClick, label, icon, count }: { active: boolean; onClick: () => void; label: string; icon?: React.ReactNode; count: number }) {
  return (
    <button onClick={onClick} className={cn('flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-medium transition', active ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink-2 hover:text-ink')}>
      {icon}
      {label}
      <span className={cn('text-[11px]', active ? 'text-white/70' : 'text-ink-3')}>{count}</span>
    </button>
  );
}
