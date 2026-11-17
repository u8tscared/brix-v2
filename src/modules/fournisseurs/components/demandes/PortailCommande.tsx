// Portail fournisseur, bon de commande : confirmer, indiquer l'expédition, marquer livrée.
import { useState } from 'react';
import { CalendarClock, Check, MapPin, MessageSquareText, PackageCheck, Truck } from 'lucide-react';
import { Button, Card, cn, Field, Input, toast } from '@/components/ui';
import { dateLong, dayOffset, money } from '@/lib/format';
import { totalCommande, useAchats } from '../../data/store';
import type { Commande, StatutCommande } from '../../data/types';
import { Info, pluriel } from './commun';
import { Merci } from './PortailDemande';

const ETAPES: { s: StatutCommande[]; label: string }[] = [
  { s: ['envoyee'], label: 'Reçue' },
  { s: ['confirmee'], label: 'Confirmée' },
  { s: ['expediee', 'livree_partiel'], label: 'Expédiée' },
  { s: ['livree', 'facturee'], label: 'Livrée' },
];

function Suivi({ statut }: { statut: StatutCommande }) {
  const i = ETAPES.findIndex((e) => e.s.includes(statut));
  return (
    <ol className="grid grid-cols-4 gap-1.5">
      {ETAPES.map((e, k) => (
        <li key={e.label} className="min-w-0">
          <span className={cn('block h-1 rounded-full', k <= i ? 'bg-ok' : 'bg-line2')} />
          <span className={cn('mt-1.5 flex items-center gap-1 truncate text-[11.5px] font-medium', k <= i ? 'text-ink' : 'text-ink-3')}>
            {k < i && <Check className="h-3 w-3 text-ok" />}
            {e.label}
          </span>
        </li>
      ))}
    </ol>
  );
}

export default function PortailCommande({ c, entreprise }: { c: Commande; entreprise: string }) {
  const maj = useAchats((s) => s.majStatutCommande);
  const [ref, setRef] = useState(c.referenceFournisseur ?? '');
  const [date, setDate] = useState(c.livraisonPrevue ?? dayOffset(1));
  const [suivi, setSuivi] = useState(c.suivi ?? '');

  const agir = (statut: StatutCommande, extra: Parameters<typeof maj>[2], msg: string) => {
    const r = maj(c.token!, statut, extra, 'fournisseur');
    if (r.ok) toast(msg);
    else toast(r.message ?? 'Action impossible pour le moment.', 'warn');
  };

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="text-[12.5px] text-ink-3"><span className="num font-medium">{c.numero}</span> · {pluriel(c.lignes.length, 'article')}</div>
        <h1 className="mt-1 font-display text-[21px] font-semibold leading-tight tracking-[-0.02em]">Commande de {entreprise}</h1>
        <div className="mt-4"><Suivi statut={c.statut} /></div>
        <div className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
          <Info icon={<MapPin />} label={c.mode === 'retrait_agence' ? 'Retrait' : 'Livraison'}>{c.mode === 'retrait_agence' ? 'Retrait en agence' : c.adresse ?? 'Adresse à confirmer'}</Info>
          <Info icon={<CalendarClock />} label="Date souhaitée">{c.livraisonPrevue ? dateLong(c.livraisonPrevue) : 'Dès que possible'}</Info>
        </div>
        {c.message && (
          <p className="mt-4 flex gap-2.5 rounded-[12px] bg-sub px-3.5 py-3 text-[13.5px] text-ink-2">
            <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" strokeWidth={1.75} />« {c.message} »
          </p>
        )}
      </Card>

      <Card className="overflow-hidden">
        <ul>
          {c.lignes.map((l) => (
            <li key={l.id} className="flex items-start gap-3 border-b border-line px-4 py-3 last:border-b-0">
              <span className="num grid h-9 min-w-[44px] shrink-0 place-items-center rounded-[10px] bg-sub px-2 text-[13.5px] font-semibold">
                {String(l.quantite).replace('.', ',')}
                <span className="-mt-1 text-[10px] font-medium text-ink-3">{l.unite}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] leading-snug">{l.designation}</span>
                {l.reference && <span className="text-[12px] text-ink-3">réf. {l.reference}</span>}
              </span>
              <span className="num text-right text-[13px]">
                <span className="block font-medium">{money(l.prix * l.quantite)}</span>
                <span className="text-[11.5px] text-ink-3">{money(l.prix)} / {l.unite}</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between border-t border-line bg-[#fafafc] px-4 py-3 text-[13.5px]">
          <span className="text-ink-2">Total HT{c.port ? `, dont ${money(c.port)} de port` : ''}</span>
          <span className="num text-[16px] font-semibold">{money(totalCommande(c) + c.port)}</span>
        </div>
      </Card>

      {c.statut === 'annulee' && <Merci titre="Commande annulée" texte={`${entreprise} a annulé cette commande. Vous n’avez rien à préparer.`} />}

      {c.statut === 'envoyee' && (
        <Card className="space-y-4 p-5">
          <div>
            <h2 className="text-[15px] font-semibold">Vous préparez cette commande ?</h2>
            <p className="text-[13px] text-ink-2">{entreprise} est prévenu dès que vous confirmez.</p>
          </div>
          <Field label="Votre numéro de commande (facultatif)">
            <Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Ex. : ARC-558120" className="text-[16px] sm:text-[14px]" />
          </Field>
          <Button variant="dawn" size="lg" className="w-full justify-center" icon={<Check className="h-[18px] w-[18px]" />} onClick={() => agir('confirmee', { referenceFournisseur: ref.trim() || undefined }, 'Commande confirmée. Merci !')}>
            Confirmer la commande
          </Button>
        </Card>
      )}

      {c.statut === 'confirmee' && (
        <Card className="space-y-4 p-5">
          <div>
            <h2 className="text-[15px] font-semibold">La commande est partie ?</h2>
            <p className="text-[13px] text-ink-2">Indiquez quand elle arrive : l’équipe s’organise sur le chantier.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Livraison prévue le">
              <Input type="date" value={date} min={dayOffset(0)} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Transporteur ou créneau (facultatif)">
              <Input value={suivi} onChange={(e) => setSuivi(e.target.value)} placeholder="Ex. : camion, 7 h 30 – 9 h" className="text-[16px] sm:text-[14px]" />
            </Field>
          </div>
          <Button variant="dawn" size="lg" className="w-full justify-center" icon={<Truck className="h-[18px] w-[18px]" />} onClick={() => agir('expediee', { livraisonPrevue: date || undefined, suivi: suivi.trim() || undefined }, 'Expédition indiquée. Merci !')}>
            Indiquer l’expédition
          </Button>
        </Card>
      )}

      {(c.statut === 'expediee' || c.statut === 'livree_partiel') && (
        <Card className="space-y-4 p-5">
          <div>
            <h2 className="text-[15px] font-semibold">En route{c.livraisonPrevue ? `, arrivée prévue ${dateLong(c.livraisonPrevue)}` : ''}</h2>
            {c.suivi && <p className="text-[13px] text-ink-2">{c.suivi}</p>}
          </div>
          <Button variant="dawn" size="lg" className="w-full justify-center" icon={<PackageCheck className="h-[18px] w-[18px]" />} onClick={() => agir('livree', {}, 'Livraison enregistrée. Merci !')}>
            Marquer livrée
          </Button>
        </Card>
      )}

      {(c.statut === 'livree' || c.statut === 'facturee') && <Merci titre="Commande livrée" texte={`Tout est en ordre côté ${entreprise}. Merci pour la livraison.`} />}
    </div>
  );
}
