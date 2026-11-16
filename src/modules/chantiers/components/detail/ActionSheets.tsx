import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, FileSignature, Loader2, Mic, Minus, Plus, Square, Truck } from 'lucide-react';
import { Button, Field, Input, Sheet, Textarea, cn, toast } from '@/components/ui';
import { useBrix } from '@/lib/store';
import { dayOffset, money, todayISO, uid } from '@/lib/format';
import type { Devis, DevisLigne } from '@/lib/types';
import type { ChantierView } from '../../lib/useChantier';
import { useChantiersLocal } from '../../store';
import { sendAvenant, sendReport } from '../../service';
import { useDictation } from '../common/useDictation';
import { PhotoArt } from '../common/PhotoArt';

/* ------------------------------- Note vocale ------------------------------- */

export function VoiceNoteSheet({ v, open, onClose }: { v: ChantierView; open: boolean; onClose: () => void }) {
  const me = useBrix((s) => s.employees[0]?.id ?? 'moi');
  const addJournal = useChantiersLocal((s) => s.addJournal);
  const d = useDictation({ continuous: true });
  const [dur, setDur] = useState(0);

  useEffect(() => {
    if (open) {
      d.setText('');
      d.start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const stop = () => {
    setDur(d.seconds);
    d.stop();
  };
  const close = () => {
    if (d.listening) d.stop();
    onClose();
  };
  const save = () => {
    addJournal({ id: uid('j'), chantierId: v.ch.id, at: new Date().toISOString(), kind: 'vocal', author: me, text: d.text.trim(), duration: Math.max(dur, d.seconds, 3) });
    toast('Note vocale ajoutée au journal');
    onClose();
  };
  const intents = [
    /manque|commander|commande|rupture/i.test(d.text) && { label: 'Ajouter à la prochaine commande', icon: <Truck className="h-3.5 w-3.5" /> },
    /en plus|de plus|supplément|avenant|rajout/i.test(d.text) && { label: 'Préparer un avenant', icon: <FileSignature className="h-3.5 w-3.5" /> },
  ].filter(Boolean) as { label: string; icon: React.ReactNode }[];

  return (
    <Sheet open={open} onClose={close} title="Note vocale" subtitle={v.ch.name} width={460} footer={<><Button variant="ghost" onClick={close}>Annuler</Button><Button variant="primary" disabled={!d.text.trim() || d.listening || d.busy} onClick={save}>Enregistrer la note</Button></>}>
      <div className="flex flex-col items-center gap-4 py-2">
        <button
          onClick={d.listening ? stop : () => d.start()}
          disabled={d.busy}
          className={cn('relative grid h-24 w-24 place-items-center rounded-full text-white transition active:scale-95', d.listening ? 'bg-bad' : 'bg-ink')}
          aria-label={d.listening ? 'Arrêter' : 'Parler'}
        >
          {d.listening && <span className="absolute inset-0 animate-ping rounded-full bg-bad/30" />}
          {d.busy ? <Loader2 className="h-8 w-8 animate-spin" /> : d.listening ? <Square className="h-7 w-7 fill-white" /> : <Mic className="h-8 w-8" />}
        </button>
        <div className="flex h-8 items-center gap-[3px]" aria-hidden>
          {Array.from({ length: 28 }, (_, i) => (
            <i key={i} className={cn('w-[3px] origin-center rounded bg-vi-300', d.listening ? 'animate-wave' : 'opacity-40')} style={{ height: `${30 + ((i * 37) % 70)}%`, animationDelay: `${(i % 7) * 0.09}s` }} />
          ))}
        </div>
        <div className="num text-[13px] text-ink-2">
          {d.busy ? 'Transcription en cours…' : d.listening ? `Je vous écoute · ${Math.floor(d.seconds / 60)}:${String(d.seconds % 60).padStart(2, '0')}` : d.text ? 'Relisez puis enregistrez' : 'Appuyez pour parler'}
        </div>
      </div>
      <Field label="Texte transcrit" hint={d.native ? undefined : 'Démo : la transcription est simulée sur ce navigateur.'}>
        <Textarea value={d.text} onChange={(e) => d.setText(e.target.value)} placeholder="Parlez, le texte s’écrit ici." />
      </Field>
      {intents.length > 0 && !d.listening && (
        <div className="mt-3 flex flex-wrap gap-2">
          {intents.map((i) => (
            <button key={i.label} onClick={() => toast(`${i.label} : noté pour Bob (démo)`, 'info')} className="flex h-10 items-center gap-1.5 rounded-full bg-vi-50 px-3.5 text-[13px] font-medium text-vi-700 hover:bg-vi-100">
              {i.icon} {i.label}
            </button>
          ))}
        </div>
      )}
    </Sheet>
  );
}

/* --------------------------- Rapport d'intervention -------------------------- */

export function ReportSheet({ v, open, onClose }: { v: ChantierView; open: boolean; onClose: () => void }) {
  const me = useBrix((s) => s.employees[0]?.id ?? 'moi');
  const allPhotos = useChantiersLocal((s) => s.photos);
  const allJournal = useChantiersLocal((s) => s.journal);
  const addJournal = useChantiersLocal((s) => s.addJournal);
  const photos = useMemo(() => allPhotos.filter((p) => p.chantierId === v.ch.id).sort((a, b) => b.at.localeCompare(a.at)), [allPhotos, v.ch.id]);
  const journal = useMemo(() => allJournal.filter((j) => j.chantierId === v.ch.id && j.at >= dayOffset(-2) && (j.kind === 'vocal' || j.kind === 'note') && j.author !== 'client'), [allJournal, v.ch.id]);
  const [sel, setSel] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const first = v.client?.kind === 'pro' ? v.client.contact ?? v.client.name : v.client?.name.split(' ')[0];

  useEffect(() => {
    if (!open) return;
    setSel(photos.slice(0, 4).map((p) => p.id));
    const done = journal.map((j) => `• ${j.text}`).join('\n');
    setText(
      `Bonjour ${first ?? ''},\n\nVoici le point sur votre chantier « ${v.ch.name.split(' · ')[0]} ». L'avancement est de ${v.ch.progress} %.\n\n${done ? `Ces derniers jours :\n${done}\n\n` : ''}Prochaine étape : ${(v.ch.nextStep.charAt(0).toLowerCase() + v.ch.nextStep.slice(1)).replace(/\.$/, '')}.\n\nBonne journée,\n${useBrix.getState().user.firstName}`,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const send = async () => {
    setSending(true);
    await sendReport({ chantierId: v.ch.id, to: v.client?.email ?? '', photos: sel.length, text });
    setSending(false);
    addJournal({ id: uid('j'), chantierId: v.ch.id, at: new Date().toISOString(), kind: 'rapport', author: me, text: `Rapport d’intervention envoyé à ${v.client?.name} (${sel.length} photo${sel.length > 1 ? 's' : ''}).` });
    toast(`Rapport envoyé à ${v.client?.email ?? 'votre client'}`);
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Rapport d’intervention" subtitle={`Envoyé par e-mail à ${v.client?.email ?? 'votre client'}, visible dans son espace client.`} width={560} footer={<><Button variant="ghost" onClick={onClose}>Annuler</Button><Button variant="primary" loading={sending} onClick={send}>Envoyer au client</Button></>}>
      <div className="space-y-4">
        <Field label="Message" hint="Rédigé par Bob à partir du journal. Modifiez-le librement.">
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={11} style={{ minHeight: 230 }} />
        </Field>
        <div>
          <div className="mb-1.5 flex items-center justify-between text-[12.5px] font-medium text-ink-2">
            <span>Photos jointes</span>
            <span className="text-ink-3">{sel.length} sur {photos.length}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {photos.slice(0, 12).map((p) => {
              const on = sel.includes(p.id);
              return (
                <button key={p.id} onClick={() => setSel((s) => (on ? s.filter((x) => x !== p.id) : [...s, p.id]))} className={cn('relative aspect-[4/3] overflow-hidden rounded-lg ring-2 transition', on ? 'ring-ink' : 'ring-transparent opacity-60')}>
                  <PhotoArt art={p.art} phase={p.phase} seed={p.id} src={p.src} alt={p.caption} />
                  {on && <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-ink text-white"><Check className="h-3 w-3" /></span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Sheet>
  );
}

/* ---------------------------------- Avenant --------------------------------- */

export function AvenantSheet({ v, open, onClose }: { v: ChantierView; open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { company, devis, upsertDevis, nextNumber } = useBrix();
  const addJournal = useChantiersLocal((s) => s.addJournal);
  const suggested = Math.max(2, Math.round(v.m.spentHours - (v.m.plannedHours * v.ch.progress) / 100) || 4);
  const [hours, setHours] = useState(suggested);
  const [materials, setMaterials] = useState(0);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const rate = company.hourlyRate || 55;
  const vat = company.defaultVat || 10;
  const count = devis.filter((d) => d.chantierId === v.ch.id && d.title.startsWith('Avenant')).length;

  useEffect(() => {
    if (open) {
      setHours(suggested);
      setMaterials(0);
      setReason(v.m.marginDelta < -6 ? 'Temps supplémentaire constaté sur place (conditions d’accès, hauteur sous plafond).' : '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const build = (status: Devis['status']): Devis => {
    const lines: DevisLigne[] = [
      { id: uid('l'), kind: 'section', designation: `Avenant n°${count + 1}`, quantity: 0, unit: '', unitPriceHt: 0, unitCostHt: 0, vatRate: 0 },
      { id: uid('l'), kind: 'main_oeuvre', designation: 'Main d’œuvre supplémentaire', detail: reason || undefined, quantity: hours, unit: 'h', unitPriceHt: rate, unitCostHt: 31.5, vatRate: vat, source: 'taux' },
    ];
    if (materials > 0) lines.push({ id: uid('l'), kind: 'fourniture', designation: 'Fournitures complémentaires', quantity: 1, unit: 'forfait', unitPriceHt: materials, unitCostHt: Math.round(materials * 0.7), vatRate: vat, source: 'manuel' });
    return { id: uid('q'), number: nextNumber('devis'), clientId: v.ch.clientId, chantierId: v.ch.id, title: `Avenant n°${count + 1} · ${v.ch.name.split(' · ')[0]}`, status, createdAt: todayISO(), sentAt: status === 'envoye' ? todayISO() : undefined, validityDays: 15, depositPercent: 0, lines, notes: reason };
  };

  const total = hours * rate + materials;

  const create = async (send: boolean) => {
    setBusy(true);
    const d = build(send ? 'envoye' : 'brouillon');
    upsertDevis(d);
    if (send) await sendAvenant({ devisId: d.id, to: v.client?.email ?? '' });
    addJournal({ id: uid('j'), chantierId: v.ch.id, at: new Date().toISOString(), kind: 'avenant', author: 'bob', text: `Avenant ${d.number} ${send ? 'envoyé pour signature' : 'préparé'} : ${hours} h${materials ? ' et fournitures' : ''}, ${money(total)} HT.` });
    setBusy(false);
    toast(send ? `Avenant envoyé à ${v.client?.name} pour signature` : 'Avenant créé en brouillon');
    onClose();
    if (!send) navigate(`/app/devis/${d.id}`);
  };

  return (
    <Sheet open={open} onClose={onClose} title="Avenant" subtitle="Faites signer le travail en plus avant de le faire." width={460} footer={<><Button variant="ghost" onClick={() => create(false)} disabled={busy}>Ouvrir en brouillon</Button><Button variant="primary" loading={busy} onClick={() => create(true)}>Envoyer pour signature</Button></>}>
      <div className="space-y-5">
        <div>
          <span className="mb-1.5 block text-[12.5px] font-medium text-ink-2">Heures en plus</span>
          <div className="flex items-center gap-3">
            <Button size="icon" onClick={() => setHours((h) => Math.max(1, h - 1))} aria-label="Moins"><Minus className="h-4 w-4" /></Button>
            <span className="num w-20 text-center text-[28px] font-semibold">{hours} h</span>
            <Button size="icon" onClick={() => setHours((h) => h + 1)} aria-label="Plus"><Plus className="h-4 w-4" /></Button>
            <span className="text-[13px] text-ink-3">à {money(rate)} / h</span>
          </div>
          {v.m.marginDelta < -6 && <p className="mt-2 text-xs text-ink-2">Bob propose {suggested} h : c’est l’écart entre les heures passées et l’avancement.</p>}
        </div>
        <Field label="Fournitures en plus (HT)">
          <Input type="number" inputMode="decimal" min={0} value={materials || ''} onChange={(e) => setMaterials(Number(e.target.value) || 0)} placeholder="0" suffix="€" />
        </Field>
        <Field label="Motif, lu par le client">
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex. : prise supplémentaire derrière le canapé, demandée le 12/11." />
        </Field>
        <div className="flex items-center justify-between rounded-xl bg-sub px-4 py-3">
          <span className="text-[13px] text-ink-2">Total de l’avenant</span>
          <span className="num text-[18px] font-semibold">{money(total)} HT</span>
        </div>
      </div>
    </Sheet>
  );
}
