import { useEffect, useState } from 'react';
import { Check, Mail, MessageCircle, Send, Smartphone } from 'lucide-react';
import { Button, Field, Input, Segmented, Sheet, Switch, Textarea, cn } from '@/components/ui';
import { money, totals } from '@/lib/format';
import type { Client, Company, Devis, User } from '@/lib/types';
import type { Channel, DevisMeta, VariantKey } from '../store';

export const VARIANTS: { key: VariantKey; label: string; factor: number; text: string }[] = [
  { key: 'essentiel', label: 'Essentiel', factor: 0.88, text: 'Gamme standard, sans options' },
  { key: 'confort', label: 'Confort', factor: 1, text: 'Votre devis tel quel' },
  { key: 'premium', label: 'Premium', factor: 1.18, text: 'Gamme supérieure, garantie étendue' },
];

const civility = (c?: Client) => (c ? (c.kind === 'pro' ? c.contact ?? c.name : c.name) : '');

export function defaultMessage(d: Devis, client: Client | undefined, company: Company, user: User, channel: Channel) {
  const t = totals(d.lines);
  const name = civility(client);
  if (channel !== 'email')
    return `Bonjour ${name}, voici votre devis ${d.number} (${money(t.ttc)} TTC) pour « ${d.title} ». Vous pouvez le lire et le signer en 1 minute ici : [lien]. ${user.firstName}, ${company.name}`;
  return `Bonjour ${name},

Suite à notre visite, voici votre devis ${d.number} pour « ${d.title} », d'un montant de ${money(t.ttc)} TTC.

Vous pouvez le consulter et le signer en ligne en une minute. L'acompte de ${d.depositPercent} % se règle ensuite par carte ou par virement.

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
  onPatchMeta: (p: Partial<DevisMeta>) => void;
  onSend: (opts: { channel: Channel; to: string; message: string }) => Promise<void>;
  onPickClient: () => void;
}

/** Feuille « Envoyer pour signature ». */
export function SendSheet({ open, onClose, d, client, company, user, meta, onPatchMeta, onSend, onPickClient }: Props) {
  const [channel, setChannel] = useState<Channel>(meta.channel);
  const [to, setTo] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const t = totals(d.lines);

  useEffect(() => {
    if (!open) return;
    setTo(channel === 'email' ? client?.email ?? '' : client?.phone ?? '');
    setMessage(defaultMessage(d, client, company, user, channel));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, channel, client?.id]);

  const go = async () => {
    setBusy(true);
    onPatchMeta({ channel });
    await onSend({ channel, to, message });
    setBusy(false);
  };
  const selected = VARIANTS.filter((v) => meta.variants[v.key]);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      width={540}
      title={d.status === 'brouillon' ? 'Envoyer pour signature' : 'Renvoyer le devis'}
      subtitle={client ? `${client.name} · ${money(t.ttc)} TTC` : 'Choisissez d’abord un client'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="primary" size="lg" loading={busy} disabled={!client || !to.trim() || !t.ht} icon={<Send className="h-4 w-4" />} onClick={go}>
            Envoyer {channel === 'email' ? 'par e-mail' : channel === 'sms' ? 'par SMS' : 'sur WhatsApp'}
          </Button>
        </>
      }
    >
      {!client ? (
        <div className="rounded-xl border border-dashed border-line2 p-5 text-center">
          <p className="text-[13.5px] text-ink-2">Ce devis n’a pas encore de client.</p>
          <Button className="mt-3" variant="primary" onClick={onPickClient}>
            Choisir le client
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
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
          <Field label="À">
            <Input value={to} onChange={(e) => setTo(e.target.value)} type={channel === 'email' ? 'email' : 'tel'} />
          </Field>
          <Field label="Message" hint="Rédigé par Bob, modifiable. Le lien de signature est ajouté automatiquement.">
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} className={channel === 'email' ? 'min-h-[200px]' : 'min-h-[110px]'} />
          </Field>

          <div>
            <div className="mb-1.5 text-[12.5px] font-medium text-ink-2">Formules proposées au client</div>
            <p className="mb-2.5 text-[12px] text-ink-3">Le client choisit lui-même. Proposer 3 formules augmente le taux de signature d’environ 20 %.</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {VARIANTS.map((v) => {
                const on = meta.variants[v.key];
                const locked = v.key === 'confort';
                return (
                  <button
                    key={v.key}
                    disabled={locked}
                    onClick={() => onPatchMeta({ variants: { ...meta.variants, [v.key]: !on } })}
                    className={cn('relative flex min-h-[44px] items-center gap-3 rounded-xl border p-3 text-left transition sm:block', on ? 'border-vi-300 bg-vi-50/60 ring-2 ring-vi-100' : 'border-line2 bg-white hover:bg-sub', locked && 'cursor-default')}
                    aria-pressed={on}
                  >
                    <span className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-md border sm:absolute sm:right-2.5 sm:top-2.5', on ? 'border-vi-700 bg-vi-700 text-white' : 'border-line2 bg-white')}>{on && <Check className="h-3 w-3" />}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] font-semibold">{v.label}</span>
                      <span className="num block text-[14px]">{money(t.ttc * v.factor, true)}</span>
                      <span className="block text-[11.5px] leading-snug text-ink-3">{v.text}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            {selected.length === 1 && <p className="mt-2 text-[12px] text-ink-3">Une seule formule : le client signe directement votre devis.</p>}
          </div>

          <div>
            <div className="mb-2 text-[12.5px] font-medium text-ink-2">Acompte de {d.depositPercent} % payable en ligne · {money((t.ttc * d.depositPercent) / 100)}</div>
            <div className="divide-y divide-line overflow-hidden rounded-xl border border-line">
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
          </div>
          <p className="rounded-lg bg-sub px-3 py-2 text-[12px] text-ink-2">En démo : rien n’est réellement envoyé. Vous pourrez ensuite simuler l’ouverture et la signature par le client.</p>
        </div>
      )}
    </Sheet>
  );
}
