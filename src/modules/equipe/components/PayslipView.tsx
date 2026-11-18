import { Fragment, type ReactNode } from 'react';
import { useBrix } from '@/lib/store';
import { dateFull, money, num } from '@/lib/format';
import { cn } from '@/components/ui';
import { extraOf, roleFromStore, roleName } from '../data';
import { GROUP_LABEL, PAYROLL_CONSTANTS_2026 as C, type CotisationDef, type PayLine } from '../lib/payroll';
import type { PayrollRow } from './usePayroll';

const n = (v?: number, d = 2) => (v === undefined || v === 0 ? '' : num(v, d).replace(/(,\d)$/, '$10'));
const m = (v?: number) => (v === undefined || v === 0 ? '' : money(v).replace(/\s*€/, ''));
const r = (v?: number) => (v ? v.toFixed(Math.round(v * 1000) % 10 ? 3 : 2).replace('.', ',') : '');

/** Impression : seul le bulletin est imprimé. */
export const PRINT_CSS = `@media print { body * { visibility: hidden !important; } .payslip-print, .payslip-print * { visibility: visible !important; } .payslip-print { position: fixed; inset: 0; padding: 24px; background: #fff; } }`;

function Tr({ label, base, rs, ms, rp, mp, strong, sub, className }: { label: ReactNode; base?: string; rs?: string; ms?: string; rp?: string; mp?: string; strong?: boolean; sub?: boolean; className?: string }) {
  return (
    <tr className={cn('border-b border-halo-line/70', strong && 'bg-halo-hover font-semibold', className)}>
      <td className={cn('py-1.5 pr-2', sub ? 'pl-5 text-ink-2' : 'pl-3')}>{label}</td>
      <td className="num hidden whitespace-nowrap px-2 text-right text-ink-2 sm:table-cell">{base}</td>
      <td className="num whitespace-nowrap px-2 text-right text-ink-2">{rs}</td>
      <td className="num whitespace-nowrap px-2 text-right max-sm:pr-3">{ms}</td>
      <td className="num hidden whitespace-nowrap px-2 text-right text-ink-2 sm:table-cell">{rp}</td>
      <td className="num hidden whitespace-nowrap px-3 text-right sm:table-cell">{mp}</td>
    </tr>
  );
}

