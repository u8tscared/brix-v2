import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell, ChevronRight, FileText, HardHat, Mic, Plus, Receipt, Search, UserPlus } from 'lucide-react';
import { DEPT_TONE, IconTile, Kbd, cn } from '@/components/ui';
import { DEPARTMENTS, MODULES } from '@/lib/catalog';
import { useUI } from '@/lib/ui';
import { usePresence } from '@/components/motion';
import { NotificationBell } from '@/modules/notifications';

/** Fil d'Ariane déduit de l'adresse : Département › Module › fiche. */
export function useCrumbs() {
  const { pathname } = useLocation();
  const rest = pathname.replace(/^\/app\/?/, '');
  if (!rest) return { dept: null, mod: null, leaf: null };
  const mod = [...MODULES].sort((a, b) => b.path.length - a.path.length).find((m) => rest === m.path || rest.startsWith(m.path + '/')) ?? null;
  const dept = mod ? DEPARTMENTS.find((d) => d.key === mod.dept) ?? null : null;
  const leaf = mod && rest.length > mod.path.length ? rest.slice(mod.path.length + 1) : null;
  return { dept, mod, leaf };
}

const CREATE = [
  { label: 'Devis', hint: 'N', icon: FileText, to: '/app/devis/nouveau', dept: 'vendre' as const },
  { label: 'Facture', icon: Receipt, to: '/app/factures?nouvelle=1', dept: 'facturer' as const },
  { label: 'Chantier', icon: HardHat, to: '/app/chantiers?nouveau=1', dept: 'chantiers' as const },
  { label: 'Client', icon: UserPlus, to: '/app/clients?nouveau=1', dept: 'vendre' as const },
];

function QuickCreate() {
  const [open, setOpen] = useState(false);
  const { mounted, closing } = usePresence(open, 160);
  const navigate = useNavigate();
  const ui = useUI();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input,textarea,select,[contenteditable]')) return;
      if ((e.key === 'n' || e.key === 'N') && !e.metaKey && !e.ctrlKey && !e.altKey) navigate('/app/devis/nouveau');
      if (e.key === 'Escape') setOpen(false);
    };
    const c = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener('keydown', k);
    window.addEventListener('pointerdown', c);
    return () => {
      window.removeEventListener('keydown', k);
      window.removeEventListener('pointerdown', c);
    };
  }, []);
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} className="group flex h-10 touch:h-11 items-center gap-1.5 rounded-full bg-ink pl-3 pr-4 text-[13.5px] font-medium text-white shadow-ink transition duration-300 ease-spring hover:-translate-y-px hover:bg-[#241f3f] active:scale-[.97]" aria-expanded={open}>
        <Plus className={cn('h-4 w-4 transition-transform duration-300 ease-out-quint', open && 'rotate-45')} />
        Créer
      </button>
      {mounted && (
        <div className={cn('glass-strong absolute right-0 top-[calc(100%+10px)] z-50 w-[260px] origin-top-right rounded-[22px] p-2 shadow-pop', closing ? 'animate-[scale-out_.16s_var(--ease)_both]' : 'animate-[scale-in_.22s_var(--ease)_both]')}>
          {CREATE.map((c, i) => (
            <button
              key={c.label}
              onClick={() => {
                setOpen(false);
                navigate(c.to);
              }}
              className="flex h-12 w-full animate-[fade-up_.3s_var(--ease)_both] items-center gap-3 rounded-[16px] px-2 text-left text-[13.5px] font-medium transition hover:bg-white"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <IconTile icon={<c.icon />} dept={c.dept} size="sm" />
              <span className="flex-1">{c.label}</span>
              {c.hint && <Kbd>{c.hint}</Kbd>}
            </button>
          ))}
          <div className="mx-2 my-1 h-px bg-[#ece8f6]" />
          <button
            onClick={() => {
              setOpen(false);
              ui.askBob('', true);
            }}
            className="flex h-12 w-full items-center gap-3 rounded-[16px] px-2 text-left text-[13.5px] font-medium transition hover:bg-white"
          >
            <IconTile icon={<Mic />} dept="bob" size="sm" solid />
            <span className="flex-1">Dicter à Bob</span>
            <Kbd>⌘J</Kbd>
          </button>
        </div>
      )}
    </div>
  );
}

/** Barre du haut (tablette et ordinateur) : où je suis, chercher, notifications, créer. */
export function TopBar({ notifications }: { notifications?: React.ReactNode }) {
  const ui = useUI();
  const navigate = useNavigate();
  const { dept, mod, leaf } = useCrumbs();
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', f, { passive: true });
    return () => window.removeEventListener('scroll', f);
  }, []);
  return (
    <header className="sticky top-0 z-30 mx-auto w-full max-w-[1320px] pl-8 pr-[max(32px,var(--safe-r))] pt-[calc(12px+var(--safe-t))] before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-3 before:bg-gradient-to-b before:from-[#f7f5fc] before:to-[#f7f5fc]/0 before:content-['']">
      {/* Halo : barre du haut en pilule de verre qui flotte ; plus nette quand le contenu défile dessous. */}
      <div className={cn('flex h-14 items-center gap-2.5 rounded-full pl-5 pr-2 transition-[background,box-shadow] duration-300', scrolled ? 'glass-strong' : 'glass')}>
      <nav className="flex min-w-0 flex-1 items-center gap-1.5 text-[13px]" aria-label="Fil d'Ariane">
        {!mod ? (
          <span className="font-medium text-ink">{pathname.startsWith('/app/reglages') ? 'Réglages' : "Aujourd'hui"}</span>
        ) : (
          <>
            {dept && dept.name !== mod.name && (
              <>
                <span className="flex items-center gap-1.5 text-ink-3">
                  <i className="h-1.5 w-1.5 rounded-full" style={{ background: DEPT_TONE[dept.key].solid }} />
                  {dept.name}
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-line2" />
              </>
            )}
            {dept && dept.name === mod.name && <i className="h-1.5 w-1.5 rounded-full" style={{ background: DEPT_TONE[dept.key].solid }} />}
            <Link to={`/app/${mod.path}`} className={cn('truncate font-medium transition hover:text-ink', leaf ? 'text-ink-2' : 'text-ink')}>
              {mod.name}
            </Link>
            {leaf && (
              <>
                <ChevronRight className="h-3.5 w-3.5 text-line2" />
                <span className="truncate font-medium text-ink">{leaf === 'nouveau' ? 'Nouveau' : decodeURIComponent(leaf).toUpperCase().startsWith('D-') || decodeURIComponent(leaf).toUpperCase().startsWith('F-') ? decodeURIComponent(leaf) : 'Fiche'}</span>
              </>
            )}
          </>
        )}
      </nav>
      <button onClick={() => ui.set({ palette: true })} className="group flex h-10 w-[232px] items-center gap-2 rounded-full bg-white/75 px-3.5 text-[13px] text-ink-3 shadow-[inset_0_0_0_1px_rgba(236,232,246,.9)] transition hover:bg-white max-xl:w-10 max-xl:justify-center max-xl:px-0 touch:h-11 max-xl:touch:w-11" aria-label="Rechercher">
        <Search className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left max-xl:hidden">Rechercher</span>
        <span className="max-xl:hidden">
          <Kbd>⌘K</Kbd>
        </span>
      </button>
      {notifications ?? <NotificationBell />}
      <QuickCreate />
      </div>
    </header>
  );
}
