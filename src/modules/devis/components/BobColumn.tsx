import { useState } from 'react';
import { AlertTriangle, ArrowUp, Landmark, Mic, Percent, Plus, Receipt, TrendingUp, Undo2 } from 'lucide-react';
import { Button, cn, toast } from '@/components/ui';
import type { Client, Company, Devis } from '@/lib/types';
import { buildSuggestions, interpret, type Suggestion } from '../bob';
import { mainVat } from '../logic';
import { askBob } from '../service';
import { useDevisMeta, useMeta } from '../store';

export interface BobMsg {
  id: string;
  from: 'bob' | 'me';
  text: string;
  undo?: Devis['lines'];
  undoPatch?: Partial<Devis>;
}

const ICONS: Record<Suggestion['icon'], JSX.Element> = {
  alert: <AlertTriangle className="h-4 w-4 text-warn" />,
  trend: <TrendingUp className="h-4 w-4 text-ink-2" />,
  percent: <Percent className="h-4 w-4 text-ink-2" />,
  aide: <Landmark className="h-4 w-4 text-ink-2" />,
  tva: <Receipt className="h-4 w-4 text-ink-2" />,
  plus: <Plus className="h-4 w-4 text-ink-2" />,
};

export function BobAvatar({ size = 32 }: { size?: number }) {
  return (
    <span className="grid shrink-0 place-items-center rounded-full bg-ink text-white" style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 24" className="h-[45%] w-[45%]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2" />
      </svg>
    </span>
  );
}

export function useBobSuggestions(d: Devis, client: Client | undefined, company: Company) {
  const meta = useMeta(d.id);
  return buildSuggestions(d, client, company).filter((s) => !meta.dismissed.includes(s.key));
}

interface Props {
  d: Devis;
  client?: Client;
  company: Company;
  update: (p: Partial<Devis>) => void;
  onVoice: () => void;
  className?: string;
  messages: BobMsg[];
  setMessages: (fn: (m: BobMsg[]) => BobMsg[]) => void;
}

