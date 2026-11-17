import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Camera, ClipboardCheck, FileSignature, HardHat, Mic, Send, Timer } from 'lucide-react';
import { Button, EmptyState, UnderlineTabs, toast } from '@/components/ui';
import { SuccessDot } from '@/components/motion';
import { uid } from '@/lib/format';
import { useBrix } from '@/lib/store';
import { useUI } from '@/lib/ui';
import { useChantierView } from './lib/useChantier';
import { bobSummary } from './lib/metrics';
import { forecast, isOutdoor, isRainy } from './lib/weather';
import { qualityChecks } from './lib/quality';
import { useChantiersLocal, useChantiersSeed } from './store';
import { DetailHeader } from './components/detail/DetailHeader';
import { Overview } from './components/detail/Overview';
import { PlanningTab } from './components/detail/PlanningTab';
import { PhotosPanel } from './components/detail/PhotosPanel';
import { usePhotoCapture } from './components/detail/PhotoCapture';
import { AchatsTab, DocumentsTab, JournalTab } from './components/detail/OtherTabs';
import { AvenantSheet, ReportSheet, VoiceNoteSheet } from './components/detail/ActionSheets';

type Tab = 'apercu' | 'planning' | 'photos' | 'documents' | 'journal' | 'achats';

export default function ChantierDetail() {
  useChantiersSeed();
  const { id } = useParams();
  const navigate = useNavigate();
  const v = useChantierView(id);
  const trade = useBrix((s) => s.company.trade);
  const askBob = useUI((s) => s.askBob);
  const photos = useChantiersLocal((s) => s.photos);
  const journal = useChantiersLocal((s) => s.journal);
  const addJournal = useChantiersLocal((s) => s.addJournal);
  const user = useBrix((s) => s.user);
  const journalCount = journal.filter((j) => j.chantierId === id).length;
  const [params, setParams] = useSearchParams();
  const tab = (params.get('onglet') as Tab) || 'apercu';
  const setTab = (t: Tab) => setParams(t === 'apercu' ? {} : { onglet: t }, { replace: true });
  const [sheet, setSheet] = useState<'voice' | 'report' | 'avenant' | null>(null);
  const capture = usePhotoCapture(id);

  if (!v) {
    return <EmptyState icon={<HardHat />} title="Chantier introuvable" text="Il a peut-être été supprimé." action={<Button onClick={() => navigate('/app/chantiers')}>Retour aux chantiers</Button>} />;
  }

  const { ch, m, team } = v;
  const myPhotos = photos.filter((p) => p.chantierId === ch.id);
  const missing = qualityChecks(ch, trade, myPhotos).find((c) => !c.ok);
  const rain = isOutdoor(`${ch.name} ${v.devis?.title ?? ''}`) ? forecast(5, ch.city).find(isRainy) : undefined;
  const rainLabel = rain ? new Date(rain.date + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'long' }) : undefined;
  const [line1, line2] = bobSummary(ch, m, team, rainLabel);
  const done = ch.status === 'termine';


  const clockedToday = journal.find((j) => j.chantierId === ch.id && j.kind === 'evenement' && j.text.startsWith('Arrivée') && j.at.slice(0, 10) === new Date().toISOString().slice(0, 10));
  const clockIn = () => {
    if (clockedToday) return toast(`Déjà pointé : ${clockedToday.text.replace('Arrivée sur le chantier ', '')}`, 'info');
    const now = new Date();
    const at = `${String(now.getHours()).padStart(2, '0')} h ${String(now.getMinutes()).padStart(2, '0')}`;
    addJournal({ id: uid('j'), chantierId: ch.id, at: now.toISOString(), kind: 'evenement', author: 'bob', text: `Arrivée sur le chantier à ${at} (${user.firstName || 'vous'}).` });
    toast(`Arrivée pointée à ${at}`);
  };

  const actions = [
    { key: 'photo', label: 'Photo', icon: <Camera />, run: () => capture.open() },
    { key: 'clock', label: clockedToday ? 'Pointé' : 'Pointer', icon: clockedToday ? <SuccessDot size={20} /> : <Timer />, run: clockIn },
    { key: 'voice', label: 'Note vocale', short: 'Dicter', icon: <Mic />, run: () => setSheet('voice') },
    { key: 'report', label: 'Rapport', icon: <Send />, run: () => setSheet('report') },
    { key: 'avenant', label: 'Avenant', icon: <FileSignature />, run: () => setSheet('avenant') },
  ];

  return (
    <div className="space-y-6">
      <DetailHeader v={v} bob={[line1, line2]} onAskBob={() => askBob(`Fais-moi le point sur le chantier ${ch.name}`)} />

      {/* Ordinateur : barre d'actions */}
      <div className="hidden items-center gap-2 md:flex">
        {actions.map((a) => (
          <Button key={a.key} icon={a.icon} onClick={a.run} className="[&_svg]:h-4 [&_svg]:w-4">
            {a.label}
          </Button>
        ))}
        <div className="flex-1" />
        {!done && (
          <Button variant="primary" icon={<ClipboardCheck className="h-4 w-4" />} onClick={() => navigate(`/app/pv-reception?chantier=${ch.id}`)}>
            Signer le PV de réception
          </Button>
        )}
      </div>

      {/* Téléphone : grosses actions au pouce, utilisables avec des gants */}
      <div className="stagger-fast grid grid-cols-5 gap-2 md:hidden">
        {actions.map((a) => (
          <button key={a.key} onClick={a.run} className="press flex h-[76px] flex-col items-center justify-center gap-2 rounded-[16px] bg-white text-[11.5px] font-medium shadow-card [&_svg]:h-5 [&_svg]:w-5">
            <span className="grid h-6 place-items-center text-ink">{a.icon}</span>
            <span className="max-w-full truncate px-1">{'short' in a ? a.short : a.label}</span>
          </button>
        ))}
      </div>

      <UnderlineTabs
        value={tab}
        onChange={setTab}
        options={[
          { value: 'apercu', label: 'Aperçu' },
          { value: 'planning', label: 'Planning' },
          { value: 'photos', label: 'Photos', count: myPhotos.length },
          { value: 'documents', label: 'Documents' },
          { value: 'journal', label: 'Journal', count: journalCount },
          { value: 'achats', label: 'Achats' },
        ]}
      />

      <div key={tab} className="animate-fade-up">
        {tab === 'apercu' && <Overview v={v} missingPhoto={missing?.message} onOpenJournal={() => setTab('journal')} />}
        {tab === 'planning' && <PlanningTab v={v} />}
        {tab === 'photos' && <PhotosPanel chantiers={[ch]} onTake={capture.open} />}
        {tab === 'documents' && <DocumentsTab v={v} />}
        {tab === 'journal' && <JournalTab v={v} onVoice={() => setSheet('voice')} />}
        {tab === 'achats' && <AchatsTab v={v} />}
      </div>

      {!done && ch.status !== 'a_planifier' && (
        <Button variant="primary" size="lg" className="sticky bottom-[calc(96px+var(--safe-b))] z-10 w-full shadow-lift md:hidden" icon={<ClipboardCheck className="h-5 w-5" />} onClick={() => navigate(`/app/pv-reception?chantier=${ch.id}`)}>
          Terminer le chantier et signer le PV
        </Button>
      )}

      {capture.element}
      <VoiceNoteSheet v={v} open={sheet === 'voice'} onClose={() => setSheet(null)} />
      <ReportSheet v={v} open={sheet === 'report'} onClose={() => setSheet(null)} />
      <AvenantSheet v={v} open={sheet === 'avenant'} onClose={() => setSheet(null)} />
    </div>
  );
}
