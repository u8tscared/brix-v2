import { useNavigate } from 'react-router-dom';
import { Check, Clock, MoonStar, RotateCcw, Undo2, X } from 'lucide-react';
import { Badge, Button, Card, Icon, PageHeader, cn, toast } from '@/components/ui';
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
      <PageHeader kicker="Bob" title="Agent de nuit" subtitle="Pendant que tu dors, Bob relance, prépare et range. Tu valides le matin en un geste." />
      <BobNav />

      <div className="grid gap-5 [&>*]:min-w-0 xl:grid-cols-[1.45fr_1fr]">
        <Card>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line px-4 py-3">
            <MoonStar className="h-4 w-4 text-ink-3" />
            <div className="min-w-0 flex-1">
              <h4 className="text-[13.5px] font-semibold">La nuit dernière</h4>
              <div className="text-xs text-ink-3">{log.length} actions · environ {Math.max(1, log.length) * 20} min gagnées</div>
            </div>
            {pending.length > 0 ? <Button size="sm" variant="dawn" icon={<Check className="h-4 w-4" />} onClick={validateAll}>Tout valider</Button> : <Badge tone="ok" icon={<Check />}>Tout est traité</Badge>}
          </div>
          {log.length === 0 && <p className="px-4 py-6 text-[13px] text-ink-2">Bob n’a rien eu à faire cette nuit.</p>}
          {log.map((b) => {
            const d = local.nightDecisions[b.id] ?? (b.done ? 'validee' : undefined);
            return (
              <div key={b.id} className={cn('flex flex-col gap-3 border-b border-line px-4 py-3.5 last:border-b-0 sm:flex-row sm:items-center', d === 'annulee' && 'opacity-60')}>
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] border border-line bg-white text-ink-2"><Icon name={b.icon} className="h-4 w-4" /></span>
                  <div className="min-w-0">
                    <div className={cn('text-[13.5px] font-medium leading-snug', d === 'annulee' && 'line-through')}>{b.text}</div>
                    {b.detail && <div className="text-[12.5px] text-ink-2">{b.detail}</div>}
                    <div className="num mt-0.5 text-[11.5px] text-ink-3">à {b.at.replace(':', ' h ')}</div>
                    {d && <div className={cn('mt-1 text-[11.5px] font-medium', d === 'validee' ? 'text-ok' : 'text-ink-3')}>{d === 'validee' ? (b.done && !local.nightDecisions[b.id] ? 'Fait seul (petite chose)' : 'Validé') : 'Annulé'}</div>}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2 pl-11 sm:pl-0">
                  {b.to && <Button size="sm" variant="secondary" onClick={() => navigate(b.to!)}>{b.cta && b.cta !== 'Valider' ? b.cta : 'Voir'}</Button>}
                  {!d ? (
                    <>
                      <Button size="sm" variant="primary" icon={<Check className="h-3.5 w-3.5" />} onClick={() => decide(b.id, 'validee')}>Valider</Button>
                      <Button size="sm" variant="ghost" icon={<X className="h-3.5 w-3.5" />} onClick={() => decide(b.id, 'annulee')}>Annuler</Button>
                    </>
                  ) : local.nightDecisions[b.id] ? (
                    <Button size="sm" variant="ghost" icon={<Undo2 className="h-3.5 w-3.5" />} onClick={() => { local.decideNight(b.id, null); s.updateBob(b.id, { done: false }); }}>Revenir</Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </Card>

        <div className="space-y-5">
          <Card className="p-4">
            <div className="text-[14px] font-semibold">Ce que Bob peut faire seul</div>
            <div className="mt-3 space-y-2">
              {LEVELS.map((l) => (
                <button key={l.key} onClick={() => { local.setNightLevel(l.key); toast(`Autonomie : ${l.title.toLowerCase()}.`); }} className={cn('flex w-full items-start gap-3 rounded-[12px] border p-3 text-left transition', local.nightLevel === l.key ? 'border-ink bg-white shadow-[0_0_0_1px_var(--ink)]' : 'border-line2 bg-white hover:border-ink-3')}>
                  <span className={cn('mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2', local.nightLevel === l.key ? 'border-ink' : 'border-line2')}>
                    {local.nightLevel === l.key && <i className="h-2.5 w-2.5 rounded-full bg-ink" />}
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
