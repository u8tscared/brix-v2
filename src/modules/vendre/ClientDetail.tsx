import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronRight, FileText, HardHat, Hourglass, Link2, Mail, MessageCircle, Pencil, Phone, Plus, Receipt, TrendingUp, Wallet } from 'lucide-react';
import { AnimatedNumber } from '@/components/motion';
import { Avatar, Badge, Button, Card, EmptyState, IconTile, Progress, Stat, toast, UnderlineTabs, type HaloTone } from '@/components/ui';
import { dateShort, initials, money, relative, todayISO, totals, uid } from '@/lib/format';
import { CHANTIER_STATUS, DEVIS_STATUS, FACTURE_STATUS } from '@/lib/status';
import { useBrix, useClient } from '@/lib/store';
import type { Client } from '@/lib/types';
import { ClientFormSheet } from './components/ClientFormSheet';
import { InfoCard, MaintenanceCard } from './components/ClientSide';
import { ClientTimeline } from './components/ClientTimeline';
import { ClientFrise } from './components/ClientFrise';
import { BobNote } from './components/BobNote';
import { clientColor, clientInk, clientStats, telHref, waHref } from './lib';
import { useVendre } from './store';

const QUICK = 'press flex h-[68px] flex-col items-center justify-center gap-1.5 rounded-card-sm bg-white text-[11.5px] font-medium shadow-halo-sm transition-[box-shadow,transform] duration-300 ease-spring hover:-translate-y-px hover:shadow-halo lg:h-[42px] lg:flex-row lg:gap-2 lg:rounded-full lg:pl-1.5 lg:pr-4 lg:text-[13px]';

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
      <Link to="/app/clients" className="glass inline-flex h-9 items-center gap-1.5 rounded-full pl-3 pr-4 text-[13px] font-medium text-ink-2 transition-colors hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Clients
      </Link>

      <Card className="relative isolate animate-[page-in_.5s_var(--ease)_both] overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute -left-16 -top-28 -z-10 h-64 w-96 rounded-full opacity-90 blur-3xl" style={{ background: clientColor(client.id) }} />
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 -z-10 h-56 w-72 rounded-full bg-[radial-gradient(closest-side,#fde7f6,transparent)] opacity-80 blur-2xl" />
        <div className="flex flex-col gap-5 p-5 md:p-7 lg:flex-row lg:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <Avatar initials={initials(client.name)} color={clientColor(client.id)} fg={clientInk(client.id)} size={68} className="text-[22px] shadow-halo ring-4 ring-white" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-[26px] font-semibold leading-[1.06] tracking-[-0.042em] md:text-[34px]">{client.name}</h1>
                <Badge size="md" tone={client.kind === 'pro' ? 'blue' : 'violet'}>{client.kind === 'pro' ? 'Professionnel' : 'Particulier'}</Badge>
              </div>
              <div className="mt-1.5 truncate text-[13.5px] text-ink-2">{[client.contact, client.city, client.phone].filter(Boolean).join(' · ')}</div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 lg:flex lg:items-center">
            {[
              { href: telHref(client.phone), icon: Phone, label: 'Appeler', tone: 'violet' as const },
              { href: `mailto:${client.email}`, icon: Mail, label: 'Écrire', tone: 'blue' as const },
              { href: waHref(client.phone, `Bonjour ${first}, `), icon: MessageCircle, label: 'WhatsApp', tone: 'green' as const, ext: true },
            ].map((a) => (
              <a key={a.label} href={a.href} target={a.ext ? '_blank' : undefined} rel="noreferrer" className={QUICK}>
                <IconTile icon={<a.icon />} tone={a.tone} size="sm" className="rounded-full lg:h-7 lg:w-7" />
                {a.label}
              </a>
            ))}
            <button onClick={() => setEditing(true)} className={QUICK}>
              <IconTile icon={<Pencil />} tone="neutral" size="sm" className="rounded-full lg:h-7 lg:w-7" />
              Modifier
            </button>
            <Button variant="dawn" size="lg" className="col-span-4 justify-center lg:h-[42px] lg:text-sm" icon={<Plus className="h-4 w-4" />} onClick={newDevis}>
              Nouveau devis
            </Button>
          </div>
        </div>
      </Card>

      <div className="stagger grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {[
          { l: 'Valeur client HT', v: st.caHt, sub: `${st.factures.length} facture${st.factures.length > 1 ? 's' : ''}`, icon: TrendingUp, tone: 'violet' as const },
          { l: 'Encaissé TTC', v: st.paid, sub: st.billed ? `${Math.round((st.paid / st.billed) * 100)} % du facturé` : 'rien à encaisser', icon: Wallet, tone: 'green' as const },
          { l: 'Reste à payer', v: st.due, sub: st.late.length ? `${st.late.length} en retard` : 'rien en retard', bad: st.late.length > 0, icon: Hourglass, tone: (st.late.length > 0 ? 'rose' : 'peach') as HaloTone },
          { l: 'Devis en attente', v: st.pendingHt, sub: 'HT, brouillons compris', icon: FileText, tone: 'blue' as const },
        ].map((k) => (
          <Card key={k.l} className="min-w-0">
            <Stat
              icon={<IconTile icon={<k.icon />} tone={k.tone} size="row" />}
              label={k.l}
              value={<span className={k.bad ? 'text-deep-r' : undefined}><AnimatedNumber value={k.v} format={(n) => money(n, true)} /></span>}
              sub={<span className="truncate">{k.sub}</span>}
              className="[&_.num-halo]:text-[22px] md:[&_.num-halo]:text-[26px]"
            />
          </Card>
        ))}
      </div>

      <BobNote>{summary(client, st, reminder)}</BobNote>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-4">
          <Card className="overflow-hidden">
            <div className="border-b border-halo-line px-3 py-2">
              <UnderlineTabs value={tab} onChange={setTab} options={[{ value: 'devis', label: 'Devis', count: st.devis.length }, { value: 'factures', label: 'Factures', count: st.factures.length }, { value: 'chantiers', label: 'Chantiers', count: st.chantiers.length }, { value: 'documents', label: 'Documents', count: docs.length }]} />
            </div>
            {tab === 'devis' && (st.devis.length ? st.devis.map((d) => (
              <ListRow key={d.id} onClick={() => navigate(`/app/devis/${d.id}`)} icon={<IconTile icon={<FileText />} tone="violet" size="sm" />} title={d.title} sub={`${d.number} · ${relative(d.sentAt ?? d.createdAt)}`} badge={<Badge tone={DEVIS_STATUS[d.status].tone}>{DEVIS_STATUS[d.status].label}</Badge>} amount={money(totals(d.lines).ht, true) + ' HT'} />
            )) : <Empty text="Aucun devis" action={<Button size="sm" onClick={newDevis}>Créer un devis</Button>} />)}
            {tab === 'factures' && (st.factures.length ? st.factures.map((f) => (
              <ListRow key={f.id} onClick={() => navigate(`/app/factures/${f.id}`)} icon={<IconTile icon={<Receipt />} tone="mag" size="sm" />} title={f.title} sub={`${f.number} · échéance ${dateShort(f.dueDate)}`} badge={<Badge tone={FACTURE_STATUS[f.status].tone}>{FACTURE_STATUS[f.status].label}</Badge>} amount={money(totals(f.lines).ttc)} />
            )) : <Empty text="Aucune facture" />)}
            {tab === 'chantiers' && (st.chantiers.length ? st.chantiers.map((c) => (
              <ListRow key={c.id} onClick={() => navigate(`/app/chantiers/${c.id}`)} icon={<IconTile icon={<HardHat />} tone="peach" size="sm" />} title={c.name} sub={c.nextStep} badge={<Badge tone={CHANTIER_STATUS[c.status].tone}>{CHANTIER_STATUS[c.status].label}</Badge>} amount={<span className="flex w-24 items-center gap-2"><Progress value={c.progress} className="flex-1" /><span className="num text-[12px] text-ink-2">{c.progress} %</span></span>} />
            )) : <Empty text="Aucun chantier" />)}
            {tab === 'documents' && (
              <>
                {docs.map((d) => <ListRow key={d.key} onClick={() => navigate(d.to)} icon={<IconTile icon={<d.icon />} tone={d.icon === Receipt ? 'mag' : d.icon === HardHat ? 'peach' : 'violet'} size="sm" />} title={d.label} sub={d.sub} amount={<span className="text-[12px] text-ink-3">{dateShort(d.date)}</span>} />)}
                {!docs.length && <Empty text="Les devis signés, factures et PV apparaîtront ici." />}
                <div className="flex flex-wrap items-center gap-2 bg-dawn-pale p-4">
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
    <div role="link" tabIndex={0} onClick={onClick} onKeyDown={(e) => e.key === 'Enter' && onClick()} className="flex min-h-[64px] cursor-pointer items-center gap-3 border-b border-halo-line px-4 py-2.5 transition-colors last:border-b-0 hover:bg-halo-hover md:px-5">
      {icon}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] font-medium">{title}</div>
        <div className="truncate text-[12px] text-ink-3">{sub}</div>
        {badge && <div className="mt-1 sm:hidden">{badge}</div>}
      </div>
      {badge && <div className="hidden sm:block">{badge}</div>}
      <div className="num shrink-0 text-right text-[13.5px] font-semibold">{amount}</div>
      <ChevronRight className="hidden h-4 w-4 shrink-0 text-ink-3 sm:block" />
    </div>
  );
}

function Empty({ text, action }: { text: string; action?: React.ReactNode }) {
  return <div className="flex flex-col items-center gap-3 px-4 py-10 text-center text-[13px] text-ink-3">{text}{action}</div>;
}
