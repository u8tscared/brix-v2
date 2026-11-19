import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, AudioLines, Play, ShieldCheck, Timer } from 'lucide-react';
import { BrandLogo } from '@/components/brand/Logo';
import { Button, Card, cn, HALO_TONE, Icon, IconTile } from '@/components/ui';
import { HaloBackdrop } from '@/components/layout/HaloBackdrop';
import { TRADE_TONE } from '@/pages/onboarding/icons';
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
    <div className="relative isolate flex min-h-dvh flex-col overflow-x-hidden">
      <HaloBackdrop />

      <header className="relative z-10 flex items-center justify-between px-5 pt-[calc(20px+var(--safe-t))] md:px-10">
        <BrandLogo size={30} />
        {onboarded ? (
          <button onClick={() => navigate('/app')} className="glass flex min-h-[44px] items-center gap-1.5 rounded-full px-4 text-[13px] font-medium text-ink-2 transition hover:text-ink">
            Retour à {company || 'mon Brix'} <ArrowRight className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button onClick={() => navigate('/connexion')} className="glass flex min-h-[44px] items-center gap-1.5 rounded-full px-4 text-[13px] font-medium text-ink-2 transition hover:text-ink">
            J'ai déjà un compte <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-[880px] flex-1 flex-col justify-center px-5 py-10 text-center md:py-10">
        <div className="mx-auto mb-6 inline-flex animate-[fade-up_.5s_var(--ease)_both] items-center gap-2 rounded-full glass px-3.5 py-1.5 text-[12.5px] font-medium text-ink-2">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ok" /> Facture électronique 2026-2027 incluse, même en gratuit
        </div>
        <h1 className="animate-[fade-up_.6s_var(--ease)_.05s_both] text-[40px] font-semibold leading-[1.02] tracking-[-0.05em] md:text-[68px]">
          Votre entreprise,
          <br />
          <span className="text-halo-mute md:whitespace-nowrap">réglée comme une <span className="dawn-text">horloge.</span></span>
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
        <Card className="mx-auto mt-10 w-full max-w-[720px] animate-[fade-up_.6s_var(--ease)_.26s_both] p-4 text-left md:p-5" aria-label="Essayer la démo" role="region">
          <div className="flex items-baseline justify-between gap-3 px-1">
            <h2 className="text-[16px] font-semibold tracking-[-0.02em]">Essayer la démo de votre métier</h2>
            <span className="chip tone-green hidden h-6 text-[11.5px] sm:inline-flex">Sans inscription</span>
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
                    'flex min-h-[48px] items-center gap-2.5 rounded-pill py-1 pl-1 pr-3 text-left text-[13px] font-medium transition duration-300 ease-spring active:scale-[.97]',
                    on ? 'bg-ink text-white shadow-ink' : 'bg-white text-ink-2 shadow-halo-sm hover:-translate-y-px hover:text-ink',
                  )}
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full transition-colors" style={on ? { background: 'rgba(255,255,255,.14)', color: '#fff' } : { background: HALO_TONE[TRADE_TONE[t.key]].bg, color: HALO_TONE[TRADE_TONE[t.key]].fg }}>
                    <Icon name={t.icon} className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 leading-tight">{t.key === 'cuisiniste' ? 'Cuisine et bain' : t.key === 'renovation' ? 'Rénovation' : t.name.replace('-chauffagiste', '')}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex flex-col gap-3 border-t border-halo-line pt-4 sm:flex-row sm:items-center">
            <p key={trade} className="min-w-0 flex-1 animate-fade-in px-1 text-[13px] leading-snug text-ink-2">
              Vous entrez chez <b className="font-semibold text-ink">{demo.name}</b> : ses devis, ses chantiers, son équipe, et Brix AI qui parle votre métier.
            </p>
            <Button variant="primary" size="lg" className="shrink-0 justify-center" icon={<Play className="h-4 w-4 fill-current" />} onClick={() => navigate(`/demo?metier=${trade}`)}>
              Essayer la démo
            </Button>
          </div>
        </Card>

        <div className="mx-auto mt-6 grid w-full max-w-[600px] animate-[fade-up_.6s_var(--ease)_.34s_both] grid-cols-3 gap-2 text-left sm:gap-3">
          {[
            { I: Timer, t: '3 minutes', s: 'pour un Brix sur mesure', tone: 'violet' as const },
            { I: AudioLines, t: 'Brix AI', s: 'l’assistant qui travaille la nuit', tone: 'mag' as const },
            { I: ShieldCheck, t: 'Sans engagement', s: 'vous partez quand vous voulez', tone: 'green' as const },
          ].map(({ I, t, s, tone }) => (
            <div key={t} className="glass rounded-card-sm p-3">
              <IconTile size="sm" tone={tone} className="mb-2.5" icon={<I strokeWidth={1.9} />} />
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
