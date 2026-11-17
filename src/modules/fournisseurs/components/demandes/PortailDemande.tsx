// Portail fournisseur, demande de prix : comprendre en 3 secondes, répondre en 3 étapes, sans compte.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Archive, CheckCheck, Undo2 } from 'lucide-react';
import { dateLong } from '@/lib/format';
import { useBrix } from '@/lib/store';
import { useAchats } from '@/modules/fournisseurs/data/store';
import { emetteurArtisan } from '@/modules/fournisseurs/data/evenements';
import type { Demande, Destinataire } from '@/modules/fournisseurs/data/types';
import { pluriel } from '@/modules/fournisseurs/components/demandes/commun';
import { Acquisition, Artisan, Bloc, FaitsDemande, Mot, Progression } from '@/modules/fournisseurs/components/portail/commun';
import LigneSaisie from '@/modules/fournisseurs/components/portail/LigneSaisie';
import EtapeConditions from '@/modules/fournisseurs/components/portail/EtapeConditions';
import EtapeVerifier from '@/modules/fournisseurs/components/portail/EtapeVerifier';
import { Decliner, Message, OffreEnvoyee } from '@/modules/fournisseurs/components/portail/Fin';
import { ResumeBarre, ResumeColonne, type ActionResume } from '@/modules/fournisseurs/components/portail/Resume';
import {
  conditionsVides, depuisReponse, ecrireBrouillon, effacerBrouillon, ligneFaite, ligneVide, lireBrouillon, totaux, versReponse,
  type Conditions, type SaisieLigne,
} from '@/modules/fournisseurs/components/portail/saisie';

const LIBELLES = ['Vos prix', 'Conditions', 'Envoi'];

