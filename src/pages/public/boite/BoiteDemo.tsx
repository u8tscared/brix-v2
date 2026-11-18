// Boîte de réception de démonstration (/#/boite) : chaque e-mail « envoyé » par l'app arrive ici,
// rendu exactement comme le destinataire le verra. Onglet « Tous les modèles » : la galerie complète.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HaloBackdrop } from '@/components/layout/HaloBackdrop';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Inbox, Info, LayoutGrid, Mail, Trash2, X } from 'lucide-react';
import '@/parcours/parcours.css';
import './boite.css';
import { useBoite, type EmailEnvoye } from '@/emails/boite';
import { exemples, ORDRE_MODELES } from '@/emails/exemples';
import type { ModeleEmail } from '@/emails';
import { baseApp } from '@/parcours/liens';
import { BrandLogo } from '@/parcours/marque';
import { EtatVide } from './EtatVide';
import { Galerie, useModelesRendus } from './Galerie';
import { Lecteur, type Message } from './Lecteur';
import { Filtres, FiltreVide, ListeMails } from './ListeMails';
import { dateComplete, destinataire, expediteur, PUBLICS, renduMail, type Filtre } from './outils';

const CLE = 'brix-v2-boite';

function useEstMobile() {
  const q = '(max-width: 767px)';
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const f = () => setM(mq.matches);
    mq.addEventListener('change', f);
    return () => mq.removeEventListener('change', f);
  }, []);
  return m;
}

/** Repère les e-mails arrivés depuis l'ouverture (autre onglet ou envoi dans l'app). */
function useNouveaux(mails: EmailEnvoye[]) {
  const connus = useRef<Set<string> | null>(null);
  const [nouveaux, setNouveaux] = useState<Set<string>>(new Set());
  const [dernier, setDernier] = useState<EmailEnvoye | null>(null);
  const minuteurs = useRef<number[]>([]);
  useEffect(() => () => minuteurs.current.forEach((t) => window.clearTimeout(t)), []);
  useEffect(() => {
    if (!connus.current) {
      connus.current = new Set(mails.map((m) => m.id));
      return;
    }
    const arrives = mails.filter((m) => !connus.current!.has(m.id));
    if (!arrives.length) return;
    arrives.forEach((m) => connus.current!.add(m.id));
    const ids = new Set(arrives.map((m) => m.id));
    setNouveaux((s) => new Set([...s, ...ids]));
    // Un vrai « nouvel e-mail » (1 à 3 d'un coup) : on l'annonce. Un lot d'exemples : seulement l'animation.
    if (arrives.length <= 3) setDernier(arrives[0]);
    minuteurs.current.push(
      window.setTimeout(() => setNouveaux((s) => new Set([...s].filter((x) => !ids.has(x)))), 2600),
      window.setTimeout(() => setDernier((d) => (d && ids.has(d.id) ? null : d)), 4500),
    );
  }, [mails]);
  return { nouveaux, dernier, fermer: () => setDernier(null) };
}

function versMessage(m: EmailEnvoye): Message | null {
  const r = renduMail(m);
  if (!r) return null;
  return { cle: m.id, rendu: r, modele: m.modele, pour: m.pour, de: expediteur(m.de, m.donnees), aNom: destinataire(m), aEmail: m.a, date: dateComplete(m.at) };
}

function Onglets({ onglet, nb }: { onglet: 'recus' | 'modeles'; nb: number }) {
  const items = [
    { id: 'recus', to: '/boite', libelle: 'Reçus', icone: Inbox, nb },
    { id: 'modeles', to: '/boite/modeles', libelle: 'Tous les modèles', icone: LayoutGrid, nb: ORDRE_MODELES.length },
  ] as const;
  return (
    <nav aria-label="Vues" className="relative inline-grid grid-cols-2 rounded-full bg-halo-track p-1 max-md:w-full">
      <span className="boite-onglet-curseur absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-white shadow-pill" style={{ transform: onglet === 'modeles' ? 'translateX(100%)' : 'none' }} aria-hidden />
      {items.map((i) => (
        <Link key={i.id} to={i.to} aria-current={onglet === i.id ? 'page' : undefined} className={`relative z-[1] inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap px-3.5 text-[13px] font-medium transition-colors max-md:h-11 ${onglet === i.id ? 'text-[#130f26]' : 'text-ink-3 hover:text-ink-2'}`}>
          <i.icone size={15} strokeWidth={1.75} />
          {i.libelle}
          <span className="tabular-nums text-[12px] text-ink-3">{i.nb}</span>
        </Link>
      ))}
    </nav>
  );
}

function BoutonVider({ onVider }: { onVider: () => void }) {
  const [arme, setArme] = useState(false);
  useEffect(() => {
    if (!arme) return;
    const t = window.setTimeout(() => setArme(false), 3000);
    return () => window.clearTimeout(t);
  }, [arme]);
  return (
    <button
      type="button"
      onClick={() => (arme ? (onVider(), setArme(false)) : setArme(true))}
      className={`inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition-all duration-200 ${arme ? 'bg-bad-bg text-bad' : 'text-ink-3 hover:bg-white hover:text-ink'}`}
    >
      <Trash2 size={16} strokeWidth={1.75} />
      <span className={arme ? '' : 'max-lg:sr-only'}>{arme ? 'Confirmer' : 'Vider'}</span>
    </button>
  );
}

