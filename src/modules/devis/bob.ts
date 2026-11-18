// Suggestions de Bob sur un devis : calculées localement (règles métier), chaque action modifie
// vraiment le devis. Plus tard, l'API Bob pourra enrichir cette liste (POST /api/bob/devis/review).

import type { Client, Company, Devis, DevisLigne } from '@/lib/types';
import { money, pct, totals, uid } from '@/lib/format';
import { findLibItemForLine, fold, LIBRARY, type LibItem } from './library';
import { groupLots, insertInLot, insertGrouped, isPriced, lineFromLib, lotName, mainVat, raiseMargin } from './logic';
import { chunksToLines, dictationHintForCompany, parseDictation } from './voiceParser';

export interface Suggestion {
  key: string;
  icon: 'alert' | 'trend' | 'percent' | 'aide' | 'tva' | 'plus';
  title: string;
  text: string;
  why?: string;
  action?: { label: string; apply: (d: Devis) => Partial<Devis>; done: string };
}

const lib = (designation: string) => LIBRARY.find((i) => i.designation === designation)!;

export function buildSuggestions(d: Devis, client: Client | undefined, company: Company): Suggestion[] {
  const out: Suggestion[] = [];
  const priced = d.lines.filter(isPriced);
  const text = fold(d.lines.map((l) => `${l.designation} ${l.detail ?? ''}`).join(' | ') + ' ' + d.title);
  const has = (re: RegExp) => re.test(text);
  const vat = mainVat(d.lines, company.defaultVat);
  const lots = groupLots(d.lines);
  const firstSection = (re: RegExp) => lots.find((l) => l.section && re.test(fold(l.section.designation)))?.section?.id ?? lots[lots.length - 1]?.section?.id ?? null;
  const add = (it: LibItem, qty = 1, section: string | null = firstSection(/tableau|mise en service/)) => (x: Devis) => ({ lines: insertInLot(x.lines, section, [lineFromLib(it, vat, qty, 'bob')]) });

  if (!priced.length) {
    out.push({ key: 'empty', icon: 'plus', title: 'Dicte-moi ton devis.', text: `Dis par exemple ${dictationHintForCompany(company.trade)} : je range tout dans les bons lots, avec tes prix.` });
    return out;
  }

  // ----- Oublis par métier : électricité
  const elecTableau = has(/coffret|tableau|disjoncteur/);
  if (elecTableau) {
    if (!has(/differentiel/))
      out.push({ key: 'diff-a', icon: 'alert', title: 'Aucun différentiel 30 mA.', text: 'La NF C 15-100 impose au moins un interrupteur différentiel 30 mA type A par tableau.', why: 'Sans lui, le Consuel sera refusé.', action: { label: 'Ajouter 2 type A', apply: add(lib('Interrupteur différentiel 40 A 30 mA type A'), 2), done: '2 différentiels type A ajoutés' } });
    else if (!has(/type f/) && (has(/plaque|induction|lave|cuisson|cuisine|renovation|\bt\d\b|appartement|maison/) || priced.length > 6))
      out.push({ key: 'diff-f', icon: 'alert', title: 'Pas de différentiel type F.', text: 'Plaque à induction et lave-linge doivent être protégés par un différentiel 30 mA type F.', why: 'Exigence NF C 15-100 depuis 2016, souvent contrôlée.', action: { label: 'Ajouter le type F', apply: add(lib('Interrupteur différentiel 40 A 30 mA type F')), done: 'Différentiel type F ajouté' } });
    if (!has(/consuel/) && has(/renovation|tableau|coffret|neuf|conformite|appartement|maison|\bt\d\b/))
      out.push({ key: 'consuel', icon: 'alert', title: 'Attestation Consuel oubliée.', text: `En rénovation totale avec mise hors tension, Enedis exige le Consuel avant de remettre le courant. Forfait ${money(180)} HT.`, action: { label: 'Ajouter le Consuel', apply: add(lib('Attestation de conformité Consuel'), 1, firstSection(/mise en service/)), done: 'Consuel ajouté au devis' } });
    if (!has(/terre|piquet|equipotentielle/))
      out.push({ key: 'terre', icon: 'alert', title: 'Mise à la terre non prévue.', text: 'Rien sur la prise de terre : vérifie la résistance (moins de 100 ohms) ou prévois un piquet.', action: { label: 'Ajouter la mise à la terre', apply: add(lib('Mise à la terre : piquet et câble 25 mm²'), 1, firstSection(/mise en service|tableau/)), done: 'Mise à la terre ajoutée' } });
  }
  // ----- Plomberie
  if (has(/chauffe-eau|chauffe eau|ballon|thermodynamique/) && !has(/groupe de securite/))
    out.push({ key: 'gs', icon: 'alert', title: 'Groupe de sécurité manquant.', text: 'Obligatoire sur tout chauffe-eau à accumulation (DTU 60.1).', action: { label: 'Ajouter', apply: add(lib('Groupe de sécurité'), 1, firstSection(/eau chaude|sanitaire/)), done: 'Groupe de sécurité ajouté' } });
  // ----- Peinture
  if (has(/peinture/) && !has(/protection|lessivage|rebouchage|enduit|sous-couche|impression/)) {
    const area = priced.filter((l) => /peinture/i.test(l.designation) && l.unit === 'm²').reduce((s, l) => s + l.quantity, 0) || 20;
    out.push({ key: 'prep', icon: 'alert', title: 'Préparation des supports absente.', text: `Protection et sous-couche sur ${Math.round(area)} m² : c'est ce qui fait tenir ta peinture, et ça se facture.`, action: { label: 'Ajouter la préparation', apply: (x) => ({ lines: insertGrouped(x.lines, [lineFromLib(lib('Protection des sols et du mobilier'), vat, area, 'bob'), lineFromLib(lib('Impression (sous-couche)'), vat, area, 'bob')].map((l) => ({ ...l, lot: 'Préparation' }))) }), done: 'Préparation ajoutée' } });
  }
  // ----- Carrelage
  if (has(/carrelage|faience/)) {
    if (has(/douche|salle de bain|sdb|italienne/) && !has(/etancheite|spec/))
      out.push({ key: 'spec', icon: 'alert', title: 'Étanchéité sous carrelage oubliée.', text: 'En douche et salle de bain, la SPEC est obligatoire sous le carrelage (DTU 52.2).', action: { label: 'Ajouter 6 m² de SPEC', apply: (x) => ({ lines: insertGrouped(x.lines, [{ ...lineFromLib(lib('Étanchéité sous carrelage (SPEC)'), vat, 6, 'bob'), lot: 'Préparation des supports' }]) }), done: 'SPEC ajoutée' } });
    if (!has(/primaire|ragreage|colle/))
      out.push({ key: 'primaire', icon: 'alert', title: "Pas de primaire d'accroche.", text: 'Sans primaire ni colle, ton prix au m² est trop bas de 5 à 8 €.', action: { label: 'Ajouter le primaire', apply: (x) => ({ lines: insertGrouped(x.lines, [{ ...lineFromLib(lib("Primaire d'accroche"), vat, priced.filter((l) => l.unit === 'm²').reduce((s, l) => Math.max(s, l.quantity), 10), 'bob'), lot: 'Préparation des supports' }]) }), done: 'Primaire ajouté' } });
  }
  // ----- Plâtrerie
  if (has(/cloison|doublage|ba13|plafond suspendu/) && !has(/bande|jointoiement/))
    out.push({ key: 'bandes', icon: 'alert', title: 'Bandes et joints non comptés.', text: 'Les bandes et l’enduit représentent environ 9 € du m² : à ajouter.', action: { label: 'Ajouter', apply: (x) => ({ lines: insertGrouped(x.lines, [{ ...lineFromLib(lib('Bandes et enduit de jointoiement'), vat, priced.filter((l) => l.unit === 'm²').reduce((s, l) => s + l.quantity, 0) || 10, 'bob'), lot: 'Cloisons' }]) }), done: 'Bandes et joints ajoutés' } });
  // ----- Menuiserie
  if (has(/fenetre|baie|porte-fenetre/) && !has(/depose/))
    out.push({ key: 'depose', icon: 'alert', title: 'Dépose des anciennes menuiseries ?', text: 'Rien de prévu pour retirer et évacuer les anciennes fenêtres.', action: { label: 'Ajouter la dépose', apply: (x) => ({ lines: insertGrouped(x.lines, [{ ...lineFromLib(lib('Dépose et évacuation des anciennes menuiseries'), vat, priced.filter((l) => /fenetre|baie/.test(fold(l.designation))).reduce((s, l) => s + l.quantity, 0), 'bob'), lot: 'Menuiseries extérieures' }]) }), done: 'Dépose ajoutée' } });
  // ----- Maçonnerie
  if (has(/demolition|ouverture|parpaing|dalle|depose carrelage/) && !has(/gravat|benne/))
    out.push({ key: 'gravats', icon: 'alert', title: 'Évacuation des gravats oubliée.', text: 'Benne et mise en déchetterie : comptez au moins un forfait.', action: { label: 'Ajouter la benne', apply: (x) => ({ lines: insertGrouped(x.lines, [{ ...lineFromLib(lib('Évacuation des gravats et benne'), vat, 1, 'bob'), lot: 'Installation et évacuation' }]) }), done: 'Évacuation ajoutée' } });

  // ----- Prix fournisseurs en hausse
  const raised = priced
    .map((l) => ({ l, it: findLibItemForLine(l) }))
    .filter((x): x is { l: DevisLigne; it: LibItem } => !!x.it?.priceChange && x.l.unitCostHt <= x.it.cost + 0.001);
  if (raised.length) {
    const pc = raised[0].it.priceChange!;
    const delta = raised.reduce((s, { l, it }) => s + l.quantity * it.cost * (it.priceChange!.pct / 100), 0);
    const ids = new Set(raised.map((x) => x.l.id));
    out.push({
      key: `prix-${raised.map((x) => x.l.id).join('')}`,
      icon: 'trend',
      title: `${pc.reason.charAt(0).toUpperCase()}${pc.reason.slice(1)} : +${pc.pct} % ${pc.since}.`,
      text: `${raised.length} ligne${raised.length > 1 ? 's' : ''} ${raised.length > 1 ? 'sont sous-évaluées' : 'est sous-évaluée'} de ${money(delta)} sur ton coût d'achat.`,
      action: {
        label: 'Mettre à jour les prix',
        apply: (x) => ({
          lines: x.lines.map((l) => {
            if (!ids.has(l.id)) return l;
            const it = findLibItemForLine(l)!;
            const k = 1 + it.priceChange!.pct / 100;
            return { ...l, unitCostHt: Math.round(it.cost * k * 100) / 100, unitPriceHt: Math.round(l.unitPriceHt * k * 100) / 100, source: 'bob' };
          }),
        }),
        done: 'Prix fournisseurs mis à jour',
      },
    });
  }

  // ----- Marge faible par lot
  const t = totals(d.lines);
  for (const lot of lots) {
    if (!lot.section || lot.ht < 50 || lot.cost === 0) continue;
    if (lot.marginRate < 25) {
      const ids = new Set(lot.items.map((l) => l.id));
      out.push({
        key: `marge-${lot.section.id}-${Math.round(lot.marginRate)}`,
        icon: 'percent',
        title: `${lotName(lot.section.designation)} à ${pct(lot.marginRate)} de marge.`,
        text: `Ta moyenne sur ce devis est à ${pct(t.marginRate)}. Remonter ce lot à 30 % rapporte ${money(lot.cost / 0.7 - lot.ht)} de plus.`,
        action: { label: 'Remonter à 30 %', apply: (x) => ({ lines: raiseMargin(x.lines, 30, ids) }), done: 'Marge du lot remontée à 30 %' },
      });
    }
  }

  // ----- TVA
  const particulier = client?.kind !== 'pro';
  if (client && !particulier && priced.some((l) => l.vatRate < 20) && !/syndic|sci|copro/i.test(`${client.name} ${client.tags.join(' ')}`))
    out.push({ key: 'tva-pro', icon: 'tva', title: 'TVA réduite sur un local professionnel ?', text: `${client.name} est un professionnel : la TVA à 10 % ne vaut que pour les logements. Passe le devis à 20 %.`, action: { label: 'Passer à 20 %', apply: (x) => ({ lines: x.lines.map((l) => (isPriced(l) ? { ...l, vatRate: 20 } : l)) }), done: 'TVA passée à 20 %' } });
  if (particulier && priced.some((l) => l.vatRate === 20) && !has(/neuf/))
    out.push({ key: 'tva-reno', icon: 'tva', title: 'TVA à 10 % possible.', text: `Logement de plus de 2 ans : la rénovation passe à 10 %. Ton client économise ${money(priced.filter((l) => l.vatRate === 20).reduce((s, l) => s + l.quantity * l.unitPriceHt * 0.1, 0))}.`, action: { label: 'Passer à 10 %', apply: (x) => ({ lines: x.lines.map((l) => (isPriced(l) && l.vatRate === 20 ? { ...l, vatRate: 10 } : l)) }), done: 'TVA passée à 10 %, attestation ajoutée au PDF' } });

  // ----- Aides
  const aides = d.aides ?? [];
  const hasAide = (re: RegExp) => aides.some((a) => re.test(fold(a.label)));
  if (particulier) {
    if (has(/borne|irve|recharge/) && !hasAide(/borne/))
      out.push({ key: 'aide-irve', icon: 'aide', title: "Crédit d'impôt borne : 500 €.", text: 'Ton client récupère 75 % du prix de la borne, jusqu’à 500 €. À afficher sur le devis, ça aide à signer.', action: { label: "Afficher l'aide", apply: (x) => ({ aides: [...(x.aides ?? []), { label: "Crédit d'impôt borne (75 %, plafond 500 €)", amount: 500 }] }), done: 'Aide affichée sur le devis' } });
    if (has(/vmc double|pompe a chaleur|thermodynamique|comble|rampant|isolation|fenetre/) && !hasAide(/primerenov|cee/)) {
      const amount = has(/pompe a chaleur/) ? 4000 : has(/vmc double/) ? 2500 : has(/thermodynamique/) ? 1200 : 1500;
      out.push({ key: 'aide-mpr', icon: 'aide', title: `MaPrimeRénov' et CEE : environ ${money(amount, true)}.`, text: 'Ces travaux sont éligibles (artisan RGE, ménage aux revenus modestes ou intermédiaires). Montant indicatif à confirmer sur France Rénov’.', action: { label: "Afficher l'aide", apply: (x) => ({ aides: [...(x.aides ?? []), { label: "MaPrimeRénov' + primes CEE (estimation)", amount }] }), done: 'Aide affichée sur le devis' } });
    } else if (company.trade === 'electricien' && has(/renovation|appartement|maison|\bt\d\b/) && !has(/vmc/))
      out.push({ key: 'aide-vmc', icon: 'aide', title: "MaPrimeRénov' ne finance pas l'électricité seule.", text: `Avec une VMC double flux, ${client?.name ?? 'ton client'} peut toucher jusqu'à ${money(2500, true)} et la ligne passe à 5,5 %.`, action: { label: 'Ajouter le lot VMC', apply: (x) => ({ lines: insertGrouped(x.lines, [{ ...lineFromLib(lib('VMC double flux haut rendement'), 5.5, 1, 'bob'), lot: 'Ventilation' }, { ...lineFromLib(lib("Main d'œuvre électricien"), 5.5, 8, 'bob'), designation: 'Pose de la VMC et des bouches', lot: 'Ventilation' }]), aides: [...(x.aides ?? []), { label: "MaPrimeRénov' VMC double flux (estimation)", amount: 2500 }] }), done: 'Lot VMC ajouté avec l’aide' } });
  }
  return out;
}

