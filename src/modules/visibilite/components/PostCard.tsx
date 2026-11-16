import { useState } from 'react';
import { CalendarClock, Check, Facebook, Instagram, Linkedin, MapPin, Send } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Badge, Button, Card, cn, Input, Textarea, toast } from '@/components/ui';
import { capitalize, dateLong, dayOffset } from '@/lib/format';
import { useBrix } from '@/lib/store';
import { PhotoArt } from '@/modules/chantiers/components/common/PhotoArt';
import { artFor } from '../lib';
import { publishPost } from '../service';
import { useVisi, type Post } from '../store';

export const NETWORKS: { key: string; label: string; icon: LucideIcon }[] = [
  { key: 'facebook', label: 'Facebook', icon: Facebook },
  { key: 'instagram', label: 'Instagram', icon: Instagram },
  { key: 'google', label: 'Fiche Google', icon: MapPin },
  { key: 'linkedin', label: 'LinkedIn', icon: Linkedin },
];

export function PostCard({ post }: { post: Post }) {
  const chantier = useBrix((s) => s.chantiers.find((c) => c.id === post.chantierId));
  const { accounts, upsertPost } = useVisi();
  const [busy, setBusy] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [date, setDate] = useState(post.date > dayOffset(0) ? post.date : dayOffset(1));
  const done = post.status === 'publie';

  const publish = async () => {
    setBusy(true);
    await publishPost(post.id, post.networks);
    upsertPost({ ...post, status: 'publie', date: dayOffset(0), likes: 0 });
    setBusy(false);
    toast(`Publié sur ${post.networks.length} réseau${post.networks.length > 1 ? 'x' : ''} (démo)`);
  };
  const schedule = () => {
    upsertPost({ ...post, status: 'programme', date });
    setPlanning(false);
    toast(`Programmé pour le ${dateLong(date)}`);
  };

  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-2 gap-px bg-line">
        {(['avant', 'apres'] as const).map((ph) => (
          <div key={ph} className="relative aspect-[4/3] bg-white">
            <PhotoArt art={artFor(post.chantierId)} phase={ph} seed={post.chantierId + ph} />
            <span className="absolute left-2 top-2 rounded-md bg-white/90 px-2 py-0.5 text-[11px] font-semibold backdrop-blur">{ph === 'avant' ? 'Avant' : 'Après'}</span>
          </div>
        ))}
      </div>
      <div className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold">{chantier?.name ?? 'Chantier'}</span>
          {post.status === 'pret' && <Badge tone="violet">Prête</Badge>}
          {post.status === 'programme' && <Badge tone="info" icon={<CalendarClock />}>{capitalize(dateLong(post.date))}</Badge>}
          {done && <Badge tone="ok" icon={<Check />}>Publiée · {post.likes ?? 0} j'aime</Badge>}
        </div>
        {done ? (
          <p className="text-[13px] leading-relaxed text-ink-2">{post.text}</p>
        ) : (
          <Textarea value={post.text} onChange={(e) => upsertPost({ ...post, text: e.target.value })} className="h-[128px] text-[13px]" aria-label="Texte de la publication" />
        )}
        <div className="flex flex-wrap gap-1.5">
          {NETWORKS.filter((n) => accounts[n.key]).map((n) => {
            const on = post.networks.includes(n.key);
            return (
              <button key={n.key} disabled={done} onClick={() => upsertPost({ ...post, networks: on ? post.networks.filter((x) => x !== n.key) : [...post.networks, n.key] })} className={cn('flex h-9 items-center gap-1.5 rounded-full border px-3 text-[12px] font-medium transition disabled:cursor-default', on ? 'border-ink bg-ink text-white' : 'border-line text-ink-3')}>
                <n.icon className="h-3.5 w-3.5" strokeWidth={1.75} />{n.label}
              </button>
            );
          })}
        </div>
        {!done && (
          planning ? (
            <div className="flex gap-2">
              <Input type="date" value={date} min={dayOffset(0)} onChange={(e) => setDate(e.target.value)} className="flex-1" />
              <Button className="h-11" variant="primary" onClick={schedule}>Programmer</Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button variant="primary" className="flex-1 justify-center" icon={<Send className="h-4 w-4" />} loading={busy} disabled={!post.networks.length} onClick={publish}>Publier maintenant</Button>
              <Button icon={<CalendarClock className="h-4 w-4" />} onClick={() => setPlanning(true)}>Plus tard</Button>
            </div>
          )
        )}
      </div>
    </Card>
  );
}
