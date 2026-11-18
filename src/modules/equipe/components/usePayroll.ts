import { useMemo } from 'react';
import { useBrix } from '@/lib/store';
import type { Employee } from '@/lib/types';
import { extraOf } from '../data';
import { computePayslip, type Payslip } from '../lib/payroll';
import { monthSummary } from '../lib/timesheet';
import { useEquipe } from '../store';

export interface PayrollRow {
  emp: Employee;
  key: string;
  slip: Payslip;
  hours: { total: number; normal: number; ot25: number; ot50: number; paniers: number; absences: number };
  validated: boolean;
}

export const periodKey = (y: number, m: number) => `${y}-${String(m + 1).padStart(2, '0')}`;

/** Bulletins du mois, préparés depuis les heures pointées. */
export function usePayroll(year: number, month: number): PayrollRow[] {
  const employees = useBrix((s) => s.employees);
  const { edits, live, validatedPayslips, payslipOverrides } = useEquipe();
  return useMemo(() => {
    const period = periodKey(year, month);
    return employees
      .filter((e) => e.role !== 'patron' && e.contract !== 'Gérant' && e.grossMonthly > 0)
      .map((emp) => {
        const m = monthSummary(emp, year, month, edits, live);
        const key = `${emp.id}|${period}`;
        const ov = payslipOverrides[key] ?? {};
        const pasRate = ov.pasRate !== undefined ? ov.pasRate : extraOf(emp.id).pasRate;
        const slip = computePayslip({
          name: `${emp.firstName} ${emp.lastName}`,
          contract: emp.contract,
          grossMonthly: emp.grossMonthly,
          ot25: m.ot25,
          ot50: m.ot50,
          absenceHours: m.absences * 7,
          paniers: m.paniers,
          zoneDays: m.zoneDays,
          pasRate,
        });
        return { emp, key, slip, hours: { total: m.total, normal: m.normal, ot25: m.ot25, ot50: m.ot50, paniers: m.paniers, absences: m.absences }, validated: validatedPayslips.includes(key) };
      });
  }, [employees, edits, live, validatedPayslips, payslipOverrides, year, month]);
}
