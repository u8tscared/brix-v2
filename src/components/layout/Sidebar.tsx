import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronsUpDown, LayoutDashboard, PanelLeftClose, PanelLeftOpen, Plus, Search, Settings } from 'lucide-react';
import { BrandTile } from '@/components/brand/Logo';
import { Avatar, DEPT_TONE, Icon, Kbd, Tip, cn } from '@/components/ui';
import { useModal } from '@/components/ui/useModal';
import { usePresence } from '@/components/motion';
import { MODULES, ROLE_LABEL, TRADE_BY_KEY, type DepartmentKey } from '@/lib/catalog';
import { useBrix } from '@/lib/store';
import { useUI } from '@/lib/ui';
import { BobWave } from './BobWave';
import { buildNav } from './nav';

function Item({ to, icon, label, badge, collapsed, end, dept }: { to: string; icon: React.ReactNode; label: string; badge?: number | string; collapsed?: boolean; end?: boolean; dept?: DepartmentKey }) {
  const tone = dept ? DEPT_TONE[dept] : null;
  const link = (
    <NavLink
      to={to}
      end={end}
      draggable={false}
      aria-label={collapsed ? label : undefined}
      style={tone ? ({ ['--tone' as string]: tone.fg } as React.CSSProperties) : undefined}
      className={({ isActive }) =>
        cn(
          'group relative z-[1] flex h-9 items-center gap-2.5 rounded-full text-[13.5px] font-medium tracking-[-0.01em] transition-colors duration-200',
          collapsed ? 'w-10 justify-center touch:h-11 touch:w-11' : 'px-3 touch:h-11',
          isActive ? 'text-ink [&_.nav-ico]:text-[var(--tone,#6d28d9)]' : 'text-ink-2 hover:bg-white/45 hover:text-ink',
        )
      }
    >
      <span className="nav-ico text-ink-3 transition-[color,transform] duration-300 ease-spring group-hover:scale-110 group-hover:text-ink-2 group-active:scale-95 [&_svg]:h-[17px] [&_svg]:w-[17px]">{icon}</span>
      {!collapsed && <span className="flex-1 truncate">{label}</span>}
      {!collapsed && badge !== undefined && badge !== 0 && <em className="num min-w-[20px] rounded-full bg-white/80 px-1.5 text-center text-[11px] font-semibold not-italic leading-[18px] text-ink-2 shadow-[0_0_0_1px_#ece8f6] transition-colors group-aria-[current=page]:bg-pale-v group-aria-[current=page]:text-deep-v group-aria-[current=page]:shadow-none">{badge}</em>}
      {collapsed && badge !== undefined && badge !== 0 && <i className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-mag ring-2 ring-white" />}
    </NavLink>
  );
  return collapsed ? <Tip label={label} side="right">{link}</Tip> : link;
}

/** Surbrillance qui glisse d'un lien à l'autre. */
function useActivePill(dep: unknown) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const measure = () => {
      const a = root.querySelector<HTMLElement>('a[aria-current="page"]');
      if (!a) return setBox(null);
      const r = root.getBoundingClientRect();
      const b = a.getBoundingClientRect();
      setBox({ top: b.top - r.top + root.scrollTop, left: b.left - r.left, width: b.width, height: b.height });
    };
    measure();
    const t = setTimeout(measure, 60);
    // La barre change de largeur (repli/dépli animé) : on remesure à chaque redimensionnement.
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    return () => {
      clearTimeout(t);
      ro.disconnect();
    };
  }, [dep]);
  return { ref, box };
}

/** Fondu en haut / en bas de la liste quand il reste des liens cachés (indice de défilement). */
function useScrollFade(ref: React.RefObject<HTMLElement>, dep: unknown) {
  const [edges, setEdges] = useState({ top: false, bottom: false });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const maj = () => setEdges({ top: el.scrollTop > 2, bottom: el.scrollTop + el.clientHeight < el.scrollHeight - 2 });
    maj();
    el.addEventListener('scroll', maj, { passive: true });
    const ro = new ResizeObserver(maj);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => {
      el.removeEventListener('scroll', maj);
      ro.disconnect();
    };
  }, [dep]);
  return edges;
}

/**
 * Barre latérale en verre.
 * - Ordinateur : complète (ou repliée au choix).
 * - Tablette et éditeurs plein écran : rail replié (`forceCollapsed`) ; le bouton du haut ouvre le menu complet
 *   par-dessus (`onExpand`), rendu par <SidebarDrawer>.
 * - `drawer` : version complète dans le tiroir ; `onClose` la referme.
 */
