/* Dictée dans une autre langue : le micro enregistre, la phrase s'écrit, Bob traduit,
   les lignes du devis tombent en français et le total se compte. */
import { gsap, reduce, $, $$, fmt } from '../core.js';
import { wait, onView, radios } from '../subpage.js';

const LANGS = {
  pt: { code: 'PT', dir: 'ltr', name: 'portugais', text: 'Casa de banho da senhora Costa. Tirar o azulejo antigo, mais ou menos doze metros quadrados. Pôr azulejo novo sessenta por sessenta. E trocar a sanita.' },
  ar: { code: 'AR', dir: 'rtl', name: 'arabe', text: 'حمّام السيدة كوستا. إزالة البلاط القديم، حوالي اثني عشر مترًا مربعًا. تركيب بلاط جديد ستين في ستين. وتغيير المرحاض.' },
  tr: { code: 'TR', dir: 'ltr', name: 'turc', text: "Bayan Costa’nın banyosu. Eski fayansları sökmek, yaklaşık on iki metrekare. Altmışa altmış yeni fayans döşemek. Bir de klozeti değiştirmek." },
};
const AMOUNTS = [216, 888, 420];

export function initDictation() {
  const box = $('[data-dict]');
  if (!box) return;
  const said = $('[data-said]', box), code = $('[data-dict-lang]', box), sr = $('[data-dict-sr]', box), time = $('[data-time]', box);
  const lines = $$('[data-ql]', box), sep = $('[data-sep]', box), wave = $('[data-wave]', box), tot = $('[data-dt-tot]', box);
  const seg = $('[data-langs]'), pill = $('[data-seg-pill]');
  wave.innerHTML = Array.from({ length: 34 }, (_, i) => `<i style="--h:${(0.35 + Math.abs(Math.sin(i * 1.7)) * 0.65).toFixed(2)};animation-delay:${((i * 0.071) % 0.9).toFixed(2)}s"></i>`).join('');
  let run = 0, lang = 'pt', picked = false, auto = false, clock;

  const describe = (l) => { sr.textContent = `Démonstration : un artisan dicte en ${l.name} « ${l.text} ». Bob produit un devis en français : dépose de l’ancienne faïence, 12 m², 216 € ; carrelage grès 60 × 60 fourni posé, 12 m², 888 € ; remplacement des WC, 420 € ; total 1 524 € HT.`; };
  const money = (v) => `${fmt(v, 2)} €`;
  const movePill = () => { const b = $('[aria-checked="true"]', seg); if (!b) return; pill.style.width = `${b.offsetWidth}px`; pill.style.transform = `translateX(${b.offsetLeft}px)`; };

  async function play() {
    const id = ++run, l = LANGS[lang];
    describe(l);
    code.textContent = l.code;
    said.dir = l.dir;
    said.lang = lang;
    clearInterval(clock);
    if (reduce) { said.textContent = l.text; lines.forEach((x) => x.classList.add('on')); time.textContent = '00:09'; return; }
    lines.forEach((x) => x.classList.remove('on', 'flash'));
    sep.classList.remove('on');
    tot.textContent = money(0);
    box.classList.add('live');
    said.innerHTML = '<span class="caret"></span>';
    let s = 0;
    time.textContent = '00:00';
    clock = setInterval(() => { s++; time.textContent = `00:${String(s).padStart(2, '0')}`; }, 1000);
    const words = l.text.split(' ');
    for (let i = 1; i <= words.length; i++) {
      if (id !== run) return;
      said.innerHTML = `${words.slice(0, i).join(' ')} <span class="caret"></span>`;
      await wait(120 + Math.random() * 110);
    }
    clearInterval(clock);
    box.classList.remove('live');
    said.textContent = l.text;
    await wait(350);
    if (id !== run) return;
    sep.classList.add('on');
    await wait(900);
    let sum = 0;
    for (const [k, x] of lines.entries()) {
      if (id !== run) return;
      x.classList.add('on', 'flash');
      setTimeout(() => x.classList.remove('flash'), 500);
      const o = { v: sum };
      sum += AMOUNTS[k];
      gsap.to(o, { v: sum, duration: 0.6, ease: 'power2.out', onUpdate: () => { tot.textContent = money(o.v); } });
      await wait(480);
    }
    await wait(5600);
    // les langues défilent seules tant que personne n'en a choisi une
    if (id === run && !picked) {
      const keys = Object.keys(LANGS);
      const b = $(`[data-lang="${keys[(keys.indexOf(lang) + 1) % keys.length]}"]`);
      if (b) { auto = true; b.click(); auto = false; }
    }
  }

  radios(seg, (b) => { lang = b.dataset.lang; if (!auto) picked = true; movePill(); play(); });
  describe(LANGS.pt);
  requestAnimationFrame(movePill);
  if (document.fonts) document.fonts.ready.then(movePill);
  addEventListener('resize', movePill);
  if (reduce) play(); else onView(box, play, 0.4);
}
