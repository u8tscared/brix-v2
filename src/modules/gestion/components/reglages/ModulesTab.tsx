import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Badge, Card, Icon, Input, Segmented, Switch, cn, toast } from '@/components/ui';
import { useBrix } from '@/lib/store';
import { DEPARTMENTS, MODULES, OFFERS, SIZES, TRADE_BY_KEY, planIncludes, recommendModules, sizeAtLeast, type ModuleDef } from '@/lib/catalog';

type Filter = 'all' | 'reco' | 'on' | 'new';

/** La bibliothèque d'outils : chaque module s'allume ou s'éteint, rien d'inutile dans le menu. */
export default function ModulesTab() {
  const navigate = useNavigate();
  const { enabled, plan, company, priorities, toggleModule } = useBrix();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const reco = useMemo(() => new Set(recommendModules(company.trade, company.size, priorities)), [company.trade, company.size, priorities]);
  const missingReco = MODULES.filter((m) => reco.has(m.key) && !enabled.includes(m.key) && !m.core);
  const activeCount = MODULES.filter((m) => enabled.includes(m.key) || m.core).length;
  const sizeName = SIZES.find((s) => s.key === company.size)?.name.toLowerCase();
  const tradeName = TRADE_BY_KEY[company.trade]?.name.toLowerCase();

  const visible = (m: ModuleDef) => {
    if (q && !`${m.name} ${m.short}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (filter === 'reco') return reco.has(m.key);
    if (filter === 'on') return enabled.includes(m.key) || !!m.core;
    if (filter === 'new') return !!m.isNew;
    return true;
  };

  const toggle = (m: ModuleDef, on: boolean) => {
    toggleModule(m.key, on);
    toast(on ? `${m.name} est dans votre menu.` : `${m.name} est rangé. Vos données sont gardées.`, on ? 'ok' : 'info', { label: 'Annuler', run: () => toggleModule(m.key, !on) });
  };

  return (
    <div className="space-y-5">
      <Card className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold">Votre boîte à outils</div>
          <p className="text-[13px] text-ink-2">
            {activeCount} modules actifs sur {MODULES.length}. Activez seulement ce qui vous sert : le menu reste simple. Vous pouvez tout changer à tout moment, sans perdre de données.
          </p>
        </div>
        {missingReco.length > 0 && (
          <button onClick={() => setFilter('reco')} className="shrink-0 rounded-[10px] bg-vi-50 px-3 py-2 text-left text-[12.5px] font-medium text-vi-700 hover:bg-vi-100">
            {missingReco.length} module{missingReco.length > 1 ? 's' : ''} recommandé{missingReco.length > 1 ? 's' : ''} pour un {tradeName} ({sizeName})
          </button>
        )}
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input icon={<Search />} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher un module" className="sm:max-w-xs" />
        <Segmented value={filter} onChange={setFilter} options={[{ value: 'all', label: 'Tous' }, { value: 'reco', label: 'Recommandés' }, { value: 'on', label: 'Actifs' }, { value: 'new', label: 'Nouveautés' }]} />
      </div>

      {DEPARTMENTS.map((d) => {
        const mods = MODULES.filter((m) => m.dept === d.key && visible(m));
        if (!mods.length) return null;
        return (
          <section key={d.key}>
            <div className="mb-2 flex items-center gap-2">
              <Icon name={d.icon} className="h-4 w-4 text-ink-3" />
              <h3 className="text-[14px] font-semibold">{d.name}</h3>
              <span className="text-[12.5px] text-ink-3">{d.tagline}</span>
            </div>
            <Card>
              {mods.map((m) => {
                const on = enabled.includes(m.key) || !!m.core;
                const allowed = planIncludes(plan, m.plan);
                const offer = OFFERS.find((o) => o.key === m.plan)!;
                const small = !sizeAtLeast(company.size, m.minSize);
                return (
                  <div key={m.key} className="flex items-start gap-3 border-b border-line px-4 py-3 last:border-b-0">
                    <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border', on ? 'border-line bg-white text-ink' : 'border-line bg-sub text-ink-3')}>
                      <Icon name={m.icon} className="h-[18px] w-[18px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[13.5px] font-semibold">{m.name}</span>
                        {m.isNew && <Badge tone="violet">Nouveau</Badge>}
                        {reco.has(m.key) && !m.core && <Badge tone="info">Recommandé</Badge>}
                        {m.core && <Badge>Toujours inclus</Badge>}
                        {!allowed && <Badge tone="warn">Offre {offer.name}</Badge>}
                      </div>
                      <div className="mt-0.5 text-[12.5px] leading-snug text-ink-2">{m.short}</div>
                      {small && !on && <div className="mt-0.5 text-[11.5px] text-ink-3">Utile surtout à partir de {SIZES.find((s) => s.key === m.minSize)?.range}.</div>}
                    </div>
                    <div className="flex shrink-0 items-center pt-1">
                      {allowed ? (
                        <Switch checked={on} disabled={m.core} onChange={(v) => toggle(m, v)} label={m.name} />
                      ) : (
                        <button onClick={() => navigate('/app/reglages/offre')} className="h-9 rounded-lg border border-line2 px-3 text-[12.5px] font-medium text-ink-2 hover:text-ink">Débloquer</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </Card>
          </section>
        );
      })}
    </div>
  );
}
