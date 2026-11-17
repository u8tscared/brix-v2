// Dictée vocale : utilise la reconnaissance vocale du navigateur (Chrome, Safari) quand elle existe,
// sinon simule une transcription (service.transcribe) pour la démo.

import { useCallback, useEffect, useRef, useState } from 'react';
import { transcribe } from '../../service';

type Rec = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

const getRecognition = (): (new () => Rec) | null => {
  const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

export function useDictation(opts: { continuous?: boolean; simulate?: () => string } = {}) {
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState('');
  const [seconds, setSeconds] = useState(0);
  const rec = useRef<Rec | null>(null);
  const timer = useRef<number>();
  const done = useRef<((t: string) => void) | null>(null);
  const heard = useRef('');

  useEffect(() => () => {
    rec.current?.abort();
    window.clearInterval(timer.current);
  }, []);

  const stopTimer = () => window.clearInterval(timer.current);

  const start = useCallback((onDone?: (t: string) => void) => {
    done.current = onDone ?? null;
    heard.current = '';
    setText('');
    setSeconds(0);
    setListening(true);
    timer.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    const R = getRecognition();
    if (!R) return; // mode simulé : la transcription arrive à stop()
    try {
      const r = new R();
      let failed = false;
      r.lang = 'fr-FR';
      r.interimResults = true;
      r.continuous = !!opts.continuous;
      r.onresult = (e) => {
        let t = '';
        for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
        heard.current = t;
        setText(t);
      };
      r.onend = () => {
        if (failed) return; // micro refusé ou indisponible : on reste en mode simulé
        rec.current = null;
        stopTimer();
        setListening(false);
        const t = heard.current;
        if (t) return done.current?.(t);
        // Rien entendu (micro coupé, bruit de chantier) : transcription de démonstration.
        setBusy(true);
        transcribe(null, opts.simulate?.()).then((x) => {
          setBusy(false);
          setText(x);
          done.current?.(x);
        });
      };
      r.onerror = () => {
        failed = true;
        rec.current = null;
      };
      rec.current = r;
      r.start();
    } catch {
      rec.current = null;
    }
  }, [opts.continuous, opts.simulate]);

  const stop = useCallback(async () => {
    stopTimer();
    if (rec.current) {
      rec.current.stop();
      rec.current = null;
      return;
    }
    setListening(false);
    setBusy(true);
    const t = await transcribe(null, opts.simulate?.());
    setBusy(false);
    setText(t);
    done.current?.(t);
  }, [opts.simulate]);

  return { listening, busy, text, setText, seconds, start, stop, native: typeof window !== 'undefined' && !!getRecognition() };
}

const UNITS: Record<string, number> = { zéro: 0, zero: 0, un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10, onze: 11, douze: 12, treize: 13, quatorze: 14, quinze: 15, seize: 16, vingt: 20, trente: 30, quarante: 40, cinquante: 50, soixante: 60, cent: 100 };

/** Convertit « 3,42 », « 3 mètres 42 », « trois mètres quarante-deux » ou « 342 centimètres » en mètres. */
export function parseMeters(input: string): number | null {
  let s = input.toLowerCase().replace(/-/g, ' ').replace(/\bet\b/g, ' ').trim();
  // mots → nombres
  s = s.replace(/[a-zéè]+(\s+[a-zéè]+)*/g, (chunk) => {
    const words = chunk.split(/\s+/);
    let out = '';
    let acc: number | null = null;
    for (const w of words) {
      if (w in UNITS) {
        const v = UNITS[w];
        acc = acc === null ? v : v === 100 ? acc * 100 : acc + v;
      } else {
        if (acc !== null) out += ` ${acc} `;
        acc = null;
        out += ` ${w} `;
      }
    }
    if (acc !== null) out += ` ${acc} `;
    return out;
  });
  const cm = s.match(/(\d+(?:[.,]\d+)?)\s*(cm|centim)/);
  if (cm) return Number(cm[1].replace(',', '.')) / 100;
  const mm = s.match(/(\d+)\s*(m|mètres?|metres?|virgule)\s*(\d{1,3})/);
  if (mm) return Number(`${mm[1]}.${mm[3].padStart(2, '0')}`);
  const n = s.match(/\d+(?:[.,]\d+)?/);
  if (!n) return null;
  const v = Number(n[0].replace(',', '.'));
  return v > 30 ? v / 100 : v; // « 342 » dit seul = centimètres
}
