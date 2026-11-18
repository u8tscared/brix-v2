import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { Avatar, cn } from '@/components/ui';
import { capitalize, dateLong, dateShort, dayOffset } from '@/lib/format';
import type { Chantier, Employee, PlanningEvent } from '@/lib/types';
import { PhotoArt } from '@/modules/chantiers/components/common/PhotoArt';
import type { ArtKind, Phase } from '@/modules/chantiers/store';

export function PCard({ title, meta, children, className }: { title?: string; meta?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-card bg-white p-5 shadow-halo', className)}>
      {title && (
        <div className="mb-3.5 flex items-baseline gap-2">
          <h2 className="text-[18px] font-semibold tracking-[-0.03em]">{title}</h2>
          {meta && <span className="text-[12.5px] text-ink-3">{meta}</span>}
        </div>
      )}
      {children}
    </section>
  );
}

const STEPS = [
  { at: 0, label: 'Devis signé' },
  { at: 5, label: 'Acompte réglé' },
  { at: 10, label: 'Démarrage du chantier' },
  { at: 30, label: 'Saignées et passage des câbles' },
  { at: 55, label: 'Pose du nouveau tableau' },
  { at: 75, label: 'Prises, interrupteurs et spots' },
  { at: 90, label: 'Contrôle Consuel' },
  { at: 100, label: 'Réception des travaux' },
];

export function Steps({ chantier }: { chantier: Chantier }) {
  const cur = STEPS.findIndex((s, i) => chantier.progress >= s.at && (STEPS[i + 1]?.at ?? 101) > chantier.progress);
  return (
    <ol className="relative">
      {STEPS.map((s, i) => {
        const done = i < cur;
        const now = i === cur;
        return (
          <li key={s.label} className="relative flex gap-3 pb-4 last:pb-0">
            {i < STEPS.length - 1 && <span className={cn('absolute left-[11px] top-6 h-[calc(100%-16px)] w-0.5 rounded', done ? 'bg-[#a7e3c9]' : 'bg-halo-line')} />}
            <span className={cn('relative z-[1] grid h-6 w-6 shrink-0 place-items-center rounded-full', done ? 'bg-pale-g text-deep-g' : now ? 'bg-dawn text-white shadow-[0_4px_12px_-3px_rgba(217,70,239,.6)]' : 'bg-halo-track')}>
              {done ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : now ? <i className="h-2 w-2 rounded-full bg-white motion-safe:animate-pulse" /> : null}
            </span>
            <div className="min-w-0 pt-0.5">
              <div className={cn('text-[14px] leading-tight', done ? 'text-ink-2' : now ? 'font-semibold' : 'text-ink-3')}>{s.label}</div>
              {now && <div className="mt-0.5 text-[12.5px] font-medium text-deep-m">En cours</div>}
              {s.label === 'Contrôle Consuel' && !done && <div className="mt-0.5 text-[12.5px] text-ink-3">Prévu le {dateShort(dayOffset(8))}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function NextVisit({ next, team }: { next?: PlanningEvent; team: Employee[] }) {
  if (!next) return <p className="text-[14px] text-ink-2">Le prochain passage sera indiqué ici dès qu'il est planifié.</p>;
  const names = team.map((e) => e.firstName);
  return (
    <div className="flex items-center gap-4">
      <div className="grid h-[60px] w-[60px] shrink-0 place-items-center rounded-[18px] bg-pale-b text-center leading-none text-deep-b">
        <div>
          <div className="text-[11px] font-medium uppercase opacity-70">{new Date(next.date + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')}</div>
          <div className="num-halo mt-0.5 text-[24px]">{new Date(next.date + 'T12:00').getDate()}</div>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-semibold">{capitalize(dateLong(next.date))}, {Number(next.start.slice(0, 2))} h{next.start.slice(3) !== '00' ? ' ' + next.start.slice(3) : ''}</div>
        <div className="mt-0.5 text-[13px] text-ink-2">{names.length > 1 ? `${names.slice(0, -1).join(', ')} et ${names[names.length - 1]} viennent` : `${names[0] ?? "L'équipe"} vient`} chez vous</div>
        <div className="mt-2 flex -space-x-1.5">{team.map((e) => <Avatar key={e.id} initials={e.initials} color={e.color} size={26} ring />)}</div>
      </div>
    </div>
  );
}

const PHOTOS: { art: ArtKind; phase: Phase; label: string; d: number }[] = [
  { art: 'saignee', phase: 'pendant', label: 'Saignées du séjour', d: -1 },
  { art: 'spots', phase: 'pendant', label: 'Emplacement des spots', d: -1 },
  { art: 'prise', phase: 'pendant', label: 'Prises de la chambre', d: -2 },
  { art: 'tableau', phase: 'avant', label: 'Ancien tableau', d: -6 },
  { art: 'saignee', phase: 'avant', label: 'Couloir avant travaux', d: -6 },
];

export function Photos({ count }: { count: number }) {
  const [open, setOpen] = useState<number | null>(null);
  const p = open !== null ? PHOTOS[open] : null;
  return (
    <>
      <div className="-mx-5 flex snap-x gap-2.5 overflow-x-auto px-5 pb-1 scrollbar-none">
        {PHOTOS.map((ph, i) => (
          <button key={i} onClick={() => setOpen(i)} className="w-[150px] shrink-0 snap-start text-left">
            <div className="aspect-[4/5] overflow-hidden rounded-card-sm shadow-halo-sm"><PhotoArt art={ph.art} phase={ph.phase} seed={'portal' + i} /></div>
            <div className="mt-1.5 truncate text-[12.5px] font-medium">{ph.label}</div>
            <div className="text-[11.5px] text-ink-3">{capitalize(dateShort(dayOffset(ph.d)))}</div>
          </button>
        ))}
      </div>
      <div className="mt-2 text-[12.5px] text-ink-3">{count} photos au total, ajoutées par l'équipe</div>
      {p && (
        <div className="fixed inset-0 z-[90] flex flex-col bg-[#0b0b10]/95" onClick={() => setOpen(null)}>
          <button className="ml-auto mr-3 mt-3 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white" aria-label="Fermer"><X className="h-5 w-5" /></button>
          <div className="flex flex-1 items-center justify-center p-4"><div className="aspect-[4/5] w-full max-w-md overflow-hidden rounded-card"><PhotoArt art={p.art} phase={p.phase} seed={'portal' + open} /></div></div>
          <div className="pb-[calc(24px+var(--safe-b))] text-center text-white"><div className="font-medium">{p.label}</div><div className="text-[13px] text-white/60">{capitalize(dateLong(dayOffset(p.d)))}</div></div>
        </div>
      )}
    </>
  );
}
