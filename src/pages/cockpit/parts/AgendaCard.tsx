import { useNavigate } from 'react-router-dom';
import { CalendarDays, GraduationCap, HardHat, Ruler, Users, Wrench } from 'lucide-react';
import { LiveDot } from '@/components/motion';
import { Card, Chip, IconTile, cn, type HaloTone } from '@/components/ui';
import { useBrix } from '@/lib/store';
import type { PlanningEvent } from '@/lib/types';
import type { CockpitData } from '../useCockpitData';
import { CardTitle } from './CardTitle';

const KIND: Record<PlanningEvent['kind'], { tone: HaloTone; icon: JSX.Element }> = {
  chantier: { tone: 'peach', icon: <HardHat /> },
  rdv: { tone: 'blue', icon: <Ruler /> },
  sav: { tone: 'amber', icon: <Wrench /> },
  formation: { tone: 'cyan', icon: <GraduationCap /> },
  interne: { tone: 'violet', icon: <Users /> },
  absence: { tone: 'neutral', icon: <CalendarDays /> },
};
const hm = (h: string) => h.replace(':', ' h ');
const toMin = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));

/** Agenda du jour : les rendez-vous, chacun avec sa pastille, celui en cours marqué « en ce moment ». */
export function AgendaCard({ data, className }: { data: CockpitData; className?: string }) {
  const navigate = useNavigate();
  const chantiers = useBrix((s) => s.chantiers);
  const now = new Date().getHours() * 60 + new Date().getMinutes();
  const list = data.agenda.slice(0, 4);
  const n = data.agenda.length;
  return (
    <Card className={cn('p-5', className)} aria-label="Agenda du jour">
      <CardTitle title="Aujourd’hui" right={<Chip>{n ? `${n} rendez-vous` : 'Journée libre'}</Chip>} />
      {list.length === 0 ? (
        <p className="mt-4 text-[13px] leading-relaxed text-ink-3">Rien au planning aujourd’hui. Un bon moment pour faire vos devis.</p>
      ) : (
        <ul className="mt-2">
          {list.map((e, i) => {
            const [title, detail] = e.title.split('·').map((x) => x.trim());
            const ch = chantiers.find((c) => c.id === e.chantierId);
            const past = toMin(e.end) <= now;
            const live = toMin(e.start) <= now && toMin(e.end) > now;
            const k = KIND[e.kind];
            return (
              <li key={e.id} className="animate-[fade-up_.45s_var(--ease)_both]" style={{ animationDelay: `${200 + i * 70}ms` }}>
                <button onClick={() => navigate(e.chantierId ? `/app/chantiers/${e.chantierId}` : '/app/planning')} className={cn('group -mx-2 flex w-[calc(100%+16px)] items-center gap-3 rounded-[14px] px-2 py-2 text-left transition-colors hover:bg-halo-hover', past && 'opacity-55')}>
                  <IconTile icon={k.icon} tone={k.tone} size="row" className="transition-transform duration-300 ease-spring group-hover:scale-105" />
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[14px] font-semibold tracking-[-0.01em]">{title}</b>
                    <span className="block truncate text-[12.5px] text-ink-3">{detail ?? (ch ? `${ch.address}, ${ch.city}` : e.kind === 'rdv' ? 'Rendez-vous' : 'Planning')}</span>
                  </span>
                  {live ? (
                    <span className="inline-flex shrink-0 items-center gap-1.5 text-[12px] font-medium text-deep-g">
                      <LiveDot /> en cours
                    </span>
                  ) : (
                    <span className="num shrink-0 text-[13px] text-ink-2">{hm(e.start)}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <button onClick={() => navigate('/app/planning')} className="mt-2 inline-flex h-9 items-center rounded-full px-0 text-[12.5px] font-medium text-ink-2 transition hover:text-ink">
        {n > list.length ? `Voir les ${n - list.length} autres dans le planning` : 'Ouvrir le planning'}
      </button>
    </Card>
  );
}
