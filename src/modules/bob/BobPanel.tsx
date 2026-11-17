import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowUp, Keyboard, Mic, RotateCcw, Settings2, X } from 'lucide-react';
import { Badge, IconTile, cn, toast } from '@/components/ui';
import type { DepartmentKey } from '@/lib/catalog';
import { useBrix } from '@/lib/store';
import { useUI } from '@/lib/ui';
import { useMediaQuery } from '@/components/layout/useMediaQuery';
import { useChat } from './chat';
import { contextualSuggestions, type BobCardAction } from './engine';
import { useBobLocal } from './store';
import { devisExample } from './tradeExamples';
import { speak, stopSpeaking, useSpeech } from './useSpeech';
import { ChatThread, Suggestions } from './components/ChatThread';
import { BobMark, VoiceOrb } from './components/VoiceOrb';

const QUICK: { label: string; icon: string; dept: DepartmentKey; ask: (s: string[]) => string }[] = [
  { label: 'Faire un devis', icon: 'FileText', dept: 'vendre', ask: () => devisExample(useBrix.getState().company.trade) },
  { label: 'Relancer les retards', icon: 'BellRing', dept: 'facturer', ask: () => 'Qui est en retard de paiement ?' },
  { label: 'Mon planning', icon: 'CalendarRange', dept: 'equipe', ask: () => 'Qu’est-ce que j’ai demain ?' },
];

