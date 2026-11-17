import { cn } from '@/components/ui';
import { dateShort } from '@/lib/format';
import type { Client, Devis } from '@/lib/types';
import { ago } from '../logic';
import type { DevisMeta, JournalEvent } from '../store';

/** Journal des événements du devis : dates du devis + événements enregistrés localement. */
export function buildHistory(d: Devis, client: Client | undefined, meta: DevisMeta): JournalEvent[] {
  const who = client?.name ?? 'Le client';
  const logged = (re: RegExp) => meta.journal.some((e) => re.test(e.text));
  const base: JournalEvent[] = logged(/^Devis créé/) ? [] : [{ id: 'h-c', at: d.createdAt, text: 'Devis créé', tone: 'me' }];
  if (d.sentAt && !logged(/^Envoyé/)) base.push({ id: 'h-s', at: d.sentAt, text: `Envoyé à ${who}`, tone: 'me' });
  if (d.viewedAt && !logged(/^Ouvert/)) base.push({ id: 'h-v', at: d.viewedAt, text: `Ouvert par ${who}${d.views ? ` · ${d.views} fois` : ''}`, tone: 'client' });
  if (d.signedAt && !logged(/^Signé/)) base.push({ id: 'h-g', at: d.signedAt, text: `Signé électroniquement par ${who}`, tone: 'client' });
  if (d.status === 'refuse' && !logged(/^Refusé/)) base.push({ id: 'h-r', at: d.sentAt ?? d.createdAt, text: `Refusé par ${who}`, tone: 'client' });
  return [...base, ...meta.journal].sort((a, b) => a.at.localeCompare(b.at));
}

export function HistoryList({ d, client, meta, limit = 8 }: { d: Devis; client?: Client; meta: DevisMeta; limit?: number }) {
  const ev = buildHistory(d, client, meta).slice(-limit);
  return (
    <ol className="relative space-y-3 pl-4">
      <span className="absolute bottom-1.5 left-[3.5px] top-1.5 w-px bg-line" aria-hidden />
      {ev.map((e, i) => (
        <li key={e.id} className="relative">
          <span className={cn('absolute -left-4 top-[5px] h-2 w-2 rounded-full border-[1.5px] bg-white', i === ev.length - 1 ? 'border-vi-700 bg-vi-700' : e.tone === 'client' ? 'border-ok' : e.tone === 'bob' ? 'border-vi-500' : 'border-ink-3')} />
          <div className="text-[12.5px] leading-snug text-ink">
            {e.tone === 'bob' && <b className="font-semibold">Bob · </b>}
            {e.text}
          </div>
          <div className="text-[11.5px] text-ink-3">{e.at.length > 10 ? ago(e.at) : dateShort(e.at)}</div>
        </li>
      ))}
    </ol>
  );
}
