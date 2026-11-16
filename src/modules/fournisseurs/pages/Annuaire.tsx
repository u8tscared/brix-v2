// « Mes fournisseurs » : l'annuaire de vos agences et commerciaux, joignables en un geste.
import { useMemo, useState } from 'react';
import { CircleAlert, Mail, Pencil, Phone, Plug, Plus, Star, Store } from 'lucide-react';
import { Badge, Button, Card, EmptyState, PageHeader, cn } from '@/components/ui';
import { money } from '@/lib/format';
import { useAchats } from '../data/store';
import type { Fournisseur } from '../data/types';
import { FournisseurPastille } from '../components/ui';
import { METIERS } from '../components/achats/commun';
import FicheFournisseur from '../components/achats/FicheFournisseur';

const contactLien = 'flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-[10px] border border-line2 bg-white px-3 text-[13px] font-medium text-ink transition hover:bg-sub';

function Carte({ f, onModifier, onFavori }: { f: Fournisseur; onModifier: () => void; onFavori: () => void }) {
  const api = f.connecteur === 'api_brix';
  const metiers = f.metiers.map((m) => METIERS.find((x) => x.cle === m)?.label).filter(Boolean);
  return (
    <Card className="flex min-w-0 flex-col">
      <div className="flex items-start gap-3 p-4 pb-3">
        <FournisseurPastille f={f} size={44} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-semibold leading-tight">{f.nom}</div>
          <div className="mt-0.5 truncate text-xs text-ink-3">{[f.agence, f.contact].filter(Boolean).join(' · ') || 'Coordonnées à compléter'}</div>
        </div>
        <button onClick={onFavori} aria-label={f.favori ? 'Retirer des favoris' : 'Mettre en favori'} aria-pressed={!!f.favori} className="-mr-1.5 -mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-lg transition hover:bg-sub">
          <Star className={cn('h-[18px] w-[18px]', f.favori ? 'fill-[#f59e0b] text-[#f59e0b]' : 'text-ink-3')} />
        </button>
      </div>

      <div className="flex gap-2 px-4">
        {f.telephone ? <a className={contactLien} href={`tel:${f.telephone.replace(/\s/g, '')}`}><Phone className="h-4 w-4 shrink-0" /><span className="num truncate">{f.telephone}</span></a> : null}
        {f.email ? <a className={cn(contactLien, f.telephone && 'flex-none px-3.5')} href={`mailto:${f.email}`} aria-label={`Écrire à ${f.email}`}><Mail className="h-4 w-4 shrink-0" />{!f.telephone && <span className="truncate">{f.email}</span>}</a> : null}
      </div>
      {!f.email && (
        <div className="mx-4 flex gap-2 rounded-[10px] bg-warn-bg px-3 py-2 text-[12px] text-[#92400e]">
          <CircleAlert className="mt-px h-3.5 w-3.5 shrink-0" />Ajoutez l’e-mail du comptoir pour lui envoyer vos demandes.
        </div>
      )}

      <dl className="mx-4 mt-3 grid grid-cols-3 divide-x divide-line rounded-[10px] border border-line text-center">
        <div className="px-2 py-2"><dt className="text-[11px] text-ink-3">Franco</dt><dd className="num text-[13px] font-medium">{f.franco != null ? money(f.franco, true) : '—'}</dd></div>
        <div className="px-2 py-2"><dt className="text-[11px] text-ink-3">Délai</dt><dd className="num text-[13px] font-medium">{f.delaiJours != null ? `${f.delaiJours} j` : '—'}</dd></div>
        <div className="min-w-0 px-2 py-2"><dt className="text-[11px] text-ink-3">N° client</dt><dd className="num truncate text-[13px] font-medium">{f.numeroCompte ?? '—'}</dd></div>
      </dl>

      {metiers.length > 0 && <div className="mt-3 truncate px-4 text-[12px] text-ink-3">{metiers.join(' · ')}</div>}

      <div className="min-h-3 flex-1" />
      <div className="flex items-center justify-between gap-2 border-t border-line px-4 py-2.5">
        {api ? <Badge tone="ok" icon={<Plug />}>Relié par API</Badge> : <Badge icon={<Mail />}>Par e-mail + lien</Badge>}
        <Button size="sm" variant="ghost" icon={<Pencil className="h-3.5 w-3.5" />} onClick={onModifier}>Modifier</Button>
      </div>
    </Card>
  );
}

export default function Annuaire() {
  const { fournisseurs, modifierFournisseur } = useAchats();
  const [fiche, setFiche] = useState<{ open: boolean; f?: Fournisseur }>({ open: false });
  const tries = useMemo(() => [...fournisseurs].sort((a, b) => Number(!!b.favori) - Number(!!a.favori) || a.nom.localeCompare(b.nom, 'fr')), [fournisseurs]);
  const relies = fournisseurs.filter((f) => f.connecteur === 'api_brix').length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Mes fournisseurs"
        subtitle={fournisseurs.length ? `${fournisseurs.length} fournisseur${fournisseurs.length > 1 ? 's' : ''}${relies ? `, dont ${relies} relié${relies > 1 ? 's' : ''} par API` : ''}. Ils reçoivent vos demandes par e-mail, avec un lien pour répondre.` : 'Vos agences, comptoirs et commerciaux.'}
        actions={<Button variant="dawn" icon={<Plus className="h-4 w-4" />} onClick={() => setFiche({ open: true })}>Ajouter un fournisseur</Button>}
      />

      {tries.length === 0 ? (
        <EmptyState
          icon={<Store />}
          title="Ajoutez votre premier fournisseur"
          text="Votre agence Rexel, Point.P ou Cedeo, ou le commercial qui passe vous voir : il suffit de son e-mail pour lui envoyer vos demandes de prix."
          action={<Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setFiche({ open: true })}>Ajouter un fournisseur</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tries.map((f) => (
            <Carte key={f.id} f={f} onModifier={() => setFiche({ open: true, f })} onFavori={() => modifierFournisseur(f.id, { favori: !f.favori })} />
          ))}
        </div>
      )}

      <FicheFournisseur open={fiche.open} fournisseur={fiche.f} onClose={() => setFiche({ open: false })} />
    </div>
  );
}
