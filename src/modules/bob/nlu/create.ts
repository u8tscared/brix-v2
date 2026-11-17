// Intentions « créer » : devis dicté et nouveau client.

import { useBrix } from '@/lib/store';
import { capitalize, money, todayISO, totals, uid } from '@/lib/format';
import type { Client, Devis, DevisLigne } from '@/lib/types';
import { findItem, laborLine, lineFrom } from './library';
import { EMAIL_RE, PHONE_RE, leadingQuantity, matchesName, norm, titleCase } from './text';
import type { BobReply, EngineContext } from './types';

const S = () => useBrix.getState();

const CIVILITY: [RegExp, string][] = [
  [/^(mme|madame)\s+/i, 'Mme '],
  [/^(mlle|mademoiselle)\s+/i, 'Mme '],
  [/^(m\.|mr|monsieur|m)\s+/i, 'M. '],
];
const PRO_RE = /\b(sarl|sas|sci|eurl|boulangerie|restaurant|cabinet|societe|entreprise|syndic|copropriete|hotel|garage|pharmacie|mairie|ecole|agence)\b/;

/** Retrouve un client existant ou en prépare un nouveau. */
function resolveClient(raw: string): { client: Client; created: boolean } | null {
  let name = raw.trim().replace(/^(pour|chez)\s+/i, '').replace(/[.,;:]+$/, '');
  if (!name) return null;
  let civ = '';
  for (const [re, label] of CIVILITY) if (re.test(name)) { civ = label; name = name.replace(re, ''); }
  const s = S();
  const pool = civ ? s.clients.filter((c) => c.kind === 'particulier') : s.clients;
  const found = pool.find((c) => matchesName(name, c.name) || (c.contact && matchesName(name, c.contact)));
  if (found) return { client: found, created: false };
  const pretty = civ + titleCase(name);
  const client: Client = {
    id: uid('c'), kind: PRO_RE.test(norm(name)) ? 'pro' : 'particulier', name: pretty, email: '', phone: '', address: '', city: '', tags: ['Ajouté par Bob'], createdAt: todayISO(), source: 'telephone',
  };
  return { client, created: true };
}

const QTY_WORD = '(?:\\d+|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|quinze|vingt|trente|quelques|plusieurs)';

