import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronRight, Contact, Download, Phone, Plus, Search } from 'lucide-react';
import { Avatar, Badge, Button, Card, EmptyState, Input, PageHeader, Segmented } from '@/components/ui';
import { initials, money, relative } from '@/lib/format';
import { useBrix } from '@/lib/store';
import { ClientFormSheet } from './components/ClientFormSheet';
import { ImportSheet } from './components/ImportSheet';
import { clientColor, clientStats, telHref } from './lib';

type Kind = 'tous' | 'particulier' | 'pro';
type Sort = 'recent' | 'ca' | 'nom';


export default function Clients() {
  const s = useBrix();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<Kind>('tous');
  const [sort, setSort] = useState<Sort>('recent');
  const [importing, setImporting] = useState(false);
  const creating = params.get('nouveau') === '1';
  const setCreating = (v: boolean) => setParams(v ? { nouveau: '1' } : {}, { replace: true });

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return s.clients
      .filter((c) => kind === 'tous' || c.kind === kind)
      .filter((c) => !needle || [c.name, c.contact, c.city, c.phone, c.email, ...c.tags].join(' ').toLowerCase().includes(needle))
      .map((c) => ({ c, st: clientStats(s, c.id) }))
      .sort((a, b) => (sort === 'ca' ? b.st.caHt - a.st.caHt : sort === 'nom' ? a.c.name.localeCompare(b.c.name) : (b.st.lastActivity ?? b.c.createdAt).localeCompare(a.st.lastActivity ?? a.c.createdAt)));
  }, [s.clients, s.devis, s.factures, q, kind, sort]);

  const pros = s.clients.filter((c) => c.kind === 'pro').length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Clients"
        subtitle={`${s.clients.length} clients · ${pros} professionnels`}
        actions={
          <>
            <Button icon={<Download className="h-4 w-4" />} onClick={() => setImporting(true)}>Importer</Button>
            <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>Nouveau client</Button>
          </>
        }
      />

      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <Input className="md:max-w-sm md:flex-1" icon={<Search />} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, ville, téléphone…" />
        <Segmented value={kind} onChange={setKind} options={[{ value: 'tous', label: 'Tous', count: s.clients.length }, { value: 'particulier', label: 'Particuliers' }, { value: 'pro', label: 'Pros' }]} />
        <div className="hidden flex-1 md:block" />
        <Segmented size="sm" value={sort} onChange={setSort} className="hidden md:inline-flex" options={[{ value: 'recent', label: 'Récents' }, { value: 'ca', label: 'Chiffre d\'affaires' }, { value: 'nom', label: 'A → Z' }]} />
      </div>

      {s.clients.length === 0 ? (
        <EmptyState icon={<Contact />} title="Votre carnet est vide" text="Importez les contacts de votre téléphone ou de votre ancien logiciel en une minute." action={<Button variant="primary" onClick={() => setImporting(true)}>Importer mes contacts</Button>} />
      ) : rows.length === 0 ? (
        <EmptyState icon={<Search />} title="Personne ne correspond" text="Essayez avec un autre nom ou une ville." />
      ) : (
        <Card className="overflow-hidden">
          <div className="hidden h-10 items-center gap-3 border-b border-line bg-sub/50 px-4 text-[11.5px] font-medium uppercase tracking-wide text-ink-3 md:flex">
            <span className="flex-1">Client</span>
            <span className="w-40 lg:w-52">En cours</span>
            <span className="w-28 text-right">CA HT</span>
            <span className="hidden w-28 text-right lg:block">Dernier contact</span>
            <span className="w-14" />
          </div>
          {rows.map(({ c, st }) => {
            const open = st.devis.filter((d) => ['envoye', 'vu'].includes(d.status)).length;
            const live = st.chantiers.filter((x) => x.status === 'en_cours').length;
            return (
              <div key={c.id} onClick={() => navigate(`/app/clients/${c.id}`)} className="flex min-h-[64px] cursor-pointer items-center gap-3 border-b border-line px-4 py-2.5 transition last:border-b-0 hover:bg-[#fafafc]">
                <Avatar initials={initials(c.name)} color={clientColor(c.id)} size={38} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[14px] font-semibold">{c.name}</span>
                    {c.kind === 'pro' && <Badge tone="info">Pro</Badge>}
                  </div>
                  <div className="truncate text-[12.5px] text-ink-3">{[c.contact, c.city].filter(Boolean).join(' · ')}</div>
                  <div className="mt-1 flex flex-wrap gap-1 md:hidden">
                    {st.late.length > 0 && <Badge tone="bad">{st.late.length} en retard</Badge>}
                    {live > 0 && <Badge tone="violet">Chantier en cours</Badge>}
                    {open > 0 && <Badge tone="info">{open} devis en attente</Badge>}
                  </div>
                </div>
                <div className="hidden w-40 flex-wrap gap-1 md:flex lg:w-52">
                  {st.late.length > 0 && <Badge tone="bad">{st.late.length} en retard</Badge>}
                  {live > 0 && <Badge tone="violet">Chantier en cours</Badge>}
                  {open > 0 && <Badge tone="info">{open} devis en attente</Badge>}
                  {!st.late.length && !live && !open && <span className="text-[12.5px] text-ink-3">—</span>}
                </div>
                <div className="num hidden w-28 text-right text-[13.5px] font-semibold md:block">{st.caHt ? money(st.caHt, true) : <span className="font-normal text-ink-3">—</span>}</div>
                <div className="hidden w-28 text-right text-[12.5px] text-ink-2 lg:block">{relative(st.lastActivity ?? c.createdAt)}</div>
                <a href={telHref(c.phone)} onClick={(e) => e.stopPropagation()} aria-label={`Appeler ${c.name}`} className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink-2 transition hover:bg-vi-50 hover:text-vi-700 md:h-9 md:w-9">
                  <Phone className="h-[18px] w-[18px]" strokeWidth={1.75} />
                </a>
                <ChevronRight className="hidden h-4 w-4 text-ink-3 md:block" />
              </div>
            );
          })}
        </Card>
      )}

      <ClientFormSheet open={creating} onClose={() => setCreating(false)} onSaved={(c) => navigate(`/app/clients/${c.id}`)} />
      <ImportSheet open={importing} onClose={() => setImporting(false)} />
    </div>
  );
}
