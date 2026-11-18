import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Typewriter } from '@/components/motion';
import { BobCardView } from './BobCardView';
import { Activites } from './Activites';
import { BobMark } from './VoiceOrb';
import type { ChatMessage } from '../chat';
import type { BobCardAction } from '../engine';

// Réponses déjà « écrites » à l'écran : on ne rejoue pas l'effet machine à écrire en rouvrant le panneau.
const typed = new Set<string>();

export function Suggestions({ items, onPick, className = '' }: { items: string[]; onPick: (s: string) => void; className?: string }) {
  if (!items.length) return null;
  return (
    <div className={`stagger-fast flex flex-wrap gap-1.5 ${className}`}>
      {items.map((s) => (
        <button key={s} type="button" onClick={() => onPick(s)} className="group flex min-h-[36px] items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-left text-[12.5px] text-ink-2 shadow-halo-sm transition duration-300 ease-spring hover:-translate-y-px hover:text-ink hover:shadow-[0_0_0_1px_#e9b8f5,0_8px_20px_-10px_rgba(217,70,239,.35)] active:scale-[.98]">
          {s}
          <ArrowUpRight className="h-3 w-3 shrink-0 text-ink-3 transition group-hover:text-vi-700" />
        </button>
      ))}
    </div>
  );
}

function BobMessage({ m, last, thinking, onAction, onOpen, onPick }: { m: ChatMessage; last: boolean; thinking: boolean; onAction: (msgId: string, key: string, a: BobCardAction) => void; onOpen: (to: string) => void; onPick: (s: string) => void }) {
  // Bob en ligne : le texte arrive déjà au fil de l'eau, pas d'effet machine à écrire.
  const [ready, setReady] = useState(m.flux || typed.has(m.id));
  const writing = m.flux ? !!m.enCours : !ready;
  return (
    <div className="flex gap-2.5">
      <BobMark size={28} className="mt-0.5" active={m.flux && m.enCours} />
      <div className="min-w-0 flex-1 space-y-2.5">
        {m.activites && m.activites.length > 0 && <Activites items={m.activites} onOpen={onOpen} />}
        {(m.text || writing) && (
          <p className="whitespace-pre-line text-[14px] leading-relaxed text-ink">
            {ready ? m.text : <Typewriter text={m.text} speed={12} onDone={() => { typed.add(m.id); setReady(true); }} />}
            {writing && <i className="ml-0.5 inline-block h-[15px] w-[2px] translate-y-[2px] animate-pulse bg-[#d946ef]" aria-hidden />}
          </p>
        )}
        {m.note && <p className="text-[12.5px] text-ink-3">{m.note}</p>}
        {ready && (
          <div className="stagger space-y-2.5">
            {m.reply?.cards?.map((c, i) => (
              <BobCardView key={i} card={c} done={m.done?.[String(i)]} onOpen={onOpen} onAction={(a) => onAction(m.id, String(i), a)} />
            ))}
          </div>
        )}
        {ready && last && !thinking && m.reply?.suggestions && <Suggestions items={m.reply.suggestions} onPick={onPick} className="pt-0.5" />}
      </div>
    </div>
  );
}

export function ChatThread({ messages, thinking, onAction, onOpen, onPick }: {
  messages: ChatMessage[];
  thinking: boolean;
  onAction: (msgId: string, key: string, a: BobCardAction) => void;
  onOpen: (to: string) => void;
  onPick: (s: string) => void;
}) {
  const end = useRef<HTMLDivElement>(null);
  const lastBob = [...messages].reverse().find((m) => m.role === 'bob');
  // Suit le texte pendant qu'il s'écrit.
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    const t = setInterval(() => end.current?.scrollIntoView({ block: 'end' }), 400);
    const stop = setTimeout(() => clearInterval(t), 2600);
    return () => {
      clearInterval(t);
      clearTimeout(stop);
    };
  }, [messages.length, thinking]);
  // Bob en ligne : suit le texte diffusé, les pastilles et les cartes qui arrivent.
  const tail = messages[messages.length - 1];
  const tailSize = tail?.flux ? tail.text.length + (tail.activites?.length ?? 0) * 1000 + (tail.reply?.cards?.length ?? 0) * 100000 : 0;
  useEffect(() => {
    if (tailSize) end.current?.scrollIntoView({ block: 'end' });
  }, [tailSize]);

  return (
    <div className="space-y-5">
      {messages.map((m) =>
        m.role === 'user' ? (
          <div key={m.id} className="flex justify-end">
            <div className="max-w-[85%] origin-bottom-right animate-[scale-in_.25s_var(--ease)_both] rounded-[20px] rounded-br-[6px] bg-ink px-4 py-2.5 text-[14px] leading-snug text-white shadow-ink">{m.text}</div>
          </div>
        ) : (
          <BobMessage key={m.id} m={m} last={m === lastBob} thinking={thinking} onAction={onAction} onOpen={onOpen} onPick={onPick} />
        ),
      )}
      {thinking && !(lastBob?.flux && lastBob.enCours && messages[messages.length - 1] === lastBob) && (
        <div className="flex animate-fade-in items-center gap-2.5">
          <BobMark size={28} active />
          <span className="skeleton h-3.5 w-40 rounded-full" aria-label="Bob réfléchit" />
        </div>
      )}
      <div ref={end} />
    </div>
  );
}
