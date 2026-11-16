// Saisie, par l'artisan, d'une réponse reçue par téléphone ou au comptoir.
import { useEffect, useMemo, useState } from 'react';
import { Button, cn, Field, Input, Select, Sheet, toast } from '@/components/ui';
import { money } from '@/lib/format';
import { useAchats } from '../../data/store';
import type { Demande, Fournisseur } from '../../data/types';
import { ecrirePrix, lirePrix, saisieDecimale } from './commun';

export default function SaisieReponse({ d, fournisseurs, open, onClose }: { d: Demande; fournisseurs: Fournisseur[]; open: boolean; onClose: () => void }) {
  const repondre = useAchats((s) => s.repondre);
  const choix = d.destinataires.filter((x) => x.statut !== 'declinee');
  const [destId, setDestId] = useState('');
  const [prix, setPrix] = useState<Record<string, string>>({});
  const [port, setPort] = useState('');
  const [delai, setDelai] = useState('');

  const dest = d.destinataires.find((x) => x.id === destId);
  useEffect(() => {
    if (!open) return;
    const premier = choix.find((x) => x.statut !== 'repondue') ?? choix[0];
    setDestId(premier?.id ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  useEffect(() => {
    setPrix(Object.fromEntries(d.lignes.map((l) => [l.id, ecrirePrix(dest?.prix.find((p) => p.ligneId === l.id)?.prix)])));
    setPort(dest?.port != null ? ecrirePrix(dest.port) : '');
    setDelai(dest?.delaiJours != null ? String(dest.delaiJours) : '');
  }, [dest, d.lignes]);

  const total = useMemo(() => d.lignes.reduce((s, l) => s + (lirePrix(prix[l.id] ?? '') ?? 0) * l.quantite, 0) + (lirePrix(port) ?? 0), [prix, port, d.lignes]);
  const remplis = d.lignes.filter((l) => lirePrix(prix[l.id] ?? '') != null).length;
  const nom = (fid: string) => fournisseurs.find((f) => f.id === fid)?.nom ?? 'Fournisseur';

  const valider = () => {
    if (!dest) return;
    repondre(
      dest.token,
      { prix: d.lignes.map((l) => ({ ligneId: l.id, prix: lirePrix(prix[l.id] ?? '') })), port: lirePrix(port) ?? 0, delaiJours: delai ? Number(delai) : undefined, commentaire: 'Prix saisis par vous (téléphone ou comptoir)' },
      'artisan',
    );
    toast(`Prix de ${nom(dest.fournisseurId)} enregistrés. Le comparatif est à jour.`);
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Saisir une réponse"
      subtitle="Un fournisseur vous a donné ses prix par téléphone ? Notez-les ici, ils entrent dans le comparatif."
      width={520}
      footer={
        <>
          <span className="num mr-auto text-[13px] text-ink-2">
            Total <span className="font-semibold text-ink">{money(total)}</span> HT
          </span>
          <Button variant="ghost" className="h-11 sm:h-10" onClick={onClose}>Annuler</Button>
          <Button variant="primary" className="h-11 sm:h-10" disabled={!dest || remplis === 0} onClick={valider}>Enregistrer</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Fournisseur">
          <Select value={destId} onChange={(e) => setDestId(e.target.value)}>
            {choix.map((x) => (
              <option key={x.id} value={x.id}>
                {nom(x.fournisseurId)}
                {x.statut === 'repondue' ? ' (déjà répondu, corriger)' : ''}
              </option>
            ))}
          </Select>
        </Field>

        <div>
          <div className="mb-1.5 flex items-baseline justify-between text-[12.5px] font-medium text-ink-2">
            <span>Prix unitaire HT</span>
            <span className="text-ink-3">vide = pas disponible</span>
          </div>
          <ul className="overflow-hidden rounded-[14px] border border-line">
            {d.lignes.map((l) => {
              const v = prix[l.id] ?? '';
              return (
                <li key={l.id} className="flex items-center gap-3 border-b border-line px-3.5 py-2 last:border-b-0">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] leading-snug">{l.designation}</span>
                    <span className="num text-[12px] text-ink-3">
                      {String(l.quantite).replace('.', ',')} {l.unite}
                      {l.prixCible != null && ` · prévu ${money(l.prixCible)}`}
                    </span>
                  </span>
                  <Input
                    inputMode="decimal"
                    value={v}
                    onChange={(e) => setPrix({ ...prix, [l.id]: saisieDecimale(e.target.value) })}
                    placeholder="0,00"
                    suffix="€"
                    aria-label={`Prix de ${l.designation}`}
                    className={cn('w-[112px] shrink-0 [&_input]:text-right [&_input]:num', !v && '[&_input]:bg-[#fafafc]')}
                  />
                </li>
              );
            })}
          </ul>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Frais de port HT">
            <Input inputMode="decimal" value={port} onChange={(e) => setPort(saisieDecimale(e.target.value))} placeholder="0,00" suffix="€" />
          </Field>
          <Field label="Délai de livraison">
            <Input inputMode="numeric" value={delai} onChange={(e) => setDelai(e.target.value.replace(/\D/g, '').slice(0, 2))} placeholder="2" suffix="jours" />
          </Field>
        </div>
      </div>
    </Sheet>
  );
}
