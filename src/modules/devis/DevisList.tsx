import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Phone, Plus, Search } from 'lucide-react';
import { Button, EmptyState, Input, PageHeader, Segmented, Select, toast } from '@/components/ui';
import { totals } from '@/lib/format';
import { useBrix } from '@/lib/store';
import type { Devis } from '@/lib/types';
import { DevisCard, DevisRow, ROW_GRID } from './components/list/DevisItem';
import { Pipeline, type Stage, type StageKey } from './components/list/Pipeline';
import { signatureScore } from './logic';
import { remindClient } from './service';
import { defaultMeta, useDevisMeta } from './store';
import { useMediaQuery } from '@/components/layout/useMediaQuery';

type Filter = StageKey | 'tous' | 'relancer';
type Sort = 'recent' | 'montant' | 'proba';

const STAGES: { key: StageKey; label: string; color: string; match: (d: Devis) => boolean }[] = [
  { key: 'brouillon', label: 'Brouillons', color: '#c9c9d6', match: (d) => d.status === 'brouillon' },
  { key: 'envoye', label: 'Envoyés', color: '#1f389d', match: (d) => d.status === 'envoye' },
  { key: 'vu', label: 'Vus', color: '#8b5cf6', match: (d) => d.status === 'vu' },
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

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || /input|textarea|select/i.test(t.tagName) || t.isContentEditable) return;
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        navigate('/app/devis/nouveau');
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [navigate]);

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
  const pending = rows.filter((r) => r.d.status === 'envoye' || r.d.status === 'vu').reduce((a, r) => a + r.ttc, 0);
  const toRemind = rows.filter((r) => r.d.status === 'envoye' || r.d.status === 'vu');
  const hot = rows.filter((r) => r.d.status === 'vu' && (r.d.views ?? 0) >= 2).sort((a, b) => (b.d.viewedAt ?? '').localeCompare(a.d.viewedAt ?? ''))[0];

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    let l = rows.filter((r) => {
      if (filter === 'relancer' && !(r.d.status === 'envoye' || r.d.status === 'vu')) return false;
      if (filter !== 'tous' && filter !== 'relancer' && !STAGES.find((s) => s.key === filter)!.match(r.d)) return false;
      if (!term) return true;
      return `${r.d.number} ${r.d.title} ${r.client?.name ?? ''} ${r.client?.city ?? ''}`.toLowerCase().includes(term);
    });
    l = l.slice().sort((a, b) => (sort === 'montant' ? b.ttc - a.ttc : sort === 'proba' ? b.score.value - a.score.value : (b.d.createdAt + b.d.number).localeCompare(a.d.createdAt + a.d.number)));
    return l;
  }, [rows, q, filter, sort]);

  const remind = async (d: Devis) => {
    const client = clients.find((c) => c.id === d.clientId);
    const meta = metaAll[d.id] ?? defaultMeta();
    setBusy(d.id);
    await remindClient(d, client, meta.channel);
    patch(d.id, { reminders: meta.reminders + 1, lastReminderAt: new Date().toISOString() });
    log(d.id, `Relance envoyée par ${meta.channel === 'email' ? 'e-mail' : meta.channel === 'sms' ? 'SMS' : 'WhatsApp'}`, 'me');
    setBusy(null);
    toast(`Relance envoyée à ${client?.name ?? 'votre client'} (démo)`);
  };

  const filters: { value: Filter; label: string; count?: number }[] = [
    { value: 'tous', label: 'Tous', count: rows.length },
    { value: 'relancer', label: 'À relancer', count: toRemind.length },
    ...stages.map((s) => ({ value: s.key as Filter, label: s.label, count: s.count })),
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Devis"
        subtitle={`${toRemind.length} en attente de réponse${phone ? '' : ' · tapez N pour un nouveau devis'}`}
        actions={
          <Button variant="dawn" size={phone ? 'lg' : 'md'} icon={<Plus className="h-4 w-4" />} kbd="N" onClick={() => navigate('/app/devis/nouveau')} className="max-sm:w-full max-sm:justify-center">
            Nouveau devis
          </Button>
        }
      />

      <Pipeline stages={stages} active={filter} onPick={(k) => setFilter(k)} rate={rate} pending={pending} />

      {hot?.client && (
        <div className="flex flex-col gap-3 rounded-[14px] border border-vi-100 bg-vi-50/60 px-4 py-3 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink text-[10px] font-bold text-white">Bob</span>
            <p className="text-[13.5px] leading-snug text-ink">
              <b className="font-semibold">{hot.client.name}</b> a ouvert son devis {hot.d.views} fois, la dernière {activityAgo(hot.d.viewedAt)}. C'est le bon moment pour l'appeler : {hot.score.value} % de chances de signer.
            </p>
          </div>
          <div className="flex shrink-0 gap-2 pl-10 sm:pl-0">
            <a href={`tel:${hot.client.phone.replace(/\s/g, '')}`} className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-ink px-4 text-sm font-medium text-white sm:h-8 sm:px-3 sm:text-[13px]">
              <Phone className="h-3.5 w-3.5" /> Appeler
            </a>
            <Button size="sm" variant="secondary" className="max-sm:h-10" onClick={() => navigate(`/app/devis/${hot.d.id}`)}>
              Ouvrir le devis
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex flex-col gap-2.5 md:flex-row md:items-center">
          <Input icon={<Search />} placeholder="Rechercher un client, un numéro, un chantier…" value={q} onChange={(e) => setQ(e.target.value)} className="md:flex-1" aria-label="Rechercher un devis" />
          <Select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="h-11 md:w-[210px]" aria-label="Trier">
            <option value="recent">Plus récents</option>
            <option value="montant">Montant le plus élevé</option>
            <option value="proba">Plus probables d'abord</option>
          </Select>
        </div>
        <Segmented value={filter} onChange={setFilter} options={filters} className="w-full md:w-auto" />

        {list.length === 0 ? (
          <EmptyState
            icon={<FileText />}
            title={rows.length ? 'Aucun devis ne correspond' : 'Votre premier devis en 2 minutes'}
            text={rows.length ? 'Essayez un autre mot ou retirez le filtre.' : 'Dictez-le à Bob ou piochez dans la bibliothèque de prix : les lots, la TVA et les mentions légales se font tout seuls.'}
            action={
              rows.length ? (
                <Button onClick={() => { setQ(''); setFilter('tous'); }}>Tout afficher</Button>
              ) : (
                <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => navigate('/app/devis/nouveau')}>Créer un devis</Button>
              )
            }
          />
        ) : phone ? (
          <div className="space-y-2.5 stagger">
            {list.map((r) => (
              <DevisCard key={r.d.id} {...r} onOpen={() => navigate(`/app/devis/${r.d.id}`)} onRemind={r.d.status === 'envoye' || r.d.status === 'vu' ? () => remind(r.d) : undefined} reminding={busy === r.d.id} />
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-[14px] border border-line bg-white">
            <div className={`grid gap-4 border-b border-line bg-[#fafafc] px-4 py-2 text-[11.5px] font-medium text-ink-3 ${ROW_GRID}`}>
              <span title="Probabilité de signature">Proba.</span>
              <span>Client et devis</span>
              <span>Statut et activité</span>
              <span className="text-right">Montant TTC</span>
              <span />
            </div>
            {list.map((r) => (
              <DevisRow key={r.d.id} {...r} onOpen={() => navigate(`/app/devis/${r.d.id}`)} onRemind={r.d.status === 'envoye' || r.d.status === 'vu' ? () => remind(r.d) : undefined} reminding={busy === r.d.id} />
            ))}
          </div>
        )}
        {list.length > 0 && (
          <p className="px-1 text-[12px] text-ink-3">La probabilité de signature tient compte du montant, du délai depuis l'envoi, du nombre d'ouvertures et de votre historique avec le client.</p>
        )}
      </div>
    </div>
  );
}

function activityAgo(iso?: string) {
  if (!iso) return 'récemment';
  if (iso.length <= 10) return iso.slice(0, 10) === new Date().toISOString().slice(0, 10) ? "aujourd'hui" : 'récemment';
  const h = Math.round((Date.now() - new Date(iso).getTime()) / 3600000);
  return h < 1 ? "à l'instant" : h < 24 ? `il y a ${h} h` : 'récemment';
}
