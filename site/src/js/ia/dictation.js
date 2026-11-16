/* Dictée dans une autre langue : la phrase s'écrit, Bob traduit, les lignes du devis tombent en français. */
import { gsap, reduce, $, $$ } from '../core.js';
import { wait, onView, radios } from '../subpage.js';

const LANGS = {
  pt: { code: 'PT', dir: 'ltr', name: 'portugais', text: 'Casa de banho da senhora Costa. Tirar o azulejo antigo, mais ou menos doze metros quadrados. Pôr azulejo novo sessenta por sessenta. E trocar a sanita.' },
  ar: { code: 'AR', dir: 'rtl', name: 'arabe', text: 'حمّام السيدة كوستا. إزالة البلاط القديم، حوالي اثني عشر مترًا مربعًا. تركيب بلاط جديد ستين في ستين. وتغيير المرحاض.' },
  tr: { code: 'TR', dir: 'ltr', name: 'turc', text: "Bayan Costa'nın banyosu. Eski fayansları sökmek, yaklaşık on iki metrekare. Altmışa altmış yeni fayans döşemek. Bir de klozeti değiştirmek." },
};

export function initDictation() {
  const box = $('[data-dict]');
  if (!box) return;
  const said = $('[data-said]', box), code = $('[data-dict-lang]', box), sr = $('[data-dict-sr]', box);
  const lines = $$('[data-ql]', box), sep = $('.dd-sep', box), wave = $('[data-wave]', box);
  wave.innerHTML = Array.from({ length: 28 }, (_, i) => `<i style="animation-delay:${(i * 0.07) % 1}s"></i>`).join('');
  let run = 0, lang = 'pt';

  const describe = (l) => { sr.textContent = `Démonstration : un artisan dicte en ${l.name} « ${l.text} ». Bob produit un devis en français : dépose de l'ancienne faïence, 12 m², 216 € ; carrelage grès 60 × 60 fourni posé, 12 m², 888 € ; remplacement des WC, 420 € ; total 1 524 € HT.`; };

  async function play() {
    const id = ++run, l = LANGS[lang];
    describe(l);
    code.textContent = l.code;
    said.dir = l.dir;
    if (reduce) { said.textContent = l.text; lines.forEach((x) => x.classList.add('on')); return; }
    lines.forEach((x) => x.classList.remove('on'));
    sep.classList.remove('on');
    wave.classList.remove('still');
    said.innerHTML = '<span class="caret"></span>';
    const words = l.text.split(' ');
    for (let i = 1; i <= words.length; i++) {
      if (id !== run) return;
      said.innerHTML = `${words.slice(0, i).join(' ')} <span class="caret"></span>`;
      await wait(110 + Math.random() * 90);
    }
    wave.classList.add('still');
    await wait(400);
    if (id !== run) return;
    sep.classList.add('on');
    await wait(700);
    for (const x of lines) {
      if (id !== run) return;
      x.classList.add('on');
      await wait(420);
    }
    gsap.fromTo($('.dd-tot b', box), { scale: 0.85 }, { scale: 1, duration: 0.6, ease: 'back.out(3)' });
    await wait(5200);
    if (id === run) {
      const keys = Object.keys(LANGS);
      const next = keys[(keys.indexOf(lang) + 1) % keys.length];
      const b = $(`[data-lang="${next}"]`);
      if (b) b.click();
    }
  }

  radios($('[data-langs]'), (b) => { lang = b.dataset.lang; play(); });
  describe(LANGS.pt);
  if (reduce) play(); else onView(box, play, 0.4);
}
