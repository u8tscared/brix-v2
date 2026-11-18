// Paiement en ligne côté client (acompte ou facture) : carte, Apple Pay, virement instantané, 3 fois.
// Démo : aucun débit. Réel : session Stripe Checkout créée par le worker (POST /api/p/facture/:jeton/payer).
import { useEffect, useState } from 'react';
import { Apple, ArrowLeft, CalendarClock, Check, CreditCard, Landmark, Lock, ShieldCheck } from 'lucide-react';
import { cn, IconTile, type HaloTone } from '@/components/ui';
import { dateShort, dayOffset, money } from '@/lib/format';
import type { MoyenPaiement } from '@/parcours/signature';
import { BoutonAube, BoutonEncre, CocheAnimee, Feuille } from './primitives';

const MOYENS: { k: MoyenPaiement; label: string; sous: string; I: typeof CreditCard; tone: HaloTone }[] = [
  { k: 'carte', label: 'Carte bancaire', sous: 'CB, Visa, Mastercard', I: CreditCard, tone: 'violet' },
  { k: 'apple', label: 'Apple Pay', sous: 'En un geste, sans saisir de carte', I: Apple, tone: 'neutral' },
  { k: 'virement', label: 'Virement instantané', sous: 'Depuis votre banque, sans saisir d’IBAN', I: Landmark, tone: 'green' },
  { k: '3x', label: 'En 3 fois sans frais', sous: 'Par carte, l’artisan est payé en une fois', I: CalendarClock, tone: 'peach' },
];

const BANQUES = ['Crédit Agricole', 'BNP Paribas', 'Société Générale', 'Caisse d’Épargne', 'Banque Populaire', 'LCL', 'Crédit Mutuel', 'La Banque Postale', 'Boursorama', 'Autre banque'];

const groupe = (v: string, n: number, sep = ' ') => v.replace(/\D/g, '').slice(0, n).replace(new RegExp(`(\\d{4})(?=\\d)`, 'g'), `$1${sep}`);

interface Props {
  open: boolean;
  onClose: () => void;
  montant: number;
  titre: string; // « Acompte de 30 % · D-2026-118 »
  beneficiaire: string;
  onPayer: (m: MoyenPaiement) => Promise<unknown>;
  apres?: React.ReactNode; // contenu sous la confirmation (prochaines étapes)
  moyenInitial?: MoyenPaiement; // moyen choisi avant d'ouvrir (écran de succès)
}

