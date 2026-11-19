import { useState } from 'react';
import { ArrowRight, Check, Download, FileArchive, FileSpreadsheet, FileText, Lock, Mail, Percent, RefreshCw, Trash2, UserPlus } from 'lucide-react';
import { Badge, Button, Card, CardHeader, cn, IconTile, Input, PageHeader, Segmented, Sheet, toast } from '@/components/ui';
import { DrawCheck, LiveDot, SuccessDot } from '@/components/motion';
import { capitalize, money, monthName, totals } from '@/lib/format';
import { useBrix } from '@/lib/store';
import { BigMoney, Label, SectionHead } from './components/kit';
import { CONNECTORS, connectSoftware, exportFec, exportPdfZip, exportSalesCsv, useCompta, vatOfMonth, type Period } from './components/comptaService';

type PKey = 'mois' | 'precedent' | 'trimestre' | 'annee';

const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
function period(k: PKey): Period {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  if (k === 'mois') return { from: iso(new Date(y, m, 1)), to: iso(new Date(y, m + 1, 0)), label: monthName(now) };
  if (k === 'precedent') return { from: iso(new Date(y, m - 1, 1)), to: iso(new Date(y, m, 0)), label: monthName(new Date(y, m - 1, 1)) };
  if (k === 'trimestre') {
    const q = Math.floor(m / 3) * 3;
    return { from: iso(new Date(y, q, 1)), to: iso(new Date(y, q + 3, 0)), label: `${Math.floor(m / 3) + 1}e trimestre ${y}` };
  }
  return { from: `${y}-01-01`, to: `${y}-12-31`, label: `année ${y}` };
}
const hm = (isoTs: string) => new Date(isoTs).toTimeString().slice(0, 5).replace(':', ' h ');

