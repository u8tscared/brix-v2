// Scène de lecture d'un ticket : la photo (ou un ticket d'exemple), un faisceau qui balaye pendant
// que Bob lit, puis les zones reconnues s'encadrent une à une et la liste se coche.
import { cn } from '@/components/ui';
import { DrawCheck } from '@/components/motion';
import { dateFull, money } from '@/lib/format';
import type { ReceiptSample } from '../fraisService';

const FOUND = ['Fournisseur', 'Date', 'Montant TTC', 'TVA', 'Catégorie'];

export function ReceiptScan({ preview, sample, reading, read, date }: { preview: string | null; sample?: ReceiptSample; reading: boolean; read: boolean; date: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_132px] gap-4 rounded-[16px] bg-[#f3f1f8] p-3 sm:grid-cols-[minmax(0,1fr)_150px]">
      <div className="relative h-[232px] overflow-hidden rounded-[12px] bg-[#e9e6f1]">
        {preview ? (
          <img src={preview} alt="Ticket" className="h-full w-full object-contain" />
        ) : (
          <FakeTicket sample={sample} date={date} read={read} />
        )}
        {reading && (
          <>
            <div className="pointer-events-none absolute inset-0 bg-vi-700/[.04]" />
            <div className="pointer-events-none absolute inset-x-3 h-12 animate-[receipt-scan_1.4s_ease-in-out_infinite] bg-gradient-to-b from-transparent via-vi-500/15 to-transparent">
              <div className="absolute inset-x-0 top-1/2 h-[2px] rounded-full bg-vi-500 shadow-[0_0_14px_2px_rgba(139,92,246,.6)]" />
            </div>
            {['left-2 top-2 border-l-2 border-t-2', 'right-2 top-2 border-r-2 border-t-2', 'bottom-2 left-2 border-b-2 border-l-2', 'bottom-2 right-2 border-b-2 border-r-2'].map((c) => (
              <span key={c} className={cn('absolute h-5 w-5 rounded-[3px] border-vi-500', c)} />
            ))}
          </>
        )}
      </div>
      <ol className="flex flex-col justify-center gap-2.5">
        <li className="mb-1 text-[11.5px] font-semibold uppercase tracking-[.08em] text-ink-3">{reading ? 'Bob lit…' : read ? 'Lu' : 'À lire'}</li>
        {FOUND.map((f, i) => (
          <li key={f} className="flex items-center gap-2 text-[12.5px]">
            <span className={cn('grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full transition-colors duration-300', read ? 'bg-ok text-white' : 'bg-white shadow-[inset_0_0_0_1px_var(--line2)]')} style={{ transitionDelay: read ? `${i * 140}ms` : '0ms' }}>
              {read && <DrawCheck className="h-3 w-3" delay={i * 140 + 80} strokeWidth={3} />}
              {reading && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-vi-400" style={{ animationDelay: `${i * 0.15}s` }} />}
            </span>
            <span className={cn('transition-colors', read ? 'text-ink' : 'text-ink-3')}>{f}</span>
          </li>
        ))}
      </ol>
      <style>{'@keyframes receipt-scan{0%,100%{top:-6%}50%{top:82%}}'}</style>
    </div>
  );
}

/** Ticket de caisse dessiné (démo). Les zones lues s'encadrent quand Bob a fini. */
function FakeTicket({ sample, date, read }: { sample?: ReceiptSample; date: string; read: boolean }) {
  if (!sample) return null;
  const ht = sample.amountTtc - sample.vat;
  const box = (_: number) => cn('rounded-[3px] transition-[box-shadow,background] duration-300', read && 'bg-vi-500/10 shadow-[0_0_0_1.5px_#8b5cf6]');
  const d = (i: number) => ({ transitionDelay: read ? `${i * 140}ms` : '0ms' });
  return (
    <div className="absolute inset-x-0 top-3 flex justify-center"><div className="animate-[fade-up_.5s_var(--ease)_both]"><div className="relative w-[178px] rotate-[-2deg] bg-white px-3.5 pb-6 pt-3.5 font-mono text-[9.5px] leading-[1.45] text-[#3b3850] shadow-[0_10px_24px_-10px_rgba(19,15,38,.35)]">
      <span aria-hidden className="absolute inset-x-0 -bottom-[5px] h-[6px] bg-[radial-gradient(circle_at_5px_0,#fff_4.5px,transparent_5px)] bg-[length:10px_6px] bg-repeat-x" />
      <div className={cn('text-center text-[10.5px] font-bold uppercase', box(0))} style={d(0)}>{sample.supplier}</div>
      <div className="mt-0.5 text-center text-[8.5px] text-[#9794aa]">SIRET 412 345 678 00021</div>
      <div className={cn('mx-auto mt-1 w-fit px-1 text-center', box(1))} style={d(1)}>{dateFull(date)} 08:42</div>
      <div className="my-1.5 border-t border-dashed border-[#cfcbdd]" />
      <div className="flex justify-between"><span>ARTICLES</span><span>{money(ht)}</span></div>
      <div className="flex justify-between text-[#9794aa]"><span>REMISE</span><span>0,00 €</span></div>
      <div className="my-1.5 border-t border-dashed border-[#cfcbdd]" />
      <div className={cn('flex justify-between px-0.5 text-[11px] font-bold', box(2))} style={d(2)}><span>TOTAL TTC</span><span>{money(sample.amountTtc)}</span></div>
      <div className={cn('mt-0.5 flex justify-between px-0.5', box(3))} style={d(3)}><span>dont TVA</span><span>{money(sample.vat)}</span></div>
      <div className="mt-2 text-center text-[8.5px] text-[#9794aa]">CB SANS CONTACT · MERCI</div>
      <div className="mx-auto mt-1.5 flex h-5 w-[120px] gap-[1.5px]">
        {Array.from({ length: 34 }).map((_, i) => <span key={i} className="h-full bg-[#3b3850]" style={{ width: (i * 7) % 3 === 0 ? 2 : 1 }} />)}
      </div>
    </div></div></div>
  );
}
