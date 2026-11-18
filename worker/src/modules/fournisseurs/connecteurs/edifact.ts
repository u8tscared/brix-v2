/**
 * Génération d'un bon de commande au format EDIFACT ORDERS (D.96A, profil EANCOM).
 *
 * C'est le format EDI utilisé par la plupart des grands distributeurs du bâtiment pour recevoir des
 * commandes de systèmes tiers. Le message produit ici est conforme à la structure EANCOM ; son envoi
 * réel (AS2, SFTP ou plateforme EDI type réseau du distributeur) exige un accord EDI avec chaque
 * fournisseur (identifiants GLN, canal, tests de recette). En attendant, le fichier .edi est joint au
 * mail de commande et téléchargeable.
 */

export interface EdiPartie {
  gln?: string | null; // code GLN (13 chiffres) si connu
  nom: string;
  adresse?: string | null;
  code_postal?: string | null;
  ville?: string | null;
}

export interface EdiCommande {
  numero: string;
  date: Date;
  livraison_souhaitee?: Date | null;
  acheteur: EdiPartie;
  fournisseur: EdiPartie;
  livraison?: EdiPartie | null;
  numero_compte_client?: string | null;
  reference_chantier?: string | null;
  lignes: {
    ean?: string | null;
    reference?: string | null;
    designation: string;
    quantite: number;
    unite: string;
    prix_unitaire_cents?: number | null;
  }[];
}

/** Échappe les caractères de service EDIFACT (UNA:+.? '). */
export function ediEscape(s: string): string {
  return s.replace(/([?+:'])/g, '?$1').replace(/[\r\n]+/g, ' ');
}

const UNITES: Record<string, string> = {
  u: 'PCE', pce: 'PCE', piece: 'PCE', 'pièce': 'PCE',
  m: 'MTR', ml: 'MTR', m2: 'MTK', 'm²': 'MTK', m3: 'MTQ', 'm³': 'MTQ',
  kg: 'KGM', t: 'TNE', l: 'LTR', sac: 'BG', rouleau: 'RO', boite: 'BX', 'boîte': 'BX', palette: 'PF', lot: 'SET',
};

const ymd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '');

function nad(qual: string, p: EdiPartie): string {
  const id = p.gln ? `${ediEscape(p.gln)}::9` : '';
  const name = ediEscape(p.nom).slice(0, 35);
  const street = ediEscape(p.adresse ?? '').slice(0, 35);
  const city = ediEscape(p.ville ?? '').slice(0, 35);
  const cp = ediEscape(p.code_postal ?? '').slice(0, 9);
  return `NAD+${qual}+${id}++${name}+${street}+${city}++${cp}+FR`;
}

export function genererOrders(cmd: EdiCommande, interchangeRef = '1'): string {
  const ref = ediEscape(interchangeRef).slice(0, 14);
  const d = cmd.date;
  const yymmdd = ymd(d).slice(2);
  const hhmm = d.toISOString().slice(11, 16).replace(':', '');
  const sender = ediEscape(cmd.acheteur.gln || 'BRIX');
  const recipient = ediEscape(cmd.fournisseur.gln || 'FOURNISSEUR');

  const segs: string[] = [];
  segs.push('UNH+1+ORDERS:D:96A:UN:EAN008');
  segs.push(`BGM+220+${ediEscape(cmd.numero)}+9`);
  segs.push(`DTM+137:${ymd(d)}:102`);
  if (cmd.livraison_souhaitee) segs.push(`DTM+2:${ymd(cmd.livraison_souhaitee)}:102`);
  if (cmd.reference_chantier) segs.push(`FTX+AAI+++Chantier ?: ${ediEscape(cmd.reference_chantier).slice(0, 60)}`);
  segs.push(nad('BY', cmd.acheteur));
  if (cmd.numero_compte_client) segs.push(`RFF+IT:${ediEscape(cmd.numero_compte_client)}`);
  segs.push(nad('SU', cmd.fournisseur));
  if (cmd.livraison) segs.push(nad('DP', cmd.livraison));
  segs.push('CUX+2:EUR:9');

  cmd.lignes.forEach((l, i) => {
    segs.push(l.ean ? `LIN+${i + 1}++${ediEscape(l.ean)}:SRV` : `LIN+${i + 1}`);
    if (l.reference) segs.push(`PIA+5+${ediEscape(l.reference)}:SA`);
    segs.push(`IMD+F++:::${ediEscape(l.designation).slice(0, 70)}`);
    const unite = UNITES[l.unite.toLowerCase()] ?? 'PCE';
    segs.push(`QTY+21:${trimNum(l.quantite)}:${unite}`);
    if (l.prix_unitaire_cents != null) segs.push(`PRI+AAA:${(l.prix_unitaire_cents / 100).toFixed(2)}`);
  });

  segs.push('UNS+S');
  segs.push(`CNT+2:${cmd.lignes.length}`);
  segs.push(`UNT+${segs.length + 1}+1`);

  return [
    "UNA:+.? '",
    `UNB+UNOC:3+${sender}:14+${recipient}:14+${yymmdd}:${hhmm}+${ref}'`,
    ...segs.map((s) => `${s}'`),
    `UNZ+1+${ref}'`,
  ].join('\n');
}

function trimNum(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
}
