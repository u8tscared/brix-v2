import { useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Inbox, Plus } from 'lucide-react';
import { Button, Card, CardHeader, cn, IconTile, PageHeader, Sheet, Stat, Switch, toast } from '@/components/ui';
import { AnimatedNumber } from '@/components/motion';
import { PhotoArt } from '@/modules/chantiers/components/common/PhotoArt';
import { artFor } from './lib';
import { capitalize, dayOffset, todayISO, uid } from '@/lib/format';
import { useBrix } from '@/lib/store';
import { StatStrip } from '@/modules/vendre/components/StatStrip';
import { NETWORKS, PostCard } from './components/PostCard';
import { useVisi } from './store';

const DOT = { publie: 'bg-ok', programme: 'bg-[#0a66c2]', pret: 'bg-[#e11d48]' } as const;

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
      <PageHeader icon={<IconTile name="Share2" dept="visibilite" size="lg" />} title="Réseaux sociaux" subtitle="À chaque fin de chantier, Bob prépare un avant/après. Vous validez, c’est publié." actions={<Button variant="primary" icon={<Plus />} onClick={() => setCreating(true)}>Nouvelle publication</Button>} />

      <StatStrip>
        <Stat label="Vues ce mois" value={<AnimatedNumber value={2340} />} sub="+38 % par rapport au mois dernier" />
        <Stat label="Publications" value={<AnimatedNumber value={done.length} />} sub={`${ready.length} en attente`} />
        <Stat label="Demandes venues des réseaux" value={<AnimatedNumber value={3} />} sub="arrivées dans Demandes" />
        <Stat label="Temps passé" value="0 min" sub="Bob s’occupe de tout" />
      </StatStrip>

      <div className="grid gap-5 [&>*]:min-w-0 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <h2 className="eyebrow px-1">À valider{ready.length > 0 && <span className="num ml-1.5 text-ink-3">{ready.length}</span>}</h2>
          {ready.length ? (
            <div className="stagger grid gap-4 [&>*]:min-w-0 md:grid-cols-2">{ready.map((p) => <PostCard key={p.id} post={p} />)}</div>
          ) : (
            <Card className="flex flex-col items-center px-6 py-10 text-center">
              <IconTile icon={<Inbox strokeWidth={1.75} />} dept="visibilite" size="lg" />
              <div className="mt-4 text-[15px] font-semibold">Tout est publié</div>
              <p className="mt-1 max-w-xs text-[13px] text-ink-2">À la prochaine fin de chantier, Bob préparera un avant/après. Vous pouvez aussi en créer un maintenant.</p>
              <Button className="mt-5" icon={<Plus />} onClick={() => setCreating(true)}>Préparer une publication</Button>
            </Card>
          )}
          {done.length > 0 && (
            <>
              <h2 className="eyebrow px-1 pt-3">Déjà publiées</h2>
              <div className="grid gap-4 [&>*]:min-w-0 md:grid-cols-2">{done.map((p) => <PostCard key={p.id} post={p} />)}</div>
            </>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Comptes reliés" meta={`${NETWORKS.filter((n) => accounts[n.key]).length} sur ${NETWORKS.length}`} />
            {NETWORKS.map((n) => (
              <div key={n.key} className="flex min-h-[54px] items-center gap-3 border-b border-line px-4 last:border-b-0">
                <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-[9px] transition-[background,color] duration-300', accounts[n.key] ? 'text-white' : 'bg-sub text-ink-3')} style={accounts[n.key] ? { background: n.color } : undefined}><n.icon className="h-4 w-4" strokeWidth={1.75} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-medium">{n.label}</span>
                  <span className="block text-[11.5px] text-ink-3">{accounts[n.key] ? 'Relié, Bob peut publier' : 'Non relié'}</span>
                </span>
                <Switch checked={!!accounts[n.key]} onChange={(on) => { setAccount(n.key, on); toast(on ? `${n.label} relié (démo)` : `${n.label} retiré`, on ? 'ok' : 'info'); }} label={n.label} />
              </div>
            ))}
          </Card>

          <Card>
            <div className="flex h-12 items-center gap-1 border-b border-line px-2">
              <button onClick={() => setOffset((o) => o - 1)} className="grid h-10 w-10 place-items-center rounded-lg text-ink-2 hover:bg-sub" aria-label="Mois précédent"><ChevronLeft className="h-4 w-4" /></button>
              <span className="flex-1 text-center text-[13.5px] font-semibold">{capitalize(base.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }))}</span>
              <button onClick={() => setOffset((o) => o + 1)} className="grid h-10 w-10 place-items-center rounded-lg text-ink-2 hover:bg-sub" aria-label="Mois suivant"><ChevronRight className="h-4 w-4" /></button>
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
                    className={cn('flex h-10 flex-col items-center justify-center gap-0.5 rounded-lg text-[12.5px] transition-colors duration-200', today ? 'bg-[#15122a] font-semibold text-white' : sel === d ? 'bg-[#fdecef] text-[#be123c]' : ps.length ? 'hover:bg-sub' : 'text-ink-2')}
                    aria-label={ps.length ? `${ps.length} publication${ps.length > 1 ? 's' : ''} le ${Number(d.slice(8))}` : undefined}
                  >
                    <span className="num leading-none">{Number(d.slice(8))}</span>
                    <span className="flex h-1.5 gap-0.5">{ps.slice(0, 3).map((p) => <i key={p.id} className={cn('h-1.5 w-1.5 animate-pop rounded-full', DOT[p.status], today && 'ring-1 ring-white')} />)}</span>
                  </button>
                );
              })}
            </div>
            {sel && (
              <div className="animate-[fade-up_.3s_var(--ease)_both] space-y-1 border-t border-line px-4 py-3">
                {posts.filter((p) => p.date === sel).map((p) => (
                  <div key={p.id} className="flex items-center gap-2 text-[12.5px]">
                    <i className={cn('h-2 w-2 shrink-0 rounded-full', DOT[p.status])} />
                    <span className="min-w-0 flex-1 truncate">{chantiers.find((c) => c.id === p.chantierId)?.name ?? 'Chantier'}</span>
                    <span className="shrink-0 text-ink-3">{p.status === 'publie' ? 'Publiée' : p.status === 'programme' ? 'Programmée' : 'À valider'}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-3 border-t border-line px-4 py-2.5 text-[11.5px] text-ink-2">
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
              <button key={c.id} type="button" role="radio" aria-checked={on} onClick={() => setPick(c.id)} className={cn('flex w-full items-center gap-3 rounded-[12px] p-2 text-left transition-shadow duration-200', on ? 'shadow-[0_0_0_1.5px_var(--ink)]' : 'shadow-[0_0_0_1px_var(--line2)] hover:shadow-[0_0_0_1px_#cfcbdd]')}>
                <span className="relative h-12 w-16 shrink-0 overflow-hidden rounded-[8px]"><PhotoArt art={artFor(c.id)} phase="apres" seed={c.id + 'apres'} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-medium">{c.name}</span>
                  <span className="block truncate text-[12px] text-ink-3">{c.city}</span>
                </span>
                <span className={cn('mr-1 grid h-5 w-5 shrink-0 place-items-center rounded-full transition-colors duration-200', on ? 'bg-ink text-white' : 'shadow-[inset_0_0_0_1.5px_var(--line2)]')}>{on && <Check className="h-3 w-3 animate-pop" strokeWidth={3} />}</span>
              </button>
            );
          })}
        </div>
      </Sheet>
    </div>
  );
}
