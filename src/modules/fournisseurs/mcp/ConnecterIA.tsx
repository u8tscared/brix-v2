// « Connecter une IA à Brix » : un accès personnel, en lecture seule, pour Claude, ChatGPT ou tout assistant compatible MCP.
// Monté dans Bob › MCP. Fonctionne même si l'espace Achats n'a jamais été ouvert (la liste des accès est alors vide).
import { useState } from 'react';
import {
  BarChart3, Building2, Check, CircleAlert, Copy, FileText, HandCoins, HardHat, KeyRound, Plus, Receipt, Scale, ShieldCheck, Store, Tag, TrendingUp, Truck, Users,
} from 'lucide-react';
import { Button, Card, CardHeader, Field, Input, PageHeader, Sheet, toast } from '@/components/ui';
import { dateShort, relative } from '@/lib/format';
import { useAchats } from '../data/store';

const LECTURES = [
  { icon: <Building2 />, t: 'Votre entreprise' },
  { icon: <FileText />, t: 'Vos devis' },
  { icon: <Receipt />, t: 'Vos factures' },
  { icon: <HandCoins />, t: 'Les impayés' },
  { icon: <BarChart3 />, t: 'Votre chiffre d’affaires' },
  { icon: <HardHat />, t: 'Vos chantiers' },
  { icon: <Users />, t: 'Vos clients' },
  { icon: <Truck />, t: 'Achats et livraisons' },
  { icon: <Scale />, t: 'Demandes de prix' },
  { icon: <Tag />, t: 'Prix des matériaux' },
  { icon: <TrendingUp />, t: 'Hausses de prix' },
  { icon: <Store />, t: 'Vos fournisseurs' },
];

const QUESTIONS = ['Qui me doit de l’argent ?', 'Où acheter mes disjoncteurs le moins cher ?', 'Combien j’ai signé ce mois-ci ?', 'Quels chantiers attendent encore du matériel ?', 'Quels prix de matériaux ont augmenté ?'];

async function copier(texte: string, ok: string) {
  try {
    await navigator.clipboard.writeText(texte);
    toast(ok);
    return true;
  } catch {
    toast('Copie impossible : sélectionnez le texte et copiez-le à la main', 'warn');
    return false;
  }
}