export function PayslipView({ row, period }: { row: PayrollRow; period: { label: string; payDate: string } }) {
  const company = useBrix((s) => s.company);
  const { emp, slip } = row;
  const x = extraOf(emp.id);
  const groups = Object.keys(GROUP_LABEL) as CotisationDef['group'][];
  const byGroup = (g: string) => slip.cotisations.filter((c) => c.group === g);
  const sum = (lines: PayLine[], k: 'amountSal' | 'amountPat') => lines.reduce((s, l) => s + (l[k] ?? 0), 0);

  return (
    <div className="payslip-print text-[12px] text-ink">
      <style>{PRINT_CSS}</style>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-card-sm border border-halo-line p-3">
          <div className="text-[10.5px] font-medium uppercase tracking-wide text-ink-3">Employeur</div>
          <div className="mt-1 text-[13px] font-semibold">{company.legalName || company.name}</div>
          <div className="text-ink-2">{company.address}, {company.city}</div>
          <div className="text-ink-2">SIRET {company.siret} · NAF 4321A</div>
          <div className="text-ink-2">Convention : Ouvriers du bâtiment jusqu’à 10 salariés (IDCC 1596)</div>
        </div>
        <div className="rounded-card-sm border border-halo-line p-3">
          <div className="text-[10.5px] font-medium uppercase tracking-wide text-ink-3">Salarié</div>
          <div className="mt-1 text-[13px] font-semibold">{emp.firstName} {emp.lastName.toUpperCase()}</div>
          <div className="text-ink-2">{roleName(roleFromStore(emp.role))} · {emp.contract}</div>
          <div className="text-ink-2">{x.qualification}</div>
          <div className="text-ink-2">Entré le {dateFull(emp.hireDate)}{x.ssn && ` · N° SS ${x.ssn}`}</div>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap justify-between gap-2 px-1 text-ink-2">
        <span>Période : <span className="font-medium text-ink">{period.label}</span></span>
        <span>Paiement le {dateFull(period.payDate)} par virement</span>
      </div>

      <div className="mt-3 overflow-hidden rounded-card-sm border border-halo-line">
        <table className="w-full">
          <thead>
            <tr className="border-b border-halo-line bg-halo-track text-[10.5px] font-medium text-ink-2">
              <th className="py-2 pl-3 text-left font-medium">Élément</th>
              <th className="hidden px-2 text-right font-medium sm:table-cell">Base</th>
              <th className="px-2 text-right font-medium">Taux</th>
              <th className="px-2 text-right font-medium max-sm:pr-3">Salarié (€)</th>
              <th className="hidden px-2 text-right font-medium sm:table-cell">Taux</th>
              <th className="hidden px-3 text-right font-medium sm:table-cell">Employeur (€)</th>
            </tr>
          </thead>
          <tbody>
            {slip.earnings.map((l) => (
              <Tr key={l.key} label={l.label} base={l.qty ? `${n(l.qty)}${l.key === 'base' || l.key.startsWith('hs') || l.key === 'absence' ? ' h' : ' j'}` : ''} rs={n(l.base, 4)} ms={l.gain ? (l.gain < 0 ? '−' + m(-l.gain) : m(l.gain)) : ''} />
            ))}
            <Tr strong label="Salaire brut" ms={m(slip.brut)} />

            {groups.map((g) => {
              const lines = byGroup(g);
              if (g === 'csg') return null;
              return (
                <Fragment key={g}>
                  <Tr label={GROUP_LABEL[g]} ms={m(sum(lines, 'amountSal'))} mp={m(sum(lines, 'amountPat'))} className="font-medium" />
                  {lines.map((l) => (
                    <Tr key={l.key} sub label={l.label} base={l.note === 'forfait mensuel' ? 'forfait' : m(l.base)} rs={r(l.rateSal)} ms={m(l.amountSal)} rp={r(l.ratePat)} mp={m(l.amountPat)} />
                  ))}
                </Fragment>
              );
            })}
            {slip.reductionHS > 0 && <Tr label="Réduction de cotisations sur heures sup" base={m(slip.overtimePay)} rs="11,31" ms={'−' + m(slip.reductionHS)} />}
            {slip.reductionGenerale > 0 && <Tr label="Réduction générale des cotisations (RGDU)" mp={'−' + m(slip.reductionGenerale)} />}
            {slip.deductionPatronaleHS > 0 && <Tr label="Déduction forfaitaire heures sup (1,50 € / h)" base={`${n(slip.overtimeHours)} h`} mp={'−' + m(slip.deductionPatronaleHS)} />}
            {byGroup('csg').map((l) => <Tr key={l.key} label={l.label} base={m(l.base)} rs={r(l.rateSal)} ms={m(l.amountSal)} />)}
            <Tr strong label="Total des cotisations" ms={m(slip.totalSal)} mp={m(slip.totalPat)} />
            {slip.nonSoumis.map((l) => <Tr key={l.key} label={l.label + ' · non soumis'} base={`${n(l.qty)} j`} rs={n(l.base)} ms={m(l.gain)} />)}
          </tbody>
        </table>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr]">
        <div className="space-y-1.5 rounded-card-sm border border-halo-line p-3 text-ink-2">
          <div className="flex justify-between"><span>Montant net social</span><span className="num text-ink">{money(slip.netSocial)}</span></div>
          <div className="flex justify-between"><span>Net à payer avant impôt</span><span className="num text-ink">{money(slip.netAvantImpot)}</span></div>
          <div className="flex justify-between"><span>Net imposable</span><span className="num text-ink">{money(slip.netImposable)}</span></div>
          <div className="flex justify-between"><span>Impôt sur le revenu ({slip.pasNeutral ? 'taux neutre' : 'taux transmis'} {num(slip.pasRate, 1)} %)</span><span className="num text-ink">−{money(slip.pas)}</span></div>
          {slip.overtimePay > 0 && <div className="flex justify-between"><span>Heures sup (exonérées d’impôt jusqu’à 7 500 € par an)</span><span className="num">{money(slip.overtimePay)}</span></div>}
        </div>
        <div className="flex flex-col justify-between rounded-card-sm bg-ink p-4 text-white">
          <div>
            <div className="text-[12px] text-white/70">Net payé au salarié</div>
            <div className="num font-display text-[30px] font-semibold leading-tight">{money(slip.netAPayer)}</div>
          </div>
          <div className="mt-2 flex justify-between border-t border-white/15 pt-2 text-[12px] text-white/70">
            <span>Coût total pour l’entreprise</span>
            <span className="num font-semibold text-white">{money(slip.coutEmployeur)}</span>
          </div>
        </div>
      </div>

      <p className="mt-3 text-[10.5px] leading-relaxed text-ink-3">
        Congés payés versés par la caisse CIBTP, pas par l’employeur. Dans votre intérêt, conservez ce bulletin sans limitation de durée. Document préparé par Brix avec les taux au {dateFull(C.asOf)}, {C.status} avant envoi au salarié.
      </p>
    </div>
  );
}
