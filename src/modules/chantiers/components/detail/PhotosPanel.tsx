import { useMemo, useState } from 'react';
import { AlertTriangle, Camera, CheckCircle2, ImageOff, Trash2 } from 'lucide-react';
import { Avatar, Badge, Button, Card, EmptyState, Segmented, Sheet, cn, toast } from '@/components/ui';
import { useBrix } from '@/lib/store';
import { dateShort } from '@/lib/format';
import type { Chantier } from '@/lib/types';
import { useChantiersLocal, type ChantierPhoto, type Phase } from '../../store';
import { PHASE_LABEL, qualityChecks } from '../../lib/quality';
import { PhotoArt } from '../common/PhotoArt';

const timeOf = (iso: string) => (iso.length > 10 ? iso.slice(11, 16).replace(':', ' h ') : '');

export function PhotoTile({ p, onClick, showChantier }: { p: ChantierPhoto; onClick: () => void; showChantier?: string }) {
  return (
    <button onClick={onClick} className="group relative block aspect-[4/3] w-full overflow-hidden rounded-xl bg-sub text-left">
      <PhotoArt art={p.art} phase={p.phase} seed={p.id} src={p.src} alt={p.caption} className="transition duration-300 group-hover:scale-[1.03]" />
      <span className="absolute left-2 top-2 rounded-md bg-white/90 px-1.5 py-0.5 text-[10.5px] font-medium text-ink-2 backdrop-blur">{showChantier ?? p.room}</span>
      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent px-2.5 pb-2 pt-6">
        <span className="line-clamp-2 text-[12px] font-medium leading-snug text-white">{p.caption}</span>
      </span>
    </button>
  );
}

