import { useMemo, useState } from 'react';
import { Inbox, Plus } from 'lucide-react';
import { Button, cn, EmptyState, HALO_TONE, IconTile, PageHeader, Segmented, toast, type HaloTone } from '@/components/ui';
import { KpiBand } from '@/modules/chantiers/components/common/KpiBand';
import { useLeadActions } from './components/useLeadActions';
import { money } from '@/lib/format';
import { useBrix } from '@/lib/store';
import type { Lead } from '@/lib/types';
import { LeadCard } from './components/LeadCard';
import { LeadSheet } from './components/LeadSheet';
import { NewLeadSheet } from './components/NewLeadSheet';
import { LEAD_FLOW, LEAD_SOURCE, LEAD_SOURCE_TONE, LEAD_STATUS } from './lib';

type Filter = 'actives' | Lead['status'];

const STAGE_DOT: Record<Lead['status'], string> = { nouveau: '#d946ef', qualifie: '#7c3aed', rdv: '#fb923c', devis: '#3b82f6', gagne: '#10b981', perdu: '#9794aa' };

export default function Demandes() {
  const leads = useBrix((s) => s.leads);
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [source, setSource] = useState<'all' | Lead['source']>('all');
  const [filter, setFilter] = useState<Filter>('actives');
  const [showLost, setShowLost] = useState(false);
  const [moved, setMoved] = useState<string | null>(null);
  const { prepareDevis, setStatus } = useLeadActions();
  const nextOf = (l: Lead) => LEAD_FLOW[LEAD_FLOW.indexOf(l.status) + 1];
  const advance = (l: Lead) => {
    const next = nextOf(l);
    if (!next) return;
    if (next === 'devis') return prepareDevis(l);
    setStatus(l, next);
    setMoved(l.id);
    setTimeout(() => setMoved((m) => (m === l.id ? null : m)), 900);
    toast(`${l.name} passe en « ${LEAD_STATUS[next].label} »`, 'ok', { label: 'Annuler', run: () => setStatus(l, l.status) });
  };

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
    <div className="space-y-6">
      <PageHeader
        icon={<IconTile name="Inbox" dept="vendre" size="lg" />}
        title="Demandes"
        titleMuted="triées par Bob."
        subtitle="Site, téléphone, WhatsApp, plateformes : tout arrive ici, Bob trie et estime."
        actions={<Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>Nouvelle demande</Button>}
      />

      <KpiBand
        hero={{ label: 'Chiffre possible en cours', value: potential, format: (n) => money(n, true), sub: `${active.length} demande${active.length > 1 ? 's' : ''} ouverte${active.length > 1 ? 's' : ''}` }}
        items={[
          { label: 'À rappeler', value: fresh, tone: fresh ? 'warn' : 'ok', sub: fresh ? "Rappeler dans l'heure double les chances" : 'Tout le monde a été rappelé' },
          { label: 'Devenues devis', value: rate, format: (n) => `${Math.round(n)} %`, sub: 'sur 30 jours' },
          { label: 'Temps de réponse', value: '38 min', sub: 'Bob répond la nuit' },
        ]}
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="-mx-4 -my-2 flex gap-2 overflow-x-auto px-4 py-2 scrollbar-none md:mx-0 md:px-0">
          <SourceChip active={source === 'all'} onClick={() => setSource('all')} label="Toutes" count={leads.length} />
          {sources.map((k) => {
            const S = LEAD_SOURCE[k];
            return <SourceChip key={k} active={source === k} onClick={() => setSource(k)} label={S.label} tone={LEAD_SOURCE_TONE[k]} icon={<S.icon className="h-3.5 w-3.5" strokeWidth={1.9} />} count={leads.filter((l) => l.source === k).length} />;
          })}
        </div>
        <div className="flex-1" />
        <button onClick={() => setShowLost((v) => !v)} className="hidden h-9 rounded-full px-3.5 text-[12.5px] font-medium text-ink-2 transition-colors hover:bg-white hover:text-ink hover:shadow-pill lg:block">
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
                {mobileList.map((l) => <LeadCard key={l.id} lead={l} highlight={moved === l.id} onOpen={() => setOpenId(l.id)} />)}
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
                <div key={st} className="flex min-w-0 flex-col rounded-card bg-white/40 p-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,.7)] backdrop-blur-sm">
                  <div className="flex items-center gap-2 px-2 pb-2.5 pt-1.5">
                    <i className="h-2 w-2 shrink-0 rounded-full" style={{ background: STAGE_DOT[st], boxShadow: `0 0 0 3px ${STAGE_DOT[st]}22` }} />
                    <span className="truncate text-[13px] font-semibold tracking-[-0.01em]">{LEAD_STATUS[st].label}</span>
                    <span className="num inline-grid h-5 min-w-5 place-items-center rounded-full bg-white px-1.5 text-[11px] font-medium text-ink-2 shadow-halo-sm">{items.length}</span>
                    <div className="flex-1" />
                    {sum > 0 && <span className="num hidden whitespace-nowrap text-[11.5px] text-ink-3 2xl:inline">{money(sum, true)}</span>}
                  </div>
                  <div className="stagger-fast flex flex-col gap-2">
                    {items.map((l) => <LeadCard key={l.id} lead={l} compact highlight={moved === l.id} onOpen={() => setOpenId(l.id)} onDevis={() => prepareDevis(l)} onAdvance={nextOf(l) ? () => advance(l) : undefined} nextLabel={nextOf(l) ? LEAD_STATUS[nextOf(l)].label : undefined} />)}
                    {!items.length && <div className="rounded-card-sm border-[1.5px] border-dashed border-[#e0d8f0] px-3 py-6 text-center text-[12px] text-ink-3">{LEAD_STATUS[st].hint}</div>}
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

function SourceChip({ active, onClick, label, icon, tone, count }: { active: boolean; onClick: () => void; label: string; icon?: React.ReactNode; tone?: HaloTone; count: number }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn('flex h-10 shrink-0 items-center gap-2 rounded-full pr-3.5 text-[12.5px] font-medium transition-[background,box-shadow,color,transform] duration-300 ease-spring active:scale-95', icon ? 'pl-1.5' : 'pl-3.5', active ? 'bg-ink text-white shadow-ink' : 'bg-white text-ink-2 shadow-halo-sm hover:-translate-y-px hover:text-ink')}
    >
      {icon && tone && <span className="grid h-7 w-7 place-items-center rounded-full" style={{ background: HALO_TONE[tone].bg, color: HALO_TONE[tone].fg }}>{icon}</span>}
      {label}
      <span className={cn('num text-[11px]', active ? 'text-white/60' : 'text-ink-3')}>{count}</span>
    </button>
  );
}
