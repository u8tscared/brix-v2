/* Socle commun à toutes les pages : navigation, méga-menu, tiroir mobile, dégradé vivant,
   apparitions au défilement, boutons magnétiques, défilement doux. */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { DEPARTMENTS } from '../data/departments.js';

gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger };
export const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const fine = matchMedia('(pointer: fine)').matches;
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const ic = (name, cls = '') => `<svg class="i ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
export const fmt = (n, d = 0) => n.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d }).replace(/ | /g, ' ');
export const euro = (n, d = 2) => `${fmt(n, d)} €`;
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- Navigation ---------- */
function initNav() {
  const nav = $('#nav');
  if (!nav) return;
  const grad = (d) => `background:linear-gradient(135deg, ${d.color}, ${d.color}cc)`;
  const mega = $('[data-mega]');
  if (mega) mega.innerHTML = DEPARTMENTS.map((d) => `<a href="fonctionnalites.html#${d.id}"><span class="ic" style="${grad(d)}">${ic(d.icon)}</span><span><b>${d.name}</b><small>${d.features.length} fonctions · ${esc(d.features.slice(0, 3).map((f) => f.name).join(', '))}</small></span></a>`).join('');
  const drawerGrid = $('[data-drawer]');
  if (drawerGrid) drawerGrid.innerHTML = DEPARTMENTS.map((d) => `<a href="fonctionnalites.html#${d.id}"><span class="ic" style="${grad(d)}">${ic(d.icon)}</span>${d.name}</a>`).join('');

  // page courante
  const page = location.pathname.split('/').pop() || 'index.html';
  $$('.menu a.mi').forEach((a) => { if (a.getAttribute('href') === page) a.setAttribute('aria-current', 'page'); });

  // état plein / transparent
  const hero = $('[data-hero]');
  const solid = () => nav.classList.toggle('solid', !hero || scrollY > hero.offsetHeight - 120);
  addEventListener('scroll', solid, { passive: true });
  solid();

  // méga-menu : survol sur ordinateur, clic partout, Échap pour fermer
  const dd = $('.dd', nav);
  if (dd) {
    const btn = $('button', dd);
    let t;
    const set = (on) => { dd.classList.toggle('on', on); btn.setAttribute('aria-expanded', on); };
    if (fine) {
      dd.addEventListener('pointerenter', () => { clearTimeout(t); set(true); });
      dd.addEventListener('pointerleave', () => { t = setTimeout(() => set(false), 160); });
    }
    btn.addEventListener('click', () => set(!dd.classList.contains('on')));
    addEventListener('keydown', (e) => { if (e.key === 'Escape') { set(false); } });
    document.addEventListener('click', (e) => { if (!dd.contains(e.target)) set(false); });
  }

  // tiroir mobile
  const burger = $('.burger', nav), drawer = $('#drawer');
  if (burger && drawer) {
    const open = (on) => {
      nav.classList.toggle('open', on);
      burger.setAttribute('aria-expanded', on);
      burger.setAttribute('aria-label', on ? 'Fermer le menu' : 'Ouvrir le menu');
      drawer.hidden = !on;
      document.documentElement.style.overflow = on ? 'hidden' : '';
      if (on && !reduce) gsap.from($$('.drawer-in > *', drawer), { y: 18, opacity: 0, duration: .5, stagger: .05, ease: 'expo.out' });
    };
    burger.addEventListener('click', () => open(drawer.hidden));
    drawer.addEventListener('click', (e) => { if (e.target.closest('a')) open(false); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && !drawer.hidden) { open(false); burger.focus(); } });
    matchMedia('(min-width: 1101px)').addEventListener('change', (e) => { if (e.matches) open(false); });
  }
}

/* ---------- Dégradé vivant (aube) : canvas minuscule étiré, très peu coûteux ---------- */
export function mesh(canvas, palette) {
  if (!canvas) return;
  const x = canvas.getContext('2d');
  const W = 96, H = 60;
  canvas.width = W; canvas.height = H;
  const blobs = palette || [[109, 40, 217], [217, 70, 239], [251, 146, 60], [129, 140, 248], [139, 92, 246], [244, 114, 182]];
  let visible = true, sy = 0;
  new IntersectionObserver((e) => { visible = e[0].isIntersecting; }).observe(canvas);
  addEventListener('scroll', () => { sy = scrollY; }, { passive: true });
  function draw(t) {
    if (visible) {
      x.fillStyle = 'rgb(88,28,180)';
      x.fillRect(0, 0, W, H);
      blobs.forEach((b, i) => {
        const k = t * 0.00016 + sy * 0.0005;
        const px = W * (0.5 + 0.45 * Math.sin(k * (i * 0.37 + 1) + i * 1.9));
        const py = H * (0.5 + 0.5 * Math.cos(k * (i * 0.29 + 1.2) + i * 1.1));
        const g = x.createRadialGradient(px, py, 0, px, py, W * (0.42 + 0.08 * Math.sin(t * 0.0004 + i)));
        g.addColorStop(0, `rgba(${b},.92)`);
        g.addColorStop(1, `rgba(${b},0)`);
        x.fillStyle = g;
        x.fillRect(0, 0, W, H);
      });
    }
    if (!reduce) requestAnimationFrame(draw);
  }
  draw(5200);
}

/* ---------- Apparitions ---------- */
function initReveals() {
  if (reduce) return;
  gsap.set('.rv', { opacity: 0, y: 36 });
  ScrollTrigger.batch('.rv', {
    start: 'top 90%',
    once: true,
    onEnter: (b) => gsap.to(b, { y: 0, opacity: 1, duration: 1.1, ease: 'expo.out', stagger: 0.07, overwrite: true }),
  });
  // titres : mots qui montent
  $$('[data-split]').forEach((el) => {
    // les mots du texte montent un par un ; un élément enfant (ex. accent en dégradé) monte d'un bloc
    const out = [];
    el.childNodes.forEach((n) => {
      if (n.nodeType === 3) n.textContent.split(/(\s+)/).forEach((w) => out.push(w.trim() ? `<span class="w"><span>${esc(w)}</span></span>` : w));
      else if (n.nodeName === 'BR') out.push('<br>');
      else out.push(`<span class="w"><span>${n.outerHTML}</span></span>`);
    });
    el.innerHTML = out.join('');
    gsap.from($$('.w > span', el), { yPercent: 110, duration: 1.1, ease: 'expo.out', stagger: 0.035, scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
  });
  // compteurs
  $$('[data-count]').forEach((el) => {
    const to = +el.dataset.count, d = +(el.dataset.dec || 0);
    ScrollTrigger.create({ trigger: el, start: 'top 92%', once: true, onEnter: () => { const o = { v: 0 }; gsap.to(o, { v: to, duration: 1.8, ease: 'power3.out', onUpdate: () => { el.textContent = fmt(o.v, d); } }); } });
  });
}

/* ---------- Boutons magnétiques ---------- */
function initMagnetic() {
  if (!fine || reduce) return;
  $$('.mag').forEach((b) => {
    const mx = gsap.quickTo(b, 'x', { duration: 0.5, ease: 'power3' }), my = gsap.quickTo(b, 'y', { duration: 0.5, ease: 'power3' });
    b.addEventListener('pointermove', (e) => { const r = b.getBoundingClientRect(); mx((e.clientX - r.left - r.width / 2) * 0.22); my((e.clientY - r.top - r.height / 2) * 0.3); });
    b.addEventListener('pointerleave', () => { mx(0); my(0); });
  });
}

/* ---------- Défilement doux (ordinateur uniquement) ---------- */
let lenis;
function initLenis() {
  if (!fine || reduce) return;
  lenis = new Lenis({ duration: 1.05, easing: (t) => 1 - Math.pow(1 - t, 3.2) });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href').length < 2) return;
    const target = document.querySelector(a.getAttribute('href'));
    if (target) { e.preventDefault(); lenis.scrollTo(target, { offset: -90 }); history.replaceState(null, '', a.getAttribute('href')); }
  });
}
export const scrollToEl = (el) => (lenis ? lenis.scrollTo(el, { offset: -90 }) : el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }));

export function boot(pageInit) {
  initNav();
  $$('canvas.mesh').forEach((c) => mesh(c));
  if (pageInit) pageInit();
  initReveals();
  initMagnetic();
  initLenis();
  // les ancres d'arrivée (#id) une fois tout en place
  if (location.hash) { const t = document.querySelector(location.hash); if (t) setTimeout(() => t.scrollIntoView(), 60); }
  addEventListener('load', () => ScrollTrigger.refresh());
}