/** Panneau de conversation avec Bob : feuille à droite sur ordinateur, plein écran sur téléphone. */
export default function BobPanel() {
  const ui = useUI();
  const open = ui.bob;
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const firstName = useBrix((s) => s.user.firstName);
  const chat = useChat();
  const isPhone = !useMediaQuery('(min-width: 768px)');
  const [voice, setVoice] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const voiceRef = useRef(voice);
  voiceRef.current = voice;

  const send = useCallback(
    async (text: string) => {
      const t = text.trim();
      if (!t) return;
      setDraft('');
      const reply = await useChat.getState().send(t, pathname);
      if (voiceRef.current && useBobLocal.getState().tone.speak) speak(reply.text);
    },
    [pathname],
  );

  const speech = useSpeech((t) => void send(t));

  // Ouverture : mode voix demandé, question pré-remplie.
  useEffect(() => {
    if (!open) {
      speech.stop();
      stopSpeaking();
      return;
    }
    setVoice(ui.bobVoice);
    if (ui.bobPrompt) {
      void send(ui.bobPrompt);
      ui.set({ bobPrompt: '' });
    } else if (!ui.bobVoice) setTimeout(() => inputRef.current?.focus(), 120);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ui.bobVoice]);

  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && ui.set({ bob: false });
    window.addEventListener('keydown', k);
    const prev = document.body.style.overflow;
    if (isPhone) document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', k);
      document.body.style.overflow = prev;
    };
  }, [open, isPhone]);

  if (!open) return null;

  const close = () => ui.set({ bob: false });
  const go = (to: string) => {
    navigate(to);
    if (isPhone) close();
  };
  const onAction = (msgId: string, key: string, a: BobCardAction) => {
    if (a.to) return go(a.to);
    if (a.ask) return void send(a.ask);
    if (a.run) {
      const r = a.run() || 'C’est fait.';
      chat.markDone(msgId, key, r);
      toast(r);
    }
  };
  const toggleMic = () => (speech.listening ? speech.stop() : speech.start());
  const suggestions = contextualSuggestions(pathname);
  const empty = chat.messages.length === 0;

  return createPortal(
    <div className="fixed inset-0 z-[85]">
      <div className="absolute inset-0 hidden animate-[fade-up_.2s_ease_both] bg-[#17171f]/25 backdrop-blur-[2px] md:block" onClick={close} />
      <section
        role="dialog"
        aria-label="Bob"
        className="absolute inset-0 flex animate-[fade-up_.28s_cubic-bezier(.2,.8,.2,1)_both] flex-col bg-page md:inset-y-2 md:left-auto md:right-2 md:w-[460px] md:rounded-[18px] md:bg-[#f8f7fc] md:shadow-pop"
      >
        <header className="flex items-center gap-2.5 border-b border-line px-4 pb-3 pt-[calc(12px+var(--safe-t))] md:pt-3">
          <BobMark size={34} active={speech.listening || chat.thinking} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-display text-[16px] font-semibold">Bob</span>
              <Badge tone="neutral" className="h-[19px] px-1.5 text-[10.5px]">Démo</Badge>
            </div>
            <div className="truncate text-[12px] text-ink-3">{speech.listening ? 'Je t’écoute…' : chat.thinking ? 'Je regarde…' : 'Ton assistant, il agit pour toi'}</div>
          </div>
          {!empty && (
            <button onClick={chat.clear} className="grid h-10 w-10 place-items-center rounded-lg text-ink-3 hover:bg-white hover:text-ink" aria-label="Nouvelle conversation" title="Nouvelle conversation">
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
          <button onClick={() => go('/app/bob')} className="grid h-10 w-10 place-items-center rounded-lg text-ink-3 hover:bg-white hover:text-ink" aria-label="Réglages de Bob" title="Tout ce que Bob sait faire">
            <Settings2 className="h-4 w-4" />
          </button>
          <button onClick={close} className="grid h-10 w-10 place-items-center rounded-lg text-ink-2 hover:bg-white hover:text-ink" aria-label="Fermer">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {empty && !voice && (
            <div className="animate-fade-in pt-3">
              <BobMark size={48} />
              <h2 className="mt-4 text-[22px] font-semibold leading-tight tracking-[-0.03em]">Salut {firstName || 'toi'}, je fais quoi pour toi ?</h2>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">Parle-moi comme à un collègue. Je prépare, tu valides : rien ne part sans ton accord.</p>
              <div className="stagger-fast mt-5 grid grid-cols-3 gap-2">
                {QUICK.map((q) => (
                  <button key={q.label} onClick={() => send(q.ask(suggestions))} className="lift flex min-h-[84px] flex-col items-start justify-between rounded-[14px] bg-white p-3 text-left shadow-card">
                    <IconTile name={q.icon} dept={q.dept} size="sm" />
                    <span className="text-[12.5px] font-semibold leading-tight">{q.label}</span>
                  </button>
                ))}
              </div>
              <div className="mt-5 text-[11.5px] font-medium uppercase tracking-wide text-ink-3">Essaie</div>
              <Suggestions items={suggestions} onPick={send} className="mt-2" />
            </div>
          )}
          {empty && voice && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <BobMark size={44} active={speech.listening} />
              <h2 className="mt-4 text-[22px] font-semibold tracking-[-0.03em]">{speech.listening ? 'Je t’écoute' : `Dis-moi, ${firstName || 'chef'}`}</h2>
              <p className="mt-1 max-w-xs text-[13.5px] text-ink-2">Par exemple : « {suggestions[0]} »</p>
            </div>
          )}
          {!empty && <ChatThread messages={chat.messages} thinking={chat.thinking} onAction={onAction} onOpen={go} onPick={send} />}
        </div>

        <footer className="border-t border-line bg-white/70 px-4 pb-[calc(12px+var(--safe-b))] pt-3 backdrop-blur md:rounded-b-[18px]">
          {voice ? (
            <div className="flex flex-col items-center">
              <div className="min-h-[22px] max-w-full truncate px-2 text-center text-[14px] text-ink-2">{speech.error || speech.interim || (speech.supported ? (speech.listening ? 'Parle normalement…' : 'Touche le bouton et parle') : 'Ton navigateur ne m’entend pas : écris ta demande.')}</div>
              {speech.supported ? (
                <div className="relative flex w-full items-center justify-center">
                  <button onClick={() => { speech.stop(); setVoice(false); setTimeout(() => inputRef.current?.focus(), 60); }} className="absolute left-0 grid h-12 w-12 place-items-center rounded-full border border-line2 bg-white text-ink-2" aria-label="Écrire plutôt">
                    <Keyboard className="h-5 w-5" />
                  </button>
                  <VoiceOrb listening={speech.listening} onClick={toggleMic} size={isPhone ? 96 : 84} />
                </div>
              ) : (
                <TextInput refEl={inputRef} draft={draft} setDraft={setDraft} send={send} onMic={() => {}} micAvailable={false} />
              )}
              {!speech.supported && <button className="mt-2 text-[12.5px] text-ink-3 underline" onClick={() => setVoice(false)}>Revenir au clavier</button>}
            </div>
          ) : (
            <TextInput refEl={inputRef} draft={draft} setDraft={setDraft} send={send} micAvailable onMic={() => { setVoice(true); if (speech.supported) speech.start(); }} />
          )}
          <p className="mt-2 text-center text-[11px] text-ink-3">Version de démo : Bob répond avec des réponses préparées.</p>
        </footer>
      </section>
    </div>,
    document.body,
  );
}

function TextInput({ refEl, draft, setDraft, send, onMic, micAvailable }: { refEl: React.RefObject<HTMLInputElement>; draft: string; setDraft: (s: string) => void; send: (s: string) => void; onMic: () => void; micAvailable: boolean }) {
  return (
    <form
      className="flex w-full items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        send(draft);
      }}
    >
      <div className="relative min-w-0 flex-1">
        <input
          ref={refEl}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Demande à Bob…"
          enterKeyHint="send"
          className="h-12 w-full rounded-full border border-line2 bg-white pl-4 pr-12 text-[15px] placeholder:text-ink-3 focus:border-vi-300 focus:outline-none focus:ring-4 focus:ring-vi-100"
        />
        {micAvailable && (
          <button type="button" onClick={onMic} className="absolute right-1 top-1 grid h-10 w-10 place-items-center rounded-full text-ink-2 hover:bg-sub hover:text-ink" aria-label="Parler">
            <Mic className="h-5 w-5" />
          </button>
        )}
      </div>
      <button type="submit" disabled={!draft.trim()} className={cn('grid h-12 w-12 shrink-0 place-items-center rounded-full bg-ink text-white transition disabled:bg-line2 disabled:text-ink-3')} aria-label="Envoyer">
        <ArrowUp className="h-5 w-5" />
      </button>
    </form>
  );
}
