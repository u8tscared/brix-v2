/**
 * search / fetch au format attendu par ChatGPT (recherche approfondie, connaissances d'entreprise).
 * Identifiants : « devis:<id> », « facture:<id> », « chantier:<id> », « client:<id> », « demande:<id> ».
 */
import type { Chantier, Client, Devis, Facture, Lead } from '../../../../../src/lib/types';
import type { EtatDonnees } from '../../../lib/etat';
import { ErreurOutil, S, contient, entree, euros, lien, nomClient, resteFacture, str, totaux, type Outil } from './commun';

type Env = Parameters<typeof lien>[0];
interface Doc { id: string; title: string; url: string; text: () => string; metadata: Record<string, string> }

const eur = (n: number) => `${euros(n).toFixed(2).replace('.', ',')} €`;

function documents(env: Env, d: EtatDonnees): Doc[] {
  const clients = (d.clients as Client[] | undefined) ?? [];
  const out: Doc[] = [];
  for (const c of clients) {
    out.push({
      id: `client:${c.id}`, title: `Client ${c.name}`, url: lien(env, `clients/${c.id}`), metadata: { type: 'client', ville: c.city ?? '' },
      text: () => [`Client : ${c.name} (${c.kind === 'pro' ? 'professionnel' : 'particulier'})`, c.contact && `Contact : ${c.contact}`, c.email && `E-mail : ${c.email}`, c.phone && `Téléphone : ${c.phone}`, `Adresse : ${[c.address, c.city].filter(Boolean).join(', ')}`, c.notes && `Notes : ${c.notes}`].filter(Boolean).join('\n'),
    });
  }
  for (const x of (d.devis as Devis[] | undefined) ?? []) {
    const cl = nomClient(clients, x.clientId) ?? 'client inconnu';
    out.push({
      id: `devis:${x.id}`, title: `Devis ${x.number} · ${cl}`, url: lien(env, `devis/${x.id}`), metadata: { type: 'devis', statut: x.status, numero: x.number },
      text: () => {
        const t = totaux(x.lines);
        const lignes = (x.lines ?? []).filter((l) => l.kind !== 'texte').slice(0, 80).map((l) => (l.kind === 'section' ? `\n${l.designation}` : `- ${l.designation} : ${l.quantity} ${l.unit} × ${eur(l.unitPriceHt)} HT`));
        return [`Devis ${x.number} : ${x.title ?? ''}`, `Client : ${cl}`, `Statut : ${x.status}, créé le ${x.createdAt}`, `Total : ${eur(t.ht)} HT, ${eur(t.ttc)} TTC`, ...lignes].join('\n');
      },
    });
  }
  for (const f of (d.factures as Facture[] | undefined) ?? []) {
    const cl = nomClient(clients, f.clientId) ?? 'client inconnu';
    out.push({
      id: `facture:${f.id}`, title: `Facture ${f.number} · ${cl}`, url: lien(env, `factures/${f.id}`), metadata: { type: 'facture', statut: f.status, numero: f.number },
      text: () => {
        const t = totaux(f.lines);
        return [`Facture ${f.number} (${f.kind}) : ${f.title ?? ''}`, `Client : ${cl}`, `Émise le ${f.issueDate}, échéance ${f.dueDate}, statut ${f.status}`, `Total : ${eur(t.ttc)} TTC, payé ${eur(f.paidAmount)}, reste ${eur(resteFacture(f))}`].join('\n');
      },
    });
  }
  for (const c of (d.chantiers as Chantier[] | undefined) ?? []) {
    out.push({
      id: `chantier:${c.id}`, title: `Chantier ${c.name}`, url: lien(env, `chantiers/${c.id}`), metadata: { type: 'chantier', statut: c.status },
      text: () => [`Chantier : ${c.name}`, `Client : ${nomClient(clients, c.clientId) ?? ''}`, `Adresse : ${[c.address, c.city].filter(Boolean).join(', ')}`, `Statut : ${c.status}, avancement ${c.progress} %`, `Du ${c.startDate} au ${c.endDate}`, `Budget : ${eur(c.budgetHt)} HT, coûts engagés ${eur(c.costHt)} HT`, c.nextStep && `Prochaine étape : ${c.nextStep}`].filter(Boolean).join('\n'),
    });
  }
  for (const l of (d.leads as Lead[] | undefined) ?? []) {
    out.push({
      id: `demande:${l.id}`, title: `Demande de ${l.name}`, url: lien(env, 'demandes'), metadata: { type: 'demande', statut: l.status },
      text: () => [`Demande de ${l.name} (${l.city ?? ''}), reçue le ${l.receivedAt} via ${l.source}`, `Besoin : ${l.request}`, `Statut : ${l.status}`, l.phone && `Téléphone : ${l.phone}`].filter(Boolean).join('\n'),
    });
  }
  return out;
}

export const OUTILS_RECHERCHE: Outil[] = [
  {
    name: 'search',
    title: 'Rechercher dans Brix',
    description: 'Recherche plein texte dans les clients, devis, factures, chantiers et demandes de l’entreprise. Renvoie des identifiants à passer à fetch.',
    brut: true,
    inputSchema: entree({ query: S.str('Texte recherché (nom, numéro, ville, désignation…)') }, ['query']),
    outputSchema: S.obj({ results: S.arr(S.obj({ id: S.str(), title: S.str(), url: S.str() }, ['id', 'title', 'url'])) }, ['results']),
    run: async ({ env, etat }, a) => {
      const q = str(a.query);
      if (!q) return { results: [] };
      const mots = q.split(/\s+/).filter((m) => m.length > 1);
      const { donnees } = await etat();
      const results = documents(env, donnees)
        .map((doc) => {
          const corps = `${doc.title}\n${doc.text()}`;
          return { doc, score: mots.reduce((s, m) => s + (contient(doc.title, m) ? 3 : contient(corps, m) ? 1 : 0), 0) };
        })
        .filter((x) => x.score > 0)
        .sort((x, y) => y.score - x.score)
        .slice(0, 20)
        .map(({ doc }) => ({ id: doc.id, title: doc.title, url: doc.url }));
      return { results };
    },
  },
  {
    name: 'fetch',
    title: 'Ouvrir un document Brix',
    description: 'Contenu complet d’un résultat de search (client, devis, facture, chantier ou demande), avec son lien dans Brix.',
    brut: true,
    inputSchema: entree({ id: S.str('Identifiant renvoyé par search, ex. devis:q_118') }, ['id']),
    outputSchema: S.obj({ id: S.str(), title: S.str(), text: S.str(), url: S.str(), metadata: S.obj({}) }, ['id', 'title', 'text', 'url']),
    run: async ({ env, etat }, a) => {
      const id = str(a.id);
      if (!id) throw new ErreurOutil('Indiquez un identifiant renvoyé par search.');
      const { donnees } = await etat();
      const doc = documents(env, donnees).find((x) => x.id === id);
      if (!doc) throw new ErreurOutil(`Document « ${id} » introuvable. Relancez search pour obtenir un identifiant à jour.`);
      return { id: doc.id, title: doc.title, text: doc.text(), url: doc.url, metadata: doc.metadata };
    },
  },
];
