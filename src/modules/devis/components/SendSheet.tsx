import { useEffect, useState } from 'react';
import { ArrowRight, Check, ChevronDown, Eye, Mail, MessageCircle, Send, Smartphone } from 'lucide-react';
import { Avatar, Button, Field, Input, Segmented, Sheet, Switch, Textarea, cn } from '@/components/ui';
import { initials, money, totals } from '@/lib/format';
import type { Client, Company, Devis, User } from '@/lib/types';
import { checkScore, type CheckItem } from '../checks';
import type { SendDevisInput } from '../send';
import type { Channel, DevisMeta, VariantKey } from '../store';
import type { DocSpec } from './doc/PagedDoc';
import { MailPreview, SendSuccess, Stepper } from './send/SendParts';
import { CheckIcon, CheckSummary } from './viewer/CheckPanel';

export const VARIANTS: { key: VariantKey; label: string; factor: number; text: string }[] = [
  { key: 'essentiel', label: 'Essentiel', factor: 0.88, text: 'Gamme standard, sans options' },
  { key: 'confort', label: 'Confort', factor: 1, text: 'Votre devis tel quel' },
  { key: 'premium', label: 'Premium', factor: 1.18, text: 'Gamme supérieure, garantie étendue' },
];

const civility = (c?: Client) => (c ? (c.kind === 'pro' ? c.contact ?? c.name : c.name) : '');