export function Sidebar({ forceCollapsed = false, onExpand, drawer = false, onClose }: { forceCollapsed?: boolean; onExpand?: () => void; drawer?: boolean; onClose?: () => void }) {
  const s = useBrix();
  const ui = useUI();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const collapsed = !drawer && (forceCollapsed || s.prefs.sidebarCollapsed);
  const { primary, groups } = buildNav(s.enabled);
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  const trade = TRADE_BY_KEY[s.company.trade];
  const { ref: navRef, box } = useActivePill(`${pathname}|${collapsed}|${JSON.stringify(closed)}`);
  const fade = useScrollFade(navRef, `${collapsed}|${JSON.stringify(closed)}`);

  const badges: Record<string, number> = {
    leads: s.leads.filter((l) => l.status === 'nouveau').length,
    devis: s.devis.filter((d) => d.status === 'vu' || d.status === 'envoye').length,
    factures: s.factures.filter((f) => f.status === 'en_retard').length,
    chantiers: s.chantiers.filter((c) => c.status === 'en_cours').length,
  };
  const pinned = s.chantiers.filter((c) => c.pinned).slice(0, 3);
  const pendingBob = s.bob.filter((b) => !b.done).length;
  const deptOf = (key: string) => MODULES.find((m) => m.key === key)?.dept;

  return (
    <aside
      className={cn(
        'flex h-dvh shrink-0 pb-[calc(12px+var(--safe-b))] pl-[calc(12px+var(--safe-l))] pt-[calc(12px+var(--safe-t))]',
        drawer ? 'w-[calc(296px+var(--safe-l))] max-w-[calc(100vw-48px)] pr-0' : 'sticky top-0 z-20 transition-[width] duration-[400ms] ease-out-quint',
        !drawer && (collapsed ? 'w-[calc(84px+var(--safe-l))]' : 'w-[calc(272px+var(--safe-l))]'),
      )}
    >
      {/* Halo : barre latérale en verre qui flotte au-dessus du halo, 37 modules rangés par département. */}
      <div className={cn('flex min-w-0 flex-1 flex-col rounded-[26px]', drawer ? 'glass-strong !bg-white/[.95] shadow-pop' : 'glass', collapsed ? 'items-center px-2 py-3.5' : 'px-3 py-4')}>
      <div className={cn('flex items-center', collapsed ? 'mb-3 flex-col gap-2' : 'mb-3 justify-between pl-1.5')}>
        <button onClick={() => navigate('/app')} className={cn('flex items-center gap-2', collapsed && 'grid h-11 w-11 place-items-center')} aria-label="Accueil Brix">
          <BrandTile size={collapsed ? 34 : 28} animated />
          {!collapsed && <span className="font-display text-[20px] font-bold leading-none tracking-[-0.05em] text-night">Brix</span>}
        </button>
        {(drawer || !forceCollapsed || onExpand) && (
          <button
            onClick={() => (drawer ? onClose?.() : forceCollapsed ? onExpand?.() : s.setPrefs({ sidebarCollapsed: !collapsed }))}
            className="grid h-8 w-8 place-items-center rounded-full text-ink-3 transition hover:bg-white/70 hover:text-ink touch:h-11 touch:w-11"
            aria-label={collapsed ? 'Ouvrir le menu' : drawer ? 'Fermer le menu' : 'Réduire le menu'}
            aria-expanded={drawer ? true : collapsed ? false : undefined}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        )}
      </div>

      {!collapsed && (
        <button onClick={() => navigate('/app/reglages/entreprise')} className="group flex h-12 items-center gap-2.5 rounded-[18px] bg-white/80 px-2 text-left shadow-pill transition duration-300 hover:-translate-y-px hover:bg-white">
          <span className="grid h-8 w-8 place-items-center rounded-[11px] bg-night text-[11px] font-bold tracking-tight text-white">{s.company.logoInitials || 'B'}</span>
          <span className="min-w-0 flex-1">
            <b className="block truncate text-[13px] font-semibold leading-tight">{s.company.name || 'Mon entreprise'}</b>
            <span className="block truncate text-[11.5px] leading-tight text-ink-3">{trade?.name ?? 'Artisan'} · {s.company.city || 'France'}</span>
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 text-ink-3 transition group-hover:text-ink" />
        </button>
      )}

      <button onClick={() => ui.set({ palette: true })} className={cn('group my-3 flex items-center gap-2 rounded-full text-[13px] text-ink-3 transition hover:text-ink-2', collapsed ? 'h-10 w-10 justify-center hover:bg-white/70 touch:h-11 touch:w-11' : 'h-10 touch:h-11 bg-white/55 px-3.5 shadow-[inset_0_0_0_1px_rgba(236,232,246,.9)] hover:bg-white/85')} aria-label="Rechercher">
        <Search className="h-4 w-4 transition group-hover:scale-110" />
        {!collapsed && (
          <>
            <span className="flex-1 text-left">Rechercher, créer…</span>
            <Kbd>⌘K</Kbd>
          </>
        )}
      </button>

      <nav
        ref={navRef}
        aria-label="Modules"
        className={cn('scroll-fade-y relative -mx-1 flex-1 overflow-y-auto overscroll-contain px-1 pb-2 scrollbar-none', collapsed && 'flex flex-col items-center')}
        style={{ ['--fade-t' as string]: fade.top ? '28px' : '0px', ['--fade-b' as string]: fade.bottom ? '40px' : '0px' }}
      >
        {box && (
          <span
            aria-hidden
            className="absolute z-0 rounded-full bg-white shadow-pill transition-all duration-500 ease-spring"
            style={{ top: box.top, left: box.left, width: box.width, height: box.height }}
          />
        )}
        <div className="space-y-px">
          <Item to="/app" end icon={<LayoutDashboard />} label="Aujourd'hui" collapsed={collapsed} />
          {primary.map((m) => (
            <Item key={m.key} to={`/app/${m.path}`} icon={<Icon name={m.icon} />} label={m.name} badge={badges[m.key]} collapsed={collapsed} dept={m.dept} />
          ))}
        </div>

        {!collapsed && trade && s.enabled.includes('outils_metier') && (
          <>
            <h6 className="eyebrow px-3 pb-1.5 pt-5">{trade.name}</h6>
            <div className="space-y-px">
              {trade.tools.slice(0, 4).map((t) => (
                <Item key={t.key} to={`/app/outils/${t.key}`} icon={<Icon name={t.icon} />} label={t.name} dept="metier" />
              ))}
            </div>
          </>
        )}
        {collapsed && s.enabled.includes('outils_metier') && <div className="my-2 h-px w-8 bg-[#e6e1f1]" />}
        {collapsed && s.enabled.includes('outils_metier') && <Item to="/app/outils" icon={<Icon name="Calculator" />} label="Outils métier" collapsed dept="metier" />}

        {!collapsed && pinned.length > 0 && (
          <>
            <h6 className="eyebrow px-3 pb-1.5 pt-5">Chantiers épinglés</h6>
            {pinned.map((c) => (
              <NavLink key={c.id} to={`/app/chantiers/${c.id}`} draggable={false} className={({ isActive }) => cn('relative z-[1] flex h-9 touch:h-11 items-center gap-2.5 rounded-full px-3 text-[13.5px] font-medium transition-colors', isActive ? 'text-ink' : 'text-ink-2 hover:bg-white/45 hover:text-ink')}>
                <span className="relative grid h-[17px] w-[17px] place-items-center">
                  <svg viewBox="0 0 20 20" className="h-[17px] w-[17px] -rotate-90">
                    <circle cx="10" cy="10" r="7.5" fill="none" stroke="#ece8f6" strokeWidth="2.5" />
                    <circle cx="10" cy="10" r="7.5" fill="none" stroke={DEPT_TONE.chantiers.solid} strokeWidth="2.5" strokeLinecap="round" strokeDasharray={47.1} strokeDashoffset={47.1 * (1 - c.progress / 100)} />
                  </svg>
                </span>
                <span className="flex-1 truncate">{c.name.split('·')[1]?.trim() || c.name}</span>
                <span className="num text-[11.5px] text-ink-3">{c.progress} %</span>
              </NavLink>
            ))}
          </>
        )}

        {groups.map((g) =>
          collapsed ? (
            <div key={g.dept} className="mt-2 flex flex-col items-center gap-px border-t border-[#e6e1f1]/80 pt-2">
              {g.items.map((m) => (
                <Item key={m.key} to={`/app/${m.path}`} icon={<Icon name={m.icon} />} label={m.name} collapsed dept={m.dept} />
              ))}
            </div>
          ) : (
            <div key={g.dept}>
              <button onClick={() => setClosed((c) => ({ ...c, [g.dept]: !c[g.dept] }))} aria-expanded={!closed[g.dept]} className="eyebrow flex w-full items-center gap-1.5 px-3 pb-1.5 pt-5 transition hover:text-ink-2">
                <i className="h-1.5 w-1.5 rounded-full" style={{ background: DEPT_TONE[g.dept].solid }} />
                <span className="flex-1 text-left">{g.name}</span>
                <ChevronDown className={cn('h-3 w-3 transition-transform duration-300 ease-out-quint', closed[g.dept] && '-rotate-90')} />
              </button>
              <div className={cn('grid transition-[grid-template-rows,opacity] duration-300 ease-out-quint', closed[g.dept] ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100')}>
                <div className="space-y-px overflow-hidden">
                  {g.items.map((m) => (
                    <Item key={m.key} to={`/app/${m.path}`} icon={<Icon name={m.icon} />} label={m.name} dept={m.dept} />
                  ))}
                </div>
              </div>
            </div>
          ),
        )}

        {!collapsed && (
          <button onClick={() => navigate('/app/reglages/modules')} className="group mt-4 flex h-9 w-full items-center gap-2.5 rounded-full border border-dashed border-[#dcd5ec] px-3 text-[13px] font-medium text-ink-3 transition hover:border-vi-300 hover:bg-white/80 hover:text-vi-700">
            <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" /> Ajouter des outils
          </button>
        )}
      </nav>

      <div className={cn('mt-2 space-y-2 border-t border-[#e6e1f1]/80 pt-3', collapsed && 'flex w-full flex-col items-center')}>
        {collapsed ? (
          <Tip label="Parler à Bob (⌘J)" side="right">
            <button onClick={() => ui.askBob()} className="grid h-10 w-10 place-items-center rounded-full bg-dawn text-white shadow-dawn transition hover:scale-105 touch:h-11 touch:w-11" aria-label="Parler à Bob">
              <BobWave />
            </button>
          </Tip>
        ) : (
          <button onClick={() => ui.askBob()} className="group relative flex w-full items-center gap-2.5 overflow-hidden rounded-[18px] bg-white/80 p-2.5 text-left text-ink shadow-halo-sm ring-1 ring-white transition duration-300 hover:-translate-y-px hover:shadow-halo">
            <span aria-hidden className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-mag/15 blur-2xl opacity-70 transition-opacity group-hover:opacity-100" />
            <span className="relative grid h-8 w-8 place-items-center rounded-full bg-dawn text-white shadow-dawn">
              <BobWave active={pendingBob > 0} />
            </span>
            <span className="relative min-w-0 flex-1">
              <b className="block text-[13px] font-semibold">Bob</b>
              <span className="block truncate text-[11.5px] text-ink-3">{pendingBob ? `${pendingBob} action${pendingBob > 1 ? 's' : ''} à valider` : 'Dites-lui ce que vous voulez'}</span>
            </span>
            <kbd className="kbd-hint relative rounded-full bg-pale-v px-2 font-sans text-[11px] text-deep-v">⌘J</kbd>
          </button>
        )}
        <div className={cn('flex items-center gap-2.5', collapsed ? 'flex-col' : 'px-1 pt-0.5')}>
          <Avatar initials={`${s.user.firstName[0] ?? ''}${s.user.lastName[0] ?? ''}` || 'B'} dawn size={30} />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <b className="block truncate text-[12.5px] font-semibold">{s.user.firstName} {s.user.lastName}</b>
              <span className="block truncate text-[11.5px] text-ink-3">{ROLE_LABEL[s.user.role]} · Brix {s.plan === 'equipe' ? 'Équipe' : s.plan.charAt(0).toUpperCase() + s.plan.slice(1)}</span>
            </div>
          )}
          <NavLink to="/app/reglages" draggable={false} className="grid h-8 w-8 place-items-center rounded-full text-ink-3 transition hover:rotate-45 touch:h-11 touch:w-11 hover:bg-white/70 hover:text-ink" aria-label="Réglages">
            <Settings className="h-4 w-4" />
          </NavLink>
        </div>
      </div>
      </div>
    </aside>
  );
}

/**
 * Menu complet par-dessus l'écran (tablette, éditeurs plein écran) : même barre de verre, étiquettes visibles.
 * Se ferme au changement d'écran, au tap à côté et avec Échap.
 */
export function SidebarDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { pathname } = useLocation();
  const { mounted, closing } = usePresence(open, 220);
  const panel = useRef<HTMLDivElement>(null);
  useModal(panel, open, onClose);
  const first = useRef(pathname);
  useEffect(() => {
    if (pathname !== first.current) onClose();
    first.current = pathname;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);
  if (!mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-[75]">
      <div aria-hidden className={cn('absolute inset-0 bg-[#1b1236]/15 backdrop-blur-[3px]', closing ? 'animate-[fade-out_.2s_ease_both]' : 'animate-[fade-in_.25s_ease_both]')} onClick={onClose} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        tabIndex={-1}
        className={cn('absolute inset-y-0 left-0 outline-none', closing ? 'animate-[drawer-out_.2s_var(--ease)_both]' : 'animate-[drawer-in_.36s_var(--ease)_both]')}
      >
        <Sidebar drawer onClose={onClose} />
      </div>
    </div>,
    document.body,
  );
}
