import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { HaloBackdrop } from '@/components/layout/HaloBackdrop';
import { TRADE_BY_KEY, recommendModules } from '@/lib/catalog';
import { useBrix } from '@/lib/store';
import type { TradeKey } from '@/lib/types';
import { BrandLogo } from '@/parcours/marque';
import '@/parcours/parcours.css';
import './onboarding.css';
import { EMPTY, PRET, STEPS, clear, firstOpen, load, missing, save, type Draft } from './draft';
import { finishOnboarding, type ClientImporte } from './finish';
import { Pret } from './Pret';
import { ApercuDesktop, ApercuMobile } from './preview/Apercu';
import { AccesStep } from './steps/AccesStep';
import { EntrepriseStep } from './steps/EntrepriseStep';
import { MetierStep } from './steps/MetierStep';
import { ModulesStep } from './steps/ModulesStep';
import { PrioritesStep } from './steps/PrioritesStep';

const parseStep = (v: string | null) => (v === 'pret' ? PRET : v && /^\d$/.test(v) ? Math.min(PRET - 1, Math.max(0, Number(v) - 1)) : null);

/** Inscription /inscription : 5 étapes, l'app se construit en direct pour le métier choisi, puis « Votre Brix est prêt ». */
export default function Onboarding() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const storeUser = useBrix((s) => s.user);
  const [saved] = useState(load);
  const metierParam = params.get('metier') as TradeKey | null;
  const fromSite = !!metierParam && !!TRADE_BY_KEY[metierParam];

  const [d, setD] = useState<Draft>(() => {
    const base = saved?.d ?? { ...EMPTY, firstName: storeUser.firstName, lastName: storeUser.lastName, email: storeUser.email };
    if (fromSite && !base.trade) return { ...base, trade: metierParam!, secondary: base.secondary.filter((x) => x !== metierParam) };
    return base;
  });
  const [touched, setTouched] = useState(saved?.touched ?? false);
  const [imported, setImported] = useState<ClientImporte[]>([]);
  const set = useCallback((p: Partial<Draft>) => {
    if (p.enabled) setTouched(true);
    setD((x) => ({ ...x, ...p }));
  }, []);

  // Étape lue dans l'adresse (?etape=2) : le bouton retour du téléphone et du navigateur fonctionne.
  const raw = parseStep(params.get('etape')) ?? saved?.step ?? 0;
  const step = firstOpen(d, raw);
  const [initialPret] = useState(step === PRET);
  const goTo = useCallback(
    (n: number, replace = false) => {
      const next: Record<string, string> = { etape: n === PRET ? 'pret' : String(n + 1) };
      if (metierParam) next.metier = metierParam;
      setParams(next, { replace });
    },
    [metierParam, setParams],
  );
  useEffect(() => {
    if (parseStep(params.get('etape')) !== step) goTo(step, true);
  }, [step]);

  // Sens de la transition (glissé vers la gauche en avançant, vers la droite en revenant).
  const prev = useRef(step);
  const dir = step >= prev.current ? 'fwd' : 'back';
  useEffect(() => {
    prev.current = step;
    window.scrollTo({ top: 0 });
    if (step < PRET) document.querySelector<HTMLElement>('#ob-main h1')?.focus({ preventScroll: true });
  }, [step]);

  // Le pack de départ suit les réponses tant que l'artisan n'a pas retouché la liste.
  useEffect(() => {
    if (touched) return;
    setD((x) => ({ ...x, enabled: recommendModules(x.trade ?? 'autre', x.size ?? 'solo', x.priorities) }));
  }, [d.trade, d.size, d.priorities, touched]);

  useEffect(() => save({ d, step, touched }), [d, step, touched]);

  const block = missing(step, d);
  const next = () => {
    if (block) return;
    if (step === PRET - 1) setD((x) => ({ ...x, accessOk: true }));
    goTo(step + 1);
  };
  const back = () => (step === 0 ? navigate('/bienvenue') : goTo(step - 1));
  const open = () => {
    finishOnboarding(d, imported);
    clear();
    navigate('/app', { replace: true });
  };

  // Entrée pour continuer (sauf sur un bouton, un lien ou un champ qui gère sa propre touche Entrée).
  const keyRef = useRef({ next, open, step, back });
  keyRef.current = { next, open, step, back };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.altKey && e.key === 'ArrowLeft') return keyRef.current.back();
      if (e.key !== 'Enter' || e.shiftKey || e.isComposing) return;
      // Sur une carte de choix, Entrée valide l'étape (Espace coche ou décoche).
      if (!t.closest('.ob-card') && t.closest('button, a, textarea, select, [data-enter="ignore"]')) return;
      e.preventDefault();
      keyRef.current.step === PRET ? keyRef.current.open() : keyRef.current.next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (step === PRET) {
    return (
      <div className="bx-root ob relative isolate min-h-dvh overflow-x-hidden">
        <HaloBackdrop />
        <header className="relative z-10 mx-auto flex h-16 max-w-[1040px] items-center px-4 pt-[env(safe-area-inset-top)] md:px-8">
          <BrandLogo size={24} />
        </header>
        <div className="relative z-10">
          <Pret d={d} set={set} imported={imported} setImported={setImported} onBack={() => goTo(PRET - 1)} onOpen={open} instant={initialPret} />
        </div>
      </div>
    );
  }

  return (
    <div className="bx-root ob relative isolate min-h-dvh lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,46%)]">
      <HaloBackdrop />
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-20 px-3 pt-[calc(10px+env(safe-area-inset-top))] md:px-6">
          <div className="glass mx-auto flex h-[60px] w-full max-w-[640px] items-center gap-4 rounded-[22px] px-4 md:gap-5 md:px-5">
            <span className="shrink-0 sm:hidden"><BrandLogo size={22} className="[&>span:last-child]:hidden" /></span>
            <span className="hidden shrink-0 sm:block"><BrandLogo size={24} /></span>
            <Progress step={step} done={!block} />
            <span className="num shrink-0 text-[12.5px] font-medium text-ink-3">{step + 1}/{STEPS.length}</span>
          </div>
        </header>

        <div className="mx-auto w-full max-w-[640px] px-4 pt-2 md:px-8 lg:hidden">
          <ApercuMobile d={d} />
        </div>

        <main id="ob-main" key={step} className={`mx-auto w-full max-w-[640px] flex-1 px-4 pb-40 pt-8 md:px-8 md:pt-12 ${dir === 'fwd' ? 'ob-step-fwd' : 'ob-step-back'}`}>
          <span className="sr-only" aria-live="polite">Étape {step + 1} sur {STEPS.length} : {STEPS[step].label}</span>
          {step === 0 && <MetierStep d={d} set={set} fromSite={fromSite} />}
          {step === 1 && <EntrepriseStep d={d} set={set} />}
          {step === 2 && <PrioritesStep d={d} set={set} />}
          {step === 3 && <ModulesStep d={d} set={set} touched={touched} onReset={() => setTouched(false)} />}
          {step === 4 && <AccesStep d={d} set={set} />}
        </main>

        <footer className="fixed inset-x-0 bottom-0 z-20 px-3 pb-[calc(10px+env(safe-area-inset-bottom))] md:px-6 lg:right-[46%]">
          {block && <p className="glass mx-auto mb-2 w-fit max-w-full rounded-full px-3.5 py-1.5 text-center text-[12px] font-medium text-ink-2 sm:hidden">{block}</p>}
          <div className="glass-strong mx-auto flex h-[68px] w-full max-w-[640px] items-center gap-3 rounded-[24px] px-2.5 md:px-3">
            <button type="button" onClick={back} className="ob-btn ob-btn-ghost h-12 w-12 shrink-0 px-0 sm:w-auto sm:px-4" aria-label={step === 0 ? 'Retour à l\'accueil' : 'Étape précédente'}>
              <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={1.75} /> <span className="hidden sm:inline">Retour</span>
            </button>
            <span className="hidden min-w-0 flex-1 truncate text-[13px] text-ink-3 sm:block" aria-live="polite">{block}</span>
            <span className="flex-1 sm:hidden" />
            {step < PRET - 1 ? (
              <button type="button" onClick={next} disabled={!!block} className="ob-btn ob-btn-ink h-12 min-w-0 flex-1 sm:min-w-[176px] sm:flex-none" title={block ?? undefined}>
                Continuer <ArrowRight className="h-4 w-4" strokeWidth={2} />
                <span className="ob-kbd">Entrée</span>
              </button>
            ) : (
              <button type="button" onClick={next} disabled={!!block} className="bx-btn-dawn ob-btn h-12 min-w-0 flex-1 sm:min-w-[200px] sm:flex-none" title={block ?? undefined}>
                Créer mon Brix <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </button>
            )}
          </div>
        </footer>
      </div>

      <aside className="sticky top-0 hidden h-dvh p-4 pl-2 lg:block">
        <ApercuDesktop d={d} step={step} />
      </aside>
    </div>
  );
}

function Progress({ step, done }: { step: number; done: boolean }) {
  return (
    <ol className="ob-steps" aria-label="Progression de l'inscription">
      {STEPS.map((s, i) => {
        const state = i < step ? 'done' : i === step ? 'on' : undefined;
        return (
          <Fragment key={s.key}>
            {i > 0 && (
              <span className="ob-link" aria-hidden>
                <i style={{ transform: `scaleX(${i < step ? 1 : i === step ? 0.5 : 0})` }} />
              </span>
            )}
            <li className="ob-pill" data-state={state} aria-current={i === step ? 'step' : undefined} title={s.label}>
              <b>{state === 'done' ? <Check className="h-3 w-3" strokeWidth={3} aria-hidden /> : i + 1}</b>
              <span>{s.label}</span>
              {i === step && <span className="sr-only">{done ? ' (complète)' : ''}</span>}
            </li>
          </Fragment>
        );
      })}
    </ol>
  );
}
