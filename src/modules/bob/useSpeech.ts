// Reconnaissance vocale (Web Speech API, fr-FR) et lecture à voix haute.
// Si le navigateur ne sait pas écouter, `supported` vaut false et l'interface
// propose la saisie au clavier.

import { useCallback, useEffect, useRef, useState } from 'react';

type Rec = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};

const getCtor = (): (new () => Rec) | null => {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

export function useSpeech(onFinal: (text: string) => void) {
  const supported = !!getCtor();
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState('');
  const rec = useRef<Rec | null>(null);
  const finalRef = useRef('');
  const cb = useRef(onFinal);
  cb.current = onFinal;

  const stop = useCallback(() => rec.current?.stop(), []);

  const start = useCallback(() => {
    const C = getCtor();
    if (!C) return;
    try {
      rec.current?.abort();
      const r = new C();
      r.lang = 'fr-FR';
      r.interimResults = true;
      r.continuous = false;
      finalRef.current = '';
      r.onresult = (e) => {
        let txt = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i];
          if (res.isFinal) finalRef.current += res[0].transcript;
          else txt += res[0].transcript;
        }
        setInterim(finalRef.current + txt);
      };
      r.onerror = (e) => setError(e.error === 'not-allowed' ? 'Micro refusé : autorise-le dans ton navigateur, ou écris ta demande.' : 'Je n’ai pas bien entendu. Réessaie.');
      r.onend = () => {
        setListening(false);
        const t = finalRef.current.trim();
        setInterim('');
        if (t) cb.current(t);
      };
      rec.current = r;
      setError('');
      setListening(true);
      r.start();
    } catch {
      setListening(false);
      setError('Le micro n’est pas disponible ici. Écris ta demande.');
    }
  }, []);

  useEffect(() => () => rec.current?.abort(), []);
  return { supported, listening, interim, error, start, stop };
}

/** Lit un texte en français. Renvoie false si la synthèse vocale n'existe pas. */
export function speak(text: string, onEnd?: () => void): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'fr-FR';
  u.rate = 1.03;
  const fr = synth.getVoices().find((v) => v.lang.startsWith('fr'));
  if (fr) u.voice = fr;
  if (onEnd) u.onend = onEnd;
  synth.speak(u);
  return true;
}

export const stopSpeaking = () => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
};
