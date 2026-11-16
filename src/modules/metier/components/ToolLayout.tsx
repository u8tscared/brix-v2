import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, FilePlus2 } from 'lucide-react';
import { Button, Card, Icon } from '@/components/ui';
import { TOOL_META } from '../tools/meta';
import type { QuoteLine } from '../addToDevis';
import { AddToDevisSheet } from './AddToDevisSheet';

/**
 * Gabarit commun des outils métier : saisie à gauche, résultat à droite
 * (au-dessus sur téléphone après la saisie), formules et références en bas.
 */
export function ToolLayout({ tool, inputs, hero, children, formulas, refs, lines, quoteTitle }: {
  tool: string;
  inputs: ReactNode;
  hero: { label: string; value: ReactNode; sub?: ReactNode };
  children?: ReactNode;
  formulas?: string[];
  refs?: string[];
  lines?: QuoteLine[];
  quoteTitle?: string;
}) {
  const meta = TOOL_META[tool];
  const [sheet, setSheet] = useState(false);
  const canQuote = !!lines?.some((l) => l.quantity > 0);
  return (
    <div className="space-y-5">
      <div>
        <Link to="/app/outils" className="-ml-1 inline-flex h-9 items-center gap-1.5 rounded-lg px-1 text-[13px] font-medium text-ink-2 hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Outils métier
        </Link>
        <div className="mt-1 flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] border border-line bg-white text-ink"><Icon name={meta?.icon ?? 'Calculator'} className="h-5 w-5" /></span>
          <div className="min-w-0">
            <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.02em] md:text-[24px]">{meta?.name ?? 'Outil'}</h1>
            <p className="text-[13px] text-ink-2">{meta?.long ?? meta?.short}</p>
          </div>
        </div>
      </div>

      <div className="grid items-start gap-5 [&>*]:min-w-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Card className="space-y-4 p-4 md:p-5">{inputs}</Card>
        <div className="space-y-4 lg:sticky lg:top-5">
          <Card className="p-4 md:p-5">
            <div className="text-[12.5px] font-medium text-ink-2">{hero.label}</div>
            <div className="num mt-1 font-display text-[34px] font-semibold leading-[1.1] tracking-[-0.02em] dawn-text">{hero.value}</div>
            {hero.sub && <div className="mt-1 text-[13px] text-ink-2">{hero.sub}</div>}
            {children && <div className="mt-3">{children}</div>}
            {lines && (
              <Button variant="primary" size="lg" className="mt-4 w-full justify-center" icon={<FilePlus2 className="h-5 w-5" />} disabled={!canQuote} onClick={() => setSheet(true)}>
                Ajouter au devis
              </Button>
            )}
          </Card>
          {(formulas?.length || refs?.length) && (
            <Card className="p-4">
              <div className="flex items-center gap-2 text-[13px] font-semibold"><BookOpen className="h-4 w-4 text-ink-3" /> Comment c’est calculé</div>
              {formulas && (
                <ul className="mt-2 space-y-1.5">
                  {formulas.map((f) => <li key={f} className="text-[12.5px] leading-relaxed text-ink-2">{f}</li>)}
                </ul>
              )}
              {refs && <div className="mt-3 border-t border-line pt-2.5 text-[11.5px] leading-relaxed text-ink-3">Références : {refs.join(' · ')}</div>}
            </Card>
          )}
        </div>
      </div>
      {lines && <AddToDevisSheet open={sheet} onClose={() => setSheet(false)} lines={lines} title={quoteTitle ?? meta?.name ?? 'Travaux'} />}
    </div>
  );
}
