import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ChevronRight, Download, FileSpreadsheet, Printer, Send, ShieldCheck, Undo2 } from 'lucide-react';
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, Field, Input, PageHeader, Segmented, Sheet, toast } from '@/components/ui';
import { capitalize, money, num } from '@/lib/format';
import { hhmm } from './data';
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
  const period = periodKey(mo.y, mo.m);
  const current = rows.find((r) => r.key === open?.key) ?? null;

  const tot = rows.reduce((a, r) => ({ brut: a.brut + r.slip.brut, net: a.net + r.slip.netAPayer, cout: a.cout + r.slip.coutEmployeur, cot: a.cot + r.slip.totalSal + r.slip.totalPat, hs: a.hs + r.slip.overtimeHours }), { brut: 0, net: 0, cout: 0, cot: 0, hs: 0 });
  const allValidated = rows.length > 0 && rows.every((r) => r.validated);
  const provisional = which === 'cur';

  const exportCsv = () => {
    download(`brix-paie-${period}.csv`, payslipsToCsv(rows.map((r) => r.slip), period));
    toast('Export téléchargé : il s’ouvre dans Excel.');
  };
  const send = async () => {
    setSending(true);
    await sendToAccountant(payslipsToCsv(rows.map((r) => r.slip), period), period);
    setSending(false);
    toast('Éléments de paie envoyés à votre expert-comptable (démo).');
  };
  const dsn = async () => {
    const r = await submitDsn(period);
    toast(r.reason ?? 'DSN transmise.', 'info');
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Paie"
        subtitle="Les bulletins se préparent tout seuls depuis les heures pointées."
        actions={
          <>
            <Button variant="secondary" icon={<Download className="h-4 w-4" />} onClick={exportCsv} disabled={!rows.length}>Export CSV</Button>
            <Button variant="secondary" icon={<FileSpreadsheet className="h-4 w-4" />} onClick={dsn}>DSN <Badge className="ml-1">à brancher</Badge></Button>
          </>
        }
      />

      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-vi-50 text-vi-700"><ShieldCheck className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1 text-[13px] leading-relaxed text-ink-2">
          <span className="font-semibold text-ink">Brix prépare, votre expert-comptable ou votre partenaire paie valide.</span> Heures sup, paniers, zones de trajet et caisse de congés BTP sont repris automatiquement. Taux au {new Date(C.asOf).toLocaleDateString('fr-FR')}, {C.status}.
        </div>
        <Segmented<Which> value={which} onChange={setWhich} options={[{ value: 'prev2', label: capitalize(monthOf('prev2').short) }, { value: 'prev', label: capitalize(monthOf('prev').short) }, { value: 'cur', label: `${capitalize(monthOf('cur').short)} (en cours)` }]} />
      </Card>

      {rows.length === 0 ? (
        <EmptyState icon={<FileSpreadsheet />} title="Pas de salarié à payer" text="Ajoutez vos salariés avec leur salaire brut : Brix prépare leurs bulletins chaque mois." action={<Link to="/app/equipe"><Button variant="primary">Aller à l’équipe</Button></Link>} />
      ) : (
        <>
          <Card className="grid grid-cols-2 overflow-hidden lg:grid-cols-4">
            <div className="col-span-2 border-b border-line p-4 lg:col-span-1 lg:border-b-0 lg:border-r">
              <div className="text-xs font-medium text-ink-2">Coût total {mo.short}</div>
              <div className="num mt-1 font-display text-[30px] font-semibold leading-tight dawn-text">{money(tot.cout, true)}</div>
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
                  <Avatar initials={r.emp.initials} color={r.emp.color} size={34} />
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

          {!provisional && (
            <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold">{allValidated ? 'Tout est prêt pour votre expert-comptable' : 'Vérifiez et validez chaque bulletin'}</div>
                <div className="text-[12.5px] text-ink-2">Il reçoit les bulletins et l’export, contrôle, puis déclare la DSN. Vous virez les nets depuis Trésorerie.</div>
              </div>
              <Button variant="primary" disabled={!allValidated} loading={sending} icon={<Send className="h-4 w-4" />} onClick={send}>Envoyer à l’expert-comptable</Button>
            </Card>
          )}
        </>
      )}

      <Sheet open={!!current} onClose={() => setOpen(null)} width={860}
        title={current ? `Bulletin de ${current.emp.firstName} · ${mo.label.toLowerCase()}` : ''}
        subtitle={provisional ? 'Provisoire : le mois n’est pas terminé.' : 'Bulletin clarifié, prêt à imprimer.'}
        footer={current && (
          <>
            <Button variant="ghost" icon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>Imprimer</Button>
            <div className="flex-1" />
            {!provisional && (current.validated
              ? <Button variant="secondary" icon={<Undo2 className="h-4 w-4" />} onClick={() => validatePayslip(current.key, false)}>Rouvrir</Button>
              : <Button variant="primary" icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => { validatePayslip(current.key); toast(`Bulletin de ${current.emp.firstName} validé.`); setOpen(null); }}>Valider le bulletin</Button>)}
          </>
        )}
      >
        {current && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-3 rounded-xl bg-sub p-3">
              <Field label="Taux de prélèvement à la source" className="w-[220px]">
                <Input inputMode="decimal" placeholder={`taux neutre (${num(current.slip.pasRate, 1)} %)`} defaultValue={current.slip.pasNeutral ? '' : String(current.slip.pasRate).replace('.', ',')} suffix="%" disabled={current.validated}
                  onBlur={(e) => { const v = e.target.value.trim(); overridePayslip(current.key, { pasRate: v ? Number(v.replace(',', '.')) : null }); }} />
              </Field>
              <p className="min-w-0 flex-1 pb-2 text-[12px] text-ink-2">Laissez vide pour le taux neutre. Le taux personnalisé arrive normalement par le retour de la DSN.</p>
            </div>
            <PayslipView row={current} period={{ label: mo.label, payDate: mo.payDate }} />
          </div>
        )}
      </Sheet>
    </div>
  );
}
