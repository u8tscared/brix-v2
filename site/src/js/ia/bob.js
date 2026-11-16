/* Page IA : hero (Bob demande, vous validez), grille des fonctions, ciel de nuit, interrupteur. */
import { gsap, ScrollTrigger, reduce, $, $$, ic } from '../core.js';
import { DEPARTMENTS, PLANS } from '../../data/departments.js';
import { wait } from '../subpage.js';

const TAG = { new: ['new', 'Nouveau'], only: ['only', 'Exclusif Brix'], soon: ['soon', 'Bientôt'] };
// fonction → section de la page où on la voit en action
const DEMO = { 'Devis dicté': '#dictee', 'Dictée dans votre langue': '#dictee', 'Agent de nuit': '#nuit', 'Brief du matin': '#nuit', 'Secrétaire téléphonique': '#telephone', 'Brix AI MCP': '#mcp', 'Assistant Bob': '#mcp' };

export function heroBob(tl) {
  const bd = $('.bd');
  if (!bd) return;
  const ask = $('[data-ask]', bd), ok = $('[data-ok]', bd), toast = $('[data-toast]', bd), state = $('[data-rstate]', bd);
  const done = () => { state.className = 'badge ok'; state.textContent = 'Envoyée'; };
  if (reduce) { done(); gsap.set(toast, { opacity: 1 }); return; }
  tl.from('.bd-main', { y: 80, opacity: 0, rotate: 4, duration: 1.4 }, '-=1.1')
    .from('.bd-list li', { x: -14, opacity: 0, stagger: 0.09, duration: 0.6 }, '-=0.9')
    .from(ask, { y: 60, x: -20, opacity: 0, rotate: -5, duration: 1.2 }, '-=0.8');
  tl.eventCallback('onComplete', async () => {
    await wait(900);
    ok.classList.add('press');
    await wait(260);
    ok.classList.remove('press');
    gsap.to(ask, { y: 16, opacity: 0, scale: 0.96, duration: 0.5, ease: 'power2.in' });
    done();
    gsap.from(state, { scale: 0.4, duration: 0.6, ease: 'back.out(3)' });
    gsap.fromTo(toast, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: 'expo.out', delay: 0.3 });
  });
  gsap.to('.bd', { y: -60, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
}

export function bobGrid() {
  const root = $('[data-bobgrid]');
  if (!root) return;
  const bob = DEPARTMENTS.find((d) => d.id === 'bob'), vendre = DEPARTMENTS.find((d) => d.id === 'vendre');
  const extra = vendre.features.filter((f) => /^Devis (dicté|depuis)/.test(f.name)).map((f) => ({ ...f, c: vendre.color }));
  const list = [...extra, ...bob.features.map((f) => ({ ...f, c: bob.color }))];
  root.innerHTML = list.map((f) => `
    <article class="ft rv" style="--c:${f.c}">
      <div class="ft-top"><span class="ft-ic">${ic(f.icon)}</span>${f.tag ? `<span class="badge ${TAG[f.tag][0]}">${TAG[f.tag][1]}</span>` : ''}</div>
      <h3 class="h4x">${f.name}</h3><p>${f.desc}</p>
      <div class="ft-foot"><span class="plan-t">Dès ${PLANS[f.plan]}</span>${DEMO[f.name] ? `<a class="link" href="${DEMO[f.name]}">Voir ${ic('arrow-right')}</a>` : ''}</div>
    </article>`).join('');
}

/* Le ciel s'éclaire à mesure qu'on descend dans la section. */
export function nightSky() {
  const sec = $('#nuit');
  if (!sec) return;
  if (reduce) { sec.style.setProperty('--dawn', 0.8); return; }
  ScrollTrigger.create({
    trigger: sec, start: 'top 40%', end: 'bottom 70%', scrub: 0.5,
    onUpdate: (s) => sec.style.setProperty('--dawn', (s.progress * 0.95).toFixed(3)),
  });
}

export function bobSwitch() {
  const sw = $('[data-sw]'), hist = $('[data-hist]'), lab = $('[data-sw-l]');
  if (!sw) return;
  sw.addEventListener('click', () => {
    const on = sw.getAttribute('aria-checked') !== 'true';
    sw.setAttribute('aria-checked', on);
    hist.classList.toggle('off', !on);
    lab.textContent = on ? 'Bob activé' : 'Bob en pause';
  });
  if (!reduce) gsap.from($$('.hist-l li', hist), { x: 20, opacity: 0, duration: 0.6, stagger: 0.08, ease: 'expo.out', scrollTrigger: { trigger: hist, start: 'top 75%', once: true } });
}
