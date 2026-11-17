// Ce que le fournisseur fait sur une commande : confirmer (ou proposer une modification), puis faire avancer le suivi.
import { useState, type ReactNode } from 'react';
import { Check, MessageSquareDiff, PackageCheck, PackageOpen, Send, Truck } from 'lucide-react';
import { cn, toast } from '@/components/ui';
import { dateLong, dayOffset } from '@/lib/format';
import { useAchats } from '@/modules/fournisseurs/data/store';
import type { Commande } from '@/modules/fournisseurs/data/types';
import { quand } from '@/modules/fournisseurs/components/demandes/commun';
import { Bloc, CocheSucces, Puce } from '@/modules/fournisseurs/components/portail/commun';

const champ = 'h-12 w-full rounded-[13px] border border-[#e2e2ea] bg-white px-4 text-[16px] text-[#130f26] placeholder:text-[#c9c8d4] focus:border-[#b9a2f5] focus:outline-none focus:ring-4 focus:ring-[#ebe2fe] sm:text-[14.5px]';
const dawn = 'bx-btn-dawn flex h-[52px] w-full items-center justify-center gap-2 rounded-[15px] text-[15px] font-semibold text-white active:scale-[.98] disabled:opacity-40';
const MOTIFS = ['Un article manque', 'Autre date de livraison', 'Quantité différente', 'Prix à revoir'];

