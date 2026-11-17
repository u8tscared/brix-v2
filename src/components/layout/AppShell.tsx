import { Suspense, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, Search } from 'lucide-react';
import { LogoIcon } from '@/components/brand/Logo';
import { Avatar, Toaster } from '@/components/ui';
import BobPanel from '@/modules/bob/BobPanel';
import { useBrix } from '@/lib/store';
import { useUI } from '@/lib/ui';
import { CommandPalette } from './CommandPalette';
import { MobileNav } from './MobileNav';
import { Sidebar } from './Sidebar';
import { useMediaQuery } from './useMediaQuery';
import { GuidedTour } from './GuidedTour';

export function PageLoader() {
  return (
    <div className="space-y-4 py-2">
      <div className="h-8 w-56 animate-pulse rounded-lg bg-line" />
      <div className="h-28 animate-pulse rounded-[14px] bg-white" />
      <div className="h-64 animate-pulse rounded-[14px] bg-white" />
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
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line/70 bg-page/85 px-4 pt-safe backdrop-blur-xl">
            <LogoIcon className="h-7 w-7" />
            <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{s.company.name}</span>
            <button onClick={() => ui.set({ palette: true })} className="grid h-9 w-9 place-items-center rounded-full bg-white text-ink-2 shadow-card" aria-label="Rechercher">
              <Search className="h-[18px] w-[18px]" />
            </button>
            <button onClick={() => navigate('/app/bob/brief')} className="relative grid h-9 w-9 place-items-center rounded-full bg-white text-ink-2 shadow-card" aria-label="Notifications">
              <Bell className="h-[18px] w-[18px]" />
              <i className="absolute right-2 top-2 h-2 w-2 rounded-full bg-peach ring-2 ring-white" />
            </button>
            <button onClick={() => navigate('/app/reglages')} aria-label="Mon compte">
              <Avatar initials={`${s.user.firstName[0] ?? ''}${s.user.lastName[0] ?? ''}`} color="#1F389D" size={36} />
            </button>
          </header>
        )}
        <main className={fullBleed ? 'min-w-0 flex-1 pb-[calc(84px+var(--safe-b))] md:pb-0' : 'mx-auto w-full min-w-0 max-w-[1320px] flex-1 px-4 pb-[calc(96px+var(--safe-b))] pt-5 md:px-7 md:pb-10 md:pt-7'}>
          <Suspense fallback={<PageLoader />}>
            <Outlet />
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
