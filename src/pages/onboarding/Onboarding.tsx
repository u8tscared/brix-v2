import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Wordmark } from '@/components/brand/Logo';
import { Button, cn } from '@/components/ui';
import { MODULES, PLAN_ORDER, TRADE_BY_KEY, recommendModules, type Plan } from '@/lib/catalog';
import { useBrix } from '@/lib/store';
import type { TradeKey } from '@/lib/types';
import { OnboardingPreview } from './OnboardingPreview';
import { StepAccount, StepCompany, StepModules, StepPriorities, StepTrade, type Draft } from './steps';

const STEPS = ['Métier', 'Entreprise', 'Priorités', 'Outils', 'Accès'];

/** Inscription en 5 étapes : chaque réponse construit l'app de l'artisan, en direct. */
export default function Onboarding() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const complete = useBrix((s) => s.completeOnboarding);
  const [step, setStep] = useState(0);
  const [building, setBuilding] = useState(false);
  const [touchedModules, setTouchedModules] = useState(false);
  const pre = params.get('metier') as TradeKey | null;
  const [d, setD] = useState<Draft>({
    trade: pre && TRADE_BY_KEY[pre] ? pre : undefined,
    secondary: [],
    companyName: '',
    siret: '',
    address: '',
    city: '',
    priorities: [],
    enabled: [],
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    withDemo: true,
  });
  const set = (p: Partial<Draft>) => {
    if (p.enabled) setTouchedModules(true);
    setD((x) => ({ ...x, ...p }));
  };

  // Le pack de départ suit les réponses tant que l'artisan n'a pas retouché la liste.
  useEffect(() => {
    if (touchedModules) return;
    setD((x) => ({ ...x, enabled: recommendModules(x.trade ?? 'autre', x.size ?? 'solo', x.priorities) }));
  }, [d.trade, d.size, d.priorities, touchedModules]);

  const plan: Plan = useMemo(() => {
    const need = d.enabled.map((k) => MODULES.find((m) => m.key === k)!.plan);
    let p = need.reduce<Plan>((acc, x) => (PLAN_ORDER.indexOf(x) > PLAN_ORDER.indexOf(acc) ? x : acc), 'start');
    if (d.size === 'grande') p = 'entreprise';
    return p;
  }, [d.enabled, d.size]);

  const canNext = [!!d.trade, !!d.size && d.companyName.trim().length > 1, d.priorities.length > 0, d.enabled.length > 0, !!d.firstName.trim() && /.+@.+\..+/.test(d.email) && d.password.length >= 8][step];
  const hint = ['Choisissez votre métier', 'Indiquez le nom et la taille', 'Choisissez au moins une priorité', '', 'Prénom, e-mail et mot de passe'][step];

  const finish = () => {
    setBuilding(true);
    setTimeout(() => {
      const initials = d.companyName.split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
      complete({
        company: { name: d.companyName, legalName: d.companyName.toUpperCase(), siret: d.siret, address: d.address, city: d.city, trade: d.trade!, secondaryTrades: d.secondary, size: d.size!, employees: { solo: 1, petite: 4, pme: 20, grande: 80 }[d.size!], email: d.email, logoInitials: initials || 'B' },
        user: { firstName: d.firstName.trim(), lastName: d.lastName.trim(), email: d.email, role: 'patron' },
        priorities: d.priorities,
        enabled: d.enabled,
        plan,
        withDemoData: d.withDemo,
      });
      navigate('/app', { replace: true });
    }, 3200);
  };

  if (building) return <Building d={d} />;

  return (
    <div className="flex min-h-dvh bg-[#fbfaff]">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-line/60 bg-[#fbfaff]/90 pt-safe backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-[720px] items-center gap-4 px-5">
            <button onClick={() => (step ? setStep(step - 1) : navigate('/bienvenue'))} className="grid h-9 w-9 place-items-center rounded-full text-ink-2 hover:bg-white" aria-label="Retour">
              <ArrowLeft className="h-[18px] w-[18px]" />
            </button>
            <div className="flex flex-1 gap-1.5">
              {STEPS.map((s, i) => (
                <div key={s} className="flex-1">
                  <div className="h-1 overflow-hidden rounded-full bg-line2">
                    <div className={cn('h-full rounded-full bg-ink transition-all duration-500', i < step ? 'w-full' : i === step ? 'w-1/2' : 'w-0')} />
                  </div>
                  <div className={cn('mt-1.5 hidden text-[11px] font-medium sm:block', i <= step ? 'text-ink' : 'text-ink-3')}>{s}</div>
                </div>
              ))}
            </div>
            <Wordmark className="hidden h-5 md:block" />
          </div>
        </header>

        <main key={step} className="mx-auto w-full max-w-[720px] flex-1 animate-fade-up px-5 pb-36 pt-8 md:pt-12">
          {step === 0 && <StepTrade d={d} set={set} />}
          {step === 1 && <StepCompany d={d} set={set} />}
          {step === 2 && <StepPriorities d={d} set={set} />}
          {step === 3 && <StepModules d={d} set={set} plan={plan} />}
          {step === 4 && <StepAccount d={d} set={set} />}
        </main>

        <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-line/70 bg-white/90 pb-[var(--safe-b)] backdrop-blur-xl lg:right-[420px]">
          <div className="mx-auto flex h-[72px] max-w-[720px] items-center gap-3 px-5">
            <span className="hidden flex-1 text-[13px] text-ink-3 sm:block">{!canNext && hint}</span>
            <span className="flex-1 sm:hidden" />
            {step < 4 ? (
              <Button variant="primary" size="lg" disabled={!canNext} onClick={() => setStep(step + 1)} className="min-w-[160px] justify-center">
                Continuer <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button variant="dawn" size="lg" disabled={!canNext} onClick={finish} className="min-w-[200px] justify-center">
                Créer mon Brix
              </Button>
            )}
          </div>
        </footer>
      </div>

      <aside className="sticky top-0 hidden h-dvh w-[420px] shrink-0 items-center justify-center overflow-hidden border-l border-line bg-[radial-gradient(120%_90%_at_100%_0%,#ebe2fe_0%,#fde7f7_50%,#fff1e6_100%)] lg:flex">
        <div className="absolute left-8 right-8 top-8 text-[12.5px] leading-relaxed text-ink-2">
          <b className="block text-ink">Votre Brix se construit en direct</b>
          Chaque réponse ajoute ou retire des outils. Rien d'inutile dans votre menu.
        </div>
        <OnboardingPreview trade={d.trade} size={d.size} enabled={d.enabled} companyName={d.companyName} />
      </aside>
    </div>
  );
}

