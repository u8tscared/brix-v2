import { useState } from 'react';
import { Camera, Check, EyeOff, MapPin, Navigation, NotebookPen, Phone, Play, Square } from 'lucide-react';
import { Card, cn, toast } from '@/components/ui';
import { useBrix } from '@/lib/store';
import { todayISO } from '@/lib/format';
import { nowHHMM } from '../lib/timesheet';

const HIDDEN = ['Les prix d’achat et les marges', 'Les montants des devis et factures', 'La banque et la paie des autres', 'Les chantiers où il n’est pas affecté'];
const SHOWN = ['Ses chantiers du jour, avec l’adresse et l’itinéraire', 'Un gros bouton pour pointer, même avec des gants', 'Les photos et les notes du chantier', 'Ses heures, ses congés et ses habilitations'];

export function WorkerAppPreview() {
  const employees = useBrix((s) => s.employees);
  const events = useBrix((s) => s.events);
  const chantiers = useBrix((s) => s.chantiers);
  const clients = useBrix((s) => s.clients);
  const worker = employees.find((e) => e.role === 'ouvrier') ?? employees.find((e) => e.role !== 'patron') ?? employees[0];
  const [clocked, setClocked] = useState<string | null>(worker?.clockedInAt ?? null);
  const [notes, setNotes] = useState(['Prévoir 2 boîtes Batibox en plus pour la cuisine', 'Client absent jeudi matin, clé chez la gardienne']);
  const [draft, setDraft] = useState('');
  const [photos, setPhotos] = useState(5);
  if (!worker) return null;
  const today = events.filter((e) => e.employeeId === worker.id && e.date === todayISO()).sort((a, b) => a.start.localeCompare(b.start));

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-4 lg:order-1 lg:pt-4">
        <div>
          <h3 className="text-[18px] font-semibold">Ce que voit {worker.firstName} sur son téléphone</h3>
          <p className="mt-1 text-[13.5px] text-ink-2">Une app volontairement minuscule : ce qu’il doit faire aujourd’hui, et rien d’autre. Essayez les boutons, c’est l’écran réel.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Card className="p-4">
            <div className="mb-2 flex items-center gap-2 text-[13px] font-semibold"><Check className="h-4 w-4 text-ok" />Il voit</div>
            <ul className="space-y-1.5 text-[13px] text-ink-2">{SHOWN.map((s) => <li key={s}>{s}</li>)}</ul>
          </Card>
          <Card className="p-4">
            <div className="mb-2 flex items-center gap-2 text-[13px] font-semibold"><EyeOff className="h-4 w-4 text-ink-3" />Il ne voit pas</div>
            <ul className="space-y-1.5 text-[13px] text-ink-2">{HIDDEN.map((s) => <li key={s}>{s}</li>)}</ul>
          </Card>
        </div>
      </div>

      {/* Téléphone */}
      <div className="mx-auto w-full max-w-[360px] rounded-[46px] lg:order-2 border-[10px] border-[#17171f] bg-page shadow-pop">
        <div className="mx-auto mt-2 h-6 w-28 rounded-full bg-[#17171f]" />
        <div className="space-y-3 px-4 pb-6 pt-3">
          <div>
            <div className="text-xs text-ink-3">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
            <div className="font-display text-[22px] font-semibold">Bonjour {worker.firstName}</div>
          </div>

          <button
            onClick={() => {
              const t = nowHHMM();
              setClocked(clocked ? null : t);
              toast(clocked ? `Départ pointé à ${t}` : `Arrivée pointée à ${t}`);
            }}
            className={cn('flex h-[88px] w-full items-center gap-4 rounded-[22px] px-5 text-left text-white transition active:scale-[.98]', clocked ? 'bg-ink' : 'bg-ok')}
          >
            <span className="grid h-12 w-12 place-items-center rounded-full bg-white/15">{clocked ? <Square className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />}</span>
            <span>
              <span className="block text-[18px] font-semibold">{clocked ? 'Pointer mon départ' : 'Pointer mon arrivée'}</span>
              <span className="block text-[12.5px] text-white/75">{clocked ? `Arrivé à ${clocked.replace(':', ' h ')} · position vérifiée` : 'Position détectée sur le chantier'}</span>
            </span>
          </button>

          <div className="rounded-[18px] bg-white p-1 shadow-card">
            <div className="px-3 pb-1 pt-2 text-[12px] font-semibold text-ink-2">Mes chantiers du jour</div>
            {today.length === 0 && <div className="px-3 pb-3 text-[13px] text-ink-3">Rien de prévu aujourd’hui.</div>}
            {today.map((e) => {
              const ch = chantiers.find((c) => c.id === e.chantierId);
              const cl = clients.find((c) => c.id === ch?.clientId);
              return (
                <div key={e.id} className="flex items-center gap-3 border-t border-line px-3 py-2.5 first-of-type:border-0">
                  <div className="num w-10 shrink-0 whitespace-nowrap text-[12.5px] font-semibold text-ink-2">{e.start}</div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-medium">{e.title}</div>
                    <div className="flex items-center gap-1 truncate text-[11.5px] text-ink-3"><MapPin className="h-3 w-3 shrink-0" />{ch ? `${ch.address}, ${ch.city}` : 'Dépôt'}</div>
                  </div>
                  {cl && <a href={`tel:${cl.phone.replace(/\s/g, '')}`} aria-label="Appeler le client" className="grid h-11 w-11 place-items-center rounded-full bg-sub text-ink-2"><Phone className="h-4 w-4" /></a>}
                  {ch && <a href={`https://maps.google.com/?q=${encodeURIComponent(ch.address + ' ' + ch.city)}`} target="_blank" rel="noreferrer" aria-label="Itinéraire" className="grid h-11 w-11 place-items-center rounded-full bg-vi-50 text-vi-700"><Navigation className="h-4 w-4" /></a>}
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-2 rounded-[18px] bg-white p-3 shadow-card">
            <div>
              <div className="text-[12px] font-semibold text-ink-2">Photos du chantier</div>
              <div className="mt-2 flex gap-1.5">
                {Array.from({ length: Math.min(photos, 3) }).map((_, i) => (
                  <div key={i} className="h-11 w-11 rounded-lg" style={{ background: ['#e6e1d6', '#d9dde3', '#e9e4ef', '#dfe6dc'][i % 4] }} />
                ))}
                {photos > 3 && <div className="grid h-11 w-11 place-items-center rounded-lg bg-sub text-[12px] font-medium text-ink-2">+{photos - 3}</div>}
              </div>
            </div>
            <button onClick={() => { setPhotos((p) => p + 1); toast('Photo ajoutée au chantier (démo).'); }} className="grid h-14 w-14 place-items-center self-end rounded-2xl bg-ink text-white" aria-label="Prendre une photo"><Camera className="h-6 w-6" /></button>
          </div>

          <div className="rounded-[18px] bg-white p-3 shadow-card">
            <div className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-ink-2"><NotebookPen className="h-3.5 w-3.5" />Notes</div>
            <ul className="space-y-1.5 text-[13px]">{notes.map((n, i) => <li key={i} className="rounded-lg bg-sub px-2.5 py-1.5">{n}</li>)}</ul>
            <form onSubmit={(e) => { e.preventDefault(); if (draft.trim()) { setNotes([...notes, draft.trim()]); setDraft(''); } }} className="mt-2 flex gap-2">
              <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Ajouter une note…" className="h-11 min-w-0 flex-1 rounded-xl border border-line2 px-3 text-[13px] focus:outline-none focus:ring-4 focus:ring-vi-100" />
              <button className="h-11 rounded-xl bg-sub px-3 text-[13px] font-medium">Ajouter</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
