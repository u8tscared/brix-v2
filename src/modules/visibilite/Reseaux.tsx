import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button, Card, CardHeader, cn, PageHeader, Select, Sheet, Stat, Switch, toast } from '@/components/ui';
import { capitalize, dayOffset, todayISO, uid } from '@/lib/format';
import { useBrix } from '@/lib/store';
import { StatStrip } from '@/modules/vendre/components/StatStrip';
import { NETWORKS, PostCard } from './components/PostCard';
import { useVisi } from './store';

const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export default function Reseaux() {
  const { posts, accounts, setAccount, upsertPost } = useVisi();
  const chantiers = useBrix((s) => s.chantiers);
  const [offset, setOffset] = useState(0);
  const [creating, setCreating] = useState(false);
  const [pick, setPick] = useState(chantiers[0]?.id ?? '');

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
      <PageHeader title="Réseaux sociaux" subtitle="À chaque fin de chantier, Bob prépare un avant/après. Vous validez, c'est publié." actions={<Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>Nouvelle publication</Button>} />

      <StatStrip>
        <Stat label="Vues ce mois" value="2 340" sub="+38 % vs mois dernier" />
        <Stat label="Publications" value={done.length} sub={`${ready.length} en attente`} />
        <Stat label="Demandes venues des réseaux" value="3" sub="arrivées dans Demandes" />
        <Stat label="Temps passé" value="0 min" sub="Bob s'occupe de tout" />
      </StatStrip>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-4">
          <h2 className="px-1 text-[13px] font-semibold text-ink-2">À valider</h2>
          {ready.length ? <div className="grid gap-4 md:grid-cols-2">{ready.map((p) => <PostCard key={p.id} post={p} />)}</div> : <Card className="px-4 py-10 text-center text-[13px] text-ink-3">Rien en attente. La prochaine fin de chantier préparera une publication.</Card>}
          {done.length > 0 && (
            <>
              <h2 className="px-1 pt-2 text-[13px] font-semibold text-ink-2">Déjà publiées</h2>
              <div className="grid gap-4 md:grid-cols-2">{done.map((p) => <PostCard key={p.id} post={p} />)}</div>
            </>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Comptes reliés" />
            {NETWORKS.map((n) => (
              <div key={n.key} className="flex min-h-[54px] items-center gap-3 border-b border-line px-4 last:border-b-0">
                <n.icon className="h-[18px] w-[18px] text-ink-2" strokeWidth={1.75} />
                <span className="flex-1 text-[13.5px] font-medium">{n.label}</span>
                <span className="text-[12px] text-ink-3">{accounts[n.key] ? 'Relié' : ''}</span>
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
                return (
                  <div key={i} className={cn('flex h-10 flex-col items-center justify-center rounded-lg text-[12.5px]', d === todayISO() && 'bg-ink text-white', !d && 'opacity-0')}>
                    <span className="num">{d ? Number(d.slice(8)) : ''}</span>
                    <span className="flex h-1.5 gap-0.5">{ps.map((p) => <i key={p.id} className={cn('h-1.5 w-1.5 rounded-full', p.status === 'publie' ? 'bg-ok' : p.status === 'programme' ? 'bg-brand' : 'bg-mag')} />)}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-3 border-t border-line px-4 py-2.5 text-[11.5px] text-ink-2">
              <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-ok" />Publiée</span>
              <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-brand" />Programmée</span>
              <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-mag" />À valider</span>
            </div>
          </Card>
        </div>
      </div>

      <Sheet open={creating} onClose={() => setCreating(false)} title="Nouvelle publication" subtitle="Choisissez un chantier, Bob prend les photos avant/après et écrit le texte." footer={<><Button variant="ghost" onClick={() => setCreating(false)}>Annuler</Button><Button variant="primary" onClick={create}>Préparer</Button></>}>
        <Select value={pick} onChange={(e) => setPick(e.target.value)} aria-label="Chantier">
          {chantiers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </Sheet>
    </div>
  );
}
