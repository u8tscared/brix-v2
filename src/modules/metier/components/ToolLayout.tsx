import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, ChevronDown, FilePlus2, SlidersHorizontal } from 'lucide-react';
import { Badge, Button, Card, Chip, IconTile, cn } from '@/components/ui';
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
        {hero.unit && <span className="ml-1.5 text-[0.42em] font-semibold tracking-[-0.02em] text-ink-3">{hero.unit}</span>}
      </span>
    ) : (
      <span className={cls}>{hero.value}</span>
    );

  return (
    <div className="space-y-6">
      <header className="animate-[page-in_.55s_var(--ease)_both] pt-1 md:pt-3">
        <Link to="/app/outils" className="group -ml-1 inline-flex h-9 items-center gap-1.5 rounded-pill px-3 text-[13px] font-medium text-ink-2 transition-[background,color,box-shadow] duration-300 hover:bg-white hover:text-ink hover:shadow-pill">
          <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" /> Outils métier
        </Link>
        <div className="mt-3 flex items-center gap-4">
          <span className="transition-transform duration-500 ease-spring hover:-rotate-6">
            <IconTile name={meta?.icon ?? 'Calculator'} dept="metier" size="xl" />
          </span>
          <div className="min-w-0">
            <h1 className="title-halo text-ink">{meta?.name ?? 'Outil'}</h1>
            <p className="mt-1.5 text-[14px] leading-snug text-ink-2">{meta?.long ?? meta?.short}</p>
          </div>
        </div>
        {meta && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {meta.trades.map((k) => <Chip key={k} tone="white">{TRADE_BY_KEY[k]?.name.split(',')[0]}</Chip>)}
          </div>
        )}
      </header>

      <div className="grid items-start gap-5 [&>*]:min-w-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)]">
        <Card className="animate-[fade-up_.5s_var(--ease)_.05s_both] space-y-5 p-5 md:p-7">
          <div className="flex items-center gap-2.5">
            <IconTile icon={<SlidersHorizontal />} tone="neutral" size="sm" />
            <h2 className="text-[15px] font-semibold tracking-[-0.02em]">Vos mesures</h2>
          </div>
          {inputs}
        </Card>

        <div className="space-y-4 lg:sticky lg:top-24">
          <Card className="animate-[fade-up_.5s_var(--ease)_.12s_both] overflow-hidden">
            <div className="halo-bg halo-clip relative overflow-hidden px-5 pb-5 pt-6 md:px-7">
              <div className="label-halo">{hero.label}</div>
              <div className="mt-2" aria-live="polite">{heroNode('num-halo block text-[48px] leading-none text-ink md:text-[60px]')}</div>
              {hero.sub && <div className="mt-3 max-w-[46ch] text-[13px] leading-snug text-ink-2">{hero.sub}</div>}
            </div>
            {visual && <div className="mx-3 rounded-card-sm bg-halo-track/60 px-4 py-4 md:mx-4 md:px-5">{visual}</div>}
            {children && <div className="px-5 pb-1 pt-2 md:px-7">{children}</div>}
            {lines && (
              <div className="hidden p-5 pt-3 md:px-7 md:pb-6 lg:block">
                <Button variant="dawn" size="lg" className="w-full justify-center" icon={<FilePlus2 />} disabled={!canQuote} onClick={() => setSheet(true)}>
                  Ajouter au devis
                  {canQuote && <span className="num ml-1 font-medium text-white/75">· {money(total, true)} HT</span>}
                </Button>
              </div>
            )}
          </Card>

          {(formulas?.length || refs?.length) && (
            <Card className="animate-[fade-up_.5s_var(--ease)_.18s_both] overflow-hidden">
              <button onClick={() => setHowOpen((o) => !o)} aria-expanded={howOpen} className="flex min-h-[60px] w-full items-center gap-3 px-5 text-left transition-colors hover:bg-halo-hover md:px-6">
                <IconTile icon={<BookOpen />} tone="amber" size="sm" />
                <span className="flex-1 text-[14px] font-semibold tracking-[-0.01em]">Comment c’est calculé</span>
                {refs?.[0] && <span className="hidden truncate text-[12px] text-ink-3 sm:inline">{refs[0]}</span>}
                <ChevronDown className={cn('h-4 w-4 text-ink-3 transition-transform duration-300 ease-out-quint', howOpen && 'rotate-180')} />
              </button>
              <div className={cn('grid transition-[grid-template-rows] duration-300 ease-out-quint', howOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
                <div className="overflow-hidden">
                  <div className="border-t border-halo-line px-5 pb-5 pt-4 md:px-6">
                    {formulas && (
                      <ol className="space-y-2.5">
                        {formulas.map((f, i) => (
                          <li key={f} className="flex gap-3 text-[13px] leading-relaxed text-ink-2">
                            <span className="num mt-px grid h-6 w-6 shrink-0 place-items-center rounded-full bg-pale-a text-[11px] font-semibold text-deep-a">{i + 1}</span>
                            <span>{f}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                    {refs && (
                      <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-halo-line pt-3">
                        <span className="mr-1 text-[12px] text-ink-3">Références</span>
                        {refs.map((r) => <Badge key={r}>{r}</Badge>)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {lines && (
        <div className="glass-strong sticky bottom-[calc(90px+var(--safe-b))] z-20 -mx-1 flex items-center gap-3 rounded-pill p-1.5 pl-5 lg:hidden">
          <div className="min-w-0 flex-1">
            <div className="truncate text-[11px] font-medium text-ink-3">{hero.label}</div>
            {heroNode('num-halo block truncate text-[20px] leading-tight text-ink')}
          </div>
          <Button variant="dawn" className="h-12 shrink-0" icon={<FilePlus2 />} disabled={!canQuote} onClick={() => setSheet(true)}>
            Ajouter au devis
          </Button>
        </div>
      )}
      {lines && <AddToDevisSheet open={sheet} onClose={() => setSheet(false)} lines={lines} title={quoteTitle ?? meta?.name ?? 'Travaux'} />}
    </div>
  );
}
