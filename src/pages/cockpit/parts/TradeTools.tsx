import { useNavigate } from 'react-router-dom';
import { IconTile } from '@/components/ui';
import { TRADE_BY_KEY, type DepartmentKey } from '@/lib/catalog';
import { useBrix } from '@/lib/store';

/** Raccourcis vers les calculs du métier (téléphone). */
export function TradeTools() {
  const trade = useBrix((s) => TRADE_BY_KEY[s.company.trade]);
  const on = useBrix((s) => s.enabled.includes('outils_metier'));
  const canOrder = useBrix((s) => s.enabled.includes('fournisseurs'));
  const navigate = useNavigate();
  if (!trade || !on) return null;
  const tools: { key: string; name: string; icon: string; dept: DepartmentKey; to: string }[] = trade.tools.slice(0, canOrder ? 3 : 4).map((t) => ({ key: t.key, name: t.name, icon: t.icon, dept: 'metier', to: `/app/outils/${t.key}` }));
  if (canOrder) tools.push({ key: 'cmd', name: 'Commander', icon: 'Truck', dept: 'achats', to: '/app/fournisseurs' });
  return (
    <section aria-label="Outils du métier">
      <div className="mb-2.5 flex items-end justify-between px-1">
        <h2 className="text-[17px] font-semibold tracking-[-0.025em]">Outils {trade.name.toLowerCase()}</h2>
        <button onClick={() => navigate('/app/outils')} className="-my-2 py-2 pl-3 text-[12.5px] text-ink-2">Tout voir</button>
      </div>
      <div className="stagger-fast grid grid-cols-4 gap-2">
        {tools.map((t) => (
          <button key={t.key} onClick={() => navigate(t.to)} className="press flex min-h-[92px] flex-col items-center justify-center gap-2 rounded-card-sm bg-white px-1 py-3 text-center text-[11.5px] font-medium leading-tight shadow-halo-sm">
            <IconTile name={t.icon} dept={t.dept} size="sm" />
            <span className="line-clamp-2">{t.name}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
