import { useState } from 'react';
import { Check, ExternalLink, Globe, Monitor, Smartphone } from 'lucide-react';
import { Badge, Button, Card, CardHeader, IconTile, Input, PageHeader, Segmented, Stat, Switch, Textarea, cn, toast } from '@/components/ui';
import { AnimatedNumber, LiveDot } from '@/components/motion';
import { useBrix } from '@/lib/store';
import { StatStrip } from '@/modules/vendre/components/StatStrip';
import { ScaledFrame } from './components/ScaledFrame';
import { PhoneFrame } from './components/PhoneFrame';
import { PublishSheet } from './components/PublishSheet';
import { SiteSetup } from './components/SiteSetup';
import { SitePreview, THEMES } from './components/SitePreview';
import { slugify } from './lib';
import { checkDomain, generateSite } from './service';
import { useVisi, type SiteTheme } from './store';

const SECTIONS: [string, string][] = [['prestations', 'Prestations'], ['realisations', 'Photos de chantiers'], ['avis', 'Avis Google'], ['zone', 'Zone et contact'], ['rdv', 'Bouton de rendez-vous']];

export default function SiteVitrine() {
  const company = useBrix((s) => s.company);
  const { site, setSite: rawSetSite } = useVisi();
  const [step, setStep] = useState<number | null>(null);
  const [device, setDevice] = useState<'desktop' | 'mobile'>(() => (window.innerWidth < 768 ? 'mobile' : 'desktop'));
  const [publishOpen, setPublishOpen] = useState(false);
  const [changed, setChanged] = useState(false);
  const [checking, setChecking] = useState(false);
  const [domainOk, setDomainOk] = useState<{ price: number } | null>(null);
  const sub = `${slugify(company.name) || 'mon-entreprise'}.brix.site`;
  const url = site.domain === 'perso' ? site.customDomain : sub;
  const setSite = (p: Parameters<typeof rawSetSite>[0]) => {
    rawSetSite(p);
    if (site.published) setChanged(true);
  };

  const generate = async () => {
    await generateSite(setStep);
    rawSetSite({ generated: true });
    setStep(null);
    toast('Votre site est prêt. Relisez-le, puis mettez-le en ligne.');
  };
  const check = async () => {
    setChecking(true);
    const r = await checkDomain(site.customDomain);
    setChecking(false);
    setDomainOk(r.available ? { price: r.price } : null);
    if (!r.available) toast('Ce nom est déjà pris, essayez une variante', 'warn');
  };

  if (!site.generated) {
    return (
      <div className="space-y-8">
        <PageHeader icon={<IconTile name="Globe" dept="visibilite" size="lg" />} title="Site vitrine" subtitle="Un vrai site internet, créé à partir de vos infos, de vos photos et de vos avis." />
        <SiteSetup step={step} onStart={generate} url={sub} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<IconTile name="Globe" dept="visibilite" size="lg" />}
        title="Site vitrine"
        subtitle={
          site.published ? (
            <span className="inline-flex items-center gap-2"><LiveDot />En ligne sur <span className="font-medium text-ink">{url}</span></span>
          ) : (
            'Prêt à être mis en ligne. Modifiez ce que vous voulez, l’aperçu suit.'
          )
        }
        actions={
          site.published && !changed ? (
            <Button icon={<ExternalLink />} onClick={() => toast('En démo, le site n’est pas réellement publié', 'info')}>Ouvrir mon site</Button>
          ) : (
            <Button variant="dawn" icon={<Globe />} onClick={() => setPublishOpen(true)}>{site.published ? 'Publier les changements' : 'Mettre en ligne'}</Button>
          )
        }
      />

      {site.published && (
        <StatStrip>
          <Stat label="Visites (30 jours)" value={<AnimatedNumber value={412} />} sub="dont 71 % sur téléphone" />
          <Stat label="Demandes de devis" value={<AnimatedNumber value={9} />} sub="arrivées dans Demandes" />
          <Stat label="Visites réservées" value={<AnimatedNumber value={4} />} sub="via le bouton rendez-vous" />
          <Stat label="Position Google" value="3e" sub={`« ${company.trade === 'electricien' ? 'électricien' : 'artisan'} ${company.city.replace(/^\d+\s/, '').toLowerCase()} »`} />
        </StatStrip>
      )}

      <div className="grid gap-6 [&>*]:min-w-0 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card>
            <CardHeader title="Style" meta="L’aperçu change en direct" />
            <div className="grid grid-cols-3 gap-2.5 p-4">
              {(Object.keys(THEMES) as SiteTheme[]).map((k) => {
                const t = THEMES[k];
                const on = site.theme === k;
                return (
                  <button key={k} onClick={() => setSite({ theme: k })} className={cn('press group relative overflow-hidden rounded-[12px] text-left transition-shadow duration-300', on ? 'shadow-[0_0_0_2px_var(--ink),0_8px_18px_-10px_rgba(19,15,38,.4)]' : 'shadow-[0_0_0_1px_var(--line2)] hover:shadow-[0_0_0_1px_#cfcbdd]')}>
                    <div className="h-16 p-2 transition-transform duration-500 ease-out-quint group-hover:scale-[1.04]" style={{ background: t.hero }}>
                      <div className="h-1.5 w-10 rounded-full" style={{ background: t.ink, opacity: 0.8 }} />
                      <div className="mt-1 h-1.5 w-7 rounded-full" style={{ background: t.sub, opacity: 0.5 }} />
                      <div className="mt-2.5 h-3.5 w-10 rounded" style={{ background: t.accent }} />
                    </div>
                    <div className="flex items-center justify-between bg-white px-2 py-1.5 text-[12px] font-medium">
                      {t.label}
                      {on && <span className="grid h-4 w-4 animate-pop place-items-center rounded-full bg-ink text-white"><Check className="h-2.5 w-2.5" strokeWidth={3} /></span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card>
            <CardHeader title="Adresse du site" />
            <div className="space-y-2 p-4">
              {(['brix', 'perso'] as const).map((d) => {
                const on = site.domain === d;
                return (
                  <button key={d} onClick={() => setSite({ domain: d })} className={cn('flex min-h-[56px] w-full items-center gap-3 rounded-[12px] px-3 text-left transition-shadow duration-200', on ? 'shadow-[0_0_0_1.5px_var(--ink)]' : 'shadow-[0_0_0_1px_var(--line2)] hover:shadow-[0_0_0_1px_#cfcbdd]')}>
                    <span className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-colors', on ? 'border-ink' : 'border-line2')}><i className={cn('h-2.5 w-2.5 rounded-full bg-ink transition-transform duration-300 ease-spring', on ? 'scale-100' : 'scale-0')} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium">{d === 'brix' ? sub : 'Mon propre nom de domaine'}</span>
                      <span className="text-[11.5px] text-ink-3">{d === 'brix' ? 'Gratuit, tout de suite' : 'Plus pro, ex. benali-elec.fr'}</span>
                    </span>
                  </button>
                );
              })}
              {site.domain === 'perso' && (
                <div className="animate-[fade-up_.3s_var(--ease)_both] space-y-2 pt-1">
                  <div className="flex gap-2">
                    <Input className="min-w-0 flex-1" value={site.customDomain} onChange={(e) => { setSite({ customDomain: e.target.value.toLowerCase().replace(/\s/g, '') }); setDomainOk(null); }} aria-label="Nom de domaine" />
                    <Button className="h-11" loading={checking} onClick={check}>Vérifier</Button>
                  </div>
                  {domainOk && <Badge tone="ok" icon={<Check />}>Disponible · {domainOk.price} € par an, e-mails compris</Badge>}
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Contenu" />
            <div className="p-4 pb-3">
              <div className="mb-1.5 text-[12.5px] font-medium text-ink-2">Phrase d’accroche</div>
              <Textarea value={site.tagline} onChange={(e) => setSite({ tagline: e.target.value })} className="min-h-[76px] text-[13px]" aria-label="Phrase d'accroche" />
            </div>
            {SECTIONS.map(([k, label]) => (
              <div key={k} className="flex min-h-[48px] items-center justify-between border-t border-line px-4">
                <span className="text-[13px]">{label}</span>
                <Switch checked={!!site.sections[k]} onChange={(on) => setSite({ sections: { ...site.sections, [k]: on } })} label={label} />
              </div>
            ))}
          </Card>
        </div>

        <div className="order-first xl:order-none">
          <div className="mb-3 flex items-center gap-2">
            <span className="eyebrow">Aperçu</span>
            {changed && <Badge tone="peach" dot>Changements non publiés</Badge>}
            <div className="flex-1" />
            <Segmented size="sm" value={device} onChange={setDevice} options={[{ value: 'desktop', label: <><Monitor className="h-3.5 w-3.5" />Ordinateur</> }, { value: 'mobile', label: <><Smartphone className="h-3.5 w-3.5" />Téléphone</> }]} />
          </div>
          <div className="xl:sticky xl:top-4">
            <div key={`${device}-${site.theme}`} className="animate-[scale-in_.4s_var(--ease)_both]">
              {device === 'desktop' ? (
                <ScaledFrame width={1180} height={620} url={url}><SitePreview mobile={false} /></ScaledFrame>
              ) : (
                <div className="rounded-[20px] bg-[radial-gradient(closest-side,#fdecef,transparent)] py-2"><PhoneFrame width={300} height={610}><SitePreview mobile /></PhoneFrame></div>
              )}
            </div>
          </div>
        </div>
      </div>

      <PublishSheet open={publishOpen} onClose={() => setPublishOpen(false)} url={url} onPublished={() => { rawSetSite({ published: true }); setChanged(false); }} />
    </div>
  );
}
