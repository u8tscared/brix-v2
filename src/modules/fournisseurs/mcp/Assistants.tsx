// Pas à pas pour relier Brix à chaque assistant (onglets en pilules, étapes numérotées).
import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Card, Chip, cn } from '@/components/ui';
import { ASSISTANTS, avecUrl } from './contenu';
import { copier } from './copier';

function Code({ titre, texte }: { titre: string; texte: string }) {
  const [ok, setOk] = useState(false);
  return (
    <div className="min-w-0 rounded-card-sm bg-halo-track/70 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[12px] font-medium text-ink-2">{titre}</span>
        <button
          type="button"
          onClick={async () => setOk(await copier(texte, 'Copié'))}
          className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium text-ink-2 hover:bg-white hover:text-ink"
          aria-label={`Copier : ${titre}`}
        >
          {ok ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {ok ? 'Copié' : 'Copier'}
        </button>
      </div>
      <pre className="mt-1.5 overflow-x-auto whitespace-pre-wrap break-all font-mono text-[12px] leading-relaxed text-ink">{texte}</pre>
    </div>
  );
}

export function Assistants({ url }: { url: string }) {
  const [cle, setCle] = useState(ASSISTANTS[0].key);
  const a = ASSISTANTS.find((x) => x.key === cle) ?? ASSISTANTS[0];
  return (
    <section>
      <h2 className="text-[19px] font-semibold tracking-[-0.03em]">Pas à pas, selon votre assistant</h2>
      <div className="-mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 pb-1 scrollbar-none md:mx-0 md:flex-wrap md:px-0" role="tablist" aria-label="Assistant">
        {ASSISTANTS.map((x) => (
          <Chip key={x.key} active={x.key === cle} onClick={() => setCle(x.key)} className="min-h-10 shrink-0">
            {x.nom}
          </Chip>
        ))}
      </div>
      <Card className="mt-3 p-5 md:p-6" role="tabpanel">
        <div className="text-[16px] font-semibold tracking-[-0.02em]">{a.nom}</div>
        <div className="text-[12.5px] text-ink-3">{a.sousTitre}</div>
        <ol className="mt-4 space-y-3">
          {a.etapes.map((e, i) => (
            <li key={i} className="flex gap-3">
              <span className={cn('num grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12.5px] font-semibold', 'bg-pale-v text-deep-v')}>{i + 1}</span>
              <p className="min-w-0 pt-0.5 text-[13.5px] leading-relaxed text-ink [overflow-wrap:anywhere]">{avecUrl(e, url)}</p>
            </li>
          ))}
        </ol>
        {a.code && (
          <div className="mt-4 grid gap-2.5 lg:grid-cols-2">
            {a.code.map((c) => <Code key={c.titre} titre={c.titre} texte={avecUrl(c.texte, url)} />)}
          </div>
        )}
        {a.notes && (
          <ul className="mt-4 space-y-1.5 border-t border-halo-line pt-4">
            {a.notes.map((n) => <li key={n} className="text-[12.5px] leading-relaxed text-ink-2">{n}</li>)}
          </ul>
        )}
      </Card>
    </section>
  );
}
