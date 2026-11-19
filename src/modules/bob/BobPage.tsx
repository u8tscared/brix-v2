import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Check, Mic, RotateCcw } from 'lucide-react';
import { AnimatedNumber, SuccessDot } from '@/components/motion';
import { Badge, Button, Card, CardHeader, EmptyState, Icon, IconTile, PageHeader, Segmented, cn, toast } from '@/components/ui';
import type { DepartmentKey } from '@/lib/catalog';
import { useBrix } from '@/lib/store';
import { useUI } from '@/lib/ui';
import { etatIA } from './agent';
import { capabilities } from './engine';
import { useBobLocal } from './store';
import { BobNav } from './components/BobNav';
import { MemoryCard } from './components/MemoryCard';
import { BobMark } from './components/VoiceOrb';
import { Toggle } from './components/SettingToggle';

const DEPT: Record<string, DepartmentKey> = {
  FileText: 'vendre', Contact: 'vendre', Wallet: 'facturer', BellRing: 'facturer', CalendarRange: 'equipe', Users: 'equipe',
  HardHat: 'chantiers', Calculator: 'gestion', Landmark: 'gestion', ShieldCheck: 'metier',
};

export default function BobPage() {
  const ui = useUI();
  const navigate = useNavigate();
  const bob = useBrix((s) => s.bob);
  const firstName = useBrix((s) => s.user.firstName);
  const updateBob = useBrix((s) => s.updateBob);
  const decideNight = useBobLocal((s) => s.decideNight);
  const { tone, setTone } = useBobLocal();
  const caps = capabilities();
  const [enLigne, setEnLigne] = useState(false);
  useEffect(() => {
    let vivant = true;
    void etatIA().then((v) => vivant && setEnLigne(v.disponible));
    return () => {
      vivant = false;
    };
  }, []);
  const todo = bob.filter((b) => !b.done).length;

  const validate = (id: string) => {
    updateBob(id, { done: true });
    decideNight(id, 'validee');
    toast('Validé.', 'ok', { label: 'Annuler', run: () => { updateBob(id, { done: false }); decideNight(id, null); } });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<BobMark size={48} />}
        title="Brix AI"
        subtitle="Ton assistant : tu parles, il fait. Devis, relances, planning, questions de métier."
        actions={<Button variant="dawn" size="lg" icon={<Mic className="h-5 w-5" />} kbd="⌘J" onClick={() => ui.askBob('', true)}>Parler à Brix AI</Button>}
      />
      <BobNav />

      {/* Barre de demande : un seul geste pour commencer. */}
      <button
        onClick={() => ui.askBob('')}
        className="lift group flex w-full items-center gap-3 rounded-pill bg-white p-2 pr-2.5 text-left shadow-halo"
      >
        <BobMark size={44} />
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-medium text-ink">Salut {firstName || 'chef'}, je fais quoi pour toi ?</span>
          <span className="block truncate text-[12.5px] text-ink-3">Par exemple : « {caps[0].example} »</span>
        </span>
        <span className="hidden items-center gap-2 text-[12.5px] text-ink-3 sm:flex">
          <span className="num"><AnimatedNumber value={bob.length} /></span> actions cette semaine
        </span>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ink text-white shadow-ink transition duration-300 ease-spring group-hover:translate-x-0.5"><ArrowRight className="h-4 w-4" /></span>
      </button>

      <div className="grid gap-5 [&>*]:min-w-0 xl:grid-cols-[1.35fr_1fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader title="Ce que Brix AI sait faire" meta="Touche un exemple pour l’essayer" />
            <div className="stagger-fast grid gap-2 p-3 sm:grid-cols-2">
              {caps.map((c) => (
                <button key={c.title} onClick={() => ui.askBob(c.example)} className="group flex min-h-[76px] items-start gap-3 rounded-card-sm p-3 text-left transition hover:bg-halo-hover active:scale-[.99]">
                  <IconTile name={c.icon} dept={DEPT[c.icon] ?? 'bob'} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1 text-[13.5px] font-semibold">
                      {c.title}
                      <ArrowUpRight className="h-3.5 w-3.5 text-ink-3 opacity-0 transition group-hover:opacity-100" />
                    </span>
                    <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-2">« {c.example} »</span>
                  </span>
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Ce que Brix AI a fait" meta={todo ? `${todo} à valider` : 'tout est validé'} />
            {bob.length === 0 ? (
              <EmptyState className="m-4 shadow-none" icon={<RotateCcw />} title="Rien pour l’instant" text="Chaque action de Brix AI apparaîtra ici, avec un bouton pour la vérifier." />
            ) : (
              <ol className="stagger-fast relative px-4 py-2">
                <span className="absolute bottom-6 left-[33px] top-6 w-px bg-halo-line" aria-hidden />
                {bob.map((b) => (
                  <li key={b.id} className="relative flex items-start gap-3 py-2.5">
                    <span className={cn('relative z-[1] grid h-9 w-9 shrink-0 place-items-center rounded-full transition-colors', b.done ? 'bg-white text-ok shadow-[0_0_0_1px_#ece8f6]' : 'bg-pale-v text-deep-v')}>
                      {b.done ? <SuccessDot size={20} /> : <Icon name={b.icon} className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className={cn('text-[13.5px] font-medium leading-snug transition-colors', b.done && 'text-ink-2')}>{b.text}</div>
                      {b.detail && <div className="mt-0.5 text-[12.5px] text-ink-2">{b.detail}</div>}
                      <div className="num mt-1 text-[11.5px] text-ink-3">à {b.at.replace(':', ' h ')}{b.done ? ' · validé' : ''}</div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center">
                      {b.to && <Button size="sm" variant="ghost" iconRight={<ArrowUpRight className="h-3.5 w-3.5" />} onClick={() => navigate(b.to!)}>{b.cta ?? 'Voir'}</Button>}
                      {!b.done && <Button size="sm" variant="primary" icon={<Check className="h-3.5 w-3.5" />} onClick={() => validate(b.id)}>Valider</Button>}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <BobMark size={40} />
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold">Comment Brix AI te parle</div>
                <div className="text-[12.5px] text-ink-2">Il te tutoie et fait des phrases courtes.</div>
              </div>
            </div>
            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[13px] font-medium">Longueur des réponses</span>
                <Segmented size="sm" value={tone.length} onChange={(v) => setTone({ length: v })} options={[{ value: 'court', label: 'Court' }, { value: 'detaille', label: 'Détaillé' }]} />
              </div>
              <Toggle label="Vouvoyer tes clients" hint="Dans les mails et relances que Brix AI prépare." checked={tone.formal} onChange={(v) => setTone({ formal: v })} />
              <Toggle label="Lire les réponses à voix haute" hint="Quand tu parles à Brix AI avec le micro." checked={tone.speak} onChange={(v) => setTone({ speak: v })} />
            </div>
          </Card>

          <MemoryCard />

          <Card className="p-4">
            <div className="flex items-start gap-3">
              <IconTile name="ShieldCheck" tone="green" size="sm" />
              <div className="min-w-0 flex-1 text-[13px] text-ink-2">
                {enLigne ? (
                  <>
                    <div className="mb-1 text-[14px] font-semibold text-ink">Brix AI agit, tu valides</div>
                    Brix AI comprend tes demandes et prépare le travail dans l’app. Il ne fait jamais rien d’important sans ton accord : envoyer un devis ou une relance, payer, supprimer.
                  </>
                ) : (
                  <>
                    <div className="mb-1 flex items-center gap-2 text-[14px] font-semibold text-ink">Version de démo <Badge tone="neutral">Démo</Badge></div>
                    Ici, Brix AI répond avec des réponses préparées et agit sur les données de démonstration. Il ne fait jamais rien d’important sans ton accord : envoyer un devis, payer, supprimer.
                  </>
                )}
              </div>
            </div>
            <button onClick={() => navigate('/app/bob/nuit')} className="mt-3 flex min-h-[44px] w-full items-center justify-between rounded-pill bg-halo-hover px-4 py-2.5 text-[13px] font-medium text-ink transition hover:bg-halo-track">
              Régler ce que Brix AI fait seul <ArrowRight className="h-4 w-4" />
            </button>
          </Card>
        </div>
      </div>
    </div>
  );
}
