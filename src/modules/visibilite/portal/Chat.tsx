import { useEffect, useRef, useState } from 'react';
import { ArrowUp, Star } from 'lucide-react';
import { Avatar, Button, cn, Textarea } from '@/components/ui';
import { dateShort, todayISO, uid } from '@/lib/format';
import { usePortalLocal } from './data';

const fmt = (at: string) => `${at.slice(0, 10) === todayISO() ? "Aujourd'hui" : dateShort(at.slice(0, 10))} · ${at.slice(11, 16).replace(':', ' h ')}`;
const nowAt = () => {
  const d = new Date();
  return `${todayISO()}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export function Chat({ proName, proInitials }: { proName: string; proInitials: string }) {
  const { messages, addMessage } = usePortalLocal();
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) end.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages.length, typing]);

  const send = () => {
    if (!text.trim()) return;
    sent.current = true;
    addMessage({ id: uid('m'), from: 'client', text: text.trim(), at: nowAt() });
    setText('');
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      addMessage({ id: uid('m'), from: 'pro', text: 'Bien reçu, merci ! Je regarde ça et je vous réponds dans la journée.', at: nowAt() });
    }, 1800);
  };

  return (
    <div>
      <div className="space-y-2.5">
        {messages.slice(-6).map((m) => (
          <div key={m.id} className={cn('flex items-end gap-2', m.from === 'client' && 'flex-row-reverse')}>
            {m.from === 'pro' && <Avatar initials={proInitials} color="#1F389D" size={28} />}
            <div className={cn('max-w-[80%] rounded-[18px] px-3.5 py-2.5', m.from === 'pro' ? 'rounded-bl-md bg-sub' : 'rounded-br-md bg-brand text-white')}>
              <p className="text-[14px] leading-snug">{m.text}</p>
              <div className={cn('mt-1 text-[11px]', m.from === 'pro' ? 'text-ink-3' : 'text-white/70')}>{m.from === 'pro' ? `${proName} · ` : ''}{fmt(m.at)}</div>
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex items-end gap-2">
            <Avatar initials={proInitials} color="#1F389D" size={28} />
            <div className="flex gap-1 rounded-[18px] rounded-bl-md bg-sub px-4 py-3.5">{[0, 1, 2].map((i) => <i key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-3" style={{ animationDelay: `${i * 0.15}s` }} />)}</div>
          </div>
        )}
        <div ref={end} />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder={`Écrire à ${proName}…`} className="h-12 min-w-0 flex-1 rounded-full border border-line2 bg-white px-4 text-[15px] placeholder:text-ink-3 focus:border-vi-300 focus:outline-none focus:ring-4 focus:ring-vi-100" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); send(); } }} />
        <button onClick={send} disabled={!text.trim()} className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-ink text-white transition disabled:opacity-30" aria-label="Envoyer"><ArrowUp className="h-5 w-5" /></button>
      </div>
    </div>
  );
}

export function Review({ proName }: { proName: string }) {
  const { review, setReview } = usePortalLocal();
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  if (review) {
    return (
      <div className="text-center">
        <div className="flex justify-center gap-1">{[1, 2, 3, 4, 5].map((i) => <Star key={i} className={cn('h-6 w-6', i <= review.rating ? 'fill-[#f59e0b] text-[#f59e0b]' : 'text-line2')} />)}</div>
        <p className="mt-2 text-[14px] text-ink-2">Merci pour votre avis ! {review.rating >= 4 ? 'Il sera aussi proposé sur Google en un clic.' : `${proName} vous recontacte rapidement.`}</p>
      </div>
    );
  }
  return (
    <div>
      <div className="flex justify-center gap-1.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <button key={i} onClick={() => setRating(i)} className="grid h-12 w-12 place-items-center rounded-full transition active:scale-90" aria-label={`${i} étoile${i > 1 ? 's' : ''}`}>
            <Star className={cn('h-8 w-8 transition', i <= rating ? 'fill-[#f59e0b] text-[#f59e0b]' : 'text-line2')} strokeWidth={1.5} />
          </button>
        ))}
      </div>
      {rating > 0 && (
        <div className="mt-3 animate-fade-up space-y-2">
          <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Qu'avez-vous pensé du chantier ?" className="text-[15px]" />
          <Button variant="primary" size="lg" className="w-full justify-center" onClick={() => setReview({ rating, text })}>Envoyer mon avis</Button>
        </div>
      )}
    </div>
  );
}
