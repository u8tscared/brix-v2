import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FilePlus2, FileSignature, Plus, ReceiptText, Search } from 'lucide-react';
import { Button, EmptyState, IconTile, Input, PageHeader, Segmented } from '@/components/ui';
import { useMediaQuery } from '@/components/layout/useMediaQuery';
import { todayISO } from '@/lib/format';
import { useBrix } from '@/lib/store';
import { CashHeader } from './components/list/CashHeader';
import { FactureCard, FactureRow, ROW_GRID, type RowAction } from './components/list/FactureItem';
import { NewFactureSheet } from './components/list/NewFactureSheet';
import { CreateFromDevisSheet } from './components/CreateFromDevisSheet';
import { FacturePreview } from './components/FacturePreview';
import { RecordPaymentSheet } from './components/PaymentSheets';
import { ReminderSheet } from './components/ReminderSheet';
import { amounts, daysLate, dueLabel, liveStatus } from './lib/model';
import { allPayments, useFactures } from './store';

type Filter = 'toutes' | 'a_encaisser' | 'en_retard' | 'payees' | 'brouillons';

export default function FacturesList() {
  const navigate = useNavigate();
  const phone = !useMediaQuery('(min-width: 768px)');
  const desk = useMediaQuery('(min-width: 1100px)');
  const factures = useBrix((s) => s.factures);
  const clients = useBrix((s) => s.clients);
  const signedCount = useBrix((s) => s.devis.filter((d) => d.status === 'signe').length);
  const payments = useFactures((s) => s.payments);
  const [filter, setFilter] = useState<Filter>('toutes');
  const [q, setQ] = useState('');
  const [fromDevis, setFromDevis] = useState(false);
  const [chooser, setChooser] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [act, setAct] = useState<{ id: string; kind: 'pay' | 'remind' } | null>(null);
  const [actOpen, setActOpen] = useState(false);
  const today = todayISO();

  // Barre du haut « Créer > Facture » : /app/factures?nouvelle=1
  const [params, setParams] = useSearchParams();
  useEffect(() => {
    if (!params.get('nouvelle')) return;
    setChooser(true);
    setParams({}, { replace: true });
  }, [params, setParams]);

  const rows = useMemo(
    () =>
      factures
        .filter((f) => f.status !== 'annulee')
        .map((f) => {
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

  const doAction = (id: string, a: RowAction) => {
    if (a === 'send') return navigate(`/app/factures/${id}?envoyer=1`);
    setAct({ id, kind: a });
    setActOpen(true);
  };
  const actF = factures.find((f) => f.id === act?.id);
  const itemProps = (r: (typeof visible)[number]) => ({
    ...r,
    onOpen: () => navigate(`/app/factures/${r.f.id}`),
    onPreview: () => setPreview(r.f.id),
    onAction: (a: RowAction) => doAction(r.f.id, a),
  });

  const subtitle = late.length
    ? `${late.length} facture${late.length > 1 ? 's' : ''} en retard. Brix AI relance pour vous, ou en un clic ici.`
    : pending.length
      ? 'Vos clients sont dans les temps. Brix AI relancera tout seul si une échéance passe.'
      : 'Facturez un devis signé en deux clics, la facture électronique est incluse.';

  return (
    <div className="space-y-5">
      <PageHeader
        icon={<IconTile name="Receipt" dept="facturer" size="lg" />}
        kicker="Facturer et encaisser"
        title="Factures"
        titleMuted={late.length ? `${late.length} à relancer, le reste suit.` : 'tout est dans les temps.'}
        subtitle={subtitle}
        actions={
          <>
            <Button variant="secondary" size={phone ? 'lg' : 'md'} icon={<FileSignature className="h-4 w-4" />} onClick={() => setFromDevis(true)} className="max-sm:flex-1 max-sm:justify-center">
              Depuis un devis
            </Button>
            <Button variant="dawn" size={phone ? 'lg' : 'md'} icon={<Plus className="h-4 w-4" />} onClick={() => navigate('/app/factures/nouvelle')} className="max-sm:flex-1 max-sm:justify-center">
              Nouvelle facture
            </Button>
          </>
        }
      />

      <div className="animate-[fade-up_.5s_var(--ease)_.05s_both]">
        <CashHeader
          cashed={cashed}
          cashedCount={monthPayments.length}
          onTime={sum(pending)}
          onTimeCount={pending.length}
          late={sum(late)}
          lateCount={late.length}
          active={filter}
          onPick={(k) => setFilter((cur) => (cur === k ? 'toutes' : k))}
        />
      </div>

      <div className="space-y-3">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
          <Segmented
            value={filter}
            onChange={setFilter}
            className="w-full lg:w-auto"
            options={[
              { value: 'toutes', label: 'Toutes', count: counts.toutes },
              { value: 'a_encaisser', label: 'À encaisser', count: counts.a_encaisser },
              { value: 'en_retard', label: 'En retard', count: counts.en_retard },
              { value: 'payees', label: 'Payées', count: counts.payees },
              { value: 'brouillons', label: 'Brouillons', count: counts.brouillons },
            ]}
          />
          <Input icon={<Search />} placeholder="Client, numéro, chantier…" value={q} onChange={(e) => setQ(e.target.value)} className="min-w-0 flex-1 lg:max-w-80 lg:ml-auto" aria-label="Rechercher une facture" />
        </div>

        {visible.length === 0 ? (
          <EmptyState
            icon={filter === 'en_retard' ? <ReceiptText /> : <FilePlus2 />}
            title={filter === 'en_retard' ? 'Aucune facture en retard' : needle ? 'Aucune facture trouvée' : 'Aucune facture ici'}
            text={filter === 'en_retard' ? 'Tous vos clients sont à jour. Brix AI surveille les échéances pour vous.' : needle ? 'Essayez un autre mot ou retirez le filtre.' : 'Créez une facture en partant de zéro ou depuis un devis signé, en moins d’une minute.'}
            action={
              needle || filter !== 'toutes' ? (
                <Button onClick={() => (setQ(''), setFilter('toutes'))}>Tout afficher</Button>
              ) : (
                <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setChooser(true)}>
                  Nouvelle facture
                </Button>
              )
            }
          />
        ) : desk ? (
          <div>
            <div className={`grid gap-4 px-4 pb-2 text-[12px] font-medium text-ink-3 ${ROW_GRID}`}>
              <span>Client et chantier</span>
              <span>Facture</span>
              <span>Échéance</span>
              <span className="text-right">Total TTC</span>
              <span className="text-right">Reste à payer</span>
              <span>Statut</span>
              <span />
            </div>
            <div key={filter} className="stagger-fast space-y-2">
              {visible.map((r) => (
                <FactureRow key={r.f.id} {...itemProps(r)} />
              ))}
            </div>
          </div>
        ) : (
          <div key={filter} className="stagger-fast grid gap-2.5 md:grid-cols-2">
            {visible.map((r) => (
              <FactureCard key={r.f.id} {...itemProps(r)} />
            ))}
          </div>
        )}
        <p className="px-1 text-[12px] leading-relaxed text-ink-3">Une facture émise ne se modifie plus : pour corriger, Brix crée un avoir. La pastille à côté du statut indique où en est la facture électronique.</p>
      </div>

      <FacturePreview id={preview} onClose={() => setPreview(null)} />
      <NewFactureSheet
        open={chooser}
        onClose={() => setChooser(false)}
        signedCount={signedCount}
        onFromDevis={() => (setChooser(false), setFromDevis(true))}
        onBlank={() => (setChooser(false), navigate('/app/factures/nouvelle'))}
      />
      <CreateFromDevisSheet open={fromDevis} onClose={() => setFromDevis(false)} />
      {actF && act?.kind === 'pay' && <RecordPaymentSheet f={actF} open={actOpen} onClose={() => setActOpen(false)} />}
      {actF && act?.kind === 'remind' && <ReminderSheet f={actF} open={actOpen} onClose={() => setActOpen(false)} />}
    </div>
  );
}
