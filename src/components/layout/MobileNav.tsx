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

/**
 * Barre d'onglets du téléphone (Halo) : pilule de verre qui flotte au-dessus du contenu, 4 onglets,
 * une pastille blanche qui glisse (ressort) sous l'onglet actif, et le micro de Bob au centre.
 */
export function MobileNav() {
  const ui = useUI();
  const { pathname } = useLocation();
  const active = ui.mobileMenu ? 4 : pathname === '/app' ? 0 : pathname.startsWith('/app/chantiers') ? 1 : pathname.startsWith('/app/devis') ? 3 : -1;
  return (
    <>
      <nav aria-label="Navigation principale" className="pointer-events-none fixed inset-x-0 bottom-0 z-40 pb-[calc(10px+var(--safe-b))] pl-[max(12px,var(--safe-l))] pr-[max(12px,var(--safe-r))] md:hidden [.kb-open_&]:hidden">
        <div className="glass-strong pointer-events-auto relative mx-auto flex h-[64px] max-w-[440px] items-stretch rounded-full">
          {active >= 0 && (
            <span
              aria-hidden
              className="absolute bottom-[6px] top-[6px] rounded-full bg-white shadow-pill transition-[left] duration-500 ease-spring"
              style={{ left: `calc(${active * 20}% + 5px)`, width: 'calc(20% - 10px)' }}
            />
          )}
          {TABS.map((t, i) =>
            t === null ? (
              <div key="bob" className="w-[20%] shrink-0" />
            ) : (
              <NavLink key={t.to} to={t.to} end={'end' in t} draggable={false} className={cn('relative flex w-[20%] flex-col items-center justify-center gap-[3px] text-[10.5px] font-medium tracking-[-0.01em] transition-colors', active === i ? 'text-ink' : 'text-ink-3')}>
                <t.icon className={cn('h-[20px] w-[20px] transition-transform duration-300 ease-spring', active === i && 'scale-110 text-deep-v')} strokeWidth={active === i ? 2.1 : 1.8} />
                <span>{t.label}</span>
              </NavLink>
            ),
          )}
          <button onClick={() => ui.set({ mobileMenu: true })} aria-label="Tout Brix" className={cn('relative flex w-[20%] flex-col items-center justify-center gap-[3px] text-[10.5px] font-medium tracking-[-0.01em] transition-colors', active === 4 ? 'text-ink' : 'text-ink-3')}>
            <LayoutGrid className={cn('h-[20px] w-[20px] transition-transform duration-300 ease-spring', active === 4 && 'scale-110 text-deep-v')} strokeWidth={active === 4 ? 2.1 : 1.8} />
            <span>Tout</span>
          </button>
          <button
            onClick={() => ui.askBob('', true)}
            aria-label="Parler à Bob"
            className="group absolute left-1/2 top-1/2 grid h-[52px] w-[52px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-night text-white shadow-[0_10px_24px_-8px_rgba(19,15,38,.6),0_0_0_4px_rgba(255,255,255,.9)] transition duration-300 ease-spring active:scale-90"
          >
            <span aria-hidden className="absolute inset-[-4px] rounded-full bg-dawn-diag opacity-0 blur-[3px] transition group-active:opacity-70" />
            <span aria-hidden className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_20%,rgba(217,70,239,.5),transparent_62%)]" />
            <Mic className="relative h-[22px] w-[22px]" />
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
                  <button key={m.key} onClick={() => go(`/app/${m.path}`)} className="flex flex-col items-center gap-2 rounded-[20px] bg-white px-1 pb-3 pt-3.5 text-center text-[11.5px] font-medium leading-tight shadow-halo-sm transition active:scale-[.95]">
                    <IconTile name={m.icon} dept={m.dept} size="md" />
                    {m.name}
                  </button>
                ))}
              </div>
              {d.key === 'metier' && trade && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {trade.tools.map((t) => (
                    <button key={t.key} onClick={() => go(`/app/outils/${t.key}`)} className="h-8 rounded-full bg-white px-3 text-xs font-medium text-ink-2 shadow-[0_0_0_1px_#ece8f6]">
                      {t.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button onClick={() => go('/app/reglages/modules')} className="h-11 rounded-full bg-white text-[13px] font-medium shadow-[0_0_0_1px_#ece8f6]">Ajouter des outils</button>
          <button onClick={() => go('/app/reglages')} className="h-11 rounded-full bg-white text-[13px] font-medium shadow-[0_0_0_1px_#ece8f6]">Réglages</button>
        </div>
      </div>
    </Sheet>
  );
}
