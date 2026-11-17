import { useNavigate } from 'react-router-dom';
import { Bell, Check, ChevronRight, Plus, X } from 'lucide-react';
import { Button, Card, Icon, Progress, cn } from '@/components/ui';
import { TRADE_BY_KEY } from '@/lib/catalog';
import { capitalize, dateLong, greeting, money, todayISO } from '@/lib/format';
import { useBrix } from '@/lib/store';
import { useUI } from '@/lib/ui';
import { BobNight, ChantiersPanel, KpiStrip, Pipeline, TeamToday, TodayList } from './panels';
import { useCockpitData } from './useCockpitData';

const SETUP = [
  { key: 'profil', label: 'Compléter votre entreprise', sub: 'Logo, assurance décennale, IBAN', to: '/app/reglages/entreprise', min: 2 },
  { key: 'premier_devis', label: 'Faire votre premier devis', sub: 'À la voix : 2 minutes', to: '/app/devis/nouveau', min: 2 },
  { key: 'efacture', label: 'Activer la facture électronique', sub: 'Obligatoire, on s\'en occupe', to: '/app/facture-electronique', min: 1 },
  { key: 'banque', label: 'Relier votre banque', sub: 'Paiements rapprochés tout seuls', to: '/app/tresorerie', min: 1 },
  { key: 'equipe', label: 'Inviter votre équipe', sub: 'Par lien, SMS ou QR code', to: '/app/equipe', min: 1 },
  { key: 'import', label: 'Importer vos clients', sub: 'Depuis votre téléphone ou un fichier', to: '/app/clients', min: 1 },
];

