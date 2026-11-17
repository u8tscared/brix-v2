import { useState } from 'react';
import { AlertTriangle, Check, FileText, Infinity as InfinityIcon, RefreshCw, Upload } from 'lucide-react';
import { Badge, cn } from '@/components/ui';
import { Ring } from '@/components/motion';
import { docState, type Doc } from './store';

const TONE_RING = { ok: 'ok', warn: 'warn', bad: 'warn', neutral: 'ink' } as const;

/**
 * Un document du coffre : anneau de validité restante, état en clair.
 * On peut y glisser un fichier pour le remplacer directement.
 */
export function DocCard({ d, selecting, picked, fresh, fetching, onOpen, onDropFile, onToggle }: {
  d: Doc;
  selecting: boolean;
  picked: boolean;
  fresh: boolean;
  fetching: boolean;
  onOpen: () => void;
  onDropFile: (f: File) => void;
  onToggle: () => void;
}) {
  const st = docState(d);
  const [over, setOver] = useState(false);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={selecting ? onToggle : onOpen}
      onKeyDown={(e) => e.key === 'Enter' && (selecting ? onToggle() : onOpen())}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files?.[0]; if (f) onDropFile(f); }}
      className={cn(
        'group relative flex min-h-[78px] cursor-pointer items-center gap-3.5 rounded-[16px] bg-white px-4 py-3 text-left transition-[box-shadow,transform] duration-300 ease-out-quint',
        over ? 'scale-[1.01] shadow-[0_0_0_2px_#4f46e5,0_12px_28px_-14px_rgba(79,70,229,.5)]' : picked ? 'shadow-[0_0_0_2px_var(--ink)]' : 'shadow-card hover:shadow-raise',
        fresh && 'shadow-[0_0_0_2px_#16a34a,0_10px_24px_-14px_rgba(22,163,74,.6)]',
      )}
    >
      {selecting ? (
        <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 transition-all duration-300 ease-spring', picked ? 'scale-100 border-ink bg-ink text-white' : 'scale-90 border-line2 text-transparent')}>
          <Check className="h-5 w-5" strokeWidth={2.4} />
        </span>
      ) : (
        <Ring key={d.expires} value={st.tone === 'bad' ? 100 : st.tone === 'neutral' ? 0 : st.pct} size={46} stroke={4} tone={TONE_RING[st.tone]} className={cn(st.tone === 'bad' && '[&_circle:last-child]:!stroke-[#dc2626]')}>
          {fetching ? (
            <RefreshCw className="h-4 w-4 animate-spin text-[#4f46e5]" />
          ) : st.tone === 'bad' ? (
            <AlertTriangle className="h-4 w-4 text-bad" />
          ) : st.tone === 'neutral' ? (
            <InfinityIcon className="h-4 w-4 text-ink-3" />
          ) : (
            <span className={cn('text-[10.5px]', st.tone === 'warn' ? 'text-warn' : 'text-ink-2')}>{st.short}</span>
          )}
        </Ring>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold tracking-[-0.01em]">{d.label}</div>
        <div className="truncate text-[12px] text-ink-3">{d.issuer}</div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {fresh ? (
            <Badge tone="ok" icon={<Check />}>Mis à jour</Badge>
          ) : st.tone === 'ok' ? (
            <span className="text-[12px] text-ink-2">{st.label}</span>
          ) : st.tone === 'neutral' ? (
            <span className="text-[12px] text-ink-3">{st.label}</span>
          ) : (
            <Badge tone={st.tone} dot>{st.label}</Badge>
          )}
          {d.auto && !fresh && <span className="text-[11.5px] text-ink-3">· récupéré par Bob</span>}
        </div>
      </div>
      {!selecting && (
        <span className="hidden shrink-0 items-center gap-1 text-[12px] font-medium text-ink-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100 md:flex">
          {over ? <><Upload className="h-3.5 w-3.5" />Déposer</> : <><FileText className="h-3.5 w-3.5" />Ouvrir</>}
        </span>
      )}
      {over && <span className="pointer-events-none absolute inset-0 grid place-items-center rounded-[16px] bg-[#eef0fd]/90 text-[13px] font-semibold text-[#3730a3]"><span className="flex items-center gap-2"><Upload className="h-4 w-4" />Remplacer ce document</span></span>}
    </div>
  );
}
