import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Pause, Play, Send } from 'lucide-react';
import { AnimatedNumber, SuccessDot } from '@/components/motion';
import { Avatar, Badge, Button, Card, CardHeader, Field, Icon, IconTile, Input, PageHeader, Select, cn, toast } from '@/components/ui';
import { useBrix } from '@/lib/store';
import { capitalize, dateLong, money, todayISO } from '@/lib/format';
import { buildBrief, fmtDuration } from './briefData';
import { useBobLocal } from './store';
import { BobNav } from './components/BobNav';
import { Toggle } from './components/SettingToggle';

export default function Brief() {
  const s = useBrix();
  const navigate = useNavigate();
  const b = useMemo(() => buildBrief(s), [s]);
  const { brief, setBrief } = useBobLocal();
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const timer = useRef<number>();

  useEffect(() => () => { if (canSpeak) window.speechSynthesis.cancel(); window.clearInterval(timer.current); }, [canSpeak]);

  const play = () => {
    if (playing) {
      if (canSpeak) window.speechSynthesis.cancel();
      window.clearInterval(timer.current);
      setPlaying(false);
      return;
    }
    setPlaying(true);
    setProgress(0);
    const start = Date.now();
    // Avancement estimé (la synthèse vocale ne donne pas toujours sa position).
    timer.current = window.setInterval(() => setProgress(Math.min(99, ((Date.now() - start) / 1000 / b.seconds) * 100)), 250);
    const end = () => { window.clearInterval(timer.current); setProgress(100); setPlaying(false); };
    if (!canSpeak) {
      toast('La lecture audio n’est pas disponible sur ce navigateur : le brief est affiché ci-dessous.', 'info');
      end();
      return;
    }
    const u = new SpeechSynthesisUtterance(b.script);
    u.lang = 'fr-FR';
    u.rate = 1.02;
    const fr = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith('fr'));
    if (fr) u.voice = fr;
    u.onboundary = (e) => setProgress(Math.min(99, (e.charIndex / b.script.length) * 100));
    u.onend = end;
    u.onerror = end;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };

  return (
    <div className="space-y-6">
      <PageHeader icon={<IconTile name="Sunrise" tone="peach" size="lg" />} kicker="Brix AI" title="Brief du matin" subtitle="Ce qui compte aujourd’hui, en une minute. À écouter dans le camion." />
      <BobNav />

      <section className="relative overflow-hidden rounded-card bg-dawn-mist shadow-halo">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -left-10 -top-24 h-64 w-64 rounded-full bg-[#ffd3b0] opacity-50 blur-[80px]" />
          <div className="absolute -right-16 -bottom-24 h-64 w-80 rounded-full bg-[#e9d5ff] opacity-60 blur-[90px]" />
        </div>
        <div className="relative flex flex-col gap-5 p-5 md:flex-row md:items-center md:p-6">
          <button onClick={play} aria-label={playing ? 'Arrêter la lecture' : 'Écouter le brief'} className="relative grid h-[72px] w-[72px] shrink-0 place-items-center rounded-full bg-dawn-diag text-white shadow-dawn transition duration-300 ease-spring hover:scale-[1.04] active:scale-95">
            {playing && <span className="absolute inset-0 animate-ping2 rounded-full bg-[#d946ef]" aria-hidden />}
            <span className="absolute inset-[5px] rounded-full ring-2 ring-white/30" aria-hidden />
            {playing ? <Pause className="relative h-7 w-7" /> : <Play className="relative ml-1 h-7 w-7 fill-current" />}
          </button>
          <div className="min-w-0 flex-1">
            <div className="label-halo">{capitalize(dateLong(todayISO()))}</div>
            <div className="text-[22px] font-semibold leading-tight tracking-[-0.03em]">Bonjour {s.user.firstName}, voici ta journée</div>
            <div className="mt-3 flex items-center gap-3">
              <Waveform progress={progress} playing={playing} />
              <span className="num shrink-0 text-[12.5px] text-ink-3">{fmtDuration(b.seconds)}</span>
            </div>
          </div>
        </div>
        <details className="group relative border-t border-halo-line px-5 py-3 text-[13px] text-ink-2 md:px-6">
          <summary className="flex min-h-[28px] cursor-pointer select-none items-center gap-1.5 font-medium text-ink marker:hidden [&::-webkit-details-marker]:hidden">
            <ChevronRight className="h-4 w-4 transition group-open:rotate-90" /> Lire le texte
          </summary>
          <p className="mt-2 max-w-3xl leading-relaxed">{b.script}</p>
        </details>
      </section>

      <div className="grid gap-5 [&>*]:min-w-0 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader title="Argent" icon={<Icon name="Wallet" className="h-4 w-4 text-ink-3" />} action={<Button size="sm" variant="ghost" onClick={() => navigate('/app/tresorerie')}>Trésorerie</Button>} />
            <div className="grid grid-cols-2 divide-line md:grid-cols-4 md:divide-x">
              <Mini label="Encaissé hier" value={b.inYesterday} />
              <Mini label="Ce mois" value={b.inMonth} />
              <Mini label="À encaisser" value={b.toCollect} />
              <Mini label="En retard" value={b.lateTotal} tone={b.lateTotal ? 'bad' : undefined} sub={b.late.length ? `${b.late.length} facture${b.late.length > 1 ? 's' : ''}` : 'aucune'} />
            </div>
          </Card>

          <Card>
            <CardHeader title="Chantiers du jour" meta={`${b.sites.length} en route`} icon={<Icon name="HardHat" className="h-4 w-4 text-ink-3" />} />
            {b.sites.length === 0 && <p className="px-4 py-5 text-[13px] text-ink-2">Aucun chantier planifié aujourd’hui.</p>}
            {b.sites.map(({ c, people }) => (
              <button key={c.id} onClick={() => navigate(`/app/chantiers/${c.id}`)} className="flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left last:border-b-0 hover:bg-[#fafafc]">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-medium">{c.name}</div>
                  <div className="truncate text-[12px] text-ink-3">{c.city} · {c.nextStep}</div>
                </div>
                <div className="flex -space-x-1.5">{people.map((p) => <Avatar key={p.id} initials={p.initials} color={p.color} size={26} ring />)}</div>
                <span className="num hidden w-10 text-right text-[12.5px] text-ink-2 sm:block">{c.progress} %</span>
                <ChevronRight className="h-4 w-4 text-ink-3" />
              </button>
            ))}
            {b.rdv.length > 0 && (
              <div className="border-t border-line bg-[#fbfbfd] px-4 py-2.5 text-[12.5px] text-ink-2">
                Tes rendez-vous : {b.rdv.map((r) => `${r.start} ${r.title}`).join(' · ')}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Équipe" meta={`${s.employees.length} personnes`} icon={<Icon name="Users" className="h-4 w-4 text-ink-3" />} action={<Button size="sm" variant="ghost" onClick={() => navigate('/app/planning')}>Planning</Button>} />
            <div className="grid sm:grid-cols-2">
              {b.team.map(({ e, first, training }) => (
                <div key={e.id} className="flex items-center gap-3 border-b border-line px-4 py-3 sm:odd:border-r">
                  <Avatar initials={e.initials} color={e.color} size={32} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-medium">{e.firstName}</div>
                    <div className="truncate text-[12px] text-ink-3">{training ? 'En formation' : first ? `${first.start} · ${first.title}` : 'Rien de planifié'}</div>
                  </div>
                  {e.clockedInAt ? <Badge tone="ok" dot>{e.clockedInAt}</Badge> : <Badge tone="neutral">Pas pointé</Badge>}
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader title="3 choses à faire" meta={`${b.todos.filter((t) => done[t.id]).length} sur ${b.todos.length}`} />
            <div className="stagger-fast">
            {b.todos.map((t, i) => (
              <div key={t.id} className="flex items-start gap-3 border-b border-line px-4 py-3 last:border-b-0">
                <button onClick={() => { const on = !done[t.id]; setDone((d) => ({ ...d, [t.id]: on })); if (on) toast('Une de moins.', 'ok'); }} aria-label={done[t.id] ? 'Remettre à faire' : 'Marquer comme fait'} className="-m-2 grid h-11 w-11 shrink-0 place-items-center">
                  {done[t.id] ? <SuccessDot size={26} /> : <span className="h-[26px] w-[26px] rounded-full border-2 border-line2 transition hover:border-ink-3" />}
                </button>
                <button onClick={() => navigate(t.to)} className="min-w-0 flex-1 text-left">
                  <div className={cn('text-[13.5px] font-medium transition-colors', done[t.id] && 'text-ink-3 line-through')}>{i + 1}. {t.text}</div>
                  <div className="line-clamp-2 text-[12px] text-ink-3">{t.detail}</div>
                </button>
              </div>
            ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Alertes" meta={b.alerts.length ? `${b.alerts.length}` : 'aucune'} />
            {b.alerts.length === 0 && <p className="px-4 py-4 text-[13px] text-ink-2">Rien à signaler. Belle journée.</p>}
            {b.alerts.map((a) => (
              <button key={a.id} onClick={() => navigate(a.to)} className="flex w-full items-start gap-3 border-b border-line px-4 py-3 text-left last:border-b-0 hover:bg-[#fafafc]">
                <span className={cn('mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg', a.tone === 'bad' ? 'bg-bad-bg text-bad' : a.tone === 'warn' ? 'bg-warn-bg text-warn' : a.tone === 'violet' ? 'bg-vi-50 text-vi-700' : 'bg-[#eef2ff] text-brand')}>
                  <Icon name={a.icon} className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1 text-[13px] leading-snug">{a.text}</span>
              </button>
            ))}
          </Card>

          <Card className="p-4">
            <div className="text-[14px] font-semibold">Recevoir le brief chaque matin</div>
            <p className="mt-0.5 text-[12.5px] text-ink-2">Brix AI t’envoie le brief en message vocal, avant de partir.</p>
            <div className="mt-4 space-y-3.5">
              <Toggle label="Par WhatsApp" hint="Message vocal + résumé écrit" checked={brief.whatsapp} onChange={(v) => setBrief({ whatsapp: v })} />
              <Toggle label="Par SMS" hint="Résumé écrit seulement" checked={brief.sms} onChange={(v) => setBrief({ sms: v })} />
              <div className="grid grid-cols-[110px_1fr] gap-2">
                <Field label="Heure">
                  <Select value={brief.hour} onChange={(e) => setBrief({ hour: e.target.value })}>
                    {['05:30', '06:00', '06:30', '07:00', '07:30', '08:00'].map((h) => <option key={h} value={h}>{h.replace(':', ' h ')}</option>)}
                  </Select>
                </Field>
                <Field label="Numéro">
                  <Input value={brief.phone} onChange={(e) => setBrief({ phone: e.target.value })} inputMode="tel" />
                </Field>
              </div>
              <Button
                className="w-full justify-center"
                icon={<Send className="h-4 w-4" />}
                disabled={!brief.whatsapp && !brief.sms}
                onClick={() => toast(`Essai envoyé au ${brief.phone} ${brief.whatsapp ? 'sur WhatsApp' : 'par SMS'} (simulé en démo).`)}
              >
                Envoyer un essai maintenant
              </Button>
              <p className="text-[11.5px] text-ink-3">{brief.whatsapp || brief.sms ? `Prochain envoi demain à ${brief.hour.replace(':', ' h ')}, du lundi au samedi.` : 'Envoi automatique désactivé.'}</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Mini({ label, value, sub, tone }: { label: string; value: number; sub?: string; tone?: 'bad' }) {
  return (
    <div className="border-b border-line p-4 odd:border-r md:border-b-0 md:odd:border-r-0">
      <div className="text-[12px] font-medium text-ink-2">{label}</div>
      <div className={cn('num mt-1 text-[19px] font-semibold tracking-[-0.02em]', tone === 'bad' && 'text-bad')}><AnimatedNumber value={value} format={(n) => money(Math.round(n), true)} /></div>
      {sub && <div className="text-[11.5px] text-ink-3">{sub}</div>}
    </div>
  );
}

const BARS = Array.from({ length: 64 }, (_, i) => 0.25 + 0.75 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.37)));

/** Onde du message vocal : se remplit au fil de la lecture. */
function Waveform({ progress, playing }: { progress: number; playing: boolean }) {
  return (
    <div className="flex h-9 min-w-0 flex-1 items-center justify-between gap-[2px] overflow-hidden" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label="Avancement du brief">
      {BARS.map((h, i) => {
        const on = (i / BARS.length) * 100 < progress;
        return (
          <i
            key={i}
            className={cn('block min-w-[2px] max-w-[4px] flex-1 rounded-full transition-colors duration-300', on ? 'bg-dawn-diag' : 'bg-[#e6e1f1]', playing && on && 'animate-wave')}
            style={{ height: `${Math.round(h * 100)}%`, animationDelay: `${(i % 7) * 0.09}s` }}
          />
        );
      })}
    </div>
  );
}
