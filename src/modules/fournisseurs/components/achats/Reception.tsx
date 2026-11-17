// Pointage de livraison : tout est coché par défaut (le cas le plus courant), on décoche ce qui manque.
import { useEffect, useState } from 'react';
import { Check, CircleAlert, Minus, PackageCheck, Plus } from 'lucide-react';
import { Button, Sheet, cn, toast } from '@/components/ui';
import { num } from '@/lib/format';
import { useAchats } from '../../data/store';
import type { Commande } from '../../data/types';

export default function Reception({ commande, open, onClose }: { commande: Commande; open: boolean; onClose: () => void }) {
  const reception = useAchats((s) => s.reception);
  const [recu, setRecu] = useState<Record<string, number>>({});

  useEffect(() => {
    if (open) setRecu(Object.fromEntries(commande.lignes.map((l) => [l.id, l.quantite])));
  }, [open, commande.lignes]);

  const regler = (id: string, q: number, max: number) => setRecu((r) => ({ ...r, [id]: Math.max(0, Math.min(max, Math.round(q * 100) / 100)) }));
  const manquants = commande.lignes.filter((l) => (recu[l.id] ?? 0) < l.quantite);
  const tout = manquants.length === 0;

  const valider = () => {
    reception(commande.id, commande.lignes.map((l) => ({ ligneId: l.id, quantite: recu[l.id] ?? 0 })));
    toast(tout ? 'Livraison complète enregistrée' : `Réception enregistrée, ${manquants.length} article${manquants.length > 1 ? 's' : ''} manquant${manquants.length > 1 ? 's' : ''}`, tout ? 'ok' : 'warn');
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      width={560}
      title="Pointer la livraison"
      subtitle="Bon de livraison en main, cochez ce qui est arrivé. Si une quantité manque, réglez-la."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} className="hidden sm:inline-flex">Plus tard</Button>
          <Button variant="primary" size="lg" icon={<PackageCheck className="h-4 w-4" />} onClick={valider} className="flex-1 justify-center sm:flex-none">
            {tout ? 'Tout est arrivé' : 'Valider la réception'}
          </Button>
        </>
      }
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[12.5px] font-medium text-ink-2">{commande.lignes.length} article{commande.lignes.length > 1 ? 's' : ''}</span>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" className="max-md:h-10" onClick={() => setRecu(Object.fromEntries(commande.lignes.map((l) => [l.id, l.quantite])))}>Tout cocher</Button>
          <Button size="sm" variant="ghost" className="max-md:h-10" onClick={() => setRecu(Object.fromEntries(commande.lignes.map((l) => [l.id, 0])))}>Tout décocher</Button>
        </div>
      </div>

      <ul className="space-y-2">
        {commande.lignes.map((l) => {
          const q = recu[l.id] ?? 0;
          const complet = q >= l.quantite;
          return (
            <li key={l.id} className={cn('rounded-[12px] border p-3 transition', complet ? 'border-line bg-white' : 'border-[#fde3b5] bg-warn-bg/50')}>
              <div className="flex items-start gap-3">
                <button
                  onClick={() => regler(l.id, complet ? 0 : l.quantite, l.quantite)}
                  aria-label={complet ? 'Marquer comme non reçu' : 'Tout reçu'}
                  aria-pressed={complet}
                  className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-[10px] border-2 transition', complet ? 'border-ok bg-ok text-white' : 'border-line2 bg-white text-transparent hover:border-ink-3')}
                >
                  <Check className="h-5 w-5" strokeWidth={2.5} />
                </button>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="text-[13.5px] font-medium leading-snug">{l.designation}</div>
                  <div className="mt-0.5 text-xs text-ink-3">
                    Commandé <span className="num">{num(l.quantite)}</span> {l.unite}
                    {l.reference && <> · {l.reference}</>}
                  </div>
                </div>
              </div>
              <div className="mt-2.5 flex items-center justify-between gap-3 pl-14">
                <span className={cn('text-xs font-medium', complet ? 'text-ok' : 'text-warn')}>
                  {complet ? 'Tout reçu' : q === 0 ? 'Rien reçu' : `Manque ${num(l.quantite - q)} ${l.unite}`}
                </span>
                <div className="flex items-center rounded-[10px] border border-line2 bg-white">
                  <button aria-label="Moins" onClick={() => regler(l.id, q - 1, l.quantite)} className="grid h-10 w-10 place-items-center text-ink-2 hover:text-ink"><Minus className="h-4 w-4" /></button>
                  <input
                    inputMode="decimal"
                    aria-label={`Quantité reçue pour ${l.designation}`}
                    value={String(q).replace('.', ',')}
                    onChange={(e) => {
                      const n = Number(e.target.value.replace(',', '.'));
                      if (Number.isFinite(n)) regler(l.id, n, l.quantite);
                    }}
                    className="num h-10 w-14 border-x border-line bg-transparent text-center text-[14px] focus:outline-none"
                  />
                  <button aria-label="Plus" onClick={() => regler(l.id, q + 1, l.quantite)} className="grid h-10 w-10 place-items-center text-ink-2 hover:text-ink"><Plus className="h-4 w-4" /></button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {!tout && (
        <div className="mt-4 flex gap-2.5 rounded-[12px] border border-[#fde3b5] bg-warn-bg px-3.5 py-3 text-[13px] text-[#92400e]">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <div className="font-medium">Il manque {manquants.length} article{manquants.length > 1 ? 's' : ''}</div>
            <div className="mt-0.5 text-[12.5px]">{manquants.map((l) => `${l.designation} (${num(l.quantite - (recu[l.id] ?? 0))} ${l.unite})`).join(', ')}. La commande reste ouverte : vous pointerez le reste à la prochaine livraison.</div>
          </div>
        </div>
      )}
    </Sheet>
  );
}
