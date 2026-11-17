import { useEffect, useRef } from 'react';
import { BobCardView } from './BobCardView';
import { BobMark } from './VoiceOrb';
import type { ChatMessage } from '../chat';
import type { BobCardAction } from '../engine';

export function Suggestions({ items, onPick, className = '' }: { items: string[]; onPick: (s: string) => void; className?: string }) {
  if (!items.length) return null;
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {items.map((s) => (
        <button key={s} type="button" onClick={() => onPick(s)} className="min-h-[36px] rounded-full border border-line2 bg-white px-3 py-1.5 text-left text-[12.5px] text-ink-2 transition hover:border-vi-200 hover:text-ink">
          {s}
        </button>
      ))}
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
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, thinking]);
  const lastBob = [...messages].reverse().find((m) => m.role === 'bob');

  return (
    <div className="space-y-4">
      {messages.map((m) =>
        m.role === 'user' ? (
          <div key={m.id} className="flex justify-end">
            <div className="max-w-[85%] animate-fade-up rounded-[16px] rounded-br-md bg-ink px-3.5 py-2.5 text-[14px] leading-snug text-white">{m.text}</div>
          </div>
        ) : (
          <div key={m.id} className="flex gap-2.5">
            <BobMark size={28} className="mt-0.5" />
            <div className="min-w-0 flex-1 space-y-2.5">
              <p className="animate-fade-up text-[14px] leading-relaxed text-ink">{m.text}</p>
              {m.reply?.cards?.map((c, i) => (
                <BobCardView key={i} card={c} done={m.done?.[String(i)]} onOpen={onOpen} onAction={(a) => onAction(m.id, String(i), a)} />
              ))}
              {m === lastBob && !thinking && m.reply?.suggestions && <Suggestions items={m.reply.suggestions} onPick={onPick} className="pt-0.5" />}
            </div>
          </div>
        ),
      )}
      {thinking && (
        <div className="flex items-center gap-2.5">
          <BobMark size={28} />
          <span className="flex gap-1" aria-label="Bob réfléchit">
            {[0, 0.15, 0.3].map((d) => (
              <i key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-3" style={{ animationDelay: `${d}s` }} />
            ))}
          </span>
        </div>
      )}
      <div ref={end} />
    </div>
  );
}
