/** Spécification OpenAPI 3.1 de l'API Brix Fournisseurs v1 (servie sur /api/public/v1/openapi.json). */

const ref = (n: string) => ({ $ref: `#/components/schemas/${n}` });
const ok = (schema: unknown, description = 'OK') => ({ description, content: { 'application/json': { schema } } });
const body = (schema: unknown) => ({ required: true, content: { 'application/json': { schema } } });
const idParam = { name: 'id', in: 'path', required: true, schema: { type: 'string' } };
const err = { 401: { description: 'Clé absente ou invalide' }, 403: { description: 'Droit manquant' }, 404: { description: 'Introuvable' } };

export const OPENAPI = {
  openapi: '3.1.0',
  info: {
    title: 'API Brix Fournisseurs',
    version: '1.0.0',
    description:
      "Recevez les demandes de prix et les commandes des artisans qui utilisent Brix, répondez-y et publiez vos prix nets, depuis votre ERP ou votre site. Vous ne voyez que les artisans qui vous ont relié avec votre code partenaire. Montants en centimes d'euro HT. Webhooks signés (en-tête Brix-Signature : t=<horodatage>,v1=<HMAC-SHA256(secret, \"t.corps\")>).",
    contact: { name: 'Brix', url: 'https://brix-app.fr' },
  },
  servers: [{ url: 'https://app.brix-app.fr/api/public/v1' }],
  security: [{ cle: [] }],
  components: {
    securitySchemes: { cle: { type: 'http', scheme: 'bearer', bearerFormat: 'brx_live_…' } },
    schemas: {
      Erreur: { type: 'object', properties: { error: { type: 'string' }, message: { type: 'string' } } },
      Ligne: {
        type: 'object',
        properties: { ligne_id: { type: 'string' }, designation: { type: 'string' }, reference: { type: ['string', 'null'] }, quantite: { type: 'number' }, unite: { type: 'string' } },
      },
      Demande: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Identifiant de VOTRE demande (un par fournisseur consulté)' },
          statut: { enum: ['envoyee', 'vue', 'repondue', 'declinee', 'expiree'] },
          numero: { type: 'string', example: 'DP-2026-0012' },
          titre: { type: 'string' },
          date_limite: { type: ['integer', 'null'], description: 'ms epoch' },
          livraison_souhaitee: { type: ['integer', 'null'] },
          adresse_livraison: { type: ['string', 'null'] },
          lignes: { type: 'array', items: ref('Ligne') },
        },
      },
      Reponse: {
        type: 'object',
        required: ['lignes'],
        properties: {
          lignes: {
            type: 'array',
            items: {
              type: 'object',
              required: ['ligne_id'],
              properties: {
                ligne_id: { type: 'string' },
                prix_unitaire_cents: { type: ['integer', 'null'], description: 'null = indisponible' },
                disponible: { type: 'boolean' },
                reference_proposee: { type: 'string' },
                designation_proposee: { type: 'string', description: 'Produit équivalent proposé' },
                commentaire: { type: 'string' },
              },
            },
          },
          delai_livraison_jours: { type: 'integer' },
          frais_port_cents: { type: 'integer' },
          validite_jours: { type: 'integer', default: 30 },
          commentaire: { type: 'string' },
        },
      },
      Commande: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          numero: { type: 'string', example: 'BC-2026-0042' },
          statut: { enum: ['envoyee', 'confirmee', 'expediee', 'livree_partiel', 'livree', 'facturee', 'annulee'] },
          total_ht_cents: { type: 'integer' },
          frais_port_cents: { type: 'integer' },
          livraison_prevue: { type: ['integer', 'null'] },
          adresse_livraison: { type: ['string', 'null'] },
          mode_livraison: { enum: ['livraison_chantier', 'retrait_agence', 'livraison_depot'] },
          reference_fournisseur: { type: ['string', 'null'], description: "Votre n° d'accusé de réception" },
        },
      },
      MajStatut: {
        type: 'object',
        required: ['statut'],
        properties: {
          statut: { enum: ['confirmee', 'expediee', 'livree_partiel', 'livree'] },
          reference_fournisseur: { type: 'string' },
          livraison_prevue: { type: 'integer', description: 'ms epoch' },
          suivi_transporteur: { type: 'string' },
          commentaire: { type: 'string' },
        },
      },
      Article: {
        type: 'object',
        required: ['reference', 'designation', 'prix_net_cents'],
        properties: {
          reference: { type: 'string' },
          designation: { type: 'string' },
          prix_net_cents: { type: 'integer' },
          prix_public_cents: { type: 'integer' },
          ean: { type: 'string' },
          unite: { type: 'string', default: 'u' },
          marque: { type: 'string' },
          famille: { type: 'string' },
        },
      },
    },
  },
  paths: {
    '/partenaires': {
      post: {
        summary: 'Créer un compte partenaire (renvoie votre code partenaire et une clé API)',
        security: [],
        requestBody: body({ type: 'object', required: ['nom', 'email_technique'], properties: { nom: { type: 'string' }, email_technique: { type: 'string' }, siret: { type: 'string' } } }),
        responses: { 201: ok({ type: 'object' }, 'Créé') },
      },
    },
    '/moi': { get: { summary: 'Votre compte partenaire et la clé utilisée', responses: { 200: ok({ type: 'object' }), ...err } } },
    '/clients': { get: { summary: 'Les artisans qui vous ont relié', responses: { 200: ok({ type: 'object' }), ...err } } },
    '/clients/{id}/tarif': {
      put: {
        summary: 'Publier vos prix nets pour un client (5 000 articles max par appel)',
        parameters: [idParam],
        requestBody: body({ type: 'object', properties: { articles: { type: 'array', items: ref('Article') } } }),
        responses: { 200: ok({ type: 'object' }), ...err },
      },
    },
    '/demandes': {
      get: {
        summary: 'Demandes de prix reçues',
        parameters: [{ name: 'statut', in: 'query', schema: { type: 'string' } }],
        responses: { 200: ok({ type: 'object', properties: { data: { type: 'array', items: ref('Demande') } } }), ...err },
      },
    },
    '/demandes/{id}': { get: { summary: "Détail d'une demande", parameters: [idParam], responses: { 200: ok(ref('Demande')), ...err } } },
    '/demandes/{id}/reponse': { post: { summary: 'Répondre (remplace une réponse précédente)', parameters: [idParam], requestBody: body(ref('Reponse')), responses: { 200: ok({ type: 'object' }), ...err } } },
    '/demandes/{id}/decliner': { post: { summary: 'Décliner', parameters: [idParam], requestBody: body({ type: 'object', properties: { motif: { type: 'string' } } }), responses: { 200: ok({ type: 'object' }), ...err } } },
    '/commandes': { get: { summary: 'Commandes reçues', parameters: [{ name: 'statut', in: 'query', schema: { type: 'string' } }], responses: { 200: ok({ type: 'object' }), ...err } } },
    '/commandes/{id}': { get: { summary: "Détail d'une commande", parameters: [idParam], responses: { 200: ok(ref('Commande')), ...err } } },
    '/commandes/{id}/statut': { post: { summary: 'Confirmer, expédier, livrer', parameters: [idParam], requestBody: body(ref('MajStatut')), responses: { 200: ok({ type: 'object' }), 409: { description: 'Transition interdite' }, ...err } } },
    '/commandes/{id}/livraison': {
      post: {
        summary: 'Bon de livraison : quantités livrées par ligne',
        parameters: [idParam],
        requestBody: body({ type: 'object', properties: { lignes: { type: 'array', items: { type: 'object', properties: { ligne_id: { type: 'string' }, quantite_livree: { type: 'number' } } } } } }),
        responses: { 200: ok({ type: 'object' }), ...err },
      },
    },
    '/webhooks': {
      get: { summary: 'Vos webhooks', responses: { 200: ok({ type: 'object' }), ...err } },
      post: {
        summary: 'Créer un webhook (HTTPS). Événements : demande.creee, demande.annulee, commande.creee, commande.annulee, liaison.creee',
        requestBody: body({ type: 'object', required: ['url'], properties: { url: { type: 'string' }, evenements: { type: 'array', items: { type: 'string' } } } }),
        responses: { 201: ok({ type: 'object' }, 'Créé (le secret est renvoyé une seule fois)'), ...err },
      },
    },
    '/webhooks/{id}': { delete: { summary: 'Supprimer un webhook', parameters: [idParam], responses: { 200: ok({ type: 'object' }), ...err } } },
    '/cles': { post: { summary: 'Créer une clé API supplémentaire', responses: { 201: ok({ type: 'object' }), ...err } } },
    '/cles/{id}': { delete: { summary: 'Révoquer une clé', parameters: [idParam], responses: { 200: ok({ type: 'object' }), ...err } } },
  },
} as const;
