// Ajout / modification d'un fournisseur : enseigne connue ou autre, coordonnées du comptoir, liaison API.
import { useEffect, useMemo, useState } from 'react';
import { Check, Plug, Trash2 } from 'lucide-react';
import { Button, Field, Input, Sheet, cn, toast } from '@/components/ui';
import { CONNECTEURS } from '../../../../../worker/src/modules/fournisseurs/connecteurs/registre';
import { useAchats } from '../../data/store';
import type { Fournisseur } from '../../data/types';
import { FournisseurPastille } from '../ui';
import { lireNombre, METIERS } from './commun';

const ENSEIGNES = CONNECTEURS.filter((c) => c.mode === 'api_fournisseur' && c.champs.some((ch) => ch.cle === 'numero_compte_client'));
const CODE = /^BRX-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Form { enseigne: string; nom: string; agence: string; contact: string; email: string; telephone: string; numeroCompte: string; franco: string; delaiJours: string; metiers: string[] }
const depuis = (f?: Fournisseur): Form => ({
  enseigne: f ? f.enseigne ?? '' : '',
  nom: f?.nom ?? '',
  agence: f?.agence ?? '',
  contact: f?.contact ?? '',
  email: f?.email ?? '',
  telephone: f?.telephone ?? '',
  numeroCompte: f?.numeroCompte ?? '',
  franco: f?.franco != null ? String(f.franco) : '',
  delaiJours: f?.delaiJours != null ? String(f.delaiJours) : '',
  metiers: f?.metiers ?? [],
});

