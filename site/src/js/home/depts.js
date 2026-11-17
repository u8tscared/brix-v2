/* Départements : onglets à pastille glissante, fonctions qui entrent en cascade. */
import { gsap, reduce, $, $$, ic } from '../core.js';
import { DEPARTMENTS, PLANS } from '../../data/departments.js';

const TAG = { new: ['new', 'Nouveau'], only: ['only', 'Exclusif Brix'], soon: ['soon', 'Bientôt'] };
const minPlan = (d) => { const order = ['start', 'pro', 'equipe', 'entreprise']; return PLANS[order[Math.min(...d.features.map((f) => order.indexOf(f.plan)))]]; };

export function panelHTML(d, { link = true } = {}) {
  const only = d.features.filter((f) => f.tag === 'only').length;
  return `
    <div class="dp-head">
      <span class="dp-ic">${ic(d.icon)}</span>
      <h3>${d.title} <em>${d.accent}</em></h3>
      <p>${d.pitch}</p>
      <div class="dp-meta"><span class="badge v">${d.features.length} fonctions</span><span class="badge ok">Dès Brix ${minPlan(d)}</span>${only ? `<span class="badge only">${only} exclusivité${only > 1 ? 's' : ''} Brix</span>` : ''}</div>
      ${link ? `<a class="link" href="fonctionnalites.html#${d.id}">Tout le détail ${ic('arrow-right')}</a>` : ''}
    </div>
    <div class="fgrid2">${d.features.map((f) => `
      <article class="ft">
        <div class="ft-top"><span class="ft-ic">${ic(f.icon)}</span>${f.tag ? `<span class="badge ${TAG[f.tag][0]}">${TAG[f.tag][1]}</span>` : ''}</div>
        <h4>${f.name}</h4><p>${f.desc}</p><span class="plan-t">Dès ${PLANS[f.plan]}</span>
      </article>`).join('')}
    </div>`;
}

export function initDepts() {
  const tabs = $('[data-dtabs]'), panel = $('[data-dpanel]');
  if (!tabs) return;
  tabs.innerHTML = `<span class="dtab-pill" aria-hidden="true"></span>${DEPARTMENTS.map((d, i) => `<button class="dtab" role="tab" id="tab-${d.id}" aria-selected="${i === 0}" aria-controls="dpanel" tabindex="${i === 0 ? 0 : -1}" data-id="${d.id}">${ic(d.icon)}${d.name}</button>`).join('')}`;
  panel.id = 'dpanel';
  const pill = $('.dtab-pill', tabs), btns = $$('.dtab', tabs);
  let cur;

  function movePill(b, d) {
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
    movePill(b, d);
    // garder l'onglet visible quand la barre défile (mobile)
    tabs.scrollTo({ left: b.offsetLeft - tabs.clientWidth / 2 + b.offsetWidth / 2, behavior: reduce ? 'auto' : 'smooth' });
    const draw = () => {
      panel.innerHTML = panelHTML(d);
      panel.classList.remove('all');
      if (d.features.length > 4) {
        const more = document.createElement('button');
        more.type = 'button';
        more.className = 'btn line more-ft';
        more.innerHTML = `Voir les ${d.features.length - 4} autres fonctions ${ic('chevron-down')}`;
        more.addEventListener('click', () => { panel.classList.add('all'); more.remove(); });
        $('.fgrid2', panel).after(more);
      }
      if (reduce) return;
      gsap.from($('.dp-head', panel).children, { y: 24, opacity: 0, duration: 0.8, stagger: 0.06, ease: 'expo.out' });
      gsap.from($$('.ft', panel), { y: 30, opacity: 0, scale: 0.97, duration: 0.8, stagger: 0.045, ease: 'expo.out', delay: 0.05 });
    };
    if (first || reduce) { draw(); return; }
    gsap.to(panel.children, { opacity: 0, y: -10, duration: 0.2, ease: 'power2.in', onComplete: draw });
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
  addEventListener('resize', () => { const b = btns.find((x) => x.dataset.id === cur); movePill(b, DEPARTMENTS.find((x) => x.id === cur)); });
  select(DEPARTMENTS[0].id, true);
  requestAnimationFrame(() => movePill(btns[0], DEPARTMENTS[0]));
  if (document.fonts) document.fonts.ready.then(() => { const b = btns.find((x) => x.dataset.id === cur); movePill(b, DEPARTMENTS.find((x) => x.id === cur)); });
}
