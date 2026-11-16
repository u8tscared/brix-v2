/* Tarifs : offres, simulateur, tableau complet fonction par fonction, FAQ facturation. */
import { boot, gsap, reduce, $, $$, ic, euro } from '../core.js';
import { renderPlans, initBilling, initSimulator, initFaq } from '../shared.js';
import { DEPARTMENTS } from '../../data/departments.js';
import { PLAN_LIST, MCP_ADDON } from '../../data/plans.js';

const ORDER = PLAN_LIST.map((p) => p.id); // start < pro < equipe < entreprise
const TAG = { new: ['new', 'Nouveau'], only: ['only', 'Exclusif Brix'], soon: ['soon', 'Bientôt'] };
// une seule exception tarifaire : Brix AI MCP est en option sur Pro (voir plans.js)
const OPTION = { 'Brix AI MCP': { pro: `${euro(MCP_ADDON)}` } };

const yes = `<span class="tf-y">${ic('check')}<span class="sr">Inclus</span></span>`;
const soon = '<span class="tf-s" title="Bientôt">' + ic('clock') + '<span class="sr">Bientôt inclus</span></span>';
const no = '<span class="tf-n" aria-hidden="true"></span><span class="sr">Non inclus</span>';
const opt = (t) => `<span class="tf-o">${t}</span><span class="sr"> par mois en option</span>`;
const txt = (t) => `<span class="tf-txt">${t}</span>`;

function cells(minPlan, f = {}) {
  return ORDER.map((id) => {
    const p = PLAN_LIST.find((x) => x.id === id);
    const o = OPTION[f.name]?.[id];
    const v = o ? opt(o) : ORDER.indexOf(id) >= ORDER.indexOf(minPlan) ? (f.tag === 'soon' ? soon : yes) : no;
    return `<td class="${p.hi ? 'hi' : ''}">${v}</td>`;
  }).join('');
}

function group(title, icon, color, count) {
  return `<tr class="tf-g"><th colspan="${ORDER.length + 1}" scope="colgroup"><span class="tf-gi" style="background:${color}">${ic(icon)}</span>${title}${count ? `<small>${count} fonctions</small>` : ''}</th></tr>`;
}

function renderTable(t) {
  const head = `<thead><tr><th scope="col" class="tf-fc"><span class="sr">Fonction</span></th>${PLAN_LIST.map((p) => `
    <th scope="col" class="${p.hi ? 'hi' : ''}"><b>${p.id === 'entreprise' ? '<span class="tf-l">Entreprise</span><span class="tf-sh" aria-hidden="true">Entr.</span>' : p.name}</b><span class="tf-pr">${p.monthly === null ? 'Sur devis' : p.monthly === 0 ? '0 €' : `${euro(p.monthly)} <small>/mois</small>`}</span></th>`).join('')}</tr></thead>`;

  // l'essentiel : repris des offres
  const base = group("L'essentiel", 'layers', '#130f26')
    + `<tr><th scope="row"><b>Devis et factures</b><span>Nombre de documents par mois</span></th>${ORDER.map((id) => `<td class="${PLAN_LIST.find((p) => p.id === id).hi ? 'hi' : ''}">${txt(id === 'start' ? '5 + 5' : 'Illimités')}</td>`).join('')}</tr>`
    + `<tr><th scope="row"><b>Utilisateurs</b><span>Personnes qui se connectent à Brix</span></th><td>${txt('1')}</td><td>${txt('1')}</td><td class="hi">${txt('5 inclus')}<small>puis 9 € par personne</small></td><td>${txt('Sur mesure')}</td></tr>`;

  const depts = DEPARTMENTS.map((d) => group(d.name, d.icon, d.color, d.features.length) + d.features.map((f) => `
    <tr><th scope="row"><b>${f.name}${f.tag ? ` <span class="badge ${TAG[f.tag][0]}">${TAG[f.tag][1]}</span>` : ''}</b><span>${f.desc}</span></th>${cells(f.plan, f)}</tr>`).join('')).join('');

  // ce qui n'existe qu'en Entreprise, repris de l'offre
  const ent = PLAN_LIST.find((p) => p.id === 'entreprise');
  const entRows = group('Entreprise', 'building-2', '#1f389d') + ent.items.map((i) => `<tr><th scope="row"><b>${i}</b></th>${cells('entreprise')}</tr>`).join('');

  t.innerHTML = `<caption class="sr">Comparatif des offres Brix ${PLAN_LIST.map((p) => p.name).join(', ')}, fonction par fonction</caption>${head}<tbody>${base}${depts}${entRows}</tbody>`;
}

boot(() => {
  const plans = $('[data-plans]');
  renderPlans(plans);
  initBilling($('.toggle'), plans);
  initSimulator($('.sim'));
  initFaq($('[data-faq]'));

  const t = $('[data-tf]');
  renderTable(t);
  if (!reduce) {
    $$('tbody tr.tf-g', t).forEach((g) => {
      gsap.from(g.querySelector('.tf-gi'), { scale: 0, rotate: -30, duration: 0.6, ease: 'back.out(2.2)', scrollTrigger: { trigger: g, start: 'top 88%', once: true } });
    });
  }
});
