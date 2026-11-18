/* Départements : onglets en pilules avec indicateur qui glisse, pastilles à la couleur
   de chaque département, une fonction à la une en grande carte, les autres qui flottent. */
import { gsap, ScrollTrigger, reduce, fine, $, $$, ic } from '../core.js';
import { DEPARTMENTS, PLANS } from '../../data/departments.js';
import bmark from '../../../partials/brix-b.svg?raw';

const TAG = { new: ['new', 'Nouveau'], only: ['only', 'Exclusif Brix'], soon: ['soon', 'Bientôt'] };
const ORDER = ['start', 'pro', 'equipe', 'entreprise'];
const minPlan = (d) => PLANS[ORDER[Math.min(...d.features.map((f) => ORDER.indexOf(f.plan)))]];
// Bob : pas d'étincelles, on prend le logo Brix
const depIcon = (d, cls = '') => (d.id === 'bob' ? `<span class="b-logo ${cls}" aria-hidden="true">${bmark}</span>` : ic(d.icon, cls));

/* Anneau segmenté : combien de fonctions dès chaque offre */
function ring(d) {
  const counts = ORDER.map((p) => d.features.filter((f) => f.plan === p).length);
  const R = 34, C = 2 * Math.PI * R, gap = counts.filter(Boolean).length > 1 ? 3 : 0, total = d.features.length;
  let start = 0;
  const segs = counts.map((n, i) => {
    if (!n) return '';
    const len = (n / total) * C - gap;
    const s = `<circle class="seg s${i}" r="${R}" cx="44" cy="44" style="--len:${len.toFixed(2)};--c:${C.toFixed(2)};--off:${(-start).toFixed(2)};--d:${i * 0.12}s"/>`;
    start += (n / total) * C;
    return s;
  }).join('');
  const legend = counts.map((n, i) => (n ? `<li><i class="s${i}"></i><b class="mono">${n}</b> dès ${PLANS[ORDER[i]]}</li>` : '')).join('');
  return `<div class="dp-ring">
      <div class="ring-v"><svg viewBox="0 0 88 88" aria-hidden="true"><circle class="trk" r="${R}" cx="44" cy="44"/>${segs}</svg><span><b class="mono">${total}</b><small>fonctions</small></span></div>
      <ul class="ring-l">${legend}</ul>
    </div>`;
}

export function panelHTML(d, { link = true } = {}) {
  const only = d.features.filter((f) => f.tag === 'only').length;
  const hero = d.features.find((f) => f.tag === 'only') || d.features.find((f) => f.tag === 'new') || d.features[0];
  const rest = d.features.filter((f) => f !== hero);
  return `
    <div class="dp-top">
      <div class="dp-head">
        <span class="dp-pas">${depIcon(d)}</span>
        <h3>${d.title} <em>${d.accent}</em></h3>
        <p>${d.pitch}</p>
        <div class="dp-meta"><span class="hc ok">${ic('check')}Dès Brix ${minPlan(d)}</span>${only ? `<span class="hc only">${only} exclusivité${only > 1 ? 's' : ''} Brix</span>` : ''}</div>
        ${ring(d)}
        ${link ? `<a class="link" href="fonctionnalites.html#${d.id}">Tout le détail ${ic('arrow-right')}</a>` : ''}
      </div>
      <article class="dp-spot">
        <span class="spot-ghost" aria-hidden="true">${ic(hero.icon)}</span>
        <div class="spot-top"><span class="spot-k mono">À la une</span>${hero.tag ? `<span class="badge ${TAG[hero.tag][0]}">${TAG[hero.tag][1]}</span>` : ''}</div>
        <span class="spot-pas">${ic(hero.icon)}</span>
        <h4>${hero.name}</h4>
        <p>${hero.desc}</p>
        <span class="hc plan">${ic('layers')}Dès ${PLANS[hero.plan]}</span>
      </article>
    </div>
    <div class="fgrid2">${rest.map((f) => `
      <article class="ft">
        <div class="ft-top"><span class="ft-pas">${ic(f.icon)}</span>${f.tag ? `<span class="badge ${TAG[f.tag][0]}">${TAG[f.tag][1]}</span>` : ''}</div>
        <h4>${f.name}</h4><p>${f.desc}</p><span class="plan-t mono">Dès ${PLANS[f.plan]}</span>
      </article>`).join('')}
    </div>`;
}

