import { Check, Globe, Loader2 } from 'lucide-react';
import { Button, IconTile, cn } from '@/components/ui';
import { SITE_STEPS } from '../service';

/** Écran avant création : une maquette de site qui se construit au fil des étapes de Brix AI. */
export function SiteSetup({ step, onStart, url }: { step: number | null; onStart: () => void; url: string }) {
  const s = step ?? -1;
  const blocks = [
    { at: 0, el: <div className="flex items-center gap-2"><span className="h-5 w-5 rounded-md bg-[#be123c]" /><span className="h-2 w-20 rounded-full bg-[#15122a]/70" /><span className="ml-auto h-5 w-16 rounded-full bg-[#be123c]/80" /></div> },
    { at: 1, el: <div className="space-y-2 pt-3"><div className="h-3 w-3/4 rounded-full bg-[#15122a]/80" /><div className="h-3 w-1/2 rounded-full bg-[#15122a]/80" /><div className="h-2 w-2/3 rounded-full bg-[#15122a]/20" /><div className="mt-3 h-7 w-28 rounded-lg bg-[#be123c]" /></div> },
    { at: 2, el: <div className="grid grid-cols-3 gap-2 pt-3">{[0, 1, 2].map((i) => <div key={i} className="aspect-[4/3] rounded-lg bg-gradient-to-br from-[#fdecef] to-[#f9d0d8]" />)}</div> },
    { at: 3, el: <div className="grid grid-cols-2 gap-2 pt-3">{[0, 1].map((i) => <div key={i} className="rounded-lg bg-[#f6f5fb] p-2"><div className="flex gap-0.5">{[0, 1, 2, 3, 4].map((k) => <span key={k} className="h-1.5 w-1.5 rounded-full bg-[#f59e0b]" />)}</div><div className="mt-1.5 h-1.5 w-full rounded-full bg-[#15122a]/15" /><div className="mt-1 h-1.5 w-2/3 rounded-full bg-[#15122a]/15" /></div>)}</div> },
  ];
  return (
    <div className="grid items-center gap-8 [&>*]:min-w-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="animate-[fade-up_.5s_var(--ease)_both]">
        <IconTile name="Globe" dept="visibilite" size="xl" />
        <h2 className="mt-5 text-[30px] font-semibold leading-[1.04] tracking-[-0.045em] md:text-[40px]">Votre site internet,<br /><span className="text-halo-mute">prêt en une minute.</span></h2>
        <p className="mt-3 max-w-md text-[14.5px] leading-relaxed text-ink-2">Brix AI écrit les textes, choisit vos plus belles photos de chantier et ajoute vos avis Google. Les demandes de devis arrivent directement dans Brix.</p>
        {step === null ? (
          <Button variant="dawn" size="lg" className="mt-7" icon={<Globe />} onClick={onStart}>Créer mon site</Button>
        ) : (
          <ol className="mt-7 max-w-sm space-y-2.5">
            {SITE_STEPS.map((label, i) => (
              <li key={label} className={cn('flex items-center gap-3 text-[14px] transition-colors duration-300', i > s ? 'text-ink-3' : 'text-ink')}>
                <span className={cn('grid h-6 w-6 shrink-0 place-items-center rounded-full transition-all duration-300 ease-spring', i < s ? 'bg-pale-g text-deep-g' : i === s ? 'bg-dawn text-white shadow-dawn' : 'bg-halo-track')}>
                  {i < s ? <Check className="h-3.5 w-3.5 animate-pop" strokeWidth={2.6} /> : i === s ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <i className="h-1.5 w-1.5 rounded-full bg-[#d6cfe8]" />}
                </span>
                {label}
              </li>
            ))}
          </ol>
        )}
        <p className="mt-6 text-[12px] text-ink-3">Compris dans votre abonnement · hébergement sécurisé · sans engagement</p>
      </div>

      <div className="relative animate-[fade-up_.6s_var(--ease)_.1s_both]">
        <div aria-hidden className="absolute -inset-6 max-md:inset-x-0 rounded-[40px] bg-[radial-gradient(closest-side,#fbe0f1,transparent)] blur-md" />
        <div className="relative overflow-hidden rounded-card bg-white shadow-halo-lg md:rotate-[-1deg]">
          <div className="flex h-10 items-center gap-2 border-b border-halo-line bg-halo-track/60 px-3.5">
            <span className="flex gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" /><i className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" /><i className="h-2.5 w-2.5 rounded-full bg-[#28c840]" /></span>
            <span className="mx-auto truncate rounded-full bg-white px-3.5 py-1 text-[11.5px] text-ink-2 shadow-halo-sm">{url}</span>
          </div>
          <div className="min-h-[280px] space-y-1 p-5">
            {blocks.map((b, i) => (
              <div key={i} className={cn('transition-all duration-500 ease-out-quint', s >= b.at || step === null ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0', step === null && 'opacity-40')}>
                {s === b.at ? <div className="skeleton h-full min-h-[40px] rounded-lg">{b.el}</div> : b.el}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
