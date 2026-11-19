// Cadre commun des écrans d'accès (connexion, mot de passe) : halo Aube, logo, carte centrée.
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BrandLogo } from '@/components/brand/Logo';
import { HaloBackdrop } from '@/components/layout/HaloBackdrop';
import { Toaster } from '@/components/ui';
import '@/parcours/parcours.css';
import '@/pages/onboarding/onboarding.css';

export function Cadre({ titre, sousTitre, children, pied }: { titre: ReactNode; sousTitre?: ReactNode; children: ReactNode; pied?: ReactNode }) {
  return (
    <div className="bx-root ob relative isolate flex min-h-dvh flex-col overflow-x-hidden">
      <HaloBackdrop />
      <header className="relative z-10 flex items-center px-5 pt-[calc(20px+var(--safe-t))] md:px-10">
        <Link to="/bienvenue" aria-label="Accueil Brix"><BrandLogo size={28} /></Link>
      </header>
      <main className="relative z-10 mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center px-4 py-10">
        <div className="ob-rise">
          <h1 className="ob-title">{titre}</h1>
          {sousTitre && <p className="ob-lead mt-3">{sousTitre}</p>}
        </div>
        <div className="surface ob-rise mt-7 rounded-card p-5 shadow-halo md:p-7" style={{ animationDelay: '60ms' }}>{children}</div>
        {pied && <div className="ob-rise mt-6 text-center text-[13.5px] text-ink-2" style={{ animationDelay: '120ms' }}>{pied}</div>}
      </main>
      <Toaster />
    </div>
  );
}

/** Message d'erreur sous un formulaire (annoncé aux lecteurs d'écran). */
export function Erreur({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="mt-4 rounded-2xl bg-pale-r px-4 py-3 text-[13px] leading-snug text-deep-r">
      {children}
    </p>
  );
}

export function Separateur({ children }: { children: ReactNode }) {
  return (
    <div className="my-5 flex items-center gap-3 text-[12.5px] text-ink-3">
      <span className="h-px flex-1 bg-[#e4e2ee]" />
      {children}
      <span className="h-px flex-1 bg-[#e4e2ee]" />
    </div>
  );
}