export default function FicheFournisseur({ open, onClose, fournisseur }: { open: boolean; onClose: () => void; fournisseur?: Fournisseur }) {
  const { ajouterFournisseur, modifierFournisseur, supprimerFournisseur, relierPartenaire } = useAchats();
  const live = useAchats((s) => s.fournisseurs.find((x) => x.id === fournisseur?.id));
  const [form, setForm] = useState<Form>(depuis());
  const [code, setCode] = useState('');
  const [retour, setRetour] = useState<{ ok: boolean; message: string } | null>(null);
  const [confirmer, setConfirmer] = useState(false);
  const [essai, setEssai] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(depuis(fournisseur));
    setCode('');
    setRetour(null);
    setConfirmer(false);
    setEssai(false);
  }, [open, fournisseur]);

  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));
  const choisirEnseigne = (cle: string) => {
    const e = ENSEIGNES.find((x) => x.cle === cle);
    set({ enseigne: cle, nom: e ? e.nom : '', metiers: e?.metiers.length ? e.metiers.filter((m) => METIERS.some((x) => x.cle === m)) : form.metiers });
  };
  const emailOk = EMAIL.test(form.email.trim());
  const valide = form.nom.trim() && emailOk;
  const enseigneDef = useMemo(() => ENSEIGNES.find((e) => e.cle === form.enseigne), [form.enseigne]);

  const enregistrer = () => {
    setEssai(true);
    if (!valide) return;
    if (code.trim() && !CODE.test(code.trim())) {
      setRetour({ ok: false, message: 'Le code ressemble à BRX-7KQ2-M9XA. Demandez-le à votre fournisseur.' });
      return;
    }
    const data = {
      nom: form.nom.trim(),
      enseigne: form.enseigne || undefined,
      agence: form.agence.trim() || undefined,
      contact: form.contact.trim() || undefined,
      email: form.email.trim(),
      telephone: form.telephone.trim() || undefined,
      numeroCompte: form.numeroCompte.trim() || undefined,
      franco: lireNombre(form.franco) ?? undefined,
      delaiJours: lireNombre(form.delaiJours) ?? undefined,
      metiers: form.metiers,
    };
    let id = fournisseur?.id;
    if (id) modifierFournisseur(id, { ...data, connecteur: live?.connecteur === 'api_brix' ? 'api_brix' : form.enseigne || 'email' });
    else id = ajouterFournisseur({ ...data, connecteur: form.enseigne || 'email' });
    if (code.trim()) relierPartenaire(id, code);
    toast(fournisseur ? 'Fournisseur mis à jour' : `${data.nom} ajouté à vos fournisseurs`);
    onClose();
  };

  const relier = () => {
    if (!fournisseur) return;
    const r = relierPartenaire(fournisseur.id, code);
    setRetour(r);
    if (r.ok) setCode('');
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      width={560}
      title={fournisseur ? 'Modifier le fournisseur' : 'Ajouter un fournisseur'}
      subtitle={fournisseur ? fournisseur.nom : 'Une agence, un comptoir ou un commercial à qui vous achetez.'}
      footer={
        <>
          {fournisseur && (
            confirmer ? (
              <Button variant="danger" className="mr-auto" onClick={() => { supprimerFournisseur(fournisseur.id); toast(`${fournisseur.nom} supprimé`, 'info'); onClose(); }}>Confirmer la suppression</Button>
            ) : (
              <Button variant="ghost" size="icon" className="mr-auto" aria-label="Supprimer ce fournisseur" onClick={() => setConfirmer(true)}><Trash2 className="h-4 w-4" /></Button>
            )
          )}
          <Button variant="ghost" onClick={onClose} className="hidden sm:inline-flex">Annuler</Button>
          <Button variant="primary" size="lg" onClick={enregistrer}>{fournisseur ? 'Enregistrer' : 'Ajouter'}</Button>
        </>
      }
    >
      <div className="space-y-5">
        {!fournisseur && (
          <div>
            <div className="mb-2 text-[12.5px] font-medium text-ink-2">Enseigne</div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[...ENSEIGNES.map((e) => ({ cle: e.cle, nom: e.nom })), { cle: '', nom: 'Autre fournisseur' }].map((e) => {
                const actif = form.enseigne === e.cle;
                return (
                  <button key={e.cle || 'autre'} onClick={() => choisirEnseigne(e.cle)} aria-pressed={actif} className={cn('flex h-12 items-center gap-2 rounded-[10px] border px-2.5 text-left text-[12.5px] font-medium transition', actif ? 'border-ink bg-white ring-2 ring-ink/10' : 'border-line bg-white hover:border-line2 hover:bg-sub')}>
                    <FournisseurPastille f={{ nom: e.nom, enseigne: e.cle }} size={26} />
                    <span className="min-w-0 flex-1 truncate">{e.nom}</span>
                    {actif && <Check className="h-3.5 w-3.5 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom affiché" className="sm:col-span-2" hint={enseigneDef ? 'Ajoutez la ville pour distinguer vos agences, ex. « Rexel Villeurbanne ».' : undefined}>
            <Input value={form.nom} onChange={(e) => set({ nom: e.target.value })} placeholder="Ex. Quincaillerie Martin" aria-invalid={essai && !form.nom.trim()} />
          </Field>
          <Field label="Agence"><Input value={form.agence} onChange={(e) => set({ agence: e.target.value })} placeholder="Ville ou quartier" /></Field>
          <Field label="Contact"><Input value={form.contact} onChange={(e) => set({ contact: e.target.value })} placeholder="Prénom et nom" /></Field>
          <Field
            label="E-mail du comptoir"
            className="sm:col-span-2"
            hint={essai && !emailOk ? <span className="text-bad">Cette adresse est nécessaire pour envoyer vos demandes de prix et vos commandes.</span> : 'C’est là que Brix envoie vos demandes et vos commandes, avec un lien pour répondre en deux minutes depuis un téléphone. Sans cette adresse, le fournisseur ne reçoit rien.'}
          >
            <Input type="email" inputMode="email" autoComplete="off" value={form.email} onChange={(e) => set({ email: e.target.value })} placeholder="comptoir@fournisseur.fr" />
          </Field>
          <Field label="Téléphone"><Input type="tel" inputMode="tel" value={form.telephone} onChange={(e) => set({ telephone: e.target.value })} placeholder="04 00 00 00 00" /></Field>
          <Field label="N° de compte client" hint="Imprimé sur vos factures"><Input value={form.numeroCompte} onChange={(e) => set({ numeroCompte: e.target.value })} /></Field>
          <Field label="Franco de port" hint="Port offert à partir de ce montant"><Input inputMode="decimal" value={form.franco} onChange={(e) => set({ franco: e.target.value })} suffix="€ HT" /></Field>
          <Field label="Délai de livraison habituel"><Input inputMode="numeric" value={form.delaiJours} onChange={(e) => set({ delaiJours: e.target.value })} suffix="jours" /></Field>
        </div>

        <div>
          <div className="mb-2 text-[12.5px] font-medium text-ink-2">Ce que vous lui achetez</div>
          <div className="flex flex-wrap gap-1.5">
            {METIERS.map((m) => {
              const on = form.metiers.includes(m.cle);
              return (
                <button key={m.cle} onClick={() => set({ metiers: on ? form.metiers.filter((x) => x !== m.cle) : [...form.metiers, m.cle] })} aria-pressed={on} className={cn('h-10 rounded-full border px-3 text-[12.5px] font-medium transition sm:h-9', on ? 'border-ink bg-ink text-white' : 'border-line2 bg-white text-ink-2 hover:text-ink')}>
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-[14px] border border-line bg-[#fbfbfd] p-4">
          <div className="flex items-center gap-2 text-[13.5px] font-semibold"><Plug className="h-4 w-4 text-ink-3" />Relier à son logiciel</div>
          {live?.connecteur === 'api_brix' ? (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[13px]">
              <span className="text-ok">Relié avec le code <span className="num font-medium">{live.partenaire}</span></span>
              <Button size="sm" variant="ghost" className="max-md:h-10" onClick={() => { modifierFournisseur(live.id, { connecteur: live.enseigne || 'email', partenaire: undefined }); setRetour(null); }}>Délier</Button>
            </div>
          ) : (
            <>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">
                Si votre fournisseur utilise un logiciel relié à Brix, il vous donne un code partenaire. Vos demandes et commandes arrivent alors directement chez lui. Sinon, rien à faire : l’e-mail suffit.
              </p>
              <div className="mt-3 flex gap-2">
                <Input value={code} onChange={(e) => { setCode(e.target.value.toUpperCase()); setRetour(null); }} placeholder="BRX-XXXX-XXXX" className="num min-w-0 flex-1 tracking-wider" aria-label="Code partenaire" />
                {fournisseur && <Button variant="secondary" disabled={!code.trim()} onClick={relier}>Relier</Button>}
              </div>
            </>
          )}
          {retour && <p className={cn('mt-2 text-[12.5px]', retour.ok ? 'text-ok' : 'text-bad')}>{retour.message}</p>}
        </div>
      </div>
    </Sheet>
  );
}
