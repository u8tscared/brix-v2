// Émettre et envoyer une facture : mail au client, lien de paiement, plateforme agréée.

import { useEffect, useState } from 'react';
import { Send } from 'lucide-react';
import { Button, Field, Input, Sheet, Switch, Textarea, toast } from '@/components/ui';
import { dateFull, money } from '@/lib/format';
import { useBrix } from '@/lib/store';
import type { Facture } from '@/lib/types';
import { issueFacture, markSent, transmit } from '../lib/actions';
import { amounts } from '../lib/model';
import { createPaymentLink, PLATFORMS, sendInvoice } from '../service';
import { useFactures } from '../store';

export function SendSheet({ f, open, onClose, missing }: { f: Facture; open: boolean; onClose: () => void; missing: string[] }) {
  const s = useBrix();
  const client = s.clients.find((c) => c.id === f.clientId);
  const fx = useFactures();
  const extra = fx.extras[f.id] ?? {};
  const pro = client?.kind === 'pro';
  const [to, setTo] = useState(client?.email ?? '');
  const [withLink, setWithLink] = useState(true);
  const [viaPa, setViaPa] = useState(pro);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const a = amounts(f);

  useEffect(() => {
    if (!open) return;
    setTo(client?.email ?? '');
    setViaPa(pro && f.einvoice.status === 'non_transmise');
    const hello = client?.kind === 'pro' ? `Bonjour ${client.contact ?? ''}`.trim() : `Bonjour ${client?.name.split(' ')[0] ?? ''}`.trim();
    setMsg(
      f.kind === 'avoir'
        ? `${hello},\n\nVous trouverez ci-joint l’avoir ${f.number} de ${money(a.ttc)}.\n\nBonne journée,\n${s.user.firstName}`
        : `${hello},\n\nVous trouverez ci-joint la facture ${f.number} de ${money(a.remaining)}, à régler avant le ${dateFull(f.dueDate)}.\nVous pouvez payer en un clic par carte, virement instantané ou en 3 fois avec le lien ci-dessous.\n\nMerci pour votre confiance,\n${s.user.firstName}, ${s.company.name}`,
    );
  }, [open]);

  const blocked = viaPa && missing.length > 0;

  const go = async () => {
    if (!to.includes('@')) return toast('Adresse mail du client manquante', 'warn');
    setBusy(true);
    issueFacture(f.id);
    if (withLink && f.kind !== 'avoir' && !extra.paymentLink) {
      const l = await createPaymentLink(f, ['carte', 'apple_pay', 'instantane', 'x3']);
      fx.setExtra(f.id, { paymentLink: { url: l.url, createdAt: l.createdAt, methods: l.methods, opened: 0 } });
    }
    await sendInvoice(f, to);
    markSent(f.id, to);
    setBusy(false);
    onClose();
    toast(`Facture envoyée à ${to}`);
    if (viaPa) transmit(f.id);
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={f.status === 'brouillon' ? 'Émettre et envoyer' : 'Renvoyer la facture'}
      subtitle={f.status === 'brouillon' ? 'Une fois émise, la facture est numérotée et ne se modifie plus.' : `${f.number} · ${client?.name}`}
      width={540}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button variant="primary" loading={busy} disabled={blocked} icon={<Send className="h-4 w-4" />} onClick={go}>
            {f.status === 'brouillon' ? 'Émettre et envoyer' : 'Envoyer'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="À">
          <Input type="email" value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
        <Field label="Message">
          <Textarea value={msg} onChange={(e) => setMsg(e.target.value)} className="min-h-[170px]" />
        </Field>
        <div className="divide-y divide-line rounded-xl border border-line">
          {f.kind !== 'avoir' && (
            <label className="flex items-center gap-3 p-3.5">
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-medium">Joindre un lien de paiement</div>
                <div className="text-[12px] text-ink-2">Carte, Apple Pay, virement instantané, 3 fois. Payé en moyenne 9 jours plus tôt.</div>
              </div>
              <Switch checked={withLink || !!extra.paymentLink} disabled={!!extra.paymentLink} onChange={setWithLink} label="Lien de paiement" />
            </label>
          )}
          {pro && (
            <label className="flex items-center gap-3 p-3.5">
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-medium">Déposer sur la plateforme agréée</div>
                <div className="text-[12px] text-ink-2">Facture électronique via {PLATFORMS[fx.platform ?? 'superpdp'].name}. Obligatoire entre pros dès le 1er septembre 2027, possible dès aujourd’hui.</div>
              </div>
              <Switch checked={viaPa} disabled={f.einvoice.status !== 'non_transmise'} onChange={setViaPa} label="Plateforme agréée" />
            </label>
          )}
        </div>
        {blocked && (
          <div className="rounded-xl border border-[#fbd1d1] bg-bad-bg p-3 text-[12.5px]">
            <div className="font-semibold text-bad">Il manque des informations obligatoires</div>
            {missing.join(' · ')}
          </div>
        )}
      </div>
    </Sheet>
  );
}
