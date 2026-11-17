import { relancerDevis } from '@/parcours/signature';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, FileText, Phone, Plus, Search } from 'lucide-react';
import { Button, EmptyState, IconTile, Input, PageHeader, Segmented, Select, toast } from '@/components/ui';
import { LiveDot } from '@/components/motion';
import { useMediaQuery } from '@/components/layout/useMediaQuery';
import { totals } from '@/lib/format';
import { useBrix } from '@/lib/store';
import type { Devis } from '@/lib/types';
import { DevisCard, DevisRow, ROW_GRID } from './components/list/DevisItem';
import { DevisPreview } from './components/list/DevisPreview';
import { Pipeline, type Stage, type StageKey } from './components/list/Pipeline';
import { signatureScore } from './logic';
import { remindClient } from './service';
import { defaultMeta, useDevisMeta } from './store';

type Filter = StageKey | 'tous' | 'relancer';
type Sort = 'recent' | 'montant' | 'proba';

const STAGES: { key: StageKey; label: string; color: string; match: (d: Devis) => boolean }[] = [
  { key: 'brouillon', label: 'Brouillons', color: '#cfcbdd', match: (d) => d.status === 'brouillon' },
  { key: 'envoye', label: 'Envoyés', color: '#6366f1', match: (d) => d.status === 'envoye' },
  { key: 'vu', label: 'Vus', color: '#c026d3', match: (d) => d.status === 'vu' },
  { key: 'signe', label: 'Signés', color: '#16a34a', match: (d) => d.status === 'signe' },
  { key: 'refuse', label: 'Refusés', color: '#f87171', match: (d) => d.status === 'refuse' || d.status === 'expire' },
];

