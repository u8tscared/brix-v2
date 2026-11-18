// Étape 2 du portail : délai, remise, port, paiement, validité, pièce jointe et commentaire.
import { useRef, type ReactNode } from 'react';
import { FileText, Paperclip, Percent, Trash2, Truck } from 'lucide-react';
import { cn } from '@/components/ui';
import { saisieDecimale } from '@/modules/fournisseurs/components/demandes/commun';
import { taille } from '@/modules/fournisseurs/components/portail/anim';
import { Bloc, Puce } from '@/modules/fournisseurs/components/portail/commun';
import { PAIEMENTS, VALIDITES, type Conditions } from '@/modules/fournisseurs/components/portail/saisie';

const champ = 'h-12 w-full rounded-field border border-[#e3ddf0] bg-white px-4 text-[16px] font-medium text-ink placeholder:font-normal placeholder:text-[#c4bfd6] focus:border-[#b9a2f5] focus:outline-none focus:ring-4 focus:ring-[#ebe2fe]';

function Groupe({ titre, aide, children }: { titre: string; aide?: string; children: ReactNode }) {
  return (
    <div className="border-b border-halo-line px-4 py-5 last:border-b-0 sm:px-6">
      <div className="mb-3">
        <h3 className="text-[15px] font-semibold tracking-[-0.01em]">{titre}</h3>
        {aide && <p className="mt-0.5 text-[12.5px] text-ink-3">{aide}</p>}
      </div>
      {children}
    </div>
  );
}

