import { useMemo, useState } from 'react';
import { Check, Copy, Link2, MessageSquareText, QrCode as QrIcon } from 'lucide-react';
import { Button, Field, Input, Segmented, Select, Sheet, toast } from '@/components/ui';
import { PERMISSIONS, RIGHT_LABEL, ROLES, type RoleKey } from '../data';
import { inviteCode, inviteLink, sendInviteSms } from '../service';
import { useEquipe } from '../store';
import { QrCode } from './QrCode';

type Via = 'qr' | 'sms' | 'lien';

export function InviteSheet({ open, onClose, defaultRole = 'compagnon' }: { open: boolean; onClose: () => void; defaultRole?: RoleKey }) {
  const invite = useEquipe((s) => s.invite);
  const [via, setVia] = useState<Via>('qr');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<RoleKey>(defaultRole);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const code = useMemo(() => inviteCode(), [open]);
  const link = `${inviteLink(code)}?role=${role}`;
  const roleDef = ROLES.find((r) => r.key === role)!;
  const can = PERMISSIONS.filter((p) => p.rights[role] !== 'non');

  const done = (msg: string, v: Via) => {
    invite({ name: name || 'Invitation sans nom', phone, role, via: v });
    toast(msg);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      /* presse-papiers indisponible : le lien reste affiché */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
    done('Lien copié. Collez-le dans WhatsApp ou un SMS.', 'lien');
  };

  const sms = async () => {
    if (phone.replace(/\D/g, '').length < 10) return toast('Entrez un numéro de portable à 10 chiffres.', 'warn');
    setSending(true);
    await sendInviteSms(phone, link);
    setSending(false);
    done(`SMS envoyé à ${name || phone} (démo : aucun SMS réel).`, 'sms');
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Inviter quelqu’un" subtitle="Il installe l’app, se connecte avec son numéro, c’est tout." width={500}
      footer={
        via === 'sms' ? <Button variant="primary" loading={sending} onClick={sms} icon={<MessageSquareText className="h-4 w-4" />}>Envoyer le SMS</Button>
        : via === 'lien' ? <Button variant="primary" onClick={copy} icon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}>{copied ? 'Copié' : 'Copier le lien'}</Button>
        : <Button variant="primary" onClick={() => { done(`Invitation ${roleDef.name.toLowerCase()} prête.`, 'qr'); onClose(); }}>C’est scanné</Button>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Prénom et nom"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Théo Martin" /></Field>
          <Field label="Rôle">
            <Select value={role} onChange={(e) => setRole(e.target.value as RoleKey)}>
              {ROLES.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
            </Select>
          </Field>
        </div>

        <div className="rounded-xl border border-line bg-sub/60 p-3 text-[12.5px] text-ink-2">
          <span className="font-medium text-ink">{roleDef.name} :</span> {roleDef.short}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {can.slice(0, 6).map((p) => (
              <span key={p.key} className="rounded-full border border-line bg-white px-2 py-0.5 text-[11.5px]">{p.label}{p.rights[role] !== 'oui' && <span className="text-ink-3"> · {RIGHT_LABEL[p.rights[role]].toLowerCase()}</span>}</span>
            ))}
          </div>
        </div>

        <Segmented<Via> value={via} onChange={setVia} className="w-full" options={[
          { value: 'qr', label: <><QrIcon className="h-3.5 w-3.5" />QR code</> },
          { value: 'sms', label: <><MessageSquareText className="h-3.5 w-3.5" />SMS</> },
          { value: 'lien', label: <><Link2 className="h-3.5 w-3.5" />Lien</> },
        ]} />

        {via === 'qr' && (
          <div className="flex flex-col items-center rounded-2xl border border-line p-5 text-center">
            <div className="rounded-xl border border-line p-2"><QrCode value={link} size={196} /></div>
            <p className="mt-3 text-[13.5px] font-medium">Faites scanner ce code avec l’appareil photo de son téléphone</p>
            <p className="mt-1 text-xs text-ink-3">Code d’invitation <span className="num font-medium text-ink-2">{code}</span> · valable 7 jours</p>
          </div>
        )}
        {via === 'sms' && (
          <div className="space-y-3">
            <Field label="Numéro de portable"><Input inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="06 12 34 56 78" /></Field>
            <div className="rounded-xl bg-sub p-3 text-[13px] leading-relaxed text-ink-2">
              « Bonjour {name.split(' ')[0] || '…'}, Benali Électricité vous invite sur Brix pour vos chantiers et vos heures. Touchez ce lien pour commencer : <span className="break-all text-brand">{link}</span> »
            </div>
          </div>
        )}
        {via === 'lien' && (
          <div className="rounded-xl border border-line p-3">
            <div className="break-all font-mono text-[12.5px] text-ink-2">{link}</div>
            <p className="mt-2 text-xs text-ink-3">À envoyer par WhatsApp, e-mail ou SMS. Le lien ne marche qu’une fois.</p>
          </div>
        )}
      </div>
    </Sheet>
  );
}