export function defaultMessage(d: Devis, client: Client | undefined, company: Company, user: User, channel: Channel) {
  const t = totals(d.lines);
  const name = civility(client);
  if (channel !== 'email') return `Bonjour ${name}, voici votre devis ${d.number} (${money(t.ttc)} TTC) pour « ${d.title} ». Vous pouvez le lire et le signer en 1 minute ici : [lien]. ${user.firstName}, ${company.name}`;
  return `Bonjour ${name},

Suite à notre visite, voici votre devis ${d.number} pour « ${d.title} », d'un montant de ${money(t.ttc)} TTC.

Vous pouvez le consulter et le signer en ligne en une minute. ${d.depositPercent ? `L'acompte de ${d.depositPercent} % se règle ensuite par carte ou par virement.` : ''}

Je reste disponible pour en parler.

${user.firstName} ${user.lastName}
${company.name} · ${company.phone}`;
}

interface Props {
  open: boolean;
  onClose: () => void;
  d: Devis;
  client?: Client;
  company: Company;
  user: User;
  meta: DevisMeta;
  checks: CheckItem[];
  spec?: DocSpec;
  onPatchMeta: (p: Partial<DevisMeta>) => void;
  onSend: (opts: SendDevisInput) => Promise<void>;
  onPickClient: () => void;
  onPreview: () => void;
}

const STEPS = ['Destinataire', 'Message', 'Vérifier'];

/** Envoi pour signature en 3 étapes : destinataire, message, vérification. */
export function SendSheet({ open, onClose, d, client, company, user, meta, checks, onPatchMeta, onSend, onPickClient, onPreview }: Props) {
  const [step, setStep] = useState(0);
  const [channel, setChannel] = useState<Channel>(meta.channel);
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [options, setOptions] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<null | { to: string }>(null);
  const t = totals(d.lines);
  const score = checkScore(checks);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setDone(null);
    setChannel(meta.channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  useEffect(() => {
    if (!open) return;
    setTo(channel === 'email' ? client?.email ?? '' : client?.phone ?? '');
    setSubject(`Votre devis ${d.number} · ${company.name}`);
    setMessage(defaultMessage(d, client, company, user, channel));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, channel, client?.id]);

  const validTo = channel === 'email' ? /\S+@\S+\.\S+/.test(to) : to.replace(/\D/g, '').length >= 9;
  const go = async () => {
    setBusy(true);
    await onSend({ channel, to, subject, message });
    setBusy(false);
    setDone({ to });
  };
  const via = channel === 'email' ? 'par e-mail' : channel === 'sms' ? 'par SMS' : 'sur WhatsApp';

  const footer = done ? undefined : (
    <>
      <Button variant="ghost" onClick={() => (step ? setStep(step - 1) : onClose())}>
        {step ? 'Retour' : 'Annuler'}
      </Button>
      {step < 2 ? (
        <Button variant="primary" size="lg" iconRight={<ArrowRight className="h-4 w-4" />} disabled={!client || (step === 0 && !validTo) || (step === 1 && !message.trim())} onClick={() => setStep(step + 1)}>
          Continuer
        </Button>
      ) : (
        <Button variant="dawn" size="lg" loading={busy} disabled={!t.ht} icon={<Send className="h-4 w-4" />} onClick={go}>
          Envoyer {via}
        </Button>
      )}
    </>
  );

  return (
    <Sheet open={open} onClose={onClose} width={560} title={done ? undefined : d.status === 'brouillon' ? 'Envoyer pour signature' : 'Renvoyer le devis'} subtitle={done ? undefined : client ? `${d.number} · ${money(t.ttc)} TTC` : 'Choisissez d’abord un client'} footer={footer}>
      {done ? (
        <SendSuccess title="Devis envoyé" text={<>{client?.name ?? 'Votre client'} le reçoit {via} à <b className="font-medium text-ink">{done.to}</b>. Vous serez prévenu dès qu’il l’ouvre, puis quand il signe.</>} onClose={onClose}>
          <div className="mx-auto max-w-[340px] rounded-card-sm bg-white p-4 text-left text-[13px] shadow-halo-sm">
            {['Envoyé', 'Ouvert', 'Signé', 'Acompte payé'].map((s, i) => (
              <div key={s} className="relative flex items-center gap-3 py-1.5">
                {i < 3 && <span aria-hidden className="absolute left-[9px] top-[26px] h-[14px] w-[1.5px] rounded-full bg-[#ece8f6]" />}
                <span className={cn('grid h-5 w-5 place-items-center rounded-full', i === 0 ? 'bg-[#10b981] text-white' : 'bg-halo-track')}>{i === 0 && <Check className="h-3 w-3" strokeWidth={3} />}</span>
                <span className={i === 0 ? 'font-medium text-ink' : 'text-ink-3'}>{s}</span>
                {i === 0 && <span className="ml-auto text-ink-3">à l’instant</span>}
              </div>
            ))}
          </div>
        </SendSuccess>
      ) : !client ? (
        <div className="rounded-card-sm bg-white/60 p-6 text-center shadow-[inset_0_0_0_1.5px_#e6dcfb]">
          <p className="text-[13.5px] text-ink-2">Ce devis n’a pas encore de client.</p>
          <Button className="mt-3" variant="primary" onClick={onPickClient}>
            Choisir le client
          </Button>
        </div>
      ) : (
        <div>
          <Stepper steps={STEPS} current={step} onGo={setStep} />
          <div key={step} className="animate-[slide-left_.35s_var(--ease)_both]">
            {step === 0 && (
              <div className="space-y-4">
                <Segmented<Channel>
                  value={channel}
                  onChange={setChannel}
                  className="w-full [&>button]:flex-1 [&>button]:justify-center"
                  options={[
                    { value: 'email', label: <><Mail className="h-3.5 w-3.5" /> E-mail</> },
                    { value: 'sms', label: <><Smartphone className="h-3.5 w-3.5" /> SMS</> },
                    { value: 'whatsapp', label: <><MessageCircle className="h-3.5 w-3.5" /> WhatsApp</> },
                  ]}
                />
                <div className="row-card">
                  <Avatar initials={initials(client.name)} size={42} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-semibold">{client.name}</div>
                    <div className="truncate text-[12.5px] text-ink-3">{[client.address, client.city].filter(Boolean).join(', ') || 'Adresse à compléter'}</div>
                  </div>
                </div>
                <Field label={channel === 'email' ? 'Adresse e-mail' : 'Numéro de téléphone'} hint={!to ? 'Pas encore renseigné sur la fiche du client.' : undefined}>
                  <Input value={to} onChange={(e) => setTo(e.target.value)} type={channel === 'email' ? 'email' : 'tel'} placeholder={channel === 'email' ? 'nom@exemple.fr' : '06 12 34 56 78'} autoFocus={!to} />
                </Field>
              </div>
            )}
            {step === 1 && (
              <div className="space-y-4">
                {channel === 'email' && (
                  <Field label="Objet">
                    <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
                  </Field>
                )}
                <Field label="Message" hint="Préparé par Bob, modifiable. Le lien de signature est ajouté automatiquement.">
                  <Textarea value={message} onChange={(e) => setMessage(e.target.value)} className={channel === 'email' ? 'min-h-[220px]' : 'min-h-[120px]'} />
                </Field>
                <button onClick={() => setOptions((o) => !o)} className="flex h-11 w-full items-center justify-between rounded-full px-4 text-[13px] font-medium text-ink-2 shadow-[0_0_0_1px_#ece8f6] transition hover:bg-white hover:text-ink">
                  Formules et paiement de l’acompte
                  <ChevronDown className={cn('h-4 w-4 transition-transform duration-300', options && 'rotate-180')} />
                </button>
                {options && <SendOptions d={d} meta={meta} onPatchMeta={onPatchMeta} ttc={t.ttc} />}
              </div>
            )}
            {step === 2 && (
              <div className="space-y-4">
                {channel === 'email' ? (
                  <MailPreview from={`${user.firstName} ${user.lastName} · ${company.name}`} to={to} subject={subject} body={message} cta="Consulter et signer le devis" attachment={{ name: `Devis ${d.number}.pdf`, meta: `PDF · ${money(t.ttc)} TTC · cliquer pour l’ouvrir` }} onAttachment={onPreview} />
                ) : (
                  <div className="rounded-card-sm bg-halo-track/70 p-4">
                    <div className="ml-auto max-w-[85%] rounded-[18px] rounded-br-[6px] bg-[#15122a] px-3.5 py-2.5 text-[13px] leading-relaxed text-white">{message.replace('[lien]', `brix.fr/s/${d.number.toLowerCase()}`)}</div>
                    <div className="mt-1 text-right text-[11px] text-ink-3">vers {to}</div>
                  </div>
                )}
                <button onClick={onPreview} className="row-card w-full text-left">
                  <div className="min-w-0 flex-1">
                    <CheckSummary items={checks} compact />
                  </div>
                  <span className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-pale-v px-3 text-[12.5px] font-medium text-deep-v">
                    <Eye className="h-3.5 w-3.5" /> Voir le devis
                  </span>
                </button>
                {score.bad + score.warn > 0 && (
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
              </div>
            )}
          </div>
        </div>
      )}
    </Sheet>
  );
}

function SendOptions({ d, meta, onPatchMeta, ttc }: { d: Devis; meta: DevisMeta; onPatchMeta: (p: Partial<DevisMeta>) => void; ttc: number }) {
  return (
    <div className="animate-[fade-up_.35s_var(--ease)_both] space-y-4">
      <div>
        <p className="mb-2 text-[12px] text-ink-3">Le client choisit lui-même sa formule. En proposer 3 augmente nettement le taux de signature.</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {VARIANTS.map((v) => {
            const on = meta.variants[v.key];
            const locked = v.key === 'confort';
            return (
              <button
                key={v.key}
                disabled={locked}
                onClick={() => onPatchMeta({ variants: { ...meta.variants, [v.key]: !on } })}
                className={cn('relative flex min-h-[48px] items-center gap-3 rounded-card-sm p-3.5 text-left transition duration-300 ease-out-quint sm:block', on ? 'bg-dawn-pale shadow-[0_0_0_1.5px_#d9ccfb]' : 'bg-white shadow-halo-sm hover:-translate-y-px', locked && 'cursor-default')}
                aria-pressed={on}
              >
                <span className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-full transition sm:absolute sm:right-2.5 sm:top-2.5', on ? 'bg-ink text-white' : 'bg-white shadow-[inset_0_0_0_1.5px_#dcd6ea]')}>{on && <Check className="h-3 w-3" />}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold">{v.label}</span>
                  <span className="num block text-[13.5px]">{money(ttc * v.factor, true)}</span>
                  <span className="block text-[11.5px] leading-snug text-ink-3">{v.text}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
      {d.depositPercent > 0 && (
        <div className="divide-y divide-[#f2eff8] overflow-hidden rounded-card-sm bg-white shadow-halo-sm">
          {(
            [
              ['card', 'Carte bancaire', 'Encaissé sous 2 jours'],
              ['transfer', 'Virement', 'RIB et référence pré-remplis'],
              ['split3', 'En 3 fois sans frais', 'Vous êtes payé en une fois'],
            ] as const
          ).map(([k, label, hint]) => (
            <div key={k} className="flex min-h-[52px] items-center gap-3 px-3.5 py-2">
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-medium">{label}</div>
                <div className="text-[12px] text-ink-3">{hint}</div>
              </div>
              <Switch checked={meta.payment[k]} onChange={(v) => onPatchMeta({ payment: { ...meta.payment, [k]: v } })} label={label} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
