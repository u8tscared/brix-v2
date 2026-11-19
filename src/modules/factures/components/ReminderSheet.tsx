// Relance rédigée par Brix AI, modifiable avant envoi (mail, SMS ou mise en demeure).

import { useEffect, useState } from 'react';
import { Mail, MessageSquareText, Printer, RotateCcw, Send, Stamp } from 'lucide-react';
import { Button, Segmented, Sheet, Textarea, toast } from '@/components/ui';
import { BrandTile } from '@/components/brand/Logo';
import { money } from '@/lib/format';
import { useBrix } from '@/lib/store';
import type { Facture } from '@/lib/types';
import { saveFacture } from '../lib/actions';
import { amounts, daysLate } from '../lib/model';
import { draftReminder, sendReminder } from '../service';
import { useFactures } from '../store';

type Level = 1 | 2 | 3;
const CHANNEL: Record<Level, 'email' | 'sms' | 'courrier'> = { 1: 'email', 2: 'sms', 3: 'courrier' };

export function ReminderSheet({ f, open, onClose, level: initial }: { f: Facture; open: boolean; onClose: () => void; level?: Level }) {
  const s = useBrix();
  const client = s.clients.find((c) => c.id === f.clientId);
  const tone = useFactures((x) => x.relanceTone);
  const addReminder = useFactures((x) => x.addReminder);
  const suggested: Level = initial ?? (f.remindersSent >= 2 || daysLate(f) >= 15 ? 3 : f.remindersSent >= 1 || daysLate(f) >= 7 ? 2 : 1);
  const [level, setLevel] = useState<Level>(suggested);
  const [text, setText] = useState('');
  const [drafting, setDrafting] = useState(false);
  const [sending, setSending] = useState(false);

  const draft = async (l: Level) => {
    setDrafting(true);
    setText(await draftReminder(f, client, s.company, l, tone, s.user.firstName || 'Karim'));
    setDrafting(false);
  };

  useEffect(() => {
    if (open) {
      setLevel(suggested);
      draft(suggested);
    }
  }, [open]);

  const send = async () => {
    setSending(true);
    await sendReminder(f, CHANNEL[level]);
    addReminder({ factureId: f.id, channel: CHANNEL[level], level, text, by: 'moi' });
    saveFacture({ ...f, remindersSent: f.remindersSent + 1 });
    setSending(false);
    toast(level === 3 ? 'Mise en demeure prête : imprimez-la ou envoyez-la en recommandé' : level === 2 ? `SMS envoyé à ${client?.name}` : `Relance envoyée à ${client?.email}`);
    onClose();
  };

  const print = () => {
    const w = window.open('', '_blank', 'width=720,height=900');
    if (!w) return;
    w.document.write(`<pre style="font:14px/1.6 Georgia,serif;white-space:pre-wrap;max-width:640px;margin:48px auto">${text.replace(/</g, '&lt;')}</pre>`);
    w.document.close();
    w.print();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Relancer ${client?.name ?? ''}`}
      subtitle={`${f.number} · ${money(amounts(f).remaining)} · ${daysLate(f) ? `${daysLate(f)} jour${daysLate(f) > 1 ? 's' : ''} de retard` : 'pas encore en retard'} · ${f.remindersSent ? `${f.remindersSent} relance${f.remindersSent > 1 ? 's' : ''} déjà envoyée${f.remindersSent > 1 ? 's' : ''}` : 'aucune relance envoyée'}`}
      width={560}
      footer={
        <>
          {level === 3 && (
            <Button variant="secondary" icon={<Printer className="h-4 w-4" />} onClick={print}>
              Imprimer
            </Button>
          )}
          <Button variant="dawn" loading={sending} disabled={drafting || !text.trim()} icon={level === 3 ? <Stamp className="h-4 w-4" /> : <Send className="h-4 w-4" />} onClick={send}>
            {level === 1 ? 'Envoyer le mail' : level === 2 ? 'Envoyer le SMS' : 'Envoyer en recommandé'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Segmented
          value={String(level) as '1' | '2' | '3'}
          onChange={(v) => {
            const l = Number(v) as Level;
            setLevel(l);
            draft(l);
          }}
          className="w-full [&>button]:flex-1 [&>button]:justify-center"
          options={[
            { value: '1', label: <><Mail className="h-3.5 w-3.5" /> Mail</> },
            { value: '2', label: <><MessageSquareText className="h-3.5 w-3.5" /> SMS</> },
            { value: '3', label: <><Stamp className="h-3.5 w-3.5" /> Mise en demeure</> },
          ]}
        />
        <div className="flex items-center gap-2.5 rounded-card-sm bg-dawn-mist px-3 py-2.5 text-[12.5px] text-ink-2 shadow-halo-sm">
          <BrandTile size={24} />
          {drafting ? 'Brix AI rédige…' : 'Brix AI a rédigé ce message dans votre ton. Modifiez-le si besoin.'}
          <button onClick={() => draft(level)} className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 font-medium text-deep-v transition hover:bg-pale-v">
            <RotateCcw className="h-3.5 w-3.5" /> Autre version
          </button>
        </div>
        <Textarea value={drafting ? '' : text} placeholder={drafting ? 'Brix AI rédige…' : ''} onChange={(e) => setText(e.target.value)} style={{ minHeight: level === 2 ? 140 : 340 }} />
        {level === 2 && <div className="text-right text-[11.5px] text-ink-3">{text.length} caractères · {Math.max(1, Math.ceil(text.length / 160))} SMS</div>}
        {level === 3 && <p className="rounded-field bg-pale-n px-3.5 py-2.5 text-[12px] text-ink-2">Envoi en lettre recommandée électronique (AR24) en un clic, ou imprimez-la. En démo, rien n’est envoyé.</p>}
      </div>
    </Sheet>
  );
}
