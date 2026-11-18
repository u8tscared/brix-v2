// Assistants reliés (autorisations OAuth et jetons personnels) avec « Couper », et journal des actions.
import { useState } from 'react';
import { Check, History, KeyRound, Link2, Power } from 'lucide-react';
import { Badge, Button, Card, CardHeader, IconTile, Skeleton, cn } from '@/components/ui';
import { relative } from '@/lib/format';
import type { Acces, LigneJournal } from './api';
import { NOM_OUTIL } from './contenu';

const quand = (ms: number | null) => (ms ? relative(new Date(ms).toISOString()) : 'jamais utilisé');
const heure = (ms: number) => {
  const d = new Date(ms);
  return `${relative(d.toISOString())} · ${String(d.getHours()).padStart(2, '0')} h ${String(d.getMinutes()).padStart(2, '0')}`;
};

export function AccesListe({ acces, chargement, onCouper, demo }: { acces: Acces[]; chargement: boolean; onCouper: (id: string) => void; demo: boolean }) {
  const [confirmer, setConfirmer] = useState<string | null>(null);
  return (
    <Card>
      <CardHeader
        title="Assistants reliés"
        meta={demo ? <Badge tone="neutral">Démo</Badge> : acces.length ? String(acces.length) : undefined}
        icon={<IconTile icon={<Link2 />} tone="violet" size="sm" />}
      />
      {chargement ? (
        <div className="space-y-2 p-4"><Skeleton className="h-12" /><Skeleton className="h-12" /></div>
      ) : acces.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <div className="text-[14.5px] font-semibold tracking-[-0.02em]">Aucun assistant relié</div>
          <p className="mx-auto mt-1 max-w-xs text-[12.5px] text-ink-2">Collez l’adresse dans votre assistant : il apparaîtra ici dès que vous l’aurez autorisé.</p>
        </div>
      ) : (
        <ul>
          {acces.map((a) => (
            <li key={a.id} className="flex flex-col gap-2 border-b border-halo-line px-4 py-3 last:border-b-0 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <IconTile icon={a.type === 'oauth' ? <Link2 /> : <KeyRound />} tone={a.type === 'oauth' ? 'blue' : 'neutral'} size="row" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 text-[13.5px] font-medium">
                    <span className="truncate">{a.nom}</span>
                    <Badge tone={a.ecriture ? 'violet' : 'neutral'}>{a.ecriture ? 'Lecture et actions' : 'Lecture seule'}</Badge>
                  </div>
                  <div className="truncate text-[12px] text-ink-3">
                    {a.type === 'oauth' ? a.hote ?? 'Assistant' : `Jeton personnel ${a.prefixe ?? ''}…`} · {quand(a.derniere_utilisation)}
                  </div>
                </div>
              </div>
              {confirmer === a.id ? (
                <div className="flex gap-1.5 sm:justify-end">
                  <Button size="sm" variant="ghost" onClick={() => setConfirmer(null)}>Garder</Button>
                  <Button size="sm" variant="danger" icon={<Power className="h-3.5 w-3.5" />} onClick={() => (setConfirmer(null), onCouper(a.id))}>Couper</Button>
                </div>
              ) : (
                <Button size="sm" variant="secondary" className="self-start sm:self-auto" onClick={() => setConfirmer(a.id)}>Couper</Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function Journal({ lignes, demo }: { lignes: LigneJournal[]; demo: boolean }) {
  return (
    <Card className="self-start">
      <CardHeader title="Dernières actions" meta="faites par vos assistants" icon={<IconTile icon={<History />} tone="peach" size="sm" />} />
      {lignes.length === 0 ? (
        <p className="px-5 py-8 text-center text-[12.5px] text-ink-2">
          {demo ? 'En démo, aucune action n’est enregistrée.' : 'Rien pour l’instant. Chaque brouillon ou rendez-vous créé par un assistant s’affichera ici.'}
        </p>
      ) : (
        <ul>
          {lignes.map((l) => (
            <li key={l.id} className="flex items-start gap-3 border-b border-halo-line px-4 py-2.5 last:border-b-0">
              <span className={cn('mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full', l.ok ? 'bg-ok-bg text-ok' : 'bg-bad-bg text-bad')}>
                {l.ok ? <Check className="h-3.5 w-3.5" /> : <span className="text-[13px] font-bold leading-none">!</span>}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[13px]"><span className="font-medium">{l.client_label}</span> · {NOM_OUTIL[l.outil] ?? l.outil}</div>
                <div className="text-[12px] text-ink-3 [overflow-wrap:anywhere]">{l.resume}</div>
              </div>
              <span className="num shrink-0 text-[11.5px] text-ink-3">{heure(l.at)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