function CreerAcces({ open, onClose }: { open: boolean; onClose: () => void }) {
  const creerJeton = useAchats((s) => s.creerJeton);
  const [nom, setNom] = useState('');
  const [url, setUrl] = useState<string | null>(null);
  const [copie, setCopie] = useState(false);
  const fermer = () => {
    setNom('');
    setUrl(null);
    setCopie(false);
    onClose();
  };
  const creer = () => setUrl(`${location.origin}/api/mcp/k/${creerJeton(nom.trim() || 'Assistant IA')}`);

  return (
    <Sheet
      open={open}
      onClose={fermer}
      width={520}
      title={url ? 'Votre adresse est prête' : 'Créer un accès'}
      subtitle={url ? 'Collez-la dans les réglages de votre assistant.' : 'Un accès par appareil ou par assistant : vous pourrez couper chacun séparément.'}
      footer={
        url ? (
          <Button variant="primary" size="lg" onClick={fermer} disabled={!copie} className="flex-1 justify-center sm:flex-none">{copie ? 'C’est fait' : 'Copiez d’abord l’adresse'}</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={fermer} className="hidden sm:inline-flex">Annuler</Button>
            <Button variant="primary" size="lg" icon={<KeyRound className="h-4 w-4" />} onClick={creer} className="flex-1 justify-center sm:flex-none">Créer l’accès</Button>
          </>
        )
      }
    >
      {!url ? (
        <Field label="Nom de l’accès" hint="Pour le reconnaître dans la liste, rien de plus.">
          <Input autoFocus value={nom} onChange={(e) => setNom(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && creer()} placeholder="Claude sur mon ordinateur" />
        </Field>
      ) : (
        <div className="space-y-4">
          <div className="rounded-[12px] border border-line bg-[#fbfbfd] p-3">
            <div className="select-all break-all font-mono text-[12.5px] leading-relaxed text-ink">{url}</div>
            <Button variant={copie ? 'secondary' : 'primary'} className="mt-3 w-full justify-center" icon={copie ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} onClick={async () => setCopie((await copier(url, 'Adresse copiée')) || copie)}>
              {copie ? 'Copiée' : 'Copier l’adresse'}
            </Button>
          </div>
          <div className="flex gap-2.5 rounded-[12px] border border-[#fde3b5] bg-warn-bg px-3.5 py-3 text-[13px] text-[#92400e]">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <div className="font-medium">Cette adresse ne sera plus jamais affichée</div>
              <div className="mt-0.5 text-[12.5px]">Elle sert de clé : gardez-la pour vous. Si vous la perdez, créez simplement un nouvel accès.</div>
            </div>
          </div>
          <button className="min-h-10 text-[12.5px] font-medium text-ink-2 underline-offset-2 hover:underline" onClick={() => setCopie(true)}>Je l’ai copiée autrement</button>
        </div>
      )}
    </Sheet>
  );
}

/** `embedded` : affiché dans un onglet d'une page qui a déjà son titre (Bob › Brix AI MCP). */
export default function ConnecterIA({ embedded = false }: { embedded?: boolean }) {
  const { jetons, revoquerJeton } = useAchats();
  const [ouvrir, setOuvrir] = useState(false);
  const [aRevoquer, setARevoquer] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {embedded ? (
        <div className="flex justify-end"><Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setOuvrir(true)}>Créer un accès</Button></div>
      ) : <PageHeader
        title="Connecter une IA à Brix"
        subtitle="Posez vos questions à Claude, ChatGPT ou un autre assistant : il lit vos chiffres dans Brix et vous répond avec vos vraies données."
        actions={<Button variant="dawn" icon={<Plus className="h-4 w-4" />} onClick={() => setOuvrir(true)}>Créer un accès</Button>}
      />}

      <Card className="p-5 md:p-6">
        <ol className="grid gap-5 md:grid-cols-3 md:gap-6">
          {[
            { t: 'Créez un accès', d: 'Brix vous donne une adresse personnelle, à copier une seule fois.' },
            { t: 'Collez-la dans votre assistant', d: <>Dans Claude : <b className="font-medium text-ink">Réglages › Connecteurs › Ajouter un connecteur personnalisé</b>, puis collez l’adresse. Dans ChatGPT ou un autre assistant compatible MCP : ouvrez ses réglages de connecteurs et collez la même adresse.</> },
            { t: 'Posez votre question', d: 'En français, comme à un associé. L’assistant va chercher la réponse dans Brix.' },
          ].map((e, i) => (
            <li key={i} className="flex gap-3">
              <span className="num grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-[13px] font-semibold text-white">{i + 1}</span>
              <div>
                <div className="text-[14px] font-semibold">{e.t}</div>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-2">{e.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 [&>*]:min-w-0">
        <Card>
          <CardHeader title="Vos accès" meta={jetons.length ? `${jetons.length}` : undefined} icon={<KeyRound className="h-4 w-4 text-ink-3" />} />
          {jetons.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <div className="text-[14px] font-medium">Aucun accès pour l’instant</div>
              <p className="mx-auto mt-1 max-w-xs text-[12.5px] text-ink-2">Créez-en un pour relier votre assistant. Vous pourrez le couper à tout moment.</p>
            </div>
          ) : (
            jetons.map((j) => (
              <div key={j.id} className="flex min-h-[60px] items-center gap-3 border-b border-line px-4 py-2.5 last:border-b-0">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-sub text-ink-2"><KeyRound className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-medium">{j.nom}</div>
                  <div className="truncate text-[11.5px] text-ink-3">
                    <span className="font-mono">{j.prefixe}…</span> · créé le {dateShort(j.createdAt)}
                    {j.derniereUtilisation ? ` · utilisé ${relative(j.derniereUtilisation)}` : ' · jamais utilisé'}
                  </div>
                </div>
                {aRevoquer === j.id ? (
                  <div className="flex shrink-0 gap-1">
                    <Button size="sm" variant="ghost" className="max-md:h-10" onClick={() => setARevoquer(null)}>Garder</Button>
                    <Button size="sm" variant="danger" className="max-md:h-10" onClick={() => { revoquerJeton(j.id); setARevoquer(null); toast('Accès coupé : l’assistant ne peut plus rien lire', 'info'); }}>Couper</Button>
                  </div>
                ) : (
                  <Button size="sm" variant="ghost" className="max-md:h-10" onClick={() => setARevoquer(j.id)}>Révoquer</Button>
                )}
              </div>
            ))
          )}
        </Card>

        <Card className="p-4 md:p-5">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ok-bg text-ok"><ShieldCheck className="h-5 w-5" /></span>
            <div>
              <div className="text-[14px] font-semibold">Lecture seule, toujours</div>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">
                L’assistant peut lire, jamais modifier : il ne peut rien créer, rien supprimer, rien envoyer à vos clients ni à vos fournisseurs. Chaque accès se révoque en un clic et s’arrête immédiatement.
              </p>
            </div>
          </div>
          <div className="mt-5 text-[12.5px] font-medium text-ink-2">Essayez par exemple</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {QUESTIONS.map((q) => (
              <button key={q} onClick={() => void copier(q, 'Question copiée')} className="min-h-10 rounded-full border border-line2 bg-white px-3 py-1.5 text-left text-[12.5px] text-ink transition hover:bg-sub" title="Copier la question">
                {`«\u00a0${q.replace(' ?', '\u00a0?')}\u00a0»`}
              </button>
            ))}
          </div>
        </Card>
      </div>

      <section>
        <h2 className="text-[15px] font-semibold">Ce que l’assistant peut lire</h2>
        <p className="mt-0.5 text-[13px] text-ink-2">Uniquement les données de votre entreprise, rien d’autre.</p>
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {LECTURES.map((l) => (
            <li key={l.t} className="flex min-h-[48px] items-center gap-2.5 rounded-[12px] border border-line bg-white px-3 py-2 text-[13px]">
              <span className="shrink-0 text-ink-3 [&_svg]:h-4 [&_svg]:w-4">{l.icon}</span>
              {l.t}
            </li>
          ))}
        </ul>
      </section>

      <CreerAcces open={ouvrir} onClose={() => setOuvrir(false)} />
    </div>
  );
}
