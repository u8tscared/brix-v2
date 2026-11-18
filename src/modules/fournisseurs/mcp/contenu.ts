// Pas à pas par assistant pour relier Brix AI (menus relevés en novembre 2026, voir docs/brix-ai/clients-mcp.md).
// {url} est remplacé par l'adresse du serveur. Les menus changent souvent : garder ces textes courts.

export interface Assistant {
  key: string;
  nom: string;
  sousTitre: string;
  etapes: string[];
  notes?: string[];
  /** Bloc de configuration à copier (outils pour développeurs). */
  code?: { titre: string; texte: string }[];
}

export const ASSISTANTS: Assistant[] = [
  {
    key: 'claude',
    nom: 'Claude',
    sousTitre: 'Sur le web, l’application ordinateur et le téléphone',
    etapes: [
      'Ouvrez claude.ai (ou l’application Claude sur ordinateur).',
      'Personnaliser › Connecteurs › Ajouter › Ajouter un connecteur personnalisé.',
      'Nom : Brix. Adresse : collez {url}, puis Ajouter.',
      'Cliquez sur Connecter : Brix s’ouvre, connectez-vous avec le compte du gérant et touchez « Autoriser ».',
    ],
    notes: [
      'Ajouté une fois, le connecteur est aussi disponible dans Claude sur votre téléphone.',
      'Offre gratuite : un seul connecteur personnalisé.',
      'Claude Team ou Enterprise : le propriétaire l’ajoute dans Paramètres de l’organisation › Connecteurs, puis chacun clique sur Connecter.',
    ],
  },
  {
    key: 'chatgpt',
    nom: 'ChatGPT',
    sousTitre: 'Sur ordinateur, offres payantes',
    etapes: [
      'Ouvrez chatgpt.com sur ordinateur.',
      'Réglages › Applications et connecteurs › Paramètres avancés : activez le Mode développeur.',
      'Créer (« Add custom MCP server ») : nom Brix, adresse {url}, authentification OAuth.',
      'Acceptez l’avertissement, puis Connecter : Brix s’ouvre, touchez « Autoriser ».',
    ],
    notes: [
      'ChatGPT vous demande de confirmer chaque action (création d’un brouillon, d’un rendez-vous…).',
      'Dans un espace ChatGPT d’entreprise, un administrateur doit d’abord activer le mode développeur.',
    ],
  },
  {
    key: 'lechat',
    nom: 'Le Chat',
    sousTitre: 'Mistral AI',
    etapes: [
      'Panneau de gauche › Intelligence › Connecteurs › Ajouter un connecteur.',
      'Onglet « Connecteur MCP personnalisé ».',
      'Nom sans espace : brix. Adresse : {url}, puis Connecter.',
      'Brix s’ouvre : connectez-vous et touchez « Autoriser ».',
    ],
    notes: ['Il faut être administrateur de l’espace Le Chat (sur les offres Free et Pro, c’est le titulaire du compte).'],
  },
  {
    key: 'perplexity',
    nom: 'Perplexity',
    sousTitre: 'Offres payantes',
    etapes: [
      'Réglages › Connecteurs › + Connecteur personnalisé › Distant.',
      'Nom : Brix. Adresse : {url}, puis Ajouter.',
      'Cliquez sur la carte Brix pour l’autoriser, puis touchez « Autoriser » dans Brix.',
    ],
    notes: ['En entreprise, un administrateur doit d’abord autoriser les connecteurs personnalisés.'],
  },
  {
    key: 'grok',
    nom: 'Grok',
    sousTitre: 'xAI, offres payantes',
    etapes: ['Ouvrez grok.com/connectors.', 'New Connector › Custom.', 'Collez {url}, puis autorisez Brix.'],
  },
  {
    key: 'copilot',
    nom: 'Copilot Studio',
    sousTitre: 'Microsoft, pour vos agents d’entreprise',
    etapes: [
      'Ouvrez votre agent › Outils › Ajouter un outil › Model Context Protocol.',
      'Adresse du serveur : {url}.',
      'Authentification : OAuth 2.0, mode « Découverte dynamique ».',
      'Créez la connexion, puis touchez « Autoriser » dans Brix.',
    ],
    notes: ['Copilot grand public (Windows, Edge) ne permet pas encore d’ajouter un connecteur.'],
  },
  {
    key: 'dev',
    nom: 'Outils de développement',
    sousTitre: 'Claude Code, Cursor, VS Code, Gemini CLI, Windsurf',
    etapes: [
      'Ajoutez Brix avec la commande ou le fichier ci-dessous.',
      'Au premier usage, l’outil ouvre Brix dans votre navigateur : touchez « Autoriser ».',
    ],
    code: [
      { titre: 'Claude Code', texte: 'claude mcp add --transport http brix {url}\n# puis /mcp pour vous connecter' },
      { titre: 'Cursor · ~/.cursor/mcp.json', texte: '{ "mcpServers": { "brix": { "url": "{url}" } } }' },
      { titre: 'VS Code · .vscode/mcp.json', texte: '{ "servers": { "brix": { "type": "http", "url": "{url}" } } }' },
      { titre: 'Gemini CLI · ~/.gemini/settings.json', texte: '{ "mcpServers": { "brix": { "httpUrl": "{url}" } } }\n# puis /mcp auth brix' },
      { titre: 'Windsurf · ~/.codeium/windsurf/mcp_config.json', texte: '{ "mcpServers": { "brix": { "serverUrl": "{url}" } } }' },
    ],
  },
];

export const avecUrl = (texte: string, url: string) => texte.split('{url}').join(url);

/** Ce que l'assistant peut lire (outils de lecture). */
export const LECTURES = [
  'Votre entreprise', 'Vos devis', 'Vos factures', 'Les impayés', 'Votre chiffre d’affaires', 'Vos chantiers',
  'Vos clients', 'Votre planning', 'Les demandes de clients', 'Achats et livraisons', 'Demandes de prix', 'Prix et hausses des matériaux', 'Vos fournisseurs',
];

/** Ce qu'il peut préparer avec « Lecture et actions » (outils d'écriture). */
export const ACTIONS = [
  'Créer une fiche client', 'Préparer un devis en brouillon', 'Ajouter des lignes à un devis brouillon',
  'Ajouter un rendez-vous au planning', 'Noter une demande de client', 'Marquer une relance à faire',
];

/** Libellés des outils pour le journal. */
export const NOM_OUTIL: Record<string, string> = {
  creer_client: 'Client créé', creer_devis_brouillon: 'Devis brouillon', ajouter_ligne_devis: 'Lignes ajoutées',
  creer_rendez_vous: 'Rendez-vous', noter_demande: 'Demande notée', marquer_relance_a_faire: 'Relance à faire',
};
