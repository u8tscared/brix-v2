import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRightLeft, Boxes, PackageMinus, ScanLine, Search, ShoppingCart, Truck } from 'lucide-react';
import { Badge, Button, Card, CardHeader, Input, PageHeader, Segmented, cn } from '@/components/ui';
import { useBrix } from '@/lib/store';
import { money, num, relative } from '@/lib/format';
import { LOCATIONS, type Article, type LocationKey } from './data';
import { isLow, totalQty, useAchats, vanLow } from './store';
import { MoveSheet } from './components/MoveSheet';
import { ScanSheet } from './components/ScanSheet';

type Filter = 'all' | LocationKey | 'low';

function QtyCell({ a, loc }: { a: Article; loc: LocationKey }) {
  const low = loc === 'depot' ? isLow(a) : vanLow(a, loc);
  return <span className={cn('num', low ? 'font-semibold text-bad' : a.qty[loc] === 0 ? 'text-ink-3' : '')}>{num(a.qty[loc], 1)}</span>;
}

export default function Stock() {
  const nav = useNavigate();
  const { articles, movements } = useAchats();
  const chantiers = useBrix((s) => s.chantiers);
  const employees = useBrix((s) => s.employees);
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [move, setMove] = useState<{ id?: string; kind: 'sortie' | 'transfert' | 'entree' } | null>(null);
  const [scan, setScan] = useState(false);

  const low = articles.filter(isLow);
  const vansLow = LOCATIONS.filter((l) => l.key !== 'depot').map((l) => ({ l, items: articles.filter((a) => vanLow(a, l.key)) }));
  const value = articles.reduce((s, a) => s + totalQty(a) * a.cost, 0);
  const toOrder = low.reduce((s, a) => s + Math.max(0, a.min * 2 - a.qty.depot) * a.cost, 0);

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

  return (
    <div className="space-y-5">
      <PageHeader title="Stock" subtitle="Ce qu’il reste au dépôt et dans chaque camion."
        actions={<>
          <Button variant="secondary" icon={<ScanLine className="h-4 w-4" />} onClick={() => setScan(true)}>Inventaire</Button>
          <Button variant="primary" icon={<PackageMinus className="h-4 w-4" />} onClick={() => setMove({ kind: 'sortie' })}>Sortie chantier</Button>
        </>} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className={cn('flex flex-col gap-4 p-4 sm:flex-row sm:items-center', low.length && 'border-[#fbd1d1]')}>
          <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-xl', low.length ? 'bg-bad-bg text-bad' : 'bg-ok-bg text-ok')}><ShoppingCart className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-semibold">{low.length ? `${low.length} article${low.length > 1 ? 's' : ''} sous le seuil au dépôt` : 'Rien à recommander'}</div>
            <div className="mt-0.5 text-[12.5px] text-ink-2">{low.length ? <>{low.map((a) => a.name.split(' ').slice(0, 3).join(' ')).join(', ')}. Commande conseillée : <span className="num font-medium text-ink">{money(toOrder, true)} HT</span>.</> : 'Tous les articles sont au-dessus de leur seuil.'}</div>
          </div>
          {low.length > 0 && <Button variant="dawn" icon={<ShoppingCart className="h-4 w-4" />} onClick={() => nav('/app/fournisseurs')}>Commander</Button>}
        </Card>
        <Card className="grid grid-cols-2">
          <div className="border-r border-line p-4">
            <div className="text-xs font-medium text-ink-2">Valeur du stock</div>
            <div className="num mt-1 text-[22px] font-semibold">{money(value, true)}</div>
            <div className="text-xs text-ink-3">au prix d’achat HT</div>
          </div>
          <div className="p-4">
            <div className="text-xs font-medium text-ink-2">Articles suivis</div>
            <div className="num mt-1 text-[22px] font-semibold">{articles.length}</div>
            <div className="text-xs text-ink-3">sur 3 emplacements</div>
          </div>
        </Card>
      </div>

      {vansLow.some((v) => v.items.length) && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {vansLow.filter((v) => v.items.length).map(({ l, items }) => {
            const driver = employees.find((e) => e.id === l.employeeId);
            return (
              <Card key={l.key} className="flex items-center gap-3 p-3.5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-warn-bg text-warn"><Truck className="h-[18px] w-[18px]" /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-semibold">{l.name} : {items.length} à compléter</div>
                  <div className="truncate text-[12px] text-ink-2">{items.map((a) => a.name.split(' ').slice(0, 3).join(' ')).join(', ')}{driver ? ` · à préparer pour ${driver.firstName}` : ''}</div>
                </div>
                <Button size="sm" variant="secondary" icon={<ArrowRightLeft className="h-3.5 w-3.5" />} onClick={() => setMove({ id: items[0].id, kind: 'transfert' })}>Remplir</Button>
              </Card>
            );
          })}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Segmented<Filter> value={filter} onChange={setFilter} options={[{ value: 'all', label: 'Tout' }, ...LOCATIONS.map((l) => ({ value: l.key as Filter, label: l.short })), { value: 'low', label: 'À commander', count: low.length + vansLow.reduce((s, v) => s + v.items.length, 0) }]} />
        <Input icon={<Search />} placeholder="Chercher un article ou une référence" value={q} onChange={(e) => setQ(e.target.value)} className="sm:ml-auto sm:w-[300px]" />
      </div>

      <Card className="overflow-hidden">
        <div className="hidden grid-cols-[minmax(0,2.2fr)_repeat(3,.6fr)_.6fr_.7fr_.8fr_88px] gap-3 border-b border-line bg-[#fafafc] px-4 py-2.5 text-[11.5px] font-medium text-ink-2 lg:grid">
          <span>Article</span>{LOCATIONS.map((l) => <span key={l.key} className="text-right">{l.short}</span>)}<span className="text-right">Total</span><span className="text-right">Seuil</span><span className="text-right">Valeur</span><span />
        </div>
        {list.length === 0 && <div className="px-4 py-10 text-center text-[13px] text-ink-3">Aucun article ne correspond.</div>}
        {list.map((a) => (
          <div key={a.id} className="border-b border-line px-4 py-3 last:border-0 lg:grid lg:grid-cols-[minmax(0,2.2fr)_repeat(3,.6fr)_.6fr_.7fr_.8fr_88px] lg:items-center lg:gap-3 lg:py-2.5">
            <div className="flex min-w-0 items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-medium">{a.name}</div>
                <div className="truncate text-[11.5px] text-ink-3">{a.ref} · {a.supplier} · {money(a.cost)} / {a.unit}</div>
              </div>
              {isLow(a) && <Badge tone="bad" className="lg:hidden">Sous le seuil</Badge>}
            </div>
            {LOCATIONS.map((l) => <span key={l.key} className="hidden text-right text-[13px] lg:block"><QtyCell a={a} loc={l.key} /></span>)}
            <span className="num hidden text-right text-[13px] font-semibold lg:block">{num(totalQty(a), 1)}</span>
            <span className="num hidden text-right text-[12.5px] text-ink-3 lg:block">{a.min}{a.vanMin ? ` · ${a.vanMin}` : ''}</span>
            <span className="num hidden text-right text-[13px] text-ink-2 lg:block">{money(totalQty(a) * a.cost, true)}</span>
            <span className="hidden justify-end lg:flex"><Button size="sm" variant="ghost" onClick={() => setMove({ id: a.id, kind: 'sortie' })}>Sortir</Button></span>

            <div className="mt-2 flex items-center gap-1.5 lg:hidden">
              {LOCATIONS.map((l) => (
                <span key={l.key} className={cn('flex h-8 items-center gap-1.5 rounded-lg bg-sub px-2 text-[12px]', (l.key === 'depot' ? isLow(a) : vanLow(a, l.key)) && 'bg-bad-bg')}>
                  <span className="text-ink-3">{l.short}</span><QtyCell a={a} loc={l.key} />
                </span>
              ))}
              <button onClick={() => setMove({ id: a.id, kind: 'sortie' })} className="ml-auto h-11 rounded-lg px-3 text-[13px] font-medium text-ink-2 hover:bg-sub">Sortir</button>
            </div>
          </div>
        ))}
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Sorties par chantier" meta="matériel imputé au coût réel" icon={<Boxes className="h-4 w-4 text-ink-3" />} />
          {byChantier.map(([id, v]) => {
            const c = chantiers.find((x) => x.id === id);
            return (
              <div key={id} className="flex min-h-[48px] items-center gap-3 border-b border-line px-4 py-2 last:border-0">
                <span className="min-w-0 flex-1 truncate text-[13.5px]">{c?.name ?? 'Chantier'}</span>
                <span className="num text-[13.5px] font-medium">{money(v)}</span>
              </div>
            );
          })}
        </Card>
        <Card>
          <CardHeader title="Derniers mouvements" />
          {movements.slice(0, 6).map((m) => {
            const a = articles.find((x) => x.id === m.articleId);
            const e = employees.find((x) => x.id === m.employeeId);
            const c = chantiers.find((x) => x.id === m.chantierId);
            return (
              <div key={m.id} className="flex min-h-[48px] items-center gap-3 border-b border-line px-4 py-2 last:border-0">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px]"><span className="num font-medium">{m.kind === 'entree' ? '+' : '−'}{m.qty} {a?.unit}</span> {a?.name}</div>
                  <div className="truncate text-[11.5px] text-ink-3">{LOCATIONS.find((l) => l.key === m.from)?.short}{m.kind === 'transfert' ? ` → ${LOCATIONS.find((l) => l.key === m.to)?.short}` : c ? ` → ${c.name}` : ''}{e ? ` · ${e.firstName}` : ''}</div>
                </div>
                <span className="shrink-0 text-[11.5px] text-ink-3">{relative(m.date)}</span>
              </div>
            );
          })}
        </Card>
      </div>

      <MoveSheet open={!!move} onClose={() => setMove(null)} articleId={move?.id} kind={move?.kind} />
      <ScanSheet open={scan} onClose={() => setScan(false)} />
    </div>
  );
}
