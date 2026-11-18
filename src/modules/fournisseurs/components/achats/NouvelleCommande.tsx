// Bon de commande rapide : un fournisseur, quelques lignes, où et quand livrer. Envoyé dès validation.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { Button, Field, Input, Segmented, Select, Sheet, toast } from '@/components/ui';
import { dayOffset, money } from '@/lib/format';
import { useBrix } from '@/lib/store';
import { useAchats } from '../../data/store';
import type { ModeLivraison } from '../../data/types';
import { lireNombre, MODES, normaliser } from './commun';

interface Ligne { designation: string; reference?: string; quantite: string; unite: string; prix: string }
const vide = (): Ligne => ({ designation: '', quantite: '1', unite: 'u', prix: '' });

export default function NouvelleCommande({ open, onClose }: { open: boolean; onClose: () => void }) {
  const nav = useNavigate();
  const { fournisseurs, catalogue, creerCommande, envoyerCommande } = useAchats();
  const chantiers = useBrix((s) => s.chantiers);
  const tries = useMemo(() => [...fournisseurs].sort((a, b) => Number(!!b.favori) - Number(!!a.favori) || a.nom.localeCompare(b.nom)), [fournisseurs]);

  const [fid, setFid] = useState('');
  const [lignes, setLignes] = useState<Ligne[]>([vide()]);
  const [chantierId, setChantierId] = useState('');
  const [date, setDate] = useState(dayOffset(2));
  const [mode, setMode] = useState<ModeLivraison>('livraison_chantier');

  useEffect(() => {
    if (!open) return;
    setFid(tries[0]?.id ?? '');
    setLignes([vide()]);
    setChantierId('');
    setDate(dayOffset(2));
    setMode('livraison_chantier');
  }, [open, tries]);

  const articles = useMemo(() => catalogue.filter((a) => a.fournisseurId === fid), [catalogue, fid]);
  const f = fournisseurs.find((x) => x.id === fid);
  const chantier = chantiers.find((c) => c.id === chantierId);

  const maj = (i: number, patch: Partial<Ligne>) => setLignes((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const choisirDesignation = (i: number, v: string) => {
    const a = articles.find((x) => normaliser(x.designation) === normaliser(v));
    maj(i, a ? { designation: a.designation, reference: a.reference, unite: a.unite, prix: String(a.prixNet).replace('.', ',') } : { designation: v, reference: undefined });
  };

  const valides = lignes.filter((l) => l.designation.trim() && (lireNombre(l.quantite) ?? 0) > 0);
  const total = valides.reduce((s, l) => s + (lireNombre(l.quantite) ?? 0) * (lireNombre(l.prix) ?? 0), 0);
  const franco = f?.franco && total > 0 && total < f.franco ? f.franco - total : 0;

  const envoyer = () => {
    if (!f || !valides.length) return;
    const adresse = mode === 'livraison_chantier' && chantier ? `${chantier.address}, ${chantier.city}` : undefined;
    const id = creerCommande({
      fournisseurId: f.id,
      chantierId: chantierId || undefined,
      devisId: chantier?.devisId,
      adresse,
      livraisonPrevue: date || undefined,
      mode,
      lignes: valides.map((l) => ({ designation: l.designation.trim(), reference: l.reference, quantite: lireNombre(l.quantite)!, unite: l.unite.trim() || 'u', prix: lireNombre(l.prix) ?? 0 })),
    });
    envoyerCommande(id);
    toast(`Commande envoyée à ${f.nom}`);
    onClose();
    nav(`/app/fournisseurs/commandes/${id}`);
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      width={600}
      title="Nouvelle commande"
      subtitle="Votre fournisseur la reçoit par e-mail, avec un lien pour la confirmer."
      footer={
        <>
          <div className="mr-auto min-w-0">
            <div className="text-[11.5px] text-ink-3">Total HT</div>
            <div className="num text-[17px] font-semibold">{money(total)}</div>
          </div>
          <Button variant="ghost" onClick={onClose} className="hidden sm:inline-flex">Annuler</Button>
          <Button variant="primary" size="lg" disabled={!f || !valides.length} onClick={envoyer}>Envoyer la commande</Button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="Fournisseur">
          <Select value={fid} onChange={(e) => setFid(e.target.value)}>
            {tries.length === 0 && <option value="">Ajoutez d’abord un fournisseur</option>}
            {tries.map((x) => <option key={x.id} value={x.id}>{x.nom}</option>)}
          </Select>
        </Field>

        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-[12.5px] font-medium text-ink-2">Articles</span>
            {articles.length > 0 && <span className="text-xs text-ink-3">Tapez un nom : ses prix chez {f?.nom.split(' ')[0]} se remplissent seuls</span>}
          </div>
          <datalist id="articles-commande">{articles.map((a) => <option key={a.id} value={a.designation} />)}</datalist>
          <div className="space-y-2.5">
            {lignes.map((l, i) => (
              <div key={i} className="rounded-card-sm bg-halo-track/60 p-3">
                <div className="flex gap-2">
                  <Input list="articles-commande" placeholder="Désignation, ex. disjoncteur 16 A" value={l.designation} onChange={(e) => choisirDesignation(i, e.target.value)} className="min-w-0 flex-1" aria-label="Désignation" />
                  {lignes.length > 1 && (
                    <Button variant="ghost" size="icon" aria-label="Retirer la ligne" onClick={() => setLignes((ls) => ls.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
                  )}
                </div>
                <div className="mt-2 grid grid-cols-[1fr_0.8fr_1.3fr] gap-2">
                  <Input inputMode="decimal" aria-label="Quantité" value={l.quantite} onChange={(e) => maj(i, { quantite: e.target.value })} className="num" />
                  <Input aria-label="Unité" value={l.unite} onChange={(e) => maj(i, { unite: e.target.value })} />
                  <Input inputMode="decimal" aria-label="Prix unitaire HT" placeholder="Prix unitaire" value={l.prix} onChange={(e) => maj(i, { prix: e.target.value })} suffix="€ HT" className="num" />
                </div>
                {l.reference && <div className="mt-1.5 px-1 text-[11.5px] text-ink-3">Réf. {l.reference}</div>}
              </div>
            ))}
          </div>
          <Button variant="ghost" size="sm" className="mt-2" icon={<Plus className="h-4 w-4" />} onClick={() => setLignes((ls) => [...ls, vide()])}>Ajouter un article</Button>
          {franco > 0 && <p className="mt-2 text-xs text-warn">Encore {money(franco)} pour atteindre le franco de port de {f?.nom.split(' ')[0]}.</p>}
        </div>

        <div className="space-y-2">
          <span className="block text-[12.5px] font-medium text-ink-2">Livraison</span>
          <Segmented value={mode} onChange={setMode} options={(Object.keys(MODES) as ModeLivraison[]).map((m) => ({ value: m, label: MODES[m].court }))} className="w-full" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Chantier" hint={mode === 'livraison_chantier' && chantier ? `${chantier.address}, ${chantier.city}` : 'Pour retrouver la dépense dans le chantier'}>
            <Select value={chantierId} onChange={(e) => setChantierId(e.target.value)}>
              <option value="">Aucun chantier</option>
              {chantiers.filter((c) => c.status !== 'termine').map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label={mode === 'retrait_agence' ? 'Retrait souhaité le' : 'Livraison souhaitée le'}>
            <Input type="date" value={date} min={dayOffset(0)} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
      </div>
    </Sheet>
  );
}
