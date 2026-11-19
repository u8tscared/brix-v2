// « Avancé » : jetons personnels pour n8n, scripts et assistants sans connexion OAuth.
import { useState } from 'react';
import { ChevronDown, CircleAlert, Copy, Check, KeyRound } from 'lucide-react';
import { Badge, Button, Card, Field, Input, Sheet, Switch, cn } from '@/components/ui';
import { useAchats } from '../data/store';
import { creerJetonPersonnel, urlServeur } from './api';
import { copier } from './copier';

function CreerJeton({ open, onClose, cloud, onCree }: { open: boolean; onClose: () => void; cloud: boolean; onCree: () => void }) {
  const creerDemo = useAchats((s) => s.creerJeton);
  const [nom, setNom] = useState('');
  const [ecriture, setEcriture] = useState(false);
  const [resultat, setResultat] = useState<{ jeton: string; url: string } | null>(null);
  const [copie, setCopie] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const fermer = () => {
    setNom('');
    setEcriture(false);
    setResultat(null);
    setCopie(false);
    setErreur(null);
    onClose();
  };
  const creer = async () => {
    setErreur(null);
    setOccupe(true);
    try {
      if (cloud) {
        const j = await creerJetonPersonnel(nom.trim() || 'Assistant IA', ecriture);
        setResultat({ jeton: j.jeton, url: j.url_avec_jeton });
      } else {
        const t = creerDemo(nom.trim() || 'Assistant IA');
        setResultat({ jeton: t, url: `${urlServeur()}/k/${t}` });
      }
      onCree();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Création impossible, réessayez.');
    } finally {
      setOccupe(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={fermer}
      width={520}
      title={resultat ? 'Votre jeton est prêt' : 'Créer un jeton personnel'}
      subtitle={resultat ? 'Il ne sera plus jamais affiché.' : 'Pour un outil qui ne sait pas se connecter tout seul à Brix.'}
      footer={
        resultat ? (
          <Button variant="primary" size="lg" onClick={fermer} disabled={!copie} className="flex-1 justify-center sm:flex-none">{copie ? 'C’est fait' : 'Copiez d’abord le jeton'}</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={fermer} className="hidden sm:inline-flex">Annuler</Button>
            <Button variant="primary" size="lg" loading={occupe} icon={<KeyRound className="h-4 w-4" />} onClick={() => void creer()} className="flex-1 justify-center sm:flex-none">Créer le jeton</Button>
          </>
        )
      }
    >
      {!resultat ? (
        <div className="space-y-4">
          {!cloud && <Badge tone="warn">Démo : ce jeton ne fonctionne pas réellement</Badge>}
          <Field label="Nom du jeton" hint="Pour le reconnaître dans la liste, rien de plus.">
            <Input autoFocus value={nom} onChange={(e) => setNom(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void creer()} placeholder="n8n, relances du lundi" />
          </Field>
          <div className="flex items-start justify-between gap-4 rounded-card-sm bg-halo-track/60 px-4 py-3">
            <div>
              <div className="text-[13.5px] font-medium">Autoriser les actions</div>
              <div className="text-[12.5px] text-ink-2">Créer des brouillons, des rendez-vous, des notes. Sans cela : lecture seule.</div>
            </div>
            <Switch checked={ecriture} onChange={setEcriture} disabled={!cloud} label="Autoriser les actions" />
          </div>
          {erreur && <p role="alert" className="rounded-2xl bg-pale-r px-4 py-3 text-[13px] text-deep-r">{erreur}</p>}
        </div>
      ) : (
        <div className="space-y-4">
          {[
            { t: 'Jeton (en-tête Authorization: Bearer …)', v: resultat.jeton },
            { t: 'Ou adresse avec le jeton, pour les outils qui ne prennent qu’une adresse', v: resultat.url },
          ].map((x) => (
            <div key={x.t} className="rounded-card-sm bg-halo-track/70 p-4">
              <div className="text-[12px] font-medium text-ink-2">{x.t}</div>
              <div className="mt-1 select-all break-all font-mono text-[12.5px] leading-relaxed text-ink">{x.v}</div>
              <Button variant="secondary" size="sm" className="mt-2.5" icon={copie ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} onClick={async () => setCopie((await copier(x.v, 'Copié')) || copie)}>Copier</Button>
            </div>
          ))}
          <div className="flex gap-2.5 rounded-card-sm bg-pale-a px-4 py-3.5 text-[13px] text-deep-a">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <div>Ce jeton donne accès à vos données : gardez-le pour vous. Perdu ? Coupez-le et créez-en un autre.</div>
          </div>
          <button className="min-h-10 text-[12.5px] font-medium text-ink-2 underline-offset-2 hover:underline" onClick={() => setCopie(true)}>Je l’ai copié autrement</button>
        </div>
      )}
    </Sheet>
  );
}

export function Avance({ cloud, onCree }: { cloud: boolean; onCree: () => void }) {
  const [ouvert, setOuvert] = useState(false);
  const [creer, setCreer] = useState(false);
  return (
    <Card>
      <button type="button" className="flex min-h-14 w-full items-center gap-3 px-5 py-3 text-left" onClick={() => setOuvert((v) => !v)} aria-expanded={ouvert}>
        <div className="min-w-0 flex-1">
          <div className="text-[14.5px] font-semibold tracking-[-0.02em]">Avancé : jetons personnels</div>
          <div className="text-[12.5px] text-ink-2">Pour n8n, un script ou un assistant qui ne propose pas la connexion par Brix.</div>
        </div>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-ink-3 transition-transform duration-300', ouvert && 'rotate-180')} />
      </button>
      {ouvert && (
        <div className="space-y-3 border-t border-halo-line px-5 py-4 text-[13px] leading-relaxed text-ink-2">
          <p>Le jeton s’envoie dans l’en-tête <code className="font-mono text-[12px] text-ink">Authorization: Bearer brx_mcp_…</code> vers <code className="break-all font-mono text-[12px] text-ink">{urlServeur()}</code>. Il apparaît dans « Assistants reliés », où vous pouvez le couper.</p>
          <p>Préférez la connexion normale quand l’assistant la propose : rien à copier ni à garder secret.</p>
          <Button variant="secondary" icon={<KeyRound className="h-4 w-4" />} onClick={() => setCreer(true)}>Créer un jeton</Button>
        </div>
      )}
      <CreerJeton open={creer} onClose={() => setCreer(false)} cloud={cloud} onCree={onCree} />
    </Card>
  );
}
