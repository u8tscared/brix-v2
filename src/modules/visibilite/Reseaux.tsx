import { useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Eye, Images, Inbox, Plus } from 'lucide-react';
import { Button, Card, CardHeader, cn, EmptyState, IconTile, PageHeader, Sheet, Stat, Switch, toast } from '@/components/ui';
import { AnimatedNumber } from '@/components/motion';
import { PhotoArt } from '@/modules/chantiers/components/common/PhotoArt';
import { artFor } from './lib';
import { capitalize, dayOffset, todayISO, uid } from '@/lib/format';
import { useBrix } from '@/lib/store';
import { StatStrip } from '@/modules/vendre/components/StatStrip';
import { NETWORKS, PostCard } from './components/PostCard';
import { useVisi } from './store';

const DOT = { publie: 'bg-[#10b981]', programme: 'bg-[#3b82f6]', pret: 'bg-[#d946ef]' } as const;

const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export default function Reseaux() {
  const { posts, accounts, setAccount, upsertPost } = useVisi();
  const chantiers = useBrix((s) => s.chantiers);
  const [offset, setOffset] = useState(0);
  const [creating, setCreating] = useState(false);
  const [pick, setPick] = useState(chantiers[0]?.id ?? '');
  const [sel, setSel] = useState<string | null>(null);

  const ready = posts.filter((p) => p.status !== 'publie');
  const done = posts.filter((p) => p.status === 'publie');
  const base = new Date();
  base.setDate(1);
  base.setMonth(base.getMonth() + offset);
  const first = (base.getDay() + 6) % 7;
  const daysIn = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((first + daysIn) / 7) * 7 }, (_, i) => {
    const day = i - first + 1;
    return day >= 1 && day <= daysIn ? iso(new Date(base.getFullYear(), base.getMonth(), day, 12)) : null;
  });

  const create = () => {
    const c = chantiers.find((x) => x.id === pick);
    if (!c) return;
    const what = c.name.split('·')[1]?.trim() ?? c.name;
    upsertPost({ id: uid('p'), chantierId: c.id, text: `${capitalize(what)} à ${c.city} : un chantier propre, livré dans les temps. Merci à notre client pour sa confiance !`, networks: NETWORKS.filter((n) => accounts[n.key]).map((n) => n.key), status: 'pret', date: dayOffset(1) });
    setCreating(false);
    toast('Bob a préparé la publication avec les photos du chantier');
  };

  return (
    <div className="space-y-5">
      <PageHeader icon={<IconTile name="Share2" dept="visibilite" size="lg" />} title="Réseaux sociaux" titleMuted="vos chantiers parlent pour vous." subtitle="À chaque fin de chantier, Bob prépare un avant/après. Vous validez, c’est publié." actions={<Button variant="primary" icon={<Plus />} onClick={() => setCreating(true)}>Nouvelle publication</Button>} />

      <StatStrip>
        <Stat icon={<IconTile icon={<Eye />} tone="rose" size="row" />} label="Vues ce mois" value={<AnimatedNumber value={2340} />} sub="+38 % par rapport au mois dernier" />
        <Stat icon={<IconTile icon={<Images />} tone="peach" size="row" />} label="Publications" value={<AnimatedNumber value={done.length} />} sub={`${ready.length} en attente`} />
        <Stat icon={<IconTile name="Inbox" tone="violet" size="row" />} label="Demandes venues des réseaux" value={<AnimatedNumber value={3} />} sub="arrivées dans Demandes" />
        <Stat icon={<IconTile name="Timer" tone="green" size="row" />} label="Temps passé" value="0 min" sub="Bob s’occupe de tout" />
      </StatStrip>

      <div className="grid gap-5 [&>*]:min-w-0 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <h2 className="flex items-center gap-2 px-1 text-[16px] font-semibold tracking-[-0.025em]">À valider{ready.length > 0 && <span className="num inline-grid h-6 min-w-6 place-items-center rounded-full bg-pale-m px-2 text-[12px] font-medium text-deep-m">{ready.length}</span>}</h2>
          {ready.length ? (
            <div className="stagger grid gap-4 [&>*]:min-w-0 md:grid-cols-2">{ready.map((p) => <PostCard key={p.id} post={p} />)}</div>
          ) : (
            <EmptyState icon={<Inbox />} title="Tout est publié" text="À la prochaine fin de chantier, Bob préparera un avant/après. Vous pouvez aussi en créer un maintenant." action={<Button icon={<Plus />} onClick={() => setCreating(true)}>Préparer une publication</Button>} />
          )}
          {done.length > 0 && (
            <>
              <h2 className="px-1 pt-3 text-[16px] font-semibold tracking-[-0.025em]">Déjà publiées</h2>
              <div className="grid gap-4 [&>*]:min-w-0 md:grid-cols-2">{done.map((p) => <PostCard key={p.id} post={p} />)}</div>
            </>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader icon={<IconTile name="Share2" tone="rose" size="sm" />} title="Comptes reliés" meta={`${NETWORKS.filter((n) => accounts[n.key]).length} sur ${NETWORKS.length}`} />
            {NETWORKS.map((n) => (
              <div key={n.key} className="flex min-h-[60px] items-center gap-3 border-b border-halo-line px-4 last:border-b-0">
                <span className={cn('grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[11px] transition-[background,color] duration-300', accounts[n.key] ? '' : 'bg-pale-n text-ink-3')} style={accounts[n.key] ? { background: `${n.color}1a`, color: n.color } : undefined}><n.icon className="h-4 w-4" strokeWidth={1.75} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-medium">{n.label}</span>
                  <span className="block text-[11.5px] text-ink-3">{accounts[n.key] ? 'Relié, Bob peut publier' : 'Non relié'}</span>
                </span>
                <Switch checked={!!accounts[n.key]} onChange={(on) => { setAccount(n.key, on); toast(on ? `${n.label} relié (démo)` : `${n.label} retiré`, on ? 'ok' : 'info'); }} label={n.label} />
              </div>
            ))}
          </Card>

          <Card>
            <div className="flex h-14 items-center gap-1 border-b border-halo-line px-2">
              <button onClick={() => setOffset((o) => o - 1)} className="grid h-10 w-10 place-items-center rounded-full text-ink-2 transition-colors hover:bg-halo-hover" aria-label="Mois précédent"><ChevronLeft className="h-4 w-4" /></button>
              <span className="flex-1 text-center text-[13.5px] font-semibold">{capitalize(base.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }))}</span>
              <button onClick={() => setOffset((o) => o + 1)} className="grid h-10 w-10 place-items-center rounded-full text-ink-2 transition-colors hover:bg-halo-hover" aria-label="Mois suivant"><ChevronRight className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-7 px-2 pb-2 pt-1 text-center">
              {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => <span key={i} className="py-1.5 text-[11px] font-medium text-ink-3">{d}</span>)}
              {cells.map((d, i) => {
                const ps = d ? posts.filter((p) => p.date === d) : [];
                if (!d) return <span key={i} />;
                const today = d === todayISO();
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={!ps.length}
                    onClick={() => setSel(sel === d ? null : d)}
                    className={cn('mx-auto flex h-10 w-10 flex-col items-center justify-center gap-0.5 rounded-full text-[12.5px] transition-colors duration-200', today ? 'bg-ink font-semibold text-white' : sel === d ? 'bg-pale-r text-deep-r' : ps.length ? 'hover:bg-halo-hover' : 'text-ink-2')}
                    aria-label={ps.length ? `${ps.length} publication${ps.length > 1 ? 's' : ''} le ${Number(d.slice(8))}` : undefined}
                  >
                    <span className="num leading-none">{Number(d.slice(8))}</span>
                    <span className="flex h-1.5 gap-0.5">{ps.slice(0, 3).map((p) => <i key={p.id} className={cn('h-1.5 w-1.5 animate-pop rounded-full', DOT[p.status], today && 'ring-1 ring-white')} />)}</span>
                  </button>
                );
              })}
            </div>
            {sel && (
              <div className="animate-[fade-up_.3s_var(--ease)_both] space-y-1 border-t border-halo-line px-4 py-3">
                {posts.filter((p) => p.date === sel).map((p) => (
                  <div key={p.id} className="flex items-center gap-2 text-[12.5px]">
                    <i className={cn('h-2 w-2 shrink-0 rounded-full', DOT[p.status])} />
                    <span className="min-w-0 flex-1 truncate">{chantiers.find((c) => c.id === p.chantierId)?.name ?? 'Chantier'}</span>
                    <span className="shrink-0 text-ink-3">{p.status === 'publie' ? 'Publiée' : p.status === 'programme' ? 'Programmée' : 'À valider'}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-3 border-t border-halo-line px-4 py-3 text-[11.5px] text-ink-2">
              <span className="flex items-center gap-1.5"><i className={cn('h-2 w-2 rounded-full', DOT.publie)} />Publiée</span>
              <span className="flex items-center gap-1.5"><i className={cn('h-2 w-2 rounded-full', DOT.programme)} />Programmée</span>
              <span className="flex items-center gap-1.5"><i className={cn('h-2 w-2 rounded-full', DOT.pret)} />À valider</span>
            </div>
          </Card>
        </div>
      </div>

      <Sheet open={creating} onClose={() => setCreating(false)} title="Nouvelle publication" subtitle="Choisissez un chantier : Bob prend les photos avant/après et écrit le texte." footer={<><Button variant="ghost" onClick={() => setCreating(false)}>Annuler</Button><Button variant="primary" disabled={!pick} onClick={create}>Préparer la publication</Button></>}>
        <div role="radiogroup" className="stagger-fast space-y-2 pt-1">
          {chantiers.map((c) => {
            const on = pick === c.id;
            return (
              <button key={c.id} type="button" role="radio" aria-checked={on} onClick={() => setPick(c.id)} className={cn('flex w-full items-center gap-3 rounded-card-sm bg-white p-2 text-left transition-shadow duration-300', on ? 'shadow-[0_0_0_1.5px_#c4b5fd,0_10px_24px_-12px_rgba(109,40,217,.35)]' : 'shadow-halo-sm hover:shadow-[0_0_0_1px_#e3dcf3,0_10px_24px_-12px_rgba(60,30,120,.18)]')}>
                <span className="relative h-12 w-16 shrink-0 overflow-hidden rounded-[11px]"><PhotoArt art={artFor(c.id)} phase="apres" seed={c.id + 'apres'} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-medium">{c.name}</span>
                  <span className="block truncate text-[12px] text-ink-3">{c.city}</span>
                </span>
                <span className={cn('mr-1 grid h-5 w-5 shrink-0 place-items-center rounded-full transition-colors duration-200', on ? 'bg-deep-v text-white' : 'shadow-[inset_0_0_0_1.5px_#dcd5ee]')}>{on && <Check className="h-3 w-3 animate-pop" strokeWidth={3} />}</span>
              </button>
            );
          })}
        </div>
      </Sheet>
    </div>
  );
}
