import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CalendarClock, ChevronRight, HardHat, MapPin, Pin } from 'lucide-react';
import { Badge, IconTile, Progress, cn } from '@/components/ui';
import { CHANTIER_STATUS } from '@/lib/status';
import { dateShort } from '@/lib/format';
import type { ChantierView } from '../../lib/useChantier';
import { MarginDelta, TeamAvatars } from '../common/bits';

function NextStep({ v }: { v: ChantierView }) {
  const warn = v.m.marginDelta < -6 || v.m.delayDays > 1;
  return (
    <span className={cn('flex min-w-0 items-center gap-1.5 text-[13px]', warn ? 'text-warn' : 'text-ink-2')}>
      {warn ? <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> : <CalendarClock className="h-3.5 w-3.5 shrink-0 text-ink-3" />}
      <span className="truncate">{v.ch.nextStep}</span>
    </span>
  );
}

export function ChantierTable({ rows }: { rows: ChantierView[] }) {
  const navigate = useNavigate();
  const open = (id: string) => navigate(`/app/chantiers/${id}`);
  return (
    <>
      {/* Ordinateur et tablette */}
      <div className="stagger-fast hidden space-y-2 lg:block">
        <div className="grid grid-cols-[34px_minmax(0,2.2fr)_88px_minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,1.6fr)_20px] items-center gap-4 px-4 pb-1 text-[12.5px] font-medium text-ink-2">
          <span />
          <span>Chantier</span>
          <span>Équipe</span>
          <span>Avancement</span>
          <span>Marge</span>
          <span>Prochaine étape</span>
          <span />
        </div>
        {rows.map((v) => (
          <button
            key={v.ch.id}
            onClick={() => open(v.ch.id)}
            className="row-card grid w-full grid-cols-[34px_minmax(0,2.2fr)_88px_minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,1.6fr)_20px] gap-4 text-left"
          >
            <IconTile size="row" dept="chantiers" icon={<HardHat />} />
            <span className="min-w-0">
              <span className="flex items-center gap-2">
                {v.ch.pinned && <Pin className="h-3 w-3 shrink-0 text-deep-v" />}
                <span className="truncate text-[14.5px] font-semibold tracking-[-0.015em]">{v.ch.name}</span>
                <Badge tone={CHANTIER_STATUS[v.ch.status].tone} className="hidden xl:inline-flex">{CHANTIER_STATUS[v.ch.status].label}</Badge>
              </span>
              <span className="mt-0.5 block truncate text-xs text-ink-3">
                {[v.client?.name ?? 'Client', [v.ch.address, v.ch.city].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}
              </span>
            </span>
            <TeamAvatars team={v.team} size={24} max={3} />
            <span className="flex items-center gap-2.5">
              <Progress value={v.ch.progress} className="flex-1" tone={v.ch.status === 'termine' ? 'ok' : 'dawn'} />
              <span className="num w-9 text-right text-xs text-ink-2">{v.ch.progress} %</span>
            </span>
            <MarginDelta real={v.m.realMarginRate} planned={v.m.plannedMarginRate} />
            <NextStep v={v} />
            <ChevronRight className="h-4 w-4 text-ink-3" />
          </button>
        ))}
      </div>

      {/* Téléphone */}
      <div className="grid gap-2.5 md:grid-cols-2 lg:hidden">
        {rows.map((v) => (
          <button key={v.ch.id} onClick={() => open(v.ch.id)} className="lift block w-full rounded-card bg-white p-4 text-left shadow-halo active:scale-[.99]">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[15px] font-semibold">{v.ch.name}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-1 truncate text-[12.5px] text-ink-3">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{[v.ch.address, v.ch.city].filter(Boolean).join(', ')}</span>
                </div>
              </div>
              <Badge tone={CHANTIER_STATUS[v.ch.status].tone}>{CHANTIER_STATUS[v.ch.status].label}</Badge>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <Progress value={v.ch.progress} className="flex-1" tone={v.ch.status === 'termine' ? 'ok' : 'dawn'} />
              <span className="num text-xs font-medium">{v.ch.progress} %</span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <TeamAvatars team={v.team} size={26} />
              <span className="text-[13px] text-ink-2">
                Marge <MarginDelta real={v.m.realMarginRate} planned={v.m.plannedMarginRate} compact />
              </span>
            </div>
            <div className="mt-3 border-t border-halo-line pt-2.5">
              <NextStep v={v} />
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

export const periodLabel = (v: ChantierView) => `${dateShort(v.ch.startDate)} → ${dateShort(v.ch.endDate)}`;
