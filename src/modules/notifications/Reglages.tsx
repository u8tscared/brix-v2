// Réglages : quel événement, sur quel canal (app, téléphone, e-mail, SMS), et heures calmes.
import { BellRing, Mail, MessageSquare, Moon, Smartphone } from 'lucide-react';
import { IconTile, Switch, cn } from '@/components/ui';
import { TYPES_REGLABLES, useNotifs, type Canal } from './store';
import { PushAppareil } from './PushAppareil';

const CANAUX: { k: Canal; label: string; I: typeof Mail }[] = [
  { k: 'app', label: 'App', I: BellRing },
  { k: 'push', label: 'Téléphone', I: Smartphone },
  { k: 'email', label: 'E-mail', I: Mail },
  { k: 'sms', label: 'SMS', I: MessageSquare },
];

export function Reglages() {
  const { prefs, basculer, calme, setCalme } = useNotifs();
  return (
    <div className="space-y-5">
      <PushAppareil />
      <div className="overflow-hidden rounded-card-sm bg-white shadow-halo">
        <div className="grid grid-cols-[1fr_repeat(4,44px)] items-center gap-1 border-b border-halo-line bg-halo-hover px-3 py-2 text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">
          <span>Prévenez-moi quand</span>
          {CANAUX.map(({ k, label, I }) => (
            <span key={k} className="flex flex-col items-center gap-0.5" title={label}>
              <I className="h-3.5 w-3.5" strokeWidth={1.75} />
              <span className="text-[9px]">{label}</span>
            </span>
          ))}
        </div>
        {TYPES_REGLABLES.map((t) => (
          <div key={t.type} className="grid grid-cols-[1fr_repeat(4,44px)] items-center gap-1 border-b border-halo-line px-3 py-1.5 last:border-b-0">
            <span className="text-[13px] leading-tight">{t.label}</span>
            {CANAUX.map(({ k, label }) => {
              const on = (prefs[t.type] ?? []).includes(k);
              return (
                <button key={k} onClick={() => basculer(t.type, k)} className="grid h-11 place-items-center" aria-pressed={on} aria-label={`${t.label} : ${label}`}>
                  <span className={cn('grid h-[22px] w-[22px] place-items-center rounded-[7px] border-2 transition-all duration-300 ease-spring', on ? 'scale-100 border-transparent bg-deep-v shadow-[0_3px_8px_-3px_rgba(109,40,217,.6)]' : 'border-[#dcd5ee] bg-white hover:border-[#c9b2fb]')}>
                    <svg viewBox="0 0 16 16" className={cn('h-3 w-3 transition-opacity', on ? 'opacity-100' : 'opacity-0')}>
                      <path d="M3 8.5l3 3 7-7" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 rounded-card-sm bg-white p-3.5 shadow-halo">
        <IconTile icon={<Moon />} tone="indigo" />
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-semibold">Heures calmes</div>
          <div className="flex items-center gap-1.5 text-[12.5px] text-ink-3">
            de <input type="time" value={calme.de} onChange={(e) => setCalme({ de: e.target.value })} className="num rounded-full bg-pale-n px-2 py-0.5 text-ink focus:shadow-focus focus:outline-none" /> à <input type="time" value={calme.a} onChange={(e) => setCalme({ a: e.target.value })} className="num rounded-full bg-pale-n px-2 py-0.5 text-ink focus:shadow-focus focus:outline-none" />
          </div>
        </div>
        <Switch checked={calme.actif} onChange={(v) => setCalme({ actif: v })} label="Heures calmes" />
      </div>
      <p className="px-1 text-[12px] leading-relaxed text-ink-3">Pendant les heures calmes, seules les signatures et les paiements vous réveillent. Le reste vous attend le matin.</p>
    </div>
  );
}
