import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, Landmark } from 'lucide-react';
import { Card, CardHeader, cn, PageHeader, Stat, Switch, toast } from '@/components/ui';
import { capitalize, dateLong, money } from '@/lib/format';
import { useBrix } from '@/lib/store';
import { StatStrip } from '@/modules/vendre/components/StatStrip';
import { AccountsCard } from './components/tresorerieAccounts';
import { ForecastChart } from './components/tresorerieChart';
import { buildForecast } from './components/tresorerieForecast';
import { applyPayment, autoMatch, syncBank, useTreso } from './components/tresorerieService';
import { TransactionsCard } from './components/tresorerieTransactions';

const dm = (iso: string) => new Date(iso + 'T12:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

export default function Tresorerie() {
  const s = useBrix();
  const treso = useTreso();
  const [syncing, setSyncing] = useState(false);
  const extra = treso.accounts.filter((a) => !a.main).reduce((a, x) => a + (x.balance ?? 0), 0);
  const f = useMemo(() => buildForecast(s, { withProbable: treso.withProbable, extraBalance: extra }), [s.factures, s.devis, s.chantiers, s.employees, s.cashBalance, treso.withProbable, extra]);
  const total = s.cashBalance + extra;
  const upcoming = f.events.slice(0, 8);

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

  return (
    <div className="space-y-5">
      <PageHeader title="Trésorerie" subtitle="Votre argent aujourd'hui, et ce qu'il sera dans 90 jours." />

      <StatStrip>
        <Stat label={<><Landmark className="h-3.5 w-3.5" />Sur vos comptes</>} hero value={money(total, true)} sub={`${treso.accounts.length} compte${treso.accounts.length > 1 ? 's' : ''} relié${treso.accounts.length > 1 ? 's' : ''}`} />
        <Stat label="Va rentrer (90 j)" value={<span className="text-ok">+{money(f.ins, true)}</span>} sub="factures et devis signés" />
        <Stat label="Va sortir (90 j)" value={money(f.outs, true)} sub="salaires, URSSAF, TVA, charges" />
        <Stat label="Dans 90 jours" value={money(f.end, true)} sub={`point bas ${money(f.min.balance, true)} le ${dm(f.min.date)}`} />
      </StatStrip>

      {tva && tvaEvent && (
        <Card className={cn('flex items-start gap-3 p-4', low && 'border-[#fde3b5] bg-warn-bg/40')}>
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-[12px] font-semibold text-white">B</span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] leading-relaxed">
              Le {new Date(tva.date + 'T12:00').getDate()}, la TVA passe (<b className="num">{money(-tvaEvent.amount, true)}</b>) avec l'URSSAF : il te restera <b className="num">{money(tva.balance, true)}</b>.{' '}
              {low ? (
                <span className="text-warn"><AlertTriangle className="mr-1 inline h-3.5 w-3.5" />Le {dm(f.min.date)}, tu descends à {money(f.min.balance, true)}, moins qu'un mois de salaires. Je relance les factures en retard dès ce soir ?</span>
              ) : (
                <>Pas d'inquiétude, ton point le plus bas reste à {money(f.min.balance, true)}, le {dm(f.min.date)}.</>
              )}
            </p>
          </div>
        </Card>
      )}

      <Card className="min-w-0">
        <CardHeader
          title="Prévision à 90 jours"
          meta={<span className="hidden md:inline">survolez la courbe</span>}
          action={
            <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-ink-2">
              <span className="hidden sm:inline">Compter les devis en attente</span>
              <span className="sm:hidden">Devis en attente</span>
              <Switch checked={treso.withProbable} onChange={treso.setWithProbable} label="Compter les devis en attente" />
            </label>
          }
        />
        <div className="px-2 pb-2 pt-3 md:px-4">
          <ForecastChart points={f.points} />
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <TransactionsCard />
        <div className="space-y-4">
          <AccountsCard onSync={sync} syncing={syncing} />
          <Card>
            <CardHeader title="Prochains mouvements" />
            {upcoming.map((e, i) => (
              <div key={i} className="flex min-h-[52px] items-center gap-3 border-b border-line px-4 py-2 last:border-b-0">
                <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-full', e.amount > 0 ? 'bg-ok-bg text-ok' : 'bg-sub text-ink-2')}>
                  {e.amount > 0 ? <ArrowDownLeft className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium">{e.label}</div>
                  <div className="text-[11.5px] text-ink-3">{capitalize(dateLong(e.date))}</div>
                </div>
                <span className={cn('num shrink-0 text-[13px] font-semibold', e.amount > 0 && 'text-ok')}>{e.amount > 0 ? '+' : ''}{money(e.amount, true)}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
