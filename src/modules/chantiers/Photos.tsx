import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Camera } from 'lucide-react';
import { Button, Card, CardHeader, PageHeader, Select } from '@/components/ui';
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
  const missing = active.flatMap((c) => qualityChecks(c, trade, photos.filter((p) => p.chantierId === c.id)).filter((q) => !q.ok).map((q) => ({ c, q })));

  return (
    <div className="space-y-5">
      <PageHeader
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
        <Card className="border-[#fde3b5] bg-[#fffdf7]">
          <CardHeader icon={<AlertTriangle className="h-4 w-4 text-warn" />} title="Contrôle qualité" meta={`${missing.length} photo${missing.length > 1 ? 's' : ''} manquante${missing.length > 1 ? 's' : ''}`} className="border-[#fde3b5]" />
          {missing.map(({ c, q }) => (
            <button key={c.id + q.tag} onClick={() => navigate(`/app/chantiers/${c.id}?onglet=photos`)} className="flex min-h-[52px] w-full items-center gap-3 border-b border-[#fde3b5] px-4 py-2 text-left text-[13px] last:border-b-0 hover:bg-white/60">
              <span className="min-w-0 flex-1">
                <span className="font-medium">{c.name}</span>
                <span className="block text-ink-2">{q.message}</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-ink-3" />
            </button>
          ))}
        </Card>
      )}

      <PhotosPanel chantiers={shown} onTake={sel === 'tous' ? undefined : capture.open} />
      {capture.element}
    </div>
  );
}
