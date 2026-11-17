import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell, ChevronRight, FileText, HardHat, Mic, Plus, Receipt, Search, UserPlus } from 'lucide-react';
import { DEPT_TONE, IconTile, Kbd, cn } from '@/components/ui';
import { DEPARTMENTS, MODULES } from '@/lib/catalog';
import { useUI } from '@/lib/ui';
import { usePresence } from '@/components/motion';

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
    const c = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener('keydown', k);
    window.addEventListener('mousedown', c);
    return () => {
      window.removeEventListener('keydown', k);
      window.removeEventListener('mousedown', c);
    };
  }, []);
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} className="group flex h-9 items-center gap-1.5 rounded-[10px] bg-ink pl-2.5 pr-3 text-[13px] font-medium text-white shadow-ink transition hover:bg-[#241f3f] active:scale-[.97]">
        <Plus className={cn('h-4 w-4 transition-transform duration-300 ease-out-quint', open && 'rotate-45')} />
        Créer
      </button>
      {mounted && (
        <div className={cn('absolute right-0 top-[calc(100%+8px)] z-50 w-[248px] origin-top-right rounded-[14px] bg-white p-1.5 shadow-pop', closing ? 'animate-[scale-out_.16s_var(--ease)_both]' : 'animate-[scale-in_.22s_var(--ease)_both]')}>
          {CREATE.map((c, i) => (
            <button
              key={c.label}
              onClick={() => {
                setOpen(false);
                navigate(c.to);
              }}
              className="flex h-11 w-full animate-[fade-up_.3s_var(--ease)_both] items-center gap-3 rounded-[10px] px-2 text-left text-[13.5px] font-medium transition hover:bg-sub"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <IconTile icon={<c.icon />} dept={c.dept} size="sm" />
              <span className="flex-1">{c.label}</span>
              {c.hint && <Kbd>{c.hint}</Kbd>}
            </button>
          ))}
          <div className="my-1 h-px bg-line" />
          <button
            onClick={() => {
              setOpen(false);
              ui.askBob('', true);
            }}
            className="flex h-11 w-full items-center gap-3 rounded-[10px] px-2 text-left text-[13.5px] font-medium transition hover:bg-sub"
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
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 4);
    window.addEventListener('scroll', f, { passive: true });
    return () => window.removeEventListener('scroll', f);
  }, []);
  return (
    <header className={cn('sticky top-0 z-30 flex h-14 items-center gap-3 px-7 transition-[background,box-shadow] duration-300', scrolled ? 'bg-page/80 shadow-[0_1px_0_var(--line)] backdrop-blur-xl' : 'bg-transparent')}>
      <nav className="flex min-w-0 flex-1 items-center gap-1.5 text-[13px]" aria-label="Fil d'Ariane">
        {!mod ? (
          <span className="font-medium text-ink">Aujourd'hui</span>
        ) : (
          <>
            {dept && (
              <span className="flex items-center gap-1.5 text-ink-3">
                <i className="h-1.5 w-1.5 rounded-full" style={{ background: DEPT_TONE[dept.key].solid }} />
                {dept.name}
              </span>
            )}
            <ChevronRight className="h-3.5 w-3.5 text-line2" />
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
      <button onClick={() => ui.set({ palette: true })} className="group flex h-9 w-[220px] items-center gap-2 rounded-[10px] bg-white px-2.5 text-[13px] text-ink-3 shadow-card transition hover:shadow-raise max-xl:w-9 max-xl:justify-center max-xl:px-0" aria-label="Rechercher">
        <Search className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left max-xl:hidden">Rechercher</span>
        <span className="max-xl:hidden">
          <Kbd>⌘K</Kbd>
        </span>
      </button>
      {notifications ?? (
        <button onClick={() => navigate('/app/bob/brief')} className="group relative grid h-9 w-9 place-items-center rounded-[10px] bg-white text-ink-2 shadow-card transition hover:text-ink hover:shadow-raise" aria-label="Notifications">
          <Bell className="h-4 w-4 group-hover:animate-wiggle" />
          <i className="absolute right-2 top-2 h-2 w-2 rounded-full bg-mag ring-2 ring-white" />
        </button>
      )}
      <QuickCreate />
    </header>
  );
}