function Building({ d }: { d: Draft }) {
  const lines = [
    `Installation des outils ${TRADE_BY_KEY[d.trade ?? 'autre'].plural.toLowerCase()}`,
    'Bibliothèque de prix et modèles de devis',
    'Mentions légales et facture électronique',
    `${d.enabled.length} outils activés dans votre menu`,
    'Bob apprend votre entreprise',
  ];
  const [k, setK] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setK((x) => Math.min(lines.length, x + 1)), 600);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#fbfaff] px-6">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-[conic-gradient(from_0deg,#c4b5fd,#f0abfc,#fdba74,#c4b5fd)] opacity-30 blur-[90px]" />
      <div className="relative w-full max-w-[380px]">
        <Wordmark className="mb-8 h-8" />
        <h1 className="font-display text-[28px] font-semibold leading-tight tracking-[-0.03em]">
          On prépare le Brix de <span className="dawn-text">{d.companyName || 'votre entreprise'}</span>
        </h1>
        <ul className="mt-8 space-y-3.5">
          {lines.map((l, i) => (
            <li key={l} className={cn('flex items-center gap-3 text-[14px] transition-all duration-500', i < k ? 'text-ink opacity-100' : i === k ? 'text-ink-2 opacity-100' : 'translate-y-1 opacity-0')}>
              <span className={cn('grid h-6 w-6 place-items-center rounded-full transition', i < k ? 'bg-ink text-white' : 'border border-line2 bg-white')}>
                {i < k ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <span className="h-2 w-2 animate-ping rounded-full bg-vi-500" />}
              </span>
              {l}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
