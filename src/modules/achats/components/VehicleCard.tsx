import { Car, Gauge, Zap } from 'lucide-react';
import { Avatar, Card, IconTile, cn } from '@/components/ui';
import { SuccessDot } from '@/components/motion';
import { useBrix } from '@/lib/store';
import { dateFull, num, relative } from '@/lib/format';
import type { Vehicle } from '../data';
import { DaysRing } from '@/modules/finance/components/kit';
import { daysTo } from './fleet';

function Row({ label, sub, days, horizon, ringLabel }: { label: string; sub: string; days: number; horizon: number; ringLabel?: React.ReactNode }) {
  const calm = days > horizon;
  return (
    <div className="flex items-center gap-3 border-b border-halo-line py-2.5 last:border-b-0">
      <DaysRing days={days} horizon={horizon} size={38} stroke={3.5} label={ringLabel} />
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium">{label}</div>
        <div className="truncate text-[11.5px] text-ink-3">{sub}</div>
      </div>
      <span className={cn('shrink-0 text-right text-[12px]', calm ? 'text-ink-3' : days < 0 ? 'font-medium text-deep-r' : 'font-medium text-deep-a')}>
        {days < 0 ? `dépassé de ${-days} j` : calm ? 'à jour' : `dans ${days} j`}
      </span>
    </div>
  );
}

export function VehicleCard({ v, onKm, saved }: { v: Vehicle; onKm: () => void; saved?: boolean }) {
  const employees = useBrix((s) => s.employees);
  const driver = employees.find((e) => e.id === v.driverId);
  const kmLeft = v.nextServiceKm - v.km;
  const electric = v.energy.toLowerCase().startsWith('élec');
  return (
    <Card interactive className="relative isolate flex flex-col overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute -right-10 -top-14 -z-10 h-40 w-52 rounded-full bg-[radial-gradient(closest-side,#dcf5ea,transparent)] opacity-90 blur-lg" />
      <div className="flex items-start gap-3 p-5 pb-3">
        <IconTile icon={<Car />} dept="achats" size="lg" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-semibold tracking-[-0.015em]">{v.name}</div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-ink-2">
            <span className="rounded-full bg-white px-2 py-px font-mono text-[11.5px] font-medium tracking-wide text-ink shadow-[0_0_0_1px_#ece8f6]">{v.plate}</span>
            <span className="flex items-center gap-1">{electric && <Zap className="h-3 w-3 text-deep-g" />}{v.energy} · Crit’Air {v.critair.split(' ')[0]}</span>
          </div>
        </div>
        {driver && (
          <span className="flex shrink-0 flex-col items-center gap-0.5">
            <Avatar initials={driver.initials} color={driver.color} size={30} />
            <span className="text-[10.5px] text-ink-3">{driver.firstName}</span>
          </span>
        )}
      </div>

      <button onClick={onKm} className="group mx-4 flex min-h-[60px] items-center gap-3 rounded-card-sm bg-halo-track px-3.5 text-left transition-colors duration-300 hover:bg-[#ebe5f7]">
        <Gauge className="h-[18px] w-[18px] shrink-0 text-ink-3" />
        <span className="min-w-0 flex-1">
          <span className="num-halo flex items-center gap-2 text-[20px]">{num(v.km, 0)} km{saved && <SuccessDot size={16} />}</span>
          <span className="block text-[11.5px] text-ink-3">relevé {relative(v.kmAt)}</span>
        </span>
        <span className="shrink-0 rounded-full bg-white px-3 py-1.5 text-[12px] font-medium text-ink-2 shadow-pill transition-colors group-hover:text-ink">Mettre à jour</span>
      </button>

      <div className="mt-1 px-5 pb-2">
        <Row label="Entretien" days={daysTo(v.nextServiceDate)} horizon={kmLeft <= 1000 ? Math.max(30, daysTo(v.nextServiceDate)) : 30}
          ringLabel={kmLeft <= 1000 ? <span className="flex flex-col items-center leading-none text-deep-a"><span className="num text-[10.5px] font-semibold">{kmLeft >= 1000 ? `${Math.round(kmLeft / 100) / 10}k` : num(Math.max(0, kmLeft), 0)}</span><span className="text-[8px] font-medium opacity-70">km</span></span> : undefined}
          sub={`à ${num(v.nextServiceKm, 0)} km ou le ${dateFull(v.nextServiceDate)}`} />
        <Row label="Contrôle technique" days={daysTo(v.ctDate)} horizon={30} sub={dateFull(v.ctDate)} />
        <Row label="Assurance" days={daysTo(v.insuranceDate)} horizon={60} sub={`${v.insurer} · ${dateFull(v.insuranceDate)}`} />
      </div>
    </Card>
  );
}
