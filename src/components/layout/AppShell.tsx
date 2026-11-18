import { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { BrandTile } from '@/components/brand/Logo';
import { Avatar, Skeleton, Toaster } from '@/components/ui';
import BobPanel from '@/modules/bob/BobPanel';
import { useBrix } from '@/lib/store';
import { useUI } from '@/lib/ui';
import { CommandPalette } from './CommandPalette';
import { MobileNav } from './MobileNav';
import { Sidebar } from './Sidebar';
import { useMediaQuery } from './useMediaQuery';
import { GuidedTour } from './GuidedTour';
import { TopBar } from './TopBar';
import { NotificationBell } from '@/modules/notifications';
import { HaloBackdrop } from './HaloBackdrop';

export function PageLoader() {
  return (
    <div className="space-y-4 py-2">
      <Skeleton className="h-4 w-40 rounded-full" />
      <Skeleton className="h-11 w-72 rounded-full" />
      <div className="grid gap-4 pt-2 md:grid-cols-3">
        <Skeleton className="h-32 rounded-card" />
        <Skeleton className="h-32 rounded-card" />
        <Skeleton className="h-32 rounded-card" />
      </div>
      <Skeleton className="h-72 rounded-card" />
    </div>
  );
}

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

  useEffect(() => {
    if (!s.onboarded) navigate('/bienvenue', { replace: true });
  }, [s.onboarded]);

  useEffect(() => {
    document.querySelector('main')?.scrollTo?.(0, 0);
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="relative isolate flex min-h-dvh">
      {/* Halo Aube fixé derrière toutes les pages, tourne avec le défilement. */}
      <HaloBackdrop />
      {isTablet && <Sidebar forceCollapsed={!isDesktop || fullBleed} />}
      <div className="flex min-w-0 flex-1 flex-col">
        {!isTablet && (
          <header className="sticky top-0 z-30 px-2.5 pt-safe">
            <div className={`flex h-14 items-center gap-2 rounded-[22px] px-1.5 transition-[background,box-shadow,backdrop-filter,margin] duration-300 ${scrolled ? 'glass mt-1.5 !h-[50px]' : 'mt-0 bg-transparent'}`}>
              <button onClick={() => navigate('/app')} aria-label="Accueil" className="grid h-10 w-10 place-items-center active:scale-95">
                <BrandTile size={30} />
              </button>
              <span className="min-w-0 flex-1 truncate text-[15px] font-semibold tracking-[-0.025em]">{s.company.name}</span>
              <button onClick={() => ui.set({ palette: true })} className="grid h-10 w-10 place-items-center rounded-full bg-white/80 text-ink-2 shadow-pill active:scale-95" aria-label="Rechercher">
                <Search className="h-[18px] w-[18px]" />
              </button>
              <span className="grid h-10 w-10 place-items-center rounded-full bg-white/80 shadow-pill">
                <NotificationBell variant="mobile" />
              </span>
              <button onClick={() => navigate('/app/reglages')} aria-label="Mon compte" className="active:scale-95">
                <Avatar initials={`${s.user.firstName[0] ?? ''}${s.user.lastName[0] ?? ''}`} dawn size={38} />
              </button>
            </div>
          </header>
        )}
        {isTablet && !fullBleed && <TopBar />}
        <main className={fullBleed ? 'min-w-0 flex-1 pb-[calc(96px+var(--safe-b))] md:pb-0' : 'mx-auto w-full min-w-0 max-w-[1320px] flex-1 px-4 pb-[calc(112px+var(--safe-b))] pt-3 md:px-8 md:pb-14 md:pt-4'}>
          <Suspense fallback={<PageLoader />}>
            {/* La clé relance l'animation d'entrée à chaque changement de page. */}
            <div key={pathname.split('/').slice(0, 4).join('/')} className="animate-page-in">
              <Outlet />
            </div>
          </Suspense>
        </main>
      </div>
      {!isTablet && <MobileNav />}
      <CommandPalette />
      <BobPanel />
      <GuidedTour />
      <Toaster />
    </div>
  );
}