/** Grille de photos d'un ou plusieurs chantiers, rangée par étape puis par pièce. */
export function PhotosPanel({ chantiers, onTake, compact }: { chantiers: Chantier[]; onTake?: (tag?: string) => void; compact?: boolean }) {
  const ids = useMemo(() => new Set(chantiers.map((c) => c.id)), [chantiers]);
  const all = useChantiersLocal((s) => s.photos);
  const removePhoto = useChantiersLocal((s) => s.removePhoto);
  const employees = useBrix((s) => s.employees);
  const trade = useBrix((s) => s.company.trade);
  const photos = useMemo(() => all.filter((p) => ids.has(p.chantierId)).sort((a, b) => a.at.localeCompare(b.at)), [all, ids]);
  const [phase, setPhase] = useState<Phase | 'tous'>('tous');
  const [room, setRoom] = useState<string>('toutes');
  const [open, setOpen] = useState<ChantierPhoto | null>(null);
  const single = chantiers.length === 1 ? chantiers[0] : null;
  const rooms = [...new Set(photos.map((p) => p.room))];
  const checks = single ? qualityChecks(single, trade, photos) : [];
  const missing = checks.filter((c) => !c.ok);
  const nameOf = (id: string) => chantiers.find((c) => c.id === id)?.name.split(' · ')[0];

  const filtered = photos.filter((p) => (phase === 'tous' || p.phase === phase) && (room === 'toutes' || p.room === room));
  const phases: Phase[] = phase === 'tous' ? ['avant', 'pendant', 'apres'] : [phase];

  return (
    <div className="space-y-4">
      {single && checks.length > 0 && (
        <Card className={cn('p-4', missing.length && 'border-[#fde3b5] bg-[#fffdf7]')}>
          <div className="flex items-center gap-2 text-[13.5px] font-semibold">
            {missing.length ? <AlertTriangle className="h-4 w-4 text-warn" /> : <CheckCircle2 className="h-4 w-4 text-ok" />}
            {missing.length ? `Contrôle qualité : ${missing.length} photo${missing.length > 1 ? 's' : ''} à prendre` : 'Contrôle qualité : toutes les photos utiles sont là'}
          </div>
          <ul className="mt-2.5 space-y-1.5">
            {checks.map((c) => (
              <li key={c.tag} className="flex min-h-[40px] items-center gap-2.5 text-[13px]">
                {c.ok ? <CheckCircle2 className="h-4 w-4 shrink-0 text-ok" /> : <span className="h-4 w-4 shrink-0 rounded-full border-2 border-warn" />}
                <span className={cn('flex-1', c.ok ? 'text-ink-3 line-through decoration-line2' : 'text-ink')}>{c.ok ? c.message.replace('Il manque la photo', 'Photo').replace('Il manque une photo', 'Photo') : c.message}</span>
                {!c.ok && onTake && (
                  <Button size="sm" variant="secondary" icon={<Camera className="h-3.5 w-3.5" />} onClick={() => onTake(c.tag)}>
                    Prendre
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Segmented
          value={phase}
          onChange={setPhase}
          options={[
            { value: 'tous', label: 'Toutes', count: photos.length },
            ...(['avant', 'pendant', 'apres'] as Phase[]).map((p) => ({ value: p, label: PHASE_LABEL[p], count: photos.filter((x) => x.phase === p).length })),
          ]}
        />
        {rooms.length > 1 && (
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 scrollbar-none sm:ml-2">
            {['toutes', ...rooms].map((r) => (
              <button key={r} onClick={() => setRoom(r)} className={cn('h-8 shrink-0 rounded-full border px-3 text-[12.5px] transition', room === r ? 'border-ink bg-ink text-white' : 'border-line2 bg-white text-ink-2 hover:text-ink')}>
                {r === 'toutes' ? 'Toutes les pièces' : r}
              </button>
            ))}
          </div>
        )}
        <div className="flex-1" />
        {onTake && (
          <Button variant="primary" icon={<Camera className="h-4 w-4" />} onClick={() => onTake()} className="hidden sm:inline-flex">
            Ajouter une photo
          </Button>
        )}
      </div>

      {photos.length === 0 ? (
        <EmptyState icon={<ImageOff />} title="Pas encore de photo" text="Prenez une photo avant de commencer : elle protège en cas de litige et nourrit le rapport client." action={onTake && <Button variant="primary" icon={<Camera className="h-4 w-4" />} onClick={() => onTake()}>Prendre la première photo</Button>} />
      ) : (
        phases.map((ph) => {
          const list = filtered.filter((p) => p.phase === ph);
          if (!list.length) return null;
          return (
            <section key={ph}>
              <div className="mb-2 flex items-center gap-2">
                <h3 className="text-[13.5px] font-semibold">{PHASE_LABEL[ph]}</h3>
                <span className="text-xs text-ink-3">{list.length}</span>
              </div>
              <div className={cn('grid grid-cols-2 gap-2.5 sm:grid-cols-3', compact ? 'lg:grid-cols-4' : 'lg:grid-cols-4 xl:grid-cols-5')}>
                {list.map((p) => (
                  <PhotoTile key={p.id} p={p} onClick={() => setOpen(p)} showChantier={single ? undefined : `${nameOf(p.chantierId)} · ${p.room}`} />
                ))}
              </div>
            </section>
          );
        })
      )}

      <Sheet open={!!open} onClose={() => setOpen(null)} width={640} title={open?.caption} subtitle={open ? `${open.room} · ${PHASE_LABEL[open.phase]} · ${dateShort(open.at.slice(0, 10))} à ${timeOf(open.at)}` : undefined}>
        {open && (
          <div className="space-y-4">
            <div className="aspect-[4/3] overflow-hidden rounded-xl bg-sub">
              <PhotoArt art={open.art} phase={open.phase} seed={open.id} src={open.src} alt={open.caption} />
            </div>
            <div className="flex items-center justify-between gap-3">
              {(() => {
                const e = employees.find((x) => x.id === open.by);
                return e ? (
                  <span className="flex items-center gap-2 text-[13px] text-ink-2">
                    <Avatar initials={e.initials} color={e.color} size={26} /> Prise par {e.firstName}
                  </span>
                ) : <span />;
              })()}
              <div className="flex items-center gap-2">
                {open.tag && <Badge tone="ok">Contrôle qualité</Badge>}
                <Button
                  size="sm"
                  variant="danger"
                  icon={<Trash2 className="h-3.5 w-3.5" />}
                  onClick={() => {
                    removePhoto(open.id);
                    setOpen(null);
                    toast('Photo supprimée');
                  }}
                >
                  Supprimer
                </Button>
              </div>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}
