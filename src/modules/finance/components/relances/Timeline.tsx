// Frise « comment Bob relance » : l'échéance, puis chaque étape du scénario.
// Les clients en retard sont posés sur la frise, à leur nombre de jours de retard.
import { CalendarClock, Mail, MessageSquareText, Stamp } from 'lucide-react';
import { Avatar, Card, cn, Tip } from '@/components/ui';
import { useInView } from '@/components/motion';
import { initials } from '@/lib/format';
import { useBrix } from '@/lib/store';
import type { Facture } from '@/lib/types';
import { daysLate } from '@/modules/factures/lib/model';
import { useFactures } from '@/modules/factures/store';

const ICON = { email: Mail, sms: MessageSquareText, courrier: Stamp };
const WHAT = { email: 'Un mail poli avec le lien de paiement', sms: 'Un SMS court, le lien en un appui', courrier: 'Bob prépare la lettre, vous la validez' };

export function RelanceTimeline({ late }: { late: Facture[] }) {
  const fx = useFactures();
  const s = useBrix();
  const [ref, seen] = useInView<HTMLDivElement>();
  const steps = fx.steps.filter((x) => x.enabled);
  // Nœuds régulièrement espacés (lisible), clients placés entre deux étapes selon leur retard.
  const days = [0, ...steps.map((x) => x.day)];
  const nx = (k: number) => 7 + (k / Math.max(1, days.length - 1)) * 80;
  const pos = (d: number) => {
    let k = days.length - 1;
    while (k > 0 && d < days[k]) k--;
    if (k === days.length - 1) return `${nx(k) + Math.min(1, (d - days[k]) / 15) * 10}%`;
    return `${nx(k) + ((d - days[k]) / (days[k + 1] - days[k])) * (nx(k + 1) - nx(k))}%`;
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 pt-4 md:px-5">
        <h2 className="text-[16px] font-semibold tracking-[-0.025em]">Comment Bob relance</h2>
        <span className={cn('chip', fx.relanceAuto ? 'tone-green' : 'tone-neutral')}>{fx.relanceAuto ? 'Automatique, tous les jours à 9 h' : 'En pause : rien ne part sans vous'}</span>
      </div>

      {/* Ordinateur : frise horizontale */}
      <div ref={ref} className={cn('relative mx-5 mb-5 mt-12 hidden h-[150px] md:block', !fx.relanceAuto && 'opacity-60 grayscale')}>
        <div className="absolute inset-x-0 top-[18px] h-[3px] rounded-full bg-halo-track" />
        <div className="absolute left-[7%] top-[18px] h-[3px] rounded-full bg-[linear-gradient(90deg,#c4b5fd,#e9b8f5_45%,#fdba74_75%,#f43f5e)] transition-[width] duration-[1400ms] ease-out-quint" style={{ width: seen ? '93%' : '0%' }} />
        <Node left={`${nx(0)}%`} icon={<CalendarClock className="h-4 w-4" />} day="Échéance" title="Le client devait payer" text="Rien ne part avant." delay={0} seen={seen}  />
        {steps.map((st, i) => {
          const I = ICON[st.channel];
          return <Node key={st.id} left={`${nx(i + 1)}%`} icon={<I className="h-4 w-4" />} day={`J+${st.day}`} title={st.label} text={WHAT[st.channel]} delay={150 + i * 150} seen={seen} manual={st.channel === 'courrier'} />;
        })}
        {late.map((f, i) => {
          const c = s.clients.find((x) => x.id === f.clientId);
          return (
            <div key={f.id} className="absolute -top-[30px] -translate-x-1/2 transition-[opacity,transform] duration-500 ease-spring" style={{ left: pos(daysLate(f)), opacity: seen ? 1 : 0, transform: `translateX(-50%) translateY(${seen ? 0 : 8}px)`, transitionDelay: `${700 + i * 120}ms` }}>
              <Tip label={`${c?.name} · ${daysLate(f)} j de retard`}>
                <span className="flex flex-col items-center">
                  <Avatar initials={initials(c?.name ?? '?')} size={24} color="#fff" className="shadow-[0_0_0_2px_#f59e0b]" />
                  <span className="h-2 w-px bg-[#f59e0b]" />
                </span>
              </Tip>
            </div>
          );
        })}
      </div>

      {/* Téléphone : frise verticale */}
      <ol className={cn('relative mx-4 mb-4 mt-4 space-y-4 border-l-2 border-halo-line pl-5 md:hidden', !fx.relanceAuto && 'opacity-60')}>
        <MobileNode icon={<CalendarClock className="h-3.5 w-3.5" />} day="Échéance" title="Le client devait payer" text="Rien ne part avant." />
        {steps.map((st) => {
          const I = ICON[st.channel];
          const here = late.filter((f) => {
            const d = daysLate(f);
            const next = steps.find((x) => x.day > st.day);
            return d >= st.day && (!next || d < next.day);
          });
          return <MobileNode key={st.id} icon={<I className="h-3.5 w-3.5" />} day={`J+${st.day}`} title={st.label} text={WHAT[st.channel]} who={here.map((f) => s.clients.find((c) => c.id === f.clientId)?.name ?? '')} />;
        })}
      </ol>
    </Card>
  );
}

function Node({ left, icon, day, title, text, delay, seen, first, manual }: { left: string; icon: React.ReactNode; day: string; title: string; text: string; delay: number; seen: boolean; first?: boolean; manual?: boolean }) {
  return (
    <div className={cn('absolute top-0 w-[150px] transition-[opacity,transform] duration-500 ease-out-quint', first ? '' : '-translate-x-1/2')} style={{ left, opacity: seen ? 1 : 0, transform: `${first ? '' : 'translateX(-50%) '}translateY(${seen ? 0 : 6}px)`, transitionDelay: `${delay}ms` }}>
      <span className={cn('relative grid h-10 w-10 place-items-center rounded-tile bg-white text-deep-v shadow-halo', !first && 'mx-auto', manual && 'bg-pale-r text-deep-r')}>{icon}</span>
      <div className={cn('mt-2.5', !first && 'text-center')}>
        <div className="num text-[11.5px] font-semibold text-ink-3">{day}</div>
        <div className="text-[13px] font-medium leading-tight">{title}</div>
        <div className="mt-0.5 text-[11.5px] leading-snug text-ink-3">{text}</div>
      </div>
    </div>
  );
}

function MobileNode({ icon, day, title, text, who = [] }: { icon: React.ReactNode; day: string; title: string; text: string; who?: string[] }) {
  return (
    <li className="relative">
      <span className="absolute -left-[33px] top-0 grid h-6 w-6 place-items-center rounded-full bg-white text-deep-v shadow-halo-sm">{icon}</span>
      <div className="flex items-baseline gap-2">
        <span className="num text-[11.5px] font-semibold text-ink-3">{day}</span>
        <span className="text-[13.5px] font-medium">{title}</span>
      </div>
      <div className="text-[12px] text-ink-3">{text}</div>
      {who.length > 0 && <div className="mt-1 text-[12px] font-medium text-deep-a">En ce moment : {who.join(', ')}</div>}
    </li>
  );
}
