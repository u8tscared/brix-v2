// Actions métier d'un devis : envoi, simulations client, duplication, conversion en facture.

import { useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui';
import { dayOffset, money, todayISO, totals, uid } from '@/lib/format';
import { useBrix } from '@/lib/store';
import type { Chantier, Devis, DevisLigne, Facture } from '@/lib/types';
import { isPriced, nowISO } from './logic';
import { sendForSignature, simulateClientEvent } from './service';
import { useDevisMeta, type Channel } from './store';

const channelLabel = (c: Channel) => (c === 'email' ? 'e-mail' : c === 'sms' ? 'SMS' : 'WhatsApp');

export function useDevisActions(id: string) {
  const navigate = useNavigate();
  const { log, patch } = useDevisMeta();
  const get = () => useBrix.getState().devis.find((x) => x.id === id);
  const client = (d: Devis) => useBrix.getState().clients.find((c) => c.id === d.clientId);

  const send = async (opts: { channel: Channel; to: string; message: string }) => {
    const d = get();
    if (!d) return;
    const meta = useDevisMeta.getState().meta[id];
    const variants = meta ? (Object.keys(meta.variants) as (keyof typeof meta.variants)[]).filter((k) => meta.variants[k]) : ['confort' as const];
    const res = await sendForSignature(d, { ...opts, variants, payment: meta?.payment ?? { card: true, transfer: true, split3: true } });
    useBrix.getState().upsertDevis({ ...d, status: d.status === 'brouillon' || d.status === 'refuse' || d.status === 'expire' ? 'envoye' : d.status, sentAt: res.sentAt });
    log(id, `Envoyé à ${client(d)?.name ?? 'le client'} par ${channelLabel(opts.channel)}`, 'me');
    toast(`Devis envoyé à ${opts.to} (démo)`);
  };

  const simulateOpen = async () => {
    const d = get();
    if (!d) return;
    await simulateClientEvent();
    const views = (d.views ?? 0) + 1;
    useBrix.getState().upsertDevis({ ...d, status: d.status === 'envoye' ? 'vu' : d.status, views, viewedAt: nowISO() });
    log(id, `Ouvert par ${client(d)?.name ?? 'le client'} sur son téléphone${views > 1 ? ` (${views}e fois)` : ''}`, 'client');
    toast(`${client(d)?.name ?? 'Le client'} vient d’ouvrir le devis`, 'info');
  };

  const simulateSign = async () => {
    const d = get();
    if (!d) return;
    await simulateClientEvent();
    const s = useBrix.getState();
    const c = client(d);
    const t = totals(d.lines);
    const now = nowISO();
    let chantierId = d.chantierId;
    if (!chantierId || !s.chantiers.some((x) => x.id === chantierId)) {
      const hours = d.lines.filter((l) => l.unit === 'h').reduce((a, l) => a + l.quantity, 0);
      const ch: Chantier = {
        id: uid('ch'),
        clientId: d.clientId,
        name: `${d.title} · ${c?.name ?? 'client'}`,
        address: c?.address ?? '',
        city: c?.city.replace(/^\d+\s*/, '') ?? '',
        status: 'a_planifier',
        startDate: dayOffset(10),
        endDate: dayOffset(10 + Math.max(1, Math.ceil(hours / 16))),
        progress: 0,
        budgetHt: Math.round(t.ht * 100) / 100,
        costHt: 0,
        team: [],
        nextStep: 'Planifier le démarrage avec le client',
        devisId: d.id,
        photos: 0,
      };
      s.upsertChantier(ch);
      chantierId = ch.id;
      log(id, `Chantier « ${ch.name} » créé`, 'bob');
    }
    useBrix.getState().upsertDevis({ ...d, status: 'signe', signedAt: now, viewedAt: d.viewedAt ?? now, views: Math.max(1, d.views ?? 0), chantierId });
    log(id, `Signé électroniquement par ${c?.name ?? 'le client'}`, 'client');
    useDevisMeta.getState().patch(id, { chosenVariant: 'confort' });

    if (d.depositPercent > 0) {
      const lines: DevisLigne[] = t.byVat.map((v) => ({
        id: uid('l'),
        kind: 'ouvrage',
        designation: `Acompte ${d.depositPercent} % sur devis ${d.number}${t.byVat.length > 1 ? ` (TVA ${v.rate} %)` : ''}`,
        quantity: 1,
        unit: 'forfait',
        unitPriceHt: Math.round(((v.base * d.depositPercent) / 100) * 100) / 100,
        unitCostHt: 0,
        vatRate: v.rate,
      }));
      const f: Facture = {
        id: uid('f'),
        number: useBrix.getState().nextNumber('facture'),
        kind: 'acompte',
        clientId: d.clientId,
        chantierId,
        devisId: d.id,
        title: `Acompte ${d.depositPercent} % · ${d.title}`,
        status: 'envoyee',
        issueDate: todayISO(),
        dueDate: dayOffset(7),
        lines,
        paidAmount: 0,
        einvoice: { status: c?.kind === 'pro' ? 'deposee' : 'non_transmise', platform: c?.kind === 'pro' ? 'Brix (PA partenaire)' : undefined, format: c?.kind === 'pro' ? 'factur-x' : undefined, history: c?.kind === 'pro' ? [{ at: todayISO(), status: 'deposee' }] : [] },
        remindersSent: 0,
      };
      useBrix.getState().upsertFacture(f);
      log(id, `Facture d’acompte ${f.number} créée (${money(totals(lines).ttc)}), lien de paiement envoyé`, 'bob');
    }
    useBrix.getState().pushBob({ icon: 'BadgeCheck', text: `${c?.name ?? 'Le client'} a signé le devis ${d.number}`, detail: `${money(t.ttc)} TTC · acompte demandé, chantier à planifier`, cta: 'Voir le devis', to: `/app/devis/${d.id}` });
    toast(`Devis signé par ${c?.name ?? 'le client'} : acompte et chantier créés`);
  };

  const duplicate = () => {
    const d = get();
    if (!d) return;
    const copy: Devis = {
      ...d,
      id: uid('q'),
      number: useBrix.getState().nextNumber('devis'),
      title: `${d.title} (copie)`,
      status: 'brouillon',
      createdAt: todayISO(),
      sentAt: undefined,
      viewedAt: undefined,
      views: undefined,
      signedAt: undefined,
      chantierId: undefined,
      lines: d.lines.map((l) => ({ ...l, id: uid('l') })),
    };
    useBrix.getState().upsertDevis(copy);
    log(copy.id, `Copie du devis ${d.number}`, 'me');
    navigate(`/app/devis/${copy.id}`);
    toast(`Devis dupliqué : ${copy.number}`);
  };

  const convert = () => {
    const d = get();
    if (!d) return;
    const s = useBrix.getState();
    const existing = s.factures.find((f) => f.devisId === d.id && (f.kind === 'facture' || f.kind === 'solde'));
    if (existing) {
      navigate(`/app/factures/${existing.id}`);
      return;
    }
    const acomptes = s.factures.filter((f) => f.devisId === d.id && f.kind === 'acompte');
    const lines: DevisLigne[] = d.lines.filter((l) => l.kind !== 'texte').map((l) => ({ ...l, id: uid('l') }));
    for (const a of acomptes)
      for (const al of a.lines.filter(isPriced))
        lines.push({ id: uid('l'), kind: 'ouvrage', designation: `Déduction acompte ${a.number}`, quantity: 1, unit: 'forfait', unitPriceHt: -al.quantity * al.unitPriceHt, unitCostHt: 0, vatRate: al.vatRate });
    const f: Facture = {
      id: uid('f'),
      number: s.nextNumber('facture'),
      kind: acomptes.length ? 'solde' : 'facture',
      clientId: d.clientId,
      chantierId: d.chantierId,
      devisId: d.id,
      title: d.title,
      status: 'brouillon',
      issueDate: todayISO(),
      dueDate: dayOffset(30),
      lines,
      paidAmount: 0,
      einvoice: { status: 'non_transmise', history: [] },
      remindersSent: 0,
    };
    s.upsertFacture(f);
    log(id, `Converti en facture ${f.number}`, 'me');
    toast(`Facture ${f.number} créée en brouillon`);
    navigate(`/app/factures/${f.id}`);
  };

  const remove = () => {
    const d = get();
    if (!d) return;
    if (!window.confirm(`Supprimer le devis ${d.number} ? Cette action est définitive.`)) return;
    useBrix.getState().removeDevis(d.id);
    navigate('/app/devis');
    toast(`Devis ${d.number} supprimé`);
  };

  return { send, simulateOpen, simulateSign, duplicate, convert, remove, patchMeta: (p: Parameters<typeof patch>[1]) => patch(id, p) };
}
