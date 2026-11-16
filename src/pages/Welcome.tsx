import { useNavigate } from 'react-router-dom';
import { ArrowRight, Play, ShieldCheck, Sparkles, Timer } from 'lucide-react';
import { Wordmark } from '@/components/brand/Logo';
import { Button } from '@/components/ui';
import { useBrix } from '@/lib/store';

/** Écran d'accueil de l'app (avant inscription) : créer son Brix ou essayer la démo. */
export default function Welcome() {
  const navigate = useNavigate();
  const onboarded = useBrix((s) => s.onboarded);
  const company = useBrix((s) => s.company.name);
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-[#fbfaff]">
      <div className="pointer-events-none absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-[#c4b5fd] opacity-40 blur-[120px]" />
      <div className="pointer-events-none absolute -right-32 top-24 h-[420px] w-[420px] rounded-full bg-[#f0abfc] opacity-40 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-180px] left-1/3 h-[420px] w-[520px] rounded-full bg-[#fdba74] opacity-35 blur-[130px]" />

      <header className="relative z-10 flex items-center justify-between px-6 pt-[calc(20px+var(--safe-t))] md:px-10">
        <Wordmark className="h-7" />
        {onboarded && (
          <button onClick={() => navigate('/app')} className="text-[13px] font-medium text-ink-2 hover:text-ink">
            Retour à {company || 'mon Brix'} →
          </button>
        )}
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-[680px] flex-1 flex-col justify-center px-6 py-12 text-center">
        <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-white bg-white/70 px-3 py-1.5 text-[12.5px] font-medium text-ink-2 shadow-card backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-ok" /> Facture électronique 2026-2027 incluse, même en gratuit
        </div>
        <h1 className="font-display text-[40px] font-semibold leading-[1.05] tracking-[-0.035em] md:text-[60px]">
          Votre entreprise,
          <br />
          <span className="dawn-text">réglée comme une horloge.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-[520px] text-[16px] leading-relaxed text-ink-2 md:text-[17px]">
          Devis à la voix, factures payées plus vite, chantiers, planning, équipe et paie. Brix s'adapte à votre métier et à votre taille, de l'auto-entrepreneur à 200 salariés.
        </p>
        <div className="mx-auto mt-9 flex w-full max-w-[420px] flex-col gap-3 sm:flex-row">
          <Button variant="dawn" size="lg" className="flex-1 justify-center" onClick={() => navigate('/inscription')}>
            Créer mon Brix <ArrowRight className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="lg" className="flex-1 justify-center" onClick={() => navigate('/demo')} icon={<Play className="h-4 w-4" />}>
            Voir la démo
          </Button>
        </div>
        <div className="mx-auto mt-10 grid max-w-[560px] grid-cols-3 gap-3 text-left">
          {[
            { i: Timer, t: '3 minutes', s: 'pour un Brix sur mesure' },
            { i: Sparkles, t: 'Bob', s: "l'assistant qui travaille la nuit" },
            { i: ShieldCheck, t: 'Sans engagement', s: 'gratuit pour démarrer' },
          ].map(({ i: I, t, s }) => (
            <div key={t} className="rounded-2xl border border-white bg-white/60 p-3 shadow-card backdrop-blur">
              <I className="mb-2 h-4 w-4 text-vi-700" />
              <div className="text-[13px] font-semibold">{t}</div>
              <div className="text-[12px] leading-snug text-ink-2">{s}</div>
            </div>
          ))}
        </div>
      </main>
      <footer className="relative z-10 pb-[calc(20px+var(--safe-b))] text-center text-xs text-ink-3">Brix · fait en France pour les artisans du bâtiment</footer>
    </div>
  );
}
