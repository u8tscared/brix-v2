/* Secrétaire téléphonique : appel manqué, Bob décroche, qualifie, pose la visite, confirme par SMS. */
import { gsap, reduce, $, $$ } from '../core.js';
import { wait, onView } from '../subpage.js';

// step : étape de la liste « csteps » qui s'allume à ce moment de l'appel
const SCRIPT = [
  { s: 'missed', t: 'Appel manqué · vous êtes sur le toit', d: 1400 },
  { s: 'bob', t: 'Bob a décroché · 00:04', d: 500, step: 0 },
  { who: 'bob', m: "Bonjour, entreprise Martin Plomberie. Je suis Bob, l’assistant virtuel de Karim. Il est sur un chantier, je peux prendre votre demande ?" },
  { who: 'cli', m: "Oui, bonjour. J’ai une fuite sous l’évier de la cuisine, ça goutte depuis hier." },
  { who: 'bob', m: "D’accord. L’eau coule tout le temps, ou seulement quand le robinet est ouvert ?", step: 1 },
  { who: 'cli', m: "Seulement quand j’ouvre le robinet." },
  { who: 'bob', m: 'Merci. Karim peut passer jeudi à 8 h 30 ou vendredi à 14 h. Qu’est-ce qui vous arrange ?', step: 2 },
  { who: 'cli', m: 'Jeudi 8 h 30, parfait.' },
  { who: 'bob', m: "C’est noté. Vous allez recevoir un SMS avec l’heure de passage. Bonne journée !", step: 3 },
  { s: 'done', t: 'Appel terminé · 1 min 12', d: 600 },
  { who: 'sms', m: '<small>SMS envoyé au client</small>Martin Plomberie : visite confirmée jeudi à 8 h 30, 14 rue des Lilas. Pour décaler, répondez à ce message.' },
  { who: 'sum', step: 4, m: '<b>Résumé pour Karim</b><div><span>Client</span><span>Mme Dubois, nouvelle cliente</span></div><div><span>Demande</span><span>Fuite sous évier, pas urgente</span></div><div><span>Visite</span><span>Jeudi 8 h 30, dans le planning</span></div>' },
];

export function initCall() {
  const root = $('[data-call]');
  if (!root) return;
  const log = $('[data-clog]', root), st = $('[data-cstatus]', root), stT = $('[data-cstatus-t]', root), replay = $('[data-replay]', root);
  const steps = $$('[data-csteps] li');
  const bubble = (x) => {
    const d = document.createElement('div');
    d.className = `cb ${x.who}`;
    d.innerHTML = x.who === 'bob' ? `<small>Bob</small>${x.m}` : x.who === 'cli' ? `<small>Client</small>${x.m}` : x.m;
    log.appendChild(d);
    return d;
  };
  const light = (i) => steps.forEach((li, k) => li.classList.toggle('on', k === i));
  let run = 0;

  if (reduce) {
    replay.hidden = true;
    st.dataset.s = 'done'; stT.textContent = 'Appel terminé · Bob a pris la demande';
    SCRIPT.filter((x) => x.who).slice(-6).forEach(bubble);
    steps.forEach((li) => li.classList.add('on'));
    return;
  }

  async function play() {
    const id = ++run;
    log.innerHTML = '';
    light(-1);
    delete st.dataset.s;
    stT.textContent = 'Appel entrant · 06 •• •• 12 48';
    await wait(1600);
    for (const x of SCRIPT) {
      if (id !== run) return;
      if ('step' in x) light(x.step);
      if (x.s) { st.dataset.s = x.s; stT.textContent = x.t; gsap.fromTo(st, { scale: 0.97 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' }); await wait(x.d); continue; }
      const d = bubble(x);
      gsap.from(d, { y: 16, opacity: 0, duration: 0.5, ease: 'expo.out' });
      await wait(x.who === 'cli' ? 1500 : 900 + x.m.length * 22);
    }
  }
  replay.addEventListener('click', play);
  onView(root, play, 0.45);
}
