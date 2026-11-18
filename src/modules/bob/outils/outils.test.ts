// Outils de Bob sur la démo (Benali Électricité) : mêmes résultats pour l'agent et le moteur local,
// relances seulement préparées, devis en brouillon, alignement avec les définitions du worker.
import { beforeEach, describe, expect, it } from 'vitest';
import { useBrix } from '@/lib/store';
import { dayOffset } from '@/lib/format';
import { ECRANS as ECRANS_WORKER, OUTILS_BOB, SUJETS } from '../../../../worker/src/modules/bob/outils';
import { respond } from '../engine';
import { ECRANS, SUJETS_REGLES } from './lecture';
import { EN_COURS, executerOutil, NOMS_OUTILS } from './index';

const S = () => useBrix.getState();
const run = (nom: string, entree: Record<string, unknown>) => executerOutil(nom, entree, S());

beforeEach(() => S().loadDemo('electricien'));

describe('définitions du worker et exécuteurs du navigateur', () => {
  it('ont les mêmes noms, écrans et sujets', () => {
    expect(OUTILS_BOB.map((t) => t.name).sort()).toEqual([...NOMS_OUTILS].sort());
    expect(Object.keys(EN_COURS).sort()).toEqual([...NOMS_OUTILS].sort());
    expect([...ECRANS_WORKER].sort()).toEqual(Object.keys(ECRANS).sort());
    expect([...SUJETS].sort()).toEqual([...SUJETS_REGLES].sort());
  });

  it('refuse proprement un outil inconnu ou une entrée invalide', () => {
    expect(executerOutil('supprimer_tout', {}, S())).toMatchObject({ erreur: true });
    expect(executerOutil('rechercher', null, S())).toMatchObject({ erreur: true });
  });
});

describe('lecture', () => {
  it('rechercher trouve client, devis et chantier', () => {
    const r = run('rechercher', { texte: 'Lefèvre', types: null }).contenu as { resultats: Record<string, { nom?: string; numero?: string }[]>; total: number };
    expect(r.total).toBeGreaterThan(1);
    expect(r.resultats.chantiers[0].nom).toContain('Lefèvre');
    const d = run('rechercher', { texte: 'D-2026-118', types: ['devis'] }).contenu as { resultats: { devis: { numero: string }[] } };
    expect(d.resultats.devis.map((x) => x.numero)).toEqual(['D-2026-118']);
  });

  it('lire_resume et lister_impayes donnent les mêmes chiffres que le moteur local', () => {
    const res = run('lister_impayes', {});
    const c = res.contenu as { nombre: number; factures: { numero: string; jours_de_retard: number }[] };
    expect(c.factures.map((f) => f.numero)).toEqual(['F-2026-198', 'F-2026-199']);
    expect(c.factures[0].jours_de_retard).toBe(12);
    const resume = run('lire_resume', { periode: 'mois' }).contenu as { impayes: { nombre: number } };
    expect(resume.impayes.nombre).toBe(2);
    const local = respond('Qui est en retard de paiement ?', { pathname: '/app', memo: {} });
    expect(local.text).toMatch(/^2 clients sont en retard/);
    expect(local.cards?.[0].rows?.map((r) => r.label)).toEqual(res.carte?.rows?.map((r) => r.label));
  });

  it('expliquer_regle renvoie la fiche vérifiée', () => {
    const r = run('expliquer_regle', { sujet: 'nfc-cuisine' });
    expect((r.contenu as { points: string[] }).points.join(' ')).toMatch(/32 A/);
    expect(r.carte?.kind).toBe('lesson');
  });

  it('ouvrir_ecran ouvre une fiche précise par son numéro', () => {
    expect(run('ouvrir_ecran', { ecran: 'devis', identifiant: 'D-2026-118' }).naviguer).toBe('/app/devis/q_118');
    expect(run('ouvrir_ecran', { ecran: 'planning', identifiant: null }).naviguer).toBe('/app/planning');
    expect(run('ouvrir_ecran', { ecran: 'admin', identifiant: null }).erreur).toBe(true);
  });

  it('statut_chantier et calculer_marge', () => {
    const st = run('statut_chantier', { chantier: 'Lefèvre' }).contenu as { nom: string; avancement: number };
    expect(st).toMatchObject({ nom: 'Rénovation T3 · Mme Lefèvre', avancement: 38 });
    const m = run('calculer_marge', { portee: 'devis_signes' }).contenu as { nombre: number; taux_marge: number };
    expect(m.nombre).toBe(3);
    expect(m.taux_marge).toBeGreaterThan(0);
  });
});