/** Colonne Bob : dernière action, suggestions qui modifient vraiment le devis, champ libre. */
export function BobColumn({ d, client, company, update, onVoice, className, messages, setMessages }: Props) {
  const suggestions = useBobSuggestions(d, client, company);
  const { log, dismiss } = useDevisMeta();
  const [q, setQ] = useState('');
  const [thinking, setThinking] = useState(false);
  const last = messages.slice(-3);

  const apply = (s: Suggestion) => {
    if (!s.action) return;
    const before = { lines: d.lines, aides: d.aides };
    const patch = s.action.apply(d);
    update(patch);
    log(d.id, s.action.done, 'bob');
    setMessages((m) => [...m, { id: s.key + Date.now(), from: 'bob', text: `${s.action!.done}. ${s.why ?? ''}`.trim(), undoPatch: before }]);
    toast(s.action.done);
  };

  const send = async (text: string) => {
    if (!text.trim()) return;
    setQ('');
    setMessages((m) => [...m, { id: 'me' + Date.now(), from: 'me', text }]);
    setThinking(true);
    await askBob();
    const r = interpret(text, d, { hourlyRate: company.hourlyRate, vat: mainVat(d.lines, company.defaultVat) });
    setThinking(false);
    if (r.patch) {
      const before = { lines: d.lines, depositPercent: d.depositPercent, validityDays: d.validityDays };
      update(r.patch);
      log(d.id, r.text.split('.')[0], 'bob');
      setMessages((m) => [...m, { id: 'bob' + Date.now(), from: 'bob', text: r.text, undoPatch: before }]);
    } else setMessages((m) => [...m, { id: 'bob' + Date.now(), from: 'bob', text: r.text }]);
  };

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
        <BobAvatar />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="text-[14px] font-semibold">Bob</div>
          <div className="truncate text-[12px] text-ink-3">connaît ce chantier et ta bibliothèque</div>
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <button onClick={onVoice} className="group flex w-full items-center gap-3 rounded-xl border border-line bg-[#fafafc] px-3 py-3 text-left transition hover:border-vi-200 hover:bg-vi-50/50">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-white transition group-hover:scale-105">
            <Mic className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13.5px] font-medium">Dicter des lignes</span>
            <span className="block truncate text-[12px] text-ink-3">« huit disjoncteurs 16 A et six heures de pose »</span>
          </span>
        </button>

        {last.map((m) =>
          m.from === 'me' ? (
            <div key={m.id} className="ml-8 rounded-xl rounded-br-sm bg-ink px-3 py-2 text-[13px] text-white">
              {m.text}
            </div>
          ) : (
            <div key={m.id} className="animate-[fade-up_.3s_ease_both] rounded-xl border border-line bg-white p-3">
              <div className="mb-1 flex items-center gap-1.5 text-[12px]">
                <BobAvatar size={18} />
                <b className="font-semibold">Bob</b>
                <span className="text-ink-3">· à l'instant</span>
              </div>
              <p className="text-[13px] leading-relaxed text-ink">{m.text}</p>
              {m.undoPatch && (
                <Button
                  size="sm"
                  className="mt-2"
                  icon={<Undo2 className="h-3.5 w-3.5" />}
                  onClick={() => {
                    update(m.undoPatch!);
                    log(d.id, 'Modification de Bob annulée', 'me');
                    setMessages((all) => all.map((x) => (x.id === m.id ? { ...x, undoPatch: undefined, text: `${x.text} (annulé)` } : x)));
                  }}
                >
                  Annuler
                </Button>
              )}
            </div>
          ),
        )}
        {thinking && (
          <div className="flex items-center gap-2 text-[12.5px] text-ink-3">
            <BobAvatar size={18} /> Bob regarde ton devis…
          </div>
        )}

        <div>
          <h6 className="mb-2 text-[11px] font-semibold uppercase tracking-[.06em] text-ink-3">{suggestions.length ? `Suggestions sur ce devis · ${suggestions.length}` : 'Suggestions'}</h6>
          {suggestions.length === 0 && <p className="rounded-xl border border-dashed border-line2 px-3 py-4 text-center text-[12.5px] text-ink-3">Rien à redire : ton devis est complet et bien margé.</p>}
          <div className="space-y-2.5">
            {suggestions.map((s) => (
              <SuggestionCard key={s.key} s={s} onApply={() => apply(s)} onDismiss={() => dismiss(d.id, s.key)} />
            ))}
          </div>
        </div>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(q);
        }}
        className="flex shrink-0 items-center gap-2 border-t border-line p-3"
      >
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Demande ou dicte à Bob…" className="h-11 min-w-0 flex-1 rounded-[10px] border border-line2 bg-white px-3 text-[13.5px] placeholder:text-ink-3 focus:border-vi-300 focus:outline-none focus:ring-4 focus:ring-vi-100" aria-label="Demande à Bob" />
        {q.trim() ? (
          <button type="submit" className="grid h-11 w-11 shrink-0 place-items-center rounded-[10px] bg-ink text-white" aria-label="Envoyer à Bob">
            <ArrowUp className="h-4 w-4" />
          </button>
        ) : (
          <button type="button" onClick={onVoice} className="grid h-11 w-11 shrink-0 place-items-center rounded-[10px] bg-ink text-white" aria-label="Dicter à Bob">
            <Mic className="h-4 w-4" />
          </button>
        )}
      </form>
    </div>
  );
}

export function SuggestionCard({ s, onApply, onDismiss }: { s: Suggestion; onApply: () => void; onDismiss: () => void }) {
  return (
    <div className="rounded-xl border border-line bg-white p-3">
      <div className="flex gap-2.5">
        <span className="mt-0.5 shrink-0">{ICONS[s.icon]}</span>
        <p className="text-[13px] leading-relaxed text-ink-2">
          <b className="font-semibold text-ink">{s.title}</b> {s.text}
        </p>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-2 pl-[26px]">
        {s.action && (
          <Button size="sm" onClick={onApply} className="max-md:h-10">
            {s.action.label}
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={onDismiss} className="text-ink-3 max-md:h-10">
          Ignorer
        </Button>
      </div>
    </div>
  );
}
