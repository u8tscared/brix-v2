/* Page Brix AI MCP : en-tête Halo, démo de conversation (partagée avec la page IA),
   grille des outils du serveur MCP, onglets par assistant, FAQ. */
import { boot, $, ic, esc } from '../core.js';
import { faq, pageHero, radios } from '../subpage.js';
import { initMcp } from '../ia/mcp.js';
import { copyDemo } from '../ia/bob.js';

/* Outils du serveur Brix AI MCP, noms figés par le fil app (18/11/2026).
   Lecture : 20 outils (search et fetch cités à part). Actions : 6, en mode « Lecture et actions » seulement. */
const TOOLS = [
  { id: 'lire_entreprise', icon: 'building-2', tone: 'v', t: 'Votre entreprise', q: 'Où j’en suis aujourd’hui ?' },
  { id: 'lister_devis · lire_devis', icon: 'file-text', tone: 'p', t: 'Devis', q: 'Quels devis attendent une réponse ?' },
  { id: 'lister_factures · lire_facture', icon: 'receipt', tone: 'b', t: 'Factures', q: 'Montre-moi les factures de novembre.' },
  { id: 'lister_impayes', icon: 'alarm-clock', tone: 'r', t: 'Impayés', q: 'Qui ne m’a pas encore payé ?' },
  { id: 'calculer_chiffre_affaires', icon: 'chart-line', tone: 'g', t: 'Chiffre d’affaires', q: 'Combien j’ai facturé ce trimestre ?' },
  { id: 'lister_chantiers · lire_chantier', icon: 'hard-hat', tone: 'm', t: 'Chantiers', q: 'Quel chantier rapporte le moins ?' },
  { id: 'lister_clients · lire_client', icon: 'contact', tone: 'i', t: 'Clients', q: 'Retrouve le numéro de Mme Lefèvre.' },
  { id: 'lire_planning', icon: 'calendar-range', tone: 'b', t: 'Planning', q: 'Qui est sur quel chantier demain ?' },
  { id: 'lister_demandes', icon: 'inbox', tone: 'v', t: 'Demandes clients', q: 'Quelles demandes sont arrivées cette semaine ?' },
  { id: 'lister_achats', icon: 'package', tone: 's', t: 'Achats', q: 'Quelles commandes sont en route ?' },
  { id: 'lister_demandes_prix', icon: 'scale', tone: 'p', t: 'Demandes de prix', q: 'Qui a répondu pour le tableau T3 ?' },
  { id: 'comparer_prix_materiaux', icon: 'tag', tone: 'g', t: 'Prix des matériaux', q: 'Où acheter le PER de 16 moins cher ?' },
  { id: 'lister_hausses_prix', icon: 'trending-up', tone: 'r', t: 'Hausses de prix', q: 'Qu’est-ce qui a augmenté ce mois-ci ?' },
  { id: 'lister_fournisseurs', icon: 'store', tone: 'm', t: 'Fournisseurs', q: 'Avec qui je travaille le plus ?' },
];
const ACTS = [
  { id: 'creer_client', icon: 'user-plus', t: 'Créer un client', q: 'Ajoute Mme Dubois, 12 rue des Lilas à Villeurbanne.' },
  { id: 'creer_devis_brouillon', icon: 'file-plus', t: 'Créer un devis en brouillon', q: 'Fais un devis pour la salle de bain des Petit.' },
  { id: 'ajouter_ligne_devis', icon: 'list-plus', t: 'Ajouter une ligne au devis', q: 'Ajoute la dépose de la baignoire, 280 €.' },
  { id: 'creer_rendez_vous', icon: 'calendar-plus', t: 'Poser un rendez-vous', q: 'Cale une visite chez elle jeudi à 8 h 30.' },
  { id: 'noter_demande', icon: 'notebook-pen', t: 'Noter une demande', q: 'Note : M. Roux veut un devis pour sa cuisine.' },
  { id: 'marquer_relance_a_faire', icon: 'bell-ring', t: 'Marquer une relance à faire', q: 'Il faudra relancer M. Garnier lundi.' },
];

