import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowUpRight, CalendarClock, MapPin, Pin } from 'lucide-react';
import { Ring } from '@/components/motion';
import { cn } from '@/components/ui';
import { CHANTIER_STATUS } from '@/lib/status';
import type { ChantierStatus } from '@/lib/types';
import { useChantiersLocal, type ChantierPhoto } from '../../store';
import type { ChantierView } from '../../lib/useChantier';
import { PhotoArt } from '../common/PhotoArt';
import { TeamAvatars } from '../common/bits';

export const STATUS_DOT: Record<ChantierStatus, string> = {
  en_cours: '#7c3aed',
  a_planifier: '#9794aa',
  en_pause: '#d97706',
  reception: '#3730a3',
  termine: '#16a34a',
};

/** Couverture : dernière photo du chantier, sinon une trame chaude à la couleur du département. */
function Cover({ v, photo }: { v: ChantierView; photo?: ChantierPhoto }) {
  return (
    <div className="relative h-[118px] overflow-hidden bg-[#fff1e7]">
      {photo ? (
        <PhotoArt art={photo.art} phase={photo.phase} seed={photo.id + 'cv'} src={photo.src} className="transition-transform duration-700 ease-out-quint group-hover:scale-[1.04]" />
      ) : (
        <svg viewBox="0 0 300 118" preserveAspectRatio="xMidYMid slice" className="h-full w-full" aria-hidden>
          <defs>
            <pattern id={`hatch-${v.ch.id}`} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
              <path d="M0 0V10" stroke="#fdd9bf" strokeWidth="3" />
            </pattern>
          </defs>
          <rect width="300" height="118" fill={`url(#hatch-${v.ch.id})`} />
          <path d="M40 118V64l50-34 50 34v54" fill="#fff" opacity=".85" />
          <path d="M150 118V48h70v70" fill="#fff" opacity=".6" />
        </svg>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-[#130f26]/55 via-[#130f26]/5 to-transparent" />
      <span className="absolute left-3 top-3 inline-flex h-[22px] items-center gap-1.5 rounded-full bg-white/90 px-2 text-[11.5px] font-medium text-ink shadow-xs backdrop-blur">
        <i className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS_DOT[v.ch.status] }} />
        {CHANTIER_STATUS[v.ch.status].label}
      </span>
      {v.ch.pinned && (
        <span className="absolute right-3 top-3 grid h-[22px] w-[22px] place-items-center rounded-full bg-white/90 text-vi-700 shadow-xs">
          <Pin className="h-3 w-3" />
        </span>
      )}
      <span className="absolute bottom-2.5 left-3 right-20 flex items-center gap-1 truncate text-[12px] font-medium text-white/95">
        <MapPin className="h-3 w-3 shrink-0" />
        <span className="truncate">{v.ch.city || v.ch.address}</span>
      </span>
    </div>
  );
}

function Margin({ v }: { v: ChantierView }) {
  const d = v.m.marginDelta;
  const tone = d < -6 ? 'text-bad' : d < -2 ? 'text-warn' : 'text-ok';
  const bar = d < -6 ? 'bg-bad' : d < -2 ? 'bg-warn' : 'bg-ok';
  const scale = 60;
  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-baseline gap-1.5 text-[12px] text-ink-3">
        Marge <span className={cn('num text-[14px] font-semibold', tone)}>{Math.round(v.m.realMarginRate)} %</span>
        <span className="num">/ {Math.round(v.m.plannedMarginRate)} % prévu</span>
      </div>
      <div className="relative mt-1.5 h-1.5 overflow-hidden rounded-full bg-sub">
        <div className={cn('h-full origin-left animate-grow rounded-full', bar)} style={{ width: `${Math.max(3, Math.min(100, (v.m.realMarginRate / scale) * 100))}%` }} />
        <i className="absolute inset-y-0 w-[2px] bg-ink/70" style={{ left: `${Math.min(99, (v.m.plannedMarginRate / scale) * 100)}%` }} />
      </div>
    </div>
  );
}

export function ChantierCards({ rows }: { rows: ChantierView[] }) {
  const navigate = useNavigate();
  const photos = useChantiersLocal((s) => s.photos);
  const cover = (id: string) => {
    const mine = photos.filter((p) => p.chantierId === id);
    return mine.find((p) => p.phase === 'pendant') ?? mine.find((p) => p.phase === 'apres') ?? mine[0];
  };
  return (
    <div className="stagger-fast grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((v) => {
        const warn = v.m.marginDelta < -6 || v.m.delayDays > 1;
        const done = v.ch.status === 'termine';
        const left = v.m.daysLeft;
        return (
          <button key={v.ch.id} onClick={() => navigate(`/app/chantiers/${v.ch.id}`)} className="group lift press relative flex flex-col overflow-hidden rounded-[18px] bg-white text-left shadow-card">
            <Cover v={v} photo={cover(v.ch.id)} />
            <div className="relative flex flex-1 flex-col p-4 pt-3.5">
              <span className="absolute -top-8 right-3.5 rounded-full bg-white p-1 shadow-raise">
                <Ring value={v.ch.progress} size={52} stroke={4} tone={done ? 'ok' : 'dawn'}>
                  <span className="text-[12px] font-semibold tracking-[-0.02em]">{v.ch.progress}<span className="text-[9px] text-ink-3"> %</span></span>
                </Ring>
              </span>
              <div className="pr-16">
                <div className="truncate text-[15.5px] font-semibold tracking-[-0.02em]">{v.ch.name}</div>
                <div className="mt-0.5 truncate text-[12.5px] text-ink-3">{v.client?.name ?? 'Client'}</div>
              </div>
              <div className="mt-4 flex items-end gap-4">
                <Margin v={v} />
                <TeamAvatars team={v.team} size={26} max={3} />
              </div>
              <div className="mt-4 flex items-center gap-2 border-t border-line pt-3 text-[12.5px]">
                {warn ? <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warn" /> : <CalendarClock className="h-3.5 w-3.5 shrink-0 text-ink-3" />}
                <span className={cn('min-w-0 flex-1 truncate', warn ? 'text-warn' : 'text-ink-2')}>{v.ch.nextStep}</span>
                {!done && v.ch.status !== 'a_planifier' && (
                  <span className={cn('num shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-semibold', left < 0 ? 'bg-bad-bg text-bad' : left <= 3 ? 'bg-warn-bg text-warn' : 'bg-sub text-ink-2')}>
                    {left < 0 ? `+${-left} j` : left === 0 ? "aujourd'hui" : `J-${left}`}
                  </span>
                )}
                <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-3 opacity-0 transition duration-300 ease-out-quint group-hover:translate-x-0.5 group-hover:opacity-100 max-md:hidden" />
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