export default function Compta() {
  const s = useBrix();
  const c = useCompta();
  const [pk, setPk] = useState<PKey>('precedent');
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [email, setEmail] = useState('');
  const [pickSoft, setPickSoft] = useState(false);
  const p = period(pk);
  const now = new Date();
  const month = iso(now).slice(0, 7);
  const vat = vatOfMonth(s, month);
  const dueDay = 24;
  const soft = CONNECTORS.find((x) => x.key === c.connected);

  const sent = s.factures.filter((f) => f.status !== 'brouillon');
  const counts = [
    { label: 'Factures et avoirs', n: sent.length, sub: money(sent.reduce((t, f) => t + totals(f.lines).ttc, 0), true) },
    { label: 'Tickets et achats', n: s.expenses.length + s.bank.filter((t) => t.amount < 0).length, sub: 'avec leur justificatif' },
    { label: 'Paiements reçus', n: s.bank.filter((t) => t.amount > 0).length, sub: 'rapprochés aux factures' },
  ];

  const run = async (k: string, fn: () => number | Promise<unknown>, msg: (n: number) => string) => {
    setBusy(k);
    const r = await fn();
    setBusy(null);
    setDone((d) => ({ ...d, [k]: true }));
    setTimeout(() => setDone((d) => ({ ...d, [k]: false })), 2600);
    toast(msg(typeof r === 'number' ? r : 0));
  };
  const connect = async (k: string, name: string) => {
    if (c.connected === k) {
      c.setConnected(null);
      return toast(`${name} déconnecté`, 'info');
    }
    setBusy(k);
    await connectSoftware(k);
    c.setConnected(k);
    setBusy(null);
    setPickSoft(false);
    toast(`${name} relié : tout part maintenant tout seul`);
  };
  const syncNow = async () => {
    if (!c.connected) return setPickSoft(true);
    setBusy('sync');
    await connectSoftware(c.connected);
    c.setConnected(c.connected);
    setBusy(null);
    toast(`Envoyé à ${soft?.name} : tout est à jour`);
  };
  const invite = () => {
    if (!/^\S+@\S+\.\S+$/.test(email)) return toast('Adresse e-mail incomplète', 'warn');
    c.addGuest({ email, name: email.split('@')[1].split('.')[0].replace(/-/g, ' '), since: iso(now), access: 'lecture' });
    setEmail('');
    toast('Invitation envoyée à votre expert-comptable');
  };

  const exports = [
    { k: 'fec', icon: FileText, t: 'Fichier pour les impôts', tag: 'FEC', d: 'Le format officiel, ouvert par tous les logiciels comptables', go: () => run('fec', () => exportFec(s, p), (n) => `Fichier téléchargé · ${n} lignes`) },
    { k: 'csv', icon: FileSpreadsheet, t: 'Tableau des ventes', tag: 'Excel', d: 'Factures et avoirs, une ligne par facture', go: () => run('csv', () => exportSalesCsv(s, p), (n) => `${n} factures exportées`) },
    { k: 'zip', icon: FileArchive, t: 'Toutes les pièces', tag: 'PDF', d: 'Factures, avoirs et tickets dans un seul dossier', go: () => run('zip', () => exportPdfZip(p), () => 'Dossier prêt, le lien part par e-mail') },
  ];

  return (
    <div className="space-y-6">
      <PageHeader icon={<IconTile name="Calculator" dept="gestion" size="lg" />} kicker="Gestion" title="Comptabilité" titleMuted={soft ? 'tout part tout seul.' : 'reliez, et c’est fini.'} subtitle="Votre comptable reçoit tout, sans que vous ayez rien à envoyer." />

      <Card className="halo-bg halo-clip overflow-hidden">
        <div className="flex flex-col gap-5 p-5 md:flex-row md:items-center md:p-7">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <span className={cn('relative grid h-12 w-12 shrink-0 place-items-center rounded-[15px]', soft ? 'bg-pale-g text-deep-g' : 'bg-pale-i text-deep-i')}>
              {soft ? <SuccessDot size={26} /> : <RefreshCw className="h-5 w-5" />}
            </span>
            <div className="min-w-0">
              <div className="text-[22px] font-semibold leading-tight tracking-[-0.035em]">{soft ? `Votre comptable est à jour` : 'Reliez votre logiciel, et c’est fini'}</div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[13px] text-ink-2">
                {soft ? (
                  <>
                    <LiveDot />
                    <span>{soft.name} reçoit tout en direct{c.lastSync ? `, dernier envoi à ${hm(c.lastSync)}` : ''}</span>
                  </>
                ) : (
                  <span>Une seule fois. Ensuite factures, tickets et paiements partent tout seuls, chaque nuit.</span>
                )}
              </div>
            </div>
          </div>
          <Button variant={soft ? 'secondary' : 'primary'} loading={busy === 'sync'} icon={soft ? <RefreshCw /> : undefined} iconRight={soft ? undefined : <ArrowRight />} onClick={syncNow} className="max-md:w-full">
            {soft ? 'Envoyer maintenant' : 'Relier mon logiciel'}
          </Button>
        </div>
        <div className="stagger-fast grid grid-cols-1 border-t border-halo-line sm:grid-cols-3">
          {counts.map((x, i) => (
            <div key={x.label} className={cn('flex items-center gap-3 px-5 py-4 md:px-6', i > 0 && 'border-halo-line max-sm:border-t sm:border-l')}>
              <span className={cn('grid h-6 w-6 shrink-0 place-items-center rounded-full', soft ? 'bg-[#10b981] text-white' : 'bg-pale-n text-ink-3')}>{soft ? <DrawCheck className="h-3.5 w-3.5" strokeWidth={2.8} delay={200 + i * 120} /> : <Check className="h-3.5 w-3.5" strokeWidth={2.6} />}</span>
              <div className="min-w-0">
                <div className="text-[13.5px] font-medium"><span className="num">{x.n}</span> {x.label.toLowerCase()}</div>
                <div className="truncate text-[12px] text-ink-3">{soft ? 'transmis' : 'prêts'} · {x.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <Card className="p-5 md:p-7">
          <IconTile icon={<Percent />} tone="indigo" />
          <Label className="mt-4">TVA de {monthName(now)}</Label>
          <BigMoney value={Math.max(0, vat.due)} cents dawn className="mt-1.5 block text-[40px] md:text-[48px]" />
          <div className="mt-2 text-[12.5px] text-ink-2">à déclarer avant le {dueDay} · Brix AI a tout calculé</div>
          <div className="mt-5 space-y-2.5 text-[13px]">
            <div className="flex justify-between gap-3"><span className="text-ink-2">Encaissée sur vos factures</span><span className="num font-medium">{money(vat.collected)}</span></div>
            <div className="flex justify-between gap-3"><span className="text-ink-2">Récupérable sur vos achats et frais</span><span className="num font-medium text-deep-g">− {money(vat.deductible)}</span></div>
            <div className="flex justify-between gap-3 border-t border-halo-line pt-2.5"><span className="font-medium">À payer</span><span className="num font-semibold">{money(Math.max(0, vat.due))}</span></div>
          </div>
          <p className="mt-4 text-[12.5px] leading-relaxed text-ink-3">Dans le bâtiment, la TVA se paie quand le client vous règle, pas quand vous facturez. Les taux 5,5 %, 10 % et 20 % sont comptés ligne par ligne.</p>
          <Button className="mt-5 w-full" variant="secondary" onClick={() => toast('Déclaration pré-remplie, envoyée à votre comptable pour validation')}>Préparer la déclaration</Button>
        </Card>

        <Card className="min-w-0">
          <CardHeader title="Télécharger pour le comptable" />
          <div className="space-y-3 p-4 md:p-5">
            <Segmented value={pk} onChange={setPk} className="w-full" options={[{ value: 'mois', label: 'Ce mois' }, { value: 'precedent', label: 'Mois dernier' }, { value: 'trimestre', label: 'Trimestre' }, { value: 'annee', label: 'Année' }]} />
            <div className="text-[12.5px] text-ink-3">Période : {p.label}</div>
            <div className="stagger-fast space-y-2">
              {exports.map((x) => (
                <button key={x.k} onClick={x.go} disabled={!!busy} className="row-card group min-h-[64px] w-full gap-3 px-3.5 text-left disabled:opacity-60">
                  <IconTile icon={<x.icon />} tone={x.k === 'fec' ? 'indigo' : x.k === 'csv' ? 'green' : 'peach'} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-[13.5px] font-medium">{x.t}<Badge>{x.tag}</Badge></span>
                    <span className="block truncate text-[12px] text-ink-3">{x.d}</span>
                  </span>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-3 transition group-hover:bg-halo-hover group-hover:text-ink">
                    {busy === x.k ? <RefreshCw className="h-4 w-4 animate-spin" /> : done[x.k] ? <SuccessDot size={20} /> : <Download className="h-4 w-4 transition-transform duration-300 group-hover:translate-y-0.5" />}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <section className="space-y-3">
        <SectionHead title="Votre logiciel comptable" meta={soft ? `${soft.name} relié` : 'à relier une seule fois'} />
        <div className="stagger-fast grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {CONNECTORS.map((x) => (
            <SoftTile key={x.key} x={x} on={c.connected === x.key} busy={busy === x.key} disabled={(!!c.connected && c.connected !== x.key) || (!!busy && busy !== x.key)} onClick={() => connect(x.key, x.name)} />
          ))}
        </div>
      </section>

      <Card>
        <CardHeader title="Accès de votre expert-comptable" meta="il consulte tout, sans vous déranger" />
        <div className="p-4 md:p-5">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input className="sm:flex-1" icon={<Mail />} type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && invite()} placeholder="adresse@cabinet-comptable.fr" />
            <Button variant="secondary" className="h-11" icon={<UserPlus />} onClick={invite}>Inviter</Button>
          </div>
          <div className="mt-3 space-y-2">
            {c.guests.map((g) => (
              <div key={g.email} className="row-card min-h-[60px] animate-[fade-up_.4s_var(--ease)_both] gap-3 px-3.5 py-2">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-pale-i text-[12px] font-semibold text-deep-i">{g.name.slice(0, 1).toUpperCase()}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-medium">{capitalize(g.name)}</div>
                  <div className="truncate text-[12px] text-ink-3">{g.email}</div>
                </div>
                <Badge tone="info" icon={<Lock />} className="max-sm:hidden">Lecture seule</Badge>
                <button onClick={() => { c.removeGuest(g.email); toast('Accès retiré', 'info'); }} className="grid h-10 w-10 place-items-center rounded-full text-ink-3 transition hover:bg-pale-r hover:text-deep-r" aria-label="Retirer l'accès"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            {!c.guests.length && <div className="rounded-card-sm bg-pale-n/70 px-4 py-6 text-center text-[13px] text-ink-3">Aucun accès pour l’instant.</div>}
          </div>
          <p className="mt-3 text-[12px] text-ink-3">Gratuit et sans limite pour votre cabinet. Il voit et télécharge, il ne peut ni modifier ni supprimer.</p>
        </div>
      </Card>

      <Sheet open={pickSoft} onClose={() => setPickSoft(false)} title="Quel logiciel utilise votre comptable ?" subtitle="Demandez-lui si vous ne savez pas. Vous pourrez changer plus tard.">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {CONNECTORS.map((x) => (
            <SoftTile key={x.key} x={x} on={c.connected === x.key} busy={busy === x.key} disabled={!!busy && busy !== x.key} onClick={() => connect(x.key, x.name)} />
          ))}
        </div>
      </Sheet>
    </div>
  );
}

function SoftTile({ x, on, busy, disabled, onClick }: { x: (typeof CONNECTORS)[number]; on: boolean; busy: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={disabled} className={cn('lift group flex min-h-[64px] items-center gap-3 rounded-card-sm bg-white p-3 text-left shadow-halo transition disabled:pointer-events-none disabled:opacity-45', on && 'shadow-[0_0_0_1.5px_#b7ebd3,0_10px_28px_-12px_rgba(16,185,129,.35)]')}>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-tile text-[15px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,.25)]" style={{ background: x.color }}>{x.name[0]}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-semibold">{x.name}</span>
        <span className="block truncate text-[12px] text-ink-3">{on ? 'Relié · touchez pour couper' : busy ? 'Connexion sécurisée…' : x.sub}</span>
      </span>
      {busy ? <RefreshCw className="h-4 w-4 animate-spin text-ink-3" /> : on ? <SuccessDot size={20} /> : <ArrowRight className="h-4 w-4 text-ink-3 transition group-hover:translate-x-0.5 group-hover:text-ink" />}
    </button>
  );
}
