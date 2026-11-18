// Frise de la relation client : devis, factures et chantiers posés sur le temps, d'un coup d'œil.

import { useNavigate } from 'react-router-dom';
import { FileText, HardHat, History, Receipt } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardHeader, cn, IconTile } from '@/components/ui';
import { dateShort, money, todayISO, totals } from '@/lib/format';
import type { Chantier, Devis, Facture } from '@/lib/types';

interface Point { at: string; icon: LucideIcon; label: string; sub: string; tone: string; to: string; row: 0 | 1 }

const t = (iso: string) => new Date(iso.slice(0, 10) + 'T12:00:00').getTime();

export function ClientFrise({ devis, factures, chantiers }: { devis: Devis[]; factures: Facture[]; chantiers: Chantier[] }) {
  const navigate = useNavigate();
  const points: Point[] = [
    ...devis.map((d) => ({ at: d.signedAt ?? d.sentAt ?? d.createdAt, icon: FileText, label: `Devis ${d.number}`, sub: `${money(totals(d.lines).ht, true)} HT${d.status === 'signe' ? ', signé' : ''}`, tone: d.status === 'signe' ? '#7c3aed' : '#b8b3cc', to: `/app/devis/${d.id}`, row: 0 as const })),
    ...factures.map((f) => ({ at: f.issueDate, icon: Receipt, label: `Facture ${f.number}`, sub: `${money(totals(f.lines).ttc, true)} TTC${f.status === 'payee' ? ', payée' : ''}`, tone: f.status === 'payee' ? '#10b981' : f.status === 'en_retard' ? '#f43f5e' : '#d946ef', to: `/app/factures/${f.id}`, row: 1 as const })),
  ];
  if (!points.length && !chantiers.length) return null;

  const all = [...points.map((p) => p.at), ...chantiers.flatMap((c) => [c.startDate, c.endDate]), todayISO()].map(t);
  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = Math.max(1, max - min);
  const pos = (iso: string) => 13 + ((t(iso) - min) / span) * 84;
  const months: { x: number; label: string }[] = [];
  const DAY = 86400000;
  if (span < 75 * DAY) {
    // Période courte : un repère par semaine.
    for (let x = min + 7 * DAY; x < max; x += 7 * DAY) months.push({ x: pos(new Date(x).toISOString()), label: dateShort(new Date(x).toISOString().slice(0, 10)) });
  } else {
    const d = new Date(min);
    d.setDate(1);
    d.setMonth(d.getMonth() + 1);
    while (d.getTime() < max) {
      months.push({ x: pos(d.toISOString()), label: d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '') });
      d.setMonth(d.getMonth() + 1);
    }
  }
  const step = Math.ceil(months.length / 8);

  return (
    <Card>
      <CardHeader icon={<IconTile icon={<History />} tone="indigo" size="sm" />} title="Votre histoire avec ce client" meta={`depuis ${dateShort(new Date(min).toISOString().slice(0, 10))}`} />
      <div className="overflow-x-auto scrollbar-none">
        <div className="relative mx-4 h-[200px] min-w-[560px] md:mx-6">
          {/* mois */}
          {months.filter((_, i) => i % step === 0).map((m) => (
            <span key={m.x} className="absolute bottom-0 top-3 border-l border-dashed border-halo-line" style={{ left: `${m.x}%` }}>
              <span className="absolute bottom-1 left-1 whitespace-nowrap text-[10.5px] font-medium text-ink-3">{m.label}</span>
            </span>
          ))}
          {/* rangées */}
          {[
            { y: 46, label: 'Devis', icon: FileText },
            { y: 90, label: 'Factures', icon: Receipt },
            { y: 134, label: 'Chantiers', icon: HardHat },
          ].map((r) => (
            <span key={r.label} className="absolute inset-x-0 h-px bg-halo-line" style={{ top: r.y + 13 }}>
              <span className="absolute -top-2 left-0 flex items-center gap-1 bg-white pr-1.5 text-[10.5px] font-medium text-ink-3">
                <r.icon className="h-3 w-3" /> {r.label}
              </span>
            </span>
          ))}
          {/* chantiers : barres */}
          {chantiers.map((c, i) => (
            <button
              key={c.id}
              onClick={() => navigate(`/app/chantiers/${c.id}`)}
              title={`${c.name} : ${dateShort(c.startDate)} au ${dateShort(c.endDate)}`}
              className="group absolute h-[26px] origin-left animate-grow overflow-hidden rounded-full bg-pale-p shadow-[inset_0_0_0_1px_#fdd9bf] transition hover:shadow-[inset_0_0_0_1.5px_#fb923c]"
              style={{ top: 134, left: `${pos(c.startDate)}%`, width: `${Math.max(3, pos(c.endDate) - pos(c.startDate))}%`, animationDelay: `${0.2 + i * 0.08}s` }}
            >
              <span className="absolute inset-y-0 left-0 rounded-full bg-[#fb923c]/70" style={{ width: `${c.progress}%` }} />
              <span className="relative flex h-full items-center gap-1 px-2 text-[11px] font-medium text-deep-p">
                <HardHat className="h-3 w-3 shrink-0" />
                <span className="truncate">{c.name.split(' · ')[0]}</span>
              </span>
            </button>
          ))}
          {/* devis et factures : pastilles */}
          {points.map((p, i) => (
            <button
              key={p.label + i}
              onClick={() => navigate(p.to)}
              className="group absolute -translate-x-1/2 animate-[pop_.45s_var(--ease)_both]"
              style={{ top: p.row === 0 ? 46 : 90, left: `${pos(p.at)}%`, animationDelay: `${0.15 + i * 0.05}s` }}
              aria-label={`${p.label}, ${p.sub}`}
            >
              <span className="grid h-[26px] w-[26px] place-items-center rounded-full bg-white text-white shadow-[0_4px_10px_-3px_rgba(60,30,120,.35)] ring-[3px] ring-white transition-transform duration-300 ease-spring group-hover:scale-125" style={{ background: p.tone }}>
                <p.icon className="h-3 w-3" strokeWidth={2.2} />
              </span>
              <span className={cn('pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-[10px] bg-ink px-2.5 py-1.5 text-left text-[11.5px] text-white opacity-0 shadow-pop transition duration-150 group-hover:opacity-100')}>
                <b className="font-semibold">{p.label}</b> · {p.sub}
                <span className="block text-white/60">{dateShort(p.at.slice(0, 10))}</span>
              </span>
            </button>
          ))}
          {/* aujourd'hui */}
          <span className="absolute bottom-5 top-0 w-px bg-gradient-to-b from-[#d946ef] to-transparent" style={{ left: `${pos(todayISO())}%` }}>
            <span className="absolute -left-[3.5px] -top-0.5 h-2 w-2 rounded-full bg-[#d946ef] shadow-[0_0_0_3px_#fce8fd]" />
          </span>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-halo-line px-4 py-3 text-[11.5px] text-ink-2 md:px-6">
        {[
          ['#7c3aed', 'Devis signé'],
          ['#b8b3cc', 'Devis en attente'],
          ['#10b981', 'Facture payée'],
          ['#d946ef', 'Facture envoyée'],
          ['#fb923c', 'Chantier'],
        ].map(([c, l]) => (
          <span key={l} className="flex items-center gap-1.5">
            <i className="h-2 w-2 rounded-full" style={{ background: c }} />
            {l}
          </span>
        ))}
      </div>
    </Card>
  );
}
