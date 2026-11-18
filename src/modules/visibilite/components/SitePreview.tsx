import { CalendarCheck, Check, MapPin, Phone, ShieldCheck, Star } from 'lucide-react';
import { cn } from '@/components/ui';
import { useBrix } from '@/lib/store';
import { PhotoArt } from '@/modules/chantiers/components/common/PhotoArt';
import { useVendre } from '@/modules/vendre/store';
import { artFor } from '../lib';
import { DEFAULT_SERVICES, SERVICES } from '../service';
import { useVisi, type SiteTheme } from '../store';

export const THEMES: Record<SiteTheme, { label: string; bg: string; surface: string; ink: string; sub: string; accent: string; accentInk: string; hero: string; font: string }> = {
  clair: { label: 'Clair', bg: '#ffffff', surface: '#f5f6fa', ink: '#14162b', sub: '#5b5e73', accent: '#1F389D', accentInk: '#ffffff', hero: 'linear-gradient(180deg,#eef1fb,#ffffff)', font: 'Geist, system-ui, sans-serif' },
  atelier: { label: 'Atelier', bg: '#121214', surface: '#1d1d21', ink: '#f4f4f5', sub: '#a1a1aa', accent: '#fb923c', accentInk: '#121214', hero: 'linear-gradient(180deg,#1d1d21,#121214)', font: 'Geist, system-ui, sans-serif' },
  nature: { label: 'Nature', bg: '#fbf8f2', surface: '#f1ece1', ink: '#23261f', sub: '#64675b', accent: '#3f6b4a', accentInk: '#ffffff', hero: 'linear-gradient(180deg,#efe9dc,#fbf8f2)', font: 'Georgia, serif' },
};