export function createDevis(text: string, ctx: EngineContext): BobReply {
  const s = S();
  const low = text.replace(/[’]/g, "'");
  // Tout ce qui suit le mot « devis »
  const after = low.slice(low.toLowerCase().search(/devis/) + 5);
  const segments = after.split(/[,;:]|\s-\s|\savec\s/i).map((x) => x.trim()).filter(Boolean);
  let clientRaw = '';
  const itemParts: string[] = [];
  for (let seg of segments) {
    const m = seg.match(/(?:^|\s)(pour|chez)\s+(.+)$/i);
    if (m && !clientRaw) {
      let who = m[2];
      seg = seg.slice(0, m.index).trim();
      // « pour Mme Martin 3 prises » : la quantité coupe le nom
      const cut = who.match(new RegExp(`\\s${QTY_WORD}\\s`, 'i'));
      if (cut && cut.index !== undefined) {
        itemParts.push(who.slice(cut.index).trim());
        who = who.slice(0, cut.index);
      }
      clientRaw = who;
    }
    if (seg && !/^(un|une|le|la|d'|de)$/i.test(seg)) itemParts.push(seg.replace(/^(de|d'|pour)\s+/i, ''));
  }
  const pieces = itemParts.flatMap((p) => p.split(/\s(?:et|plus|\+)\s|\+/i)).map((p) => p.trim()).filter(Boolean);

  const vat = s.company.defaultVat || 10;
  const memoryRate = s.company.hourlyRate || 55;
  const lines: DevisLigne[] = [];
  const nouns: string[] = [];
  let hours = 0;
  for (const p of pieces) {
    const { qty, rest } = leadingQuantity(norm(p));
    if (!rest || /^(devis|nouveau|un devis)$/.test(rest)) continue;
    const it = findItem(rest);
    if (it) {
      lines.push(lineFrom(it, qty, vat));
      hours += it.hours * qty;
      nouns.push(rest.replace(/^(de |d')/, ''));
    } else if (rest.length > 2 && rest.length < 60) {
      lines.push({ id: uid('l'), kind: 'fourniture', designation: capitalize(rest), detail: 'Prix à compléter : je ne connais pas encore cet article', quantity: qty, unit: 'u', unitPriceHt: 0, unitCostHt: 0, vatRate: vat, source: 'bob' });
      nouns.push(rest);
    }
  }
  if (lines.length) {
    const avgCost = s.employees.filter((e) => e.hourlyCost > 0).reduce((x, e, _, a) => x + e.hourlyCost / a.length, 0) || 31.5;
    lines.push(laborLine(hours || 1, memoryRate, avgCost, vat));
  }

  const resolved = clientRaw ? resolveClient(clientRaw) : null;
  if (!resolved) {
    ctx.memo.pendingDevis = text;
    return { text: 'Pour quel client ? Dis-moi juste son nom, je m’occupe du reste.', suggestions: s.clients.slice(0, 3).map((c) => `Pour ${c.name}`) };
  }
  const { client, created } = resolved;
  if (created) s.upsertClient(client);

  const title = nouns.length ? capitalize(nouns.slice(0, 3).join(', ').replace(/, ([^,]*)$/, ' et $1')) : 'Nouveau devis';
  const sections: DevisLigne[] = lines.length ? [{ id: uid('l'), kind: 'section', designation: 'Travaux', quantity: 0, unit: '', unitPriceHt: 0, unitCostHt: 0, vatRate: 0 }, ...lines] : [];
  const devis: Devis = {
    id: uid('q'), number: s.nextNumber('devis'), clientId: client.id, title, status: 'brouillon', createdAt: todayISO(), validityDays: 30, depositPercent: client.kind === 'pro' ? 40 : 30, lines: sections, notes: 'Préparé par Bob à partir de ta demande.',
  };
  s.upsertDevis(devis);
  const t = totals(devis.lines);
  s.pushBob({ icon: 'FileText', text: `J'ai préparé le devis ${devis.number}`, detail: `${client.name} · ${money(t.ht, true)} HT`, cta: 'Relire', to: `/app/devis/${devis.id}` });

  const unknown = lines.filter((l) => l.unitPriceHt === 0).length;
  return {
    text: `${created ? `J’ai créé la fiche de ${client.name}, et ` : ''}${created ? 'j’ai' : 'J’ai'} préparé le devis${lines.length ? ` : ${money(t.ht, true)} HT` : ''}. Il est en brouillon, rien n’est parti.${unknown ? ` ${unknown} prix à compléter.` : ''}`,
    cards: [{
      kind: 'devis', icon: 'FileText', title: `${devis.number} · ${client.name}`, subtitle: title,
      figure: money(t.ht), figureLabel: `HT · ${money(t.ttc)} TTC · marge ${Math.round(t.marginRate)} %`,
      rows: lines.map((l) => ({ label: l.designation, sub: `${l.quantity} ${l.unit} × ${money(l.unitPriceHt)}${l.unitPriceHt === 0 ? ' · à compléter' : ''}`, value: money(l.quantity * l.unitPriceHt), tone: l.unitPriceHt === 0 ? 'warn' : undefined })),
      actions: [
        { label: 'Ouvrir le devis', to: `/app/devis/${devis.id}`, variant: 'primary', icon: 'FileText' },
        {
          label: 'Envoyer', variant: 'secondary', icon: 'Send',
          run: () => {
            const d = useBrix.getState().devis.find((x) => x.id === devis.id);
            if (!d) return 'Ce devis n’existe plus.';
            if (!client.email) return `Il me manque l’e-mail de ${client.name}. Ouvre le devis pour l’ajouter.`;
            useBrix.getState().upsertDevis({ ...d, status: 'envoye', sentAt: todayISO() });
            return `Devis envoyé à ${client.email}.`;
          },
        },
        {
          label: 'Annuler', variant: 'ghost',
          run: () => {
            const st = useBrix.getState();
            st.removeDevis(devis.id);
            if (created) st.removeClient(client.id);
            return 'Devis supprimé.';
          },
        },
      ],
    }],
    suggestions: ['Ajoute 2 spots', 'Quelle est ma marge sur les devis signés ?'],
  };
}

/** « ajoute 2 spots » juste après un devis : complète le dernier brouillon. */
export function addToLastDraft(text: string): BobReply | null {
  const s = S();
  const draft = s.devis.find((d) => d.status === 'brouillon');
  if (!draft) return null;
  const body = norm(text).replace(/^(ajoute|rajoute|mets|met)\s+(aussi\s+)?/, '');
  const pieces = body.split(/\s(?:et|plus)\s|,/).map((x) => x.trim()).filter(Boolean);
  const added: DevisLigne[] = [];
  for (const p of pieces) {
    const { qty, rest } = leadingQuantity(p);
    const it = findItem(rest);
    if (it) added.push(lineFrom(it, qty, s.company.defaultVat || 10));
  }
  if (!added.length) return null;
  const before = draft;
  const next = { ...draft, lines: [...draft.lines, ...added] };
  s.upsertDevis(next);
  const t = totals(next.lines);
  return {
    text: `Ajouté au devis ${draft.number}. Nouveau total : ${money(t.ht, true)} HT.`,
    cards: [{
      kind: 'done', icon: 'FileText', title: `${added.length} ligne${added.length > 1 ? 's' : ''} ajoutée${added.length > 1 ? 's' : ''}`, subtitle: draft.number,
      rows: added.map((l) => ({ label: l.designation, sub: `${l.quantity} ${l.unit} × ${money(l.unitPriceHt)}`, value: money(l.quantity * l.unitPriceHt) })),
      actions: [
        { label: 'Ouvrir le devis', to: `/app/devis/${draft.id}`, variant: 'primary' },
        { label: 'Annuler', variant: 'ghost', run: () => { useBrix.getState().upsertDevis(before); return 'Lignes retirées.'; } },
      ],
    }],
  };
}

export function createClient(text: string, ctx: EngineContext): BobReply {
  const s = S();
  const phone = text.match(PHONE_RE)?.[0] ?? '';
  const email = text.match(EMAIL_RE)?.[0] ?? '';
  let rest = text.replace(PHONE_RE, '').replace(EMAIL_RE, '');
  const m = rest.match(/client\s*(?:qui s'appelle|nomme|:)?\s*(.*)$/i);
  rest = m ? m[1] : ctx.memo.pending === 'client' ? rest : '';
  let city = '';
  const cm = rest.match(/\s(?:à|a)\s+([A-ZÀ-Ü][\wÀ-ü' -]+)$/);
  if (cm) { city = cm[1].trim(); rest = rest.slice(0, cm.index); }
  const name = rest.replace(/[,.;]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!name) {
    ctx.memo.pending = 'client';
    return { text: 'D’accord. Comment s’appelle ton client ? Tu peux ajouter son téléphone et sa ville.', suggestions: ['Sarah Kaci, 06 51 23 98 70, à Villeurbanne'] };
  }
  delete ctx.memo.pending;
  let civ = '';
  let raw = name;
  for (const [re, label] of CIVILITY) if (re.test(raw)) { civ = label; raw = raw.replace(re, ''); }
  const client: Client = { id: uid('c'), kind: PRO_RE.test(norm(raw)) ? 'pro' : 'particulier', name: civ + titleCase(raw), email, phone, address: '', city, tags: [], createdAt: todayISO(), source: 'telephone' };
  s.upsertClient(client);
  s.pushBob({ icon: 'Contact', text: `J'ai ajouté ${client.name} à tes clients`, cta: 'Voir', to: `/app/clients/${client.id}`, done: true });
  return {
    text: `${client.name} est dans tes clients.${!phone ? ' Il me manque son téléphone.' : ''}`,
    cards: [{
      kind: 'done', icon: 'Contact', title: client.name, subtitle: client.kind === 'pro' ? 'Client professionnel' : 'Particulier',
      rows: [{ label: 'Téléphone', value: phone || 'à compléter', tone: phone ? undefined : 'warn' }, { label: 'E-mail', value: email || 'à compléter', tone: email ? undefined : 'warn' }, { label: 'Ville', value: city || 'à compléter', tone: city ? undefined : 'warn' }],
      actions: [
        { label: 'Ouvrir la fiche', to: `/app/clients/${client.id}`, variant: 'primary' },
        { label: 'Faire un devis', ask: `Fais un devis pour ${client.name}`, variant: 'secondary' },
        { label: 'Annuler', variant: 'ghost', run: () => { useBrix.getState().removeClient(client.id); return 'Client retiré.'; } },
      ],
    }],
  };
}
