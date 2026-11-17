import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ChevronRight, Download, FileSpreadsheet, Maximize2, Minimize2, Printer, Send, ShieldCheck, Undo2 } from 'lucide-react';
import { Avatar, Badge, Button, Card, CardHeader, cn, EmptyState, Field, IconTile, Input, PageHeader, Segmented, Sheet, toast } from '@/components/ui';
import { AnimatedNumber, SuccessDot } from '@/components/motion';
import { PaySteps } from './components/PaySteps';
import { SplitBar } from '@/modules/finance/components/kit';
import { capitalize, money, num } from '@/lib/format';
import { hhmm, mondayOf } from './data';
import { PAYROLL_CONSTANTS_2026 as C, payslipsToCsv } from './lib/payroll';
import { sendToAccountant, submitDsn } from './service';
import { useEquipe } from './store';
import { PayslipView } from './components/PayslipView';
import { periodKey, usePayroll, type PayrollRow } from './components/usePayroll';

type Which = 'prev' | 'cur' | 'prev2';

function monthOf(which: Which) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + (which === 'cur' ? 0 : which === 'prev' ? -1 : -2));
  const y = d.getFullYear();
  const m = d.getMonth();
  const last = new Date(y, m + 1, 0, 12);
  return { y, m, label: capitalize(d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })), short: d.toLocaleDateString('fr-FR', { month: 'long' }), payDate: last.toISOString().slice(0, 10) };
}

