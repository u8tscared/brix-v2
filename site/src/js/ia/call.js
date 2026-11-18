/* Secrétaire téléphonique : l'appel sonne, il est manqué, Bob décroche, la forme d'onde suit
   qui parle, les phrases s'écrivent au fil de la voix, puis SMS et résumé avec la visite posée. */
import { gsap, reduce, $, $$, ic } from '../core.js';
import { wait, onView } from '../subpage.js';

// le B de Brix (déjà dans la page, dans la fenêtre de Bob du hero) sert d'avatar à Bob
const MARK = document.querySelector('.bmark')?.outerHTML || '';

// step : étape de la liste « csteps » qui s'allume à ce moment de l'appel
const SCRIPT = [
  { s: 'missed', t: 'Appel manqué · vous êtes sur le toit', d: 1400 },
  { s: 'bob', t: 'Bob a décroché', d: 500, step: 0 },
  { who: 'bob', m: 'Bonjour, entreprise Martin Plomberie. Je suis Bob, l’assistant virtuel de Karim. Il est sur un chantier, je peux prendre votre demande ?' },
  { who: 'cli', m: 'Oui, bonjour. J’ai une fuite sous l’évier de la cuisine, ça goutte depuis hier.' },
  { who: 'bob', m: 'D’accord. L’eau coule tout le temps, ou seulement quand le robinet est ouvert ?', step: 1 },
  { who: 'cli', m: 'Seulement quand j’ouvre le robinet.' },
  { who: 'bob', m: 'Merci. Karim peut passer jeudi à 8 h 30 ou vendredi à 14 h. Qu’est-ce qui vous arrange ?', step: 2 },
  { who: 'cli', m: 'Jeudi 8 h 30, parfait.' },
  { who: 'bob', m: 'C’est noté. Vous allez recevoir un SMS avec l’heure de passage. Bonne journée !', step: 3 },
  { s: 'done', t: 'Appel terminé · 1 min 12', d: 700 },
  { who: 'sms', m: `<small>${ic('message-square')}SMS envoyé au client</small>Martin Plomberie : visite confirmée jeudi à 8 h 30, 14 rue des Lilas. Pour décaler, répondez à ce message.` },
  { who: 'sum', step: 4, m: `<b><span class="bob-av">${MARK}</span>Résumé pour Karim</b><div><span>Client</span><span>Mme Dubois, nouvelle cliente</span></div><div><span>Demande</span><span>Fuite sous évier, pas urgente</span></div><div><span>Visite</span><span>Jeudi 8 h 30, dans le planning</span></div>` },
];

export function initCall() {
  const root = $('[data-call]');
  if (!root) return;
  const log = $('[data-clog]', root), head = $('[data-cstatus]', root), stT = $('[data-cstatus-t]', root), replay = $('[data-replay]', root);
  const name = $('[data-cname]', root), timer = $('[data-ctimer]', root), waveBox = $('[data-cwave]', root), spk = $('[data-cspk]', root), bars = $('[data-cbars]', root);
  const steps = $$('[data-csteps] li');
  bars.innerHTML = Array.from({ length: 30 }, (_, i) => `<i style="--h:${(0.3 + Math.abs(Math.sin(i * 2.3)) * 0.7).toFixed(2)};animation-delay:${((i * 0.067) % 0.8).toFixed(2)}s;animation-duration:${(0.6 + (i % 5) * 0.09).toFixed(2)}s"></i>`).join('');
  const bubble = (x, html) => {
    const d = document.createElement('div');
    d.className = `cb ${x.who}`;
    d.innerHTML = html ?? (x.who === 'bob' ? `<small>Bob</small>${x.m}` : x.who === 'cli' ? `<small>Client</small>${x.m}` : x.m);
    log.appendChild(d);
    return d;
  };
  const light = (i) => steps.forEach((li, k) => { li.classList.toggle('on', k === i); li.classList.toggle('done', i >= 0 && k < i); });
  const speak = (who) => { waveBox.classList.toggle('on', !!who); waveBox.dataset.who = who || ''; spk.textContent = who === 'bob' ? 'Bob' : who === 'cli' ? 'Client' : ''; };
  let run = 0, tick, secs = 0;
  const startTimer = () => { clearInterval(tick); secs = 4; timer.textContent = '00:04'; tick = setInterval(() => { secs++; timer.textContent = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`; }, 1000); };

  if (reduce) {
    replay.hidden = true;
    head.dataset.s = 'done'; stT.textContent = 'Appel terminé · Bob a pris la demande'; timer.textContent = '01:12';
    SCRIPT.filter((x) => x.who).slice(-5).forEach((x) => bubble(x));
    steps.forEach((li) => li.classList.add('on'));
    return;
  }

  async function play() {
    const id = ++run;
    clearInterval(tick);
    log.innerHTML = '';
    light(-1);
    speak(null);
    delete head.dataset.s;
    name.textContent = '06 •• •• 12 48';
    stT.textContent = 'Appel entrant';
    timer.textContent = '';
    await wait(1700);
    for (const x of SCRIPT) {
      if (id !== run) return;
      if ('step' in x) light(x.step);
      if (x.s) {
        head.dataset.s = x.s;
        stT.textContent = x.t;
        if (x.s === 'bob') startTimer();
        if (x.s === 'done') { clearInterval(tick); timer.textContent = '01:12'; speak(null); }
        gsap.fromTo(head, { scale: 0.97 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' });
        await wait(x.d);
        continue;
      }
      if (x.who === 'bob' || x.who === 'cli') {
        // la phrase s'écrit au rythme de la voix
        speak(x.who);
        const label = x.who === 'bob' ? 'Bob' : 'Client';
        const words = x.m.split(' ');
        const d = bubble(x, `<small>${label}</small><span></span>`);
        const t = d.lastChild;
        gsap.from(d, { y: 12, opacity: 0, duration: 0.45, ease: 'expo.out' });
        for (let i = 1; i <= words.length; i++) {
          if (id !== run) return;
          t.textContent = words.slice(0, i).join(' ');
          await wait(x.who === 'bob' ? 85 : 110);
        }
        speak(null);
        await wait(x.who === 'cli' ? 650 : 500);
        continue;
      }
      const d = bubble(x);
      gsap.from(d, { y: 16, opacity: 0, duration: 0.55, ease: 'expo.out' });
      await wait(1500);
    }
  }
  replay.addEventListener('click', play);
  onView(root, play, 0.45);
}
