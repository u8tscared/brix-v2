import { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Clock, MapPin, ShieldCheck, Star } from 'lucide-react';
import { cn } from '@/components/ui';
import { capitalize, dayOffset } from '@/lib/format';
import { useBrix } from '@/lib/store';
import { useVendre } from '../store';

/** Aperçu fidèle de la page de réservation vue par le client, dans un cadre de téléphone. */
export function BookingPreview() {
  const company = useBrix((s) => s.company);
  const events = useBrix((s) => s.events);
  const rdv = useVendre((v) => v.rdv);
  const reviews = useVendre((v) => v.reviews);
  const types = rdv.types.filter((t) => t.on);
  const [typeId, setTypeId] = useState<string | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const type = types.find((t) => t.id === typeId);
  const avg = reviews.reduce((a, r) => a + r.rating, 0) / (reviews.length || 1);

  const days = useMemo(() => {
    const out: string[] = [];
    for (let i = Math.ceil(rdv.minNotice / 24); out.length < 6 && i < 30; i++) {
      const d = dayOffset(i);
      if (rdv.days.includes(new Date(d + 'T12:00').getDay())) out.push(d);
    }
    return out;
  }, [rdv.days, rdv.minNotice]);

  const slots = useMemo(() => {
    if (!day || !type) return [];
    const [fh, fm] = rdv.from.split(':').map(Number);
    const [th, tm] = rdv.to.split(':').map(Number);
    const out: string[] = [];
    for (let m = fh * 60 + fm; m + type.minutes <= th * 60 + tm; m += type.minutes + rdv.buffer) {
      const s = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
      const e = `${String(Math.floor((m + type.minutes) / 60)).padStart(2, '0')}:${String((m + type.minutes) % 60).padStart(2, '0')}`;
      const busy = events.some((ev) => ev.date === day && ev.employeeId === 'e_karim' && ev.start < e && ev.end > s);
      if (!busy) out.push(s);
    }
    return out;
  }, [day, type, rdv, events]);

  const reset = () => { setTypeId(null); setDay(null); setSlot(null); setDone(false); };

  return (
    <div className="mx-auto w-full max-w-[340px] rounded-[44px] border-[10px] border-[#17171f] bg-[#17171f] shadow-pop">
      <div className="relative h-[600px] overflow-hidden rounded-[34px] bg-[#f7f6fb]">
        <div className="absolute left-1/2 top-2 z-10 h-6 w-24 -translate-x-1/2 rounded-full bg-[#17171f]" />
        <div className="h-full overflow-y-auto scrollbar-none">
          <div className="bg-white px-5 pb-5 pt-12 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand font-display text-[18px] font-semibold text-white">{company.logoInitials || 'BE'}</div>
            <div className="mt-2.5 font-display text-[17px] font-semibold">{company.name}</div>
            <div className="mt-0.5 flex items-center justify-center gap-2 text-[12px] text-ink-2">
              <span className="flex items-center gap-0.5"><Star className="h-3.5 w-3.5 fill-[#f59e0b] text-[#f59e0b]" />{avg.toFixed(1).replace('.', ',')}</span>
              <span>·</span><span>{company.city.replace(/^\d+\s/, '')}</span>
              {company.rge && <><span>·</span><span className="flex items-center gap-0.5"><ShieldCheck className="h-3.5 w-3.5 text-ok" />RGE</span></>}
            </div>
          </div>

          <div className="space-y-3 p-4">
            {done ? (
              <div className="animate-scale-in rounded-2xl bg-white p-5 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-ok" strokeWidth={1.5} />
                <div className="mt-2 font-display text-[16px] font-semibold">C'est réservé</div>
                <p className="mt-1 text-[12.5px] text-ink-2">{type?.label} le {day && new Date(day + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} à {slot?.replace(':', ' h ')}. Vous recevez un SMS de confirmation.</p>
                <button onClick={reset} className="mt-4 h-10 w-full rounded-xl bg-sub text-[13px] font-medium">Recommencer l'aperçu</button>
              </div>
            ) : !type ? (
              <>
                <div className="px-1 text-[13px] font-semibold">Quel est votre besoin ?</div>
                {types.map((t) => (
                  <button key={t.id} onClick={() => setTypeId(t.id)} className="flex w-full items-center gap-3 rounded-2xl bg-white p-3.5 text-left shadow-card">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] font-medium">{t.label}</span>
                      <span className="mt-0.5 flex items-center gap-1 text-[11.5px] text-ink-3"><Clock className="h-3 w-3" />{t.minutes} min · {t.price}</span>
                    </span>
                  </button>
                ))}
                {!types.length && <p className="px-1 text-[12.5px] text-ink-3">Aucun type de visite activé.</p>}
              </>
            ) : (
              <>
                <button onClick={() => { setTypeId(null); setDay(null); setSlot(null); }} className="flex items-center gap-1 text-[12.5px] text-ink-2"><ArrowLeft className="h-3.5 w-3.5" />{type.label}</button>
                <div className="px-1 text-[13px] font-semibold">Choisissez un jour</div>
                <div className="grid grid-cols-3 gap-2">
                  {days.map((d) => {
                    const dt = new Date(d + 'T12:00');
                    return (
                      <button key={d} onClick={() => { setDay(d); setSlot(null); }} className={cn('rounded-xl py-2 text-center transition', day === d ? 'bg-ink text-white' : 'bg-white shadow-card')}>
                        <span className="block text-[11px] opacity-70">{capitalize(dt.toLocaleDateString('fr-FR', { weekday: 'short' }))}</span>
                        <span className="num block text-[15px] font-semibold">{dt.getDate()}</span>
                      </button>
                    );
                  })}
                </div>
                {day && (
                  <>
                    <div className="px-1 pt-1 text-[13px] font-semibold">Heure d'arrivée</div>
                    <div className="grid grid-cols-3 gap-2">
                      {slots.map((s) => (
                        <button key={s} onClick={() => setSlot(s)} className={cn('num h-10 rounded-xl text-[13px] font-medium', slot === s ? 'bg-ink text-white' : 'bg-white shadow-card')}>{s.replace(':', ' h ')}</button>
                      ))}
                      {!slots.length && <p className="col-span-3 text-[12px] text-ink-3">Complet ce jour-là.</p>}
                    </div>
                  </>
                )}
                {slot && (
                  <div className="animate-fade-up space-y-2 rounded-2xl bg-white p-3.5">
                    <div className="h-10 rounded-lg border border-line px-3 text-[12.5px] leading-10 text-ink-3">Votre nom</div>
                    <div className="h-10 rounded-lg border border-line px-3 text-[12.5px] leading-10 text-ink-3">Téléphone</div>
                    <div className="flex h-10 items-center gap-1.5 rounded-lg border border-line px-3 text-[12.5px] text-ink-3"><MapPin className="h-3.5 w-3.5" />Adresse des travaux</div>
                    <button onClick={() => setDone(true)} className="h-11 w-full rounded-xl bg-brand text-[13.5px] font-semibold text-white">Confirmer la visite</button>
                  </div>
                )}
              </>
            )}
            <p className="pb-4 pt-2 text-center text-[10.5px] text-ink-3">Réservation sécurisée par Brix</p>
          </div>
        </div>
      </div>
    </div>
  );
}
