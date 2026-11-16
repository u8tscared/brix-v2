import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Building2, MapPin } from 'lucide-react';
import { Badge, Button, Card, Progress } from '@/components/ui';
import { CHANTIER_STATUS } from '@/lib/status';
import type { ChantierStatus } from '@/lib/types';
import { placeOf } from '../../lib/geo';
import type { ChantierView } from '../../lib/useChantier';
import { MarginDelta, TeamAvatars } from '../common/bits';
import { periodLabel } from './ChantierTable';

const DOT: Record<ChantierStatus, string> = {
  en_cours: '#6d28d9',
  a_planifier: '#9898a8',
  en_pause: '#d97706',
  reception: '#1f389d',
  termine: '#16a34a',
};

const LABELS: [string, number, number][] = [
  ['Caluire', 212, 52],
  ['Villeurbanne', 300, 150],
  ['Lyon 6e', 236, 106],
  ['Lyon 3e', 246, 176],
  ['Lyon 7e', 222, 222],
  ['Lyon 2e', 170, 186],
  ['Bron', 330, 210],
  ['Vénissieux', 264, 270],
  ['Tassin', 96, 150],
];

/** Plan stylisé de l'agglomération (sans service de carte externe). */
export function ChantierMap({ rows }: { rows: ChantierView[] }) {
  const navigate = useNavigate();
  const [sel, setSel] = useState<string | null>(rows.find((r) => r.ch.status === 'en_cours')?.ch.id ?? rows[0]?.ch.id ?? null);
  const current = rows.find((r) => r.ch.id === sel);
  const depot = placeOf('Villeurbanne', 'depot');

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="relative overflow-hidden">
        <svg viewBox="0 0 400 300" className="block h-auto w-full" role="img" aria-label="Plan des chantiers">
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M20 0H0V20" fill="none" stroke="#efeef5" strokeWidth=".6" />
            </pattern>
          </defs>
          <rect width="400" height="300" fill="#fbfbfe" />
          <rect width="400" height="300" fill="url(#grid)" />
          {/* parcs */}
          <path d="M218 82 q 22 -10 34 6 q 6 16 -12 24 q -22 4 -26 -12 z" fill="#e3f4e8" />
          <path d="M120 146 q 18 -6 26 8 q 2 14 -14 16 q -16 -2 -12 -24 z" fill="#e3f4e8" />
          {/* périphérique */}
          <ellipse cx="214" cy="160" rx="132" ry="112" fill="none" stroke="#e7e5ef" strokeWidth="6" />
          <ellipse cx="214" cy="160" rx="132" ry="112" fill="none" stroke="#ffffff" strokeWidth="2" strokeDasharray="6 8" />
          {/* Rhône */}
          <path d="M400 70 C 330 78, 270 96, 214 120 S 196 180, 186 230 S 176 290, 170 300" fill="none" stroke="#cfe0fb" strokeWidth="11" strokeLinecap="round" />
          {/* Saône */}
          <path d="M150 0 C 170 40, 196 70, 184 110 S 156 160, 176 196 S 186 228, 186 232" fill="none" stroke="#cfe0fb" strokeWidth="8" strokeLinecap="round" />
          {LABELS.map(([t, x, y]) => (
            <text key={t} x={x} y={y} textAnchor="middle" fontSize="8.5" fill="#b4b3c3" fontFamily="Inter" letterSpacing=".04em">
              {t.toUpperCase()}
            </text>
          ))}
          {/* dépôt */}
          <g transform={`translate(${depot[0]} ${depot[1]})`}>
            <rect x="-7" y="-7" width="14" height="14" rx="3.5" fill="#17171f" />
            <path d="M-3 2 V-1 L0 -3.5 L3 -1 V2 Z" fill="#fff" />
          </g>
          {rows.map((v) => {
            const [x, y] = placeOf(v.ch.city, v.ch.id);
            const active = v.ch.id === sel;
            return (
              <g key={v.ch.id} transform={`translate(${x} ${y})`} className="cursor-pointer" onClick={() => setSel(v.ch.id)}>
                {v.ch.status === 'en_cours' && <circle r="11" fill={DOT[v.ch.status]} opacity=".12" />}
                <circle r={active ? 8 : 6} fill={DOT[v.ch.status]} stroke="#fff" strokeWidth="2.2" className="transition-all" />
                {active && (
                  <g>
                    <rect x="11" y="-10" width={Math.min(150, v.ch.name.length * 4.6 + 14)} height="20" rx="6" fill="#17171f" />
                    <text x="18" y="3.5" fontSize="9" fill="#fff" fontFamily="Inter" fontWeight="500">
                      {v.ch.name.length > 30 ? v.ch.name.slice(0, 29) + '…' : v.ch.name}
                    </text>
                  </g>
                )}
                <circle r="16" fill="transparent" />
              </g>
            );
          })}
        </svg>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line px-4 py-2.5 text-xs text-ink-2">
          {(Object.keys(DOT) as ChantierStatus[]).map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <i className="h-2 w-2 rounded-full" style={{ background: DOT[s] }} /> {CHANTIER_STATUS[s].label}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <Building2 className="h-3 w-3" /> Dépôt
          </span>
        </div>
      </Card>

      {current ? (
        <Card className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-[15px] font-semibold">{current.ch.name}</div>
              <div className="mt-0.5 flex items-center gap-1 text-[12.5px] text-ink-3">
                <MapPin className="h-3 w-3" /> {current.ch.address}, {current.ch.city}
              </div>
            </div>
            <Badge tone={CHANTIER_STATUS[current.ch.status].tone}>{CHANTIER_STATUS[current.ch.status].label}</Badge>
          </div>
          <dl className="mt-4 space-y-3 text-[13px]">
            <div className="flex items-center justify-between">
              <dt className="text-ink-2">Client</dt>
              <dd className="font-medium">{current.client?.name}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-ink-2">Période</dt>
              <dd className="num">{periodLabel(current)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-ink-2">Équipe</dt>
              <dd>
                <TeamAvatars team={current.team} size={24} />
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-ink-2">Marge</dt>
              <dd>
                <MarginDelta real={current.m.realMarginRate} planned={current.m.plannedMarginRate} />
              </dd>
            </div>
            <div>
              <div className="mb-1.5 flex justify-between text-ink-2">
                <span>Avancement</span>
                <span className="num font-medium text-ink">{current.ch.progress} %</span>
              </div>
              <Progress value={current.ch.progress} />
            </div>
          </dl>
          <Button className="mt-5 w-full" variant="primary" onClick={() => navigate(`/app/chantiers/${current.ch.id}`)}>
            Ouvrir le chantier <ArrowRight className="h-4 w-4" />
          </Button>
        </Card>
      ) : null}
    </div>
  );
}
