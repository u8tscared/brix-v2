import { Pencil } from 'lucide-react';
import { Avatar, Card, cn } from '@/components/ui';
import { useBrix } from '@/lib/store';
import { num, todayISO } from '@/lib/format';
import type { Employee } from '@/lib/types';
import { hhmm, weekDays } from '../data';
import type { ResolvedPunch, WeekSummary } from '../lib/timesheet';

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'];

function DayCell({ p, date, onClick, compact }: { p: ResolvedPunch | null; date: string; onClick: () => void; compact?: boolean }) {
  const chantiers = useBrix((s) => s.chantiers);
  const future = date > todayISO();
  const ch = chantiers.find((c) => c.id === p?.chantierId);
  const label = !p ? (future ? '' : '—') : p.kind === 'conge' ? 'Congé' : p.kind === 'ferie' ? 'Férié' : p.kind === 'absent' ? 'Absent' : hhmm(p.hours);
  const sub = p?.kind === 'cfa' ? 'CFA' : p?.kind === 'chantier' ? ch?.name.split(' · ')[0] : p?.kind === 'conge' ? 'caisse CIBTP' : '';
  return (
    <button
      onClick={onClick}
      disabled={future}
      className={cn(
        'group relative w-full rounded-lg px-2 text-left transition',
        compact ? 'flex h-14 flex-col items-center justify-center text-center' : 'h-12',
        future ? 'cursor-default' : 'hover:bg-sub',
        p?.kind === 'conge' && 'bg-[#eef2ff] hover:bg-[#e3e9fe]',
        p?.kind === 'cfa' && 'bg-vi-50 hover:bg-vi-100',
        p?.kind === 'ferie' && 'bg-sub',
        p?.inProgress && 'ring-1 ring-ok/40',
      )}
    >
      <span className={cn('num block text-[13px] font-medium', !p && 'text-ink-3', p?.kind === 'conge' && 'text-brand')}>{label}</span>
      {sub && <span className="block truncate text-[11px] text-ink-3">{compact ? (p?.kind === 'chantier' ? '' : sub) : sub}</span>}
      {p?.inProgress && <i className="absolute right-1.5 top-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-ok" />}
      {p?.edited && <i className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-warn" title="Corrigé à la main" />}
      {!future && !compact && <Pencil className="absolute bottom-1.5 right-1.5 hidden h-3 w-3 text-ink-3 group-hover:block" />}
    </button>
  );
}

export function WeekTable({ monday, rows, onEdit }: { monday: string; rows: { emp: Employee; w: WeekSummary }[]; onEdit: (emp: Employee, date: string, p: ResolvedPunch | null) => void }) {
  const days = weekDays(monday, 5);
  const zones = (w: WeekSummary) => Object.entries(w.zoneDays).map(([z, n]) => `Z${z}×${n}`).join(' ') || '—';
  return (
    <>
      <Card className="hidden overflow-hidden lg:block">
        <table className="w-full table-fixed text-[13px]">
          <colgroup>
            <col className="w-[190px]" />
            {days.map((d) => <col key={d} />)}
            <col className="w-[78px]" /><col className="w-[64px]" /><col className="w-[64px]" /><col className="w-[64px]" /><col className="w-[82px]" />
          </colgroup>
          <thead>
            <tr className="border-b border-line bg-[#fafafc] text-left text-[11.5px] font-medium text-ink-2">
              <th className="px-4 py-2.5 font-medium">Salarié</th>
              {days.map((d, i) => <th key={d} className={cn('px-3 font-medium', d === todayISO() && 'text-ink')}>{DAYS[i]} {Number(d.slice(8))}</th>)}
              <th className="px-2 text-right font-medium">Total</th>
              <th className="px-2 text-right font-medium">HS 25 %</th>
              <th className="px-2 text-right font-medium">HS 50 %</th>
              <th className="px-2 text-right font-medium">Paniers</th>
              <th className="px-3 text-right font-medium">Zones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ emp, w }) => (
              <tr key={emp.id} className="border-b border-line last:border-0">
                <td className="px-4 py-1.5">
                  <div className="flex items-center gap-2.5">
                    <Avatar initials={emp.initials} color={emp.color} size={28} />
                    <div className="min-w-0">
                      <div className="truncate font-medium">{emp.firstName} {emp.lastName}</div>
                      <div className="text-[11.5px] text-ink-3">{emp.contract}</div>
                    </div>
                  </div>
                </td>
                {w.days.map((p, i) => <td key={i} className="px-1 py-1.5"><DayCell p={p} date={days[i]} onClick={() => onEdit(emp, days[i], p)} /></td>)}
                <td className="num px-2 text-right font-semibold">{hhmm(w.total)}</td>
                <td className={cn('num px-2 text-right', w.ot25 ? 'text-ink' : 'text-ink-3')}>{w.ot25 ? hhmm(w.ot25) : '—'}</td>
                <td className={cn('num px-2 text-right', w.ot50 ? 'font-medium text-warn' : 'text-ink-3')}>{w.ot50 ? hhmm(w.ot50) : '—'}</td>
                <td className="num px-2 text-right">{w.paniers || '—'}</td>
                <td className="num px-3 text-right text-[12px] text-ink-2">{zones(w)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="space-y-3 lg:hidden">
        {rows.map(({ emp, w }) => (
          <Card key={emp.id} className="p-3">
            <div className="flex items-center gap-2.5 px-1">
              <Avatar initials={emp.initials} color={emp.color} size={32} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-semibold">{emp.firstName} {emp.lastName}</div>
                <div className="text-[12px] text-ink-3">{w.paniers} panier{w.paniers > 1 ? 's' : ''} · {zones(w)}</div>
              </div>
              <div className="text-right">
                <div className="num text-[16px] font-semibold">{hhmm(w.total)}</div>
                {(w.ot25 > 0 || w.ot50 > 0) && <div className="num text-[11.5px] text-warn">dont {num(w.ot25 + w.ot50, 2).replace('.', ',')} h sup</div>}
              </div>
            </div>
            <div className="mt-2 grid grid-cols-5 gap-1">
              {w.days.map((p, i) => (
                <div key={i}>
                  <div className={cn('mb-0.5 text-center text-[11px] text-ink-3', days[i] === todayISO() && 'font-semibold text-ink')}>{DAYS[i]} {Number(days[i].slice(8))}</div>
                  <DayCell compact p={p} date={days[i]} onClick={() => onEdit(emp, days[i], p)} />
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
