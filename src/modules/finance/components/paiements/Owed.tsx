// « Qui vous doit » : chaque facture ouverte, le montant, depuis quand, et l'action en un appui.
import { Link } from 'react-router-dom';
import { Check, Copy, Link2, Nfc } from 'lucide-react';
import { Avatar, Button, Card, cn, EmptyState, toast } from '@/components/ui';
import { SuccessDot } from '@/components/motion';
import { daysBetween, initials, money, todayISO } from '@/lib/format';
import { useBrix } from '@/lib/store';
import type { Facture } from '@/lib/types';
import { recordPayment } from '@/modules/factures/lib/actions';
import { amounts, liveStatus } from '@/modules/factures/lib/model';
import { useFactures } from '@/modules/factures/store';
import { leaveCls, SectionHead, useLeaving } from '../kit';

const AV = ['#ebe2fe', '#fde7d6', '#dff3ec', '#e3eefc', '#fbe1f4', '#f1efe2'];
const avColor = (s: string) => AV[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % AV.length];

/** Âge d'une créance, en mots simples. */
function age(f: Facture, today: string) {
  const late = daysBetween(f.dueDate, today);
  if (late > 0) return { text: `en retard de ${late} j`, tone: late >= 15 ? 'bad' : 'warn', late } as const;
  const left = -late;
  return { text: left === 0 ? "échéance aujourd'hui" : `échéance dans ${left} j`, tone: 'muted', late } as const;
}

export function OwedCard({ unpaid, onLink, onTap }: { unpaid: Facture[]; onLink: (id: string) => void; onTap: (id: string) => void }) {
  const s = useBrix();
  const extras = useFactures((x) => x.extras);
  const today = todayISO();
  const { leaving, leave } = useLeaving();
  const total = unpaid.reduce((t, f) => t + amounts(f).remaining, 0);
  const sorted = [...unpaid].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const maxAmount = Math.max(1, ...sorted.map((f) => amounts(f).remaining));

  const received = (f: Facture) => {
    const rest = amounts(f).remaining;
    leave(f.id, () => recordPayment(f.id, rest, 'virement'));
    toast(`${money(rest)} reçus, ${f.number} est soldée`);
  };
  const copy = (url: string) => {
    navigator.clipboard?.writeText(url).catch(() => undefined);
    toast('Lien copié, collez-le dans un SMS');
  };

  return (
    <section className="space-y-3">
      <SectionHead title="Qui vous doit" meta={unpaid.length ? `${unpaid.length} facture${unpaid.length > 1 ? 's' : ''} · ${money(total, true)}` : undefined} />
      {sorted.length === 0 ? (
        <EmptyState icon={<Check />} title="Personne ne vous doit rien" text="Toutes vos factures envoyées sont payées." />
      ) : (
        <Card className="overflow-hidden">
          <ul className="stagger-fast">
            {sorted.map((f) => {
              const a = amounts(f);
              const client = s.clients.find((c) => c.id === f.clientId);
              const ag = age(f, today);
              const link = extras[f.id]?.paymentLink;
              const late = liveStatus(f) === 'en_retard';
              return (
                <li key={f.id} className={cn('relative border-b border-line last:border-b-0', leaveCls(leaving[f.id]))}>
                  {late && <span aria-hidden className={cn('absolute inset-y-3 left-0 w-[3px] rounded-r-full', ag.tone === 'bad' ? 'bg-bad' : 'bg-[#f59e0b]')} />}
                  <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center md:px-5">
                    <Link to={`/app/factures/${f.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                      <Avatar initials={initials(client?.name ?? '?')} color={avColor(client?.name ?? '')} size={38} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="truncate text-[14px] font-medium">{client?.name}</span>
                          <span className="num shrink-0 text-[16px] font-semibold tracking-[-0.02em] sm:hidden">{money(a.remaining)}</span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5 truncate text-[12.5px]">
                          <span className="font-mono text-[11.5px] text-ink-3">{f.number}</span>
                          <span className="text-ink-3">·</span>
                          <span className={cn(ag.tone === 'bad' ? 'font-medium text-bad' : ag.tone === 'warn' ? 'font-medium text-warn' : 'text-ink-2')}>{ag.text}</span>
                          {link && <span className="hidden text-ink-3 md:inline">· lien ouvert {link.opened ?? 0} fois</span>}
                        </div>
                        <div className="mt-2 h-1 overflow-hidden rounded-full bg-sub max-sm:hidden">
                          <div className={cn('h-full origin-left animate-grow rounded-full', late ? (ag.tone === 'bad' ? 'bg-bad/70' : 'bg-[#f59e0b]/70') : 'bg-vi-300')} style={{ width: `${(a.remaining / maxAmount) * 100}%` }} />
                        </div>
                      </div>
                    </Link>
                    <span className="num hidden w-28 shrink-0 text-right text-[16px] font-semibold tracking-[-0.02em] sm:block">{money(a.remaining)}</span>
                    <div className="flex shrink-0 items-center justify-end gap-2 sm:w-[268px]">
                      {leaving[f.id] ? (
                        <span className="flex h-10 items-center gap-2 px-2 text-[13px] font-medium text-ok"><SuccessDot size={20} />Soldée</span>
                      ) : (
                        <>
                          {link ? (
                            <Button size="sm" variant="secondary" icon={<Copy />} onClick={() => copy(link.url)} className="flex-1 sm:flex-none">Copier le lien</Button>
                          ) : (
                            <Button size="sm" variant="soft" icon={<Link2 />} onClick={() => onLink(f.id)} className="flex-1 sm:flex-none">Envoyer un lien</Button>
                          )}
                          <Button size="icon-sm" variant="ghost" aria-label="Encaisser par carte" title="Encaisser par carte" onClick={() => onTap(f.id)}><Nfc /></Button>
                          <Button size="sm" variant="primary" icon={<Check />} onClick={() => received(f)} title="Le virement est arrivé">Reçu</Button>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </section>
  );
}
