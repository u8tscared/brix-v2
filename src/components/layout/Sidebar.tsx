import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AudioLines, ChevronDown, ChevronsUpDown, LayoutDashboard, PanelLeftClose, PanelLeftOpen, Plus, Search, Settings } from 'lucide-react';
import { Wordmark, LogoIcon } from '@/components/brand/Logo';
import { Avatar, Icon, Kbd, cn } from '@/components/ui';
import { ROLE_LABEL, TRADE_BY_KEY } from '@/lib/catalog';
import { useBrix } from '@/lib/store';
import { useUI } from '@/lib/ui';
import { buildNav } from './nav';

function Item({ to, icon, label, badge, collapsed, end }: { to: string; icon: React.ReactNode; label: string; badge?: number | string; collapsed?: boolean; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        cn(
          'group flex h-8 items-center gap-2.5 rounded-[7px] text-[13px] font-medium transition',
          collapsed ? 'w-10 justify-center' : 'px-2',
          isActive ? 'bg-white text-ink shadow-[0_0_0_1px_var(--line2),0_1px_2px_rgba(0,0,0,.04)] [&_svg]:text-vi-700' : 'text-ink-2 hover:bg-white/70 hover:text-ink',
        )
      }
    >
      <span className="text-ink-3 transition group-hover:text-ink-2 [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
      {!collapsed && <span className="flex-1 truncate">{label}</span>}
      {!collapsed && badge !== undefined && badge !== 0 && <em className="rounded-full bg-vi-50 px-1.5 text-[11px] font-semibold not-italic text-vi-700">{badge}</em>}
    </NavLink>
  );
}