export default function BoiteDemo() {
  const { id } = useParams();
  const navigate = useNavigate();
  const mobile = useEstMobile();
  const mails = useBoite((s) => s.mails);
  const lire = useBoite((s) => s.lire);
  const vider = useBoite((s) => s.vider);
  const onglet: 'recus' | 'modeles' = id === 'modeles' ? 'modeles' : 'recus';
  const [filtre, setFiltre] = useState<Filtre>('tous');
  const [modeleOuvert, setModeleOuvert] = useState<ModeleEmail | null>(null);
  const [maintenant, setMaintenant] = useState(() => Date.now());
  const { nouveaux, dernier, fermer } = useNouveaux(mails);
  const modeles = useModelesRendus();

  // Synchronisation entre onglets : l'app (autre onglet) écrit dans localStorage, on relit.
  useEffect(() => {
    const f = (e: StorageEvent) => {
      if (e.key === CLE || e.key === null) void useBoite.persist.rehydrate();
    };
    window.addEventListener('storage', f);
    const t = window.setInterval(() => setMaintenant(Date.now()), 30000);
    return () => {
      window.removeEventListener('storage', f);
      window.clearInterval(t);
    };
  }, []);

  useEffect(() => {
    document.title = onglet === 'modeles' ? 'Modèles d’e-mails · Brix' : 'Boîte de démo · Brix';
  }, [onglet]);

  const compte = useMemo(() => {
    const c = { tous: 0, client: 0, artisan: 0, fournisseur: 0 } as Record<Filtre, number>;
    const src = onglet === 'modeles' ? modeles : mails;
    for (const m of src) {
      c.tous++;
      c[m.pour]++;
    }
    return c;
  }, [mails, modeles, onglet]);

  const visibles = useMemo(() => (filtre === 'tous' ? mails : mails.filter((m) => m.pour === filtre)), [mails, filtre]);
  const choisi = onglet === 'recus' ? (id ? mails.find((m) => m.id === id) : mobile ? undefined : visibles[0]) : undefined;
  const msg = useMemo(() => (choisi ? versMessage(choisi) : null), [choisi]);

  useEffect(() => {
    if (choisi && !choisi.lu) {
      const t = window.setTimeout(() => lire(choisi.id), id ? 0 : 900);
      return () => window.clearTimeout(t);
    }
  }, [choisi, id, lire]);

  const ouvrir = useCallback((mid: string) => navigate(`/boite/${mid}`), [navigate]);

  const chargerExemples = useCallback(() => {
    const ex = exemples(baseApp());
    const { ajouter } = useBoite.getState();
    [...ORDRE_MODELES].reverse().forEach((m) => {
      const e = ex[m];
      ajouter({ modele: m, donnees: e.donnees, de: e.de, a: e.a, pour: e.pour });
    });
  }, []);

  const msgModele = useMemo<Message | null>(() => {
    const r = modeles.find((x) => x.modele === modeleOuvert);
    if (!r) return null;
    return { cle: `modele-${r.modele}`, rendu: r.rendu, modele: r.modele, pour: r.pour, de: expediteur(r.de, r.donnees), aNom: destinataire(r), aEmail: r.a };
  }, [modeles, modeleOuvert]);

  useEffect(() => {
    if (!modeleOuvert) return;
    const f = (e: KeyboardEvent) => e.key === 'Escape' && setModeleOuvert(null);
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [modeleOuvert]);

  const libelleFiltre = PUBLICS.find((p) => p.id === filtre)?.libelle ?? '';
  const vide = <EtatVide onExemples={chargerExemples} onModeles={() => navigate('/boite/modeles')} compact={!mobile} />;
  const lectureMobile = mobile && onglet === 'recus' && !!msg;

  return (
    <div className="bx-root boite relative isolate flex h-dvh flex-col text-ink">
      <HaloBackdrop />
      {!lectureMobile && (
        <header className="glass-strong relative z-20 shrink-0">
          <div className="flex items-center gap-3 px-4 py-3 md:px-6">
            <Link to="/app" className="-ml-1 inline-flex h-10 items-center rounded-xl px-1" aria-label="Retour à l'app Brix">
              <BrandLogo size={26} />
            </Link>
            <span className="hidden h-5 w-px bg-halo-line md:block" />
            <span className="hidden text-[14px] font-medium text-ink-2 md:block">Boîte de démo</span>
            <div className="flex-1" />
            <div className="max-md:hidden">
              <Onglets onglet={onglet} nb={mails.length} />
            </div>
            <div className="flex-1 max-md:hidden" />
            {mails.length > 0 && <BoutonVider onVider={() => (vider(), navigate('/boite'))} />}
            <Link to="/app" className="inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium text-ink-2 transition hover:bg-white hover:text-ink hover:shadow-[0_0_0_1px_#ece8f6] max-md:hidden">
              <ArrowLeft size={16} strokeWidth={1.75} /> Retour à l'app
            </Link>
          </div>
          <div className="px-4 pb-3 md:hidden">
            <Onglets onglet={onglet} nb={mails.length} />
          </div>
          <div className="flex items-center gap-2 border-t border-halo-line px-4 py-2 text-[12.5px] text-ink-2 md:px-6">
            <Info size={14} strokeWidth={1.75} className="shrink-0 text-ink-3" />
            <span>
              <strong className="font-medium text-ink">Boîte de démonstration</strong> : aucun e-mail réel n'est envoyé.
              <span className="max-sm:hidden"> Les liens ouvrent les vraies pages client et fournisseur.</span>
            </span>
          </div>
        </header>
      )}

      {onglet === 'modeles' ? (
        <main className="boite-defile flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1360px] px-4 py-6 md:px-8 md:py-10">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-[26px] font-semibold tracking-[-0.03em] md:text-[32px]">Tous les e-mails de Brix</h1>
                <p className="mt-1.5 max-w-[560px] text-[14.5px] text-ink-2">Chaque modèle, rendu avec les données d'exemple de Benali Électricité. Ouvrez-en un pour le voir sur ordinateur, sur téléphone ou en mode sombre.</p>
              </div>
              <Filtres filtre={filtre} onFiltre={setFiltre} compte={compte} />
            </div>
            <Galerie modeles={modeles} filtre={filtre} onOuvrir={setModeleOuvert} />
          </div>
        </main>
      ) : mails.length === 0 ? (
        <main className="boite-defile flex-1 overflow-y-auto">{vide}</main>
      ) : (
        <main className="flex min-h-0 flex-1">
          {!lectureMobile && (
            <aside className="boite-defile flex w-full shrink-0 flex-col overflow-y-auto border-halo-line md:w-[360px] md:border-r lg:w-[400px]" aria-label="Liste des e-mails">
              {mails.length > 0 && (
                <div className="glass sticky top-0 z-[5] rounded-b-[18px] px-3 pb-2 pt-3 md:px-4">
                  <Filtres filtre={filtre} onFiltre={setFiltre} compte={compte} />
                </div>
              )}
              <div className="px-2 pb-8 md:px-3">
                <ListeMails mails={visibles} actif={choisi?.id ?? null} nouveaux={nouveaux} onOuvrir={ouvrir} maintenant={maintenant} vide={mails.length ? <FiltreVide libelle={libelleFiltre} /> : vide} />
              </div>
            </aside>
          )}
          {(!mobile || lectureMobile) && (
            <section className={`boite-defile min-w-0 flex-1 overflow-y-auto bg-white/40 ${lectureMobile ? 'boite-glisse' : ''}`} aria-label="Lecture">
              {msg ? (
                <Lecteur msg={msg} telephoneSeul={mobile} onRetour={mobile ? () => navigate('/boite') : undefined} />
              ) : (
                <div className="grid h-full place-items-center p-8 text-center">
                  <div className="flex flex-col items-center gap-3 text-ink-3">
                    <Mail size={28} strokeWidth={1.5} />
                    <p className="text-[14px]">{mails.length ? 'Choisissez un e-mail à gauche.' : 'Les e-mails envoyés depuis l’app s’afficheront ici.'}</p>
                  </div>
                </div>
              )}
            </section>
          )}
        </main>
      )}

      {msgModele && (
        <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true" aria-label={msgModele.rendu.sujet}>
          <button type="button" className="boite-voile absolute inset-0 bg-[#1b1240]/20 backdrop-blur-[4px]" aria-label="Fermer" onClick={() => setModeleOuvert(null)} />
          <div className="boite-panneau boite-defile relative h-full w-full overflow-y-auto bg-[#f3f0fa] shadow-pop md:my-3 md:mr-3 md:h-[calc(100%-24px)] md:w-[min(880px,92vw)] md:rounded-sheet">
            <button type="button" onClick={() => setModeleOuvert(null)} aria-label="Fermer l'aperçu" className="absolute right-4 top-4 z-20 hidden h-10 w-10 place-items-center rounded-full text-ink-3 transition hover:bg-white hover:text-ink md:grid">
              <X size={18} strokeWidth={1.75} />
            </button>
            <Lecteur msg={msgModele} telephoneSeul={mobile} onRetour={() => setModeleOuvert(null)} />
          </div>
        </div>
      )}

      {dernier && onglet === 'recus' && !lectureMobile && (
        <button type="button" onClick={() => (ouvrir(dernier.id), fermer())} className="boite-toast fixed bottom-5 z-30 flex max-w-[calc(100vw-32px)] items-center gap-3 rounded-full bg-ink py-2.5 pl-3 pr-5 text-left text-white shadow-pop md:max-w-[360px] lg:max-w-[380px]" style={{ marginBottom: 'var(--safe-b)' }}>
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/10">
            <Mail size={16} strokeWidth={1.75} />
          </span>
          <span className="min-w-0">
            <span className="block text-[12px] text-white/60">Nouvel e-mail</span>
            <span className="block truncate text-[13.5px] font-medium">{renduMail(dernier)?.sujet}</span>
          </span>
        </button>
      )}
    </div>
  );
}