export function initDepts() {
  const tabs = $('[data-dtabs]'), panel = $('[data-dpanel]');
  if (!tabs) return;
  tabs.innerHTML = `<span class="dtab-pill" aria-hidden="true"></span>${DEPARTMENTS.map((d, i) => `<button class="dtab" role="tab" id="tab-${d.id}" aria-selected="${i === 0}" aria-controls="dpanel" tabindex="${i === 0 ? 0 : -1}" data-id="${d.id}" style="--dc:${d.color}"><span class="dt-dot">${depIcon(d)}</span>${d.name}</button>`).join('')}`;
  panel.id = 'dpanel';
  const pill = $('.dtab-pill', tabs), btns = $$('.dtab', tabs);
  let cur;

  function movePill(b) {
    if (!b) return;
    pill.style.width = `${b.offsetWidth}px`;
    pill.style.transform = `translateX(${b.offsetLeft}px)`;
  }
  function select(id, first) {
    const d = DEPARTMENTS.find((x) => x.id === id);
    if (!d || id === cur) return;
    cur = id;
    const b = btns.find((x) => x.dataset.id === id);
    btns.forEach((x) => { const on = x === b; x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1; });
    panel.setAttribute('aria-labelledby', b.id);
    movePill(b);
    // garder l'onglet visible quand la barre défile (mobile)
    if (tabs.scrollWidth > tabs.clientWidth) tabs.scrollTo({ left: b.offsetLeft - tabs.clientWidth / 2 + b.offsetWidth / 2, behavior: reduce ? 'auto' : 'smooth' });
    const draw = () => {
      panel.style.setProperty('--dc', d.color);
      panel.innerHTML = panelHTML(d);
      panel.classList.remove('all', 'on');
      const rest = $$('.ft', panel);
      if (rest.length > 4) {
        const more = document.createElement('button');
        more.type = 'button';
        more.className = 'btn line more-ft';
        more.innerHTML = `Voir les ${rest.length - 4} autres fonctions ${ic('chevron-down')}`;
        more.addEventListener('click', () => { panel.classList.add('all'); more.remove(); });
        $('.fgrid2', panel).after(more);
      }
      // l'anneau se ferme au frame suivant (transition CSS)
      const ringOn = () => requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.add('on')));
      if (reduce) { ringOn(); return; }
      const head = $('.dp-head', panel).children, spot = $('.dp-spot', panel);
      const enter = () => {
        ringOn();
        gsap.fromTo(head, { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, stagger: 0.05, ease: 'expo.out', clearProps: 'all' });
        gsap.fromTo(spot, { y: 40, opacity: 0, scale: 0.96, rotate: 1.2 }, { y: 0, opacity: 1, scale: 1, rotate: 0, duration: 1, ease: 'expo.out', delay: 0.06, clearProps: 'all' });
        gsap.fromTo(rest, { y: 36, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, stagger: 0.045, ease: 'expo.out', delay: 0.12, clearProps: 'all' });
      };
      // premier affichage : l'entrée attend que le panneau arrive à l'écran
      if (first) {
        gsap.set([...head, spot, ...rest], { opacity: 0 });
        ScrollTrigger.create({ trigger: panel, start: 'top 85%', once: true, onEnter: enter });
      } else enter();
    };
    if (first || reduce) { draw(); return; }
    gsap.to(panel.children, { opacity: 0, y: -10, duration: 0.18, ease: 'power2.in', onComplete: draw });
  }

  tabs.addEventListener('click', (e) => { const b = e.target.closest('.dtab'); if (b) select(b.dataset.id); });
  tabs.addEventListener('keydown', (e) => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const i = btns.indexOf(document.activeElement);
    const n = e.key === 'Home' ? 0 : e.key === 'End' ? btns.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + btns.length) % btns.length;
    btns[n].focus();
    select(btns[n].dataset.id);
  });
  document.addEventListener('dept:select', (e) => select(e.detail));
  const resync = () => movePill(btns.find((x) => x.dataset.id === cur));
  addEventListener('resize', resync);
  select(DEPARTMENTS[0].id, true);
  requestAnimationFrame(resync);
  if (document.fonts) document.fonts.ready.then(resync);

  // la grande carte suit doucement le pointeur
  if (fine && !reduce) {
    panel.addEventListener('pointermove', (e) => {
      const s = e.target.closest('.dp-spot');
      if (!s) return;
      const r = s.getBoundingClientRect();
      s.style.setProperty('--rx', `${((e.clientY - r.top) / r.height - 0.5) * -4}deg`);
      s.style.setProperty('--ry', `${((e.clientX - r.left) / r.width - 0.5) * 5}deg`);
    });
    panel.addEventListener('pointerout', (e) => { const s = e.target.closest('.dp-spot'); if (s && !s.contains(e.relatedTarget)) { s.style.setProperty('--rx', '0deg'); s.style.setProperty('--ry', '0deg'); } });
  }
}
