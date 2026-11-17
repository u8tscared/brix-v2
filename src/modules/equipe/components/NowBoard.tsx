// « Qui est où maintenant » : une carte par personne, statut en direct, temps sur place qui avance.
import { useState } from 'react';
import { BellRing, MapPin, Phone } from 'lucide-react';
import { Avatar, Badge, Button, cn, toast } from '@/components/ui';
import { LiveDot, SuccessDot } from '@/components/motion';
import { roleFromStore, roleName } from '../data';
import { NOW_LABEL, type TeamNow } from './useTeamNow';
import { hhmm, useNow } from '@/modules/finance/components/kit';

const sinceMin = (hhmmStr: string, now: Date) => {
  const [h, m] = hhmmStr.split(':').map(Number);
  return now.getHours() * 60 + now.getMinutes() - (h * 60 + m);
};

export function NowBoard({ team, onOpen }: { team: TeamNow[]; onOpen: (t: TeamNow) => void }) {
  const now = useNow(30000);
  const [reminded, setReminded] = useState<Record<string, boolean>>({});
  const remind = (t: TeamNow) => {
    setReminded((r) => ({ ...r, [t.emp.id]: true }));
    toast(`Rappel envoyé sur le téléphone de ${t.emp.firstName}`);
  };
  const order: Record<string, number> = { pas_pointe: 0, chantier: 1, bureau: 2, pause: 3, formation: 4, parti: 5, absent: 6 };
  const sorted = [...team].sort((a, b) => order[a.status] - order[b.status]);

  return (
    <div className="stagger grid grid-cols-1 gap-3 sm:grid-cols-2">
      {sorted.map((t) => {
        const st = NOW_LABEL[t.status];
        const live = t.status === 'chantier' || t.status === 'bureau';
        const missing = t.status === 'pas_pointe';
        const away = t.status === 'absent' || t.status === 'parti';
        const elapsed = t.since && (live || t.status === 'pause') ? sinceMin(t.since, now) : null;
        return (
          <div key={t.emp.id} className={cn('lift group relative flex flex-col overflow-hidden rounded-[18px] bg-white p-4 shadow-card', missing && 'shadow-[0_0_0_1px_#fde3b0,0_1px_2px_rgba(19,15,38,.04)]', away && 'bg-white/70')}>
            {missing && <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] bg-[#f59e0b]" />}
            <button onClick={() => onOpen(t)} className="flex items-start gap-3.5 text-left">
              <span className="relative">
                <Avatar initials={t.emp.initials} color={t.emp.color} size={48} className={cn(away && 'opacity-60 grayscale-[.4]')} />
                {live && <span className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full bg-white"><LiveDot /></span>}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-[15px] font-semibold tracking-[-0.015em]">{t.emp.firstName} {t.emp.lastName}</span>
                  <Badge tone={st.tone} dot={live} pulse={live}>{st.label}</Badge>
                </span>
                <span className="mt-0.5 block truncate text-[12.5px] text-ink-3">{roleName(roleFromStore(t.emp.role))}</span>
              </span>
            </button>

            <div className="mt-4 flex items-end justify-between gap-3 border-t border-dashed border-line pt-3.5">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 truncate text-[13px] font-medium">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-ink-3" />
                  <span className="truncate">{missing ? (t.planned ? `Prévu : ${t.planned}` : 'Rien de prévu') : t.place ?? 'Hors chantier'}</span>
                </div>
                <div className="mt-1 text-[12px] text-ink-3">
                  {elapsed !== null ? (
                    <>Arrivé à {t.since!.replace(':', ' h ')} · <span className="num font-medium text-ink-2">{hhmm(elapsed)}</span> sur place</>
                  ) : t.status === 'parti' && t.since ? (
                    <>Parti à {t.since.replace(':', ' h ')}</>
                  ) : missing ? (
                    'Pas encore d’arrivée enregistrée'
                  ) : (
                    'Aujourd’hui'
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {missing && t.planned && (reminded[t.emp.id] ? (
                  <span className="flex h-10 items-center gap-1.5 px-1 text-[12.5px] font-medium text-ok"><SuccessDot size={18} />Rappelé</span>
                ) : (
                  <Button size="sm" variant="soft" icon={<BellRing />} onClick={() => remind(t)}>Rappeler</Button>
                ))}
                <a href={`tel:${t.emp.phone.replace(/\s/g, '')}`} aria-label={`Appeler ${t.emp.firstName}`} className="grid h-10 w-10 place-items-center rounded-full text-ink-2 shadow-[0_0_0_1px_var(--line2)] transition hover:bg-sub hover:text-ink"><Phone className="h-4 w-4" /></a>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
