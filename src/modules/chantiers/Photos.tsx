import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Camera } from 'lucide-react';
import { Button, IconTile, PageHeader, Select } from '@/components/ui';
import { capitalize } from '@/lib/format';
import { useBrix } from '@/lib/store';
import { useChantiersLocal, useChantiersSeed } from './store';
import { qualityChecks } from './lib/quality';
import { PhotosPanel } from './components/detail/PhotosPanel';
import { usePhotoCapture } from './components/detail/PhotoCapture';

/** Photos de tous les chantiers, avec le contrôle qualité global. */
export default function Photos() {
  useChantiersSeed();
  const navigate = useNavigate();
  const chantiers = useBrix((s) => s.chantiers);
  const trade = useBrix((s) => s.company.trade);
  const photos = useChantiersLocal((s) => s.photos);
  const [sel, setSel] = useState<string>('tous');
  const active = useMemo(() => chantiers.filter((c) => c.status !== 'termine'), [chantiers]);
  const shown = useMemo(() => (sel === 'tous' ? chantiers : chantiers.filter((c) => c.id === sel)), [chantiers, sel]);
  const capture = usePhotoCapture(sel === 'tous' ? active[0]?.id : sel);
  const groups = active
    .map((c) => ({ c, list: qualityChecks(c, trade, photos.filter((p) => p.chantierId === c.id)).filter((q) => !q.ok) }))
    .filter((g) => g.list.length);
  const missing = active.flatMap((c) => qualityChecks(c, trade, photos.filter((p) => p.chantierId === c.id)).filter((q) => !q.ok).map((q) => ({ c, q })));

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<IconTile name="Camera" dept="chantiers" size="lg" />}
        title="Photos et rapports"
        subtitle={`${photos.length} photos rangées par chantier, pièce et étape`}
        actions={
          <>
            <Select value={sel} onChange={(e) => setSel(e.target.value)} className="h-10 w-full sm:w-64">
              <option value="tous">Tous les chantiers</option>
              {chantiers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Button variant="primary" icon={<Camera className="h-4 w-4" />} onClick={() => capture.open()} disabled={!active.length && sel === 'tous'}>
              Prendre une photo
            </Button>
          </>
        }
      />

      {sel === 'tous' && missing.length > 0 && (
        <section className="rounded-[18px] bg-[#fffaf0] p-4 shadow-[inset_0_0_0_1px_#fde3b0] md:p-5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-warn-bg text-warn shadow-[inset_0_0_0_1px_#fde3b0]">
              <AlertTriangle className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-semibold tracking-[-0.015em]">Contrôle qualité : {missing.length} photo{missing.length > 1 ? 's' : ''} à prendre</div>
              <div className="text-[12.5px] text-ink-2">Elles vous protègent en cas de litige et nourrissent le rapport client.</div>
            </div>
          </div>
          <div className="stagger-fast mt-4 grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
            {groups.map(({ c, list }) => (
              <button key={c.id} onClick={() => navigate(`/app/chantiers/${c.id}?onglet=photos`)} className="group lift press flex flex-col rounded-[14px] bg-white p-3.5 text-left shadow-card">
                <span className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold">{c.name}</span>
                  <span className="num grid h-5 min-w-5 place-items-center rounded-full bg-warn-bg px-1.5 text-[11px] font-semibold text-warn">{list.length}</span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-ink-3 transition group-hover:translate-x-0.5" />
                </span>
                <span className="mt-2 space-y-1">
                  {list.map((q) => (
                    <span key={q.tag} className="flex items-center gap-2 text-[12.5px] text-ink-2">
                      <Camera className="h-3.5 w-3.5 shrink-0 text-ink-3" />
                      <span className="truncate">{q.message.replace(/^Il manque (la|une) photo (du |des |de la |de l'|d')?/, (m) => capitalize(m.replace(/^Il manque (la|une) photo /, '')))}</span>
                    </span>
                  ))}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <PhotosPanel chantiers={shown} onTake={sel === 'tous' ? undefined : capture.open} />
      {capture.element}
    </div>
  );
}
