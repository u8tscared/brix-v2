// Briques partagées des feuilles d'envoi (devis et factures) : étapes, aperçu du mail, confirmation.

import type { ReactNode } from 'react';
import { FileText, Paperclip } from 'lucide-react';
import { Button, cn } from '@/components/ui';
import { SuccessDot } from '@/components/motion';

/** Étapes numérotées avec trait de progression qui se remplit. */
export function Stepper({ steps, current, onGo }: { steps: string[]; current: number; onGo?: (i: number) => void }) {
  return (
    <ol className="relative mb-5 grid" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0,1fr))` }}>
      <span aria-hidden className="absolute left-[calc(100%/var(--n)/2)] right-[calc(100%/var(--n)/2)] top-[13px] h-[2px] rounded-full bg-line" style={{ ['--n' as string]: steps.length }} />
      <span
        aria-hidden
        className="absolute left-[calc(100%/var(--n)/2)] top-[13px] h-[2px] rounded-full bg-ink transition-[width] duration-500 ease-out-quint"
        style={{ ['--n' as string]: steps.length, width: `calc((100% - 100% / ${steps.length}) * ${current / Math.max(1, steps.length - 1)})` }}
      />
      {steps.map((s, i) => (
        <li key={s} className="relative flex flex-col items-center gap-1.5">
          <button
            type="button"
            disabled={!onGo || i > current}
            onClick={() => onGo?.(i)}
            className={cn(
              'num grid h-7 w-7 place-items-center rounded-full text-[12px] font-semibold transition-all duration-300 ease-spring',
              i < current ? 'bg-ink text-white' : i === current ? 'scale-110 bg-ink text-white shadow-[0_0_0_4px_#e9e6f3]' : 'bg-white text-ink-3 shadow-[inset_0_0_0_1.5px_var(--line2)]',
            )}
            aria-current={i === current ? 'step' : undefined}
          >
            {i + 1}
          </button>
          <span className={cn('text-[12px] font-medium transition-colors', i <= current ? 'text-ink' : 'text-ink-3')}>{s}</span>
        </li>
      ))}
    </ol>
  );
}

/** Aperçu du mail tel que le client le recevra. */
export function MailPreview({ from, to, subject, body, cta, attachment, onAttachment, accent = '#15122a' }: { from: string; to: string; subject: string; body: string; cta?: string; attachment?: { name: string; meta: string }; onAttachment?: () => void; accent?: string }) {
  return (
    <div className="overflow-hidden rounded-[16px] bg-white shadow-card">
      <div className="space-y-1 border-b border-line bg-[#faf9fd] px-4 py-3 text-[12.5px]">
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
            <span className="inline-flex h-10 items-center rounded-[10px] px-5 text-[13.5px] font-semibold text-white" style={{ background: accent }}>
              {cta}
            </span>
          </div>
        )}
        {attachment && (
          <button type="button" onClick={onAttachment} className="group mt-4 flex w-full items-center gap-3 rounded-[12px] border border-line px-3 py-2.5 text-left transition hover:border-line2 hover:bg-[#faf9fd]">
            <span className="grid h-10 w-9 shrink-0 place-items-center rounded-[6px] bg-[#fdecef] text-[#be123c]">
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

/** Écran de confirmation après un envoi. */
export function SendSuccess({ title, text, children, onClose }: { title: string; text: ReactNode; children?: ReactNode; onClose: () => void }) {
  return (
    <div className="flex min-h-[min(560px,70dvh)] flex-col items-center justify-center px-2 pb-6 pt-12 text-center">
      <div className="relative">
        <span className="absolute inset-0 animate-[ping2_1.4s_cubic-bezier(0,0,.2,1)_.3s_2] rounded-full bg-ok/30" />
        <SuccessDot size={64} />
      </div>
      <h3 className="mt-5 animate-[fade-up_.45s_var(--ease)_.25s_both] text-[20px] font-semibold tracking-[-0.025em]">{title}</h3>
      <div className="mt-1.5 max-w-sm animate-[fade-up_.45s_var(--ease)_.35s_both] text-[13.5px] leading-relaxed text-ink-2">{text}</div>
      {children && <div className="mt-5 w-full animate-[fade-up_.45s_var(--ease)_.45s_both]">{children}</div>}
      <Button variant="primary" size="lg" className="mt-6 min-w-[180px] animate-[fade-up_.45s_var(--ease)_.5s_both] justify-center" onClick={onClose}>
        Terminé
      </Button>
    </div>
  );
}
