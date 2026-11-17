// Nouvelle demande de prix en 3 étapes : d'où vient le matériel, quels articles, à qui l'envoyer.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { Button, Sheet, toast } from '@/components/ui';
import { dayOffset } from '@/lib/format';
import { useBrix } from '@/lib/store';
import type { Devis } from '@/lib/types';
import { besoinsDuDevis, fournisseursSuggeres } from '../data/helpers';
import { useAchats } from '../data/store';
import { Etapes, pluriel } from './demandes/commun';
import EtapeSource from './demandes/EtapeSource';
import EtapeArticles, { ligneValide, nouvelleLigne, quantite, type LigneBrouillon } from './demandes/EtapeArticles';
import EtapeEnvoi, { type Envoi } from './demandes/EtapeEnvoi';

const LIBELLES = ['Origine', 'Articles', 'Envoi'];
const vide = (): Envoi => ({ titre: '', fournisseurIds: [], dateLimite: dayOffset(1), livraison: dayOffset(3), adresse: '', message: '' });

export default function NouvelleDemande({ open, onClose, devisId }: { open: boolean; onClose: () => void; devisId?: string }) {
  const nav = useNavigate();
  const { devis, chantiers, clients } = useBrix();
  const fournisseurs = useAchats((s) => s.fournisseurs);
  const creerDemande = useAchats((s) => s.creerDemande);

  const [etape, setEtape] = useState(1);
  const [source, setSource] = useState<Devis | null>(null);
  const [lignes, setLignes] = useState<LigneBrouillon[]>([]);
  const [envoi, setEnvoi] = useState<Envoi>(vide);

  const conseilles = useMemo(() => {
    const ids = [...(source ? fournisseursSuggeres(source, fournisseurs) : []), ...fournisseurs.filter((f) => f.favori).map((f) => f.id), ...fournisseurs.map((f) => f.id)];
    return [...new Set(ids)].slice(0, 3);
  }, [source, fournisseurs]);

  const choisirDevis = (d: Devis) => {
    const ch = chantiers.find((c) => c.id === d.chantierId);
    const cl = clients.find((c) => c.id === d.clientId);
    setSource(d);
    setLignes(besoinsDuDevis(d).map((b, i) => ({ ...b, cle: `dv${i}`, actif: true, quantite: String(b.quantite).replace('.', ',') })));
    setEnvoi({ ...vide(), titre: `Matériel · ${d.title}`, adresse: ch ? `${ch.address}, ${ch.city}` : cl ? `${cl.address}, ${cl.city}` : '' });
    setEtape(2);
  };
  const choisirLibre = () => {
    setSource(null);
    setLignes([nouvelleLigne()]);
    setEnvoi({ ...vide(), titre: 'Demande de prix' });
    setEtape(2);
  };

  // Réinitialise à chaque ouverture ; démarre directement sur les articles si un devis est donné.
  useEffect(() => {
    if (!open) return;
    const d = devisId ? devis.find((x) => x.id === devisId) : undefined;
    if (d) choisirDevis(d);
    else {
      setEtape(1);
      setSource(null);
      setLignes([]);
      setEnvoi(vide());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, devisId]);

  // Présélection des fournisseurs conseillés en arrivant à l'étape 3.
  useEffect(() => {
    if (etape === 3 && envoi.fournisseurIds.length === 0) setEnvoi((e) => ({ ...e, fournisseurIds: conseilles }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etape]);

  const retenues = lignes.filter(ligneValide);
  const n = envoi.fournisseurIds.length;

  const envoyer = () => {
    const id = creerDemande({
      titre: envoi.titre.trim() || 'Demande de prix',
      devisId: source?.id,
      chantierId: source?.chantierId,
      lignes: retenues.map((l) => ({ designation: l.designation.trim(), reference: l.reference, unite: l.unite, prixCible: l.prixCible, devisLigneId: l.devisLigneId, quantite: quantite(l) })),
      fournisseurIds: envoi.fournisseurIds,
      dateLimite: envoi.dateLimite || undefined,
      livraisonSouhaitee: envoi.livraison || undefined,
      adresse: envoi.adresse.trim() || undefined,
      message: envoi.message.trim() || undefined,
    });
    toast(`Demande envoyée à ${pluriel(n, 'fournisseur')}. Vous serez prévenu à chaque réponse.`);
    onClose();
    nav(`/app/fournisseurs/demandes/${id}`);
  };

  const titres = ['D’où vient le matériel ?', 'Que faut-il chiffrer ?', 'À qui l’envoyer ?'];
  const sousTitres = [
    'Une seule liste, envoyée à plusieurs fournisseurs. Ils répondent sans créer de compte.',
    source ? `Depuis le devis ${source.number}` : 'Liste libre',
    `${pluriel(retenues.length, 'article')} à chiffrer`,
  ];

  const pied =
    etape === 1 ? undefined : (
      <>
        <Button variant="ghost" className="h-11 sm:h-10" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => setEtape(etape - 1)}>
          Retour
        </Button>
        <div className="flex-1" />
        {etape === 2 ? (
          <Button variant="primary" className="h-11 sm:h-10" disabled={retenues.length === 0} onClick={() => setEtape(3)}>
            Continuer
          </Button>
        ) : (
          <Button variant="dawn" className="h-11 sm:h-10" disabled={n === 0 || retenues.length === 0} icon={<Send className="h-4 w-4" />} onClick={envoyer}>
            {n ? `Envoyer à ${pluriel(n, 'fournisseur')}` : 'Choisissez un fournisseur'}
          </Button>
        )}
      </>
    );

  return (
    <Sheet open={open} onClose={onClose} title={titres[etape - 1]} subtitle={sousTitres[etape - 1]} footer={pied} width={560}>
      <Etapes actuelle={etape} libelles={LIBELLES} />
      {etape === 1 && <EtapeSource onDevis={choisirDevis} onLibre={choisirLibre} />}
      {etape === 2 && <EtapeArticles lignes={lignes} onChange={setLignes} />}
      {etape === 3 && <EtapeEnvoi fournisseurs={fournisseurs} conseilles={conseilles} envoi={envoi} onChange={(p) => setEnvoi((e) => ({ ...e, ...p }))} />}
    </Sheet>
  );
}