// ---------------------------------------------------------------------------
// « Demande ou dicte à Bob » : petites commandes en langage courant.

export interface BobReply {
  text: string;
  patch?: Partial<Devis>;
}

export function interpret(input: string, d: Devis, ctx: { hourlyRate: number; vat: number }): BobReply {
  const q = fold(input);
  const n = (re: RegExp) => {
    const m = q.match(re);
    return m ? Number(m[1].replace(',', '.')) : undefined;
  };
  const t = totals(d.lines);
  if (/remise|geste|reduction/.test(q)) {
    const p = n(/(\d+(?:[.,]\d+)?)\s*(?:%|pour ?cent)/);
    const e = p === undefined ? n(/(\d+(?:[.,]\d+)?)\s*(?:€|euro)/) : undefined;
    const amount = p !== undefined ? (t.ht * p) / 100 : e ?? (t.ht * 5) / 100;
    const line: DevisLigne = { id: uid('l'), kind: 'ouvrage', designation: p !== undefined ? `Remise commerciale ${pct(p)}` : 'Geste commercial', quantity: 1, unit: 'forfait', unitPriceHt: -Math.round(amount * 100) / 100, unitCostHt: 0, vatRate: mainVat(d.lines, ctx.vat), source: 'bob' };
    return { text: `J'ai ajouté une remise de ${money(amount)} HT en fin de devis. Ta marge passe à ${pct(((t.margin - amount) / (t.ht - amount || 1)) * 100)}.`, patch: { lines: [...d.lines, line] } };
  }
  if (/marge/.test(q)) {
    const target = n(/(\d+)/) ?? 30;
    const lines = raiseMargin(d.lines, target);
    const after = totals(lines);
    return { text: `C'est fait : toutes les lignes sont à ${target} % de marge minimum. Nouveau total ${money(after.ht)} HT (+${money(after.ht - t.ht)}).`, patch: { lines } };
  }
  if (/tva/.test(q)) {
    const rate = /5[.,]5/.test(q) ? 5.5 : n(/(20|10)/);
    if (rate) return { text: `Toutes les lignes sont passées à ${pct(rate, rate % 1 ? 1 : 0)} de TVA.`, patch: { lines: d.lines.map((l) => (isPriced(l) ? { ...l, vatRate: rate } : l)) } };
  }
  if (/acompte/.test(q)) {
    const p = n(/(\d+)/);
    if (p !== undefined) return { text: `Acompte réglé à ${p} % : ${money((t.ttc * p) / 100)} à la signature.`, patch: { depositPercent: Math.min(100, p) } };
  }
  if (/validit|valable/.test(q)) {
    const days = n(/(\d+)/);
    if (days) return { text: `Le devis est maintenant valable ${days} jours.`, patch: { validityDays: days } };
  }
  const lines = chunksToLines(parseDictation(input), { hourlyRate: ctx.hourlyRate, vatRate: mainVat(d.lines, ctx.vat) });
  if (lines.length) {
    const sum = lines.reduce((s, l) => s + l.quantity * l.unitPriceHt, 0);
    return { text: `J'ai ajouté ${lines.length} ligne${lines.length > 1 ? 's' : ''} depuis ta bibliothèque, pour ${money(sum)} HT : ${lines.map((l) => `${l.quantity} × ${l.designation}`).join(', ')}.`, patch: { lines: insertGrouped(d.lines, lines) } };
  }
  return { text: "Je n'ai pas trouvé ça dans ta bibliothèque. Essaie « ajoute 4 spots LED », « remise de 5 % », « marge à 30 % », « TVA à 5,5 » ou « acompte 40 % »." };
}
