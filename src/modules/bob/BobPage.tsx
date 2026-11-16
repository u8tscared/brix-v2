import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Mic, RotateCcw } from 'lucide-react';
import { Badge, Button, Card, CardHeader, EmptyState, Icon, PageHeader, Segmented, cn, toast } from '@/components/ui';
import { useBrix } from '@/lib/store';
import { useUI } from '@/lib/ui';
import { CAPABILITIES } from './engine';
import { useBobLocal } from './store';
import { BobNav } from './components/BobNav';
import { MemoryCard } from './components/MemoryCard';
import { BobMark } from './components/VoiceOrb';
import { Toggle } from './components/SettingToggle';

export default function BobPage() {
  const ui = useUI();
  const navigate = useNavigate();
  const bob = useBrix((s) => s.bob);
  const updateBob = useBrix((s) => s.updateBob);
  const { tone, setTone } = useBobLocal();
  const todo = bob.filter((b) => !b.done).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bob"
        subtitle="Ton assistant : tu parles, il fait. Devis, relances, planning, questions de métier."
        actions={<Button variant="dawn" size="lg" icon={<Mic className="h-5 w-5" />} onClick={() => ui.askBob('', true)}>Parler à Bob</Button>}
      />
      <BobNav />

      <div className="grid gap-5 [&>*]:min-w-0 xl:grid-cols-[1.35fr_1fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader title="Ce que Bob sait faire" meta="Touche un exemple pour l’essayer" />
            <div className="grid gap-px bg-line sm:grid-cols-2">
              {CAPABILITIES.map((c) => (
                <button key={c.title} onClick={() => ui.askBob(c.example)} className="group flex min-h-[76px] items-start gap-3 bg-white p-4 text-left transition hover:bg-[#fbfaff]">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-sub text-ink-2 group-hover:bg-vi-50 group-hover:text-vi-700">
                    <Icon name={c.icon} className="h-[18px] w-[18px]" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-semibold">{c.title}</span>
                    <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-2">« {c.example} »</span>
                  </span>
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Ce que Bob a fait" meta={todo ? `${todo} à valider` : 'tout est validé'} />
            {bob.length === 0 ? (
              <EmptyState className="m-4" icon={<RotateCcw />} title="Rien pour l’instant" text="Chaque action de Bob apparaîtra ici, avec un bouton pour la vérifier." />
            ) : (
              <div>
                {bob.map((b) => (
                  <div key={b.id} className="flex items-start gap-3 border-b border-line px-4 py-3 last:border-b-0">
                    <span className={cn('relative grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border border-line bg-white text-ink-2')}>
                      <Icon name={b.icon} className="h-4 w-4" />
                      {b.done && <span className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-ok text-white ring-2 ring-white"><Check className="h-2.5 w-2.5" strokeWidth={3} /></span>}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13.5px] font-medium leading-snug">{b.text}</div>
                      {b.detail && <div className="mt-0.5 text-[12.5px] text-ink-2">{b.detail}</div>}
                      <div className="mt-1 text-[11.5px] text-ink-3">à {b.at.replace(':', ' h ')}{b.done ? ' · validé' : ''}</div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center">
                      {b.to && <Button size="sm" variant="secondary" onClick={() => navigate(b.to!)}>{b.cta ?? 'Voir'}</Button>}
                      {!b.done && <Button size="sm" variant="ghost" icon={<Check className="h-3.5 w-3.5" />} onClick={() => { updateBob(b.id, { done: true }); toast('Action validée.'); }}>Valider</Button>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <BobMark size={40} />
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold">Comment Bob te parle</div>
                <div className="text-[12.5px] text-ink-2">Il te tutoie et fait des phrases courtes.</div>
              </div>
            </div>
            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[13px] font-medium">Longueur des réponses</span>
                <Segmented size="sm" value={tone.length} onChange={(v) => setTone({ length: v })} options={[{ value: 'court', label: 'Court' }, { value: 'detaille', label: 'Détaillé' }]} />
              </div>
              <Toggle label="Vouvoyer tes clients" hint="Dans les mails et relances que Bob prépare." checked={tone.formal} onChange={(v) => setTone({ formal: v })} />
              <Toggle label="Lire les réponses à voix haute" hint="Quand tu parles à Bob avec le micro." checked={tone.speak} onChange={(v) => setTone({ speak: v })} />
            </div>
          </Card>

          <MemoryCard />

          <Card className="p-4">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-sub text-ink-2"><Icon name="ShieldCheck" className="h-[18px] w-[18px]" /></span>
              <div className="min-w-0 flex-1 text-[13px] text-ink-2">
                <div className="mb-1 flex items-center gap-2 text-[14px] font-semibold text-ink">Version de démo <Badge tone="neutral">Démo</Badge></div>
                Ici, Bob répond avec des réponses préparées et agit sur les données de démonstration. Dans la version finale, il comprend tout ce que tu lui dis. Il ne fait jamais rien d’important sans ton accord : envoyer un devis, payer, supprimer.
              </div>
            </div>
            <button onClick={() => navigate('/app/bob/nuit')} className="mt-3 flex w-full items-center justify-between rounded-[10px] bg-sub px-3 py-2.5 text-[13px] font-medium text-ink hover:bg-line">
              Régler ce que Bob fait seul <ArrowRight className="h-4 w-4" />
            </button>
          </Card>
        </div>
      </div>
    </div>
  );
}