function Champ({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-[12.5px] font-medium text-[#5f5f70]">{label}</span>{children}</label>;
}

function Confirmer({ c, prenom }: { c: Commande; prenom: string }) {
  const { majStatutCommande, proposerModification } = useAchats();
  const [date, setDate] = useState(c.livraisonPrevue ?? dayOffset(1));
  const [ref, setRef] = useState('');
  const [modif, setModif] = useState(false);
  const [motif, setMotif] = useState('');
  const [texte, setTexte] = useState('');

  if (modif)
    return (
      <Bloc className="bx-rise p-5 sm:p-6">
        <h2 className="text-[17px] font-semibold tracking-[-0.02em]">Proposer une modification</h2>
        <p className="mt-0.5 text-[13px] text-[#5f5f70]">{prenom} reçoit votre proposition et vous répond. La commande reste en attente.</p>
        <div className="mt-4 flex flex-wrap gap-2">{MOTIFS.map((m) => <Puce key={m} on={motif === m} onClick={() => setMotif(motif === m ? '' : m)} className="h-10">{m}</Puce>)}</div>
        <textarea value={texte} onChange={(e) => setTexte(e.target.value)} rows={3} placeholder="Ex. : la prise Céliane est en rupture, je peux livrer la Mosaic au même prix." className={cn(champ, 'mt-3 h-auto resize-none py-3 leading-relaxed')} />
        {motif === 'Autre date de livraison' && <div className="bx-rise mt-3"><Champ label="Date que je peux tenir"><input type="date" value={date} min={dayOffset(0)} onChange={(e) => setDate(e.target.value)} className={champ} /></Champ></div>}
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={() => setModif(false)} className="h-12 flex-1 rounded-[14px] text-[14px] font-medium text-[#5f5f70] hover:bg-[#f4f3fa]">Retour</button>
          <button
            type="button"
            disabled={!motif && !texte.trim()}
            onClick={() => {
              proposerModification(c.token!, [motif, texte.trim()].filter(Boolean).join(' : '), motif === 'Autre date de livraison' ? date : undefined);
              setModif(false);
              toast(`Proposition envoyée à ${prenom}.`);
            }}
            className="inline-flex h-12 flex-[1.4] items-center justify-center gap-2 rounded-[14px] bg-[#130f26] text-[14px] font-semibold text-white hover:bg-black disabled:opacity-40"
          >
            <Send className="h-4 w-4" strokeWidth={1.75} />Envoyer
          </button>
        </div>
      </Bloc>
    );

  return (
    <Bloc className="p-5 sm:p-6">
      {c.proposition && (
        <div className="bx-fade mb-5 flex gap-3 rounded-[14px] bg-[#f5f0ff] p-3.5 text-[13px]">
          <MessageSquareDiff className="mt-0.5 h-4 w-4 shrink-0 text-[#6d28d9]" strokeWidth={1.75} />
          <div><div className="font-medium text-[#130f26]">Proposition envoyée {quand(c.proposition.at)}</div><div className="mt-0.5 text-[#5f5f70]">« {c.proposition.texte} » · en attente de la réponse de {prenom}.</div></div>
        </div>
      )}
      <h2 className="text-[19px] font-semibold tracking-[-0.025em]">Vous pouvez honorer cette commande ?</h2>
      <p className="mt-1 text-[13.5px] text-[#5f5f70]">{prenom} est prévenu dès que vous confirmez.</p>
      <div className="mt-5 grid gap-3">
        <Champ label="Livraison prévue le"><input type="date" value={date} min={dayOffset(0)} onChange={(e) => setDate(e.target.value)} className={champ} /></Champ>
        <Champ label="Votre n° de commande (facultatif)"><input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Ex. : ARC-558120" className={cn(champ, 'bx-mono')} /></Champ>
      </div>
      <button type="button" className={cn(dawn, 'mt-5')} onClick={() => {
        const r = majStatutCommande(c.token!, 'confirmee', { referenceFournisseur: ref.trim() || undefined, livraisonPrevue: date || undefined }, 'fournisseur');
        if (!r.ok) toast(r.message ?? 'Action impossible pour le moment.', 'warn');
      }}>
        <Check className="h-[18px] w-[18px]" strokeWidth={2.25} />Confirmer la commande
      </button>
      <button type="button" onClick={() => setModif(true)} className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-[14px] text-[14px] font-medium text-[#5f5f70] transition hover:bg-[#f4f3fa] hover:text-[#130f26]">
        <MessageSquareDiff className="h-4 w-4" strokeWidth={1.75} />Proposer une modification
      </button>
    </Bloc>
  );
}

const ETAPES = [
  { k: 'confirmee', label: 'Confirmée', icon: <Check /> },
  { k: 'preparee', label: 'Préparée', icon: <PackageOpen /> },
  { k: 'expediee', label: 'Expédiée', icon: <Truck /> },
  { k: 'livree', label: 'Livrée', icon: <PackageCheck /> },
] as const;

function rang(c: Commande): number {
  if (c.statut === 'livree' || c.statut === 'facturee') return 3;
  if (c.statut === 'expediee' || c.statut === 'livree_partiel') return 2;
  if (c.prepareeLe) return 1;
  return 0;
}

function Suivi({ c, prenom, juste }: { c: Commande; prenom: string; juste: boolean }) {
  const { majStatutCommande, marquerPreparee } = useAchats();
  const [date, setDate] = useState(c.livraisonPrevue ?? dayOffset(1));
  const [suivi, setSuivi] = useState(c.suivi ?? '');
  const r = rang(c);
  const agir = (statut: 'expediee' | 'livree', extra = {}) => {
    const x = majStatutCommande(c.token!, statut, extra, 'fournisseur');
    if (!x.ok) toast(x.message ?? 'Action impossible pour le moment.', 'warn');
  };
  const detail = (i: number) =>
    i === 0 ? (c.livraisonPrevue ? `Livraison prévue ${dateLong(c.livraisonPrevue)}` : 'Merci') : i === 1 ? (c.prepareeLe ? `Prête ${quand(c.prepareeLe)}` : 'Le matériel est rassemblé') : i === 2 ? c.suivi ?? 'Le camion est parti' : 'Reçue sur le chantier';

  return (
    <Bloc className="p-5 sm:p-6">
      {juste && r === 0 && (
        <div className="mb-6 text-center">
          <CocheSucces size={60} />
          <div className="bx-rise mt-4 text-[19px] font-semibold tracking-[-0.025em]" style={{ animationDelay: '.3s' }}>Commande confirmée</div>
          <p className="bx-rise text-[13.5px] text-[#5f5f70]" style={{ animationDelay: '.4s' }}>{prenom} vient d’être prévenu.</p>
        </div>
      )}
      <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Suivi de la commande</h2>
      <p className="mt-0.5 text-[12.5px] text-[#9898a8]">Chaque étape prévient {prenom} : il organise le chantier en conséquence.</p>
      <ol className="mt-5">
        {ETAPES.map((s, i) => {
          const fait = i <= r;
          const courant = i === r + 1;
          return (
            <li key={s.k} className="relative flex gap-3.5 pb-5 last:pb-0">
              {i < ETAPES.length - 1 && (
                <span className="absolute left-[17px] top-9 h-[calc(100%-28px)] w-[2px] overflow-hidden rounded-full bg-[#ececf1]" aria-hidden>
                  {i < r && <span className="fx-trace-v block h-full w-full bg-[#16a34a]" />}
                </span>
              )}
              <span className={cn('relative grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 transition [&_svg]:h-4 [&_svg]:w-4', fait ? 'border-[#16a34a] bg-[#16a34a] text-white' : courant ? 'border-[#130f26] bg-white text-[#130f26]' : 'border-[#ececf1] bg-white text-[#c9c8d4]')}>
                {fait && i === r ? <span key={r} className="bx-pop grid place-items-center">{s.icon}</span> : s.icon}
                {courant && <span className="absolute inset-0 rounded-full fx-ping" />}
              </span>
              <div className="min-w-0 pt-1.5">
                <div className={cn('text-[14.5px] font-medium', !fait && !courant && 'text-[#9898a8]')}>{s.label}</div>
                {(fait || courant) && <div className="text-[12.5px] text-[#5f5f70]">{fait ? detail(i) : 'Prochaine étape'}</div>}
              </div>
            </li>
          );
        })}
      </ol>

      {r === 0 && (
        <div className="mt-6 grid gap-2">
          <button type="button" className={dawn} onClick={() => marquerPreparee(c.token!)}><PackageOpen className="h-[18px] w-[18px]" strokeWidth={1.75} />La commande est prête</button>
        </div>
      )}
      {r === 1 && (
        <div className="bx-rise mt-6 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <Champ label="Arrivée prévue le"><input type="date" value={date} min={dayOffset(0)} onChange={(e) => setDate(e.target.value)} className={champ} /></Champ>
            <Champ label="Transporteur ou créneau"><input value={suivi} onChange={(e) => setSuivi(e.target.value)} placeholder="Camion, 7 h 30 – 9 h" className={champ} /></Champ>
          </div>
          <button type="button" className={dawn} onClick={() => agir('expediee', { livraisonPrevue: date || undefined, suivi: suivi.trim() || undefined })}><Truck className="h-[18px] w-[18px]" strokeWidth={1.75} />Indiquer l’expédition</button>
        </div>
      )}
      {r === 2 && <button type="button" className={cn(dawn, 'mt-6')} onClick={() => agir('livree')}><PackageCheck className="h-[18px] w-[18px]" strokeWidth={1.75} />Marquer livrée</button>}
      {r === 3 && <p className="bx-fade mt-5 rounded-[14px] bg-[#ecfdf3] px-4 py-3 text-center text-[13.5px] font-medium text-[#15803d]">Livrée. Merci, tout est en ordre côté {prenom}.</p>}
    </Bloc>
  );
}

export default function ActionsCommande({ c, prenom }: { c: Commande; prenom: string }) {
  const [vuStatut] = useState(c.statut);
  if (c.statut === 'envoyee') return <Confirmer c={c} prenom={prenom} />;
  return <Suivi c={c} prenom={prenom} juste={vuStatut === 'envoyee'} />;
}