export default function PortailDemande({ d, dest }: { d: Demande; dest: Destinataire }) {
  const { repondre, decliner, marquerVu } = useAchats();
  const chantier = useBrix((s) => s.chantiers.find((c) => c.id === d.chantierId)?.name);
  const e = useMemo(emetteurArtisan, []);
  const prenom = e.prenom || e.entreprise;

  const [mode, setMode] = useState<'saisie' | 'envoyee' | 'declinee'>(dest.statut === 'repondue' ? 'envoyee' : dest.statut === 'declinee' ? 'declinee' : 'saisie');
  const [juste, setJuste] = useState(false); // vient d'envoyer (animation complète) ou revient sur une offre déjà envoyée
  const [etape, setEtape] = useState(1);
  const [lignes, setLignes] = useState<Record<string, SaisieLigne>>({});
  const [cond, setCond] = useState<Conditions>(conditionsVides);
  const [enregistreA, setEnregistreA] = useState<number | null>(null);
  const touche = useRef(false);
  const haut = useRef<HTMLDivElement>(null);

  useEffect(() => marquerVu(dest.token), [dest.token, marquerVu]);
  useEffect(() => {
    const b = lireBrouillon(dest.token);
    if (b && dest.statut !== 'repondue') {
      setLignes(b.lignes);
      setCond(b.conditions);
      setEtape(Math.min(3, Math.max(1, b.etape)));
      setEnregistreA(b.at);
    } else setLignes(Object.fromEntries(d.lignes.map((l) => [l.id, ligneVide()])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dest.id]);

  // Sauvegarde automatique du brouillon, 700 ms après la dernière frappe.
  useEffect(() => {
    if (!touche.current || mode !== 'saisie') return;
    const t = setTimeout(() => {
      const at = Date.now();
      ecrireBrouillon(dest.token, { lignes, conditions: cond, etape, at });
      setEnregistreA(at);
    }, 700);
    return () => clearTimeout(t);
  }, [lignes, cond, etape, dest.token, mode]);

  const majLigne = useCallback((id: string, p: Partial<SaisieLigne>) => {
    touche.current = true;
    setLignes((s) => ({ ...s, [id]: { ...(s[id] ?? ligneVide()), ...p } }));
  }, []);
  const majCond = (p: Partial<Conditions>) => {
    touche.current = true;
    setCond((c) => ({ ...c, ...p }));
  };

  const t = totaux(d, lignes, cond);
  const nb = d.lignes.length;
  const aller = (n: number) => {
    touche.current = true;
    setEtape(n);
    requestAnimationFrame(() => haut.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const envoyer = () => {
    repondre(dest.token, versReponse(d, lignes, cond));
    effacerBrouillon(dest.token);
    touche.current = false;
    setJuste(true);
    setMode('envoyee');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const corriger = () => {
    const r = depuisReponse(d, dest);
    setLignes(r.lignes);
    setCond(r.conditions);
    setEtape(1);
    setMode('saisie');
    window.scrollTo({ top: 0 });
  };

  if (d.statut === 'annulee') return <Message icon={<Undo2 />} titre="Cette demande est annulée" texte={`${e.entreprise} a annulé sa demande. Vous n’avez rien à faire.`} />;
  if (d.statut === 'commandee' && mode !== 'envoyee') return <Message icon={<Archive />} titre="Cette demande est close" texte={`${e.entreprise} a déjà passé commande pour cette liste. Merci pour votre temps.`} />;
  if (mode === 'declinee') return <Message icon={<CheckCheck />} titre="C’est noté, merci" texte={`${e.entreprise} sait que vous ne pouvez pas répondre à cette demande. Il ne vous attendra pas.`} />;
  if (mode === 'envoyee') {
    const tt = juste ? t : null;
    const chiffrees = tt ? tt.chiffrees : dest.prix.filter((p) => p.prix != null).length;
    const total = tt ? tt.total : dest.prix.reduce((s, p) => s + (p.prix ?? 0) * (d.lignes.find((l) => l.id === p.ligneId)?.quantite ?? 0), 0) + (dest.port ?? 0);
    return (
      <div className="space-y-6">
        <OffreEnvoyee artisan={e.entreprise} prenom={prenom} total={total} chiffrees={chiffrees} nb={nb} delai={juste ? (cond.delai === '' ? undefined : Number(cond.delai)) : dest.delaiJours} envoyeeLe={dest.reponduLe} deja={!juste} onCorriger={d.statut === 'commandee' ? () => undefined : corriger} />
        <Acquisition className="mx-auto max-w-[560px]" />
      </div>
    );
  }

  const action: ActionResume =
    etape === 1
      ? { libelle: 'Continuer', envoi: false, disabled: t.chiffrees === 0, onClick: () => aller(2) }
      : etape === 2
        ? { libelle: 'Vérifier', envoi: false, onClick: () => aller(3) }
        : { libelle: 'Envoyer mes prix', envoi: true, disabled: t.chiffrees === 0, onClick: envoyer };
  const restantes = nb - d.lignes.filter((l) => ligneFaite(lignes[l.id])).length;

  return (
    <div className="pb-36 lg:pb-0">
      {/* Qui demande, quoi, pour quand */}
      <Bloc className="bx-rise relative overflow-hidden">
        <div className="fx-grain pointer-events-none absolute inset-0 opacity-60" aria-hidden />
        <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10">
          <div className="min-w-0 space-y-5">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-[#9898a8]">
                <span className="inline-flex h-6 items-center rounded-full bg-[#130f26] px-2.5 text-[11.5px] font-semibold text-white">Demande de prix</span>
                <span className="bx-mono">{d.numero}</span>
              </div>
              <h1 className="mt-3 text-[26px] font-semibold leading-[1.1] tracking-[-0.035em] sm:text-[32px]">
                {pluriel(nb, 'article')} à chiffrer
                <span className="block text-[#9898a8]">pour {e.entreprise}</span>
              </h1>
              <p className="mt-2 text-[14px] text-[#5f5f70]">{d.titre}</p>
            </div>
            <Artisan e={e} chantier={chantier} />
            {d.message && <Mot texte={d.message} auteur={`${prenom}, ${dateLong(d.createdAt.slice(0, 10))}`} />}
          </div>
          <FaitsDemande dateLimite={d.dateLimite} livraison={d.livraisonSouhaitee} adresse={d.adresse} className="border-t border-[#ececf1] pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-1" />
        </div>
      </Bloc>

      <div className="mt-5 grid gap-6 lg:mt-7 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div ref={haut} className="min-w-0 scroll-mt-20 space-y-4">
          <Progression etape={etape} libelles={LIBELLES} avancement={etape === 1 ? t.faites / Math.max(1, nb) : etape === 2 ? 0.5 : 0.9} onAller={aller} />

          {etape === 1 && (
            <>
              <Bloc key="e1" className="bx-rise overflow-hidden">
                <div className="flex items-end justify-between gap-3 border-b border-[#ececf1] px-4 py-4 sm:px-5">
                  <div>
                    <h2 className="text-[17px] font-semibold tracking-[-0.02em]">Vos prix nets</h2>
                    <p className="mt-0.5 text-[12.5px] text-[#9898a8]">Prix unitaire HT. La virgule marche, « Entrée » passe à la ligne suivante.</p>
                  </div>
                </div>
                <ul className="divide-y divide-[#ececf1]">
                  {d.lignes.map((l, i) => <LigneSaisie key={l.id} l={l} index={i} v={lignes[l.id] ?? ligneVide()} onChange={majLigne} />)}
                </ul>
              </Bloc>
              {restantes > 0 && t.chiffrees > 0 && (
                <p className="bx-fade px-1 text-center text-[12.5px] text-[#9898a8]">{pluriel(restantes, 'article sans prix sera indiqué', 'articles sans prix seront indiqués')} « pas dispo ».</p>
              )}
              <Decliner prenom={prenom} onDecliner={(m) => { decliner(dest.token, m); effacerBrouillon(dest.token); setMode('declinee'); window.scrollTo({ top: 0 }); }} />
            </>
          )}
          {etape === 2 && <div key="e2" className="bx-rise"><EtapeConditions c={cond} onChange={majCond} souhaitee={d.livraisonSouhaitee ? dateLong(d.livraisonSouhaitee) : undefined} /></div>}
          {etape === 3 && <div key="e3" className="bx-rise"><EtapeVerifier d={d} lignes={lignes} c={cond} remise={t.remise} onModifier={aller} /></div>}
        </div>

        <aside className="hidden space-y-4 lg:sticky lg:top-20 lg:block">
          <ResumeColonne t={t} nb={nb} action={action} enregistreA={enregistreA} artisan={e.entreprise} />
          <Acquisition />
        </aside>
      </div>

      <Acquisition className="mt-8 lg:hidden" />
      <ResumeBarre t={t} nb={nb} action={action} enregistreA={enregistreA} />
    </div>
  );
}
