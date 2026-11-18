// Briques partagées des feuilles d'envoi (devis et factures) : étapes, aperçu du mail, confirmation.

import { Fragment, type ReactNode } from 'react';
import { Check, FileText, Paperclip } from 'lucide-react';
import { Button, cn } from '@/components/ui';
import { DrawCheck } from '@/components/motion';

/** Étapes en pastilles (faite = vert avec coche, en cours = dégradé Aube), reliées par un filet qui verdit. */
export function Stepper({ steps, current, onGo }: { steps: string[]; current: number; onGo?: (i: number) => void }) {
  return (
    <ol className="mb-6 flex items-center gap-2.5">
      {steps.map((s, i) => (
        <Fragment key={s}>
          {i > 0 && <li aria-hidden className={cn('h-[1.5px] min-w-3 flex-1 rounded-full transition-colors duration-500', i <= current ? 'bg-[#bfe9d5]' : 'bg-[#e6e1f1]')} />}
          <li className="shrink-0">
            <button
              type="button"
              disabled={!onGo || i > current}
              onClick={() => onGo?.(i)}
              data-state={i < current ? 'done' : i === current ? 'on' : undefined}
              aria-current={i === current ? 'step' : undefined}
              className="step-halo rounded-full py-1 pr-1 disabled:cursor-default"
            >
              <b className={cn('transition-transform duration-300 ease-spring', i === current && 'scale-110')}>{i < current ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}</b>
              <span className="max-[380px]:sr-only">{s}</span>
            </button>
          </li>
        </Fragment>
      ))}
    </ol>
  );
}

/** Aperçu du mail tel que le client le recevra. */
export function MailPreview({ from, to, subject, body, cta, attachment, onAttachment, accent = '#15122a' }: { from: string; to: string; subject: string; body: string; cta?: string; attachment?: { name: string; meta: string }; onAttachment?: () => void; accent?: string }) {
  return (
    <div className="overflow-hidden rounded-card-sm bg-white shadow-halo-sm">
      <div className="space-y-1 border-b border-[#f2eff8] bg-[#faf8fe] px-4 py-3 text-[12.5px]">
        <div className="flex gap-2">
          <span className="w-10 shrink-0 text-ink-3">De</span>
          <span className="truncate text-ink">{from}</span>
        </div>
        <div className="flex gap-2">
          <span className="w-10 shrink-0 text-ink-3">À</span>
          <span className="truncate text-ink">{to || 'destinataire à renseigner'}</span>
        </div>
        <div className="flex gap-2">
          <span className="w-10 shrink-0 text-ink-3">Objet</span>
          <span className="truncate font-medium text-ink">{subject}</span>
        </div>
      </div>
      <div className="px-4 py-4">
        <p className="whitespace-pre-line text-[13px] leading-relaxed text-ink">{body.replace(/\s*\[lien\]\.?/g, '')}</p>
        {cta && (
          <div className="mt-4 flex justify-center">
            <span className="inline-flex h-11 items-center rounded-full px-6 text-[13.5px] font-semibold text-white" style={{ background: accent }}>
              {cta}
            </span>
          </div>
        )}
        {attachment && (
          <button type="button" onClick={onAttachment} className="group mt-4 flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-left shadow-[0_0_0_1px_#ece8f6] transition hover:bg-halo-hover">
            <span className="grid h-10 w-9 shrink-0 place-items-center rounded-[9px] bg-pale-r text-deep-r">
              <FileText className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium">{attachment.name}</span>
              <span className="block text-[11.5px] text-ink-3">{attachment.meta}</span>
            </span>
            <Paperclip className="h-4 w-4 text-ink-3 transition group-hover:text-ink" />
          </button>
        )}
      </div>
    </div>
  );
}

/** Écran de confirmation : anneaux concentriques, pastille Aube et coche qui se dessine. */
export function SendSuccess({ title, text, children, onClose }: { title: string; text: ReactNode; children?: ReactNode; onClose: () => void }) {
  return (
    <div className="relative isolate flex min-h-[min(560px,70dvh)] flex-col items-center justify-center px-2 pb-6 pt-12 text-center">
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[300px] w-[420px] max-w-full -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,#f6d2f8,#ece4fe_50%,transparent)] opacity-80 blur-2xl" />
      <div className="grid h-[116px] w-[116px] animate-[pop_.7s_var(--spring)_.1s_both] place-items-center rounded-full bg-white/60 shadow-[0_0_0_14px_rgba(255,255,255,.4),0_0_0_30px_rgba(255,255,255,.2)]">
        <div className="grid h-[78px] w-[78px] place-items-center rounded-full text-white shadow-[0_14px_30px_-10px_rgba(217,70,239,.8)]" style={{ background: 'var(--dawn-d)' }}>
          <DrawCheck className="h-9 w-9" delay={500} strokeWidth={2.6} />
        </div>
      </div>
      <h3 className="mt-9 animate-[fade-up_.45s_var(--ease)_.35s_both] text-[26px] font-semibold tracking-[-0.04em]">{title}</h3>
      <div className="mt-2 max-w-sm animate-[fade-up_.45s_var(--ease)_.45s_both] text-[14px] leading-relaxed text-ink-2">{text}</div>
      {children && <div className="mt-6 w-full animate-[fade-up_.45s_var(--ease)_.55s_both]">{children}</div>}
      <Button variant="primary" size="lg" className="mt-6 min-w-[180px] animate-[fade-up_.45s_var(--ease)_.6s_both] justify-center" onClick={onClose}>
        Terminé
      </Button>
    </div>
  );
}
