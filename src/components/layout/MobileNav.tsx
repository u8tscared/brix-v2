import { NavLink, useNavigate } from 'react-router-dom';
import { HardHat, Home, LayoutGrid, Mic, FileText } from 'lucide-react';
import { Icon, Sheet, cn } from '@/components/ui';
import { DEPARTMENTS, MODULES, TRADE_BY_KEY } from '@/lib/catalog';
import { useBrix } from '@/lib/store';
import { useUI } from '@/lib/ui';

const Tab = ({ to, icon, label, end }: { to: string; icon: React.ReactNode; label: string; end?: boolean }) => (
  <NavLink to={to} end={end} className={({ isActive }) => cn('flex flex-1 flex-col items-center justify-center gap-1 text-[10.5px] font-medium', isActive ? 'text-ink' : 'text-ink-3')}>
    <span className="[&_svg]:h-[21px] [&_svg]:w-[21px]">{icon}</span>
    {label}
  </NavLink>
);

/** Barre d'onglets du téléphone : 4 onglets et le micro de Bob au centre. */
export function MobileNav() {
  const ui = useUI();
  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/90 pb-[var(--safe-b)] backdrop-blur-xl md:hidden">
        <div className="relative flex h-[62px] items-stretch">
          <Tab to="/app" end icon={<Home />} label="Aujourd'hui" />
          <Tab to="/app/chantiers" icon={<HardHat />} label="Chantiers" />
          <div className="w-[76px] shrink-0" />
          <Tab to="/app/devis" icon={<FileText />} label="Devis" />
          <button onClick={() => ui.set({ mobileMenu: true })} className="flex flex-1 flex-col items-center justify-center gap-1 text-[10.5px] font-medium text-ink-3">
            <LayoutGrid className="h-[21px] w-[21px]" />
            Tout
          </button>
          <button
            onClick={() => ui.askBob('', true)}
            aria-label="Parler à Bob"
            className="absolute left-1/2 top-[-18px] grid h-[60px] w-[60px] -translate-x-1/2 place-items-center rounded-full bg-ink text-white shadow-[0_10px_24px_-8px_rgba(23,23,31,.6)] ring-[5px] ring-white transition active:scale-95"
          >
            <Mic className="h-6 w-6" />
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
      <div className="space-y-5">
        {DEPARTMENTS.map((d) => {
          const mods = MODULES.filter((m) => m.dept === d.key && s.enabled.includes(m.key));
          if (!mods.length) return null;
          return (
            <div key={d.key}>
              <h6 className="mb-2 text-[11px] font-semibold uppercase tracking-[.05em] text-ink-3">{d.name}</h6>
              <div className="grid grid-cols-3 gap-2">
                {mods.map((m) => (
                  <button key={m.key} onClick={() => go(`/app/${m.path}`)} className="flex flex-col items-center gap-1.5 rounded-2xl border border-line bg-white px-1 py-3 text-center text-[11.5px] font-medium leading-tight active:scale-[.97]">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-vi-50 text-vi-700">
                      <Icon name={m.icon} className="h-[18px] w-[18px]" />
                    </span>
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
