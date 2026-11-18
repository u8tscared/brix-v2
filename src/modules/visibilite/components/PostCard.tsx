import { useState } from 'react';
import { CalendarClock, Check, Facebook, Heart, Instagram, Linkedin, MapPin, Send, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Badge, Button, Card, cn, Input, Textarea, toast } from '@/components/ui';
import { capitalize, dateLong, dayOffset } from '@/lib/format';
import { useBrix } from '@/lib/store';
import { artFor } from '../lib';
import { publishPost } from '../service';
import { useVisi, type Post } from '../store';
import { BeforeAfter } from './BeforeAfter';

export const NETWORKS: { key: string; label: string; icon: LucideIcon; color: string }[] = [
  { key: 'facebook', label: 'Facebook', icon: Facebook, color: '#1877f2' },
  { key: 'instagram', label: 'Instagram', icon: Instagram, color: '#e1306c' },
  { key: 'google', label: 'Fiche Google', icon: MapPin, color: '#34a853' },
  { key: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: '#0a66c2' },
];

/** Prochain samedi (pour la suggestion « samedi matin », le meilleur moment pour les artisans). */
const nextSaturday = () => {
  const d = new Date();
  return dayOffset(((6 - d.getDay() + 7) % 7) || 7);
};

export function PostCard({ post }: { post: Post }) {
  const chantier = useBrix((s) => s.chantiers.find((c) => c.id === post.chantierId));
  const { accounts, upsertPost } = useVisi();
  const [busy, setBusy] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [date, setDate] = useState(post.date > dayOffset(0) ? post.date : dayOffset(1));
  const done = post.status === 'publie';
  const linked = NETWORKS.filter((n) => accounts[n.key]);

  const publish = async () => {
    setBusy(true);
    await publishPost(post.id, post.networks);
    upsertPost({ ...post, status: 'publie', date: dayOffset(0), likes: 0 });
    setBusy(false);
    toast(`Publié sur ${post.networks.length} réseau${post.networks.length > 1 ? 'x' : ''} (démo)`);
  };
  const schedule = (d = date) => {
    upsertPost({ ...post, status: 'programme', date: d });
    setPlanning(false);
    toast(`Programmé pour ${dateLong(d)}`);
  };

  return (
    <Card className="overflow-hidden">
      <BeforeAfter art={artFor(post.chantierId)} seed={post.chantierId} />
      <div className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-[14px] font-semibold tracking-[-0.01em]">{chantier?.name ?? 'Chantier'}</span>
          {post.status === 'pret' && <Badge tone="mag" dot>À valider</Badge>}
          {post.status === 'programme' && <Badge tone="info" icon={<CalendarClock />}>{capitalize(dateLong(post.date))}</Badge>}
          {done && <Badge tone="ok" icon={<Check />}>Publiée</Badge>}
        </div>
        {done ? (
          <>
            <p className="text-[13px] leading-relaxed text-ink-2">{post.text}</p>
            <div className="flex items-center gap-3 border-t border-halo-line pt-3 text-[12.5px] text-ink-2">
              <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5 fill-[#f43f5e] text-[#f43f5e]" /><span className="num font-medium text-ink">{post.likes ?? 0}</span> j’aime</span>
              <span className="flex -space-x-1">{NETWORKS.filter((n) => post.networks.includes(n.key)).map((n) => <span key={n.key} className="grid h-5 w-5 place-items-center rounded-full ring-2 ring-white" style={{ background: n.color }}><n.icon className="h-2.5 w-2.5 text-white" /></span>)}</span>
            </div>
          </>
        ) : (
          <Textarea value={post.text} onChange={(e) => upsertPost({ ...post, text: e.target.value })} className="min-h-[104px] text-[13px]" aria-label="Texte de la publication" />
        )}
        {!done && (
          <div className="flex flex-wrap gap-1.5">
            {linked.map((n) => {
              const on = post.networks.includes(n.key);
              return (
                <button
                  key={n.key}
                  onClick={() => upsertPost({ ...post, networks: on ? post.networks.filter((x) => x !== n.key) : [...post.networks, n.key] })}
                  aria-pressed={on}
                  className={cn('press flex h-9 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium transition-[background,color,box-shadow] duration-300 ease-spring', on ? '' : 'bg-white text-ink-3 shadow-[0_0_0_1px_#ece8f6] hover:text-ink')}
                  style={on ? { background: `${n.color}1a`, color: n.color, boxShadow: `0 0 0 1px ${n.color}33` } : undefined}
                >
                  <n.icon className="h-3.5 w-3.5" strokeWidth={1.75} />{n.label}
                </button>
              );
            })}
          </div>
        )}
        {!done &&
          (planning ? (
            <div className="animate-[fade-up_.3s_var(--ease)_both] space-y-2.5 rounded-card-sm bg-halo-track p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[12.5px] font-medium text-ink-2">Quand publier ?</span>
                <button onClick={() => setPlanning(false)} className="grid h-7 w-7 place-items-center rounded-full text-ink-3 hover:bg-white hover:text-ink" aria-label="Fermer"><X className="h-3.5 w-3.5" /></button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Button size="xs" onClick={() => schedule(dayOffset(1))}>Demain</Button>
                <Button size="xs" onClick={() => schedule(nextSaturday())}>Samedi matin</Button>
                <Button size="xs" onClick={() => schedule(dayOffset(7))}>Dans une semaine</Button>
              </div>
              <div className="flex gap-2">
                <Input type="date" value={date} min={dayOffset(0)} onChange={(e) => setDate(e.target.value)} className="min-w-0 flex-1" aria-label="Date de publication" />
                <Button className="h-11" variant="primary" onClick={() => schedule()}>Programmer</Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button variant="primary" className="flex-1 justify-center" icon={<Send />} loading={busy} disabled={!post.networks.length} onClick={publish}>Publier</Button>
              <Button icon={<CalendarClock />} onClick={() => setPlanning(true)}>{post.status === 'programme' ? 'Changer' : 'Plus tard'}</Button>
            </div>
          ))}
      </div>
    </Card>
  );
}