export function Paiement({ open, onClose, montant, titre, beneficiaire, onPayer, apres, moyenInitial }: Props) {
  const [moyen, setMoyen] = useState<MoyenPaiement>(moyenInitial ?? 'carte');
  const [etape, setEtape] = useState<'choix' | 'banque' | 'ok'>('choix');
  const [banque, setBanque] = useState('');
  const [carte, setCarte] = useState({ num: '', exp: '', cvc: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open && moyenInitial) setMoyen(moyenInitial);
  }, [open, moyenInitial]);

  const carteOk = carte.num.replace(/\D/g, '').length === 16 && /^\d{2} \/ \d{2}$/.test(carte.exp) && carte.cvc.length >= 3;
  const pret = moyen === 'carte' || moyen === '3x' ? carteOk : true;

  const payer = async () => {
    if (moyen === 'virement' && etape === 'choix') return setEtape('banque');
    setBusy(true);
    await onPayer(moyen);
    setBusy(false);
    setEtape('ok');
  };
  const fermer = () => {
    onClose();
    setTimeout(() => {
      setEtape('choix');
      setCarte({ num: '', exp: '', cvc: '' });
      setBanque('');
    }, 350);
  };
  const tiers = Math.round((montant / 3) * 100) / 100;

  return (
    <Feuille open={open} onClose={fermer} titre={etape === 'ok' ? undefined : etape === 'banque' ? 'Choisissez votre banque' : 'Paiement sécurisé'} sousTitre={etape === 'ok' ? undefined : `${titre} · à ${beneficiaire}`}>
      {etape === 'ok' ? (
        <div className="pb-2 pt-6 text-center">
          <CocheAnimee ton="vert" />
          <h3 className="bx-rise mt-6 text-[24px] font-semibold">Paiement reçu</h3>
          <p className="bx-rise mx-auto mt-2 max-w-[320px] text-[14.5px] leading-relaxed text-ink-2" style={{ animationDelay: '.08s' }}>
            {money(montant)} réglés {moyen === '3x' ? 'en 3 fois' : MOYENS.find((m) => m.k === moyen)?.label.toLowerCase().replace('carte bancaire', 'par carte')}. {beneficiaire} est prévenu et votre reçu arrive par e-mail.
          </p>
          {apres && <div className="bx-rise mt-6 text-left" style={{ animationDelay: '.16s' }}>{apres}</div>}
          <BoutonEncre className="mt-7 w-full" onClick={fermer}>
            Terminer
          </BoutonEncre>
        </div>
      ) : etape === 'banque' ? (
        <div className="bx-fade">
          <button onClick={() => setEtape('choix')} className="-ml-2 mb-3 inline-flex h-9 items-center gap-1.5 rounded-full px-2 text-[13px] font-medium text-ink-2 hover:bg-halo-hover">
            <ArrowLeft className="h-4 w-4" /> Autres moyens
          </button>
          <div className="grid grid-cols-2 gap-2">
            {BANQUES.map((b) => (
              <button key={b} onClick={() => setBanque(b)} className={cn('flex min-h-[52px] items-center gap-2.5 rounded-card-sm bg-white px-3.5 text-left text-[13.5px] font-medium transition duration-300 ease-spring', banque === b ? 'bg-dawn-pale shadow-[0_0_0_1.5px_#e9b8f5,0_10px_30px_-12px_rgba(217,70,239,.35)]' : 'shadow-halo-sm hover:-translate-y-px')}>
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[9px] bg-pale-v text-[11px] font-semibold text-deep-v">{b.slice(0, 2).toUpperCase()}</span>
                <span className="min-w-0 flex-1 leading-tight">{b}</span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-[12.5px] leading-relaxed text-ink-3">Vous validez le virement dans l’application de votre banque. Il arrive en quelques secondes, avec la bonne référence.</p>
          <BoutonAube className="mt-5 w-full" disabled={!banque} chargement={busy} onClick={payer}>
            Ouvrir {banque || 'ma banque'}
          </BoutonAube>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-card bg-dawn-pale px-5 py-5 text-center">
            <div className="label-halo">Montant à régler</div>
            <div className="num-halo mt-1 text-[40px] leading-none">{money(montant)}</div>
            {moyen === '3x' && (
              <div className="bx-fade mt-4 grid grid-cols-3 gap-2 text-left">
                {[0, 30, 60].map((j, i) => (
                  <div key={j} className="rounded-card-sm bg-white px-3 py-2.5 shadow-halo-sm">
                    <div className="text-[11.5px] text-ink-3">{i === 0 ? 'Aujourd’hui' : dateShort(dayOffset(j))}</div>
                    <div className="num text-[14.5px] font-semibold">{money(i === 2 ? Math.round((montant - tiers * 2) * 100) / 100 : tiers)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2" role="radiogroup" aria-label="Moyen de paiement">
            {MOYENS.map(({ k, label, sous, I, tone }) => {
              const on = moyen === k;
              return (
                <button key={k} role="radio" aria-checked={on} onClick={() => setMoyen(k)} className={cn('flex min-h-[64px] w-full items-center gap-3.5 rounded-card-sm bg-white px-4 text-left transition-all duration-300 ease-spring', on ? 'shadow-[0_0_0_1.5px_#e9b8f5,0_10px_30px_-12px_rgba(217,70,239,.35)]' : 'shadow-halo-sm hover:-translate-y-px hover:shadow-[0_0_0_1px_#e3dcf3,0_10px_24px_-12px_rgba(60,30,120,.18)]')}>
                  <IconTile tone={tone} icon={<I strokeWidth={1.9} />} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14.5px] font-semibold">{label}</span>
                    <span className="block text-[12.5px] text-ink-3">{sous}</span>
                  </span>
                  <span className={cn('grid h-[22px] w-[22px] place-items-center rounded-full transition duration-300 ease-spring', on ? 'scale-100 bg-dawn-diag shadow-[0_4px_12px_-3px_rgba(217,70,239,.6)]' : 'shadow-[inset_0_0_0_2px_#dcd6ea]')}>{on && <Check className="h-3 w-3 text-white" strokeWidth={3} />}</span>
                </button>
              );
            })}
          </div>

          {(moyen === 'carte' || moyen === '3x') && (
            <div className="bx-fade overflow-hidden rounded-card-sm bg-white shadow-[0_0_0_1px_#ece8f6] focus-within:shadow-[0_0_0_1px_#c4b5fd,0_0_0_4px_rgba(167,139,250,.22)]">
              <label className="flex h-[52px] items-center gap-3 border-b border-halo-line px-4">
                <CreditCard className="h-4 w-4 text-ink-3" strokeWidth={1.75} />
                <input className="num min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-3" placeholder="Numéro de carte" inputMode="numeric" autoComplete="cc-number" value={carte.num} onChange={(e) => setCarte({ ...carte, num: groupe(e.target.value, 16) })} />
                <span className="text-[11px] font-semibold tracking-wide text-ink-3">{/^4/.test(carte.num) ? 'VISA' : /^5/.test(carte.num) ? 'MASTERCARD' : 'CB'}</span>
              </label>
              <div className="grid grid-cols-2">
                <input className="num h-[52px] border-r border-halo-line bg-transparent px-4 text-[15px] outline-none placeholder:text-ink-3" placeholder="MM / AA" inputMode="numeric" autoComplete="cc-exp" value={carte.exp} onChange={(e) => {
                  const d = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setCarte({ ...carte, exp: d.length > 2 ? `${d.slice(0, 2)} / ${d.slice(2)}` : d });
                }} />
                <input className="num h-[52px] bg-transparent px-4 text-[15px] outline-none placeholder:text-ink-3" placeholder="Cryptogramme" inputMode="numeric" autoComplete="cc-csc" value={carte.cvc} onChange={(e) => setCarte({ ...carte, cvc: e.target.value.replace(/\D/g, '').slice(0, 4) })} />
              </div>
            </div>
          )}
          {(moyen === 'carte' || moyen === '3x') && !carteOk && (
            <button onClick={() => setCarte({ num: '4242 4242 4242 4242', exp: '12 / 29', cvc: '123' })} className="-mt-2 text-[12.5px] font-medium text-[#7c3aed] underline-offset-2 hover:underline">
              Démo : remplir une carte de test
            </button>
          )}

          {moyen === 'apple' ? (
            <button onClick={payer} disabled={busy} className="flex h-[54px] w-full items-center justify-center gap-1.5 rounded-pill bg-black text-[17px] font-medium text-white shadow-ink transition duration-300 ease-spring hover:-translate-y-px active:scale-[.985] disabled:opacity-60">
              {busy ? 'Validation…' : <><Apple className="h-5 w-5 fill-white" strokeWidth={0} /> Payer</>}
            </button>
          ) : (
            <BoutonAube className="w-full" disabled={!pret} chargement={busy} onClick={payer}>
              {moyen === 'virement' ? 'Choisir ma banque' : moyen === '3x' ? `Payer ${money(tiers)} aujourd’hui` : `Payer ${money(montant)}`}
            </BoutonAube>
          )}

          <div className="flex items-center justify-center gap-4 text-[12px] text-ink-3">
            <span className="inline-flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> Chiffré de bout en bout</span>
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> 3D Secure</span>
          </div>
          <p className="-mt-2 text-center text-[11.5px] text-ink-3">Démonstration : aucun débit réel.</p>
        </div>
      )}
    </Feuille>
  );
}
