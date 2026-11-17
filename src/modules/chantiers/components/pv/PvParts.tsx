// Morceaux de l'écran PV : choix du chantier, étapes guidées, scène de réussite.

import { ArrowRight, Check, MapPin } from 'lucide-react';
import { Ring, SuccessDot } from '@/components/motion';
import { Button, cn } from '@/components/ui';
import { dateFull, dateShort } from '@/lib/format';
import type { Chantier } from '@/lib/types';
import type { Pv } from '../../store';

export function PvChooser({ chantiers, pvs, onPick }: { chantiers: Chantier[]; pvs: Pv[]; onPick: (id: string) => void }) {
  return (
    <div className="stagger-fast grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {chantiers.map((c) => {
        const p = pvs.find((x) => x.chantierId === c.id);
        const signed = !!p?.signedAt;
        const ready = !signed && c.progress >= 80;
        return (
          <button key={c.id} onClick={() => onPick(c.id)} className={cn('group lift press flex items-center gap-3.5 rounded-[16px] bg-white p-4 text-left shadow-card', ready && 'shadow-[0_0_0_1.5px_#d9c9fd,0_8px_24px_-14px_rgba(109,40,217,.4)]')}>
            {signed ? (
              <SuccessDot size={44} />
            ) : (
              <Ring value={c.progress} size={44} stroke={4} tone={ready ? 'dawn' : 'ink'}>
                {c.progress}
              </Ring>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14.5px] font-semibold tracking-[-0.015em]">{c.name}</span>
              <span className="mt-0.5 flex items-center gap-1 truncate text-[12.5px] text-ink-3">
                <MapPin className="h-3 w-3 shrink-0" />
                {signed ? `PV signé le ${dateShort(p!.signedAt!)}` : `fin prévue ${dateShort(c.endDate)}`}
              </span>
            </span>
            {ready ? (
              <span className="rounded-full bg-vi-50 px-2 py-1 text-[11.5px] font-semibold text-vi-700">Prêt</span>
            ) : (
              <ArrowRight className="h-4 w-4 shrink-0 text-ink-3 transition group-hover:translate-x-0.5" />
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Trois étapes visibles en haut : on sait toujours où on en est. */
export function PvSteps({ step }: { step: 0 | 1 | 2 | 3 }) {
  const steps = ['Le constat', 'Les signatures', 'Envoi au client'];
  return (
    <ol className="flex items-center gap-2 rounded-[14px] bg-white p-2 shadow-card">
      {steps.map((s, i) => {
        const done = step > i;
        const cur = step === i;
        return (
          <li key={s} className="flex min-w-0 flex-1 items-center gap-2">
            <span className={cn('flex min-w-0 flex-1 items-center gap-2 rounded-[10px] px-2.5 py-2 transition-colors duration-300', cur && 'bg-vi-50')}>
              <span className={cn('grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] font-semibold transition-all duration-300 ease-spring', done ? 'bg-ok text-white' : cur ? 'bg-ink text-white' : 'bg-sub text-ink-3')}>
                {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
              </span>
              <span className={cn('truncate text-[13px] font-medium', cur ? 'text-ink' : done ? 'text-ink-2' : 'text-ink-3')}>{s}</span>
            </span>
            {i < steps.length - 1 && <span className={cn('hidden h-px w-6 shrink-0 sm:block', done ? 'bg-ok' : 'bg-line2')} />}
          </li>
        );
      })}
    </ol>
  );
}

export function PvSuccess({ pv, clientName, onPrint, onBack }: { pv: Pv; clientName: string; onPrint: () => void; onBack: () => void }) {
  const n = pv.reserves.length;
  return (
    <div className="relative overflow-hidden rounded-[20px] bg-white px-6 py-8 text-center shadow-card md:py-10">
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-48 w-[520px] -translate-x-1/2 rounded-full bg-[#ecfdf3] blur-2xl" />
      <div className="relative mx-auto w-fit">
        <span className="absolute inset-0 animate-ping2 rounded-full bg-ok/20" />
        <SuccessDot size={64} />
      </div>
      <h2 className="relative mt-5 text-[22px] font-semibold tracking-[-0.03em]">Réception prononcée {n ? `avec ${n} réserve${n > 1 ? 's' : ''}` : 'sans réserve'}</h2>
      <p className="relative mx-auto mt-1.5 max-w-md text-[13.5px] leading-relaxed text-ink-2">
        Signé le {dateFull(pv.signedAt!)} et envoyé à {clientName}. Les garanties courent à partir d'aujourd'hui, le PV est rangé dans les documents du chantier.
      </p>
      <div className="relative mt-6 flex flex-wrap justify-center gap-2">
        <Button onClick={onPrint}>Imprimer ou PDF</Button>
        <Button variant="primary" iconRight={<ArrowRight className="h-4 w-4" />} onClick={onBack}>
          Retour au chantier
        </Button>
      </div>
    </div>
  );
}
