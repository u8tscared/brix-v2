import { useNavigate } from 'react-router-dom';
import { Check, Clock, MoonStar, RotateCcw, Undo2, X } from 'lucide-react';
import { AnimatedNumber, SuccessDot } from '@/components/motion';
import { Card, Icon, IconTile, PageHeader, cn, toast } from '@/components/ui';
import { useBrix } from '@/lib/store';
import { money } from '@/lib/format';
import { useBobLocal, type NightLevel } from './store';
import { lateInvoices, due } from './nlu/money';
import { BobNav } from './components/BobNav';
import { Toggle } from './components/SettingToggle';

const LEVELS: { key: NightLevel; title: string; text: string; icon: string }[] = [
  { key: 'ask', title: 'Me demander toujours', text: 'Bob prépare tout, mais rien ne part sans ton accord le matin.', icon: 'ShieldCheck' },
  { key: 'small', title: 'Agir pour les petites choses', text: 'Relances polies et rapprochements faits seul. Devis et commandes attendent ton accord.', icon: 'Zap' },
  { key: 'auto', title: 'Autonome', text: 'Bob envoie aussi les devis préparés et passe les commandes sous 500 €.', icon: 'MoonStar' },
];

const TASKS: { key: string; label: string; hint: string }[] = [
  { key: 'relances', label: 'Relancer les factures en retard', hint: 'Un message poli, avec le lien de paiement' },
  { key: 'devis', label: 'Préparer les devis depuis tes notes vocales', hint: 'Tu dictes le soir, le devis est prêt le matin' },
  { key: 'banque', label: 'Rapprocher les paiements de la banque', hint: 'Chaque virement associé à sa facture' },
  { key: 'commandes', label: 'Préparer les commandes fournisseurs', hint: 'Le matériel des chantiers de la semaine' },
  { key: 'planning', label: 'Proposer un planning optimisé', hint: 'Moins de route entre les chantiers' },
];

