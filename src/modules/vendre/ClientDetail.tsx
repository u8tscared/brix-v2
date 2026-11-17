import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, AudioLines, ChevronRight, FileText, HardHat, Link2, Mail, MessageCircle, Pencil, Phone, Plus, Receipt } from 'lucide-react';
import { AnimatedNumber } from '@/components/motion';
import { Avatar, Badge, Button, Card, EmptyState, Progress, toast, UnderlineTabs } from '@/components/ui';
import { dateShort, initials, money, relative, todayISO, totals, uid } from '@/lib/format';
import { CHANTIER_STATUS, DEVIS_STATUS, FACTURE_STATUS } from '@/lib/status';
import { useBrix, useClient } from '@/lib/store';
import type { Client } from '@/lib/types';
import { ClientFormSheet } from './components/ClientFormSheet';
import { InfoCard, MaintenanceCard } from './components/ClientSide';
import { ClientTimeline } from './components/ClientTimeline';
import { ClientFrise } from './components/ClientFrise';
import { clientColor, clientStats, telHref, waHref } from './lib';
import { useVendre } from './store';

type Tab = 'devis' | 'factures' | 'chantiers' | 'documents';

function summary(c: Client, st: ReturnType<typeof clientStats>, reminder?: { on: boolean }) {
  const first = c.kind === 'pro' ? c.contact ?? c.name : c.name.split(' ')[0];
  const parts: string[] = [];
  const since = Math.max(1, Math.round((Date.now() - new Date(c.createdAt).getTime()) / (30 * 86400000)));
  parts.push(`${c.kind === 'pro' ? 'Client pro' : 'Client'} depuis ${since} mois, ${st.caHt ? `${money(st.caHt, true)} HT facturés` : 'pas encore facturé'}.`);
  const live = st.chantiers.find((x) => x.status === 'en_cours');
  if (live) parts.push(`Chantier en cours à ${live.progress} % : ${live.nextStep.charAt(0).toLowerCase() + live.nextStep.slice(1).replace(/\.$/, '')}.`);
  const viewed = st.devis.find((d) => d.status === 'vu');
  if (viewed) parts.push(`Il a ouvert le devis ${viewed.number} ${viewed.views ?? 1} fois : c'est le bon moment pour appeler ${first}.`);
  else if (st.devis.some((d) => d.status === 'envoye')) parts.push(`Un devis attend sa réponse, je relance dans 2 jours si rien ne bouge.`);
  if (st.late.length) parts.push(`Attention, ${money(st.due, true)} en retard : je peux envoyer une relance polie.`);
  else if (st.billed && st.due === 0) parts.push('Paie toujours à l\'heure.');
  if (!reminder?.on && st.chantiers.some((x) => x.status === 'termine')) parts.push('Pense au rappel d\'entretien annuel.');
  return parts.join(' ');
}

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const client = useClient(id);
  const s = useBrix();
  const reminder = useVendre((v) => (id ? v.reminders[id] : undefined));
  const [tab, setTab] = useState<Tab>('devis');
  const [editing, setEditing] = useState(false);

  if (!client) {
    return <EmptyState title="Client introuvable" text="Il a peut-être été supprimé." action={<Button onClick={() => navigate('/app/clients')}>Retour aux clients</Button>} />;
  }
  const st = clientStats(s, client.id);
  const first = client.kind === 'pro' ? client.contact ?? client.name : client.name.split(' ')[0];

  const newDevis = () => {
    const d = { id: uid('q'), number: s.nextNumber('devis'), clientId: client.id, title: 'Nouveau devis', status: 'brouillon' as const, createdAt: todayISO(), validityDays: 30, depositPercent: 30, lines: [] };
    s.upsertDevis(d);
    navigate(`/app/devis/${d.id}`);
  };

  const docs = [
    ...st.devis.filter((d) => d.status === 'signe').map((d) => ({ key: d.id, icon: FileText, label: `Devis signé ${d.number}`, sub: d.title, date: d.signedAt ?? d.createdAt, to: `/app/devis/${d.id}` })),
    ...st.factures.map((f) => ({ key: f.id, icon: Receipt, label: `Facture ${f.number}`, sub: f.title, date: f.issueDate, to: `/app/factures/${f.id}` })),
    ...st.chantiers.filter((x) => x.status === 'termine').map((x) => ({ key: x.id + 'pv', icon: HardHat, label: 'PV de réception signé', sub: x.name, date: x.endDate, to: `/app/chantiers/${x.id}` })),
  ];

  return (
    <div className="space-y-5">
      <Link to="/app/clients" className="inline-flex h-8 items-center gap-1.5 text-[13px] text-ink-2 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Clients
      </Link>

      <div className="animate-[page-in_.5s_var(--ease)_both] overflow-hidden rounded-[20px] bg-white shadow-card">
        <div className="relative flex flex-col gap-5 p-5 md:p-6 lg:flex-row lg:items-center">
          <div aria-hidden className="pointer-events-none absolute -left-16 -top-24 h-56 w-80 rounded-full opacity-70 blur-2xl" style={{ background: clientColor(client.id) }} />
          <div className="relative flex min-w-0 flex-1 items-center gap-4">
            <Avatar initials={initials(client.name)} color={clientColor(client.id)} size={64} className="text-[22px] shadow-raise ring-4 ring-white" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-[24px] font-semibold leading-tight tracking-[-0.035em] md:text-[28px]">{client.name}</h1>
                <Badge tone={client.kind === 'pro' ? 'info' : 'neutral'}>{client.kind === 'pro' ? 'Professionnel' : 'Particulier'}</Badge>
              </div>
              <div className="mt-1 truncate text-[13px] text-ink-2">{[client.contact, client.city, client.phone].filter(Boolean).join(' · ')}</div>
            </div>
          </div>
          <div className="relative grid grid-cols-4 gap-2 lg:flex">
            {[
              { href: telHref(client.phone), icon: Phone, label: 'Appeler' },
              { href: `mailto:${client.email}`, icon: Mail, label: 'Écrire' },
              { href: waHref(client.phone, `Bonjour ${first}, `), icon: MessageCircle, label: 'WhatsApp', ext: true },
            ].map((a) => (
              <a key={a.label} href={a.href} target={a.ext ? '_blank' : undefined} rel="noreferrer" className="press flex h-16 flex-col items-center justify-center gap-1 rounded-[14px] bg-sub text-[11.5px] font-medium transition hover:bg-[#ebe9f2] lg:h-10 lg:flex-row lg:gap-2 lg:rounded-[11px] lg:bg-white lg:px-3.5 lg:text-[13px] lg:shadow-[0_0_0_1px_var(--line2)]">
                <a.icon className="h-[18px] w-[18px] lg:h-4 lg:w-4" strokeWidth={1.75} />
                {a.label}
              </a>
            ))}
            <button onClick={() => setEditing(true)} className="press flex h-16 flex-col items-center justify-center gap-1 rounded-[14px] bg-sub text-[11.5px] font-medium transition hover:bg-[#ebe9f2] lg:h-10 lg:flex-row lg:gap-2 lg:rounded-[11px] lg:bg-white lg:px-3.5 lg:text-[13px] lg:shadow-[0_0_0_1px_var(--line2)]">
              <Pencil className="h-[18px] w-[18px] lg:h-4 lg:w-4" strokeWidth={1.75} />
              Modifier
            </button>
            <Button variant="dawn" size="lg" className="col-span-4 justify-center lg:h-10 lg:text-sm" icon={<Plus className="h-4 w-4" />} onClick={newDevis}>
              Nouveau devis
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 border-t border-line md:grid-cols-4 [&>*]:border-line max-md:[&>*:nth-child(2n)]:border-l max-md:[&>*:nth-child(n+3)]:border-t md:[&>*+*]:border-l">
          {[
            { l: "Valeur client HT", v: st.caHt, sub: `${st.factures.length} facture${st.factures.length > 1 ? 's' : ''}` },
            { l: 'Encaissé TTC', v: st.paid, sub: st.billed ? `${Math.round((st.paid / st.billed) * 100)} % du facturé` : 'rien à encaisser' },
            { l: 'Reste à payer', v: st.due, sub: st.late.length ? `${st.late.length} en retard` : 'rien en retard', bad: st.late.length > 0 },
            { l: 'Devis en attente', v: st.pendingHt, sub: 'HT, brouillons compris' },
          ].map((k) => (
            <div key={k.l} className="min-w-0 px-4 py-4 md:px-6">
              <div className="text-[12px] font-medium text-ink-3">{k.l}</div>
              <div className={`num mt-1.5 text-[20px] font-semibold leading-none tracking-[-0.035em] md:text-[22px] ${k.bad ? 'text-bad' : ''}`}>
                <AnimatedNumber value={k.v} format={(n) => money(n, true)} />
              </div>
              <div className="mt-1.5 truncate text-[12px] text-ink-2">{k.sub}</div>
            </div>
          ))}
        </div>

        <div className="flex items-start gap-3 border-t border-line bg-[#fbfaff] px-5 py-3.5 md:px-6">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-night text-white">
            <AudioLines className="h-4 w-4" />
          </span>
          <p className="min-w-0 flex-1 pt-1 text-[13.5px] leading-relaxed text-ink-2">{summary(client, st, reminder)}</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-4">
          <Card>
            <div className="px-4">
              <UnderlineTabs value={tab} onChange={setTab} options={[{ value: 'devis', label: 'Devis', count: st.devis.length }, { value: 'factures', label: 'Factures', count: st.factures.length }, { value: 'chantiers', label: 'Chantiers', count: st.chantiers.length }, { value: 'documents', label: 'Documents', count: docs.length }]} />
            </div>
            {tab === 'devis' && (st.devis.length ? st.devis.map((d) => (
              <ListRow key={d.id} onClick={() => navigate(`/app/devis/${d.id}`)} title={d.title} sub={`${d.number} · ${relative(d.sentAt ?? d.createdAt)}`} badge={<Badge tone={DEVIS_STATUS[d.status].tone}>{DEVIS_STATUS[d.status].label}</Badge>} amount={money(totals(d.lines).ht, true) + ' HT'} />
            )) : <Empty text="Aucun devis" action={<Button size="sm" onClick={newDevis}>Créer un devis</Button>} />)}
            {tab === 'factures' && (st.factures.length ? st.factures.map((f) => (
              <ListRow key={f.id} onClick={() => navigate(`/app/factures/${f.id}`)} title={f.title} sub={`${f.number} · échéance ${dateShort(f.dueDate)}`} badge={<Badge tone={FACTURE_STATUS[f.status].tone}>{FACTURE_STATUS[f.status].label}</Badge>} amount={money(totals(f.lines).ttc)} />
            )) : <Empty text="Aucune facture" />)}
            {tab === 'chantiers' && (st.chantiers.length ? st.chantiers.map((c) => (
              <ListRow key={c.id} onClick={() => navigate(`/app/chantiers/${c.id}`)} title={c.name} sub={c.nextStep} badge={<Badge tone={CHANTIER_STATUS[c.status].tone}>{CHANTIER_STATUS[c.status].label}</Badge>} amount={<span className="flex w-24 items-center gap-2"><Progress value={c.progress} className="flex-1" /><span className="num text-[12px] text-ink-2">{c.progress} %</span></span>} />
            )) : <Empty text="Aucun chantier" />)}
            {tab === 'documents' && (
              <>
                {docs.map((d) => <ListRow key={d.key} onClick={() => navigate(d.to)} icon={<d.icon className="h-4 w-4 text-ink-2" strokeWidth={1.75} />} title={d.label} sub={d.sub} amount={<span className="text-[12px] text-ink-3">{dateShort(d.date)}</span>} />)}
                {!docs.length && <Empty text="Les devis signés, factures et PV apparaîtront ici." />}
                <div className="flex flex-wrap items-center gap-2 bg-sub/50 p-4">
                  <span className="flex-1 text-[12.5px] text-ink-2">Le client retrouve tous ses documents dans son espace.</span>
                  <Button size="sm" icon={<Link2 className="h-4 w-4" />} onClick={() => { navigator.clipboard?.writeText(`${location.origin}${location.pathname}#/p/demo`).catch(() => {}); toast('Lien de l\'espace client copié'); }}>Copier le lien</Button>
                </div>
              </>
            )}
          </Card>
          <ClientFrise devis={st.devis} factures={st.factures} chantiers={st.chantiers} />
          <ClientTimeline clientId={client.id} devis={st.devis} factures={st.factures} />
        </div>
        <div className="space-y-4">
          <MaintenanceCard client={client} />
          <InfoCard client={client} />
        </div>
      </div>

      <ClientFormSheet open={editing} onClose={() => setEditing(false)} initial={client} />
    </div>
  );
}

function ListRow({ title, sub, badge, amount, onClick, icon }: { title: string; sub?: string; badge?: React.ReactNode; amount?: React.ReactNode; onClick: () => void; icon?: React.ReactNode }) {
  return (
    <div onClick={onClick} className="flex min-h-[60px] cursor-pointer items-center gap-3 border-b border-line px-4 py-2.5 transition last:border-b-0 hover:bg-[#fafafc]">
      {icon && <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-sub">{icon}</span>}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] font-medium">{title}</div>
        <div className="truncate text-[12px] text-ink-3">{sub}</div>
        {badge && <div className="mt-1 sm:hidden">{badge}</div>}
      </div>
      {badge && <div className="hidden sm:block">{badge}</div>}
      <div className="num shrink-0 text-right text-[13px] font-semibold">{amount}</div>
      <ChevronRight className="hidden h-4 w-4 shrink-0 text-ink-3 sm:block" />
    </div>
  );
}

function Empty({ text, action }: { text: string; action?: React.ReactNode }) {
  return <div className="flex flex-col items-center gap-3 px-4 py-10 text-center text-[13px] text-ink-3">{text}{action}</div>;
}
