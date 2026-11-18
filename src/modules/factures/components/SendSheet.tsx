// Émettre et envoyer une facture en 2 étapes : destinataire et message, puis vérification
// (aperçu du mail, pièce jointe, lien de paiement, plateforme agréée). Confirmation animée.

import { useEffect, useState } from 'react';
import { ArrowRight, Link2, Send, ShieldCheck } from 'lucide-react';
import { Button, Field, IconTile, Input, Sheet, Switch, Textarea, toast } from '@/components/ui';
import { dateFull, money } from '@/lib/format';
import { useBrix } from '@/lib/store';
import type { Facture } from '@/lib/types';
import type { CheckItem } from '@/modules/devis/checks';
import { MailPreview, SendSuccess, Stepper } from '@/modules/devis/components/send/SendParts';
import { CheckIcon, CheckSummary } from '@/modules/devis/components/viewer/CheckPanel';
import { issueFacture, markSent, transmit } from '../lib/actions';
import { amounts } from '../lib/model';
import { createPaymentLink, PLATFORMS, sendInvoice } from '../service';
import { useFactures } from '../store';
import { INVOICE_TITLE } from './invoiceDoc';

export function SendSheet({ f, open, onClose, missing, checks, onPreview }: { f: Facture; open: boolean; onClose: () => void; missing: string[]; checks?: CheckItem[]; onPreview?: () => void }) {
  const s = useBrix();
  const client = s.clients.find((c) => c.id === f.clientId);
  const fx = useFactures();
  const extra = fx.extras[f.id] ?? {};
  const pro = client?.kind === 'pro';
  const [step, setStep] = useState(0);
  const [to, setTo] = useState(client?.email ?? '');
  const [withLink, setWithLink] = useState(true);
  const [viaPa, setViaPa] = useState(pro);
  const [subject, setSubject] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<null | { to: string; draft: boolean }>(null);
  const a = amounts(f);
  const draft = f.status === 'brouillon';

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setDone(null);
    setTo(client?.email ?? '');
    setViaPa(pro && f.einvoice.status === 'non_transmise');
    const hello = client?.kind === 'pro' ? `Bonjour ${client.contact ?? ''}`.trim() : `Bonjour ${client?.name.split(' ')[0] ?? ''}`.trim();
    setSubject(`${INVOICE_TITLE[f.kind]} ${f.number} · ${s.company.name}`);
    setMsg(
      f.kind === 'avoir'
        ? `${hello},\n\nVous trouverez ci-joint l’avoir ${f.number} de ${money(a.ttc)}.\n\nBonne journée,\n${s.user.firstName}`
        : `${hello},\n\nVous trouverez ci-joint la facture ${f.number} de ${money(a.remaining)}, à régler avant le ${dateFull(f.dueDate)}.\nVous pouvez payer en un clic par carte, virement instantané ou en 3 fois avec le lien ci-dessous.\n\nMerci pour votre confiance,\n${s.user.firstName}, ${s.company.name}`,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const blocked = viaPa && missing.length > 0;
  const validTo = /\S+@\S+\.\S+/.test(to);

  const go = async () => {
    setBusy(true);
    issueFacture(f.id);
    if (withLink && f.kind !== 'avoir' && !extra.paymentLink) {
      const l = await createPaymentLink(f, ['carte', 'apple_pay', 'instantane', 'x3']);
      fx.setExtra(f.id, { paymentLink: { url: l.url, createdAt: l.createdAt, methods: l.methods, opened: 0 } });
    }
    await sendInvoice(f, to);
    markSent(f.id, to);
    if (viaPa) transmit(f.id);
    setBusy(false);
    setDone({ to, draft });
    toast(`${INVOICE_TITLE[f.kind]} ${f.kind === 'avoir' ? 'envoyé' : 'envoyée'} à ${client?.name ?? to}`);
  };

  const footer = done ? undefined : (
    <>
      <Button variant="ghost" onClick={() => (step ? setStep(0) : onClose())}>
        {step ? 'Retour' : 'Annuler'}
      </Button>
      {step === 0 ? (
        <Button variant="primary" size="lg" disabled={!validTo || !msg.trim()} iconRight={<ArrowRight className="h-4 w-4" />} onClick={() => setStep(1)}>
          Continuer
        </Button>
      ) : (
        <Button variant="dawn" size="lg" loading={busy} disabled={blocked} icon={<Send className="h-4 w-4" />} onClick={go}>
          {draft ? 'Émettre et envoyer' : 'Envoyer'}
        </Button>
      )}
    </>
  );

  return (
    <Sheet open={open} onClose={onClose} width={560} title={done ? undefined : draft ? 'Émettre et envoyer' : 'Renvoyer la facture'} subtitle={done ? undefined : draft ? 'Une fois émise, la facture est numérotée et ne se modifie plus.' : `${f.number} · ${client?.name ?? ''}`} footer={footer}>
      {done ? (
        <SendSuccess
          title={done.draft ? 'Facture émise et envoyée' : 'Facture envoyée'}
          text={
            <>
              {client?.name ?? 'Votre client'} la reçoit à <b className="font-medium text-ink">{done.to}</b>
              {f.kind !== 'avoir' && withLink ? ', avec un lien pour payer en un clic.' : '.'} {f.kind !== 'avoir' && 'Bob relancera tout seul si l’échéance passe.'}
            </>
          }
          onClose={onClose}
        />
      ) : (
        <div>
          <Stepper steps={['Destinataire', 'Vérifier']} current={step} onGo={setStep} />
          <div key={step} className="animate-[slide-left_.35s_var(--ease)_both]">
            {step === 0 ? (
              <div className="space-y-4">
                <Field label="Adresse e-mail du client" hint={!client?.email ? 'Pas encore renseignée sur la fiche du client.' : undefined}>
                  <Input type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="nom@exemple.fr" autoFocus={!to} />
                </Field>
                <Field label="Objet">
                  <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
                </Field>
                <Field label="Message">
                  <Textarea value={msg} onChange={(e) => setMsg(e.target.value)} className="min-h-[170px]" />
                </Field>
                <div className="space-y-2">
                  {f.kind !== 'avoir' && (
                    <label className="row-card cursor-pointer gap-3">
                      <IconTile icon={<Link2 />} tone="violet" size="row" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[13.5px] font-medium">Joindre un lien de paiement</div>
                        <div className="text-[12px] text-ink-2">Carte, Apple Pay, virement instantané, 3 fois. Payé en moyenne 9 jours plus tôt.</div>
                      </div>
                      <Switch checked={withLink || !!extra.paymentLink} disabled={!!extra.paymentLink} onChange={setWithLink} label="Lien de paiement" />
                    </label>
                  )}
                  {pro && (
                    <label className="row-card cursor-pointer gap-3">
                      <IconTile icon={<ShieldCheck />} tone="green" size="row" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[13.5px] font-medium">Déposer sur la plateforme agréée</div>
                        <div className="text-[12px] text-ink-2">Facture électronique via {PLATFORMS[fx.platform ?? 'superpdp'].name}. Obligatoire entre pros dès le 1er septembre 2027, possible dès aujourd’hui.</div>
                      </div>
                      <Switch checked={viaPa} disabled={f.einvoice.status !== 'non_transmise'} onChange={setViaPa} label="Plateforme agréée" />
                    </label>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <MailPreview
                  from={`${s.user.firstName} ${s.user.lastName} · ${s.company.name}`}
                  to={to}
                  subject={subject}
                  body={msg}
                  cta={f.kind !== 'avoir' && (withLink || extra.paymentLink) ? `Payer ${money(a.remaining)}` : undefined}
                  attachment={{ name: `${INVOICE_TITLE[f.kind]} ${f.number}.pdf`, meta: `PDF${pro ? ' + Factur-X' : ''} · cliquer pour l’ouvrir` }}
                  onAttachment={onPreview}
                />
                {checks && (
                  <button onClick={onPreview} className="row-card w-full gap-3 text-left">
                    <div className="min-w-0 flex-1">
                      <CheckSummary items={checks} compact />
                    </div>
                    <span className="shrink-0 rounded-full bg-pale-v px-3 py-1.5 text-[12.5px] font-medium text-deep-v">Voir la facture</span>
                  </button>
                )}
                {checks?.some((c) => c.state !== 'ok') && (
                  <ul className="space-y-1.5">
                    {checks
                      .filter((c) => c.state !== 'ok')
                      .map((c) => (
                        <li key={c.key} className="flex items-start gap-2.5 text-[12.5px]">
                          <CheckIcon state={c.state} />
                          <span className="pt-0.5 text-ink-2">
                            <b className="font-medium text-ink">{c.label}</b> · {c.detail}
                          </span>
                        </li>
                      ))}
                  </ul>
                )}
                {blocked && (
                  <div className="rounded-card-sm bg-pale-r p-3.5 text-[12.5px] text-deep-r">
                    <div className="font-semibold">Il manque des informations pour la plateforme agréée</div>
                    {missing.join(' · ')}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </Sheet>
  );
}
