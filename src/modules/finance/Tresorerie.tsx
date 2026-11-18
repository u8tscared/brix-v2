import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, BellRing, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import { Button, Card, cn, IconTile, PageHeader, Segmented, Switch, toast } from '@/components/ui';
import { daysBetween, money, todayISO } from '@/lib/format';
import { useBrix } from '@/lib/store';
import { BigMoney, BobSays, Label, SplitBar } from './components/kit';
import { AccountsCard } from './components/tresorerieAccounts';
import { ForecastChart } from './components/tresorerieChart';
import { buildForecast } from './components/tresorerieForecast';
import { applyPayment, autoMatch, syncBank, useTreso } from './components/tresorerieService';
import { TransactionsCard } from './components/tresorerieTransactions';

const dm = (iso: string) => new Date(iso + 'T12:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
const short = (iso: string) => new Date(iso + 'T12:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).replace('.', '');

export default function Tresorerie() {
  const s = useBrix();
  const nav = useNavigate();
  const treso = useTreso();
  const [syncing, setSyncing] = useState(false);
  const [dir, setDir] = useState<'tout' | 'in' | 'out'>('tout');
  const extra = treso.accounts.filter((a) => !a.main).reduce((a, x) => a + (x.balance ?? 0), 0);
  const f = useMemo(() => buildForecast(s, { withProbable: treso.withProbable, extraBalance: extra }), [s.factures, s.devis, s.chantiers, s.employees, s.cashBalance, treso.withProbable, extra]);
  const total = s.cashBalance + extra;
  const upcoming = f.events.filter((e) => dir === 'tout' || (dir === 'in' ? e.amount > 0 : e.amount < 0)).slice(0, 9);
  const delta = f.end - total;
  const today = todayISO();

  const sync = async () => {
    setSyncing(true);
    const txs = await syncBank(treso.synced.filter((id) => s.bank.some((t) => t.id === id)));
    let matched = 0;
    for (const tx of txs) {
      const st = useBrix.getState();
      const fac = autoMatch(tx, st.factures);
      st.upsertBank(fac ? { ...tx, matchedFactureId: fac.id } : tx);
      if (fac) {
        st.upsertFacture(applyPayment(fac, tx.amount));
        matched++;
      }
      treso.markSynced(tx.id);
    }
    useBrix.setState((x) => ({ cashBalance: x.cashBalance + txs.reduce((a, t) => a + t.amount, 0) }));
    setSyncing(false);
    if (!txs.length) toast('Tout est à jour', 'info');
    else toast(`${txs.length} nouvelles opérations${matched ? `, ${matched} paiement${matched > 1 ? 's' : ''} reconnu${matched > 1 ? 's' : ''} par Bob` : ''}`);
  };

  const tva = f.nextTva;
  const tvaEvent = tva?.events.find((e) => e.kind === 'tva');
  const low = f.min.balance < f.payroll;
  const lateCount = s.factures.filter((x) => x.status === 'en_retard').length;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<IconTile name="Landmark" dept="facturer" size="lg" />}
        kicker="Facturer et encaisser"
        title="Trésorerie"
        titleMuted={low ? 'un creux à anticiper.' : 'vous êtes serein pour 90 jours.'}
        subtitle="Votre argent aujourd'hui, et ce qu'il sera dans 90 jours."
        actions={<Button variant="secondary" loading={syncing} icon={<RefreshCw />} onClick={sync} className="max-sm:w-full">Actualiser la banque</Button>}
      />

      <Card className="overflow-hidden">
        <div className="grid gap-6 p-5 md:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-end">
          <div className="min-w-0">
            <Label>Sur vos comptes aujourd'hui</Label>
            <BigMoney value={total} dawn className="mt-2 block text-[46px] md:text-[56px]" />
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-2">
              <span>Dans 90 jours : <b className="num font-semibold text-ink">{money(f.end, true)}</b></span>
              <span className={cn('chip', delta >= 0 ? 'tone-green' : 'tone-neutral')}>
                {delta >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                <span className="num">{delta >= 0 ? '+' : ''}{money(delta, true)}</span>
              </span>
            </div>
          </div>
          <div className="min-w-0">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <IconTile icon={<ArrowDownLeft />} tone="green" size="sm" className="mb-3" />
                <Label>Va rentrer</Label>
                <BigMoney value={f.ins} signed className="mt-1.5 block text-[26px] text-deep-g md:text-[30px]" />
                <div className="mt-1 text-[12px] text-ink-3">factures et devis signés</div>
              </div>
              <div>
                <IconTile icon={<ArrowUpRight />} tone="violet" size="sm" className="mb-3" />
                <Label>Va sortir</Label>
                <BigMoney value={f.outs} className="mt-1.5 block text-[26px] md:text-[30px]" />
                <div className="mt-1 text-[12px] text-ink-3">salaires, URSSAF, TVA, charges</div>
              </div>
            </div>
            <SplitBar className="mt-4" parts={[{ value: f.ins, color: '#34d399', label: 'Entrées' }, { value: -f.outs, color: '#c4b5fd', label: 'Sorties' }]} />
          </div>
        </div>

        <div className="border-t border-halo-line px-2 pb-3 pt-4 md:px-5">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2 px-2 md:px-0">
            <div className="flex items-baseline gap-2">
              <h2 className="text-[16px] font-semibold tracking-[-0.025em]">Prévision à 90 jours</h2>
              <span className="hidden text-[12.5px] text-ink-3 md:inline">passez la souris sur la courbe</span>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-ink-2">
              Compter les devis en attente
              <Switch checked={treso.withProbable} onChange={treso.setWithProbable} label="Compter les devis en attente" />
            </label>
          </div>
          <ForecastChart key={String(treso.withProbable)} points={f.points} threshold={f.payroll} />
        </div>
      </Card>

      {tva && tvaEvent && (
        <BobSays
          tone={low ? 'warn' : 'calm'}
          actions={low && lateCount > 0 ? <Button size="sm" variant="primary" icon={<BellRing />} onClick={() => nav('/app/relances')}>Voir les relances</Button> : undefined}
        >
          Le {new Date(tva.date + 'T12:00').getDate()}, la TVA (<b className="num">{money(-tvaEvent.amount, true)}</b>) et l'URSSAF passent : il te restera <b className="num">{money(tva.balance, true)}</b>.{' '}
          {low ? (
            <span>Le {dm(f.min.date)}, tu descends à <b className="num">{money(f.min.balance, true)}</b>, moins d'un mois de salaires. On relance les retards ?</span>
          ) : (
            <span className="text-ink-2">Ton point le plus bas reste à {money(f.min.balance, true)} le {dm(f.min.date)}, au-dessus du seuil. Tout va bien.</span>
          )}
        </BobSays>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <TransactionsCard />
        <div className="space-y-5">
          <Card className="overflow-hidden">
            <div className="flex min-h-[56px] items-center justify-between gap-2 border-b border-halo-line px-4">
              <h4 className="text-[15px] font-semibold tracking-[-0.02em]">À venir</h4>
              <Segmented size="sm" value={dir} onChange={setDir} options={[{ value: 'tout', label: 'Tout' }, { value: 'in', label: 'Entrées' }, { value: 'out', label: 'Sorties' }]} />
            </div>
            <ul key={dir} className="stagger-fast">
              {upcoming.map((e, i) => {
                const n = daysBetween(today, e.date);
                return (
                  <li key={i} className="flex min-h-[54px] items-center gap-3 border-b border-halo-line px-4 py-2 last:border-b-0">
                    <span className="w-11 shrink-0 text-center">
                      <span className="num-halo block text-[16px] leading-none">{short(e.date).split(' ')[0]}</span>
                      <span className="mt-0.5 block text-[10.5px] uppercase tracking-wide text-ink-3">{short(e.date).split(' ')[1]}</span>
                    </span>
                    <IconTile icon={e.amount > 0 ? <ArrowDownLeft /> : <ArrowUpRight />} tone={e.amount > 0 ? 'green' : 'violet'} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium">{e.label}</div>
                      <div className="text-[11.5px] text-ink-3">{n <= 1 ? 'demain' : `dans ${n} jours`}</div>
                    </div>
                    <span className={cn('num shrink-0 text-[13px] font-semibold', e.amount > 0 && 'text-deep-g')}>{e.amount > 0 ? '+' : ''}{money(e.amount, true)}</span>
                  </li>
                );
              })}
              {!upcoming.length && <li className="px-4 py-8 text-center text-[13px] text-ink-3">Rien de prévu sur 90 jours.</li>}
            </ul>
          </Card>
          <AccountsCard onSync={sync} syncing={syncing} />
        </div>
      </div>
    </div>
  );
}
