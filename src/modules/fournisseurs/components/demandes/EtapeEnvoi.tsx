// Étape 3 : à qui envoyer, pour quand, où livrer.
import { Plug, Star } from 'lucide-react';
import { Badge, cn, Field, Input, Textarea } from '@/components/ui';
import { dayOffset } from '@/lib/format';
import type { Fournisseur } from '../../data/types';
import { FournisseurPastille } from '../ui';
import { Coche } from './commun';

export interface Envoi {
  titre: string;
  fournisseurIds: string[];
  dateLimite: string;
  livraison: string;
  adresse: string;
  message: string;
}

export default function EtapeEnvoi({ fournisseurs, conseilles, envoi, onChange }: { fournisseurs: Fournisseur[]; conseilles: string[]; envoi: Envoi; onChange: (p: Partial<Envoi>) => void }) {
  const choisi = (id: string) => envoi.fournisseurIds.includes(id);
  const basculer = (id: string) => onChange({ fournisseurIds: choisi(id) ? envoi.fournisseurIds.filter((x) => x !== id) : [...envoi.fournisseurIds, id] });
  const ordre = [...fournisseurs].sort((a, b) => Number(conseilles.includes(b.id)) - Number(conseilles.includes(a.id)) || Number(!!b.favori) - Number(!!a.favori));

  return (
    <div className="space-y-6">
      <section className="space-y-2.5">
        <div className="flex items-baseline justify-between gap-3">
          <h4 className="text-[14px] font-semibold">À quels fournisseurs ?</h4>
          <span className="text-[12px] text-ink-3">3 réponses suffisent pour bien comparer</span>
        </div>
        {fournisseurs.length === 0 ? (
          <p className="rounded-field border border-dashed border-[#e3ddf0] px-4 py-5 text-center text-[13px] text-ink-2">Ajoutez d'abord vos fournisseurs dans « Mes fournisseurs ».</p>
        ) : (
          <ul className="overflow-hidden rounded-field border border-halo-line">
            {ordre.map((f) => (
              <li key={f.id} className="border-b border-halo-line last:border-b-0">
                <button type="button" onClick={() => basculer(f.id)} aria-pressed={choisi(f.id)} className={cn('flex min-h-[60px] w-full items-center gap-3 px-3.5 py-2.5 text-left transition hover:bg-halo-hover', choisi(f.id) && 'bg-[#fbfaff]')}>
                  <Coche on={choisi(f.id)} />
                  <FournisseurPastille f={f} size={34} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-[14px] font-medium">
                      <span className="truncate">{f.nom}</span>
                      {f.favori && <Star className="h-3.5 w-3.5 shrink-0 fill-current text-ink-3" strokeWidth={1.75} aria-label="Favori" />}
                    </span>
                    <span className="flex items-center gap-1 truncate text-[12.5px] text-ink-3">
                      {f.connecteur === 'api_brix' && <Plug className="h-3 w-3 shrink-0" />}
                      {[f.agence, f.delaiJours != null ? `livre en ${f.delaiJours} j` : null, f.franco ? `franco ${f.franco} €` : null].filter(Boolean).join(' · ') || f.email}
                    </span>
                  </span>
                  {conseilles.includes(f.id) && <Badge tone="violet" className="shrink-0">Conseillé</Badge>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Field label="Réponse souhaitée avant le">
          <Input type="date" value={envoi.dateLimite} min={dayOffset(0)} onChange={(e) => onChange({ dateLimite: e.target.value })} />
        </Field>
        <Field label="Livraison souhaitée le">
          <Input type="date" value={envoi.livraison} min={dayOffset(0)} onChange={(e) => onChange({ livraison: e.target.value })} />
        </Field>
        <Field label="Adresse de livraison" className="sm:col-span-2" hint="Laissez vide pour un retrait en agence.">
          <Input value={envoi.adresse} onChange={(e) => onChange({ adresse: e.target.value })} placeholder="Adresse du chantier" autoComplete="street-address" />
        </Field>
        <Field label="Nom de la demande" className="sm:col-span-2" hint="Pour la retrouver facilement. Le fournisseur le voit aussi.">
          <Input value={envoi.titre} onChange={(e) => onChange({ titre: e.target.value })} />
        </Field>
        <Field label="Un mot pour le fournisseur (facultatif)" className="sm:col-span-2">
          <Textarea value={envoi.message} onChange={(e) => onChange({ message: e.target.value })} placeholder="Ex. : livraison avant 8 h, accès par la cour." className="min-h-[80px]" />
        </Field>
      </section>
    </div>
  );
}
