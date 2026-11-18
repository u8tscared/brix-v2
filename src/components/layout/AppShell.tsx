import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { BrandTile } from '@/components/brand/Logo';
import { Avatar, Toaster } from '@/components/ui';
import { useBrix } from '@/lib/store';
import { useUI } from '@/lib/ui';
import { CommandPalette } from './CommandPalette';
import { MobileNav } from './MobileNav';
import { Sidebar, SidebarDrawer } from './Sidebar';
import { useMediaQuery } from './useMediaQuery';
import { GuidedTour } from './GuidedTour';
import { TopBar } from './TopBar';
import { NotificationBell } from '@/modules/notifications';
import { HaloBackdrop } from './HaloBackdrop';
import { PageLoader } from './PageLoader';

// Bob (moteur, outils, voix) n'est chargé qu'à la première ouverture du panneau.
const BobPanel = lazy(() => import('@/modules/bob/BobPanel'));

// Squelette de chargement : dans son propre fichier (l'appli publique ne charge pas la coque).
export { PageLoader };

export default function AppShell() {
  const s = useBrix();
  const ui = useUI();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isDesktop = useMediaQuery('(min-width: 1280px)');
  const isTablet = useMediaQuery('(min-width: 768px)');
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 4);
    window.addEventListener('scroll', f, { passive: true });
    return () => window.removeEventListener('scroll', f);
  }, []);
  const fullBleed = /\/app\/(devis|factures)\/[^/]+$/.test(pathname);
  const devisEditor = /\/app\/devis\/[^/]+$/.test(pathname);
  const [drawer, setDrawer] = useState(false);
  // Le panneau de Bob reste monté une fois ouvert (il coupe la voix à la fermeture).
  const bobLoaded = useRef(false);
  if (ui.bob) bobLoaded.current = true;

  useEffect(() => {
    if (!s.onboarded) navigate('/bienvenue', { replace: true });
  }, [s.onboarded]);

  useEffect(() => {
    document.querySelector('main')?.scrollTo?.(0, 0);
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div
      className="relative isolate flex min-h-dvh"
      // Les toasts passent au-dessus des barres du bas (onglets, totaux de l'éditeur).
      style={{ ['--toast-b-md' as string]: devisEditor && !isDesktop ? '118px' : '24px' }}
    >
      {/* Halo Aube fixé derrière toutes les pages, tourne avec le défilement. */}
      <HaloBackdrop />
      {isTablet && <Sidebar forceCollapsed={!isDesktop || fullBleed} onExpand={() => setDrawer(true)} />}
      {isTablet && <SidebarDrawer open={drawer} onClose={() => setDrawer(false)} />}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Téléphone : dans l'éditeur de devis ou de facture, ni en-tête ni barre d'onglets (place pour les lignes). */}
        {!isTablet && !fullBleed && (
          <header className="sticky top-0 z-30 pl-[max(10px,var(--safe-l))] pr-[max(10px,var(--safe-r))] pt-safe">
            <div className={`flex h-14 items-center gap-2 rounded-[22px] px-1.5 transition-[background,box-shadow,backdrop-filter,margin] duration-300 ${scrolled ? 'glass mt-1.5 !h-[50px]' : 'mt-0 bg-transparent'}`}>
              <button onClick={() => navigate('/app')} aria-label="Accueil" className="grid h-11 w-11 place-items-center active:scale-95">
                <BrandTile size={30} />
              </button>
              <span className="min-w-0 flex-1 truncate text-[15px] font-semibold tracking-[-0.025em]">{s.company.name}</span>
              <button onClick={() => ui.set({ palette: true })} className="grid h-11 w-11 place-items-center rounded-full bg-white/80 text-ink-2 shadow-pill active:scale-95" aria-label="Rechercher">
                <Search className="h-[18px] w-[18px]" />
              </button>
              <span className="grid h-11 w-11 place-items-center rounded-full bg-white/80 shadow-pill">
                <NotificationBell variant="mobile" />
              </span>
              <button onClick={() => navigate('/app/reglages')} aria-label={`Mon compte, ${s.user.firstName} ${s.user.lastName}`.trim()} className="grid h-11 w-11 place-items-center active:scale-95">
                <span aria-hidden><Avatar initials={`${s.user.firstName[0] ?? ''}${s.user.lastName[0] ?? ''}`} dawn size={38} /></span>
              </button>
            </div>
          </header>
        )}
        {isTablet && !fullBleed && <TopBar />}
        <main className={fullBleed ? 'min-w-0 flex-1 pb-[calc(96px+var(--safe-b))] pt-safe md:pb-0 md:pt-0 max-md:px-safe md:pr-safe' : 'mx-auto w-full min-w-0 max-w-[1320px] flex-1 pb-[calc(112px+var(--safe-b))] pl-[max(16px,var(--safe-l))] pr-[max(16px,var(--safe-r))] pt-3 md:pb-[calc(56px+var(--safe-b))] md:pl-8 md:pr-[max(32px,var(--safe-r))] md:pt-4'}>
          <Suspense fallback={<PageLoader />}>
            {/* La clé relance l'animation d'entrée à chaque changement de page. */}
            <div key={pathname.split('/').slice(0, 4).join('/')} className="animate-page-in">
              <Outlet />
            </div>
          </Suspense>
        </main>
      </div>
      {!isTablet && !fullBleed && <MobileNav />}
      <CommandPalette />
      {bobLoaded.current && (
        <Suspense fallback={null}>
          <BobPanel />
        </Suspense>
      )}
      <GuidedTour />
      <Toaster />
    </div>
  );
}