function SetupChecklist() {
  const s = useBrix();
  const navigate = useNavigate();
  const tasks = SETUP.filter((t) => t.key !== 'equipe' || s.company.size !== 'solo');
  // Une étape faite ailleurs dans l'app compte aussi (ex. un devis créé depuis le bouton « Nouveau devis »).
  const isDone = (k: string) => !!s.setupTasks[k] || (k === 'premier_devis' && s.devis.length > 0) || (k === 'import' && s.clients.length > 2);
  const done = tasks.filter((t) => isDone(t.key)).length;
  if (s.prefs.checklistDismissed || done === tasks.length) return null;
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3 px-4 pb-3 pt-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold">Bien démarrer avec Brix</h3>
          <p className="text-[12.5px] text-ink-2">{done} sur {tasks.length} · environ {Math.max(2, (tasks.length - done) * 2)} minutes</p>
        </div>
        <button onClick={() => s.setPrefs({ checklistDismissed: true })} className="grid h-8 w-8 place-items-center rounded-lg text-ink-3 hover:bg-sub" aria-label="Masquer"><X className="h-4 w-4" /></button>
      </div>
      <Progress value={(done / tasks.length) * 100} tone="dawn" className="mx-4 mb-2" />
      <div className="grid sm:grid-cols-2 xl:grid-cols-3">
        {tasks.map((t) => {
          const ok = isDone(t.key);
          return (
            <button key={t.key} onClick={() => { s.markTask(t.key); navigate(t.to); }} className="flex min-h-[60px] items-center gap-3 border-t border-line px-4 text-left hover:bg-[#fafafc] sm:[&:nth-child(odd)]:border-r xl:[&:nth-child(odd)]:border-r-0 xl:[&:not(:nth-child(3n))]:border-r">
              <span className={cn('grid h-6 w-6 shrink-0 place-items-center rounded-full', ok ? 'bg-ok text-white' : 'border-[1.5px] border-line2')}>{ok && <Check className="h-3.5 w-3.5" strokeWidth={3} />}</span>
              <span className="min-w-0 flex-1">
                <b className={cn('block text-[13.5px] font-semibold', ok && 'text-ink-3 line-through')}>{t.label}</b>
                <span className="block text-xs text-ink-2">{t.sub}</span>
              </span>
              <ChevronRight className="h-4 w-4 text-ink-3" />
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function TradeTools() {
  const trade = useBrix((s) => TRADE_BY_KEY[s.company.trade]);
  const canOrder = useBrix((s) => s.enabled.includes('fournisseurs'));
  const navigate = useNavigate();
  if (!trade) return null;
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between px-1">
        <h3 className="text-[15px] font-semibold">Outils {trade.name.toLowerCase()}</h3>
        <button onClick={() => navigate('/app/outils')} className="-my-2 py-2 pl-3 text-xs font-medium text-ink-2">Tout voir</button>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {trade.tools.slice(0, 3).map((t) => (
          <button key={t.key} onClick={() => navigate(`/app/outils/${t.key}`)} className="flex flex-col items-center gap-1.5 rounded-2xl border border-line bg-white px-1 py-3 text-center text-[11px] font-medium leading-tight active:scale-[.97]">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-vi-50 text-vi-700"><Icon name={t.icon} className="h-4 w-4" /></span>
            {t.name}
          </button>
        ))}
        {canOrder && <button onClick={() => navigate('/app/fournisseurs')} className="flex flex-col items-center gap-1.5 rounded-2xl border border-line bg-white px-1 py-3 text-center text-[11px] font-medium leading-tight active:scale-[.97]">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-vi-50 text-vi-700"><Icon name="Truck" className="h-4 w-4" /></span>
          Commander
        </button>}
      </div>
    </div>
  );
}

/** Cockpit : la vue du matin. Dense et calme sur ordinateur, trois choses qui comptent sur téléphone. */
export default function Cockpit() {
  const s = useBrix();
  const ui = useUI();
  const navigate = useNavigate();
  const data = useCockpitData();
  const solo = s.company.size === 'solo';
  const onSite = s.employees.filter((e) => e.clockedInAt).length;
  const empty = s.devis.length === 0 && s.factures.length === 0;

  return (
    <div className="space-y-4 md:space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-[13px] text-ink-3 md:hidden">{capitalize(dateLong(todayISO()))}</div>
          <h1 className="text-[26px] font-semibold tracking-[-0.025em]">{greeting()} {s.user.firstName}</h1>
          <p className="mt-0.5 hidden text-[13px] text-ink-2 md:block">
            {capitalize(dateLong(todayISO()))} · {s.employees.length > 1 ? `${s.employees.length} personnes · ` : ''}{data.activeChantiers.length} chantiers actifs
          </p>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          {!solo && onSite > 0 && (
            <span className="mr-2 hidden items-center gap-2 whitespace-nowrap text-xs text-ink-2 xl:flex">
              <i className="h-2 w-2 animate-pulse2 rounded-full bg-ok" />
              {onSite} pointés · synchronisé à l'instant
            </span>
          )}
          <Button size="icon-sm" onClick={() => navigate('/app/bob/brief')} aria-label="Notifications"><Bell className="h-4 w-4" /></Button>
          <Button variant="primary" size="sm" icon={<Plus className="h-4 w-4" />} kbd="N" onClick={() => navigate('/app/devis/nouveau')}>Nouveau devis</Button>
        </div>
      </div>

      <SetupChecklist />

      {/* Téléphone : carte d'argent + aujourd'hui + outils */}
      <div className="space-y-5 md:hidden">
        <Card className="p-4">
          <div className="flex items-start justify-between">
            <span className="text-[13px] text-ink-2">Encaissé ce mois-ci</span>
            {data.trend !== null && (
              <span className={cn('rounded-full px-2 py-0.5 text-[11.5px] font-semibold', data.trend >= 0 ? 'bg-ok-bg text-ok' : 'bg-bad-bg text-bad')}>{data.trend >= 0 ? '+' : '−'}{Math.abs(data.trend)} % vs mois dernier</span>
            )}
          </div>
          <div className="num mt-1 font-display text-[38px] font-semibold leading-tight tracking-[-0.03em] dawn-text">{money(data.paidThisMonth, true)}</div>
          <div className="mt-2 flex items-center gap-3 text-[12px] text-ink-3"><Progress value={(data.paidThisMonth / data.goal) * 100} className="flex-1" />{Math.round((data.paidThisMonth / data.goal) * 100)} % de {money(data.goal, true)}</div>
          <div className="mt-4 grid grid-cols-2 border-t border-line pt-3">
            <button onClick={() => navigate('/app/factures')} className="border-r border-line pr-3 text-left">
              <div className="text-[12px] text-ink-2">À encaisser</div>
              <div className="num text-[19px] font-semibold">{money(data.toCollect, true)}</div>
              <div className="text-[11.5px] text-ink-2">{data.unpaidCount} facture{data.unpaidCount > 1 ? 's' : ''}{data.late.length > 0 && <span className="text-bad"> · {data.late.length} en retard</span>}</div>
            </button>
            <button onClick={() => navigate('/app/devis')} className="pl-4 text-left">
              <div className="text-[12px] text-ink-2">Devis à signer</div>
              <div className="num text-[19px] font-semibold">{money(data.pendingTotal, true)}</div>
              <div className="text-[11.5px] text-ink-2">{data.pending.length} devis · marge {Math.round(data.marginRate)} %</div>
            </button>
          </div>
        </Card>
        {empty && (
          <Card className="p-4">
            <h3 className="text-[15px] font-semibold">Votre premier devis, en 2 minutes</h3>
            <p className="mt-1 text-[13px] leading-snug text-ink-2">Dites-le à Bob ou tapez-le. Une fois signé, le chantier et la facture d'acompte se créent tout seuls.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="secondary" className="justify-center" onClick={() => ui.askBob('', true)}>Dicter à Bob</Button>
              <Button variant="primary" className="justify-center" onClick={() => navigate('/app/devis/nouveau')}>Nouveau devis</Button>
            </div>
          </Card>
        )}
        <TodayList data={data} />
        {s.enabled.includes('outils_metier') && <TradeTools />}
        <BobNight />
        <ChantiersPanel data={data} />
      </div>

      {/* Tablette et ordinateur : poste de pilotage */}
      <div className="hidden space-y-4 md:block">
        <KpiStrip data={data} />
        {empty ? (
          <Card className="flex flex-col items-center px-6 py-14 text-center">
            <h3 className="text-[18px] font-semibold">Votre cockpit se remplira tout seul</h3>
            <p className="mt-1 max-w-md text-[13.5px] text-ink-2">Commencez par un devis : dites-le à Bob ou tapez-le. Dès qu'il est signé, le chantier, la facture d'acompte et le planning se créent.</p>
            <div className="mt-5 flex gap-2">
              <Button variant="secondary" onClick={() => ui.askBob('', true)}>Dicter à Bob</Button>
              <Button variant="primary" onClick={() => navigate('/app/devis/nouveau')}>Nouveau devis</Button>
            </div>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 xl:grid-cols-[1.22fr_1fr]">
              <BobNight />
              <Pipeline data={data} />
            </div>
            <div className={cn('grid gap-4', !solo && 'xl:grid-cols-[1.25fr_1fr]')}>
              <ChantiersPanel data={data} />
              {!solo && s.employees.length > 1 && <TeamToday data={data} />}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
