import { describe, expect, it } from 'vitest';
import { rendreEmail } from './index';
import { exemples, ORDRE_MODELES } from './exemples';
import { MODELES } from './modeles/index';
import { dateLongue, esc, escMultiligne, euros, urlSure } from './modeles/outils';
import type { DonneesEmail, ModeleEmail } from './types';

const EX = exemples('https://app.brix-app.fr/');
const INTERDITS = ['undefined', 'NaN', 'null', '[object Object]'];
const XSS = '<script>alert(1)</script>';

/** Injecte une charge malveillante dans tous les champs texte (récursif). */
function empoisonner<T>(v: T): T {
  if (typeof v === 'string') return (/^(https?:|\d{4}-\d{2}-\d{2})/.test(v) ? v : `${v} ${XSS}`) as T;
  if (Array.isArray(v)) return v.map(empoisonner) as T;
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, empoisonner(x)])) as T;
  return v;
}

describe('outils', () => {
  it('échappe le HTML', () => {
    expect(esc('<a href="x">&\'`</a>')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;&#96;&lt;/a&gt;');
    expect(esc(undefined)).toBe('');
    expect(esc(null)).toBe('');
    expect(escMultiligne('a\n<b>\n\n\n\nc')).toBe('a<br>&lt;b&gt;<br><br>c');
  });
  it('refuse les URL dangereuses', () => {
    expect(urlSure('javascript:alert(1)')).toBe('#');
    expect(urlSure('https://x.fr/?a=1&b="2"')).toBe('https://x.fr/?a=1&amp;b=&quot;2&quot;');
  });
  it('formate les montants en fr-FR', () => {
    expect(euros(4374.81)).toBe('4\u202F374,81\u00A0€');
    expect(euros(40)).toBe('40,00\u00A0€');
    expect(euros(1234567.5)).toBe('1\u202F234\u202F567,50\u00A0€');
    expect(euros(Number.NaN)).toBe('0,00\u00A0€');
    expect(euros(-12.345)).toBe('-12,35\u00A0€');
  });
  it('formate les dates', () => {
    expect(dateLongue('2026-12-01')).toBe('1er\u00A0décembre 2026');
    expect(dateLongue('pas une date')).toBe('');
  });
});

describe('modèles', () => {
  it('chaque modèle a un exemple', () => {
    expect(Object.keys(MODELES).sort()).toEqual([...ORDRE_MODELES].sort());
  });

  for (const m of ORDRE_MODELES) {
    describe(m, () => {
      const ex = EX[m];
      const r = rendreEmail(m, ex.donnees as DonneesEmail[typeof m]);

      it('se rend sans valeur manquante', () => {
        for (const champ of [r.sujet, r.preheader, r.html, r.texte]) {
          for (const mot of INTERDITS) expect(champ, `${mot} dans ${m}`).not.toContain(mot);
        }
        expect(r.html.startsWith('<!DOCTYPE html>')).toBe(true);
        expect(r.html).toContain('color-scheme');
        expect(r.texte.length).toBeGreaterThan(80);
      });

      it('a un sujet court et un preheader', () => {
        expect(r.sujet.length).toBeLessThan(80);
        expect(r.sujet.length).toBeGreaterThan(10);
        expect(r.preheader.length).toBeGreaterThan(20);
        expect(r.preheader.length).toBeLessThan(160);
        expect(r.sujet + r.preheader + r.texte).not.toMatch(/—/); // pas de tiret cadratin
      });

      it('contient le lien principal (HTML et texte)', () => {
        const d = ex.donnees as unknown as { lien?: string; lienApp?: string };
        const lien = m.endsWith('_artisan') || m === 'reponse_fournisseur' || m === 'bienvenue' ? d.lienApp : d.lien;
        if (m === 'code_signature') {
          expect(r.html).toContain('482&nbsp;913');
          expect(r.sujet).toContain('482 913');
          return;
        }
        expect(lien).toBeTruthy();
        expect(r.html).toContain(`href="${esc(lien)}"`);
        expect(r.texte).toContain(lien!);
      });

      it('échappe les données', () => {
        const p = rendreEmail(m, empoisonner(ex.donnees) as DonneesEmail[ModeleEmail] as DonneesEmail[typeof m]);
        expect(p.html).not.toContain('<script>');
        expect(p.html).toContain('&lt;script&gt;');
      });
    });
  }

  it('relance de facture : le ton monte avec le rang', () => {
    const base = EX.facture_relance.donnees;
    const r1 = rendreEmail('facture_relance', { ...base, rang: 1 });
    const r2 = rendreEmail('facture_relance', { ...base, rang: 2 });
    const r3pro = rendreEmail('facture_relance', { ...base, rang: 3, clientPro: true });
    const r3part = rendreEmail('facture_relance', { ...base, rang: 3, clientPro: false });
    expect(r1.sujet).toMatch(/^Petit rappel/);
    expect(r2.sujet).toMatch(/impayée/);
    expect(r3pro.sujet).toMatch(/^Mise en demeure/);
    expect(r3pro.texte).toContain('L441-10');
    expect(r3pro.texte).toContain('40 €');
    expect(r3part.texte).not.toContain('L441-10');
    expect(r1.texte).not.toContain('mise en demeure');
  });

  it('facture : libellé selon le type', () => {
    const base = EX.facture_envoyee.donnees;
    expect(rendreEmail('facture_envoyee', { ...base, type: 'acompte' }).sujet).toMatch(/^Facture d'acompte/);
    expect(rendreEmail('facture_envoyee', { ...base, type: 'solde' }).sujet).toMatch(/^Facture de solde/);
  });

  it('exemples cohérents (totaux = somme des lignes)', () => {
    const c = EX.commande_fournisseur.donnees;
    expect(c.articles.reduce((s, a) => s + a.quantite * a.prixHt, 0)).toBeCloseTo(c.montantHt, 2);
    const d = EX.devis_envoye.donnees;
    expect((d.lignes ?? []).reduce((s, l) => s + l.montant, 0)).toBeCloseTo(d.montantTtc, 2);
  });

  it('modèle inconnu : erreur claire', () => {
    expect(() => rendreEmail('inconnu' as ModeleEmail, {} as never)).toThrow(/inconnu/);
  });
});
