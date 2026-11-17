import { useState } from 'react';
import { Check, FileArchive, FileSpreadsheet, FileText, Mail, Trash2, UserPlus } from 'lucide-react';
import { Badge, Button, Card, CardHeader, cn, Input, PageHeader, Segmented, toast } from '@/components/ui';
import { capitalize, money, monthName } from '@/lib/format';
import { useBrix } from '@/lib/store';
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

export default function Compta() {
  const s = useBrix();
  const c = useCompta();
  const [pk, setPk] = useState<PKey>('precedent');
  const [busy, setBusy] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const p = period(pk);
  const now = new Date();
  const month = iso(now).slice(0, 7);
  const vat = vatOfMonth(s, month);
  const dueDay = 24;

  const run = async (k: string, fn: () => number | Promise<unknown>, msg: (n: number) => string) => {
    setBusy(k);
    const r = await fn();
    setBusy(null);
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
    toast(`${name} relié : factures, achats et paiements partent tout seuls (démo)`);
  };
  const invite = () => {
    if (!/^\S+@\S+\.\S+$/.test(email)) return toast('Adresse e-mail incomplète', 'warn');
    c.addGuest({ email, name: email.split('@')[1].split('.')[0].replace(/-/g, ' '), since: iso(now), access: 'lecture' });
    setEmail('');
    toast('Invitation envoyée à votre expert-comptable (démo)');
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Comptabilité" subtitle="Votre comptable reçoit tout, sans que vous ayez rien à envoyer." />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="p-5">
          <div className="text-[12.5px] font-medium text-ink-2">TVA de {monthName(now)}, à déclarer avant le {dueDay}</div>
          <div className="num mt-1.5 font-display text-[34px] font-semibold leading-tight tracking-[-0.02em] dawn-text">{money(Math.max(0, vat.due))}</div>
          <div className="mt-4 space-y-2 text-[13px]">
            <div className="flex justify-between"><span className="text-ink-2">TVA encaissée sur vos factures</span><span className="num font-medium">{money(vat.collected)}</span></div>
            <div className="flex justify-between"><span className="text-ink-2">TVA récupérable (achats, frais)</span><span className="num font-medium">− {money(vat.deductible)}</span></div>
            <div className="flex justify-between border-t border-line pt-2"><span className="font-medium">À payer</span><span className="num font-semibold">{money(Math.max(0, vat.due))}</span></div>
          </div>
          <p className="mt-4 rounded-xl bg-sub p-3 text-[12.5px] leading-relaxed text-ink-2">
            En bâtiment, la TVA se paie quand le client vous règle, pas quand vous facturez. Bob a déjà tout calculé ligne par ligne, taux de 5,5 %, 10 % et 20 % compris.
          </p>
          <Button className="mt-4 w-full justify-center" variant="primary" onClick={() => toast('Déclaration CA3 pré-remplie et envoyée à votre comptable (démo)')}>Préparer la déclaration</Button>
        </Card>

        <Card>
          <CardHeader title="Exporter pour le comptable" />
          <div className="space-y-3 p-4">
            <Segmented value={pk} onChange={setPk} className="w-full" options={[{ value: 'mois', label: 'Ce mois' }, { value: 'precedent', label: 'Mois dernier' }, { value: 'trimestre', label: 'Trimestre' }, { value: 'annee', label: 'Année' }]} />
            <div className="text-[12.5px] text-ink-3">Période : {p.label}</div>
            {[
              { k: 'fec', icon: FileText, t: 'Fichier FEC', d: 'Le format officiel des impôts, lu par tous les logiciels comptables', go: () => run('fec', () => exportFec(s, p), (n) => `FEC téléchargé · ${n} lignes d'écritures`) },
              { k: 'csv', icon: FileSpreadsheet, t: 'Tableau des ventes (CSV)', d: 'Factures et avoirs, à ouvrir dans Excel', go: () => run('csv', () => exportSalesCsv(s, p), (n) => `${n} factures exportées`) },
              { k: 'zip', icon: FileArchive, t: 'Toutes les pièces en PDF', d: 'Factures, avoirs, tickets, dans un seul dossier compressé', go: () => run('zip', () => exportPdfZip(p), () => 'Dossier PDF prêt, lien envoyé par e-mail (démo)') },
            ].map((x) => (
              <button key={x.k} onClick={x.go} disabled={!!busy} className="flex min-h-[60px] w-full items-center gap-3 rounded-xl border border-line px-3.5 text-left transition hover:border-line2 hover:bg-sub disabled:opacity-60">
                <x.icon className="h-5 w-5 shrink-0 text-ink-2" strokeWidth={1.75} />
                <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-medium">{x.t}</span><span className="block text-[12px] text-ink-3">{x.d}</span></span>
                <span className="text-[12.5px] font-medium text-vi-700">{busy === x.k ? 'Préparation…' : 'Télécharger'}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Relier votre logiciel comptable" meta={c.connected ? `synchronisé ${c.lastSync ? 'à ' + new Date(c.lastSync).toTimeString().slice(0, 5).replace(':', ' h ') : ''}` : 'une seule fois, ensuite tout part tout seul'} />
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
          {CONNECTORS.map((x) => {
            const on = c.connected === x.key;
            return (
              <div key={x.key} className={cn('flex items-center gap-3 rounded-xl border p-3.5 transition', on ? 'border-[#c9f0d6] bg-ok-bg/50' : 'border-line')}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl font-display text-[15px] font-semibold text-white" style={{ background: x.color }}>{x.name[0]}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-semibold">{x.name}</div>
                  <div className="truncate text-[12px] text-ink-3">{on ? 'Relié' : x.sub}</div>
                </div>
                {on ? (
                  <button onClick={() => connect(x.key, x.name)} className="flex h-9 items-center gap-1 rounded-lg px-2 text-[12.5px] font-medium text-ok hover:bg-white"><Check className="h-4 w-4" />Relié</button>
                ) : (
                  <Button size="sm" loading={busy === x.key} disabled={!!c.connected || (!!busy && busy !== x.key)} onClick={() => connect(x.key, x.name)}>Connecter</Button>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <CardHeader title="Accès de votre expert-comptable" meta="il consulte tout, sans vous déranger" />
        <div className="p-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input className="sm:flex-1" icon={<Mail />} type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && invite()} placeholder="adresse@cabinet-comptable.fr" />
            <Button variant="primary" className="h-11 justify-center" icon={<UserPlus className="h-4 w-4" />} onClick={invite}>Inviter</Button>
          </div>
          <div className="mt-3 overflow-hidden rounded-xl border border-line">
            {c.guests.map((g) => (
              <div key={g.email} className="flex min-h-[56px] items-center gap-3 border-b border-line px-3.5 py-2 last:border-b-0">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-medium">{capitalize(g.name)}</div>
                  <div className="truncate text-[12px] text-ink-3">{g.email}</div>
                </div>
                <Badge tone="info">Lecture et export</Badge>
                <button onClick={() => { c.removeGuest(g.email); toast('Accès retiré', 'info'); }} className="grid h-10 w-10 place-items-center rounded-lg text-ink-3 hover:bg-sub hover:text-bad" aria-label="Retirer l'accès"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            {!c.guests.length && <div className="px-4 py-6 text-center text-[13px] text-ink-3">Aucun accès invité.</div>}
          </div>
          <p className="mt-2 text-xs text-ink-3">Accès gratuit et illimité pour votre cabinet. Il ne peut ni modifier ni supprimer vos factures.</p>
        </div>
      </Card>
    </div>
  );
}
