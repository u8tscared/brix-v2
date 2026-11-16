import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, ChevronRight, ClipboardCheck, Eye, Printer, Send, ShieldCheck } from 'lucide-react';
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input, PageHeader, Segmented, Select, Sheet, cn, toast } from '@/components/ui';
import { useBrix } from '@/lib/store';
import { dateFull, dateShort, todayISO, uid } from '@/lib/format';
import { useChantiersLocal, useChantiersSeed, type Pv } from './store';
import { sendPv } from './service';
import { ReservesEditor } from './components/pv/ReservesEditor';
import { PvDocument, PvPrintPortal, guarantees } from './components/pv/PvDocument';
import { SignaturePad } from './components/common/SignaturePad';

export default function PvReception() {
  useChantiersSeed();
  const [params, setParams] = useSearchParams();
  const { chantiers, clients, company, user, upsertChantier } = useBrix();
  const { pvs, upsertPv, addJournal } = useChantiersLocal();
  const chantierId = params.get('chantier') ?? '';
  const ch = chantiers.find((c) => c.id === chantierId);
  const client = clients.find((c) => c.id === ch?.clientId);
  const existing = pvs.find((p) => p.chantierId === chantierId);
  const [pv, setPv] = useState<Pv | null>(null);
  const [preview, setPreview] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!ch) return setPv(null);
    setPv(existing ?? { id: uid('pv'), chantierId: ch.id, date: todayISO(), withReserves: false, reserves: [], clientName: client?.kind === 'pro' ? client.contact ?? client.name : client?.name ?? '', signatures: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chantierId]);

  const ready = useMemo(() => chantiers.filter((c) => c.status !== 'a_planifier').sort((a, b) => b.progress - a.progress), [chantiers]);
  const signed = !!pv?.signedAt;
  const set = (p: Partial<Pv>) => pv && setPv({ ...pv, ...p });
  const canSign = pv && pv.signatures.client && pv.signatures.artisan && pv.clientName.trim() && (!pv.withReserves || pv.reserves.some((r) => r.text.trim()));

  const sign = async () => {
    if (!pv || !ch) return;
    setSending(true);
    const final: Pv = { ...pv, reserves: pv.withReserves ? pv.reserves.filter((r) => r.text.trim()) : [], signedAt: todayISO(), sentAt: todayISO() };
    await sendPv({ pvId: final.id, to: client?.email ?? '' });
    upsertPv(final);
    setPv(final);
    const n = final.reserves.length;
    upsertChantier({ ...ch, status: n ? 'reception' : 'termine', progress: 100, nextStep: n ? `Lever ${n} réserve${n > 1 ? 's' : ''} sous 30 jours` : 'Demander un avis Google', endDate: ch.endDate > todayISO() ? todayISO() : ch.endDate });
    addJournal({ id: uid('j'), chantierId: ch.id, at: new Date().toISOString(), kind: 'evenement', author: 'bob', text: `PV de réception signé ${n ? `avec ${n} réserve${n > 1 ? 's' : ''}` : 'sans réserve'}. Garanties démarrées le ${dateFull(final.date)}.` });
    setSending(false);
    toast(`PV signé et envoyé à ${client?.email ?? 'votre client'}`);
  };

  if (!ch || !pv) {
    return (
      <div className="space-y-5">
        <PageHeader title="PV de réception" subtitle="Signé sur place, sur le téléphone. Les garanties démarrent le jour même." />
        {ready.length === 0 ? (
          <EmptyState icon={<ClipboardCheck />} title="Aucun chantier à réceptionner" text="Le PV se prépare à la fin d’un chantier en cours." />
        ) : (
          <Card>
            <CardHeader title="Choisissez le chantier" />
            {ready.map((c) => {
              const p = pvs.find((x) => x.chantierId === c.id);
              return (
                <button key={c.id} onClick={() => setParams({ chantier: c.id })} className="flex min-h-[60px] w-full items-center gap-3 border-b border-line px-4 py-2 text-left last:border-b-0 hover:bg-[#fafafc]">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium">{c.name}</span>
                    <span className="block text-xs text-ink-3">{c.progress} % · fin prévue {dateShort(c.endDate)}</span>
                  </span>
                  {p?.signedAt ? <Badge tone="ok">PV signé</Badge> : c.progress >= 80 ? <Badge tone="violet">Prêt</Badge> : null}
                  <ChevronRight className="h-4 w-4 text-ink-3" />
                </button>
              );
            })}
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        kicker={<Link to={`/app/chantiers/${ch.id}`} className="hover:text-ink">← {ch.name}</Link>}
        title="PV de réception"
        subtitle={signed ? `Signé le ${dateFull(pv.signedAt!)} et envoyé à ${client?.name ?? 'votre client'}.` : 'Faites le tour du chantier avec votre client, puis signez tous les deux.'}
        actions={
          <>
            <Select value={ch.id} onChange={(e) => setParams({ chantier: e.target.value })} className="h-10 w-full sm:w-60" aria-label="Chantier">
              {ready.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Button icon={<Eye className="h-4 w-4" />} onClick={() => setPreview(true)}>Aperçu</Button>
          </>
        }
      />

      {signed && (
        <Card className="flex flex-col gap-3 border-[#c9f0d6] bg-ok-bg p-4 sm:flex-row sm:items-center">
          <CheckCircle2 className="h-6 w-6 shrink-0 text-ok" />
          <div className="flex-1 text-[13.5px]">
            <b className="font-semibold">Réception prononcée {pv.reserves.length ? `avec ${pv.reserves.length} réserve${pv.reserves.length > 1 ? 's' : ''}` : 'sans réserve'}.</b> Le PV est archivé dans les documents du chantier.
          </div>
          <Button icon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>Imprimer ou PDF</Button>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card className="p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Date de réception">
                <Input type="date" value={pv.date} disabled={signed} onChange={(e) => set({ date: e.target.value })} />
              </Field>
              <Field label="Nom du signataire côté client">
                <Input value={pv.clientName} disabled={signed} onChange={(e) => set({ clientName: e.target.value })} />
              </Field>
            </div>
            <div className="mt-4">
              <span className="mb-1.5 block text-[12.5px] font-medium text-ink-2">Le client accepte les travaux</span>
              <Segmented
                value={pv.withReserves ? 'avec' : 'sans'}
                onChange={(v) => !signed && set({ withReserves: v === 'avec', reserves: v === 'avec' && !pv.reserves.length ? [{ id: uid('rs'), text: '', location: '', done: false }] : pv.reserves })}
                options={[{ value: 'sans', label: 'Sans réserve' }, { value: 'avec', label: 'Avec réserves' }]}
              />
            </div>
          </Card>

          {pv.withReserves && (
            <Card>
              <CardHeader title="Réserves" meta="à lever sous 30 jours" />
              <div className="p-3">
                <ReservesEditor reserves={pv.reserves} onChange={(reserves) => set({ reserves })} disabled={signed} />
              </div>
            </Card>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {signed ? (
              (['client', 'artisan'] as const).map((k) => (
                <Card key={k} className="p-3">
                  <div className="text-[13px] font-medium">{k === 'client' ? pv.clientName : `${user.firstName} ${user.lastName}`}</div>
                  <img src={pv.signatures[k]} alt="" className="mt-2 h-[120px] w-full object-contain" />
                </Card>
              ))
            ) : (
              <>
                <SignaturePad label={`Le client · ${pv.clientName || 'signataire'}`} value={pv.signatures.client} onChange={(s) => set({ signatures: { ...pv.signatures, client: s } })} />
                <SignaturePad label={`L’entreprise · ${user.firstName} ${user.lastName}`.trim()} value={pv.signatures.artisan} onChange={(s) => set({ signatures: { ...pv.signatures, artisan: s } })} />
              </>
            )}
          </div>

          {!signed && (
            <Button variant="primary" size="lg" className="w-full justify-center" disabled={!canSign} loading={sending} icon={<Send className="h-4 w-4" />} onClick={sign}>
              {canSign ? 'Valider la réception et envoyer le PV' : 'Les deux signatures sont nécessaires'}
            </Button>
          )}
        </div>

        <Card className="h-fit">
          <CardHeader icon={<ShieldCheck className="h-4 w-4 text-ink-2" />} title="Garanties" meta={`à partir du ${dateFull(pv.date)}`} />
          {guarantees(pv.date).map((g, i) => (
            <div key={g.label} className="flex gap-3 border-b border-line px-4 py-3 last:border-b-0">
              <span className={cn('num grid h-10 w-12 shrink-0 place-items-center whitespace-nowrap rounded-xl text-[12.5px] font-semibold', i === 2 ? 'bg-ink text-white' : 'bg-sub')}>{g.years} an{g.years > 1 ? 's' : ''}</span>
              <div className="min-w-0">
                <div className="text-[13.5px] font-medium">{g.label}</div>
                <div className="text-xs text-ink-2">Jusqu’au {dateFull(g.until)}</div>
                <div className="mt-0.5 text-xs text-ink-3">{g.text}</div>
              </div>
            </div>
          ))}
          <p className="border-t border-line px-4 py-3 text-xs text-ink-3">Brix vous rappellera la fin de la garantie de parfait achèvement un mois avant.</p>
        </Card>
      </div>

      <Sheet open={preview} onClose={() => setPreview(false)} width={800} title="Aperçu du PV" footer={<><Button variant="ghost" onClick={() => setPreview(false)}>Fermer</Button><Button variant="primary" icon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>Imprimer ou PDF</Button></>}>
        <div className="rounded-xl border border-line">
          <PvDocument pv={pv} ch={ch} client={client} company={company} />
        </div>
      </Sheet>
      <PvPrintPortal pv={pv} ch={ch} client={client} company={company} />
    </div>
  );
}
