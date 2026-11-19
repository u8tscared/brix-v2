// État de Brix AI pour l'écran « Connecter une IA » : réel avec un compte cloud, simulé en démo.
import { useCallback, useEffect, useState } from 'react';
import { toast } from '@/components/ui';
import { useCloud } from '@/lib/cloud';
import { useBrix } from '@/lib/store';
import { useAchats } from '../data/store';
import { couperAcces, ecrireReglages, lireJournal, lireReglages, listerAcces, type Acces, type LigneJournal } from './api';

export function useModeCloud() {
  const dispo = useCloud((s) => s.dispo);
  const session = useCloud((s) => s.session);
  const compte = useBrix((s) => s.compte);
  return dispo === true && !!session && compte === session.orgId;
}

export function useBrixAi() {
  const cloud = useModeCloud();
  const jetonsDemo = useAchats((s) => s.jetons);
  const revoquerDemo = useAchats((s) => s.revoquerJeton);
  const [actif, setActif] = useState(true);
  const [acces, setAcces] = useState<Acces[]>([]);
  const [journal, setJournal] = useState<LigneJournal[]>([]);
  const [chargement, setChargement] = useState(cloud);
  const [erreur, setErreur] = useState<string | null>(null);

  const recharger = useCallback(async () => {
    if (!cloud) return;
    setErreur(null);
    try {
      const [r, a, j] = await Promise.all([lireReglages(), listerAcces(), lireJournal()]);
      setActif(r.actif);
      setAcces(a);
      setJournal(j);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Impossible de charger vos accès.');
    } finally {
      setChargement(false);
    }
  }, [cloud]);

  useEffect(() => {
    void recharger();
  }, [recharger]);

  const basculer = async (v: boolean) => {
    if (!cloud) {
      setActif(v);
      toast(v ? 'Relier votre IA : activé (démo)' : 'Accès des assistants coupé (démo)');
      return;
    }
    const avant = actif;
    setActif(v);
    try {
      await ecrireReglages(v);
      toast(v ? 'Vos assistants peuvent de nouveau lire Brix' : 'Tous les accès des assistants sont coupés');
    } catch (e) {
      setActif(avant);
      toast(e instanceof Error ? e.message : 'Réglage non enregistré', 'warn');
    }
  };

  const couper = async (id: string) => {
    if (!cloud) {
      revoquerDemo(id.replace(/^j_/, ''));
      toast('Accès coupé (démo)');
      return;
    }
    try {
      await couperAcces(id);
      setAcces((l) => l.filter((x) => x.id !== id));
      toast('Accès coupé : cet assistant ne peut plus rien lire');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Impossible de couper cet accès', 'warn');
    }
  };

  const accesAffiches: Acces[] = cloud
    ? acces
    : jetonsDemo.map((j) => ({
        id: `j_${j.id}`, type: 'jeton', nom: j.nom, hote: null, prefixe: j.prefixe, ecriture: false,
        cree_le: new Date(j.createdAt).getTime(), derniere_utilisation: j.derniereUtilisation ? new Date(j.derniereUtilisation).getTime() : null, nb_appels: j.appels,
      }));

  return { cloud, actif, basculer, acces: accesAffiches, journal, couper, chargement, erreur, recharger };
}
