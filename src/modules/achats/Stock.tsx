import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDownLeft, ArrowRightLeft, ArrowUpRight, PackageMinus, ScanLine, Search, ShoppingCart, Truck } from 'lucide-react';
import { Avatar, Button, Card, IconTile, Input, PageHeader, Segmented, cn } from '@/components/ui';
import { AnimatedNumber, GrowBar } from '@/components/motion';
import { useBrix } from '@/lib/store';
import { money, relative } from '@/lib/format';
import { LOCATIONS, type LocationKey } from './data';
import { isLow, totalQty, useAchats, vanLow } from './store';
import { MoveSheet } from './components/MoveSheet';
import { ScanSheet } from './components/ScanSheet';
import { StockList } from './components/StockList';
import { BigMoney, Label, SectionHead, SplitBar } from '@/modules/finance/components/kit';

type Filter = 'all' | LocationKey | 'low';
const LOC_COLOR: Record<LocationKey, string> = { depot: '#10b981', van_yanis: '#6ee7b7', van_mehdi: '#c4ebd9' };
const short = (name: string) => name.split(' ').slice(0, 3).join(' ');

export default function Stock() {
  const nav = useNavigate();
  const { articles, movements } = useAchats();
  const chantiers = useBrix((s) => s.chantiers);
  const employees = useBrix((s) => s.employees);
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [move, setMove] = useState<{ id?: string; kind: 'sortie' | 'transfert' | 'entree' } | null>(null);
  const [scan, setScan] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  // Après un mouvement, la ligne concernée s'éclaire un instant avec une coche.
  const lastId = useRef(movements[0]?.id);
  useEffect(() => {
    const m = movements[0];
    if (!m || m.id === lastId.current) return;
    lastId.current = m.id;
    setFlash(m.articleId);
    const t = setTimeout(() => setFlash(null), 1800);
    return () => clearTimeout(t);
  }, [movements]);

  const low = articles.filter(isLow);
  const vansLow = LOCATIONS.filter((l) => l.key !== 'depot').map((l) => ({ l, items: articles.filter((a) => vanLow(a, l.key)) })).filter((v) => v.items.length);
  const value = articles.reduce((s, a) => s + totalQty(a) * a.cost, 0);
  const byLoc = LOCATIONS.map((l) => ({ ...l, value: articles.reduce((s, a) => s + a.qty[l.key] * a.cost, 0) }));
  const toOrder = low.reduce((s, a) => s + Math.max(0, a.min * 2 - a.qty.depot) * a.cost, 0);
  const lowCount = low.length + vansLow.reduce((s, v) => s + v.items.length, 0);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return articles.filter((a) => (!t || `${a.name} ${a.ref}`.toLowerCase().includes(t)) && (filter === 'low' ? isLow(a) || LOCATIONS.some((l) => vanLow(a, l.key)) : filter === 'all' || a.qty[filter] > 0 || vanLow(a, filter)));
  }, [articles, q, filter]);

  const byChantier = useMemo(() => {
    const m = new Map<string, number>();
    movements.filter((x) => x.kind === 'sortie' && x.chantierId).forEach((x) => {
      const a = articles.find((y) => y.id === x.articleId);
      m.set(x.chantierId!, (m.get(x.chantierId!) ?? 0) + x.qty * (a?.cost ?? 0));
    });
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [movements, articles]);
  const maxCh = byChantier[0]?.[1] ?? 1;

  return (
    <div className="space-y-5">
      <PageHeader
        icon={<IconTile name="Boxes" dept="achats" size="lg" />}
        title="Stock"
        titleMuted="compté sans y penser."
        subtitle="Ce qu’il reste au dépôt et dans chaque camion."
        actions={<>
          <Button variant="secondary" icon={<ScanLine />} onClick={() => setScan(true)} className="max-sm:flex-1">Inventaire</Button>
          <Button variant="primary" icon={<PackageMinus />} onClick={() => setMove({ kind: 'sortie' })} className="max-sm:flex-1">Sortie chantier</Button>
        </>}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        {/* Valeur et répartition */}
        <Card className="relative overflow-hidden p-5 md:p-6">
          <div aria-hidden className="pointer-events-none absolute -right-12 -top-16 h-48 w-64 rounded-full bg-[radial-gradient(closest-side,#dcf5ea,transparent)] opacity-90 blur-xl" />
          <Label>Valeur du stock, au prix d’achat HT</Label>
          <BigMoney value={value} dawn className="mt-2 block text-[40px] md:text-[44px]" />
          <div className="mt-1 text-[12.5px] text-ink-3"><AnimatedNumber value={articles.length} className="num font-medium text-ink-2" /> articles suivis sur 3 emplacements</div>
          <SplitBar className="mt-5 h-2.5" parts={byLoc.map((l) => ({ value: l.value, color: LOC_COLOR[l.key], label: l.name }))} />
          <div className="mt-3 grid grid-cols-3 gap-2">
            {byLoc.map((l) => (
              <div key={l.key} className="min-w-0">
                <div className="flex items-center gap-1.5 text-[11.5px] text-ink-3"><i className="h-2 w-2 shrink-0 rounded-full" style={{ background: LOC_COLOR[l.key] }} /><span className="truncate">{l.short}</span></div>
                <div className="num mt-0.5 text-[14px] font-semibold">{money(l.value, true)}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* À recommander : présent, mais sans crier */}
        <Card className="relative overflow-hidden p-5 md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <IconTile icon={<ShoppingCart />} tone={low.length ? 'amber' : 'green'} size="md" />
              <div className="min-w-0">
              <Label>À recommander</Label>
              <div className="mt-1 text-[18px] font-semibold tracking-[-0.03em]">{low.length ? `${low.length} article${low.length > 1 ? 's' : ''} sous le seuil au dépôt` : 'Rien à recommander'}</div>
              </div>
            </div>
            {low.length > 0 && <Button variant="primary" icon={<ShoppingCart />} onClick={() => nav('/app/fournisseurs')} className="max-sm:hidden">Commander</Button>}
          </div>
          {low.length ? (
            <>
              <div className="mt-4 space-y-1.5">
                {low.map((a) => (
                  <div key={a.id} className="flex min-h-[40px] items-center gap-3 rounded-full bg-halo-track/70 py-1.5 pl-4 pr-3">
                    <span className="min-w-0 flex-1 truncate text-[13px]">{short(a.name)}</span>
                    <GrowBar value={(a.qty.depot / a.min) * 100} className="w-16 shrink-0 bg-white sm:w-24" barClassName="bg-[#fbbf24]" />
                    <span className="num w-14 shrink-0 text-right text-[12.5px] text-ink-2"><span className="font-semibold text-ink">{a.qty.depot}</span> / {a.min}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[12.5px] text-ink-2">
                <span>Commande conseillée : <span className="num font-semibold text-ink">{money(toOrder, true)} HT</span></span>
                <Button variant="primary" icon={<ShoppingCart />} onClick={() => nav('/app/fournisseurs')} className="w-full sm:hidden">Commander</Button>
              </div>
            </>
          ) : (
            <p className="mt-2 text-[13px] text-ink-2">Tous les articles sont au-dessus de leur seuil. Brix vous prévient dès que l’un passe en dessous.</p>
          )}
        </Card>
      </div>

      {vansLow.length > 0 && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {vansLow.map(({ l, items }) => {
            const driver = employees.find((e) => e.id === l.employeeId);
            return (
              <div key={l.key} className="row-card">
                <span className="relative">
                  <IconTile icon={<Truck />} dept="achats" />
                  {driver && <Avatar initials={driver.initials} color={driver.color} size={20} className="absolute -bottom-1 -right-1 ring-2 ring-white" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-semibold">{l.name} <span className="font-normal text-ink-3">· {items.length} à compléter</span></div>
                  <div className="truncate text-[12px] text-ink-2">{items.map((a) => short(a.name)).join(', ')}</div>
                </div>
                <Button size="sm" variant="secondary" icon={<ArrowRightLeft />} onClick={() => setMove({ id: items[0].id, kind: 'transfert' })}>Remplir</Button>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="-mx-4 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:px-0">
          <Segmented<Filter> value={filter} onChange={setFilter} options={[{ value: 'all', label: 'Tout' }, ...LOCATIONS.map((l) => ({ value: l.key as Filter, label: l.short })), { value: 'low', label: 'À commander', count: lowCount }]} />
        </div>
        <Input icon={<Search />} placeholder="Chercher un article ou une référence" value={q} onChange={(e) => setQ(e.target.value)} className="sm:ml-auto sm:w-[300px]" />
      </div>

      <StockList list={list} flash={flash} onOut={(id) => setMove({ id, kind: 'sortie' })} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-4 md:p-5">
          <SectionHead title="Sorties par chantier" meta="ajoutées à leur coût réel" />
          <div className="mt-3 space-y-3.5">
            {byChantier.map(([id, v]) => {
              const c = chantiers.find((x) => x.id === id);
              return (
                <div key={id}>
                  <div className="flex items-baseline justify-between gap-3 text-[13.5px]">
                    <span className="min-w-0 truncate">{c?.name ?? 'Chantier'}</span>
                    <span className="num shrink-0 font-medium">{money(v)}</span>
                  </div>
                  <GrowBar value={(v / maxCh) * 100} className="mt-1.5" barClassName="bg-[#10b981]" />
                </div>
              );
            })}
          </div>
        </Card>
        <Card className="p-4 md:p-5">
          <SectionHead title="Derniers mouvements" />
          <div className="mt-2">
            {movements.slice(0, 6).map((m) => {
              const a = articles.find((x) => x.id === m.articleId);
              const e = employees.find((x) => x.id === m.employeeId);
              const c = chantiers.find((x) => x.id === m.chantierId);
              const Ico = m.kind === 'entree' ? ArrowDownLeft : m.kind === 'transfert' ? ArrowRightLeft : ArrowUpRight;
              return (
                <div key={m.id} className="flex min-h-[56px] items-center gap-3 border-b border-halo-line py-2 last:border-0">
                  <span className={cn('grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full', m.kind === 'entree' ? 'bg-pale-g text-deep-g' : m.kind === 'transfert' ? 'bg-pale-b text-deep-b' : 'bg-pale-p text-deep-p')}><Ico className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px]"><span className="num font-semibold">{m.kind === 'entree' ? '+' : '−'}{m.qty} {a?.unit}</span> {a?.name}</div>
                    <div className="truncate text-[11.5px] text-ink-3">{LOCATIONS.find((l) => l.key === m.from)?.short}{m.kind === 'transfert' ? ` vers ${LOCATIONS.find((l) => l.key === m.to)?.short}` : c ? ` vers ${c.name}` : ''}{e ? ` · ${e.firstName}` : ''}</div>
                  </div>
                  <span className="shrink-0 text-[11.5px] text-ink-3">{relative(m.date)}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <MoveSheet open={!!move} onClose={() => setMove(null)} articleId={move?.id} kind={move?.kind} />
      <ScanSheet open={scan} onClose={() => setScan(false)} />
    </div>
  );
}
