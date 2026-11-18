/* Parcours « du devis au paiement » : la scène suit l'étape visible,
   et les taches du fond tournent en continu avec la progression du défilement (--sp, 0 → 1). */
import { gsap, reduce, $, $$, fmt } from '../core.js';

export function initStory() {
  const stage = $('#stage');
  if (!stage) return;
  const story = stage.closest('.story');
  const scenes = $$('.scene', stage), steps = $$('.step'), dots = $$('.stage-dots i', stage);
  const wave = $('#wave');
  for (let i = 0; i < 28; i++) {
    const s = document.createElement('i');
    s.style.animationDelay = `${(-Math.random()).toFixed(2)}s`;
    s.style.animationDuration = `${(0.6 + Math.random() * 0.7).toFixed(2)}s`;
    wave.appendChild(s);
  }
  const said = 'Salle de bain des Petit, on enlève la baignoire, on met un receveur extra-plat avec une paroi fixe.';
  let typer, cur = -1;
  function play(n) {
    if (n === cur) return;
    cur = n;
    stage.dataset.s = n;
    // les scènes passées sortent vers le haut, les suivantes attendent en bas
    scenes.forEach((s, i) => { s.classList.toggle('on', i === n); s.classList.toggle('past', i < n); });
    steps.forEach((s, i) => { s.classList.toggle('on', i === n); s.classList.toggle('done', i < n); });
    dots.forEach((d, i) => d.classList.toggle('on', i === n));
    if (n === 0) {
      const el = $('#said'), ls = $$('.ql');
      ls.forEach((l) => l.classList.remove('on'));
      clearTimeout(typer);
      if (reduce) { el.textContent = said; ls.forEach((l) => l.classList.add('on')); return; }
      let i = 0;
      el.textContent = '';
      (function t() {
        el.textContent = said.slice(0, ++i);
        if (i < said.length) typer = setTimeout(t, 20 + Math.random() * 24);
        else ls.forEach((l, j) => setTimeout(() => l.classList.add('on'), 200 + j * 220));
      })();
    }
    if (n === 2 && !reduce) {
      $$('.rq b', stage).forEach((b) => {
        const to = +b.dataset.p, o = { v: to * 1.4 };
        gsap.to(o, { v: to, duration: 1.2, ease: 'power3.out', onUpdate: () => { b.textContent = `${fmt(o.v, 2)} €`; } });
      });
    }
    if (n === 4 && !reduce) {
      const el = $('#paid'), o = { v: 0 };
      gsap.to(o, { v: 1947, duration: 1.4, ease: 'power3.out', onUpdate: () => { el.textContent = fmt(o.v, 2); } });
    }
  }
  const mobile = matchMedia('(max-width:860px)').matches;
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) play(+e.target.dataset.step); }), { rootMargin: mobile ? '-64% 0px -28% 0px' : '-45% 0px -45% 0px' });
  steps.forEach((s) => io.observe(s));
  play(0);

  // rotation continue des taches + remplissage du rail, liés au défilement (lissés par scrub)
  if (reduce) { story.style.setProperty('--sp', '0.18'); return; }
  const prog = { v: 0 };
  gsap.to(prog, {
    v: 1, ease: 'none',
    scrollTrigger: { trigger: story, start: 'top 75%', end: 'bottom 40%', scrub: 0.9 },
    onUpdate: () => story.style.setProperty('--sp', prog.v.toFixed(4)),
  });
}
