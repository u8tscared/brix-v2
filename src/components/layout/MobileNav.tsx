import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { HardHat, Home, LayoutGrid, Mic, FileText } from 'lucide-react';
import { IconTile, Sheet, cn } from '@/components/ui';
import { DEPARTMENTS, MODULES, TRADE_BY_KEY } from '@/lib/catalog';
import { useBrix } from '@/lib/store';
import { useUI } from '@/lib/ui';

const TABS = [
  { to: '/app', end: true, icon: Home, label: "Aujourd'hui" },
  { to: '/app/chantiers', icon: HardHat, label: 'Chantiers' },
  null,
  { to: '/app/devis', icon: FileText, label: 'Devis' },
] as const;

/** Barre d'onglets du téléphone : 4 onglets, une pastille qui glisse sous l'onglet actif, et le micro de Bob au centre. */
export function MobileNav() {
  const ui = useUI();
  const { pathname } = useLocation();
  const active = ui.mobileMenu ? 4 : pathname === '/app' ? 0 : pathname.startsWith('/app/chantiers') ? 1 : pathname.startsWith('/app/devis') ? 3 : -1;
  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 pb-[var(--safe-b)] md:hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 border-t border-line/80 bg-white/85 backdrop-blur-2xl" />
        <div className="relative flex h-[64px] items-stretch px-1">
          {active >= 0 && (
            <span aria-hidden className="absolute top-[7px] h-[34px] w-[56px] rounded-full bg-[#efedf5] transition-[left] duration-[420ms] ease-spring" style={{ left: `calc(${active * 20 + 10}% - 28px)` }} />
          )}
          {TABS.map((t, i) =>
            t === null ? (
              <div key="bob" className="w-[20%] shrink-0" />
            ) : (
              <NavLink key={t.to} to={t.to} end={'end' in t} className={cn('relative flex w-[20%] flex-col items-center justify-start gap-[3px] pt-[12px] text-[10.5px] font-medium transition-colors', active === i ? 'text-ink' : 'text-ink-3')}>
                <t.icon className={cn('h-[21px] w-[21px] transition-transform duration-300 ease-spring', active === i && 'scale-110')} strokeWidth={active === i ? 2.1 : 1.75} />
                <span className="mt-[5px]">{t.label}</span>
              </NavLink>
            ),
          )}
          <button onClick={() => ui.set({ mobileMenu: true })} className={cn('relative flex w-[20%] flex-col items-center justify-start gap-[3px] pt-[12px] text-[10.5px] font-medium', active === 4 ? 'text-ink' : 'text-ink-3')}>
            <LayoutGrid className="h-[21px] w-[21px]" strokeWidth={1.75} />
            <span className="mt-[5px]">Tout</span>
          </button>
          <button
            onClick={() => ui.askBob('', true)}
            aria-label="Parler à Bob"
            className="group absolute left-1/2 top-[-20px] grid h-[62px] w-[62px] -translate-x-1/2 place-items-center rounded-full bg-night text-white shadow-[0_12px_28px_-10px_rgba(19,15,38,.7)] ring-[5px] ring-white transition active:scale-90"
          >
            <span aria-hidden className="absolute inset-[-5px] rounded-full bg-dawn-diag opacity-0 blur-[2px] transition group-active:opacity-60" />
            <span aria-hidden className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_20%,rgba(217,70,239,.45),transparent_60%)]" />
            <Mic className="relative h-6 w-6" />
          </button>
        </div>
      </nav>
      <MobileMenu />
    </>
  );
}

function MobileMenu() {
  const ui = useUI();
  const s = useBrix();
  const navigate = useNavigate();
  const go = (p: string) => {
    ui.set({ mobileMenu: false });
    navigate(p);
  };
  const trade = TRADE_BY_KEY[s.company.trade];
  return (
    <Sheet open={ui.mobileMenu} onClose={() => ui.set({ mobileMenu: false })} title="Tout Brix" subtitle="Vos outils, rangés par département">
      <div className="stagger space-y-6">
        {DEPARTMENTS.map((d) => {
          const mods = MODULES.filter((m) => m.dept === d.key && s.enabled.includes(m.key));
          if (!mods.length) return null;
          return (
            <div key={d.key}>
              <h6 className="eyebrow mb-2.5">{d.name}</h6>
              <div className="grid grid-cols-3 gap-2">
                {mods.map((m) => (
                  <button key={m.key} onClick={() => go(`/app/${m.path}`)} className="flex flex-col items-center gap-2 rounded-[18px] bg-sub px-1 pb-3 pt-3.5 text-center text-[11.5px] font-medium leading-tight transition active:scale-[.95]">
                    <IconTile name={m.icon} dept={m.dept} size="md" />
                    {m.name}
                  </button>
                ))}
              </div>
              {d.key === 'metier' && trade && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {trade.tools.map((t) => (
                    <button key={t.key} onClick={() => go(`/app/outils/${t.key}`)} className="rounded-full border border-line bg-sub px-3 py-1.5 text-xs font-medium text-ink-2">
                      {t.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button onClick={() => go('/app/reglages/modules')} className="h-11 rounded-xl border border-line2 text-[13px] font-medium">Ajouter des outils</button>
          <button onClick={() => go('/app/reglages')} className="h-11 rounded-xl border border-line2 text-[13px] font-medium">Réglages</button>
        </div>
      </div>
    </Sheet>
  );
}
