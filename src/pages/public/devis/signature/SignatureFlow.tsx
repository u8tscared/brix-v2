// Signature électronique du devis en 3 temps : vos informations, votre signature, le code reçu par e-mail.
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Fingerprint, Inbox, Mail, RefreshCw, ShieldCheck } from 'lucide-react';
import { cn } from '@/components/ui';
import { money } from '@/lib/format';
import type { DevisPublicData, Formule } from '@/parcours/documents';
import { masquer } from '@/parcours/documents';
import { lienPublic } from '@/parcours/liens';
import { demanderCode, signer, verifierCode, type Preuve } from '@/parcours/signature';
import { BoutonAube, BoutonEncre, Feuille } from '../../ui/primitives';
import { CodeOtp } from './CodeOtp';
import { PadSignature, type PadRef } from './PadSignature';

type Etape = 'infos' | 'signature' | 'code';
const ETAPES: { k: Etape; label: string }[] = [
  { k: 'infos', label: 'Vos informations' },
  { k: 'signature', label: 'Votre signature' },
  { k: 'code', label: 'Vérification' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  data: DevisPublicData;
  formule: Formule;
  onSigne: (p: Preuve) => void;
}

function Case({ coche, onChange, children }: { coche: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl p-3 transition hover:bg-page">
      <span className={cn('mt-0.5 grid h-[22px] w-[22px] shrink-0 place-items-center rounded-[7px] border-2 transition-all duration-200', coche ? 'border-ink bg-ink' : 'border-line2 bg-white')}>
        <svg viewBox="0 0 16 16" className={cn('h-3 w-3 transition-opacity', coche ? 'opacity-100' : 'opacity-0')}>
          <path d="M3 8.5l3 3 7-7" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <input type="checkbox" className="sr-only" checked={coche} onChange={(e) => onChange(e.target.checked)} />
      <span className="text-[13.5px] leading-relaxed text-ink-2">{children}</span>
    </label>
  );
}

export function SignatureFlow({ open, onClose, data, formule, onSigne }: Props) {
  const { devis, client, company } = data;
  const particulier = client?.kind !== 'pro';
  const [etape, setEtape] = useState<Etape>('infos');
  const [dir, setDir] = useState(1);
  const [nom, setNom] = useState(client?.kind === 'pro' ? client.contact ?? '' : client?.name ?? '');
  const [email, setEmail] = useState(client?.email ?? '');
  const [accord, setAccord] = useState(false);
  const [anticipe, setAnticipe] = useState(false);
  const [mode, setMode] = useState<'dessin' | 'texte'>('dessin');
  const [signePret, setSignePret] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [codeDemo, setCodeDemo] = useState('');
  const [erreur, setErreur] = useState('');
  const [busy, setBusy] = useState(false);
  const [renvoi, setRenvoi] = useState(0);
  const pad = useRef<PadRef>(null);
  const montant = data.ttc * formule.facteur;

  useEffect(() => {
    if (renvoi <= 0) return;
    const t = setTimeout(() => setRenvoi((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [renvoi]);

  const aller = (e: Etape) => {
    setDir(ETAPES.findIndex((x) => x.k === e) > ETAPES.findIndex((x) => x.k === etape) ? 1 : -1);
    setEtape(e);
  };

  const envoyerCode = async () => {
    setBusy(true);
    setErreur('');
    setCode('');
    const c = await demanderCode(devis.id, email);
    setCodeDemo(c);
    setBusy(false);
    setRenvoi(30);
  };

  const continuer = async () => {
    if (etape === 'infos') return aller('signature');
    if (etape === 'signature') {
      const img = pad.current?.image();
      if (!img) return;
      setImage(img);
      aller('code');
      await envoyerCode();
      return;
    }
    const r = verifierCode(devis.id, code);
    if (r !== 'ok') {
      setErreur(r === 'faux' ? 'Ce code ne correspond pas. Vérifiez le dernier e-mail reçu.' : r === 'expire' ? 'Ce code a expiré. Demandez-en un nouveau.' : 'Trop d’essais. Demandez un nouveau code.');
      return;
    }
    setBusy(true);
    const p = await signer(devis.id, { signataire: nom.trim(), email, image: image!, methode: mode, formule: formule.key, mentions: { bonPourAccord: true, cgv: true, demarrageAnticipe: particulier ? anticipe : undefined } });
    setBusy(false);
    onSigne(p);
  };

  useEffect(() => {
    if (etape === 'code' && code.length === 6 && !busy) void continuer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const peut = etape === 'infos' ? nom.trim().length > 1 && /\S+@\S+\.\S+/.test(email) && accord : etape === 'signature' ? signePret : code.length === 6;
  const idx = ETAPES.findIndex((x) => x.k === etape);

  return (
    <Feuille open={open} onClose={onClose} large titre="Signer le devis" sousTitre={`${devis.number} · ${formule.key !== 'confort' ? `formule ${formule.label} · ` : ''}${money(montant)} TTC`}>
      {/* Progression */}
      <div className="mb-5 mt-1 grid grid-cols-3 gap-2">
        {ETAPES.map((e, i) => (
          <div key={e.k}>
            <div className="h-1 overflow-hidden rounded-full bg-[#ece9f5]">
              <div className="bx-dawn h-full rounded-full transition-[width] duration-500 ease-[cubic-bezier(.2,.8,.2,1)]" style={{ width: i < idx ? '100%' : i === idx ? '50%' : '0%' }} />
            </div>
            <div className={cn('mt-1.5 text-[11.5px] font-medium transition-colors', i <= idx ? 'text-ink' : 'text-ink-3')}>{e.label}</div>
          </div>
        ))}
      </div>

      <div key={etape} className="bx-fade" style={{ animation: `bx-rise .4s cubic-bezier(.2,.8,.2,1) both`, ['--dir' as string]: dir }}>
        {etape === 'infos' && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-[12.5px] font-medium text-ink-2">Nom et prénom du signataire</span>
                <input value={nom} onChange={(e) => setNom(e.target.value)} autoComplete="name" className="h-12 w-full rounded-2xl border border-line2 bg-white px-4 text-[15px] outline-none transition focus:border-[#8b5cf6] focus:shadow-[0_0_0_4px_rgba(139,92,246,.12)]" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[12.5px] font-medium text-ink-2">E-mail pour recevoir le code</span>
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" className="h-12 w-full rounded-2xl border border-line2 bg-white px-4 text-[15px] outline-none transition focus:border-[#8b5cf6] focus:shadow-[0_0_0_4px_rgba(139,92,246,.12)]" />
              </label>
            </div>
            <div className="-mx-3">
              <Case coche={accord} onChange={setAccord}>
                <b className="font-semibold text-ink">Bon pour accord.</b> J’accepte le devis {devis.number} de {company.name} pour un montant de {money(montant)} TTC, ses conditions de paiement{devis.depositPercent ? ` (acompte de ${devis.depositPercent} % à la signature)` : ''} et la durée de validité.
              </Case>
              {particulier && (
                <Case coche={anticipe} onChange={setAnticipe}>
                  Je demande que les travaux commencent avant la fin de mon délai de rétractation de 14 jours. <span className="text-ink-3">Facultatif. Sans cette demande, les travaux démarrent après ce délai.</span>
                </Case>
              )}
            </div>
            {particulier && (
              <p className="rounded-2xl bg-page px-4 py-3 text-[12.5px] leading-relaxed text-ink-2">
                Vous disposez de 14 jours pour changer d’avis, sans frais ni justification (article L221-18 du Code de la consommation). Le formulaire de rétractation est joint à votre copie signée.
              </p>
            )}
          </div>
        )}

        {etape === 'signature' && (
          <div>
            <PadSignature ref={pad} nom={nom} mode={mode} onMode={setMode} onChange={setSignePret} />
            <p className="mt-3 flex items-start gap-2 text-[12.5px] leading-relaxed text-ink-3">
              <Fingerprint className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
              Votre signature est apposée sur le devis avec la date, l’heure et une empreinte unique du document. Toute modification ultérieure serait détectée.
            </p>
          </div>
        )}

        {etape === 'code' && (
          <div className="text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-page">
              <Mail className="h-6 w-6 text-ink" strokeWidth={1.75} />
            </span>
            <h3 className="mt-4 text-[19px] font-semibold">Un code vient de partir</h3>
            <p className="mt-1 text-[14px] text-ink-2">
              Saisissez les 6 chiffres envoyés à <b className="font-semibold text-ink">{masquer(email)}</b>
            </p>
            <div className="mt-6">
              <CodeOtp valeur={code} onChange={(v) => { setCode(v); setErreur(''); }} erreur={!!erreur} desactive={busy && !codeDemo} />
            </div>
            <div className={cn('mt-3 min-h-[20px] text-[13px]', erreur ? 'text-[#dc2626]' : 'text-ink-3')}>{erreur || (busy && !codeDemo ? 'Envoi du code…' : 'Valable 10 minutes')}</div>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
              <button onClick={envoyerCode} disabled={renvoi > 0 || busy} className="inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium text-ink-2 transition hover:bg-page disabled:opacity-50">
                <RefreshCw className="h-3.5 w-3.5" /> {renvoi > 0 ? `Renvoyer dans ${renvoi} s` : 'Renvoyer le code'}
              </button>
              <a href={lienPublic('boite')} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium text-[#7c3aed] transition hover:bg-[#f5f0ff]">
                <Inbox className="h-3.5 w-3.5" /> Ouvrir la boîte de démo
              </a>
            </div>
            {codeDemo && (
              <button onClick={() => setCode(codeDemo)} className="bx-rise mx-auto mt-4 flex items-center gap-2 rounded-2xl border border-dashed border-[#d9c9fd] bg-[#faf7ff] px-4 py-2.5 text-[12.5px] text-ink-2">
                Démo, votre code : <span className="bx-mono text-[14px] font-semibold tracking-[.2em] text-ink">{codeDemo}</span> <span className="text-[#7c3aed]">Utiliser</span>
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center gap-2">
        {idx > 0 && (
          <button onClick={() => aller(ETAPES[idx - 1].k)} className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-ink-2 transition hover:bg-page" aria-label="Étape précédente">
            <ArrowLeft className="h-5 w-5" strokeWidth={1.75} />
          </button>
        )}
        {etape === 'code' ? (
          <BoutonAube className="flex-1" disabled={!peut} chargement={busy && !!codeDemo} onClick={continuer} icone={<ShieldCheck className="h-5 w-5" strokeWidth={1.75} />}>
            Signer le devis
          </BoutonAube>
        ) : (
          <BoutonEncre className="flex-1" disabled={!peut} onClick={continuer}>
            Continuer <ArrowRight className="h-[18px] w-[18px]" strokeWidth={2} />
          </BoutonEncre>
        )}
      </div>
      <p className="mt-3 text-center text-[11.5px] text-ink-3">Signature électronique conforme au règlement européen eIDAS · dossier de preuve conservé 10 ans</p>
    </Feuille>
  );
}
