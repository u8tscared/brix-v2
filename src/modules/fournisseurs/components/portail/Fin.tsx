// Fins du parcours fournisseur : offre envoyée (coche qui se dessine), refus noté, demande close.
import { useState } from 'react';
import { CircleSlash, Mail, PenLine } from 'lucide-react';
import { cn } from '@/components/ui';
import { dateLong, money } from '@/lib/format';
import { Bloc, CocheSucces, Puce } from '@/modules/fournisseurs/components/portail/commun';

export function OffreEnvoyee({ artisan, prenom, total, chiffrees, nb, delai, envoyeeLe, onCorriger, deja }: { artisan: string; prenom: string; total: number; chiffrees: number; nb: number; delai?: number; envoyeeLe?: string; onCorriger: () => void; deja?: boolean }) {
  const etapes = [
    { t: `${prenom || artisan} compare les offres`, d: 'Votre offre est déjà dans son comparatif, ligne par ligne.' },
    { t: 'S’il retient votre offre', d: 'Vous recevez le bon de commande par e-mail, avec un lien comme celui-ci.' },
    { t: 'Vous confirmez en un geste', d: 'Puis vous indiquez la préparation et l’expédition. Il est prévenu à chaque étape.' },
  ];
  return (
    <div className="mx-auto max-w-[560px] space-y-4">
      <Bloc className="relative overflow-hidden px-6 pb-7 pt-9 text-center">
        <div className="bx-sky opacity-70" aria-hidden />
        <div className="relative">
          <CocheSucces />
          <h1 className="bx-rise mt-6 text-[26px] font-semibold leading-tight tracking-[-0.035em]" style={{ animationDelay: '.35s' }}>
            {deja ? 'Votre offre est bien arrivée' : 'C’est envoyé.'}
          </h1>
          <p className="bx-rise mx-auto mt-2 max-w-[38ch] text-[15px] leading-relaxed text-[#5f5f70]" style={{ animationDelay: '.45s' }}>
            {deja && envoyeeLe ? `Envoyée ${dateLong(envoyeeLe.slice(0, 10))}. ` : ''}
            {artisan} {deja ? 'l’a reçue' : 'reçoit votre offre à l’instant'}. Vous pouvez la corriger tant qu’il n’a pas commandé.
          </p>
          <div className="bx-rise mx-auto mt-6 grid max-w-[420px] grid-cols-3 divide-x divide-[#ececf1] rounded-[16px] border border-[#ececf1] bg-white/80" style={{ animationDelay: '.55s' }}>
            <div className="px-2 py-3"><div className="num text-[17px] font-semibold tracking-[-0.02em]">{money(total)}</div><div className="text-[11.5px] text-[#9898a8]">total HT</div></div>
            <div className="px-2 py-3"><div className="num text-[17px] font-semibold tracking-[-0.02em]">{chiffrees}/{nb}</div><div className="text-[11.5px] text-[#9898a8]">articles chiffrés</div></div>
            <div className="px-2 py-3"><div className="num text-[17px] font-semibold tracking-[-0.02em]">{delai == null ? '–' : delai === 0 ? 'Jour J' : `${delai} j`}</div><div className="text-[11.5px] text-[#9898a8]">délai</div></div>
          </div>
        </div>
      </Bloc>

      <Bloc className="px-5 py-5 sm:px-6">
        <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Et ensuite ?</h2>
        <ol className="mt-4 space-y-4">
          {etapes.map((e, i) => (
            <li key={e.t} className="flex gap-3.5">
              <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] font-semibold', i === 0 ? 'bg-[#130f26] text-white' : 'border border-[#e2e2ea] text-[#9898a8]')}>{i + 1}</span>
              <div className="pt-0.5">
                <div className="text-[14px] font-medium">{e.t}</div>
                <div className="mt-0.5 text-[13px] leading-relaxed text-[#5f5f70]">{e.d}</div>
              </div>
            </li>
          ))}
        </ol>
        <button type="button" onClick={onCorriger} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-[14px] border border-[#e2e2ea] bg-white text-[14px] font-medium transition hover:bg-[#f6f6f9] active:scale-[.99]">
          <PenLine className="h-4 w-4" strokeWidth={1.75} />Corriger mon offre
        </button>
      </Bloc>
    </div>
  );
}

export function Message({ icon, titre, texte }: { icon: JSX.Element; titre: string; texte: string }) {
  return (
    <Bloc className="mx-auto max-w-[520px] px-6 py-10 text-center">
      <span className="bx-pop mx-auto grid h-14 w-14 place-items-center rounded-[18px] bg-[#f4f3fa] text-[#5f5f70] [&_svg]:h-6 [&_svg]:w-6">{icon}</span>
      <h1 className="mt-5 text-[22px] font-semibold tracking-[-0.03em]">{titre}</h1>
      <p className="mx-auto mt-2 max-w-[40ch] text-[14.5px] leading-relaxed text-[#5f5f70]">{texte}</p>
    </Bloc>
  );
}

const MOTIFS = ['Pas en stock', 'Hors de ma gamme', 'Délai trop court', 'Quantités trop faibles'];

/** « Je ne peux pas répondre » : un motif en un geste, l'artisan est prévenu. */
export function Decliner({ prenom, onDecliner }: { prenom: string; onDecliner: (motif?: string) => void }) {
  const [ouvert, setOuvert] = useState(false);
  const [motif, setMotif] = useState('');
  if (!ouvert)
    return (
      <button type="button" onClick={() => setOuvert(true)} className="mx-auto flex h-11 items-center gap-2 px-3 text-[13.5px] font-medium text-[#5f5f70] transition hover:text-[#130f26]">
        <CircleSlash className="h-4 w-4" strokeWidth={1.75} />Je ne peux pas répondre à cette demande
      </button>
    );
  return (
    <Bloc className="bx-rise p-5">
      <div className="text-[15px] font-semibold tracking-[-0.01em]">Prévenir {prenom}</div>
      <p className="mt-0.5 text-[13px] text-[#5f5f70]">Il saura qu’il ne doit pas attendre votre réponse. Un motif ? (facultatif)</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {MOTIFS.map((m) => <Puce key={m} on={motif === m} onClick={() => setMotif(motif === m ? '' : m)} className="h-10">{m}</Puce>)}
      </div>
      <div className="mt-4 flex gap-2">
        <button type="button" onClick={() => setOuvert(false)} className="h-12 flex-1 rounded-[14px] text-[14px] font-medium text-[#5f5f70] hover:bg-[#f4f3fa]">Retour</button>
        <button type="button" onClick={() => onDecliner(motif || undefined)} className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-[14px] bg-[#130f26] text-[14px] font-semibold text-white hover:bg-black">
          <Mail className="h-4 w-4" strokeWidth={1.75} />Prévenir
        </button>
      </div>
    </Bloc>
  );
}
