// Page publique du devis (/d/:jeton) : ce que le client ouvre depuis l'e-mail ou le SMS.
// Lire (en clair et en PDF plein écran), choisir sa formule, poser une question, signer, régler l'acompte.
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FileText, Link2Off, PenLine, XCircle } from 'lucide-react';
import { Card, IconTile, toast, Toaster } from '@/components/ui';
import { HaloBackdrop } from '@/components/layout/HaloBackdrop';
import { dateFull, money, totals } from '@/lib/format';
import { useBrix } from '@/lib/store';
import { useBoite } from '@/emails/boite';
import { PdfDoc } from '@/modules/devis/components/PdfDoc';
import { useDevisMeta } from '@/modules/devis/store';
import { useNotifs } from '@/modules/notifications/store';
import { civilite, FORMULES, useDevisPublic, type Formule } from '@/parcours/documents';
import { assurerDonnees, marquerOuvert, payerAcompte, poserQuestion, refuser, useParcours, type MoyenPaiement } from '@/parcours/signature';
import { useSyncOnglets } from '@/parcours/sync';
import '@/parcours/parcours.css';
import { EnTete } from '../ui/EnTete';
import { useImpression, ZoneImpression } from '../ui/Impression';
import { Paiement } from '../ui/Paiement';
import { PiedDePage } from '../ui/PiedDePage';
import { BoutonAube } from '../ui/primitives';
import { ApercuPapier, PleinEcran } from '../ui/Visionneuse';
import { Contenu } from './parts/Contenu';
import { Question, Refus } from './parts/Echanges';
import { CarteArtisan, Ensuite } from './parts/Ensuite';
import { EtatSigne } from './parts/EtatSigne';
import { Recap } from './parts/Recap';
import { Succes } from './parts/Succes';
import { SignatureFlow } from './signature/SignatureFlow';

// Preview vierge : la page publique charge la démo pour rester consultable.
assurerDonnees();