function download(name: string, content: string) {
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export default function Paie() {
  const [which, setWhich] = useState<Which>('prev');
  const mo = monthOf(which);
  const rows = usePayroll(mo.y, mo.m);
  const { validatePayslip, overridePayslip } = useEquipe();
  const [open, setOpen] = useState<PayrollRow | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [paid, setPaid] = useState<Record<string, boolean>>({});
  const [big, setBig] = useState(false);
  const validatedWeeks = useEquipe((s) => s.validatedWeeks);
  const period = periodKey(mo.y, mo.m);
  const current = rows.find((r) => r.key === open?.key) ?? null;

  const tot = rows.reduce((a, r) => ({ brut: a.brut + r.slip.brut, net: a.net + r.slip.netAPayer, cout: a.cout + r.slip.coutEmployeur, cot: a.cot + r.slip.totalSal + r.slip.totalPat, hs: a.hs + r.slip.overtimeHours }), { brut: 0, net: 0, cout: 0, cot: 0, hs: 0 });
  const allValidated = rows.length > 0 && rows.every((r) => r.validated);
  const weeks = Array.from(new Set(Array.from({ length: new Date(mo.y, mo.m + 1, 0).getDate() }, (_, i) => mondayOf(periodKey(mo.y, mo.m) + '-' + String(i + 1).padStart(2, '0')))));
  const weeksDone = weeks.filter((w) => validatedWeeks.includes(w)).length;
  const provisional = which === 'cur';

  const exportCsv = () => {
    download(`brix-paie-${period}.csv`, payslipsToCsv(rows.map((r) => r.slip), period));
    toast('Export téléchargé : il s’ouvre dans Excel.');
  };
  const send = async () => {
    setSending(true);
    await sendToAccountant(payslipsToCsv(rows.map((r) => r.slip), period), period);
    setSending(false);
    setSent((x) => ({ ...x, [period]: true }));
    toast('Bulletins et export envoyés à votre expert-comptable.');
  };
  const dsn = async () => {
    const r = await submitDsn(period);
    toast(r.reason ?? 'DSN transmise.', 'info');
  };

  return (
    <div className="space-y-5">
      <PageHeader
        icon={<IconTile name="FileSpreadsheet" dept="equipe" size="lg" />}
        title="Paie"
        subtitle="Les bulletins BTP se préparent tout seuls depuis les heures pointées."
        actions={
          <>
            <Button variant="secondary" icon={<Download />} onClick={exportCsv} disabled={!rows.length} className="max-sm:flex-1">Export Excel</Button>
            <Button variant="ghost" icon={<FileSpreadsheet />} onClick={dsn} className="max-sm:flex-1">DSN</Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented<Which> value={which} onChange={setWhich} options={[{ value: 'prev2', label: capitalize(monthOf('prev2').short) }, { value: 'prev', label: capitalize(monthOf('prev').short) }, { value: 'cur', label: `${capitalize(monthOf('cur').short)} (en cours)` }]} />
        <span className="flex items-center gap-1.5 text-[12px] text-ink-3"><ShieldCheck className="h-3.5 w-3.5" />Brix prépare, votre expert-comptable valide · taux au {new Date(C.asOf).toLocaleDateString('fr-FR')}</span>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={<FileSpreadsheet />} title="Pas de salarié à payer" text="Ajoutez vos salariés avec leur salaire brut : Brix prépare leurs bulletins chaque mois." action={<Link to="/app/equipe"><Button variant="primary">Aller à l’équipe</Button></Link>} />
      ) : (
        <>
          <Card className="grid grid-cols-2 overflow-hidden lg:grid-cols-4">
            <div className="col-span-2 border-b border-line p-4 lg:col-span-1 lg:border-b-0 lg:border-r">
              <div className="text-xs font-medium text-ink-2">Coût total {mo.short}</div>
              <AnimatedNumber value={tot.cout} format={(n) => money(n, true)} className="mt-2 block text-[32px] font-semibold leading-none tracking-[-0.045em] dawn-text" />
              <div className="mt-0.5 text-xs text-ink-2">salaires, charges et indemnités</div>
            </div>
            <div className="border-r border-line p-4">
              <div className="text-xs font-medium text-ink-2">Salaires bruts</div>
              <div className="num mt-1 text-[22px] font-semibold">{money(tot.brut, true)}</div>
              <div className="mt-0.5 text-xs text-ink-2">dont {hhmm(tot.hs)} sup</div>
            </div>
            <div className="p-4 lg:border-r lg:border-line">
              <div className="text-xs font-medium text-ink-2">Nets à virer</div>
              <div className="num mt-1 text-[22px] font-semibold">{money(tot.net, true)}</div>
              <div className="mt-0.5 text-xs text-ink-2">le {new Date(mo.payDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</div>
            </div>
            <div className="col-span-2 border-t border-line p-4 lg:col-span-1 lg:border-t-0">
              <div className="text-xs font-medium text-ink-2">Cotisations</div>
              <div className="num mt-1 text-[22px] font-semibold">{money(tot.cot, true)}</div>
              <div className="mt-0.5 text-xs text-ink-2">dont caisse de congés CIBTP</div>
            </div>
          </Card>

          {!provisional && (
            <PaySteps
              steps={[
                { title: 'Heures reprises', sub: weeksDone >= weeks.length ? `${weeks.length} semaines validées` : <>{weeksDone} semaine{weeksDone > 1 ? 's' : ''} validée{weeksDone > 1 ? 's' : ''} sur {weeks.length} · <Link to="/app/pointage" className="font-medium text-[#0e7490] hover:underline">voir</Link></>, done: true },
                { title: 'Vérifier les bulletins', sub: `${rows.filter((r) => r.validated).length} sur ${rows.length} validés`, done: allValidated, action: <Button size="sm" variant="primary" icon={<CheckCircle2 />} onClick={() => setOpen(rows.find((r) => !r.validated) ?? null)}>Vérifier le suivant</Button> },
                { title: 'Envoyer au comptable', sub: sent[period] ? 'Reçu par votre cabinet' : 'Il contrôle et déclare la DSN', done: !!sent[period], action: <Button size="sm" variant="primary" loading={sending} icon={<Send />} onClick={send}>Envoyer</Button> },
                { title: 'Virer les salaires', sub: paid[period] ? 'Virements programmés' : `${money(tot.net, true)} le ${new Date(mo.payDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`, done: !!paid[period], action: <Button size="sm" variant="primary" onClick={() => { setPaid((x) => ({ ...x, [period]: true })); toast(`${rows.length} virements programmés pour le ${new Date(mo.payDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`); }}>Programmer les virements</Button> },
              ]}
            />
          )}

          {provisional && <p className="rounded-xl bg-sub px-4 py-3 text-[12.5px] text-ink-2">Mois en cours : estimation avec les heures pointées jusqu’à aujourd’hui. Les bulletins définitifs se préparent à la fin du mois.</p>}

          <Card>
            <CardHeader title={`Bulletins de ${mo.label.toLowerCase()}`} meta={`${rows.filter((r) => r.validated).length} / ${rows.length} validés`}
              action={!provisional && !allValidated ? <Button size="sm" variant="ghost" icon={<CheckCircle2 className="h-3.5 w-3.5" />} onClick={() => { rows.forEach((r) => validatePayslip(r.key)); toast('Tous les bulletins sont validés.'); }}>Tout valider</Button> : undefined} />
            <div className="hidden grid-cols-[minmax(0,1.5fr)_1fr_.9fr_.9fr_.9fr_110px_20px] gap-3 border-b border-line bg-[#fafafc] px-4 py-2 text-[11.5px] font-medium text-ink-2 lg:grid">
              <span>Salarié</span><span>Heures</span><span className="text-right">Brut</span><span className="text-right">Net à payer</span><span className="text-right">Coût employeur</span><span>État</span><span />
            </div>
            {rows.map((r) => (
              <button key={r.key} onClick={() => setOpen(r)} className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-line px-4 py-3 text-left transition last:border-0 hover:bg-[#fafafc] lg:grid-cols-[minmax(0,1.5fr)_1fr_.9fr_.9fr_.9fr_110px_20px]">
                <span className="flex min-w-0 items-center gap-3 max-lg:contents">
                  <span className="relative">
                    <Avatar initials={r.emp.initials} color={r.emp.color} size={36} />
                    {r.validated && <SuccessDot size={16} className="absolute -bottom-1 -right-1 ring-2 ring-white" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-semibold">{r.emp.firstName} {r.emp.lastName}</span>
                    <span className="block truncate text-[12px] text-ink-2">{r.emp.contract} · {money(r.emp.grossMonthly, true)} de base<span className="lg:hidden"> · net {money(r.slip.netAPayer, true)}</span></span>
                  </span>
                </span>
                <span className="hidden text-[12.5px] lg:block">
                  <span className="num">{hhmm(r.hours.total)}</span>
                  <span className="block text-[11.5px] text-ink-3">{r.hours.ot25 + r.hours.ot50 > 0 ? `${hhmm(r.hours.ot25 + r.hours.ot50)} sup · ` : ''}{r.hours.paniers} paniers{r.hours.absences ? ` · ${r.hours.absences} j congé` : ''}</span>
                </span>
                <span className="num hidden text-right text-[13px] lg:block">{money(r.slip.brut)}</span>
                <span className="num hidden text-right text-[13px] font-semibold lg:block">{money(r.slip.netAPayer)}</span>
                <span className="num hidden text-right text-[13px] text-ink-2 lg:block">{money(r.slip.coutEmployeur)}</span>
                <span className="flex items-center gap-2 lg:block">
                  {provisional ? <Badge>Provisoire</Badge> : r.validated ? <Badge tone="ok" icon={<CheckCircle2 />}>Validé</Badge> : <Badge tone="warn">À vérifier</Badge>}
                  <ChevronRight className="h-4 w-4 text-ink-3 lg:hidden" />
                </span>
                <ChevronRight className="hidden h-4 w-4 text-ink-3 lg:block" />
              </button>
            ))}
          </Card>

        </>
      )}

      <Sheet open={!!current} onClose={() => { setOpen(null); setBig(false); }} width={860} side={big ? 'full' : 'right'}
        title={current ? `Bulletin de ${current.emp.firstName} · ${mo.label.toLowerCase()}` : ''}
        subtitle={provisional ? 'Provisoire : le mois n’est pas terminé.' : 'Bulletin clarifié, prêt à imprimer.'}
        footer={current && (
          <>
            <Button variant="ghost" icon={big ? <Minimize2 /> : <Maximize2 />} onClick={() => setBig(!big)} className="max-md:hidden">{big ? 'Réduire' : 'Agrandir'}</Button>
            <Button variant="ghost" icon={<Printer />} onClick={() => window.print()}>Imprimer</Button>
            <div className="flex-1" />
            {!provisional && (current.validated
              ? <Button variant="secondary" icon={<Undo2 className="h-4 w-4" />} onClick={() => validatePayslip(current.key, false)}>Rouvrir</Button>
              : <Button variant="primary" icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => { validatePayslip(current.key); toast(`Bulletin de ${current.emp.firstName} validé.`); const next = rows.find((r) => !r.validated && r.key !== current.key); setOpen(next ?? null); }}>{rows.some((r) => !r.validated && r.key !== current.key) ? 'Valider, voir le suivant' : 'Valider le bulletin'}</Button>)}
          </>
        )}
      >
        {current && (
          <div className={cn('mx-auto space-y-4', big && 'max-w-[900px]')}>
            <div className="flex flex-wrap items-end gap-3 rounded-xl bg-sub p-3">
              <Field label="Taux de prélèvement à la source" className="w-[220px]">
                <Input inputMode="decimal" placeholder={`taux neutre (${num(current.slip.pasRate, 1)} %)`} defaultValue={current.slip.pasNeutral ? '' : String(current.slip.pasRate).replace('.', ',')} suffix="%" disabled={current.validated}
                  onBlur={(e) => { const v = e.target.value.trim(); overridePayslip(current.key, { pasRate: v ? Number(v.replace(',', '.')) : null }); }} />
              </Field>
              <p className="min-w-0 flex-1 pb-2 text-[12px] text-ink-2">Laissez vide pour le taux neutre. Le taux personnalisé arrive normalement par le retour de la DSN.</p>
            </div>
            <div className={cn('mx-auto transition-[max-width] duration-500 ease-out-quint', big ? 'max-w-[900px]' : 'max-w-full')}>
              <SlipSummary row={current} />
              <div className="mt-4 rounded-[14px] bg-white p-3 shadow-[0_0_0_1px_var(--line),0_12px_32px_-16px_rgba(19,15,38,.18)] md:p-5">
                <PayslipView row={current} period={{ label: mo.label, payDate: mo.payDate }} />
              </div>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}

/** Où part l'argent : net au salarié, cotisations salariales, charges patronales. */
function SlipSummary({ row }: { row: PayrollRow }) {
  const { slip } = row;
  const extra = slip.nonSoumis.reduce((a, l) => a + (l.gain ?? 0), 0);
  const parts = [
    { label: 'Net au salarié', value: slip.netAPayer, color: '#0891b2' },
    { label: 'Impôt et cotisations du salarié', value: slip.brut + extra - slip.netAPayer, color: '#67c6d9' },
    { label: 'Charges employeur', value: slip.coutEmployeur - slip.brut - extra, color: '#c7e6ee' },
  ];
  return (
    <div className="rounded-[14px] bg-sub/70 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[12.5px] font-medium text-ink-2">Net payé à {row.emp.firstName}</div>
          <AnimatedNumber value={slip.netAPayer} format={(n) => money(n)} className="mt-1 block text-[28px] font-semibold leading-none tracking-[-0.04em]" />
        </div>
        <div className="text-right text-[12.5px] text-ink-2">Coût pour l’entreprise<div className="num text-[15px] font-semibold text-ink">{money(slip.coutEmployeur)}</div></div>
      </div>
      <SplitBar className="mt-4 h-2.5" parts={parts} />
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-ink-2">
        {parts.map((p) => <span key={p.label} className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full" style={{ background: p.color }} />{p.label} <span className="num font-medium text-ink">{money(p.value, true)}</span></span>)}
      </div>
    </div>
  );
}
