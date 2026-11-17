import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, FilePlus2, FileSignature, Plus, ReceiptText, Search } from 'lucide-react';
import { Button, Card, EmptyState, Input, PageHeader, Segmented, cn } from '@/components/ui';
import { capitalize, money, monthName, todayISO } from '@/lib/format';
import { useBrix } from '@/lib/store';
import type { Facture } from '@/lib/types';
import { DueText, EDot, KindBadge, StatusBadge } from './components/bits';
import { CreateFromDevisSheet } from './components/CreateFromDevisSheet';
import { amounts, daysLate, dueLabel, liveStatus } from './lib/model';
import { allPayments, useFactures } from './store';

type Filter = 'toutes' | 'a_encaisser' | 'en_retard' | 'payees' | 'brouillons';

export default function FacturesList() {
  const navigate = useNavigate();
  const factures = useBrix((s) => s.factures);
  const clients = useBrix((s) => s.clients);
  const payments = useFactures((s) => s.payments);
  const [filter, setFilter] = useState<Filter>('toutes');
  const [q, setQ] = useState('');
  const [fromDevis, setFromDevis] = useState(false);
  const today = todayISO();

  const rows = useMemo(
    () =>
      factures.filter((f) => f.status !== 'annulee').map((f) => {
        const client = clients.find((c) => c.id === f.clientId);
        return { f, client, a: amounts(f), st: liveStatus(f, today), due: dueLabel(f, today) };
      }),
    [factures, clients, today],
  );

  const month = today.slice(0, 7);
  const monthPayments = allPayments(factures, payments).filter((p) => p.date.startsWith(month));
  const cashed = monthPayments.reduce((s, p) => s + p.amount, 0);
  const pending = rows.filter((r) => r.st === 'emise' || r.st === 'envoyee' || r.st === 'partielle');
  const late = rows.filter((r) => r.st === 'en_retard');
  const sum = (list: typeof rows) => list.reduce((s, r) => s + r.a.remaining, 0);

  const counts: Record<Filter, number> = {
    toutes: rows.length,
    a_encaisser: pending.length + late.length,
    en_retard: late.length,
    payees: rows.filter((r) => r.st === 'payee').length,
    brouillons: rows.filter((r) => r.st === 'brouillon').length,
  };

  const needle = q.trim().toLowerCase();
  const visible = rows
    .filter((r) => {
      if (filter === 'a_encaisser') return r.a.remaining > 0 && r.st !== 'brouillon';
      if (filter === 'en_retard') return r.st === 'en_retard';
      if (filter === 'payees') return r.st === 'payee';
      if (filter === 'brouillons') return r.st === 'brouillon';
      return true;
    })
    .filter((r) => !needle || `${r.f.number} ${r.f.title} ${r.client?.name ?? ''}`.toLowerCase().includes(needle))
    .sort((x, y) => (filter === 'en_retard' ? daysLate(y.f) - daysLate(x.f) : y.f.issueDate.localeCompare(x.f.issueDate) || y.f.number.localeCompare(x.f.number)));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Factures"
        subtitle="Facturez, faites-vous payer et restez en règle avec la facture électronique."
        actions={
          <>
            <Button variant="secondary" icon={<FileSignature className="h-4 w-4" />} onClick={() => setFromDevis(true)} className="flex-1 sm:flex-none">
              Depuis un devis
            </Button>
            <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => navigate('/app/factures/nouvelle')} className="flex-1 sm:flex-none">
              Nouvelle facture
            </Button>
          </>
        }
      />

      <Card className="grid grid-cols-2 divide-line max-md:[&>*:first-child]:col-span-2 max-md:[&>*:first-child]:border-b md:grid-cols-3 md:divide-x">
        <div className="p-4">
          <div className="text-xs font-medium text-ink-2">Encaissé en {monthName().split(' ')[0]}</div>
          <div className="num mt-1.5 font-display text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] dawn-text">{money(cashed, true)}</div>
          <div className="mt-1 text-xs text-ink-2">
            {monthPayments.length} paiement{monthPayments.length > 1 ? 's' : ''} reçu{monthPayments.length > 1 ? 's' : ''}
          </div>
        </div>
        <button onClick={() => setFilter('a_encaisser')} className="min-w-0 p-4 text-left transition hover:bg-[#fafafc] max-md:border-r max-md:border-line">
          <div className="text-xs font-medium text-ink-2">À encaisser</div>
          <div className="num mt-1.5 text-[22px] font-semibold leading-tight tracking-[-0.02em]">{money(sum(pending), true)}</div>
          <div className="mt-1 text-xs text-ink-2">{pending.length} facture{pending.length > 1 ? 's' : ''} dans les temps</div>
        </button>
        <button onClick={() => setFilter('en_retard')} className="min-w-0 p-4 text-left transition hover:bg-[#fafafc]">
          <div className="text-xs font-medium text-ink-2">En retard</div>
          <div className={cn('num mt-1.5 text-[22px] font-semibold leading-tight tracking-[-0.02em]', late.length && 'text-bad')}>{money(sum(late), true)}</div>
          <div className="mt-1 flex items-center gap-1 text-xs text-ink-2">
            {late.length ? (
              <Link to="/app/relances" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 font-medium text-vi-700 hover:underline">
                {late.length} à relancer <ArrowRight className="h-3 w-3" />
              </Link>
            ) : (
              'Aucune facture en retard'
            )}
          </div>
        </button>
      </Card>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'toutes', label: 'Toutes', count: counts.toutes },
            { value: 'a_encaisser', label: 'À encaisser', count: counts.a_encaisser },
            { value: 'en_retard', label: 'En retard', count: counts.en_retard },
            { value: 'payees', label: 'Payées', count: counts.payees },
            { value: 'brouillons', label: 'Brouillons', count: counts.brouillons },
          ]}
        />
        <Input icon={<Search />} placeholder="Client, numéro, chantier…" value={q} onChange={(e) => setQ(e.target.value)} className="md:w-72" />
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={filter === 'en_retard' ? <ReceiptText /> : <FilePlus2 />}
          title={filter === 'en_retard' ? 'Aucune facture en retard' : needle ? 'Aucune facture trouvée' : 'Aucune facture ici'}
          text={filter === 'en_retard' ? 'Tous vos clients sont à jour. Bob surveille les échéances pour vous.' : 'Créez une facture en partant de zéro ou depuis un devis signé, en moins d’une minute.'}
          action={filter !== 'en_retard' && <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => navigate('/app/factures/nouvelle')}>Nouvelle facture</Button>}
        />
      ) : (
        <>
          {/* Ordinateur : liste dense */}
          <Card className="hidden overflow-hidden lg:block">
            <div className="grid grid-cols-[150px_minmax(0,1fr)_150px_120px_120px_140px_28px] items-center gap-4 border-b border-line bg-sub/60 px-4 py-2 text-[11.5px] font-medium text-ink-3">
              <span>Facture</span>
              <span>Client</span>
              <span>Échéance</span>
              <span className="text-right">Total TTC</span>
              <span className="text-right">Reste à payer</span>
              <span>Statut</span>
              <span title="Facture électronique">E-f.</span>
            </div>
            {visible.map((r) => (
              <Link key={r.f.id} to={`/app/factures/${r.f.id}`} className="grid min-h-[60px] grid-cols-[150px_minmax(0,1fr)_150px_120px_120px_140px_28px] items-center gap-4 border-b border-line px-4 py-2 transition last:border-b-0 hover:bg-[#fafafc]">
                <div className="min-w-0">
                  <KindBadge kind={r.f.kind} />
                  <div className="num mt-1 text-[12px] text-ink-3">{r.f.number}</div>
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[13.5px] font-medium">{r.client?.name ?? 'Client à choisir'}</div>
                  <div className="truncate text-[12.5px] text-ink-2">{r.f.title || 'Sans titre'}</div>
                </div>
                <DueText {...r.due} />
                <div className="num text-right text-[13.5px] font-medium">{money(r.a.ttc * r.a.sign)}</div>
                <div className={cn('num text-right text-[13.5px]', r.a.remaining > 0 ? 'font-semibold' : 'text-ink-3')}>{r.a.remaining > 0 ? money(r.a.remaining) : '·'}</div>
                <div>
                  <StatusBadge status={r.st} />
                </div>
                <EDot status={r.f.einvoice.status} b2c={r.client?.kind !== 'pro'} />
              </Link>
            ))}
          </Card>

          {/* Téléphone et tablette : cartes */}
          <div className="grid gap-2.5 md:grid-cols-2 lg:hidden">
            {visible.map((r) => (
              <FactureCard key={r.f.id} f={r.f} clientName={r.client?.name} b2c={r.client?.kind !== 'pro'} />
            ))}
          </div>
        </>
      )}

      <p className="text-center text-[12px] text-ink-3">
        {capitalize(monthName())} · les factures émises ne se modifient plus : pour corriger, Brix crée un avoir.
      </p>

      <CreateFromDevisSheet open={fromDevis} onClose={() => setFromDevis(false)} />
    </div>
  );
}

function FactureCard({ f, clientName, b2c }: { f: Facture; clientName?: string; b2c: boolean }) {
  const a = amounts(f);
  const st = liveStatus(f);
  const due = dueLabel(f);
  return (
    <Link to={`/app/factures/${f.id}`} className="block rounded-[14px] border border-line bg-white p-4 transition active:scale-[.99]">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-semibold">{clientName ?? 'Client à choisir'}</div>
          <div className="mt-0.5 truncate text-[13px] text-ink-2">{f.title || 'Sans titre'}</div>
        </div>
        <div className="text-right">
          <div className="num text-[16px] font-semibold">{money(a.ttc * a.sign)}</div>
          {a.remaining > 0 && a.remaining < a.net && <div className="num text-[12px] text-ink-2">reste {money(a.remaining)}</div>}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <KindBadge kind={f.kind} />
        <span className="num text-[12px] text-ink-3">{f.number}</span>
        <EDot status={f.einvoice.status} b2c={b2c} className="ml-auto" />
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-line pt-2.5">
        <DueText {...due} />
        <StatusBadge status={st} />
      </div>
    </Link>
  );
}
