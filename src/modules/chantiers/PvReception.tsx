import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ClipboardCheck, Eye, Printer, Send, ShieldCheck } from 'lucide-react';
import { PvChooser, PvSteps, PvSuccess } from './components/pv/PvParts';
import { Button, Card, CardHeader, EmptyState, Field, IconTile, Input, PageHeader, Segmented, Select, Sheet, cn, toast } from '@/components/ui';
import { useBrix } from '@/lib/store';
import { dateFull, todayISO, uid } from '@/lib/format';
import { useChantiersLocal, useChantiersSeed, type Pv } from './store';
import { sendPv } from './service';
import { ReservesEditor } from './components/pv/ReservesEditor';
import { PvDocument, PvPrintPortal, guarantees } from './components/pv/PvDocument';
import { SignaturePad } from './components/common/SignaturePad';

export default function PvReception() {
  useChantiersSeed();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
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
        <PageHeader icon={<IconTile name="ClipboardCheck" dept="chantiers" size="lg" />} title="PV de réception" subtitle="Signé sur place, sur le téléphone. Les garanties démarrent le jour même." />
        {ready.length === 0 ? (
          <EmptyState icon={<ClipboardCheck />} title="Aucun chantier à réceptionner" text="Le PV se prépare à la fin d’un chantier en cours." />
        ) : (
          <section className="space-y-3">
            <h2 className="label-halo">Quel chantier réceptionnez-vous ?</h2>
            <PvChooser chantiers={ready} pvs={pvs} onPick={(id) => setParams({ chantier: id })} />
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        icon={<IconTile name="ClipboardCheck" dept="chantiers" size="lg" />}
        kicker={<Link to={`/app/chantiers/${ch.id}`} className="flex items-center gap-1 hover:text-ink"><ChevronLeft className="h-3.5 w-3.5" />{ch.name}</Link>}
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

      {signed ? (
        <PvSuccess pv={pv} clientName={client?.name ?? 'votre client'} onPrint={() => window.print()} onBack={() => navigate(`/app/chantiers/${ch.id}`)} />
      ) : (
        <PvSteps step={!pv.signatures.client && !pv.signatures.artisan ? 0 : canSign ? 2 : 1} />
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card className="p-4 md:p-5">
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
            <Button variant={canSign ? 'dawn' : 'primary'} size="lg" className="sticky bottom-[calc(96px+var(--safe-b))] z-10 w-full justify-center md:static" disabled={!canSign} loading={sending} icon={<Send className="h-4 w-4" />} onClick={sign}>
              {canSign ? 'Valider la réception et envoyer le PV' : 'Les deux signatures sont nécessaires'}
            </Button>
          )}
        </div>

        <Card className="h-fit">
          <CardHeader icon={<IconTile size="sm" tone="green" icon={<ShieldCheck />} />} title="Garanties" meta={`à partir du ${dateFull(pv.date)}`} />
          {guarantees(pv.date).map((g, i) => (
            <div key={g.label} className="flex gap-3 border-b border-halo-line px-4 py-3.5 last:border-b-0">
              <span className={cn('num grid h-11 w-[52px] shrink-0 place-items-center whitespace-nowrap rounded-[14px] text-[12.5px] font-semibold', ['tone-green', 'tone-blue', 'tone-violet'][i] ?? 'tone-neutral')}>{g.years} an{g.years > 1 ? 's' : ''}</span>
              <div className="min-w-0">
                <div className="text-[13.5px] font-medium">{g.label}</div>
                <div className="text-xs text-ink-2">Jusqu’au {dateFull(g.until)}</div>
                <div className="mt-0.5 text-xs text-ink-3">{g.text}</div>
              </div>
            </div>
          ))}
          <p className="border-t border-halo-line px-4 py-3 text-xs text-ink-3">Brix vous rappellera la fin de la garantie de parfait achèvement un mois avant.</p>
        </Card>
      </div>

      <Sheet open={preview} onClose={() => setPreview(false)} width={800} title="Aperçu du PV" footer={<><Button variant="ghost" onClick={() => setPreview(false)}>Fermer</Button><Button variant="primary" icon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>Imprimer ou PDF</Button></>}>
        <div className="overflow-hidden rounded-card-sm shadow-halo-sm">
          <PvDocument pv={pv} ch={ch} client={client} company={company} />
        </div>
      </Sheet>
      <PvPrintPortal pv={pv} ch={ch} client={client} company={company} />
    </div>
  );
}
