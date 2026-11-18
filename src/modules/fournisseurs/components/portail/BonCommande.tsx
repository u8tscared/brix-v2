// Le bon de commande tel qu'un comptoir aime le lire : qui, où, quoi, combien. Papier à bord dentelé.
import { money, num } from '@/lib/format';
import type { Emetteur } from '@/emails/types';
import type { Commande, Fournisseur } from '@/modules/fournisseurs/data/types';
import { totalCommande } from '@/modules/fournisseurs/data/store';
import { MODES } from '@/modules/fournisseurs/components/achats/commun';

export default function BonCommande({ c, f, e, adresseArtisan }: { c: Commande; f?: Fournisseur; e: Emetteur; adresseArtisan: string }) {
  const total = totalCommande(c);
  return (
    <div className="fx-ticket rounded-t-card shadow-[0_1px_2px_rgba(60,30,120,.04),0_24px_48px_-28px_rgba(60,30,120,.22)]">
      <div className="flex items-start justify-between gap-4 border-b border-dashed border-[#e3ddf0] px-5 py-5 sm:px-7">
        <div>
          <div className="bx-mono text-[11px] font-medium uppercase tracking-[0.14em] text-ink-3">Bon de commande</div>
          <div className="bx-mono mt-1 text-[18px] font-medium tracking-[-0.01em]">{c.numero}</div>
        </div>
        <div className="text-right text-[12.5px] text-ink-2">
          <div>du {new Date(c.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
          {f?.numeroCompte && <div className="mt-0.5">Compte client <span className="bx-mono text-ink">{f.numeroCompte}</span></div>}
        </div>
      </div>

      <div className="grid gap-4 border-b border-dashed border-[#e3ddf0] px-5 py-4 text-[13px] sm:grid-cols-3 sm:px-7">
        <div>
          <div className="text-[11.5px] text-ink-3">Client</div>
          <div className="font-medium">{e.entreprise}</div>
          <div className="text-ink-2">{adresseArtisan}</div>
          {e.siret && <div className="bx-mono text-[11.5px] text-ink-3">SIRET {e.siret}</div>}
        </div>
        <div>
          <div className="text-[11.5px] text-ink-3">Fournisseur</div>
          <div className="font-medium">{f?.nom ?? 'Votre agence'}</div>
          {f?.agence && <div className="text-ink-2">{f.agence}</div>}
        </div>
        <div>
          <div className="text-[11.5px] text-ink-3">{MODES[c.mode].label}</div>
          <div className="font-medium">{c.mode === 'retrait_agence' ? 'Au comptoir' : c.adresse ?? 'Adresse à confirmer'}</div>
        </div>
      </div>

      <div className="px-2 sm:px-4">
        <div className="hidden grid-cols-[64px_minmax(0,1fr)_96px_104px] gap-3 px-3 py-2.5 text-[11.5px] font-medium text-ink-3 sm:grid">
          <span>Qté</span><span>Article</span><span className="text-right">P.U. HT</span><span className="text-right">Total HT</span>
        </div>
        <ul className="bx-stagger">
          {c.lignes.map((l) => (
            <li key={l.id} className="grid grid-cols-[52px_minmax(0,1fr)_auto] gap-x-3 border-t border-[#f0eff5] px-3 py-3 sm:grid-cols-[64px_minmax(0,1fr)_96px_104px]">
              <span className="num text-[15px] font-semibold">{num(l.quantite)}<span className="ml-0.5 text-[11px] font-normal text-ink-3">{l.unite}</span></span>
              <span className="min-w-0">
                <span className="block text-[14px] leading-snug">{l.designation}</span>
                {l.reference && <span className="bx-mono block truncate text-[11.5px] text-ink-3">{l.reference}</span>}
                <span className="num mt-0.5 block text-[11.5px] text-ink-3 sm:hidden">{money(l.prix)} / {l.unite}</span>
              </span>
              <span className="num hidden text-right text-[13.5px] text-ink-2 sm:block">{money(l.prix)}</span>
              <span className="num text-right text-[14px] font-medium">{money(l.prix * l.quantite)}</span>
            </li>
          ))}
        </ul>
      </div>

      <dl className="mx-5 mb-2 space-y-1.5 border-t border-ink py-4 text-[13.5px] sm:mx-7">
        <div className="flex justify-between"><dt className="text-ink-2">Articles</dt><dd className="num">{money(total)}</dd></div>
        <div className="flex justify-between"><dt className="text-ink-2">Port</dt><dd className="num">{c.port ? money(c.port) : 'Franco'}</dd></div>
        <div className="flex items-baseline justify-between pt-1.5"><dt className="text-[15px] font-semibold">Total HT</dt><dd className="num text-[22px] font-semibold tracking-[-0.03em]">{money(total + c.port)}</dd></div>
      </dl>
      <p className="px-5 pb-6 text-[11.5px] text-ink-3 sm:px-7">Le même bon est joint à l’e-mail au format EDI, lisible par votre logiciel.</p>
    </div>
  );
}
