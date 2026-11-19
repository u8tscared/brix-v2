// « Connecter une IA » (Brix AI) : une adresse unique à coller dans Claude, ChatGPT, Le Chat…,
// puis « Autoriser » dans Brix. Aucun secret à copier. Jetons personnels rangés dans « Avancé ».
// Avec un compte cloud, tout est réel (worker/src/modules/mcp) ; en démo, l'écran est simulé.
import { useState } from 'react';
import { Check, Copy, Eye, FilePen, ShieldCheck } from 'lucide-react';
import { Badge, Button, Card, IconTile, Switch, cn } from '@/components/ui';
import { AccesListe, Journal } from './AccesListe';
import { Assistants } from './Assistants';
import { ACTIONS, LECTURES } from './contenu';
import { Avance } from './Avance';
import { urlServeur } from './api';
import { copier } from './copier';
import { useBrixAi } from './useBrixAi';

const QUESTIONS = ['Qui me doit de l’argent ?', 'Prépare un devis pour Mme Martin : 6 prises et un radiateur', 'Combien j’ai signé ce mois-ci ?', 'Qu’est-ce que j’ai au planning demain ?', 'Quels prix de matériaux ont augmenté ?'];

function Adresse({ url, actif, onBasculer, demo }: { url: string; actif: boolean; onBasculer: (v: boolean) => void; demo: boolean }) {
  const [copie, setCopie] = useState(false);
  return (
    <Card className="halo-bg halo-clip relative overflow-hidden p-5 md:p-7">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="label-halo">Votre adresse Brix AI</div>
          <p className="mt-0.5 text-[13px] text-ink-2">La même pour tous les assistants. Elle ne contient aucun secret.</p>
        </div>
        <div className="flex shrink-0 items-center gap-3 self-start rounded-full bg-white/80 py-1.5 pl-4 pr-2 shadow-[0_0_0_1px_#ece8f6]">
          <span className="text-[13px] font-medium">Relier votre IA</span>
          <Switch checked={actif} onChange={onBasculer} label="Relier votre IA" />
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1 select-all rounded-field bg-white px-4 py-3 font-mono text-[14px] text-ink shadow-[0_0_0_1px_#ece8f6] [overflow-wrap:anywhere]">{url}</div>
        <Button variant="dawn" size="lg" className="justify-center" icon={copie ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} onClick={async () => setCopie(await copier(url, 'Adresse copiée'))}>
          {copie ? 'Copiée' : 'Copier l’adresse'}
        </Button>
      </div>
      {!actif && <p className="mt-3 rounded-2xl bg-pale-a px-4 py-2.5 text-[13px] text-deep-a">Accès coupé : aucun assistant ne peut lire Brix tant que l’interrupteur est éteint.</p>}
      <ol className="mt-5 grid gap-4 md:grid-cols-3">
        {[
          ['Copiez l’adresse', 'Un clic sur le bouton ci-dessus.'],
          ['Collez-la dans votre assistant', 'Dans ses réglages de connecteurs (pas à pas ci-dessous).'],
          ['Touchez « Autoriser »', 'Brix s’ouvre : vous choisissez lecture seule ou lecture et actions.'],
        ].map(([t, d], i) => (
          <li key={t} className="flex gap-3">
            <span className="num grid h-7 w-7 shrink-0 place-items-center rounded-full bg-pale-v text-[12.5px] font-semibold text-deep-v">{i + 1}</span>
            <div>
              <div className="text-[14px] font-semibold tracking-[-0.02em]">{t}</div>
              <p className="text-[12.5px] leading-relaxed text-ink-2">{d}</p>
            </div>
          </li>
        ))}
      </ol>
      {demo && <p className="mt-4 text-[12px] text-ink-3">Mode démo : l’adresse fonctionne avec un vrai compte Brix. Ici, les réglages et la liste sont simulés.</p>}
    </Card>
  );
}

function Capacites() {
  return (
    <section className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
      <Card className="p-5">
        <div className="flex items-center gap-3">
          <IconTile icon={<Eye />} tone="blue" size="sm" />
          <div>
            <div className="text-[15px] font-semibold tracking-[-0.02em]">Ce que l’assistant peut lire</div>
            <div className="text-[12.5px] text-ink-2">Uniquement les données de votre entreprise.</div>
          </div>
        </div>
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {LECTURES.map((l) => <li key={l}><Badge size="md">{l}</Badge></li>)}
        </ul>
      </Card>
      <Card className="p-5">
        <div className="flex items-center gap-3">
          <IconTile icon={<FilePen />} tone="violet" size="sm" />
          <div>
            <div className="text-[15px] font-semibold tracking-[-0.02em]">Ce qu’il peut préparer</div>
            <div className="text-[12.5px] text-ink-2">Seulement si vous choisissez « Lecture et actions ».</div>
          </div>
        </div>
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {ACTIONS.map((l) => <li key={l}><Badge size="md" tone="violet">{l}</Badge></li>)}
        </ul>
        <p className="mt-3 flex items-start gap-2 text-[12.5px] text-ink-2">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-ok" />
          Rien n’est envoyé à vos clients, aucun paiement, aucune suppression : vous relisez et envoyez depuis Brix.
        </p>
      </Card>
    </section>
  );
}

/** `embedded` : affiché dans une page qui a déjà son titre (Brix AI › Connecter une IA). */
export default function ConnecterIA({ embedded = false }: { embedded?: boolean }) {
  const s = useBrixAi();
  const url = urlServeur();
  return (
    <div className={cn('space-y-6', !embedded && 'pt-2')}>
      <Adresse url={url} actif={s.actif} onBasculer={(v) => void s.basculer(v)} demo={!s.cloud} />
      {s.erreur && (
        <div role="alert" className="flex flex-col gap-2 rounded-card-sm bg-pale-r px-4 py-3 text-[13px] text-deep-r sm:flex-row sm:items-center sm:justify-between">
          {s.erreur}
          <Button size="sm" variant="secondary" onClick={() => void s.recharger()}>Réessayer</Button>
        </div>
      )}
      <Assistants url={url} />
      <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr] [&>*]:min-w-0">
        <AccesListe acces={s.acces} chargement={s.chargement} onCouper={(id) => void s.couper(id)} demo={!s.cloud} />
        <Journal lignes={s.journal} demo={!s.cloud} />
      </div>
      <Capacites />
      <Card className="p-5">
        <div className="text-[14.5px] font-semibold tracking-[-0.02em]">Essayez par exemple</div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {QUESTIONS.map((q) => (
            <button key={q} onClick={() => void copier(q, 'Question copiée')} className="min-h-10 rounded-full bg-white px-3.5 py-1.5 text-left text-[12.5px] text-ink shadow-[0_0_0_1px_#ece8f6] transition duration-300 ease-spring hover:-translate-y-px hover:bg-pale-v hover:text-deep-v" title="Copier la question">
              {`« ${q.replace(' ?', ' ?')} »`}
            </button>
          ))}
        </div>
      </Card>
      <Avance cloud={s.cloud} onCree={() => void s.recharger()} />
    </div>
  );
}