export function Sidebar({ forceCollapsed = false }: { forceCollapsed?: boolean }) {
  const s = useBrix();
  const ui = useUI();
  const navigate = useNavigate();
  const collapsed = forceCollapsed || s.prefs.sidebarCollapsed;
  const { primary, groups } = buildNav(s.enabled);
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  const trade = TRADE_BY_KEY[s.company.trade];

  const badges: Record<string, number> = {
    leads: s.leads.filter((l) => l.status === 'nouveau').length,
    devis: s.devis.filter((d) => d.status === 'vu' || d.status === 'envoye').length,
    factures: s.factures.filter((f) => f.status === 'en_retard').length,
    chantiers: s.chantiers.filter((c) => c.status === 'en_cours').length,
  };
  const pinned = s.chantiers.filter((c) => c.pinned).slice(0, 3);
  const pendingBob = s.bob.filter((b) => !b.done).length;

  return (
    <aside className={cn('sticky top-0 flex h-dvh shrink-0 flex-col border-r border-line bg-side transition-[width] duration-200', collapsed ? 'w-[64px] items-center px-2 py-3' : 'w-[240px] px-2.5 py-3.5')}>
      <div className={cn('flex items-center', collapsed ? 'mb-3 flex-col gap-2' : 'mb-2 justify-between px-2 pb-2')}>
        {collapsed ? <LogoIcon className="h-8 w-8" /> : <Wordmark className="h-[22px]" />}
        {!forceCollapsed && (
          <button onClick={() => s.setPrefs({ sidebarCollapsed: !collapsed })} className="grid h-7 w-7 place-items-center rounded-md text-ink-3 hover:bg-white hover:text-ink" aria-label="Réduire le menu">
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        )}
      </div>

      {!collapsed && (
        <button onClick={() => navigate('/app/reglages/entreprise')} className="flex h-9 items-center gap-2.5 rounded-lg px-2 text-left hover:bg-white">
          <span className="grid h-[22px] w-[22px] place-items-center rounded-md bg-vi-100 text-[10px] font-bold text-vi-700">{s.company.logoInitials || 'B'}</span>
          <b className="flex-1 truncate text-[13px] font-semibold">{s.company.name || 'Mon entreprise'}</b>
          <ChevronsUpDown className="h-3.5 w-3.5 text-ink-3" />
        </button>
      )}

      <button onClick={() => ui.set({ palette: true })} className={cn('my-2 flex items-center gap-2 rounded-lg border border-line2 bg-white text-[13px] text-ink-3 transition hover:border-vi-200', collapsed ? 'h-9 w-10 justify-center' : 'h-8 px-2')} aria-label="Rechercher">
        <Search className="h-4 w-4" />
        {!collapsed && (
          <>
            <span className="flex-1 text-left">Rechercher</span>
            <Kbd>⌘K</Kbd>
          </>
        )}
      </button>

      <nav className={cn('-mx-1 flex-1 overflow-y-auto px-1 scrollbar-none', collapsed && 'flex flex-col items-center')}>
        <div className="space-y-0.5">
          <Item to="/app" end icon={<LayoutDashboard />} label="Cockpit" collapsed={collapsed} />
          {primary.map((m) => (
            <Item key={m.key} to={`/app/${m.path}`} icon={<Icon name={m.icon} />} label={m.name} badge={badges[m.key]} collapsed={collapsed} />
          ))}
        </div>

        {!collapsed && trade && s.enabled.includes('outils_metier') && (
          <>
            <h6 className="px-2 pb-1.5 pt-4 text-[11px] font-semibold uppercase tracking-[.05em] text-ink-3">{trade.name}</h6>
            <div className="space-y-0.5">
              {trade.tools.slice(0, 4).map((t) => (
                <Item key={t.key} to={`/app/outils/${t.key}`} icon={<Icon name={t.icon} />} label={t.name} />
              ))}
            </div>
          </>
        )}
        {collapsed && s.enabled.includes('outils_metier') && <div className="my-2 h-px w-8 bg-line" />}
        {collapsed && s.enabled.includes('outils_metier') && <Item to="/app/outils" icon={<Icon name="Calculator" />} label="Outils métier" collapsed />}

        {!collapsed && pinned.length > 0 && (
          <>
            <h6 className="px-2 pb-1.5 pt-4 text-[11px] font-semibold uppercase tracking-[.05em] text-ink-3">Chantiers épinglés</h6>
            {pinned.map((c) => (
              <NavLink key={c.id} to={`/app/chantiers/${c.id}`} className={({ isActive }) => cn('flex h-8 items-center gap-2.5 rounded-[7px] px-2 text-[13px] font-medium', isActive ? 'bg-white text-ink' : 'text-ink-2 hover:bg-white/70')}>
                <i className="h-1.5 w-1.5 rounded-full bg-vi-700" />
                <span className="flex-1 truncate">{c.name.split('·')[1]?.trim() || c.name}</span>
                <span className="text-[11px] text-ink-3">{c.progress} %</span>
              </NavLink>
            ))}
          </>
        )}

        {groups.map((g) =>
          collapsed ? (
            <div key={g.dept} className="mt-2 flex flex-col items-center gap-0.5 border-t border-line pt-2">
              {g.items.map((m) => (
                <Item key={m.key} to={`/app/${m.path}`} icon={<Icon name={m.icon} />} label={m.name} collapsed />
              ))}
            </div>
          ) : (
            <div key={g.dept}>
              <button onClick={() => setClosed((c) => ({ ...c, [g.dept]: !c[g.dept] }))} className="flex w-full items-center gap-1 px-2 pb-1.5 pt-4 text-[11px] font-semibold uppercase tracking-[.05em] text-ink-3 hover:text-ink-2">
                <span className="flex-1 text-left">{g.name}</span>
                <ChevronDown className={cn('h-3 w-3 transition', closed[g.dept] && '-rotate-90')} />
              </button>
              {!closed[g.dept] && (
                <div className="space-y-0.5">
                  {g.items.map((m) => (
                    <Item key={m.key} to={`/app/${m.path}`} icon={<Icon name={m.icon} />} label={m.name} />
                  ))}
                </div>
              )}
            </div>
          ),
        )}

        {!collapsed && (
          <button onClick={() => navigate('/app/reglages/modules')} className="mt-3 flex h-8 w-full items-center gap-2.5 rounded-[7px] px-2 text-[13px] font-medium text-ink-3 hover:bg-white hover:text-ink">
            <Plus className="h-4 w-4" /> Ajouter des outils
          </button>
        )}
      </nav>

      <div className={cn('mt-2 space-y-2', collapsed && 'flex flex-col items-center')}>
        {collapsed ? (
          <button onClick={() => ui.askBob()} className="grid h-10 w-10 place-items-center rounded-full bg-ink text-white" aria-label="Parler à Bob">
            <AudioLines className="h-4 w-4" />
          </button>
        ) : (
          <button onClick={() => ui.askBob()} className="flex w-full items-center gap-2.5 rounded-[10px] border border-line2 bg-white p-2.5 text-left transition hover:shadow-card">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-ink text-white">
              <AudioLines className="h-[15px] w-[15px]" />
            </span>
            <span className="min-w-0 flex-1">
              <b className="block text-[12.5px] font-semibold">Bob</b>
              <span className="block truncate text-[11.5px] text-ink-2">{pendingBob ? `${pendingBob} actions à valider` : 'Demande-moi ce que tu veux'}</span>
            </span>
            <Kbd>⌘J</Kbd>
          </button>
        )}
        <div className={cn('flex items-center gap-2.5', collapsed ? 'flex-col' : 'px-1.5 pt-1')}>
          <Avatar initials={`${s.user.firstName[0] ?? ''}${s.user.lastName[0] ?? ''}` || 'B'} color="#17171f" size={26} />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <b className="block truncate text-[12.5px] font-semibold">{s.user.firstName} {s.user.lastName}</b>
              <span className="block truncate text-[11.5px] text-ink-3">{ROLE_LABEL[s.user.role]} · Brix {s.plan === 'equipe' ? 'Équipe' : s.plan.charAt(0).toUpperCase() + s.plan.slice(1)}</span>
            </div>
          )}
          <NavLink to="/app/reglages" className="grid h-7 w-7 place-items-center rounded-md text-ink-3 hover:bg-white hover:text-ink" aria-label="Réglages">
            <Settings className="h-4 w-4" />
          </NavLink>
        </div>
      </div>
    </aside>
  );
}
