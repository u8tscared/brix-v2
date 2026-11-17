/**
 * Textes exacts présentés au client au moment de signer. Ils sont figés dans le dossier de preuve :
 * le front doit afficher ces textes tels quels (ils sont renvoyés par GET /api/p/devis/:jeton).
 */
export function mentionsDevis(numero: string, o: { cgv: boolean; retractation: boolean }) {
  return {
    bonPourAccord: `J'accepte le devis n° ${numero} tel qu'il m'est présenté : bon pour accord.`,
    cgv: o.cgv ? "J'ai lu et j'accepte les conditions générales de vente." : null,
    retractation: o.retractation
      ? "Ce contrat est conclu hors établissement : vous disposez d'un délai de 14 jours à compter de la signature pour vous rétracter, sans avoir à vous justifier (article L221-18 du Code de la consommation). Aucun paiement ne peut vous être demandé avant 7 jours (article L221-10)."
      : null,
    demarrageAnticipe: o.retractation
      ? "Je demande expressément que les travaux commencent avant la fin du délai de rétractation. Si je me rétracte ensuite, je paierai la part des travaux déjà réalisés (article L221-25 du Code de la consommation)."
      : null,
    valeur: 'En saisissant le code reçu puis en validant, vous signez électroniquement ce devis et vous vous engagez à son exécution (articles 1366 et 1367 du Code civil).',
  };
}

export type Mentions = ReturnType<typeof mentionsDevis>;
