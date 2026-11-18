/* Page Brix AI MCP : en-tête Halo, démo de conversation (partagée avec la page IA),
   grille des outils du serveur MCP, onglets par assistant, FAQ. */
import { boot, $, ic, esc } from '../core.js';
import { faq, pageHero, radios } from '../subpage.js';
import { initMcp } from '../ia/mcp.js';
import { copyDemo } from '../ia/bob.js';

/* Les 12 outils de lecture du serveur (worker/src/modules/mcp/outils.ts), mêmes noms. */
const TOOLS = [
  { id: 'entreprise', icon: 'building-2', tone: 'v', t: 'Votre entreprise', q: 'Où j’en suis aujourd’hui ?' },
  { id: 'devis', icon: 'file-text', tone: 'p', t: 'Devis', q: 'Quels devis attendent une réponse ?' },
  { id: 'factures', icon: 'receipt', tone: 'b', t: 'Factures', q: 'Montre-moi les factures de novembre.' },
  { id: 'impayes', icon: 'alarm-clock', tone: 'r', t: 'Impayés', q: 'Qui ne m’a pas encore payé ?' },
  { id: 'chiffre_affaires', icon: 'chart-line', tone: 'g', t: 'Chiffre d’affaires', q: 'Combien j’ai facturé ce trimestre ?' },
  { id: 'chantiers', icon: 'hard-hat', tone: 'm', t: 'Chantiers', q: 'Quel chantier rapporte le moins ?' },
  { id: 'clients', icon: 'contact', tone: 'i', t: 'Clients', q: 'Retrouve le numéro de Mme Lefèvre.' },
  { id: 'achats', icon: 'package', tone: 's', t: 'Achats', q: 'Quelles commandes sont en route ?' },
  { id: 'demandes_prix', icon: 'scale', tone: 'v', t: 'Demandes de prix', q: 'Qui a répondu pour le tableau T3 ?' },
  { id: 'prix_materiaux', icon: 'tag', tone: 'p', t: 'Prix des matériaux', q: 'Où acheter le PER de 16 moins cher ?' },
  { id: 'hausses_prix', icon: 'trending-up', tone: 'r', t: 'Hausses de prix', q: 'Qu’est-ce qui a augmenté ce mois-ci ?' },
  { id: 'fournisseurs', icon: 'store', tone: 'b', t: 'Fournisseurs', q: 'Avec qui je travaille le plus ?' },
];

const ADDR = 'https://app.brix-app.fr/api/mcp';
const ASSISTANTS = [
  { id: 'claude', name: 'Claude', note: 'Sur claude.ai et dans l’application Claude, ordinateur et téléphone.', steps: ['Ouvrez les réglages, puis la rubrique Connecteurs.', 'Choisissez d’ajouter un connecteur personnalisé, nommez-le Brix et collez l’adresse.', 'Cliquez sur Se connecter, entrez dans votre compte Brix et autorisez.'] },
  { id: 'chatgpt', name: 'ChatGPT', note: 'Sur chatgpt.com et dans l’application ChatGPT, selon votre abonnement.', steps: ['Ouvrez les réglages, puis Applications et connecteurs.', 'Créez un connecteur, nommez-le Brix et collez l’adresse.', 'Connectez-vous à votre compte Brix et autorisez l’accès.'] },
  { id: 'lechat', name: 'Le Chat', note: 'L’assistant de Mistral AI, sur chat.mistral.ai et dans l’application.', steps: ['Ouvrez Intelligence, puis Connecteurs.', 'Ajoutez un connecteur MCP personnalisé et collez l’adresse.', 'Connectez-vous à votre compte Brix et autorisez l’accès.'] },
  { id: 'dev', name: 'Cursor, VS Code…', note: 'Pour les outils qui demandent un fichier de réglages plutôt qu’un bouton.', steps: ['Dans Brix, rubrique Connecteurs IA, créez une clé personnelle.', 'Collez l’adresse avec la clé dans les réglages MCP de votre outil.', 'Redémarrez l’outil : les 12 outils Brix apparaissent.'], code: true },
];

function tools() {
  const ul = $('[data-tools]');
  if (!ul) return;
  ul.innerHTML = TOOLS.map((t) => `<li class="tcell rv"><span class="tl tone-${t.tone}">${ic(t.icon)}</span><span class="tx"><b>${t.t}</b><span class="mono">${t.id}</span><small>« ${esc(t.q)} »</small></span></li>`).join('');
}

function assistants() {
  const tabs = $('[data-as-tabs]'), panel = $('[data-as-panel]');
  if (!tabs || !panel) return;
  tabs.innerHTML = ASSISTANTS.map((a, i) => `<button type="button" role="radio" aria-checked="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-as="${a.id}">${a.name}</button>`).join('');
  tabs.setAttribute('role', 'radiogroup');
  const show = (a) => {
    const addr = a.code ? `${ADDR}/k/votre-clé` : ADDR;
    panel.innerHTML = `<div class="asp-h"><b>${a.name}</b><span>${a.note}</span></div>
      <ol class="asp-l">${a.steps.map((s, i) => `<li><span class="asp-n">${i + 1}</span><span>${s}</span></li>`).join('')}</ol>
      <div class="addr asp-addr"><span class="mono">${addr.replace('https://', '')}</span>${a.code ? '' : `<button type="button" class="addr-b" data-copy="${addr}" aria-label="Copier l’adresse du connecteur Brix">${ic('copy')}<span>Copier</span></button>`}</div>`;
    copyDemo(panel);
  };
  radios(tabs, (b) => show(ASSISTANTS.find((a) => a.id === b.dataset.as)));
  show(ASSISTANTS[0]);
}

boot(() => {
  pageHero();
  tools();
  assistants();
  initMcp();
  copyDemo();
  faq($('[data-faq]'));
});
