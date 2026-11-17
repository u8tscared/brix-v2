import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, AudioLines, Play, ShieldCheck, Timer } from 'lucide-react';
import { BrandLogo } from '@/components/brand/Logo';
import { Button, Icon, cn } from '@/components/ui';
import { TRADES } from '@/lib/catalog';
import type { TradeKey } from '@/lib/types';
import { packFor } from '@/lib/demoTrades';
import { useBrix } from '@/lib/store';

const demoCompany = (t: TradeKey) => {
  const p = packFor(t);
  return p ? { name: p.company.name, boss: p.boss.first } : { name: 'Benali Électricité', boss: 'Karim' };
};

/** Écran d'accueil de l'app (avant inscription) : créer son Brix ou essayer la démo de son métier. */
export default function Welcome() {
  const navigate = useNavigate();
  const onboarded = useBrix((s) => s.onboarded);
  const company = useBrix((s) => s.company.name);
  const [trade, setTrade] = useState<TradeKey>('electricien');
  const demo = demoCompany(trade);

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-hidden bg-page">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[560px] overflow-hidden" aria-hidden>
        <div className="absolute -left-40 -top-40 h-[520px] w-[520px] animate-aurora rounded-full bg-[#c4b5fd] opacity-40 blur-[120px]" />
        <div className="absolute -right-32 top-10 h-[420px] w-[420px] animate-aurora rounded-full bg-[#f0abfc] opacity-35 blur-[120px] [animation-delay:-5s]" />
        <div className="absolute left-1/3 top-64 h-[320px] w-[520px] animate-aurora rounded-full bg-[#fdba74] opacity-30 blur-[130px] [animation-delay:-9s]" />
      </div>

      <header className="relative z-10 flex items-center justify-between px-5 pt-[calc(20px+var(--safe-t))] md:px-10">
        <BrandLogo size={30} />
        {onboarded ? (
          <button onClick={() => navigate('/app')} className="flex min-h-[44px] items-center gap-1 text-[13px] font-medium text-ink-2 transition hover:text-ink">
            Retour à {company || 'mon Brix'} <ArrowRight className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-[880px] flex-1 flex-col justify-center px-5 py-10 text-center md:py-10">
        <div className="mx-auto mb-6 inline-flex animate-[fade-up_.5s_var(--ease)_both] items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-[12.5px] font-medium text-ink-2 shadow-card backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-ok" /> Facture électronique 2026-2027 incluse, même en gratuit
        </div>
        <h1 className="animate-[fade-up_.6s_var(--ease)_.05s_both] text-[38px] font-semibold leading-[1.04] tracking-[-0.04em] md:text-[60px]">
          Votre entreprise,
          <br />
          <span className="dawn-text md:whitespace-nowrap">réglée comme une horloge.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-[520px] animate-[fade-up_.6s_var(--ease)_.12s_both] text-[16px] leading-relaxed text-ink-2 md:text-[17px]">
          Devis à la voix, factures payées plus vite, chantiers, planning, équipe et paie. Brix s’adapte à votre métier et à votre taille.
        </p>
        <div className="mx-auto mt-8 w-full max-w-[320px] animate-[fade-up_.6s_var(--ease)_.18s_both]">
          <Button variant="dawn" size="lg" className="w-full justify-center" iconRight={<ArrowRight className="h-4 w-4" />} onClick={() => navigate('/inscription')}>
            Créer mon Brix
          </Button>
          <p className="mt-2 text-[12px] text-ink-3">Gratuit pour démarrer · sans carte bancaire</p>
        </div>

        {/* Démo par métier */}
        <section className="mx-auto mt-10 w-full max-w-[720px] animate-[fade-up_.6s_var(--ease)_.26s_both] rounded-[22px] bg-white p-4 text-left shadow-raise md:p-5" aria-label="Essayer la démo">
          <div className="flex items-baseline justify-between gap-3 px-1">
            <h2 className="text-[16px] font-semibold tracking-[-0.02em]">Essayer la démo de votre métier</h2>
            <span className="hidden text-[12px] text-ink-3 sm:block">Sans inscription</span>
          </div>
          <div className="stagger-fast mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4">
            {TRADES.map((t) => {
              const on = t.key === trade;
              return (
                <button
                  key={t.key}
                  onClick={() => setTrade(t.key)}
                  aria-pressed={on}
                  className={cn(
                    'flex min-h-[48px] items-center gap-2.5 rounded-[12px] px-2.5 text-left text-[13px] font-medium transition duration-200 active:scale-[.98]',
                    on ? 'bg-ink text-white shadow-ink' : 'bg-sub text-ink-2 hover:bg-line hover:text-ink',
                  )}
                >
                  <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-[8px] transition-colors', on ? 'bg-white/15 text-white' : 'bg-white text-ink-2')}>
                    <Icon name={t.icon} className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 leading-tight">{t.key === 'cuisiniste' ? 'Cuisine et bain' : t.key === 'renovation' ? 'Rénovation' : t.name.replace('-chauffagiste', '')}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center">
            <p key={trade} className="min-w-0 flex-1 animate-fade-in px-1 text-[13px] leading-snug text-ink-2">
              Vous entrez chez <b className="font-semibold text-ink">{demo.name}</b> : ses devis, ses chantiers, son équipe, et Bob qui parle votre métier.
            </p>
            <Button variant="primary" size="lg" className="shrink-0 justify-center" icon={<Play className="h-4 w-4 fill-current" />} onClick={() => navigate(`/demo?metier=${trade}`)}>
              Essayer la démo
            </Button>
          </div>
        </section>

        <div className="mx-auto mt-6 grid w-full max-w-[600px] animate-[fade-up_.6s_var(--ease)_.34s_both] grid-cols-3 gap-2 text-left sm:gap-3">
          {[
            { I: Timer, t: '3 minutes', s: 'pour un Brix sur mesure' },
            { I: AudioLines, t: 'Bob', s: 'l’assistant qui travaille la nuit' },
            { I: ShieldCheck, t: 'Sans engagement', s: 'vous partez quand vous voulez' },
          ].map(({ I, t, s }) => (
            <div key={t} className="rounded-[16px] bg-white/70 p-3 shadow-card backdrop-blur">
              <I className="mb-2 h-4 w-4 text-vi-700" strokeWidth={1.75} />
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
