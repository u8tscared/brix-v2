import { useEffect, useState } from 'react';
import { Button, Field, Input, Segmented, Select, Sheet, toast } from '@/components/ui';
import { useBrix } from '@/lib/store';
import { LOCATIONS, type LocationKey } from '../data';
import { useAchats } from '../store';

type Kind = 'sortie' | 'transfert' | 'entree';

export function MoveSheet({ open, onClose, articleId, kind: initialKind = 'sortie' }: { open: boolean; onClose: () => void; articleId?: string; kind?: Kind }) {
  const { articles, moveStock } = useAchats();
  const allChantiers = useBrix((s) => s.chantiers);
  const chantiers = allChantiers.filter((c) => c.status !== 'termine');
  const [kind, setKind] = useState<Kind>(initialKind);
  const [art, setArt] = useState(articleId ?? articles[0]?.id);
  const [from, setFrom] = useState<LocationKey>('depot');
  const [to, setTo] = useState<LocationKey>('van_yanis');
  const [ch, setCh] = useState(chantiers[0]?.id);
  const [qty, setQty] = useState('1');
  useEffect(() => {
    if (!open) return;
    setKind(initialKind);
    if (articleId) setArt(articleId);
  }, [open, articleId, initialKind]);
  const a = articles.find((x) => x.id === art);
  const n = Number(qty.replace(',', '.')) || 0;
  const tooMuch = kind !== 'entree' && a && n > a.qty[from];

  const submit = () => {
    if (!a || n <= 0) return;
    moveStock({ articleId: a.id, qty: n, from, to: kind === 'transfert' ? to : undefined, chantierId: kind === 'sortie' ? ch : undefined, employeeId: 'e_karim', kind });
    const where = LOCATIONS.find((l) => l.key === from)!.short;
    toast(kind === 'sortie' ? `${n} ${a.unit} sorti${n > 1 ? 's' : ''} du ${where}, imputé${n > 1 ? 's' : ''} au chantier.` : kind === 'transfert' ? `${n} ${a.unit} mis dans le ${LOCATIONS.find((l) => l.key === to)!.short}.` : `${n} ${a.unit} entré${n > 1 ? 's' : ''} au ${where}.`);
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Mouvement de stock" subtitle="Ce qui sort pour un chantier est ajouté à son coût réel." width={460}
      footer={<><Button variant="ghost" onClick={onClose}>Annuler</Button><Button variant="primary" disabled={!n || !!tooMuch} onClick={submit}>Enregistrer</Button></>}
    >
      <div className="space-y-4">
        <Segmented<Kind> value={kind} onChange={setKind} className="w-full" options={[{ value: 'sortie', label: 'Sortie chantier' }, { value: 'transfert', label: 'Remplir un camion' }, { value: 'entree', label: 'Réception' }]} />
        <Field label="Article">
          <Select value={art} onChange={(e) => setArt(e.target.value)}>{articles.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={kind === 'entree' ? 'Où' : 'Depuis'}>
            <Select value={from} onChange={(e) => setFrom(e.target.value as LocationKey)}>{LOCATIONS.map((l) => <option key={l.key} value={l.key}>{l.short}{a && kind !== 'entree' ? ` (${a.qty[l.key]})` : ''}</option>)}</Select>
          </Field>
          <Field label="Quantité" hint={tooMuch ? `Il n’y en a que ${a!.qty[from]}.` : a?.unit}>
            <Input inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} />
          </Field>
        </div>
        {kind === 'sortie' && (
          <Field label="Pour le chantier">
            <Select value={ch} onChange={(e) => setCh(e.target.value)}>{chantiers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
          </Field>
        )}
        {kind === 'transfert' && (
          <Field label="Vers">
            <Select value={to} onChange={(e) => setTo(e.target.value as LocationKey)}>{LOCATIONS.filter((l) => l.key !== from).map((l) => <option key={l.key} value={l.key}>{l.name}</option>)}</Select>
          </Field>
        )}
      </div>
    </Sheet>
  );
}
