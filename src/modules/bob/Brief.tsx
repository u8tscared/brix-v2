import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, Pause, Play, Send } from 'lucide-react';
import { Avatar, Badge, Button, Card, CardHeader, Field, Icon, Input, PageHeader, Progress, Select, cn, toast } from '@/components/ui';
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
      <PageHeader kicker="Bob" title="Brief du matin" subtitle="Ce qui compte aujourd’hui, en une minute. À écouter dans le camion." />
      <BobNav />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center">
          <button onClick={play} aria-label={playing ? 'Arrêter la lecture' : 'Écouter le brief'} className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-dawn text-white shadow-dawn transition active:scale-95">
            {playing ? <Pause className="h-7 w-7" /> : <Play className="ml-1 h-7 w-7" />}
          </button>
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px] font-medium text-ink-3">{capitalize(dateLong(todayISO()))}</div>
            <div className="font-display text-[20px] font-semibold leading-tight">Bonjour {s.user.firstName}, voici ta journée</div>
            <div className="mt-2 flex items-center gap-3">
              <Progress value={progress} className="flex-1" />
              <span className="num shrink-0 text-[12.5px] text-ink-2">{fmtDuration(b.seconds)}</span>
            </div>
          </div>
        </div>
        <details className="border-t border-line px-5 py-3 text-[13px] text-ink-2">
          <summary className="cursor-pointer select-none font-medium text-ink">Lire le texte</summary>
          <p className="mt-2 leading-relaxed">{b.script}</p>
        </details>
      </Card>

      <div className="grid gap-5 [&>*]:min-w-0 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader title="Argent" icon={<Icon name="Wallet" className="h-4 w-4 text-ink-3" />} action={<Button size="sm" variant="ghost" onClick={() => navigate('/app/tresorerie')}>Trésorerie</Button>} />
            <div className="grid grid-cols-2 divide-line md:grid-cols-4 md:divide-x">
              <Mini label="Encaissé hier" value={money(b.inYesterday, true)} />
              <Mini label="Ce mois" value={money(b.inMonth, true)} />
              <Mini label="À encaisser" value={money(b.toCollect, true)} />
              <Mini label="En retard" value={money(b.lateTotal, true)} tone={b.lateTotal ? 'bad' : undefined} sub={b.late.length ? `${b.late.length} facture${b.late.length > 1 ? 's' : ''}` : 'aucune'} />
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
            <CardHeader title="3 choses à faire" meta="choisies par Bob" />
            {b.todos.map((t, i) => (
              <div key={t.id} className="flex items-start gap-3 border-b border-line px-4 py-3 last:border-b-0">
                <button onClick={() => setDone((d) => ({ ...d, [t.id]: !d[t.id] }))} aria-label="Fait" className={cn('mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition', done[t.id] ? 'border-ok bg-ok text-white' : 'border-line2 text-transparent hover:border-ink-3')}>
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </button>
                <button onClick={() => navigate(t.to)} className="min-w-0 flex-1 text-left">
                  <div className={cn('text-[13.5px] font-medium', done[t.id] && 'text-ink-3 line-through')}>{i + 1}. {t.text}</div>
                  <div className="line-clamp-2 text-[12px] text-ink-3">{t.detail}</div>
                </button>
              </div>
            ))}
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
            <p className="mt-0.5 text-[12.5px] text-ink-2">Bob t’envoie le brief en message vocal, avant de partir.</p>
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

function Mini({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'bad' }) {
  return (
    <div className="border-b border-line p-4 odd:border-r md:border-b-0 md:odd:border-r-0">
      <div className="text-[12px] font-medium text-ink-2">{label}</div>
      <div className={cn('num mt-1 text-[19px] font-semibold tracking-[-0.02em]', tone === 'bad' && 'text-bad')}>{value}</div>
      {sub && <div className="text-[11.5px] text-ink-3">{sub}</div>}
    </div>
  );
}