/** Le site vitrine de l'artisan, construit à partir de ses données Brix. `mobile` force la mise en page téléphone. */
export function SitePreview({ mobile }: { mobile: boolean }) {
  const company = useBrix((s) => s.company);
  const chantiers = useBrix((s) => s.chantiers);
  const reviews = useVendre((v) => v.reviews);
  const site = useVisi((v) => v.site);
  const t = THEMES[site.theme];
  const services = SERVICES[company.trade] ?? DEFAULT_SERVICES;
  const city = company.city.replace(/^\d+\s/, '') || 'votre ville';
  const avg = reviews.reduce((a, r) => a + r.rating, 0) / (reviews.length || 1);
  const works = chantiers.filter((c) => c.photos > 0).slice(0, mobile ? 4 : 6);
  const trade = company.trade === 'electricien' ? 'Électricien' : company.trade.charAt(0).toUpperCase() + company.trade.slice(1);
  const S = site.sections;
  const head = { fontFamily: t.font, letterSpacing: '-0.02em' };

  return (
    <div style={{ background: t.bg, color: t.ink }} className="text-left">
      <nav className={cn('flex items-center gap-3', mobile ? 'px-4 py-3' : 'px-10 py-4')} style={{ borderBottom: `1px solid ${t.surface}` }}>
        <span className="grid h-9 w-9 place-items-center rounded-lg text-[13px] font-bold" style={{ background: t.accent, color: t.accentInk }}>{company.logoInitials || 'BE'}</span>
        <span className="flex-1 truncate text-[15px] font-semibold" style={head}>{company.name}</span>
        {!mobile && ['Prestations', 'Réalisations', 'Avis', 'Contact'].map((l) => <span key={l} className="text-[13px]" style={{ color: t.sub }}>{l}</span>)}
        <span className={cn('flex items-center gap-1.5 rounded-full font-semibold', mobile ? 'h-9 px-3 text-[12px]' : 'h-10 px-4 text-[13px]')} style={{ background: t.accent, color: t.accentInk }}><Phone className="h-3.5 w-3.5" />{mobile ? 'Appeler' : company.phone}</span>
      </nav>

      <header style={{ background: t.hero }} className={cn(mobile ? 'px-5 pb-8 pt-8' : 'grid grid-cols-[1.1fr_1fr] items-center gap-10 px-10 pb-14 pt-14')}>
        <div>
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium" style={{ background: t.surface, color: t.sub }}>
            <Star className="h-3.5 w-3.5 fill-[#f59e0b] text-[#f59e0b]" />{avg.toFixed(1).replace('.', ',')} sur Google · {reviews.length} avis
          </div>
          <h1 className={cn('font-semibold leading-[1.08]', mobile ? 'text-[28px]' : 'text-[44px]')} style={head}>{trade} à {city} et alentours</h1>
          <p className={cn('mt-3 leading-relaxed', mobile ? 'text-[14px]' : 'text-[16px]')} style={{ color: t.sub }}>{site.tagline}</p>
          <div className={cn('mt-5 flex gap-2', mobile && 'flex-col')}>
            <span className="flex h-12 items-center justify-center rounded-xl px-5 text-[14px] font-semibold" style={{ background: t.accent, color: t.accentInk }}>Demander un devis gratuit</span>
            {S.rdv && <span className="flex h-12 items-center justify-center gap-2 rounded-xl px-5 text-[14px] font-medium" style={{ border: `1px solid ${t.sub}55` }}><CalendarCheck className="h-4 w-4" />Réserver une visite</span>}
          </div>
          <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1.5 text-[12.5px]" style={{ color: t.sub }}>
            {company.rge && <span className="flex items-center gap-1"><ShieldCheck className="h-4 w-4" style={{ color: t.accent }} />Certifié RGE</span>}
            <span className="flex items-center gap-1"><ShieldCheck className="h-4 w-4" style={{ color: t.accent }} />Garantie décennale</span>
            <span className="flex items-center gap-1"><Check className="h-4 w-4" style={{ color: t.accent }} />Devis sous 48 h</span>
          </div>
        </div>
        {!mobile && (
          <div className="grid grid-cols-2 gap-3" style={{ gridTemplateRows: '150px 150px' }}>
            {works.slice(0, 3).map((c, i) => (
              <div key={c.id} className={cn('overflow-hidden rounded-2xl', i === 0 && 'row-span-2')}>
                <PhotoArt art={artFor(c.id)} phase="apres" seed={c.id + 'site'} />
              </div>
            ))}
          </div>
        )}
      </header>

      {S.prestations && (
        <section className={mobile ? 'px-5 py-8' : 'px-10 py-12'}>
          <h2 className={cn('font-semibold', mobile ? 'text-[20px]' : 'text-[28px]')} style={head}>Ce que nous faisons</h2>
          <div className={cn('mt-5 grid gap-3', mobile ? 'grid-cols-1' : 'grid-cols-3')}>
            {services.map((sv) => (
              <div key={sv.title} className="rounded-2xl p-4" style={{ background: t.surface }}>
                <div className="text-[15px] font-semibold">{sv.title}</div>
                <div className="mt-1 text-[13px] leading-relaxed" style={{ color: t.sub }}>{sv.text}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {S.realisations && (
        <section className={mobile ? 'px-5 pb-8' : 'px-10 pb-12'}>
          <h2 className={cn('font-semibold', mobile ? 'text-[20px]' : 'text-[28px]')} style={head}>Nos derniers chantiers</h2>
          <div className={cn('mt-5 grid gap-3', mobile ? 'grid-cols-2' : 'grid-cols-3')}>
            {works.map((c) => (
              <figure key={c.id}>
                <div className="aspect-[4/3] overflow-hidden rounded-xl"><PhotoArt art={artFor(c.id)} phase={c.status === 'termine' ? 'apres' : 'pendant'} seed={c.id} /></div>
                <figcaption className="mt-1.5 truncate text-[12.5px]" style={{ color: t.sub }}>{c.name.split('·')[1]?.trim() ?? c.name} · {c.city}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {S.avis && (
        <section className={mobile ? 'px-5 pb-8' : 'px-10 pb-12'}>
          <h2 className={cn('font-semibold', mobile ? 'text-[20px]' : 'text-[28px]')} style={head}>Ils nous ont fait confiance</h2>
          <div className={cn('mt-5 grid gap-3', mobile ? 'grid-cols-1' : 'grid-cols-3')}>
            {reviews.slice(0, 3).map((r) => (
              <blockquote key={r.id} className="rounded-2xl p-4" style={{ background: t.surface }}>
                <div className="flex gap-0.5">{[1, 2, 3, 4, 5].map((i) => <Star key={i} className={cn('h-3.5 w-3.5', i <= r.rating ? 'fill-[#f59e0b] text-[#f59e0b]' : 'opacity-30')} />)}</div>
                <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed">« {r.text} »</p>
                <footer className="mt-2 text-[12px] font-medium" style={{ color: t.sub }}>{r.author}</footer>
              </blockquote>
            ))}
          </div>
        </section>
      )}

      {S.zone && (
        <section className={cn(mobile ? 'mx-5 mb-8 p-5' : 'mx-10 mb-12 p-8', 'rounded-2xl')} style={{ background: t.accent, color: t.accentInk }}>
          <div className={cn('font-semibold', mobile ? 'text-[18px]' : 'text-[24px]')} style={head}>Un projet ? Parlons-en.</div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] opacity-90">
            <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{city}, Lyon, Caluire, Bron, Vénissieux</span>
            <span className="flex items-center gap-1"><Phone className="h-4 w-4" />{company.phone}</span>
          </div>
        </section>
      )}

      <footer className={cn('text-[11.5px]', mobile ? 'px-5 pb-6' : 'px-10 pb-8')} style={{ color: t.sub }}>
        {company.legalName} · SIRET {company.siret} · {company.address}, {company.city} · Site créé avec Brix
      </footer>
    </div>
  );
}
