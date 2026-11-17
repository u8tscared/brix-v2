// Paiement en ligne côté client (acompte ou facture) : carte, Apple Pay, virement instantané, 3 fois.
// Démo : aucun débit. Réel : session Stripe Checkout créée par le worker (POST /api/p/facture/:jeton/payer).
import { useState } from 'react';
import { Apple, ArrowLeft, CalendarClock, Check, CreditCard, Landmark, Lock, ShieldCheck } from 'lucide-react';
import { cn } from '@/components/ui';
import { dateShort, dayOffset, money } from '@/lib/format';
import type { MoyenPaiement } from '@/parcours/signature';
import { BoutonAube, BoutonEncre, CocheAnimee, Feuille } from './primitives';

const MOYENS: { k: MoyenPaiement; label: string; sous: string; I: typeof CreditCard }[] = [
  { k: 'carte', label: 'Carte bancaire', sous: 'CB, Visa, Mastercard', I: CreditCard },
  { k: 'apple', label: 'Apple Pay', sous: 'En un geste, sans saisir de carte', I: Apple },
  { k: 'virement', label: 'Virement instantané', sous: 'Depuis votre banque, sans saisir d’IBAN', I: Landmark },
  { k: '3x', label: 'En 3 fois sans frais', sous: 'Par carte, l’artisan est payé en une fois', I: CalendarClock },
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
}

export function Paiement({ open, onClose, montant, titre, beneficiaire, onPayer, apres }: Props) {
  const [moyen, setMoyen] = useState<MoyenPaiement>('carte');
  const [etape, setEtape] = useState<'choix' | 'banque' | 'ok'>('choix');
  const [banque, setBanque] = useState('');
  const [carte, setCarte] = useState({ num: '', exp: '', cvc: '' });
  const [busy, setBusy] = useState(false);

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
          <button onClick={() => setEtape('choix')} className="-ml-2 mb-3 inline-flex h-9 items-center gap-1.5 rounded-full px-2 text-[13px] font-medium text-ink-2 hover:bg-page">
            <ArrowLeft className="h-4 w-4" /> Autres moyens
          </button>
          <div className="grid grid-cols-2 gap-2">
            {BANQUES.map((b) => (
              <button key={b} onClick={() => setBanque(b)} className={cn('flex min-h-[52px] items-center gap-2.5 rounded-2xl border px-3.5 text-left text-[13.5px] font-medium transition', banque === b ? 'border-ink bg-page' : 'border-line2 hover:bg-page')}>
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-page text-[11px] font-semibold text-ink-2">{b.slice(0, 2).toUpperCase()}</span>
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
          <div className="rounded-3xl bg-page px-5 py-5 text-center">
            <div className="text-[12.5px] font-medium text-ink-3">Montant à régler</div>
            <div className="num mt-1 text-[38px] font-semibold leading-none tracking-[-0.035em]">{money(montant)}</div>
            {moyen === '3x' && (
              <div className="bx-fade mt-4 grid grid-cols-3 gap-2 text-left">
                {[0, 30, 60].map((j, i) => (
                  <div key={j} className="rounded-2xl bg-white px-3 py-2.5 shadow-card">
                    <div className="text-[11.5px] text-ink-3">{i === 0 ? 'Aujourd’hui' : dateShort(dayOffset(j))}</div>
                    <div className="num text-[14.5px] font-semibold">{money(i === 2 ? Math.round((montant - tiers * 2) * 100) / 100 : tiers)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2" role="radiogroup" aria-label="Moyen de paiement">
            {MOYENS.map(({ k, label, sous, I }) => {
              const on = moyen === k;
              return (
                <button key={k} role="radio" aria-checked={on} onClick={() => setMoyen(k)} className={cn('flex min-h-[64px] w-full items-center gap-3.5 rounded-2xl border px-4 text-left transition-all duration-200', on ? 'border-ink bg-white shadow-[0_0_0_1px_#15122a]' : 'border-line2 bg-white hover:border-[#cfcbe0]')}>
                  <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-colors', on ? 'bg-ink text-white' : 'bg-page text-ink-2')}>
                    <I className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14.5px] font-semibold">{label}</span>
                    <span className="block text-[12.5px] text-ink-3">{sous}</span>
                  </span>
                  <span className={cn('grid h-[22px] w-[22px] place-items-center rounded-full border-2 transition', on ? 'border-ink bg-ink' : 'border-line2')}>{on && <Check className="h-3 w-3 text-white" strokeWidth={3} />}</span>
                </button>
              );
            })}
          </div>

          {(moyen === 'carte' || moyen === '3x') && (
            <div className="bx-fade overflow-hidden rounded-2xl border border-line2">
              <label className="flex h-[52px] items-center gap-3 border-b border-line px-4">
                <CreditCard className="h-4 w-4 text-ink-3" strokeWidth={1.75} />
                <input className="num min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-3" placeholder="Numéro de carte" inputMode="numeric" autoComplete="cc-number" value={carte.num} onChange={(e) => setCarte({ ...carte, num: groupe(e.target.value, 16) })} />
                <span className="text-[11px] font-semibold tracking-wide text-ink-3">{/^4/.test(carte.num) ? 'VISA' : /^5/.test(carte.num) ? 'MASTERCARD' : 'CB'}</span>
              </label>
              <div className="grid grid-cols-2">
                <input className="num h-[52px] border-r border-line bg-transparent px-4 text-[15px] outline-none placeholder:text-ink-3" placeholder="MM / AA" inputMode="numeric" autoComplete="cc-exp" value={carte.exp} onChange={(e) => {
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
            <button onClick={payer} disabled={busy} className="flex h-14 w-full items-center justify-center gap-1.5 rounded-2xl bg-black text-[17px] font-medium text-white transition active:scale-[.985] disabled:opacity-60">
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
