import { useMemo, useState } from 'react';
import { Lock, Plus, Search } from 'lucide-react';
import { Badge, Button, Card, IconTile, Input, Segmented, Switch, cn, toast, DEPT_TONE } from '@/components/ui';
import { AnimatedNumber, DrawCheck, Ring } from '@/components/motion';
import { useBrix } from '@/lib/store';
import { DEPARTMENTS, MODULES, OFFERS, SIZES, TRADE_BY_KEY, planIncludes, recommendModules, sizeAtLeast, type ModuleDef } from '@/lib/catalog';
import { MenuPreview } from './MenuPreview';
import { UnlockSheet } from './UnlockSheet';

type Filter = 'all' | 'reco' | 'on' | 'new';

/** La bibliothèque de modules : une vitrine. Chaque module s'allume, et apparaît aussitôt dans le menu. */
export default function ModulesTab() {
  const { enabled, plan, company, priorities, toggleModule } = useBrix();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [fresh, setFresh] = useState<string | null>(null);
  const [unlock, setUnlock] = useState<ModuleDef | null>(null);
  const reco = useMemo(() => new Set(recommendModules(company.trade, company.size, priorities)), [company.trade, company.size, priorities]);
  const isOn = (m: ModuleDef) => !!m.core || enabled.includes(m.key);
  const missingReco = MODULES.filter((m) => reco.has(m.key) && !isOn(m) && planIncludes(plan, m.plan));
  const activeCount = MODULES.filter(isOn).length;
  const sizeName = SIZES.find((s) => s.key === company.size)?.name.toLowerCase();
  const tradeName = TRADE_BY_KEY[company.trade]?.name.toLowerCase();

  const visible = (m: ModuleDef) => {
    if (q && !`${m.name} ${m.short}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (filter === 'reco') return reco.has(m.key);
    if (filter === 'on') return isOn(m);
    if (filter === 'new') return !!m.isNew;
    return true;
  };

  const toggle = (m: ModuleDef, on: boolean) => {
    toggleModule(m.key, on);
    if (on) {
      setFresh(m.key);
      setTimeout(() => setFresh((f) => (f === m.key ? null : f)), 2600);
    }
    toast(on ? `${m.name} est dans votre menu.` : `${m.name} est rangé. Vos données sont gardées.`, on ? 'ok' : 'info', { label: 'Annuler', run: () => toggleModule(m.key, !on) });
  };
  const enableReco = () => {
    missingReco.forEach((m) => toggleModule(m.key, true));
    setFresh(missingReco[0]?.key ?? null);
    toast(`${missingReco.length} modules ajoutés à votre menu.`, 'ok', { label: 'Annuler', run: () => missingReco.forEach((m) => toggleModule(m.key, false)) });
  };

  const counts = { all: MODULES.length, reco: MODULES.filter((m) => reco.has(m.key)).length, on: activeCount, new: MODULES.filter((m) => m.isNew).length };

  return (
    <div className="grid items-start gap-6 2xl:grid-cols-[minmax(0,1fr)_250px]">
      <div className="min-w-0 space-y-6">
        <Card className="relative flex flex-wrap items-center gap-4 overflow-hidden p-4 sm:flex-nowrap sm:p-5">
          <div aria-hidden className="pointer-events-none absolute -left-10 -top-16 h-48 w-48 rounded-full bg-[radial-gradient(closest-side,#eef0fd,transparent)]" />
          <Ring value={(activeCount / MODULES.length) * 100} size={64} stroke={6} tone="dawn" className="relative">
            <span className="text-[15px] font-semibold"><AnimatedNumber value={activeCount} /></span>
          </Ring>
          <div className="relative min-w-0 flex-1 basis-[200px]">
            <div className="text-[16px] font-semibold tracking-[-0.02em]">Votre boîte à outils</div>
            <p className="mt-0.5 text-[13px] leading-relaxed text-ink-2">
              {activeCount} modules actifs sur {MODULES.length}. Activez seulement ce qui vous sert : le menu reste simple. Rien n’est perdu quand vous rangez un module.
            </p>
          </div>
          {missingReco.length > 0 && (
            <Button variant="secondary" className="relative shrink-0 max-sm:w-full max-sm:justify-center" icon={<Plus />} onClick={enableReco}>
              {missingReco.length > 1 ? `Ajouter les ${missingReco.length} conseillés` : `Ajouter ${missingReco[0].name}`}
            </Button>
          )}
        </Card>
        {missingReco.length > 0 && <p className="-mt-3 px-1 text-[12px] text-ink-3">Conseillés pour un {tradeName} ({sizeName}) : {missingReco.map((m) => m.name).join(', ')}.</p>}

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <Input icon={<Search />} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher un module" className="md:max-w-[260px]" />
          <Segmented value={filter} onChange={setFilter} options={[{ value: 'all', label: 'Tous', count: counts.all }, { value: 'reco', label: 'Conseillés', count: counts.reco }, { value: 'on', label: 'Actifs', count: counts.on }, { value: 'new', label: 'Nouveaux', count: counts.new }]} />
        </div>

        {DEPARTMENTS.map((d) => {
          const mods = MODULES.filter((m) => m.dept === d.key && visible(m));
          if (!mods.length) return null;
          const on = MODULES.filter((m) => m.dept === d.key && isOn(m)).length;
          const total = MODULES.filter((m) => m.dept === d.key).length;
          return (
            <section key={`${d.key}-${filter}-${q}`} className="animate-[fade-up_.45s_var(--ease)_both]">
              <div className="mb-3 flex items-center gap-2.5">
                <IconTile name={d.icon} dept={d.key} size="sm" />
                <div className="min-w-0 flex-1">
                  <h3 className="text-[14.5px] font-semibold tracking-[-0.015em]">{d.name}</h3>
                  <div className="truncate text-[12px] text-ink-3">{d.tagline}</div>
                </div>
                <span className="num text-[12px] font-medium text-ink-3">{on}/{total}</span>
              </div>
              <div className="stagger-fast grid gap-3 [&>*]:min-w-0 md:grid-cols-2">
                {mods.map((m) => (
                  <ModuleCard key={m.key} m={m} on={isOn(m)} fresh={fresh === m.key} reco={reco.has(m.key)} allowed={planIncludes(plan, m.plan)} small={!sizeAtLeast(company.size, m.minSize)} onToggle={(v) => toggle(m, v)} onUnlock={() => setUnlock(m)} />
                ))}
              </div>
            </section>
          );
        })}
        {DEPARTMENTS.every((d) => !MODULES.some((m) => m.dept === d.key && visible(m))) && (
          <Card className="px-6 py-12 text-center">
            <div className="text-[15px] font-semibold">Aucun module ne correspond</div>
            <p className="mt-1 text-[13px] text-ink-2">Essayez un autre mot.</p>
            <Button className="mt-4" onClick={() => { setQ(''); setFilter('all'); }}>Tout afficher</Button>
          </Card>
        )}
      </div>

      <MenuPreview fresh={fresh} />
      <UnlockSheet module={unlock} onClose={() => setUnlock(null)} onDone={(m) => { setFresh(m.key); setTimeout(() => setFresh(null), 2600); }} />
    </div>
  );
}

function ModuleCard({ m, on, fresh, reco, allowed, small, onToggle, onUnlock }: { m: ModuleDef; on: boolean; fresh: boolean; reco: boolean; allowed: boolean; small: boolean; onToggle: (v: boolean) => void; onUnlock: () => void }) {
  const t = DEPT_TONE[m.dept];
  const offer = OFFERS.find((o) => o.key === m.plan)!;
  return (
    <div
      className={cn('group relative flex h-full flex-col rounded-[16px] bg-white p-4 transition-[box-shadow,transform] duration-300 ease-out-quint', on ? 'shadow-[0_0_0_1px_var(--line2),0_6px_18px_-12px_rgba(19,15,38,.25)]' : 'shadow-card hover:shadow-raise')}
      style={fresh ? { boxShadow: `0 0 0 2px ${t.solid}, 0 10px 24px -14px ${t.fg}` } : undefined}
    >
      <div className="flex items-start gap-3">
        <span key={String(on)} className={cn(on && 'animate-pop')}>
          <IconTile name={m.icon} dept={m.dept} size="md" solid={on} className={cn(!on && 'opacity-80 grayscale-[.35]')} />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[14px] font-semibold tracking-[-0.015em]">{m.name}</span>
            {m.isNew && <span className="rounded-full px-1.5 py-px text-[10.5px] font-semibold uppercase tracking-[.06em]" style={{ background: t.bg, color: t.fg }}>Nouveau</span>}
          </div>
          <p className="mt-1 text-[12.5px] leading-snug text-ink-2">{m.short}</p>
        </div>
        <div className="shrink-0 pt-1">
          {m.core ? (
            <Switch checked disabled onChange={() => {}} label={`${m.name} (toujours inclus)`} />
          ) : allowed ? (
            <Switch checked={on} onChange={onToggle} label={m.name} />
          ) : (
            <button onClick={onUnlock} aria-label={`Débloquer ${m.name}`} className="press grid h-9 w-9 place-items-center rounded-full bg-sub text-ink-2 transition-colors hover:bg-ink hover:text-white">
              <Lock className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      <div className={cn('flex flex-wrap items-center gap-1.5 pl-[52px]', (fresh || m.core || (reco && !m.core) || !allowed || (small && !on)) && 'mt-2.5 min-h-[22px]')}>
        {fresh ? (
          <span className="inline-flex animate-[fade-up_.3s_var(--ease)_both] items-center gap-1 text-[12px] font-medium text-ok">
            <DrawCheck className="h-3.5 w-3.5" /> Ajouté à votre menu
          </span>
        ) : (
          <>
            {m.core && <Badge>Toujours inclus</Badge>}
            {reco && !m.core && <Badge tone="info">Conseillé</Badge>}
            {!allowed && (
              <button onClick={onUnlock} className="inline-flex h-[22px] items-center gap-1 rounded-full bg-ink px-2 text-[11.5px] font-medium text-white transition hover:bg-[#2a2547]">
                Offre {offer.name}{offer.price ? ` · ${String(offer.price).replace('.', ',')} € / mois` : ''}
              </button>
            )}
            {small && !on && <span className="text-[11.5px] text-ink-3">Utile surtout à plusieurs</span>}
          </>
        )}
      </div>
    </div>
  );
}