const ADDR = 'https://app.brix-app.fr/api/mcp';
const ASSISTANTS = [
  { id: 'claude', name: 'Claude', note: 'Sur le web, l’application pour ordinateur et le téléphone.', steps: ['Ouvrez les réglages, puis la rubrique Connecteurs.', 'Ajoutez un connecteur personnalisé, nommez-le Brix et collez l’adresse.', 'Brix s’ouvre : connectez-vous avec le compte gérant, choisissez le mode, puis Autoriser.'] },
  { id: 'chatgpt', name: 'ChatGPT', note: 'Sur ordinateur, avec une offre payante et le mode développeur activé.', steps: ['Dans les réglages, activez le mode développeur.', 'Créez un connecteur, nommez-le Brix et collez l’adresse.', 'Brix s’ouvre : connectez-vous avec le compte gérant, choisissez le mode, puis Autoriser.'] },
  { id: 'lechat', name: 'Le Chat', note: 'L’assistant de Mistral AI.', steps: ['Ouvrez les connecteurs de Le Chat.', 'Ajoutez un connecteur MCP personnalisé et collez l’adresse.', 'Brix s’ouvre : connectez-vous avec le compte gérant, choisissez le mode, puis Autoriser.'] },
  { id: 'autres', name: 'Perplexity, Grok, Copilot', note: 'Perplexity, Grok et Copilot Studio acceptent aussi les connecteurs MCP.', steps: ['Ouvrez la rubrique des connecteurs ou des outils MCP de l’assistant.', 'Ajoutez un serveur MCP distant et collez l’adresse.', 'Brix s’ouvre : connectez-vous avec le compte gérant, choisissez le mode, puis Autoriser.'] },
  { id: 'dev', name: 'Développeurs', note: 'Claude Code, Cursor, VS Code, Gemini CLI et Windsurf.', steps: ['Ajoutez un serveur MCP distant avec l’adresse Brix.', 'Au premier appel, Brix s’ouvre dans le navigateur : autorisez.', 'Pour n8n ou un script, créez plutôt un jeton dans Bob › Brix AI MCP, rubrique Avancé.'] },
];

function tools() {
  const ul = $('[data-tools]');
  if (!ul) return;
  ul.innerHTML = TOOLS.map((t) => `<li class="tcell rv"><span class="tl tone-${t.tone}">${ic(t.icon)}</span><span class="tx"><b>${t.t}</b><span class="mono">${t.id}</span><small>«\u00a0${esc(t.q)}\u00a0»</small></span></li>`).join('');
}

function actions() {
  const ul = $('[data-acts]');
  if (!ul) return;
  ul.innerHTML = ACTS.map((a) => `<li>${ic(a.icon)}<span><b>${a.t}</b><span class="mono">${a.id}</span><small>«\u00a0${esc(a.q)}\u00a0»</small></span></li>`).join('');
}

function assistants() {
  const tabs = $('[data-as-tabs]'), panel = $('[data-as-panel]');
  if (!tabs || !panel) return;
  tabs.innerHTML = ASSISTANTS.map((a, i) => `<button type="button" role="radio" aria-checked="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-as="${a.id}">${a.name}</button>`).join('');
  tabs.setAttribute('role', 'radiogroup');
  const show = (a) => {
    const addr = ADDR;
    panel.innerHTML = `<div class="asp-h"><b>${a.name}</b><span>${a.note}</span></div>
      <ol class="asp-l">${a.steps.map((s, i) => `<li><span class="asp-n">${i + 1}</span><span>${s}</span></li>`).join('')}</ol>
      <div class="addr asp-addr"><span class="mono">${addr.replace('https://', '')}</span><button type="button" class="addr-b" data-copy="${addr}" aria-label="Copier l’adresse du connecteur Brix">${ic('copy')}<span>Copier</span></button></div>`;
    copyDemo(panel);
  };
  radios(tabs, (b) => show(ASSISTANTS.find((a) => a.id === b.dataset.as)));
  show(ASSISTANTS[0]);
}

boot(() => {
  pageHero();
  tools();
  actions();
  assistants();
  initMcp();
  copyDemo();
  faq($('[data-faq]'));
});
