// Portail fournisseur, demande de prix : le comptoir saisit ses prix depuis le lien reçu par e-mail.
import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, MapPin, MessageSquareText, Send, Truck } from 'lucide-react';
import { Button, Card, cn, Field, Input, Textarea } from '@/components/ui';
import { dateLong, money } from '@/lib/format';
import { useAchats } from '../../data/store';
import type { Demande, Destinataire } from '../../data/types';
import { ecrirePrix, Info, lirePrix, pluriel, saisieDecimale } from './commun';
import PortailLigne, { saisieVide, type SaisieLigne } from './PortailLigne';

const MOTIFS = ['Pas en stock', 'Hors de ma gamme', 'Délai trop court'];

export function Merci({ titre, texte }: { titre: string; texte: string }) {
  return (
    <Card className="animate-fade-up px-6 py-10 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-ok-bg text-ok">
        <CheckCircle2 className="h-7 w-7" strokeWidth={1.75} />
      </span>
      <h2 className="mt-4 font-display text-[20px] font-semibold">{titre}</h2>
      <p className="mx-auto mt-2 max-w-sm text-[14px] text-ink-2">{texte}</p>
    </Card>
  );
}

export default function PortailDemande({ d, dest, entreprise }: { d: Demande; dest: Destinataire; entreprise: string }) {
  const { repondre, decliner, marquerVu } = useAchats();
  const [lignes, setLignes] = useState<Record<string, SaisieLigne>>({});
  const [port, setPort] = useState('');
  const [delai, setDelai] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [fini, setFini] = useState<'prix' | 'decline' | null>(null);
  const [modifier, setModifier] = useState(false);
  const [refus, setRefus] = useState<string | null>(null);

  useEffect(() => marquerVu(dest.token), [dest.token, marquerVu]);
  useEffect(() => {
    setLignes(
      Object.fromEntries(
        d.lignes.map((l) => {
          const p = dest.prix.find((x) => x.ligneId === l.id);
          return [l.id, p ? { ...saisieVide(), prix: ecrirePrix(p.prix), indispo: p.prix == null, equivalent: !!p.designationProposee, designation: p.designationProposee ?? '', reference: p.referenceProposee ?? '' } : saisieVide()];
        }),
      ),
    );
    setPort(dest.port ? ecrirePrix(dest.port) : '');
    setDelai(dest.delaiJours != null ? String(dest.delaiJours) : '');
    setCommentaire(dest.commentaire ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dest.id]);

  const sousTotal = useMemo(() => d.lignes.reduce((s, l) => s + (lignes[l.id]?.indispo ? 0 : (lirePrix(lignes[l.id]?.prix ?? '') ?? 0) * l.quantite), 0), [lignes, d.lignes]);
  const total = sousTotal + (lirePrix(port) ?? 0);
  const avecPrix = d.lignes.filter((l) => !lignes[l.id]?.indispo && lirePrix(lignes[l.id]?.prix ?? '') != null).length;
  const sansRien = d.lignes.filter((l) => !lignes[l.id]?.indispo && lirePrix(lignes[l.id]?.prix ?? '') == null).length;

  if (fini === 'prix')
    return (
      <div className="space-y-3">
        <Merci titre="Merci, vos prix sont envoyés" texte={`${entreprise} les reçoit tout de suite. Si votre offre est retenue, le bon de commande arrivera par e-mail avec un lien comme celui-ci.`} />
        <Button variant="secondary" className="h-12 w-full justify-center" onClick={() => { setFini(null); setModifier(true); }}>Corriger mes prix</Button>
      </div>
    );
  if (fini === 'decline' || dest.statut === 'declinee') return <Merci titre="C’est noté" texte={`${entreprise} sait que vous ne pouvez pas répondre à cette demande. Merci de l’avoir signalé.`} />;
  if (d.statut === 'annulee' || d.statut === 'commandee')
    return <Merci titre="Cette demande est close" texte={d.statut === 'commandee' ? `${entreprise} a déjà passé commande pour cette liste. Merci pour votre réponse.` : `${entreprise} a annulé cette demande. Vous n’avez rien à faire.`} />;
  if (dest.statut === 'repondue' && !modifier)
    return (
      <div className="space-y-3">
        <Merci titre="Vous avez déjà répondu" texte={`Vos prix ont été transmis à ${entreprise}. Vous pouvez les corriger tant que la commande n’est pas passée.`} />
        <Button variant="secondary" className="h-12 w-full justify-center" onClick={() => setModifier(true)}>Corriger mes prix</Button>
      </div>
    );

  const envoyer = () => {
    repondre(dest.token, {
      prix: d.lignes.map((l) => {
        const v = lignes[l.id] ?? saisieVide();
        const p = v.indispo ? null : lirePrix(v.prix);
        return { ligneId: l.id, prix: p, ...(v.equivalent && v.designation.trim() && p != null ? { designationProposee: v.designation.trim(), referenceProposee: v.reference.trim() || undefined } : {}) };
      }),
      port: lirePrix(port) ?? 0,
      delaiJours: delai ? Number(delai) : undefined,
      commentaire: commentaire.trim() || undefined,
    });
    setFini('prix');
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="text-[12.5px] text-ink-3"><span className="num font-medium">{d.numero}</span> · {pluriel(d.lignes.length, 'article')}</div>
        <h1 className="mt-1 font-display text-[21px] font-semibold leading-tight tracking-[-0.02em]">Demande de prix de {entreprise}</h1>
        <p className="mt-1 text-[13.5px] text-ink-2">{d.titre}</p>
        <div className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-3">
          <Info icon={<CalendarClock />} label="Réponse avant">{d.dateLimite ? dateLong(d.dateLimite) : 'Dès que possible'}</Info>
          <Info icon={<Truck />} label="Livraison souhaitée">{d.livraisonSouhaitee ? dateLong(d.livraisonSouhaitee) : 'À convenir'}</Info>
          <Info icon={<MapPin />} label="Adresse">{d.adresse ?? 'Retrait en agence'}</Info>
        </div>
        {d.message && (
          <p className="mt-4 flex gap-2.5 rounded-[12px] bg-sub px-3.5 py-3 text-[13.5px] text-ink-2">
            <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" strokeWidth={1.75} />« {d.message} »
          </p>
        )}
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-line px-4 py-3">
          <h2 className="text-[15px] font-semibold">Vos prix nets</h2>
          <p className="text-[12.5px] text-ink-3">Prix unitaire hors taxes, remise déduite. La virgule fonctionne.</p>
        </div>
        <ul>
          {d.lignes.map((l, i) => (
            <PortailLigne key={l.id} l={l} index={i} v={lignes[l.id] ?? saisieVide()} onChange={(p) => setLignes((s) => ({ ...s, [l.id]: { ...(s[l.id] ?? saisieVide()), ...p } }))} />
          ))}
        </ul>
      </Card>

      <Card className="grid gap-4 p-4 sm:grid-cols-2">
        <Field label="Frais de port HT" hint="0 si franco.">
          <Input inputMode="decimal" value={port} onChange={(e) => setPort(saisieDecimale(e.target.value))} placeholder="0,00" suffix="€" className="[&_input]:text-[16px]" />
        </Field>
        <Field label="Délai de livraison">
          <Input inputMode="numeric" value={delai} onChange={(e) => setDelai(e.target.value.replace(/\D/g, '').slice(0, 2))} placeholder="1" suffix="jours" className="[&_input]:text-[16px]" />
        </Field>
        <Field label="Commentaire (facultatif)" className="sm:col-span-2">
          <Textarea value={commentaire} onChange={(e) => setCommentaire(e.target.value)} placeholder="Ex. : différentiels en stock, le reste sous 48 h." className="min-h-[80px] text-[16px] sm:text-[14px]" />
        </Field>
      </Card>

      <div className="sticky bottom-0 z-10 -mx-4 border-t border-line bg-white/95 px-4 pb-[calc(12px+var(--safe-b))] pt-3 backdrop-blur sm:static sm:mx-0 sm:rounded-[14px] sm:border sm:p-4">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[12px] text-ink-3">Total HT{lirePrix(port) ? ', port compris' : ''}</div>
            <div className="num font-display text-[22px] font-semibold leading-tight">{money(total)}</div>
          </div>
          <Button variant="dawn" size="lg" disabled={avecPrix === 0} icon={<Send className="h-[18px] w-[18px]" />} onClick={envoyer}>
            Envoyer mes prix
          </Button>
        </div>
        {sansRien > 0 && avecPrix > 0 && <p className="mt-2 text-[12px] text-ink-3">{pluriel(sansRien, 'article sans prix sera indiqué', 'articles sans prix seront indiqués')} comme non disponible{sansRien > 1 ? 's' : ''}.</p>}
      </div>

      <div className="pt-2 text-center">
        {refus === null ? (
          <button type="button" onClick={() => setRefus('')} className="h-11 text-[13.5px] font-medium text-ink-2 underline decoration-line2 underline-offset-4 hover:text-ink">
            Je ne peux pas répondre
          </button>
        ) : (
          <Card className="space-y-3 p-4 text-left">
            <div className="text-[14px] font-semibold">Pourquoi ? (facultatif)</div>
            <div className="flex flex-wrap gap-2">
              {MOTIFS.map((m) => (
                <button key={m} type="button" onClick={() => setRefus(refus === m ? '' : m)} className={cn('h-10 rounded-full border px-3.5 text-[13px] transition', refus === m ? 'border-ink bg-ink text-white' : 'border-line2 bg-white text-ink-2 hover:text-ink')}>
                  {m}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" className="h-11 flex-1 justify-center" onClick={() => setRefus(null)}>Retour</Button>
              <Button variant="primary" className="h-11 flex-1 justify-center" onClick={() => { decliner(dest.token, refus || undefined); setFini('decline'); }}>
                Prévenir {entreprise.split(' ')[0]}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