export default function AgentNuit() {
  const navigate = useNavigate();
  const s = useBrix();
  const local = useBobLocal();
  const log = s.bob.filter((b) => b.at < '06:30');
  const pending = log.filter((b) => !b.done && !local.nightDecisions[b.id]);
  const late = lateInvoices();

  const decide = (id: string, d: 'validee' | 'annulee') => {
    local.decideNight(id, d);
    if (d === 'validee') s.updateBob(id, { done: true });
    toast(d === 'validee' ? 'Validé, Bob s’en occupe.' : 'Annulé, rien n’est parti.', d === 'validee' ? 'ok' : 'info', { label: 'Revenir', run: () => { local.decideNight(id, null); if (d === 'validee') s.updateBob(id, { done: false }); } });
  };
  const validateAll = () => {
    pending.forEach((b) => { local.decideNight(b.id, 'validee'); s.updateBob(b.id, { done: true }); });
    toast(`${pending.length} action${pending.length > 1 ? 's' : ''} validée${pending.length > 1 ? 's' : ''}.`);
  };

  const tonight = [
    local.nightTasks.relances && late.length ? `Relancer ${late.length} facture${late.length > 1 ? 's' : ''} (${money(late.reduce((x, f) => x + due(f), 0), true)})` : null,
    local.nightTasks.devis ? 'Préparer les devis de tes notes vocales de la journée' : null,
    local.nightTasks.banque ? 'Rapprocher les nouveaux paiements' : null,
    local.nightTasks.commandes ? 'Préparer la commande de matériel de la semaine' : null,
    local.nightTasks.planning ? 'Proposer un planning avec moins de route' : null,
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-6">
      <PageHeader icon={<IconTile name="MoonStar" tone="indigo" size="lg" />} kicker="Bob" title="Agent de nuit" subtitle="Pendant que tu dors, Bob relance, prépare et range. Tu valides le matin en un geste." />
      <BobNav />

      <div className="grid gap-5 [&>*]:min-w-0 xl:grid-cols-[1.45fr_1fr]">
        <section className="relative self-start overflow-hidden rounded-card bg-white shadow-halo" aria-label="La nuit dernière">
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <div className="absolute -right-16 -top-24 h-56 w-56 rounded-full bg-[#d6c6fd] opacity-60 blur-[70px]" />
            <div className="absolute -top-28 right-40 h-40 w-56 rounded-full bg-[#e9b8f5] opacity-40 blur-[80px]" />
          </div>
          <header className="relative flex flex-wrap items-center gap-x-3 gap-y-3 px-5 pb-3 pt-5">
            <IconTile tone="indigo" icon={<MoonStar strokeWidth={1.9} />} />
            <div className="min-w-0 flex-1">
              <h2 className="text-[16px] font-semibold tracking-[-0.02em]">La nuit dernière</h2>
              <div className="text-[12.5px] text-ink-2">
                <AnimatedNumber value={log.length} /> actions · environ <AnimatedNumber value={Math.max(1, log.length) * 20} /> min gagnées
              </div>
            </div>
            {pending.length > 0 ? (
              <button onClick={validateAll} className="flex h-11 items-center justify-center gap-1.5 max-sm:w-full rounded-full bg-ink px-4 text-[13px] font-semibold text-white shadow-ink transition duration-300 ease-spring hover:-translate-y-px active:scale-95">
                <Check className="h-4 w-4" strokeWidth={2.4} /> Tout valider ({pending.length})
              </button>
            ) : (
              <span className="flex items-center gap-1.5 text-[13px] font-medium text-deep-g"><SuccessDot size={20} /> Tout est traité</span>
            )}
          </header>
          {log.length === 0 && <p className="relative px-5 pb-8 pt-4 text-[13px] text-ink-2">Bob n’a rien eu à faire cette nuit.</p>}
          <ol className="stagger-fast relative px-3 pb-3">
            <span className="absolute bottom-8 left-[87.5px] top-6 w-px bg-halo-line max-sm:left-[35.5px]" aria-hidden />
            {log.map((b) => {
              const d = local.nightDecisions[b.id] ?? (b.done ? 'validee' : undefined);
              return (
                <li key={b.id} className={cn('relative flex flex-col gap-3 rounded-[14px] px-2 py-3 transition-colors hover:bg-halo-hover sm:flex-row sm:items-center', d === 'annulee' && 'opacity-50')}>
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span className="num w-10 shrink-0 pt-2 text-right text-[11.5px] text-ink-3 max-sm:hidden">{b.at.replace(':', ' h ')}</span>
                    <span className={cn('relative z-[1] grid h-8 w-8 shrink-0 place-items-center rounded-full ring-4 ring-white transition-colors', d === 'validee' ? 'bg-pale-g text-deep-g' : 'bg-pale-i text-deep-i')}>
                      {d === 'validee' ? <SuccessDot size={18} /> : <Icon name={b.icon} className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0 pt-0.5">
                      <div className={cn('text-[13.5px] font-medium leading-snug', d === 'annulee' && 'line-through')}>{b.text}</div>
                      {b.detail && <div className="text-[12.5px] text-ink-2">{b.detail}</div>}
                      {d && <div className={cn('mt-1 text-[11.5px] font-medium', d === 'validee' ? 'text-deep-g' : 'text-ink-3')}>{d === 'validee' ? (b.done && !local.nightDecisions[b.id] ? 'Fait seul (petite chose)' : 'Validé') : 'Annulé, rien n’est parti'}</div>}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2 pl-11 sm:pl-0">
                    {b.to && <NightBtn onClick={() => navigate(b.to!)}>{b.cta && b.cta !== 'Valider' ? b.cta : 'Voir'}</NightBtn>}
                    {!d ? (
                      <>
                        <NightBtn ghost onClick={() => decide(b.id, 'annulee')} icon={<X className="h-3.5 w-3.5" />}>Annuler</NightBtn>
                        <NightBtn solid onClick={() => decide(b.id, 'validee')} icon={<Check className="h-3.5 w-3.5" strokeWidth={2.4} />}>Valider</NightBtn>
                      </>
                    ) : local.nightDecisions[b.id] ? (
                      <NightBtn ghost onClick={() => { local.decideNight(b.id, null); s.updateBob(b.id, { done: false }); }} icon={<Undo2 className="h-3.5 w-3.5" />}>Revenir</NightBtn>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <div className="space-y-5">
          <Card className="p-4">
            <div className="text-[14px] font-semibold">Ce que Bob peut faire seul</div>
            <div className="mt-3 space-y-2">
              {LEVELS.map((l) => (
                <button key={l.key} onClick={() => { local.setNightLevel(l.key); toast(`Autonomie : ${l.title.toLowerCase()}.`); }} className={cn('flex w-full items-start gap-3 rounded-card-sm border p-3 text-left transition duration-300 ease-spring active:scale-[.99]', local.nightLevel === l.key ? 'border-transparent bg-dawn-pale shadow-[0_0_0_1.5px_#e9b8f5,0_10px_30px_-12px_rgba(217,70,239,.3)]' : 'border-transparent bg-white shadow-halo-sm hover:-translate-y-px')}>
                  <span className={cn('mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full', local.nightLevel === l.key ? 'bg-dawn-diag' : 'shadow-[inset_0_0_0_2px_#dcd6ea]')}>
                    {local.nightLevel === l.key && <i className="h-2 w-2 animate-[scale-in_.25s_var(--ease)_both] rounded-full bg-white" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-semibold">{l.title}</span>
                    <span className="block text-[12.5px] leading-snug text-ink-2">{l.text}</span>
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-[11.5px] text-ink-3">Quel que soit le réglage, Bob ne paie rien, ne supprime rien et ne signe rien à ta place.</p>
          </Card>

          <Card className="p-4">
            <div className="text-[14px] font-semibold">Les tâches de la nuit</div>
            <div className="mt-3 space-y-3.5">
              {TASKS.map((t) => <Toggle key={t.key} label={t.label} hint={t.hint} checked={!!local.nightTasks[t.key]} onChange={(v) => local.setNightTask(t.key, v)} />)}
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 text-[14px] font-semibold"><Clock className="h-4 w-4 text-ink-3" /> Cette nuit, à 2 h</div>
            {tonight.length ? (
              <ul className="mt-2 space-y-1.5">
                {tonight.map((t) => <li key={t} className="flex gap-2 text-[13px] text-ink-2"><span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-ink-3" />{t}</li>)}
              </ul>
            ) : (
              <p className="mt-2 text-[13px] text-ink-2">Toutes les tâches sont coupées : Bob se repose aussi.</p>
            )}
            <button onClick={() => navigate('/app/bob/brief')} className="mt-3 flex items-center gap-1.5 text-[12.5px] font-medium text-ink-2 hover:text-ink"><RotateCcw className="h-3.5 w-3.5" /> Le résumé arrive dans ton brief du matin</button>
          </Card>
        </div>
      </div>
    </div>
  );
}

function NightBtn({ children, onClick, icon, solid, ghost }: { children: React.ReactNode; onClick: () => void; icon?: React.ReactNode; solid?: boolean; ghost?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex h-9 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium transition active:scale-95',
        solid ? 'bg-ink font-semibold text-white shadow-ink hover:bg-[#241f3f]' : ghost ? 'text-ink-2 hover:bg-halo-hover hover:text-ink' : 'bg-white text-ink shadow-[0_0_0_1px_#ece8f6] hover:-translate-y-px',
      )}
    >
      {icon}
      {children}
    </button>
  );
}
