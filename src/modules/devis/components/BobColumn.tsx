import { useState } from 'react';
import { AlertTriangle, ArrowUp, Landmark, Mic, Percent, Plus, Receipt, TrendingUp, Undo2 } from 'lucide-react';
import { Button, IconTile, cn, toast, type HaloTone } from '@/components/ui';
import { BrandTile } from '@/components/brand/Logo';
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

const ICONS: Record<Suggestion['icon'], { tone: HaloTone; icon: JSX.Element }> = {
  alert: { tone: 'amber', icon: <AlertTriangle /> },
  trend: { tone: 'green', icon: <TrendingUp /> },
  percent: { tone: 'mag', icon: <Percent /> },
  aide: { tone: 'blue', icon: <Landmark /> },
  tva: { tone: 'violet', icon: <Receipt /> },
  plus: { tone: 'peach', icon: <Plus /> },
};

/** Bob signe avec le logo B (assistant calme, jamais d'étincelles). */
export function BobAvatar({ size = 32 }: { size?: number }) {
  return <BrandTile size={size} />;
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
      <div className="flex items-center gap-3 px-5 pb-1 pt-5">
        <BobAvatar size={34} />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="text-[15px] font-semibold tracking-[-0.02em]">Bob</div>
          <div className="truncate text-[12px] text-ink-3">connaît ce chantier et ta bibliothèque</div>
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <button onClick={onVoice} className="group flex w-full items-center gap-3 rounded-card-sm bg-pale-v/60 px-3 py-3 text-left transition duration-300 ease-out-quint hover:-translate-y-px hover:bg-pale-v">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-deep-v shadow-pill transition duration-300 ease-spring group-hover:scale-110">
            <Mic className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13.5px] font-medium">Dicter des lignes</span>
            <span className="block truncate text-[12px] text-ink-3">« huit disjoncteurs 16 A et six heures de pose »</span>
          </span>
        </button>

        {last.map((m) =>
          m.from === 'me' ? (
            <div key={m.id} className="ml-8 rounded-[18px] rounded-br-[6px] bg-ink px-3.5 py-2.5 text-[13px] text-white">
              {m.text}
            </div>
          ) : (
            <div key={m.id} className="animate-[fade-up_.3s_ease_both] rounded-card-sm bg-white p-3.5 shadow-halo-sm">
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
          <h6 className="mb-2.5 text-[12.5px] font-medium text-ink-2">{suggestions.length ? `${suggestions.length} conseil${suggestions.length > 1 ? 's' : ''} sur ce devis` : 'Conseils'}</h6>
          {suggestions.length === 0 && <p className="rounded-card-sm bg-pale-g/70 px-3 py-4 text-center text-[12.5px] text-deep-g">Rien à redire : ton devis est complet et bien margé.</p>}
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
        className="flex shrink-0 items-center gap-2 px-4 pb-4 pt-2"
      >
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Demande ou dicte à Bob…" className="h-11 min-w-0 flex-1 rounded-full bg-white px-4 text-[13.5px] shadow-[0_0_0_1px_#ece8f6] placeholder:text-ink-3 focus:shadow-[0_0_0_1.5px_#c4b5fd,0_0_0_5px_#f1eafe] focus:outline-none" aria-label="Demande à Bob" />
        {q.trim() ? (
          <button type="submit" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ink text-white transition active:scale-95" aria-label="Envoyer à Bob">
            <ArrowUp className="h-4 w-4" />
          </button>
        ) : (
          <button type="button" onClick={onVoice} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ink text-white transition active:scale-95" aria-label="Dicter à Bob">
            <Mic className="h-4 w-4" />
          </button>
        )}
      </form>
    </div>
  );
}

export function SuggestionCard({ s, onApply, onDismiss }: { s: Suggestion; onApply: () => void; onDismiss: () => void }) {
  const ic = ICONS[s.icon];
  return (
    <div className="rounded-card-sm bg-white p-3.5 shadow-halo-sm transition duration-300 ease-out-quint hover:-translate-y-px hover:shadow-[0_0_0_1px_#e3dcf3,0_10px_24px_-12px_rgba(60,30,120,.18)]">
      <div className="flex gap-3">
        <IconTile icon={ic.icon} tone={ic.tone} size="sm" />
        <p className="min-w-0 text-[13px] leading-relaxed text-ink-2">
          <b className="font-semibold text-ink">{s.title}</b> {s.text}
        </p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 pl-11">
        {s.action && (
          <Button size="sm" variant="soft" onClick={onApply} className="max-md:h-10">
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
