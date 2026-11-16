import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Check, Eye, Play, Send, TrendingDown, TrendingUp } from 'lucide-react';
import { Avatar, Badge, Button, Card, CardHeader, Icon, Progress, Sparkline, cn, toast } from '@/components/ui';
import { money, relative } from '@/lib/format';
import { useBrix } from '@/lib/store';
import { useUI } from '@/lib/ui';
import type { useCockpitData } from './useCockpitData';

type Data = ReturnType<typeof useCockpitData>;

export function KpiStrip({ data }: { data: Data }) {
  const navigate = useNavigate();
  const progress = (data.paidThisMonth / data.goal) * 100;
  const cells = [
    { label: 'À encaisser', value: money(data.toCollect, true), sub: <>{data.unpaidCount} factures{data.late.length > 0 && <> · <span className="inline-flex items-center gap-1 text-bad"><i className="h-1.5 w-1.5 rounded-full bg-bad" />{data.late.length} en retard</span></>}</>, to: '/app/factures' },
    { label: 'Devis à signer', value: money(data.pendingTotal, true), sub: <>{data.pending.length} devis · {data.pending.filter((p) => p.d.status === 'vu').length} vus</>, to: '/app/devis' },
    { label: 'Marge moyenne', value: `${Math.round(data.marginRate)} %`, sub: <Progress value={data.marginRate * 2} className="mt-1 w-full" tone={data.marginRate >= 30 ? 'ok' : 'warn'} />, to: '/app/chantiers' },
    { label: 'Trésorerie à 30 jours', value: money(data.cash30, true), sub: <>après salaires et charges</>, to: '/app/tresorerie' },
  ];
  return (
    <Card className="grid overflow-hidden md:grid-cols-2 xl:grid-cols-[1.7fr_1fr_1fr_1fr_1.1fr]">
      <button onClick={() => navigate('/app/tresorerie')} className="relative border-b border-line p-4 text-left md:col-span-2 xl:col-span-1 xl:border-b-0 xl:border-r">
        <div className="text-xs font-medium text-ink-2">Encaissé ce mois-ci</div>
        <div className="num mt-1 font-display text-[34px] font-semibold leading-[1.15] tracking-[-0.025em] dawn-text">{money(data.paidThisMonth, true)}</div>
        <div className="mt-1 flex items-center gap-1.5 text-xs text-ink-2">
          <span className="inline-flex items-center gap-1 font-semibold text-ok"><TrendingUp className="h-3.5 w-3.5" />+18 %</span> vs le mois dernier à date
        </div>
        <Sparkline data={data.curve} className="absolute right-4 top-6 hidden h-11 w-28 sm:block" />
        <div className="mt-3 flex items-center gap-2 text-[11.5px] text-ink-3"><Progress value={progress} className="flex-1" />{Math.round(progress)} % de l'objectif</div>
      </button>
      {cells.map((c, i) => (
        <button key={c.label} onClick={() => navigate(c.to)} className={cn('min-w-0 p-4 text-left transition hover:bg-[#fafafc]', 'border-line', i % 2 === 0 ? 'md:border-r' : '', i < 2 ? 'border-b xl:border-b-0' : '', 'xl:border-r xl:last:border-r-0')}>
          <div className="text-xs font-medium text-ink-2">{c.label}</div>
          <div className="num mt-1.5 text-[22px] font-semibold tracking-[-0.02em]">{c.value}</div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-ink-2">{c.sub}</div>
        </button>
      ))}
    </Card>
  );
}