export default function EtapeConditions({ c, onChange, souhaitee }: { c: Conditions; onChange: (p: Partial<Conditions>) => void; souhaitee?: string }) {
  const fichier = useRef<HTMLInputElement>(null);
  const delais = ['0', '1', '2', '3', '5'];
  return (
    <Bloc className="overflow-hidden">
      <Groupe titre="Délai de livraison" aide={souhaitee ? `L’artisan souhaite être livré ${souhaitee}.` : 'À partir de la commande.'}>
        <div className="flex flex-wrap gap-2">
          {delais.map((d) => (
            <Puce key={d} on={c.delai === d} onClick={() => onChange({ delai: d })}>
              {d === '0' ? 'Aujourd’hui' : `${d} jour${d === '1' ? '' : 's'}`}
            </Puce>
          ))}
          <label className={cn('inline-flex h-11 items-center gap-1.5 rounded-full border px-3 text-[13.5px]', !delais.includes(c.delai) && c.delai !== '' ? 'border-ink' : 'border-[#e3ddf0]')}>
            <input
              inputMode="numeric"
              value={delais.includes(c.delai) ? '' : c.delai}
              onChange={(e) => onChange({ delai: e.target.value.replace(/\D/g, '').slice(0, 2) })}
              placeholder="Autre"
              aria-label="Autre délai en jours"
              className="num w-12 bg-transparent text-center text-[16px] font-medium placeholder:text-[13.5px] placeholder:font-normal placeholder:text-ink-3 focus:outline-none sm:text-[14px]"
            />
            <span className="text-ink-3">j</span>
          </label>
        </div>
      </Groupe>

      <Groupe titre="Remise et frais de port" aide="La remise s’applique à tous les prix saisis. Le total se met à jour tout seul.">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="relative block">
            <span className="mb-1.5 block text-[12.5px] font-medium text-ink-2">Remise globale</span>
            <input inputMode="decimal" value={c.remise} onChange={(e) => onChange({ remise: saisieDecimale(e.target.value) })} placeholder="0" className={cn(champ, 'num pr-11')} />
            <Percent className="pointer-events-none absolute bottom-4 right-4 h-4 w-4 text-ink-3" strokeWidth={1.75} />
          </label>
          <div>
            <span className="mb-1.5 block text-[12.5px] font-medium text-ink-2">Frais de port</span>
            <div className="grid grid-cols-2 gap-1 rounded-[22px] bg-halo-track p-1">
              {[true, false].map((f) => (
                <button key={String(f)} type="button" aria-pressed={c.franco === f} onClick={() => onChange({ franco: f })} className={cn('flex h-10 items-center justify-center gap-1.5 rounded-pill text-[13px] font-medium transition', c.franco === f ? 'bg-white text-ink shadow-[0_1px_2px_rgba(19,15,38,.1)]' : 'text-ink-2')}>
                  {f ? <><Truck className="h-3.5 w-3.5" strokeWidth={1.75} />Offerts</> : 'Facturés'}
                </button>
              ))}
            </div>
            {!c.franco && (
              <label className="bx-rise relative mt-2 block">
                <input inputMode="decimal" autoFocus value={c.port} onChange={(e) => onChange({ port: saisieDecimale(e.target.value) })} placeholder="0,00" aria-label="Montant du port HT" className={cn(champ, 'num pr-14')} />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[12.5px] font-medium text-ink-3">€ HT</span>
              </label>
            )}
          </div>
        </div>
      </Groupe>

      <Groupe titre="Conditions de paiement">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 fx-nobar sm:flex-wrap">
          {PAIEMENTS.map((p) => <Puce key={p} on={c.paiement === p} onClick={() => onChange({ paiement: p })}>{p}</Puce>)}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-[13px] text-ink-2">Offre valable</span>
          {VALIDITES.map((v) => <Puce key={v} on={c.validite === v} onClick={() => onChange({ validite: v })} className="h-10 px-3.5">{v} jours</Puce>)}
        </div>
      </Groupe>

      <Groupe titre="Votre devis en pièce jointe" aide="Facultatif. PDF ou photo, il accompagne vos prix.">
        <input
          ref={fichier}
          type="file"
          accept="application/pdf,image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onChange({ pieceJointe: { nom: f.name, taille: f.size } });
            e.target.value = '';
          }}
        />
        {c.pieceJointe ? (
          <div className="bx-pop flex items-center gap-3 rounded-field border border-halo-line bg-halo-hover p-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-pale-r text-deep-r">
              <FileText className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-medium">{c.pieceJointe.nom}</span>
              <span className="block text-[12px] text-ink-3">{taille(c.pieceJointe.taille)} · joint à votre réponse</span>
            </span>
            <button type="button" aria-label="Retirer la pièce jointe" onClick={() => onChange({ pieceJointe: undefined })} className="grid h-11 w-11 place-items-center rounded-full text-ink-3 transition hover:bg-pale-r hover:text-deep-r">
              <Trash2 className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button type="button" onClick={() => fichier.current?.click()} className="flex h-14 flex-1 items-center justify-center gap-2 rounded-field border-[1.5px] border-dashed border-[#d9d7e3] bg-halo-hover text-[14px] font-medium text-ink transition hover:border-[#b9a2f5] hover:bg-[#f5f0ff]">
              <Paperclip className="h-4 w-4" strokeWidth={1.75} />
              Joindre un fichier
            </button>
            <button type="button" onClick={() => onChange({ pieceJointe: { nom: 'Devis comptoir.pdf', taille: 148_480 } })} className="h-11 px-3 text-[13px] font-medium text-ink-2 underline decoration-[#d9d7e3] underline-offset-4 hover:text-ink">
              Joindre un exemple (démo)
            </button>
          </div>
        )}
      </Groupe>

      <Groupe titre="Un mot pour l’artisan" aide="Facultatif.">
        <textarea
          value={c.commentaire}
          onChange={(e) => onChange({ commentaire: e.target.value })}
          rows={3}
          placeholder="Ex. : différentiels en stock, le reste arrive jeudi."
          className="w-full resize-none rounded-field border border-[#e3ddf0] bg-white px-4 py-3 text-[16px] leading-relaxed placeholder:text-[#c4bfd6] focus:border-[#b9a2f5] focus:outline-none focus:ring-4 focus:ring-[#ebe2fe] sm:text-[14.5px]"
        />
      </Groupe>
    </Bloc>
  );
}
