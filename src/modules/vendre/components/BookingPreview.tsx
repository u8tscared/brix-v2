import { useMemo, useState } from 'react';
import { ArrowLeft, Clock, MapPin, ShieldCheck, Star } from 'lucide-react';
import { cn, IconTile } from '@/components/ui';
import { SuccessDot } from '@/components/motion';
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
    <div className="mx-auto w-full max-w-[340px] rounded-[46px] border-[10px] border-[#15122a] bg-[#15122a] shadow-[0_40px_80px_-30px_rgba(50,25,110,.5),inset_0_0_0_1.5px_#3a3456]">
      <div className="relative isolate h-[600px] overflow-hidden rounded-[36px] bg-[#f7f5fc]">
        <div aria-hidden className="pointer-events-none absolute -left-16 -top-20 -z-10 h-56 w-56 rounded-full bg-[#c4b5fd] opacity-50 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-10 -z-10 h-48 w-48 rounded-full bg-[#f0abfc] opacity-45 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute left-16 top-24 -z-10 h-40 w-40 rounded-full bg-[#fdba74] opacity-35 blur-3xl" />
        <div className="absolute left-1/2 top-2 z-10 h-6 w-24 -translate-x-1/2 rounded-full bg-[#15122a]" />
        <div className="h-full overflow-y-auto scrollbar-none">
          <div className="px-5 pb-4 pt-12 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-[18px] bg-night text-[18px] font-semibold tracking-[-0.02em] text-white shadow-[0_10px_24px_-10px_rgba(19,15,38,.6)]">{company.logoInitials || 'BE'}</div>
            <div className="mt-3 text-[18px] font-semibold tracking-[-0.03em]">{company.name}</div>
            <div className="mt-0.5 flex items-center justify-center gap-2 text-[12px] text-ink-2">
              <span className="flex items-center gap-0.5"><Star className="h-3.5 w-3.5 fill-[#f59e0b] text-[#f59e0b]" />{avg.toFixed(1).replace('.', ',')}</span>
              <span>·</span><span>{company.city.replace(/^\d+\s/, '')}</span>
              {company.rge && <><span>·</span><span className="flex items-center gap-0.5"><ShieldCheck className="h-3.5 w-3.5 text-ok" />RGE</span></>}
            </div>
          </div>

          <div className="space-y-3 p-4">
            {done ? (
              <div className="animate-scale-in rounded-card bg-white p-5 text-center shadow-halo">
                <SuccessDot size={48} className="mx-auto" />
                <div className="mt-3 text-[17px] font-semibold tracking-[-0.03em]">C'est réservé</div>
                <p className="mt-1 text-[12.5px] text-ink-2">{type?.label} le {day && new Date(day + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} à {slot?.replace(':', ' h ')}. Vous recevez un SMS de confirmation.</p>
                <button onClick={reset} className="mt-4 h-10 w-full rounded-full bg-halo-track text-[13px] font-medium">Recommencer l'aperçu</button>
              </div>
            ) : !type ? (
              <>
                <div className="px-1 text-[13px] font-semibold">Quel est votre besoin ?</div>
                {types.map((t) => (
                  <button key={t.id} onClick={() => setTypeId(t.id)} className="flex w-full items-center gap-3 rounded-card-sm bg-white p-3.5 text-left shadow-halo-sm transition-transform duration-300 ease-spring active:scale-[.98]">
                    <IconTile name="CalendarCheck" tone="violet" size="row" />
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
                <button onClick={() => { setTypeId(null); setDay(null); setSlot(null); }} className="glass inline-flex h-8 items-center gap-1 rounded-full pl-2.5 pr-3 text-[12.5px] text-ink-2"><ArrowLeft className="h-3.5 w-3.5" />{type.label}</button>
                <div className="px-1 text-[13px] font-semibold">Choisissez un jour</div>
                <div className="grid grid-cols-3 gap-2">
                  {days.map((d) => {
                    const dt = new Date(d + 'T12:00');
                    return (
                      <button key={d} onClick={() => { setDay(d); setSlot(null); }} className={cn('rounded-card-sm py-2 text-center transition-[background,color,box-shadow] duration-300 ease-spring', day === d ? 'bg-dawn text-white shadow-dawn' : 'bg-white shadow-halo-sm')}>
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
                        <button key={s} onClick={() => setSlot(s)} className={cn('num h-10 rounded-full text-[13px] font-medium transition-[background,color] duration-300', slot === s ? 'bg-ink text-white' : 'bg-white shadow-halo-sm')}>{s.replace(':', ' h ')}</button>
                      ))}
                      {!slots.length && <p className="col-span-3 text-[12px] text-ink-3">Complet ce jour-là.</p>}
                    </div>
                  </>
                )}
                {slot && (
                  <div className="animate-fade-up space-y-2 rounded-card-sm bg-white p-3.5 shadow-halo-sm">
                    <div className="h-10 rounded-field px-3 text-[12.5px] leading-10 text-ink-3 shadow-[inset_0_0_0_1px_#ece8f6]">Votre nom</div>
                    <div className="h-10 rounded-field px-3 text-[12.5px] leading-10 text-ink-3 shadow-[inset_0_0_0_1px_#ece8f6]">Téléphone</div>
                    <div className="flex h-10 items-center gap-1.5 rounded-field px-3 text-[12.5px] text-ink-3 shadow-[inset_0_0_0_1px_#ece8f6]"><MapPin className="h-3.5 w-3.5" />Adresse des travaux</div>
                    <button onClick={() => setDone(true)} className="h-11 w-full rounded-full bg-ink text-[13.5px] font-semibold text-white shadow-ink">Confirmer la visite</button>
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