export function BobNight() {
  const bob = useBrix((s) => s.bob);
  const updateBob = useBrix((s) => s.updateBob);
  const navigate = useNavigate();
  const ui = useUI();
  return (
    <Card className="flex flex-col overflow-hidden">
      <CardHeader
        icon={<span className="grid h-6 w-6 place-items-center rounded-full bg-ink text-white"><Icon name="AudioLines" className="h-3.5 w-3.5" /></span>}
        title={<>Cette nuit, Bob a travaillé<span className="hidden sm:inline"> pour toi</span></>}
        meta={<span className="hidden sm:inline">résumé de 6 h</span>}
        action={
          <button onClick={() => navigate('/app/bob/brief')} className="flex h-7 items-center gap-1.5 rounded-full border border-line2 px-2.5 text-xs font-medium hover:bg-sub">
            <Play className="h-3 w-3 fill-current" /> <span className="whitespace-nowrap">1 min</span>
          </button>
        }
      />
      {bob.length === 0 && <div className="p-6 text-center text-[13px] text-ink-2">Bob n'a encore rien fait. Demande-lui une relance ou un devis.</div>}
      {bob.slice(0, 4).map((b) => (
        <div key={b.id} className="flex min-h-[54px] items-center gap-3 border-b border-line px-4 py-2 last:border-0">
          <span className="relative grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-sub text-ink-2">
            <Icon name={b.icon} className="h-4 w-4" />
            {b.done && <span className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full border-2 border-white bg-ok text-white"><Check className="h-2 w-2" strokeWidth={4} /></span>}
          </span>
          <p className="min-w-0 flex-1 text-[13px] leading-snug">
            {b.text} <span className="text-ink-2">· {b.detail}</span>
          </p>
          {b.cta && (
            <Button
              size="sm"
              variant={b.done ? 'ghost' : 'secondary'}
              onClick={() => {
                if (!b.done) {
                  updateBob(b.id, { done: true });
                  toast(`${b.cta} : c'est fait`);
                }
                if (b.to) navigate(b.to);
              }}
            >
              {b.cta}
            </Button>
          )}
        </div>
      ))}
      <button onClick={() => ui.askBob()} className="mt-auto flex h-11 items-center gap-2 border-t border-line px-4 text-left text-[13px] text-ink-3 hover:bg-[#fafafc]">
        Demande ou dicte à Bob…
      </button>
    </Card>
  );
}

export function Pipeline({ data }: { data: Data }) {
  const navigate = useNavigate();
  const clients = useBrix((s) => s.clients);
  const total = data.draftsTotal + data.pendingTotal + data.signedTotal || 1;
  const rows = [...data.pending].sort((a, b) => (b.d.views ?? 0) - (a.d.views ?? 0)).slice(0, 4);
  return (
    <Card className="flex flex-col overflow-hidden">
      <CardHeader title="Devis en cours" meta="ce mois-ci" action={<button onClick={() => navigate('/app/devis')} className="flex items-center gap-1 text-xs text-ink-2 hover:text-ink">Tout voir <ArrowUpRight className="h-3.5 w-3.5" /></button>} />
      <div className="px-4 pb-3 pt-4">
        <div className="flex items-baseline justify-between">
          <span className="num text-[22px] font-semibold tracking-[-0.02em]">{money(total, true)}</span>
          <span className="text-xs text-ink-2">taux de signature {Math.round(data.signRate)} %</span>
        </div>
        <div className="mt-3 flex h-2 gap-0.5 overflow-hidden rounded-full">
          <i className="bg-line2" style={{ width: `${(data.draftsTotal / total) * 100}%` }} />
          <i className="bg-vi-300" style={{ width: `${(data.pendingTotal / total) * 100}%` }} />
          <i className="bg-vi-700" style={{ width: `${(data.signedTotal / total) * 100}%` }} />
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-ink-2">
          <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-line2" />Brouillons {data.drafts.length}</span>
          <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-vi-300" />À signer {data.pending.length}</span>
          <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-vi-700" />Signés {data.signed.length}</span>
        </div>
      </div>
      <div className="border-t border-line">
        {rows.map(({ d, t }) => (
          <button key={d.id} onClick={() => navigate(`/app/devis/${d.id}`)} className="flex min-h-[48px] w-full items-center gap-3 border-b border-line px-4 text-left last:border-0 hover:bg-[#fafafc]">
            <span className="min-w-0 flex-1 truncate text-[13px]">
              {clients.find((c) => c.id === d.clientId)?.name} <span className="text-ink-3">· {d.number}</span>
            </span>
            {d.status === 'vu' ? <Badge tone="violet" icon={<Eye />}>Vu {d.views}×</Badge> : <Badge tone="info" icon={<Send />}>Envoyé {relative(d.sentAt ?? d.createdAt)}</Badge>}
            <span className="num w-20 text-right text-[13px] font-semibold">{money(t.ttc, true)}</span>
          </button>
        ))}
        {rows.length === 0 && <div className="px-4 py-6 text-center text-[13px] text-ink-3">Aucun devis en attente.</div>}
      </div>
    </Card>
  );
}

export function ChantiersPanel({ data }: { data: Data }) {
  const navigate = useNavigate();
  const employees = useBrix((s) => s.employees);
  return (
    <Card className="overflow-hidden">
      <CardHeader title="Chantiers en cours" meta={`${data.activeChantiers.length} actifs`} action={<button onClick={() => navigate('/app/chantiers')} className="flex items-center gap-1 text-xs text-ink-2 hover:text-ink">Tous <ArrowUpRight className="h-3.5 w-3.5" /></button>} />
      <div className="hidden grid-cols-[1.6fr_.7fr_1fr_.6fr_1.3fr] gap-3 border-b border-line px-4 py-2 text-[11.5px] font-medium text-ink-3 lg:grid">
        <span>Chantier</span><span>Équipe</span><span>Avancement</span><span>Marge</span><span>Prochaine étape</span>
      </div>
      {data.activeChantiers.slice(0, 5).map((c) => {
        const margin = c.budgetHt ? ((c.budgetHt - c.costHt / Math.max(0.1, c.progress / 100)) / c.budgetHt) * 100 : 0;
        const m = Math.max(-20, Math.min(60, Math.round(margin)));
        return (
          <button key={c.id} onClick={() => navigate(`/app/chantiers/${c.id}`)} className="grid w-full grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 border-b border-line px-4 py-3 text-left last:border-0 hover:bg-[#fafafc] lg:grid-cols-[1.6fr_.7fr_1fr_.6fr_1.3fr]">
            <span className="min-w-0">
              <b className="block truncate text-[13px] font-semibold">{c.name}</b>
              <span className="block truncate text-xs text-ink-3">{c.city} · {c.address}</span>
            </span>
            <span className="flex -space-x-1.5">
              {c.team.map((id) => {
                const e = employees.find((x) => x.id === id);
                return e ? <Avatar key={id} initials={e.initials} color={e.color} size={24} ring /> : null;
              })}
            </span>
            <span className="col-span-2 flex items-center gap-2 lg:col-span-1">
              <Progress value={c.progress} className="flex-1" />
              <span className="num w-9 text-right text-xs text-ink-2">{c.progress} %</span>
            </span>
            <span className={cn('hidden items-center gap-1 text-[13px] font-semibold lg:flex', m >= 30 ? 'text-ok' : m >= 20 ? 'text-warn' : 'text-bad')}>
              {m} % {m >= 30 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            </span>
            <span className="col-span-2 truncate text-xs text-ink-2 lg:col-span-1 lg:text-[12.5px]">{c.nextStep}</span>
          </button>
        );
      })}
      {data.activeChantiers.length === 0 && <div className="px-4 py-8 text-center text-[13px] text-ink-3">Pas encore de chantier. Il se crée tout seul quand un devis est signé.</div>}
    </Card>
  );
}

const HOURS = [7, 9, 11, 13, 15, 17];
const toMin = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));

export function TeamToday({ data }: { data: Data }) {
  const employees = useBrix((s) => s.employees);
  const navigate = useNavigate();
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const pos = (m: number) => `${Math.max(0, Math.min(100, ((m - 7 * 60) / (11 * 60)) * 100))}%`;
  return (
    <Card className="overflow-hidden">
      <CardHeader title="Équipe aujourd'hui" meta={`${employees.length} personnes`} action={<button onClick={() => navigate('/app/planning')} className="flex items-center gap-1 text-xs text-ink-2 hover:text-ink">Planning <ArrowUpRight className="h-3.5 w-3.5" /></button>} />
      <div className="relative ml-[118px] mr-4 h-7 text-[11px] text-ink-3">
        {HOURS.map((h) => <span key={h} className="absolute top-2 -translate-x-1/2" style={{ left: pos(h * 60) }}>{h} h</span>)}
        {nowMin > 7 * 60 && nowMin < 18 * 60 && <span className="absolute top-1.5 z-10 -translate-x-1/2 rounded-full bg-bad px-1.5 py-px text-[10.5px] font-semibold text-white" style={{ left: pos(nowMin) }}>{now.toTimeString().slice(0, 5)}</span>}
      </div>
      {employees.map((e) => {
        const evs = data.todayEvents.filter((x) => x.employeeId === e.id);
        return (
          <div key={e.id} className="flex h-[52px] items-center border-t border-line">
            <div className="flex w-[118px] shrink-0 items-center gap-2 pl-4">
              <Avatar initials={e.initials} color={e.color} size={26} />
              <span className="min-w-0">
                <b className="block truncate text-[12.5px] font-semibold">{e.firstName}</b>
                <span className="block text-[11px] text-ink-3">{e.clockedInAt ? `pointé ${e.clockedInAt}` : 'pas pointé'}</span>
              </span>
            </div>
            <div className="relative mr-4 h-full flex-1">
              {nowMin > 7 * 60 && nowMin < 18 * 60 && <i className="absolute inset-y-0 w-px bg-bad/70" style={{ left: pos(nowMin) }} />}
              {evs.map((ev) => (
                <span
                  key={ev.id}
                  className={cn('absolute top-1/2 flex h-7 -translate-y-1/2 items-center truncate rounded-md border-l-2 px-2 text-[11.5px] font-medium', ev.kind === 'formation' ? 'border-peach bg-[#fff4ea] text-[#b45309]' : ev.kind === 'rdv' ? 'border-ink-3 bg-sub text-ink-2' : 'border-vi-500 bg-vi-50 text-vi-700')}
                  style={{ left: pos(toMin(ev.start)), width: `calc(${pos(toMin(ev.end))} - ${pos(toMin(ev.start))} - 4px)` }}
                  title={ev.title}
                >
                  {ev.title}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </Card>
  );
}

export function TodayList({ data }: { data: Data }) {
  const navigate = useNavigate();
  const clients = useBrix((s) => s.clients);
  const ui = useUI();
  const items: { key: string; title: string; sub: string; bob?: string; action: React.ReactNode; onClick: () => void }[] = [];
  const ch = data.activeChantiers.find((c) => c.status === 'en_cours');
  if (ch) items.push({ key: 'ch', title: `${ch.name.split('·')[0].trim()} · 8 h`, sub: `${ch.address} · ${ch.city}`, onClick: () => navigate(`/app/chantiers/${ch.id}`), action: <span className="num grid h-11 w-11 place-items-center rounded-full border-[3px] border-vi-100 text-[11px] font-semibold" style={{ borderTopColor: '#6d28d9' }}>{ch.progress} %</span> });
  const seen = data.pending.find((p) => p.d.status === 'vu');
  if (seen) {
    const c = clients.find((x) => x.id === seen.d.clientId);
    items.push({ key: 'vu', title: `${c?.name} relit ton devis`, sub: `${money(seen.t.ttc, true)} · ${seen.d.views}e lecture`, bob: 'Il hésite sur une option. Appelle-le en fin de journée ?', onClick: () => navigate(`/app/devis/${seen.d.id}`), action: <a href={`tel:${c?.phone}`} onClick={(e) => e.stopPropagation()} className="grid h-11 w-11 place-items-center rounded-full bg-vi-50 text-vi-700"><Icon name="PhoneCall" className="h-[18px] w-[18px]" /></a> });
  }
  const late = data.late[0];
  if (late) {
    const c = clients.find((x) => x.id === late.f.clientId);
    items.push({ key: 'late', title: `Retard de paiement`, sub: `${c?.name} · ${money(late.t.ttc - late.f.paidAmount, true)}`, onClick: () => navigate(`/app/factures/${late.f.id}`), action: <button onClick={(e) => { e.stopPropagation(); ui.askBob('Relance les factures en retard'); }} className="flex h-10 items-center gap-1.5 rounded-full bg-vi-50 px-3.5 text-[13px] font-semibold text-vi-700"><Send className="h-4 w-4" />Relancer</button> });
  }
  if (!items.length) return null;
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between px-1">
        <h3 className="text-[15px] font-semibold">Aujourd'hui</h3>
        <span className="text-xs text-ink-3">{items.length} choses comptent</span>
      </div>
      <Card className="overflow-hidden">
        {items.map((it) => (
          <div key={it.key} onClick={it.onClick} className="flex cursor-pointer gap-3 border-b border-line px-4 py-3.5 last:border-0">
            <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full border-[1.5px] border-line2" />
            <div className="min-w-0 flex-1">
              <b className="block text-[14.5px] font-semibold leading-snug">{it.title}</b>
              <span className="block text-[12.5px] text-ink-2">{it.sub}</span>
              {it.bob && <div className="mt-2 rounded-xl bg-sub px-3 py-2 text-[12.5px] text-ink-2"><b className="mr-1 text-vi-700">Bob</b>{it.bob}</div>}
            </div>
            <div className="self-center">{it.action}</div>
          </div>
        ))}
      </Card>
    </div>
  );
}