export default function DevisPublic() {
  const { token = '' } = useParams();
  useSyncOnglets([useBrix, useDevisMeta, useParcours, useNotifs, useBoite]);
  const data = useDevisPublic(token);
  const preuve = useParcours((s) => (data ? s.preuves[data.devis.id] : undefined));
  const factures = useBrix((s) => s.factures);
  const meta = useDevisMeta((s) => (data ? s.meta[data.devis.id] : undefined));
  const [formule, setFormule] = useState<Formule>(FORMULES[1]);
  const [plein, setPlein] = useState(false);
  const [signer, setSigner] = useState(false);
  const [payer, setPayer] = useState(false);
  const [question, setQuestion] = useState(false);
  const [refus, setRefus] = useState(false);
  const [fete, setFete] = useState(false);
  const [moyen, setMoyen] = useState<MoyenPaiement | undefined>();
  const contenuRef = useRef<HTMLElement>(null);
  const { imprimer } = useImpression();
  const [ctaVisible, setCtaVisible] = useState(true);
  const recapRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = recapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setCtaVisible(e.isIntersecting), { rootMargin: '0px 0px -40px 0px' });
    io.observe(el);
    return () => io.disconnect();
  });

  useEffect(() => {
    if (data) marquerOuvert(data.devis.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.devis.id]);
  useEffect(() => {
    if (data && !data.formules.some((f) => f.key === formule.key)) setFormule(data.formules.find((f) => f.key === 'confort') ?? data.formules[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.formules.length]);

  if (!data) return <Introuvable />;
  const { devis, client, company, user } = data;
  const signe = devis.status === 'signe';
  const refuse = devis.status === 'refuse';
  const facteur = signe ? 1 : formule.facteur;
  const ttc = signe ? totals(devis.lines).ttc : data.ttc * facteur;
  const acompteFacture = factures.find((f) => f.devisId === devis.id && f.kind === 'acompte' && f.status !== 'annulee');
  const acompte = acompteFacture ? totals(acompteFacture.lines).ttc : (ttc * devis.depositPercent) / 100;
  const acomptePaye = acompteFacture?.status === 'payee';
  const prenom = civilite(client);
  const formuleSignee = meta?.chosenVariant ? FORMULES.find((f) => f.key === meta.chosenVariant) : undefined;
  const etape = !signe ? 0 : devis.depositPercent && !acomptePaye ? 1 : devis.depositPercent ? 2 : 1;
  const mot = devis.notes?.trim() || `Suite à notre passage, voici le devis « ${devis.title} ». Tout est détaillé poste par poste ; n’hésitez pas si vous avez une question.`;

  const papier = <PdfDoc d={devis} client={client} company={company} signer={signe ? preuve?.signataire ?? client?.name : undefined} />;

  return (
    <div className="bx-root relative isolate min-h-dvh overflow-x-clip">
      <HaloBackdrop />
      <EnTete company={company} sous={`Devis ${devis.number}`} onPdf={imprimer} />

      <main className="mx-auto max-w-[1160px] px-4 sm:px-6">
        {/* Accueil */}
        <section className="relative pb-6 pt-8 sm:pt-12">
          <div className="relative bx-stagger max-w-[680px]">
            <div className="glass inline-flex h-8 items-center gap-2 rounded-full px-3.5 text-[12.5px] font-medium text-ink-2">
              {signe ? <span className="h-2 w-2 rounded-full bg-[#16a34a]" /> : refuse ? <span className="h-2 w-2 rounded-full bg-ink-3" /> : <span className="bx-live h-2 w-2 rounded-full bg-[#16a34a]" />}
              {signe ? `Signé le ${dateFull(devis.signedAt!.slice(0, 10))}` : refuse ? 'Devis décliné' : data.expireDans > 0 ? `En attente de votre signature · encore ${data.expireDans} jour${data.expireDans > 1 ? 's' : ''}` : 'Devis expiré'}
            </div>
            <h1 className="title-halo mt-5 sm:text-[48px]">
              {signe ? 'Votre projet est lancé.' : `Bonjour ${prenom},`}
              <br />
              <span className="text-halo-mute">{signe ? devis.title : `voici votre devis.`}</span>
            </h1>
            {!signe && (
              <div className="mt-5 flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-pale-v text-[12px] font-semibold text-deep-v">{`${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`}</span>
                <div className="rounded-[20px] rounded-tl-md bg-white px-4 py-3 text-[14.5px] leading-relaxed text-ink-2 shadow-halo">
                  {mot}
                  <div className="mt-1.5 text-[12.5px] font-medium text-ink-3">
                    {user.firstName} {user.lastName}, {company.name}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <div className="grid gap-6 pb-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-10">
          {/* Colonne décision (en premier sur téléphone) */}
          <aside ref={recapRef} className="lg:order-2">
            <div className="space-y-4 [@media(min-width:1024px)_and_(min-height:1060px)]:sticky [@media(min-width:1024px)_and_(min-height:1060px)]:top-[92px]">
              {signe ? (
                <EtatSigne preuve={preuve} signataire={preuve?.signataire ?? client?.name ?? ''} signeLe={devis.signedAt!} acompte={devis.depositPercent ? acompte : 0} acomptePaye={acomptePaye} onPayer={() => setPayer(true)} onPdf={imprimer} />
              ) : refuse ? (
                <Card className="p-6 text-center">
                  <IconTile size="lg" tone="neutral" className="mx-auto" icon={<XCircle strokeWidth={1.75} />} />
                  <div className="mt-3 text-[18px] font-semibold">Vous avez décliné ce devis</div>
                  <p className="mt-1 text-[13.5px] text-ink-2">{user.firstName} a été prévenu. Un changement d’avis ? Appelez-le au {company.phone}.</p>
                </Card>
              ) : (
                <Recap data={data} formule={formule} onFormule={setFormule} onSigner={() => setSigner(true)} onQuestion={() => setQuestion(true)} onRefuser={() => setRefus(true)} onDetail={() => contenuRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} />
              )}
              <div className="hidden lg:block">
                <CarteArtisan company={company} user={user} />
              </div>
            </div>
          </aside>

          {/* Colonne lecture */}
          <div className="min-w-0 space-y-8 lg:order-1">
            <section>
              <TitreSection titre="Le devis" sous={`${devis.number} · ${formuleSignee && formuleSignee.key !== 'confort' ? `formule ${formuleSignee.label} · ` : ''}${money(ttc)} TTC`} />
              <ApercuPapier onOuvrir={() => setPlein(true)} hauteurMax={520}>
                {papier}
              </ApercuPapier>
            </section>
            <section ref={contenuRef} className="scroll-mt-24">
              <TitreSection titre="En clair, poste par poste" sous={facteur !== 1 ? `Prix de la formule ${formule.label}` : 'Prix hors taxes'} />
              <Contenu devis={devis} facteur={facteur} />
            </section>
            <section>
              <TitreSection titre={signe ? 'La suite' : 'Après votre signature'} />
              <Card className="p-5 sm:p-6">
                <Ensuite acompte={devis.depositPercent} etape={etape} />
              </Card>
            </section>
            <div className="lg:hidden">
              <CarteArtisan company={company} user={user} />
            </div>
          </div>
        </div>
      </main>

      <PiedDePage company={company} />

      {/* Barre d'action collée en bas (téléphone) */}
      {!signe && !refuse && data.expireDans > 0 && (
        <div className={`fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(10px+var(--safe-b))] transition-[transform,opacity] duration-500 ease-spring lg:hidden [.kb-open_&]:hidden ${ctaVisible ? 'pointer-events-none translate-y-[130%] opacity-0' : 'translate-y-0 opacity-100'}`} aria-hidden={ctaVisible}>
          <div className="glass-strong mx-auto flex max-w-[560px] items-center gap-3 rounded-[24px] py-2 pl-5 pr-2">
            <div className="min-w-0 flex-1">
              <div className="text-[11.5px] text-ink-3">Total TTC</div>
              <div className="num-halo truncate text-[20px]">{money(ttc)}</div>
            </div>
            <BoutonAube tabIndex={ctaVisible ? -1 : 0} className="h-[48px] px-6" onClick={() => setSigner(true)} icone={<PenLine className="h-[18px] w-[18px]" strokeWidth={1.75} />}>
              Signer
            </BoutonAube>
          </div>
        </div>
      )}

      <PleinEcran open={plein} onClose={() => setPlein(false)} titre={`Devis ${devis.number}`} onImprimer={imprimer}>
        {papier}
      </PleinEcran>
      <SignatureFlow
        open={signer}
        onClose={() => setSigner(false)}
        data={data}
        formule={formule}
        onSigne={() => {
          setSigner(false);
          setFete(true);
          window.scrollTo({ top: 0 });
        }}
      />
      <Paiement
        open={payer}
        onClose={() => setPayer(false)}
        moyenInitial={moyen}
        montant={acompte}
        titre={`Acompte ${devis.depositPercent} % · ${devis.number}`}
        beneficiaire={company.name}
        onPayer={(m) => payerAcompte(devis.id, m)}
        apres={<p className="rounded-card-sm bg-halo-hover px-4 py-3 text-[13px] leading-relaxed text-ink-2">{user.firstName} vous propose une date de démarrage sous 48 heures. Vous suivrez le chantier depuis ce même lien.</p>}
      />
      <Question open={question} onClose={() => setQuestion(false)} prenom={user.firstName} onEnvoyer={(t) => poserQuestion(devis.id, t)} />
      <Refus open={refus} onClose={() => setRefus(false)} onRefuser={(m) => refuser(devis.id, m)} />
      <Succes
        open={fete}
        prenom={(preuve?.signataire ?? prenom).split(' ')[0]}
        artisan={user.firstName}
        acompte={devis.depositPercent && !acomptePaye ? acompte : 0}
        onFermer={() => {
          setFete(false);
          toast('Devis signé. Une copie part dans votre boîte e-mail.');
        }}
        onPayer={(m) => {
          setMoyen(m);
          setFete(false);
          setPayer(true);
        }}
      />
      <ZoneImpression>{papier}</ZoneImpression>
      <Toaster />
    </div>
  );
}

function TitreSection({ titre, sous }: { titre: string; sous?: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3 px-1">
      <h2 className="text-[19px] font-semibold tracking-[-0.03em]">{titre}</h2>
      {sous && <span className="truncate text-[12.5px] text-ink-3">{sous}</span>}
    </div>
  );
}

function Introuvable() {
  return (
    <div className="bx-root relative isolate grid min-h-dvh place-items-center px-6 text-center">
      <HaloBackdrop />
      <div className="bx-rise max-w-[380px]">
        <IconTile size="xl" tone="neutral" className="mx-auto" icon={<Link2Off strokeWidth={1.75} />} />
        <h1 className="mt-5 text-[26px] font-semibold tracking-[-0.04em]">Ce lien n’est plus valable</h1>
        <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">Le devis a peut-être été remplacé par une version plus récente. Demandez à votre artisan de vous renvoyer le lien.</p>
        <FileText className="mx-auto mt-8 h-5 w-5 text-ink-3" strokeWidth={1.5} />
      </div>
    </div>
  );
}