export default function DevisList() {
  const navigate = useNavigate();
  const devis = useBrix((s) => s.devis);
  const clients = useBrix((s) => s.clients);
  const metaAll = useDevisMeta((s) => s.meta);
  const { patch, log } = useDevisMeta();
  const phone = !useMediaQuery('(min-width: 768px)');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('tous');
  const [sort, setSort] = useState<Sort>('recent');
  const [busy, setBusy] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // Raccourci N : géré globalement par la barre du haut.

  const rows = useMemo(
    () =>
      devis.map((d) => {
        const client = clients.find((c) => c.id === d.clientId);
        return { d, client, ttc: totals(d.lines).ttc, score: signatureScore(d, client), meta: metaAll[d.id] ?? defaultMeta() };
      }),
    [devis, clients, metaAll],
  );

  const stages: Stage[] = STAGES.map((s) => {
    const list = rows.filter((r) => s.match(r.d));
    return { key: s.key, label: s.label, color: s.color, count: list.length, amount: list.reduce((a, r) => a + r.ttc, 0) };
  });
  const decided = rows.filter((r) => ['signe', 'refuse', 'expire'].includes(r.d.status));
  const rate = decided.length ? (rows.filter((r) => r.d.status === 'signe').length / decided.length) * 100 : 0;
  const toRemind = rows.filter((r) => r.d.status === 'envoye' || r.d.status === 'vu');
  const pending = toRemind.reduce((a, r) => a + r.ttc, 0);
  const hot = rows.filter((r) => r.d.status === 'vu' && (r.d.views ?? 0) >= 2).sort((a, b) => (b.d.viewedAt ?? '').localeCompare(a.d.viewedAt ?? ''))[0];

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    const l = rows.filter((r) => {
      if (filter === 'relancer' && !(r.d.status === 'envoye' || r.d.status === 'vu')) return false;
      if (filter !== 'tous' && filter !== 'relancer' && !STAGES.find((s) => s.key === filter)!.match(r.d)) return false;
      if (!term) return true;
      return `${r.d.number} ${r.d.title} ${r.client?.name ?? ''} ${r.client?.city ?? ''}`.toLowerCase().includes(term);
    });
    return l.sort((a, b) => (sort === 'montant' ? b.ttc - a.ttc : sort === 'proba' ? b.score.value - a.score.value : (b.d.createdAt + b.d.number).localeCompare(a.d.createdAt + a.d.number)));
  }, [rows, q, filter, sort]);

  const remind = async (d: Devis) => {
    const client = clients.find((c) => c.id === d.clientId);
    const meta = metaAll[d.id] ?? defaultMeta();
    setBusy(d.id);
    await remindClient(d, client, meta.channel);
    patch(d.id, { reminders: meta.reminders + 1, lastReminderAt: new Date().toISOString() });
    relancerDevis(d.id, meta.reminders + 1);
    log(d.id, `Relance envoyée par ${meta.channel === 'email' ? 'e-mail' : meta.channel === 'sms' ? 'SMS' : 'WhatsApp'}`, 'me');
    setBusy(null);
    toast(`Relance envoyée à ${client?.name ?? 'votre client'}`);
  };

  const filters: { value: Filter; label: string; count?: number }[] = [
    { value: 'tous', label: 'Tous', count: rows.length },
    { value: 'relancer', label: 'À relancer', count: toRemind.length },
    ...stages.map((s) => ({ value: s.key as Filter, label: s.label, count: s.count })),
  ];
  const itemProps = (r: (typeof list)[number]) => ({
    ...r,
    onOpen: () => navigate(`/app/devis/${r.d.id}`),
    onPreview: () => setPreview(r.d.id),
    onRemind: r.d.status === 'envoye' || r.d.status === 'vu' ? () => remind(r.d) : undefined,
    reminding: busy === r.d.id,
  });

  return (
    <div className="space-y-5">
      <PageHeader
        icon={<IconTile name="FileText" dept="vendre" size="lg" />}
        title="Devis"
        subtitle={toRemind.length ? `${toRemind.length} devis attendent une réponse de vos clients.` : 'Tous vos devis ont reçu une réponse.'}
        actions={
          <Button variant="primary" size={phone ? 'lg' : 'md'} icon={<Plus className="h-4 w-4" />} onClick={() => navigate('/app/devis/nouveau')} className="max-sm:w-full max-sm:justify-center">
            Nouveau devis
          </Button>
        }
      />

      <div className="animate-[fade-up_.5s_var(--ease)_.05s_both]">
        <Pipeline stages={stages} active={filter} onPick={(k) => setFilter(k)} rate={rate} pending={pending} pendingCount={toRemind.length} />
      </div>

      {hot?.client && (
        <div className="flex animate-[fade-up_.5s_var(--ease)_.12s_both] flex-col gap-3 rounded-[16px] bg-night px-4 py-3.5 text-white shadow-ink sm:flex-row sm:items-center md:px-5">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <LiveDot tone="peach" className="mt-1.5" />
            <p className="text-[13.5px] leading-snug text-white/85">
              <b className="font-semibold text-white">{hot.client.name}</b> a ouvert son devis {hot.d.views} fois, la dernière {activityAgo(hot.d.viewedAt)}. C’est le bon moment pour l’appeler : <b className="font-semibold text-white">{hot.score.value} %</b> de chances de signer.
            </p>
          </div>
          <div className="flex shrink-0 gap-2 pl-5 sm:pl-0">
            <a href={`tel:${hot.client.phone.replace(/\s/g, '')}`} className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-white px-4 text-[13.5px] font-semibold text-ink transition hover:bg-white/90 sm:h-9 sm:px-3.5">
              <Phone className="h-3.5 w-3.5" /> Appeler
            </a>
            <button onClick={() => navigate(`/app/devis/${hot.d.id}`)} className="inline-flex h-11 items-center gap-1.5 rounded-[10px] px-3 text-[13.5px] font-medium text-white/85 transition hover:bg-white/10 hover:text-white sm:h-9">
              Voir le devis <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
          <Segmented value={filter} onChange={setFilter} options={filters} className="w-full lg:w-auto" />
          <div className="flex flex-1 gap-2">
            <Input icon={<Search />} placeholder="Client, numéro, chantier…" value={q} onChange={(e) => setQ(e.target.value)} className="min-w-0 flex-1" aria-label="Rechercher un devis" />
            <Select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="w-[150px] shrink-0 md:w-[190px]" aria-label="Trier">
              <option value="recent">Plus récents</option>
              <option value="montant">Plus gros montants</option>
              <option value="proba">Plus probables</option>
            </Select>
          </div>
        </div>

        {list.length === 0 ? (
          <EmptyState
            icon={<FileText />}
            title={rows.length ? 'Aucun devis ne correspond' : 'Votre premier devis en 2 minutes'}
            text={rows.length ? 'Essayez un autre mot ou retirez le filtre.' : 'Dictez-le à Bob ou piochez dans la bibliothèque de prix : les lots, la TVA et les mentions légales se font tout seuls.'}
            action={
              rows.length ? (
                <Button onClick={() => (setQ(''), setFilter('tous'))}>Tout afficher</Button>
              ) : (
                <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => navigate('/app/devis/nouveau')}>
                  Créer un devis
                </Button>
              )
            }
          />
        ) : phone ? (
          <div key={filter} className="stagger-fast space-y-2.5">
            {list.map((r) => (
              <DevisCard key={r.d.id} {...itemProps(r)} />
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-[18px] bg-white shadow-card">
            <div className={`grid gap-4 border-b border-line px-5 py-2.5 text-[11.5px] font-medium text-ink-3 ${ROW_GRID}`}>
              <span title="Probabilité de signature">Chances</span>
              <span>Client et devis</span>
              <span>Où en est-il</span>
              <span className="text-right">Montant TTC</span>
              <span />
            </div>
            <div key={filter + sort} className="stagger-fast">
              {list.map((r) => (
                <DevisRow key={r.d.id} {...itemProps(r)} />
              ))}
            </div>
          </div>
        )}
        {list.length > 0 && <p className="px-1 text-[12px] leading-relaxed text-ink-3">Les chances de signature tiennent compte du montant, du délai depuis l’envoi, des ouvertures et de votre historique avec le client.</p>}
      </div>

      <DevisPreview id={preview} onClose={() => setPreview(null)} />
    </div>
  );
}

function activityAgo(iso?: string) {
  if (!iso) return 'récemment';
  if (iso.length <= 10) return iso.slice(0, 10) === new Date().toISOString().slice(0, 10) ? "aujourd'hui" : 'récemment';
  const h = Math.round((Date.now() - new Date(iso).getTime()) / 3600000);
  return h < 1 ? "à l'instant" : h < 24 ? `il y a ${h} h` : 'récemment';
}
