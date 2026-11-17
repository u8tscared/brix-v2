import { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, Search } from 'lucide-react';
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

export function PageLoader() {
  return (
    <div className="space-y-4 py-2">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-4 w-80" />
      <div className="grid gap-3 pt-2 md:grid-cols-3">
        <Skeleton className="h-28 rounded-[16px]" />
        <Skeleton className="h-28 rounded-[16px]" />
        <Skeleton className="h-28 rounded-[16px]" />
      </div>
      <Skeleton className="h-72 rounded-[16px]" />
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
    <div className="flex min-h-dvh bg-page">
      {isTablet && <Sidebar forceCollapsed={!isDesktop || fullBleed} />}
      <div className="flex min-w-0 flex-1 flex-col">
        {!isTablet && (
          <header className={`sticky top-0 z-30 flex h-[58px] items-center gap-2.5 px-4 pt-safe transition-[background,box-shadow] duration-300 ${scrolled ? 'bg-page/80 shadow-[0_1px_0_var(--line)] backdrop-blur-xl' : 'bg-page'}`}>
            <button onClick={() => navigate('/app')} aria-label="Accueil" className="active:scale-95">
              <BrandTile size={30} />
            </button>
            <span className="min-w-0 flex-1 truncate text-[15px] font-semibold tracking-[-0.02em]">{s.company.name}</span>
            <button onClick={() => ui.set({ palette: true })} className="grid h-10 w-10 place-items-center rounded-full bg-white text-ink-2 shadow-card active:scale-95" aria-label="Rechercher">
              <Search className="h-[18px] w-[18px]" />
            </button>
            <NotificationBell variant="mobile" />
            <button onClick={() => navigate('/app/reglages')} aria-label="Mon compte" className="active:scale-95">
              <Avatar initials={`${s.user.firstName[0] ?? ''}${s.user.lastName[0] ?? ''}`} color="#e9e4fb" fg="#4c1d95" size={38} />
            </button>
          </header>
        )}
        {isTablet && !fullBleed && <TopBar />}
        <main className={fullBleed ? 'min-w-0 flex-1 pb-[calc(84px+var(--safe-b))] md:pb-0' : 'mx-auto w-full min-w-0 max-w-[1320px] flex-1 px-4 pb-[calc(104px+var(--safe-b))] pt-3 md:px-7 md:pb-12 md:pt-2'}>
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