describe('actions', () => {
  it('relancer_factures prépare sans rien envoyer, la carte envoie au clic', () => {
    const avant = S().factures.find((f) => f.number === 'F-2026-199')!.remindersSent;
    const r = run('relancer_factures', { factures: ['F-2026-199'] });
    expect(r.contenu).toMatchObject({ preparees: 1, etat: 'en_attente_de_confirmation' });
    expect(S().factures.find((f) => f.number === 'F-2026-199')!.remindersSent).toBe(avant);
    const envoyer = r.carte!.actions!.find((a) => a.label === 'Envoyer les relances')!;
    expect(envoyer.run!()).toMatch(/1 relance envoyée/);
    expect(S().factures.find((f) => f.number === 'F-2026-199')!.remindersSent).toBe(avant + 1);
    expect(run('relancer_factures', { factures: ['F-9999'] }).erreur).toBe(true);
  });

  it('creer_devis chiffre avec la bibliothèque et reste en brouillon', () => {
    const n = S().devis.length;
    const r = run('creer_devis', { client: 'Mme Martin', titre: null, lignes: [{ libelle: 'prise de courant', quantite: 3, unite: null, prix_unitaire_ht: null }, { libelle: 'radiateur', quantite: 1, unite: null, prix_unitaire_ht: null }, { libelle: 'trappe de visite sur mesure', quantite: 1, unite: null, prix_unitaire_ht: 85 }] });
    const c = r.contenu as { numero: string; statut: string; envoye: boolean; lignes: { designation: string; prix_unitaire_ht: number }[]; prix_a_completer: number };
    expect(S().devis.length).toBe(n + 1);
    expect(c.statut).toBe('brouillon');
    expect(c.envoye).toBe(false);
    expect(c.lignes[0]).toMatchObject({ designation: 'Prise 2P+T 16 A Céliane blanc', prix_unitaire_ht: 24.5 });
    expect(c.lignes.find((l) => /trappe/i.test(l.designation))?.prix_unitaire_ht).toBe(85);
    expect(c.lignes.some((l) => /Main-d’œuvre/.test(l.designation))).toBe(true);
    expect(r.activite).toMatchObject({ label: `Devis ${c.numero} créé`, ton: 'ok' });
    expect(r.activite.to).toMatch(/^\/app\/devis\//);

    // Même chiffrage que le moteur local pour la même demande.
    const local = respond('Fais un devis pour Mme Martin, 3 prises et un radiateur', { pathname: '/app', memo: {} });
    expect(local.cards?.[0].rows?.[0].label).toBe('Prise 2P+T 16 A Céliane blanc');
  });

  it('ajouter_lignes_devis complète un brouillon et refuse un devis signé', () => {
    const r = run('ajouter_lignes_devis', { devis: 'D-2026-122', lignes: [{ libelle: 'spot', quantite: 2, unite: null, prix_unitaire_ht: null }] });
    expect(r.erreur).toBeUndefined();
    expect(S().devis.find((d) => d.number === 'D-2026-122')!.lines.some((l) => /Spot LED/.test(l.designation))).toBe(true);
    expect(run('ajouter_lignes_devis', { devis: 'D-2026-121', lignes: [{ libelle: 'spot', quantite: 1, unite: null, prix_unitaire_ht: null }] }).erreur).toBe(true);
  });

  it('planifier place un compagnon et signale les conflits, annulable', () => {
    const date = dayOffset(1);
    const n = S().events.length;
    const r = run('planifier', { employe: 'Yanis', chantier: 'Dupuis', date, creneau: 'matin' });
    expect(r.contenu).toMatchObject({ fait: true, employe: 'Yanis', debut: '08:00', fin: '12:00' });
    expect(S().events.length).toBe(n + 1);
    r.carte!.actions!.find((a) => a.label === 'Annuler')!.run!();
    expect(S().events.length).toBe(n);
    expect(run('planifier', { employe: 'Gérard', chantier: 'Dupuis', date, creneau: 'matin' }).erreur).toBe(true);
  });

  it('creer_client ne crée pas de doublon', () => {
    const n = S().clients.length;
    expect(run('creer_client', { nom: 'Sarah Kaci', telephone: '06 51 23 98 70', email: null, ville: 'Villeurbanne', adresse: null }).contenu).toMatchObject({ cree: true });
    expect(S().clients.length).toBe(n + 1);
    expect(run('creer_client', { nom: 'Sarah Kaci', telephone: null, email: null, ville: null, adresse: null }).contenu).toMatchObject({ deja_existant: true });
    expect(S().clients.length).toBe(n + 1);
  });

  it('lire_agenda lit l’équipe sur une plage', () => {
    const r = run('lire_agenda', { du: dayOffset(0), au: dayOffset(6), equipe: true }).contenu as { creneaux: unknown[] };
    expect(r.creneaux.length).toBeGreaterThan(0);
  });
});
