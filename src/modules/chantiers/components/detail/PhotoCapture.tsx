import { useRef, useState, type ReactNode } from 'react';
import { Button, Field, Input, Segmented, Select, Sheet, cn, toast } from '@/components/ui';
import { useBrix } from '@/lib/store';
import { uid } from '@/lib/format';
import { useChantiersLocal, type Phase } from '../../store';
import { PHASE_LABEL, autoCaption, subjectsFor } from '../../lib/quality';
import { PhotoArt, compressImage } from '../common/PhotoArt';

const ROOMS = ['Entrée', 'Séjour', 'Cuisine', 'Chambre', 'Salle de bain', 'WC', 'Couloir', 'Garage', 'Extérieur', 'Local technique'];

/**
 * Prise de photo : ouvre l'appareil photo (input file + capture), puis une fiche courte
 * pour ranger la photo (pièce, étape, sujet) avec une légende proposée automatiquement.
 */
export function usePhotoCapture(chantierId: string | undefined) {
  const input = useRef<HTMLInputElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [presetTag, setPresetTag] = useState<string | undefined>();

  const open = (tag?: string) => {
    setPresetTag(tag);
    input.current?.click();
  };

  const element: ReactNode = (
    <>
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (!f) return;
          try {
            setSrc(await compressImage(f));
          } catch {
            toast("Cette image n'a pas pu être lue", 'warn');
          }
        }}
      />
      {chantierId && <PhotoAddSheet chantierId={chantierId} src={src} presetTag={presetTag} onClose={() => setSrc(null)} />}
    </>
  );
  return { open, element };
}

function PhotoAddSheet({ chantierId, src, presetTag, onClose }: { chantierId: string; src: string | null; presetTag?: string; onClose: () => void }) {
  const trade = useBrix((s) => s.company.trade);
  const ch = useBrix((s) => s.chantiers.find((c) => c.id === chantierId));
  const me = useBrix((s) => s.employees[0]?.id ?? 'moi');
  const photos = useChantiersLocal((s) => s.photos).filter((p) => p.chantierId === chantierId);
  const { addPhoto, addJournal } = useChantiersLocal();
  const subjects = subjectsFor(trade);
  const knownRooms = [...new Set([...photos.map((p) => p.room), ...ROOMS])];
  const defaultPhase: Phase = !ch || ch.progress < 5 ? 'avant' : ch.status === 'termine' || ch.status === 'reception' ? 'apres' : 'pendant';
  const [room, setRoom] = useState(photos[0]?.room ?? 'Entrée');
  const [phase, setPhase] = useState<Phase>(defaultPhase);
  const [tag, setTag] = useState<string>(presetTag ?? 'vue');
  const [caption, setCaption] = useState('');
  const [touched, setTouched] = useState(false);
  const subject = subjects.find((s) => s.tag === tag);
  const shown = touched ? caption : autoCaption(subject, room, phase);

  // Remet à zéro quand une nouvelle photo arrive
  const [lastSrc, setLastSrc] = useState<string | null>(null);
  if (src !== lastSrc) {
    setLastSrc(src);
    if (src) {
      setTag(presetTag ?? 'vue');
      setPhase(presetTag === 'tableau-avant' ? 'avant' : presetTag === 'tableau-fini' ? 'apres' : defaultPhase);
      setTouched(false);
    }
  }

  const save = () => {
    if (!src) return;
    addPhoto({ id: uid('ph'), chantierId, room, phase, caption: shown, at: new Date().toISOString(), by: me, art: subject?.art ?? 'mur', tag: tag === 'vue' ? undefined : tag, src });
    addJournal({ id: uid('j'), chantierId, at: new Date().toISOString(), kind: 'photo', author: me, text: `Photo ajoutée : ${shown}.` });
    toast('Photo rangée dans le chantier');
    onClose();
  };

  return (
    <Sheet open={!!src} onClose={onClose} title="Ranger la photo" subtitle="Brix propose une légende, modifiez-la si besoin." width={520} footer={<><Button variant="ghost" onClick={onClose}>Annuler</Button><Button variant="primary" onClick={save}>Enregistrer</Button></>}>
      <div className="space-y-4">
        <div className="aspect-[4/3] overflow-hidden rounded-card-sm bg-halo-track">{src && <PhotoArt art="mur" phase={phase} seed="new" src={src} alt="Aperçu" />}</div>
        <Segmented value={phase} onChange={setPhase} options={(['avant', 'pendant', 'apres'] as Phase[]).map((p) => ({ value: p, label: PHASE_LABEL[p] }))} />
        <Field label="Pièce">
          <Select value={room} onChange={(e) => setRoom(e.target.value)}>
            {knownRooms.map((r) => <option key={r}>{r}</option>)}
          </Select>
        </Field>
        <div>
          <span className="mb-1.5 block text-[12.5px] font-medium text-ink-2">La photo montre</span>
          <div className="flex flex-wrap gap-2">
            {subjects.map((s) => (
              <button key={s.tag} type="button" onClick={() => setTag(s.tag)} className={cn('h-10 rounded-full border px-3.5 text-[13px] transition', tag === s.tag ? 'border-ink bg-ink text-white' : 'border-halo-line bg-white hover:bg-halo-track')}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <Field label="Légende">
          <Input value={shown} onChange={(e) => { setTouched(true); setCaption(e.target.value); }} />
        </Field>
      </div>
    </Sheet>
  );
}
