import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Eye, FileSignature, FileText, Mail, MapPin, MessageCircle, MessageSquare, MessagesSquare, PenLine, Phone, Receipt, Send } from 'lucide-react';
import { Button, Card, CardHeader, cn, IconTile, Input } from '@/components/ui';
import { dateShort, money, totals } from '@/lib/format';
import type { Devis, Facture } from '@/lib/types';
import { useVendre, type Exchange } from '../store';

const KIND: Record<Exchange['kind'], { icon: LucideIcon; label: string }> = {
  appel: { icon: Phone, label: 'Appel' },
  mail: { icon: Mail, label: 'E-mail' },
  sms: { icon: MessageSquare, label: 'SMS' },
  whatsapp: { icon: MessageCircle, label: 'WhatsApp' },
  note: { icon: PenLine, label: 'Note' },
  visite: { icon: MapPin, label: 'Visite' },
};

interface Item { at: string; icon: LucideIcon; text: string; sub?: string; tone?: 'ok' | 'violet' }

/** Fil des échanges : notes, appels, et événements des devis et factures. */
export function ClientTimeline({ clientId, devis, factures }: { clientId: string; devis: Devis[]; factures: Facture[] }) {
  const all = useVendre((v) => v.exchanges);
  const addExchange = useVendre((v) => v.addExchange);
  const [text, setText] = useState('');
  const [kind, setKind] = useState<Exchange['kind']>('note');
  const [more, setMore] = useState(false);

  const items: Item[] = [
    ...all.filter((e) => e.clientId === clientId).map((e) => ({ at: e.at, icon: KIND[e.kind].icon, text: e.text, sub: KIND[e.kind].label })),
    ...devis.flatMap((d) => {
      const out: Item[] = [{ at: d.createdAt, icon: FileText, text: `Devis ${d.number} créé`, sub: `${d.title} · ${money(totals(d.lines).ht, true)} HT` }];
      if (d.sentAt) out.push({ at: d.sentAt, icon: Send, text: `Devis ${d.number} envoyé` });
      if (d.viewedAt) out.push({ at: d.viewedAt, icon: Eye, text: `Devis ouvert ${d.views ?? 1} fois`, tone: 'violet' });
      if (d.signedAt) out.push({ at: d.signedAt, icon: FileSignature, text: `Devis ${d.number} signé en ligne`, tone: 'ok' });
      return out;
    }),
    ...factures.map((f) => ({ at: f.issueDate, icon: Receipt, text: `Facture ${f.number} ${f.status === 'payee' ? 'payée' : 'envoyée'}`, sub: money(totals(f.lines).ttc), tone: f.status === 'payee' ? ('ok' as const) : undefined })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  const shown = more ? items : items.slice(0, 7);
  const add = () => {
    if (!text.trim()) return;
    addExchange({ clientId, at: new Date().toISOString().slice(0, 16), kind, text: text.trim() });
    setText('');
  };

  return (
    <Card>
      <CardHeader icon={<IconTile icon={<MessagesSquare />} tone="blue" size="sm" />} title="Échanges" meta={`${items.length}`} />
      <div className="border-b border-halo-line p-3 md:p-4">
        <div className="mb-2 flex gap-1 overflow-x-auto scrollbar-none">
          {(['note', 'appel', 'visite', 'mail'] as Exchange['kind'][]).map((k) => {
            const I = KIND[k].icon;
            return (
              <button key={k} onClick={() => setKind(k)} aria-pressed={kind === k} className={cn('flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium transition-[background,color,box-shadow] duration-300 ease-spring', kind === k ? 'bg-white text-ink shadow-pill' : 'text-ink-2 hover:bg-halo-hover hover:text-ink')}>
                <I className="h-3.5 w-3.5" strokeWidth={1.75} /> {KIND[k].label}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <Input className="flex-1" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="Ce qui s'est dit…" />
          <Button variant="primary" className="h-11" onClick={add} disabled={!text.trim()}>Ajouter</Button>
        </div>
      </div>
      <ol className="px-4 py-2">
        {shown.map((it, i) => (
          <li key={i} className="relative flex gap-3 py-2.5">
            {i < shown.length - 1 && <span className="absolute bottom-0 left-[15px] top-10 w-px bg-halo-line" />}
            <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-full', it.tone === 'ok' ? 'bg-pale-g text-deep-g' : it.tone === 'violet' ? 'bg-pale-v text-deep-v' : 'bg-pale-n text-ink-2')}>
              <it.icon className="h-3.5 w-3.5" strokeWidth={1.9} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] leading-snug">{it.text}</div>
              <div className="mt-0.5 text-[11.5px] text-ink-3">{[it.sub, dateShort(it.at.slice(0, 10)) + (it.at.length > 10 ? ` · ${it.at.slice(11, 16).replace(':', ' h ')}` : '')].filter(Boolean).join(' · ')}</div>
            </div>
          </li>
        ))}
        {!items.length && <li className="py-6 text-center text-[13px] text-ink-3">Aucun échange pour l'instant.</li>}
      </ol>
      {items.length > 7 && (
        <button onClick={() => setMore((v) => !v)} className="h-11 w-full border-t border-halo-line text-[12.5px] transition-colors hover:bg-halo-hover font-medium text-ink-2 hover:text-ink">
          {more ? 'Voir moins' : items.length - 7 === 1 ? 'Voir le plus ancien' : `Voir les ${items.length - 7} plus anciens`}
        </button>
      )}
    </Card>
  );
}
