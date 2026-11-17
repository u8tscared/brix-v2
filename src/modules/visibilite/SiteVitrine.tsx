import { useState } from 'react';
import { Check, ExternalLink, Globe, Loader2, Monitor, Smartphone } from 'lucide-react';
import { Badge, Button, Card, CardHeader, cn, Input, PageHeader, Segmented, Stat, Switch, Textarea, toast } from '@/components/ui';
import { useBrix } from '@/lib/store';
import { StatStrip } from '@/modules/vendre/components/StatStrip';
import { ScaledFrame } from './components/ScaledFrame';
import { SitePreview, THEMES } from './components/SitePreview';
import { slugify } from './lib';
import { checkDomain, generateSite, publishSite, SITE_STEPS } from './service';
import { useVisi, type SiteTheme } from './store';

const SECTIONS: [string, string][] = [['prestations', 'Prestations'], ['realisations', 'Photos de chantiers'], ['avis', 'Avis Google'], ['zone', 'Zone et contact'], ['rdv', 'Bouton de rendez-vous']];

export default function SiteVitrine() {
  const company = useBrix((s) => s.company);
  const { site, setSite } = useVisi();
  const [step, setStep] = useState<number | null>(null);
  const [device, setDevice] = useState<'desktop' | 'mobile'>(() => (window.innerWidth < 768 ? 'mobile' : 'desktop'));
  const [publishing, setPublishing] = useState(false);
  const [checking, setChecking] = useState(false);
  const [domainOk, setDomainOk] = useState<{ price: number } | null>(null);
  const sub = `${slugify(company.name)}.brix.site`;
  const url = site.domain === 'perso' ? site.customDomain : sub;

  const generate = async () => {
    await generateSite(setStep);
    setSite({ generated: true });
    setStep(null);
  };
  const publish = async () => {
    setPublishing(true);
    await publishSite();
    setPublishing(false);
    setSite({ published: true });
    toast(`Votre site est en ligne sur ${url} (démo)`);
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
      <div className="space-y-5">
        <PageHeader title="Site vitrine" subtitle="Un vrai site internet, créé en une minute à partir de vos infos, de vos photos et de vos avis." />
        <Card className="mx-auto max-w-xl p-6 text-center md:p-10">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-vi-50 text-vi-700"><Globe className="h-6 w-6" strokeWidth={1.75} /></div>
          <h2 className="mt-4 text-[22px] font-semibold">Votre site en 1 minute</h2>
          <p className="mx-auto mt-2 max-w-md text-[14px] text-ink-2">Bob écrit les textes, choisit vos plus belles photos de chantier et ajoute vos avis. Les demandes de devis arrivent directement dans Brix.</p>
          {step === null ? (
            <Button variant="dawn" size="lg" className="mt-6" onClick={generate}>Créer mon site</Button>
          ) : (
            <ol className="mx-auto mt-6 max-w-xs space-y-2.5 text-left">
              {SITE_STEPS.map((s, i) => (
                <li key={s} className={cn('flex items-center gap-2.5 text-[13.5px] transition', i > step ? 'text-ink-3' : 'text-ink')}>
                  <span className="grid h-5 w-5 place-items-center">{i < step ? <Check className="h-4 w-4 text-ok" /> : i === step ? <Loader2 className="h-4 w-4 animate-spin text-vi-700" /> : <i className="h-1.5 w-1.5 rounded-full bg-line2" />}</span>
                  {s}
                </li>
              ))}
            </ol>
          )}
          <p className="mt-6 text-xs text-ink-3">Compris dans votre abonnement · hébergement sécurisé · aucun engagement</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Site vitrine"
        subtitle={site.published ? <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-ok" />En ligne sur {url}</span> : 'Prêt à être mis en ligne. Modifiez ce que vous voulez, l\'aperçu suit.'}
        actions={
          site.published ? (
            <Button icon={<ExternalLink className="h-4 w-4" />} onClick={() => toast('En démo, le site n\'est pas réellement publié', 'info')}>Ouvrir mon site</Button>
          ) : (
            <Button variant="dawn" loading={publishing} onClick={publish}>Mettre en ligne</Button>
          )
        }
      />

      {site.published && (
        <StatStrip>
          <Stat label="Visites (30 jours)" value="412" sub="dont 71 % sur téléphone" />
          <Stat label="Demandes de devis" value="9" sub="arrivées dans Demandes" />
          <Stat label="Visites réservées" value="4" sub="via le bouton rendez-vous" />
          <Stat label="Position Google" value="3e" sub="« électricien Villeurbanne »" />
        </StatStrip>
      )}

      <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card>
            <CardHeader title="Style" />
            <div className="grid grid-cols-3 gap-2 p-4">
              {(Object.keys(THEMES) as SiteTheme[]).map((k) => {
                const t = THEMES[k];
                return (
                  <button key={k} onClick={() => setSite({ theme: k })} className={cn('overflow-hidden rounded-xl border-2 text-left transition', site.theme === k ? 'border-ink' : 'border-line hover:border-line2')}>
                    <div className="h-14 p-2" style={{ background: t.hero }}>
                      <div className="h-1.5 w-10 rounded-full" style={{ background: t.ink, opacity: 0.8 }} />
                      <div className="mt-1 h-1.5 w-7 rounded-full" style={{ background: t.sub, opacity: 0.5 }} />
                      <div className="mt-2 h-3 w-9 rounded" style={{ background: t.accent }} />
                    </div>
                    <div className="px-2 py-1.5 text-[12px] font-medium">{t.label}</div>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card>
            <CardHeader title="Adresse du site" />
            <div className="space-y-2 p-4">
              {(['brix', 'perso'] as const).map((d) => (
                <button key={d} onClick={() => setSite({ domain: d })} className={cn('flex min-h-[52px] w-full items-center gap-3 rounded-xl border px-3 text-left', site.domain === d ? 'border-ink' : 'border-line')}>
                  <span className={cn('grid h-4 w-4 place-items-center rounded-full border', site.domain === d ? 'border-ink' : 'border-line2')}>{site.domain === d && <i className="h-2 w-2 rounded-full bg-ink" />}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium">{d === 'brix' ? sub : 'Mon propre nom de domaine'}</span>
                    <span className="text-[11.5px] text-ink-3">{d === 'brix' ? 'Gratuit, tout de suite' : 'Plus pro, ex. benali-elec.fr'}</span>
                  </span>
                </button>
              ))}
              {site.domain === 'perso' && (
                <div className="space-y-2 pt-1">
                  <div className="flex gap-2">
                    <Input className="flex-1" value={site.customDomain} onChange={(e) => { setSite({ customDomain: e.target.value.toLowerCase().replace(/\s/g, '') }); setDomainOk(null); }} />
                    <Button className="h-11" loading={checking} onClick={check}>Vérifier</Button>
                  </div>
                  {domainOk && <Badge tone="ok" icon={<Check />}>Disponible · {domainOk.price} € par an, adresses e-mail comprises</Badge>}
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Contenu" />
            <div className="p-4 pb-2">
              <Textarea value={site.tagline} onChange={(e) => setSite({ tagline: e.target.value })} className="min-h-[72px] text-[13px]" aria-label="Phrase d'accroche" />
            </div>
            {SECTIONS.map(([k, label]) => (
              <div key={k} className="flex min-h-[48px] items-center justify-between border-t border-line px-4 first:border-t-0">
                <span className="text-[13px]">{label}</span>
                <Switch checked={!!site.sections[k]} onChange={(on) => setSite({ sections: { ...site.sections, [k]: on } })} label={label} />
              </div>
            ))}
          </Card>
        </div>

        <div className="order-first min-w-0 xl:order-none">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-[12.5px] font-medium text-ink-2">Aperçu</span>
            <div className="flex-1" />
            <Segmented size="sm" value={device} onChange={setDevice} options={[{ value: 'desktop', label: <><Monitor className="h-3.5 w-3.5" />Ordinateur</> }, { value: 'mobile', label: <><Smartphone className="h-3.5 w-3.5" />Téléphone</> }]} />
          </div>
          {device === 'desktop' ? (
            <ScaledFrame width={1180} height={620} url={url}><SitePreview mobile={false} /></ScaledFrame>
          ) : (
            <div className="mx-auto max-w-[390px]"><ScaledFrame width={390} height={680} url={url}><SitePreview mobile /></ScaledFrame></div>
          )}
        </div>
      </div>
    </div>
  );
}
