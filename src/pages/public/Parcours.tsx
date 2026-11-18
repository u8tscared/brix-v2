// Point de départ de la démo des parcours externes (/parcours) : ce que voient le client, le fournisseur
// et le nouvel inscrit, avec les liens directs. Pour Marceau et les démonstrations commerciales.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Building2, FileSignature, HardHat, Inbox, LayoutDashboard, ReceiptText, RotateCcw, Layers3, Truck } from 'lucide-react';
import { useBrix } from '@/lib/store';
import { HaloBackdrop } from '@/components/layout/HaloBackdrop';
import { IconTile, type HaloTone } from '@/components/ui';
import { useBoite } from '@/emails/boite';
import { useAchats } from '@/modules/fournisseurs/data/store';
import { BrandLogo } from '@/parcours/marque';
import { assurerDonnees, useParcours } from '@/parcours/signature';
import '@/parcours/parcours.css';

assurerDonnees();

export default function Parcours() {
  const devis = useBrix((s) => s.devis);
  const factures = useBrix((s) => s.factures);
  const mails = useBoite((s) => s.mails.length);
  const demandes = useAchats((s) => s.demandes);
  const [, force] = useState(0);
  const aSigner = devis.find((d) => d.id === 'q_119') ?? devis.find((d) => d.status === 'envoye' || d.status === 'vu');
  const formules = devis.find((d) => d.id === 'q_118');
  const aPayer = factures.find((f) => f.id === 'f_203') ?? factures.find((f) => f.status === 'envoyee');
  const tokenFournisseur = demandes.flatMap((d) => d.destinataires).find((x) => x.token)?.token;

  const cartes = [
    { to: aSigner ? `/d/${aSigner.id}` : '/d/q_119', I: FileSignature, titre: 'Signer un devis', tone: 'violet' as HaloTone, texte: 'Ce que reçoit le client : lecture en grand, signature au doigt, code par e-mail, acompte.', qui: 'Client' },
    { to: formules ? `/d/${formules.id}` : '/d/q_118', I: Layers3, titre: 'Devis à plusieurs formules', tone: 'indigo' as HaloTone, texte: 'Essentiel, Confort, Premium : le client choisit, le prix suit.', qui: 'Client' },
    { to: aPayer ? `/f/${aPayer.id}` : '/f/f_203', I: ReceiptText, titre: 'Payer une facture', tone: 'mag' as HaloTone, texte: 'Carte, Apple Pay, virement instantané ou en 3 fois, avec reçu automatique.', qui: 'Client' },
    { to: '/p/demo', I: HardHat, titre: 'Suivre son chantier', tone: 'peach' as HaloTone, texte: 'Avancement, prochain passage, photos du soir, documents, messages.', qui: 'Client' },
    { to: tokenFournisseur ? `/portail-fournisseur/${tokenFournisseur}` : '/app/fournisseurs', I: Truck, titre: 'Répondre à une demande de prix', tone: 'green' as HaloTone, texte: 'Le comptoir répond depuis son téléphone, sans compte, en deux minutes.', qui: 'Fournisseur' },
    { to: '/boite', I: Inbox, titre: 'Les e-mails envoyés', tone: 'blue' as HaloTone, texte: `Tous les e-mails de Brix, tels qu’ils arrivent.${mails ? ` ${mails} dans la boîte.` : ''}`, qui: 'Tous' },
    { to: '/inscription', I: Building2, titre: 'S’inscrire', tone: 'amber' as HaloTone, texte: 'L’onboarding qui construit Brix pour votre métier.', qui: 'Artisan' },
    { to: '/app', I: LayoutDashboard, titre: 'L’app de l’artisan', tone: 'neutral' as HaloTone, texte: 'Pour voir arriver signatures, paiements et réponses en direct.', qui: 'Artisan' },
  ];

  const reinitialiser = () => {
    useParcours.setState({ preuves: {}, codes: {}, vus: {}, questions: [] });
    useBoite.getState().vider();
    useBrix.getState().loadDemo();
    force((n) => n + 1);
  };

  return (
    <div className="bx-root relative isolate min-h-dvh overflow-x-clip">
      <HaloBackdrop />
      <main className="relative mx-auto max-w-[1080px] px-4 pb-16 pt-8 sm:px-6 sm:pt-14">
        <BrandLogo size={30} />
        <h1 className="bx-rise mt-10 max-w-[720px] text-[38px] font-semibold leading-[1.02] tracking-[-0.05em] sm:text-[60px]">
          Tout ce qui sort de Brix,
          <br />
          <span className="text-halo-mute">vu de l’autre </span>
          <span className="dawn-text">côté.</span>
        </h1>
        <p className="bx-rise mt-4 max-w-[560px] text-[16px] leading-relaxed text-ink-2" style={{ animationDelay: '.06s' }}>
          Les pages que voient vos clients et vos fournisseurs. Astuce : ouvrez l’app dans un onglet et une page client dans un autre, puis signez ou payez : la notification arrive en direct.
        </p>
        <div className="bx-stagger mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {cartes.map((c) => (
            <Link key={c.titre} to={c.to} className="lift group relative flex min-h-[150px] sm:min-h-[188px] flex-col rounded-card bg-white p-5 shadow-halo">
              <div className="flex items-center justify-between">
                <IconTile tone={c.tone} className="transition-transform duration-300 ease-spring group-hover:scale-110" icon={<c.I strokeWidth={1.9} />} />
                <span className="chip tone-neutral h-6 text-[11.5px]">{c.qui}</span>
              </div>
              <div className="mt-auto pt-6">
                <div className="flex items-center gap-1.5 text-[16px] font-semibold tracking-[-0.02em]">
                  {c.titre}
                  <ArrowUpRight className="h-4 w-4 text-ink-3 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink" />
                </div>
                <p className="mt-1 text-[13px] leading-snug text-ink-3">{c.texte}</p>
              </div>
            </Link>
          ))}
        </div>
        <button onClick={reinitialiser} className="mt-8 inline-flex h-11 items-center gap-2 rounded-full bg-white px-4 text-[13px] font-medium text-ink-2 shadow-[0_1px_2px_rgba(60,30,120,.08),0_0_0_1px_#ece8f6] transition duration-300 ease-spring hover:-translate-y-px hover:text-ink">
          <RotateCcw className="h-4 w-4" /> Remettre la démo à zéro
        </button>
      </main>
    </div>
  );
}
