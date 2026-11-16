import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AudioLines, Camera, ChevronLeft, ClipboardCheck, FileSignature, HardHat, MapPin, Mic, Send } from 'lucide-react';
import { Badge, Button, Card, EmptyState, UnderlineTabs } from '@/components/ui';
import { useBrix } from '@/lib/store';
import { useUI } from '@/lib/ui';
import { CHANTIER_STATUS } from '@/lib/status';
import { dateShort } from '@/lib/format';
import { useChantierView } from './lib/useChantier';
import { bobSummary, RISK_LABEL } from './lib/metrics';
import { forecast, isOutdoor, isRainy } from './lib/weather';
import { qualityChecks } from './lib/quality';
import { useChantiersLocal, useChantiersSeed } from './store';
import { TeamAvatars } from './components/common/bits';
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
  const journalCount = useChantiersLocal((s) => s.journal.filter((j) => j.chantierId === id).length);
  const [params, setParams] = useSearchParams();
  const tab = (params.get('onglet') as Tab) || 'apercu';
  const setTab = (t: Tab) => setParams(t === 'apercu' ? {} : { onglet: t }, { replace: true });
  const [sheet, setSheet] = useState<'voice' | 'report' | 'avenant' | null>(null);
  const capture = usePhotoCapture(id);

  if (!v) {
    return <EmptyState icon={<HardHat />} title="Chantier introuvable" text="Il a peut-être été supprimé." action={<Button onClick={() => navigate('/app/chantiers')}>Retour aux chantiers</Button>} />;
  }

  const { ch, m, client, team } = v;
  const myPhotos = photos.filter((p) => p.chantierId === ch.id);
  const missing = qualityChecks(ch, trade, myPhotos).find((c) => !c.ok);
  const rain = isOutdoor(`${ch.name} ${v.devis?.title ?? ''}`) ? forecast(5, ch.city).find(isRainy) : undefined;
  const rainLabel = rain ? new Date(rain.date + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'long' }) : undefined;
  const [line1, line2] = bobSummary(ch, m, team, rainLabel);
  const risk = RISK_LABEL[m.risk];
  const done = ch.status === 'termine';

  const actions = [
    { key: 'voice', label: 'Note vocale', icon: <Mic className="h-[18px] w-[18px]" />, run: () => setSheet('voice') },
    { key: 'photo', label: 'Photo', icon: <Camera className="h-[18px] w-[18px]" />, run: () => capture.open() },
    { key: 'report', label: 'Rapport client', icon: <Send className="h-[18px] w-[18px]" />, run: () => setSheet('report') },
    { key: 'avenant', label: 'Avenant', icon: <FileSignature className="h-[18px] w-[18px]" />, run: () => setSheet('avenant') },
  ];

  return (
    <div className="space-y-5">
      <div>
        <Link to="/app/chantiers" className="-ml-1 inline-flex h-8 items-center gap-1 rounded-lg px-1 text-[13px] text-ink-2 hover:text-ink">
          <ChevronLeft className="h-4 w-4" /> Chantiers
        </Link>
        <div className="mt-1 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.025em] md:text-[26px]">{ch.name}</h1>
              <Badge tone={CHANTIER_STATUS[ch.status].tone}>{CHANTIER_STATUS[ch.status].label}</Badge>
              {!done && <Badge tone={risk.tone} dot>{risk.label}</Badge>}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-2">
              {client && <Link to={`/app/clients/${client.id}`} className="font-medium text-ink hover:underline">{client.name}</Link>}
              <a href={`https://maps.google.com/?q=${encodeURIComponent(`${ch.address} ${ch.city}`)}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-ink">
                <MapPin className="h-3.5 w-3.5" /> {ch.address}, {ch.city}
              </a>
              <span className="num">{dateShort(ch.startDate)} → {dateShort(ch.endDate)}</span>
              <TeamAvatars team={team} size={24} />
            </div>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            {actions.map((a) => (
              <Button key={a.key} icon={a.icon} onClick={a.run} className="[&_svg]:h-4 [&_svg]:w-4">
                <span className="hidden xl:inline">{a.label}</span>
              </Button>
            ))}
            {!done && (
              <Button variant="primary" icon={<ClipboardCheck className="h-4 w-4" />} onClick={() => navigate(`/app/pv-reception?chantier=${ch.id}`)}>
                Terminer
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Actions rapides au téléphone : gros boutons, utilisables avec des gants */}
      <div className="grid grid-cols-4 gap-2 md:hidden">
        {actions.map((a) => (
          <button key={a.key} onClick={a.run} className="flex h-[68px] flex-col items-center justify-center gap-1.5 rounded-[14px] border border-line bg-white text-[11.5px] font-medium active:scale-95">
            <span className="text-ink">{a.icon}</span>
            {a.label}
          </button>
        ))}
      </div>

      <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-white">
            <AudioLines className="h-4 w-4" />
          </span>
          <div className="min-w-0 text-[13.5px] leading-relaxed">
            <div className="text-xs font-medium text-ink-3">Le point de Bob</div>
            <p>{line1}</p>
            <p className="text-ink-2">{line2}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 border-t border-line pt-3 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
          <div>
            <div className="text-xs text-ink-2">Avancement</div>
            <div className="num font-display text-[30px] font-semibold leading-none tracking-[-0.02em] dawn-text">{ch.progress} %</div>
          </div>
          <Button size="sm" variant="soft" onClick={() => askBob(`Fais-moi le point sur le chantier ${ch.name}`)}>Demander à Bob</Button>
        </div>
      </Card>

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
        {tab === 'apercu' && <Overview v={v} missingPhoto={missing?.message} />}
        {tab === 'planning' && <PlanningTab v={v} />}
        {tab === 'photos' && <PhotosPanel chantiers={[ch]} onTake={capture.open} />}
        {tab === 'documents' && <DocumentsTab v={v} />}
        {tab === 'journal' && <JournalTab v={v} onVoice={() => setSheet('voice')} />}
        {tab === 'achats' && <AchatsTab v={v} />}
      </div>

      {!done && (
        <Button variant="primary" size="lg" className="w-full md:hidden" icon={<ClipboardCheck className="h-5 w-5" />} onClick={() => navigate(`/app/pv-reception?chantier=${ch.id}`)}>
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
