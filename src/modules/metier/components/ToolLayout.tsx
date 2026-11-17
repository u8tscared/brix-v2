import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, ChevronDown, FilePlus2 } from 'lucide-react';
import { Badge, Button, Card, IconTile, cn } from '@/components/ui';
import { AnimatedNumber } from '@/components/motion';
import { money, num } from '@/lib/format';
import { TRADE_BY_KEY } from '@/lib/catalog';
import { TOOL_META } from '../tools/meta';
import { priceOf, type QuoteLine } from '../addToDevis';
import { AddToDevisSheet } from './AddToDevisSheet';

export interface Hero {
  label: string;
  /** Nombre : il s'anime à chaque changement. Sinon un texte libre. */
  value: number | ReactNode;
  unit?: string;
  decimals?: number;
  sub?: ReactNode;
}

/**
 * Gabarit commun des outils métier : saisie à gauche, résultat vivant à droite
 * (chiffre animé, schéma, détails), puis « Ajouter au devis ».
 * Sur téléphone, une barre collée en bas garde le résultat et l'action sous le pouce.
 */
export function ToolLayout({ tool, inputs, hero, visual, children, formulas, refs, lines, quoteTitle }: {
  tool: string;
  inputs: ReactNode;
  hero: Hero;
  visual?: ReactNode;
  children?: ReactNode;
  formulas?: string[];
  refs?: string[];
  lines?: QuoteLine[];
  quoteTitle?: string;
}) {
  const meta = TOOL_META[tool];
  const [sheet, setSheet] = useState(false);
  const [howOpen, setHowOpen] = useState(false);
  const valid = (lines ?? []).filter((l) => l.quantity > 0);
  const canQuote = valid.length > 0;
  const total = valid.reduce((x, l) => x + l.quantity * priceOf(l), 0);
  const heroNode = (cls: string) =>
    typeof hero.value === 'number' ? (
      <span className={cls}>
        <AnimatedNumber value={hero.value} duration={650} format={(n) => (hero.unit?.startsWith('€') ? n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/ | /g, ' ') : num(n, hero.decimals ?? 0))} />
        {hero.unit && <span className="ml-1.5 text-[0.5em] font-semibold tracking-[-0.01em] text-ink-2 [-webkit-text-fill-color:currentColor]">{hero.unit}</span>}
      </span>
    ) : (
      <span className={cls}>{hero.value}</span>
    );

  return (
    <div className="space-y-6">
      <header className="animate-[page-in_.5s_var(--ease)_both]">
        <Link to="/app/outils" className="group -ml-1.5 inline-flex h-9 items-center gap-1.5 rounded-[9px] px-1.5 text-[13px] font-medium text-ink-2 transition-colors hover:bg-[#efedf5] hover:text-ink">
          <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" /> Outils métier
        </Link>
        <div className="mt-2 flex items-center gap-3.5">
          <IconTile name={meta?.icon ?? 'Calculator'} dept="metier" size="lg" />
          <div className="min-w-0">
            <h1 className="text-[24px] font-semibold leading-[1.1] tracking-[-0.035em] md:text-[28px]">{meta?.name ?? 'Outil'}</h1>
            <p className="mt-1 text-[13.5px] leading-snug text-ink-2">{meta?.long ?? meta?.short}</p>
          </div>
        </div>
        {meta && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {meta.trades.map((k) => <Badge key={k}>{TRADE_BY_KEY[k]?.name.split(',')[0]}</Badge>)}
          </div>
        )}
      </header>

      <div className="grid items-start gap-5 [&>*]:min-w-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)]">
        <Card className="animate-[fade-up_.5s_var(--ease)_.05s_both] space-y-5 p-4 md:p-6">{inputs}</Card>

        <div className="space-y-4 lg:sticky lg:top-4">
          <Card className="animate-[fade-up_.5s_var(--ease)_.12s_both] overflow-hidden">
            <div className="relative px-4 pb-4 pt-5 md:px-6">
              <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-[radial-gradient(closest-side,#fbeafd,transparent)] opacity-80" />
              <div className="eyebrow relative">{hero.label}</div>
              <div className="relative mt-2">{heroNode('num block text-[44px] font-semibold leading-none tracking-[-0.05em] dawn-text md:text-[52px]')}</div>
              {hero.sub && <div className="relative mt-2.5 text-[13px] leading-snug text-ink-2">{hero.sub}</div>}
            </div>
            {visual && <div className="border-t border-line bg-[#fbfafd] px-4 py-4 md:px-6">{visual}</div>}
            {children && <div className="border-t border-line px-4 py-2 md:px-6">{children}</div>}
            {lines && (
              <div className="hidden border-t border-line p-4 md:px-6 lg:block">
                <Button variant="primary" size="lg" className="w-full justify-center" icon={<FilePlus2 />} disabled={!canQuote} onClick={() => setSheet(true)}>
                  Ajouter au devis
                  {canQuote && <span className="num ml-1 font-normal text-white/60">· {money(total, true)} HT</span>}
                </Button>
              </div>
            )}
          </Card>

          {(formulas?.length || refs?.length) && (
            <Card className="animate-[fade-up_.5s_var(--ease)_.18s_both] overflow-hidden">
              <button onClick={() => setHowOpen((o) => !o)} aria-expanded={howOpen} className="flex min-h-[52px] w-full items-center gap-2.5 px-4 text-left transition-colors hover:bg-[#fbfafd] md:px-5">
                <BookOpen className="h-4 w-4 text-ink-3" strokeWidth={1.75} />
                <span className="flex-1 text-[13.5px] font-semibold">Comment c’est calculé</span>
                {refs?.[0] && <span className="hidden truncate text-[12px] text-ink-3 sm:inline">{refs[0]}</span>}
                <ChevronDown className={cn('h-4 w-4 text-ink-3 transition-transform duration-300 ease-out-quint', howOpen && 'rotate-180')} />
              </button>
              <div className={cn('grid transition-[grid-template-rows] duration-300 ease-out-quint', howOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
                <div className="overflow-hidden">
                  <div className="border-t border-line px-4 pb-4 pt-3 md:px-5">
                    {formulas && (
                      <ol className="space-y-2">
                        {formulas.map((f, i) => (
                          <li key={f} className="flex gap-2.5 text-[12.5px] leading-relaxed text-ink-2">
                            <span className="num mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#fdf6e3] text-[10.5px] font-semibold text-[#a16207]">{i + 1}</span>
                            <span>{f}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                    {refs && <div className="mt-3 border-t border-line pt-2.5 text-[11.5px] leading-relaxed text-ink-3">Références : {refs.join(' · ')}</div>}
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {lines && (
        <div className="sticky bottom-[calc(90px+var(--safe-b))] z-20 -mx-1 flex items-center gap-3 rounded-[16px] bg-white/95 p-2 pl-4 shadow-pop backdrop-blur lg:hidden">
          <div className="min-w-0 flex-1">
            <div className="truncate text-[11px] font-medium text-ink-3">{hero.label}</div>
            {heroNode('num block truncate text-[19px] font-semibold leading-tight tracking-[-0.03em]')}
          </div>
          <Button variant="primary" className="h-11" icon={<FilePlus2 />} disabled={!canQuote} onClick={() => setSheet(true)}>
            Au devis
          </Button>
        </div>
      )}
      {lines && <AddToDevisSheet open={sheet} onClose={() => setSheet(false)} lines={lines} title={quoteTitle ?? meta?.name ?? 'Travaux'} />}
    </div>
  );
}
