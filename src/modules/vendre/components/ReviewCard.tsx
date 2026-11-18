import { useState } from 'react';
import { Star } from 'lucide-react';
import { BrandTile } from '@/components/brand/Logo';
import { Avatar, Badge, Button, cn, Textarea, toast } from '@/components/ui';
import { clientColor, clientInk } from '../lib';
import { initials, relative } from '@/lib/format';
import { useBrix } from '@/lib/store';
import { draftReviewReply } from '../service';
import { useVendre, type Review } from '../store';

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${value} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} style={{ width: size, height: size }} strokeWidth={1.5} className={i <= Math.round(value) ? 'fill-[#f59e0b] text-[#f59e0b]' : 'fill-[#ece8f6] text-[#ddd6ee]'} />
      ))}
    </span>
  );
}

export function ReviewCard({ r }: { r: Review }) {
  const user = useBrix((s) => s.user);
  const company = useBrix((s) => s.company);
  const setReview = useVendre((v) => v.setReview);
  const [drafting, setDrafting] = useState(false);
  const [editing, setEditing] = useState(false);

  const draft = async () => {
    setDrafting(true);
    const txt = await draftReviewReply(r, `${user.firstName}, ${company.name}`);
    setReview(r.id, { replyDraft: txt });
    setDrafting(false);
    setEditing(true);
  };
  const publish = () => {
    setReview(r.id, { reply: r.replyDraft, replyDraft: undefined });
    setEditing(false);
    toast(`Réponse publiée sur ${r.source} (démo)`);
  };

  return (
    <div className="border-b border-halo-line p-4 transition-colors last:border-b-0 hover:bg-halo-hover/50 md:px-5">
      <div className="flex items-start gap-3">
        <Avatar initials={initials(r.author)} color={clientColor(r.id)} fg={clientInk(r.id)} size={38} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[13.5px] font-semibold">{r.author}</span>
            <Stars value={r.rating} size={13} />
            <span className="text-[12px] text-ink-3">{relative(r.date)} · {r.source}</span>
          </div>
          <p className="mt-1.5 text-[13.5px] leading-relaxed">{r.text}</p>
          {r.chantier && <div className="mt-1.5 text-[12px] text-ink-3">Chantier : {r.chantier}</div>}

          {r.reply ? (
            <div className="mt-3 rounded-card-sm bg-dawn-pale px-3.5 py-3">
              <div className="text-[11.5px] font-medium text-ink-3">Votre réponse</div>
              <p className="mt-0.5 text-[13px] leading-relaxed text-ink-2">{r.reply}</p>
            </div>
          ) : editing && r.replyDraft !== undefined ? (
            <div className="mt-3 animate-fade-up space-y-2">
              <div className="flex items-center gap-2 text-[12px] text-ink-3"><BrandTile size={20} className="rounded-[6px]" />Bob a rédigé, relisez et publiez</div>
              <Textarea value={r.replyDraft} onChange={(e) => setReview(r.id, { replyDraft: e.target.value })} className="text-[13px]" />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Plus tard</Button>
                <Button size="sm" variant="primary" onClick={publish}>Publier la réponse</Button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-2">
              <Badge tone="warn" dot>Sans réponse</Badge>
              <Button size="sm" variant="soft" loading={drafting} onClick={r.replyDraft ? () => setEditing(true) : draft} className={cn(drafting && 'opacity-80')}>
                {drafting ? 'Bob écrit…' : 'Faire répondre par Bob'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
