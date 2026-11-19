import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowUp, Keyboard, Mic, RotateCcw, Settings2, Square, X } from 'lucide-react';
import { Badge, IconTile, cn, toast } from '@/components/ui';
import type { DepartmentKey } from '@/lib/catalog';
import { useBrix } from '@/lib/store';
import { useUI } from '@/lib/ui';
import { useMediaQuery } from '@/components/layout/useMediaQuery';
import { etatIA } from './agent';
import { brancherNavigation, useChat } from './chat';
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

/** Panneau de conversation avec Brix AI : feuille à droite sur ordinateur, plein écran sur téléphone. */
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
      const reply = await useChat.getState().send(t, pathname, voiceRef.current);
      const parle = voiceRef.current && useBobLocal.getState().tone.speak && useBrix.getState().prefs.voice !== false;
      if (parle && reply.text) speak(reply.text);
    },
    [pathname],
  );

  const speech = useSpeech((t) => void send(t));

  // Brix AI en ligne ? (sinon moteur local) ; navigation demandée par Brix AI (ouvrir un écran).
  useEffect(() => {
    if (!open) return;
    void etatIA().then((v) => useChat.setState({ enLigne: v.disponible }));
    brancherNavigation((to) => navigate(to));
    return () => brancherNavigation(null);
  }, [open, navigate]);

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
  const busy = chat.thinking && chat.enLigne;

  return createPortal(
    <div className="fixed inset-0 z-[85]">
      <div className="absolute inset-0 hidden animate-[fade-up_.2s_ease_both] bg-[#1b1240]/20 backdrop-blur-[4px] md:block" onClick={close} />
      <section
        role="dialog"
        aria-label="Brix AI"
        className="absolute inset-0 flex animate-[fade-up_.28s_cubic-bezier(.2,.8,.2,1)_both] flex-col overflow-hidden bg-[#f7f5fc] md:inset-y-3 md:left-auto md:right-3 md:w-[460px] md:rounded-sheet md:bg-white/90 md:shadow-[0_1px_2px_rgba(60,30,120,.06),0_40px_90px_-24px_rgba(60,30,120,.45)] md:ring-1 md:ring-white md:backdrop-blur-2xl"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-48 opacity-70" aria-hidden>
          <div className="halo-bg h-full w-full" />
        </div>
        <header className="relative flex items-center gap-2.5 px-4 pb-3 pt-[calc(12px+var(--safe-t))] md:pt-4">
          <BobMark size={34} active={speech.listening || chat.thinking} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[16px] font-semibold tracking-[-0.02em]">Brix AI</span>
              {!chat.enLigne && <Badge tone="neutral" className="h-[19px] px-1.5 text-[10.5px]">Démo</Badge>}
            </div>
            <div className="truncate text-[12px] text-ink-3">{speech.listening ? 'Je t’écoute…' : chat.thinking ? 'Je regarde…' : 'Ton assistant, il agit pour toi'}</div>
          </div>
          {!empty && (
            <button onClick={() => { stopSpeaking(); chat.clear(); }} className="grid h-10 w-10 place-items-center rounded-full text-ink-3 transition hover:bg-white hover:text-ink hover:shadow-[0_0_0_1px_#ece8f6]" aria-label="Nouvelle conversation" title="Nouvelle conversation">
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
          <button onClick={() => go('/app/bob')} className="grid h-10 w-10 place-items-center rounded-full text-ink-3 transition hover:bg-white hover:text-ink hover:shadow-[0_0_0_1px_#ece8f6]" aria-label="Réglages de Brix AI" title="Tout ce que Brix AI sait faire">
            <Settings2 className="h-4 w-4" />
          </button>
          <button onClick={close} className="grid h-10 w-10 place-items-center rounded-full text-ink-2 transition hover:bg-white hover:text-ink hover:shadow-[0_0_0_1px_#ece8f6]" aria-label="Fermer">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="relative min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {empty && !voice && (
            <div className="animate-fade-in pt-3">
              <BobMark size={48} />
              <h2 className="mt-4 text-[26px] font-semibold leading-[1.08] tracking-[-0.042em]">Salut {firstName || 'toi'}, je fais quoi pour toi ?</h2>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">Parle-moi comme à un collègue. Je prépare, tu valides : rien ne part sans ton accord.</p>
              <div className="stagger-fast mt-5 grid grid-cols-3 gap-2">
                {QUICK.map((q) => (
                  <button key={q.label} onClick={() => send(q.ask(suggestions))} className="lift flex min-h-[88px] flex-col items-start justify-between rounded-card-sm bg-white p-3 text-left shadow-halo">
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

        <footer className="relative px-3 pb-[calc(10px+var(--safe-b))] pt-2">
          {voice ? (
            <div className="flex flex-col items-center">
              <div className="min-h-[22px] max-w-full truncate px-2 text-center text-[14px] text-ink-2">{speech.error || speech.interim || (speech.supported ? (speech.listening ? 'Parle normalement…' : 'Touche le bouton et parle') : 'Ton navigateur ne m’entend pas : écris ta demande.')}</div>
              {speech.supported ? (
                <div className="relative flex w-full items-center justify-center">
                  <button onClick={() => { speech.stop(); setVoice(false); setTimeout(() => inputRef.current?.focus(), 60); }} className="absolute left-0 grid h-12 w-12 place-items-center rounded-full bg-white text-ink-2 shadow-[0_1px_2px_rgba(60,30,120,.08),0_0_0_1px_#ece8f6]" aria-label="Écrire plutôt">
                    <Keyboard className="h-5 w-5" />
                  </button>
                  <VoiceOrb listening={speech.listening} onClick={toggleMic} size={isPhone ? 96 : 84} />
                </div>
              ) : (
                <TextInput refEl={inputRef} draft={draft} setDraft={setDraft} send={send} onMic={() => {}} micAvailable={false} busy={busy} onStop={chat.stop} />
              )}
              {!speech.supported && <button className="mt-2 text-[12.5px] text-ink-3 underline" onClick={() => setVoice(false)}>Revenir au clavier</button>}
            </div>
          ) : (
            <TextInput refEl={inputRef} draft={draft} setDraft={setDraft} send={send} micAvailable onMic={() => { setVoice(true); if (speech.supported) speech.start(); }} busy={busy} onStop={chat.stop} />
          )}
          <p className="mt-2 text-center text-[11px] text-ink-3">{chat.enLigne ? 'Brix AI peut se tromper : relis avant d’envoyer quoi que ce soit.' : 'Version de démo : Brix AI répond avec des réponses préparées.'}</p>
        </footer>
      </section>
    </div>,
    document.body,
  );
}

function TextInput({ refEl, draft, setDraft, send, onMic, micAvailable, busy = false, onStop }: { refEl: React.RefObject<HTMLInputElement>; draft: string; setDraft: (s: string) => void; send: (s: string) => void; onMic: () => void; micAvailable: boolean; busy?: boolean; onStop?: () => void }) {
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
          placeholder="Demande à Brix AI…"
          enterKeyHint="send"
          className="h-12 w-full rounded-full bg-white pl-5 pr-12 text-[15px] shadow-[0_1px_2px_rgba(60,30,120,.06),0_0_0_1px_#e6e1f1,0_10px_30px_-16px_rgba(60,30,120,.3)] placeholder:text-ink-3 focus:outline-none focus:shadow-[0_0_0_1px_#c4b5fd,0_0_0_4px_rgba(167,139,250,.22)]"
        />
        {micAvailable && (
          <button type="button" onClick={onMic} className="absolute right-1 top-1 grid h-10 w-10 place-items-center rounded-full text-ink-2 hover:bg-halo-hover hover:text-ink" aria-label="Parler">
            <Mic className="h-5 w-5" />
          </button>
        )}
      </div>
      {busy && onStop ? (
        <button type="button" onClick={onStop} className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-ink shadow-[0_1px_2px_rgba(60,30,120,.08),0_0_0_1px_#ece8f6] transition hover:-translate-y-px" aria-label="Arrêter" title="Arrêter">
          <Square className="h-4 w-4 fill-current" />
        </button>
      ) : (
      <button type="submit" disabled={!draft.trim()} className={cn('grid h-12 w-12 shrink-0 place-items-center rounded-full bg-ink text-white shadow-ink transition duration-300 ease-spring hover:-translate-y-px disabled:bg-halo-track disabled:text-ink-3 disabled:shadow-none')} aria-label="Envoyer">
        <ArrowUp className="h-5 w-5" />
      </button>
      )}
    </form>
  );
}
