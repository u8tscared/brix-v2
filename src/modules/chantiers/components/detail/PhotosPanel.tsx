import { useMemo, useState } from 'react';
import { AlertTriangle, Camera, CheckCircle2, ImageOff } from 'lucide-react';
import { PhotoViewer } from '../common/PhotoViewer';
import { Button, Card, EmptyState, IconTile, Segmented, cn, toast } from '@/components/ui';
import { useBrix } from '@/lib/store';
import type { Chantier } from '@/lib/types';
import { useChantiersLocal, type ChantierPhoto, type Phase } from '../../store';
import { PHASE_LABEL, qualityChecks } from '../../lib/quality';
import { PhotoArt } from '../common/PhotoArt';

export function PhotoTile({ p, onClick, showChantier }: { p: ChantierPhoto; onClick: () => void; showChantier?: string }) {
  return (
    <button onClick={onClick} className="group press relative block aspect-[4/3] w-full overflow-hidden rounded-card-sm bg-halo-track text-left shadow-halo transition-[box-shadow,transform] duration-[450ms] ease-out-quint hover:-translate-y-[3px] hover:shadow-halo-lg">
      <PhotoArt art={p.art} phase={p.phase} seed={p.id} src={p.src} alt={p.caption} className="transition duration-500 ease-out-quint group-hover:scale-[1.05]" />
      <span className="absolute left-2 top-2 max-w-[calc(100%-16px)] truncate rounded-full bg-white/85 px-2 py-0.5 text-[10.5px] font-medium text-ink-2 shadow-pill backdrop-blur-md">{showChantier ?? p.room}</span>
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
  const addPhoto = useChantiersLocal((s) => s.addPhoto);
  const trade = useBrix((s) => s.company.trade);
  const photos = useMemo(() => all.filter((p) => ids.has(p.chantierId)).sort((a, b) => a.at.localeCompare(b.at)), [all, ids]);
  const [phase, setPhase] = useState<Phase | 'tous'>('tous');
  const [room, setRoom] = useState<string>('toutes');
  const [open, setOpen] = useState<number | null>(null);
  const single = chantiers.length === 1 ? chantiers[0] : null;
  const rooms = [...new Set(photos.map((p) => p.room))];
  const checks = single ? qualityChecks(single, trade, photos) : [];
  const missing = checks.filter((c) => !c.ok);
  const nameOf = (id: string) => chantiers.find((c) => c.id === id)?.name.split(' · ')[0];

  const filtered = photos.filter((p) => (phase === 'tous' || p.phase === phase) && (room === 'toutes' || p.room === room));
  const phases: Phase[] = phase === 'tous' ? ['avant', 'pendant', 'apres'] : [phase];
  const ordered = phases.flatMap((ph) => filtered.filter((p) => p.phase === ph));

  return (
    <div className="space-y-4">
      {single && checks.length > 0 && (
        <Card className="p-4 md:p-5">
          <div className="flex items-center gap-3 text-[14.5px] font-semibold tracking-[-0.015em]">
            {missing.length ? <IconTile size="sm" tone="amber" icon={<AlertTriangle />} /> : <IconTile size="sm" tone="green" icon={<CheckCircle2 />} />}
            {missing.length ? `Contrôle qualité : ${missing.length} photo${missing.length > 1 ? 's' : ''} à prendre` : 'Contrôle qualité : toutes les photos utiles sont là'}
          </div>
          <ul className="mt-2.5 space-y-1.5">
            {checks.map((c) => (
              <li key={c.tag} className={cn('flex min-h-[44px] items-center gap-2.5 rounded-[14px] px-3 text-[13px]', !c.ok && 'bg-pale-a/60')}>
                {c.ok ? <CheckCircle2 className="h-4 w-4 shrink-0 text-ok" /> : <span className="h-4 w-4 shrink-0 rounded-full border-2 border-[#f59e0b]" />}
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
          className="shrink-0 self-start"
          options={[
            { value: 'tous', label: 'Toutes', count: photos.length },
            ...(['avant', 'pendant', 'apres'] as Phase[]).map((p) => ({ value: p, label: PHASE_LABEL[p], count: photos.filter((x) => x.phase === p).length })),
          ]}
        />
        {rooms.length > 1 && (
          <div className="-mx-1 flex min-w-0 gap-1.5 overflow-x-auto px-1 scrollbar-none sm:ml-2">
            {['toutes', ...rooms].map((r) => (
              <button key={r} onClick={() => setRoom(r)} className={cn('h-8 shrink-0 rounded-full border px-3 text-[12.5px] transition', room === r ? 'border-transparent bg-ink text-white shadow-ink' : 'border-transparent bg-white text-ink-2 shadow-halo-sm hover:text-ink')}>
                {r === 'toutes' ? 'Toutes les pièces' : r}
              </button>
            ))}
          </div>
        )}
        <div className="flex-1" />
        {onTake && (
          <Button variant="soft" icon={<Camera className="h-4 w-4" />} onClick={() => onTake()} className="hidden sm:inline-flex">
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
                <h3 className="text-[15px] font-semibold tracking-[-0.02em]">{PHASE_LABEL[ph]}</h3>
                <span className="num tone-neutral rounded-full px-2 py-0.5 text-[11px] font-semibold">{list.length}</span>
              </div>
              <div className={cn('stagger-fast grid grid-cols-2 gap-2.5 sm:grid-cols-3', compact ? 'lg:grid-cols-4' : 'lg:grid-cols-4 xl:grid-cols-5')}>
                {list.map((p) => (
                  <PhotoTile key={p.id} p={p} onClick={() => setOpen(ordered.findIndex((x) => x.id === p.id))} showChantier={single ? undefined : `${nameOf(p.chantierId)} · ${p.room}`} />
                ))}
              </div>
            </section>
          );
        })
      )}

      <PhotoViewer
        photos={ordered}
        index={open}
        onIndex={setOpen}
        onClose={() => setOpen(null)}
        label={(p) => (single ? p.room : `${nameOf(p.chantierId)} · ${p.room}`)}
        onDelete={(p) => {
          const at = ordered.findIndex((x) => x.id === p.id);
          removePhoto(p.id);
          setOpen(ordered.length > 1 ? Math.min(at, ordered.length - 2) : null);
          toast('Photo supprimée', 'ok', { label: 'Annuler', run: () => addPhoto(p) });
        }}
      />
    </div>
  );
}
