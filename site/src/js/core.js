/* Socle commun à toutes les pages : navigation, méga-menu, tiroir mobile, dégradé vivant,
   apparitions au défilement, boutons magnétiques, défilement doux. */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { DEPARTMENTS, APP_URL } from '../data/departments.js';

gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger };
export const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const fine = matchMedia('(pointer: fine)').matches;
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const ic = (name, cls = '') => `<svg class="i ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
export const fmt = (n, d = 0) => n.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d }).replace(/ | /g, ' ');
export const euro = (n, d = 2) => `${fmt(n, Number.isInteger(Math.round(n * 100) / 100) ? 0 : d)} €`;
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- Navigation ---------- */
function initNav() {
  const nav = $('#nav');
  if (!nav) return;
  const grad = () => '';
  const mega = $('[data-mega]');
  if (mega) mega.innerHTML = DEPARTMENTS.map((d) => `<a href="fonctionnalites.html#${d.id}"><span class="ic" style="${grad(d)}">${ic(d.icon)}</span><span><b>${d.name}</b><small>${d.features.length} fonctions · ${esc(d.features.slice(0, 3).map((f) => f.name).join(', '))}</small></span></a>`).join('');
  const drawerGrid = $('[data-drawer]');
  if (drawerGrid) drawerGrid.innerHTML = DEPARTMENTS.map((d) => `<a href="fonctionnalites.html#${d.id}"><span class="ic" style="${grad(d)}">${ic(d.icon)}</span>${d.name}</a>`).join('');

  // page courante
  const page = location.pathname.split('/').pop() || 'index.html';
  $$('.menu a.mi').forEach((a) => { if (a.getAttribute('href') === page) a.setAttribute('aria-current', 'page'); });

  // état plein / transparent
  const hero = $('[data-hero]');
  const solid = () => { nav.classList.toggle('solid', !hero || scrollY > hero.offsetHeight - 120); nav.classList.toggle('over', scrollY > 24); };
  addEventListener('scroll', solid, { passive: true });
  solid();
  // la nav se cache en descendant, revient dès qu'on remonte
  let lastY = scrollY;
  addEventListener('scroll', () => { const y = scrollY; if (!nav.classList.contains('open') && !$('.dd.on', nav)) nav.classList.toggle('hide', y > 400 && y > lastY + 4); if (y < lastY - 4 || y < 400) nav.classList.remove('hide'); lastY = y; }, { passive: true });

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
    addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || !dd.classList.contains('on')) return;
      const inside = dd.contains(document.activeElement);
      set(false);
      if (inside) btn.focus();
    });
    // au clavier, le menu se referme dès que le focus en sort
    dd.addEventListener('focusout', (e) => { if (e.relatedTarget && !dd.contains(e.relatedTarget)) set(false); });
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
    // focus gardé entre le bouton du menu et le tiroir tant qu'il est ouvert
    addEventListener('keydown', (e) => {
      if (e.key !== 'Tab' || drawer.hidden) return;
      const items = [burger, ...$$('a, button', drawer)];
      const i = items.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
      else if (!e.shiftKey && (i === items.length - 1 || i < 0)) { e.preventDefault(); items[0].focus(); }
    });
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
  // la boucle ne tourne que lorsque le canvas est à l'écran
  let visible = false, raf = 0, sy = 0;
  new IntersectionObserver((e) => {
    visible = e[0].isIntersecting;
    if (visible && !raf && !reduce) raf = requestAnimationFrame(draw);
  }).observe(canvas);
  addEventListener('scroll', () => { sy = scrollY; }, { passive: true });
  function draw(t) {
    raf = 0;
    {
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
    if (visible && !reduce) raf = requestAnimationFrame(draw);
  }
  draw(5200);
}

/* ---------- Aura : le halo Aube tourne avec le défilement et suit un peu la souris ---------- */
function initAura() {
  const aura = $('.aura');
  if (!aura || reduce) return;
  const root = aura.style;
  let target = 0, cur = 0, ax = 0, ay = 0, tx = 0, ty = 0, raf = 0;
  const tick = () => {
    cur += (target - cur) * 0.08; ax += (tx - ax) * 0.05; ay += (ty - ay) * 0.05;
    root.setProperty('--rot', cur.toFixed(2)); root.setProperty('--ax', ax.toFixed(1)); root.setProperty('--ay', ay.toFixed(1));
    raf = Math.abs(target - cur) > 0.05 || Math.abs(tx - ax) > 0.2 || Math.abs(ty - ay) > 0.2 ? requestAnimationFrame(tick) : 0;
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };
  addEventListener('scroll', () => { target = scrollY * 0.045; kick(); }, { passive: true });
  if (fine) addEventListener('pointermove', (e) => { tx = (e.clientX / innerWidth - 0.5) * 60; ty = (e.clientY / innerHeight - 0.5) * 40; kick(); }, { passive: true });
  target = scrollY * 0.045; kick();
}

/* ---------- Apparitions ---------- */
function initReveals() {
  if (reduce) return;
  if ($('.rv')) gsap.set('.rv', { opacity: 0, y: 20 });
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
      if (n.nodeType === 3) n.textContent.split(/([ \t\r\n]+)/).forEach((w) => out.push(w.trim() ? `<span class="w"><span>${esc(w)}</span></span>` : w));
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

/* Après un lien interne (lien d'évitement, ancres), le focus clavier suit le défilement. */
function focusTarget(t) {
  if (!t.matches('a[href], button, input, select, textarea, [tabindex]')) t.setAttribute('tabindex', '-1');
  t.focus({ preventScroll: true });
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
    if (target) { e.preventDefault(); lenis.scrollTo(target, { offset: -90 }); history.replaceState(null, '', a.getAttribute('href')); focusTarget(target); }
  });
}
export const scrollToEl = (el) => (lenis ? lenis.scrollTo(el, { offset: -90 }) : el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }));

export function boot(pageInit) {
  // liens vers l'app : « /app/… » pointe vers l'URL configurée (VITE_APP_URL au build)
  if (APP_URL !== '/app') $$('a[href^="/app/"]').forEach((a) => { a.href = APP_URL + a.getAttribute('href').slice(4); if (/^https?:/.test(APP_URL)) { a.target = '_blank'; a.rel = 'noopener'; } });
  initNav();
  initAura();
  $$('canvas.mesh').forEach((c) => mesh(c));
  if (pageInit) pageInit();
  initReveals();
  initMagnetic();
  initLenis();
  // les ancres d'arrivée (#id) une fois tout en place
  if (location.hash) { const t = document.querySelector(location.hash); if (t) setTimeout(() => t.scrollIntoView(), 60); }
  addEventListener('load', () => ScrollTrigger.refresh());
}
