// Dictée vocale : Web Speech API (fr-FR) si le navigateur la propose, sinon une dictée
// de démonstration « jouée » mot à mot. En cas d'erreur du micro, bascule sur la démo.

import { useCallback, useEffect, useRef, useState } from 'react';
import { DEMO_DICTATION } from './voiceParser';

type Status = 'idle' | 'listening' | 'paused' | 'done';

interface SpeechRec {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  onaudiostart: (() => void) | null;
}

const getRecognition = (): (new () => SpeechRec) | undefined => {
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
};

export function useDictation(demoText = DEMO_DICTATION) {
  const [text, setText] = useState('');
  const [interim, setInterim] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [demo, setDemo] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const rec = useRef<SpeechRec | null>(null);
  const timer = useRef<number>();
  const demoWords = useRef<string[]>([]);
  const demoIdx = useRef(0);
  const statusRef = useRef<Status>('idle');
  statusRef.current = status;

  const stopDemo = () => window.clearInterval(timer.current);

  const runDemo = useCallback(() => {
    setDemo(true);
    setStatus('listening');
    if (!demoWords.current.length) demoWords.current = demoText.split(' ');
    stopDemo();
    timer.current = window.setInterval(() => {
      if (demoIdx.current >= demoWords.current.length) {
        stopDemo();
        setStatus('done');
        return;
      }
      demoIdx.current++;
      setText(demoWords.current.slice(0, demoIdx.current).join(' '));
    }, 210);
  }, [demoText]);

  const start = useCallback(() => {
    const R = getRecognition();
    if (!R || demo) {
      runDemo();
      return;
    }
    try {
      const r = new R();
      r.lang = 'fr-FR';
      r.continuous = true;
      r.interimResults = true;
      let base = text ? text + ' ' : '';
      r.onresult = (e) => {
        let fin = '';
        let mid = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i];
          if (res.isFinal) fin += res[0].transcript;
          else mid += res[0].transcript;
        }
        if (fin) {
          base = (base + fin).replace(/\s+/g, ' ');
          setText(base.trim());
        }
        setInterim(mid);
      };
      r.onerror = (e) => {
        rec.current = null;
        if (e.error === 'no-speech' || e.error === 'aborted') return;
        runDemo();
      };
      r.onend = () => {
        setInterim('');
        if (rec.current === r && statusRef.current === 'listening') setStatus('paused');
      };
      let audio = false;
      r.onaudiostart = () => {
        audio = true;
      };
      rec.current = r;
      r.start();
      setStatus('listening');
      // Micro muet ou bloqué sans message d'erreur : on bascule sur la démo
      window.setTimeout(() => {
        if (!audio && rec.current === r) {
          rec.current = null;
          r.abort();
          runDemo();
        }
      }, 2500);
    } catch {
      runDemo();
    }
  }, [demo, runDemo, text]);

  const pause = useCallback(() => {
    stopDemo();
    const r = rec.current;
    rec.current = null;
    r?.stop();
    setStatus('paused');
  }, []);

  const finish = useCallback(() => {
    stopDemo();
    const r = rec.current;
    rec.current = null;
    r?.stop();
    setStatus('done');
  }, []);

  const reset = useCallback(() => {
    pause();
    setText('');
    setInterim('');
    setElapsed(0);
    setDemo(false);
    demoIdx.current = 0;
    demoWords.current = [];
    setStatus('idle');
  }, [pause]);

  useEffect(() => {
    if (status !== 'listening') return;
    const t = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [status]);

  useEffect(
    () => () => {
      stopDemo();
      rec.current?.abort();
    },
    [],
  );

  return { text, setText, interim, status, demo, elapsed, start, pause, finish, reset, supported: !!getRecognition() };
}
