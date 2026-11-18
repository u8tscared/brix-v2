// Calculs électriques (NF C 15-100, méthode simplifiée).
// Courants admissibles : conducteurs cuivre isolés PVC, tableau 52H/B.52.12,
// méthode de référence B (sous conduit) et C (fixé sur paroi), 30 °C.

export type Metal = 'cuivre' | 'alu';
export type Phase = 'mono' | 'tri';
export type Pose = 'B' | 'C';

export const SECTIONS = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150];
export const BREAKERS = [2, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160];

// Iz cuivre PVC : [méthode][chargés 2 | 3]
const IZ_CU: Record<Pose, Record<2 | 3, number[]>> = {
  B: { 2: [17.5, 24, 32, 41, 57, 76, 101, 125, 151, 192, 232, 269, 309], 3: [15.5, 21, 28, 36, 50, 68, 89, 110, 134, 171, 207, 239, 275] },
  C: { 2: [19.5, 27, 36, 46, 63, 85, 112, 138, 168, 213, 258, 299, 344], 3: [17.5, 24, 32, 41, 57, 76, 96, 119, 144, 184, 223, 259, 299] },
};
const ALU_FACTOR = 0.78; // ordre de grandeur alu / cuivre à section égale

export const RHO: Record<Metal, number> = { cuivre: 0.0225, alu: 0.036 }; // Ω·mm²/m en service (ρ1)
export const LAMBDA = 0.00008; // Ω/m, réactance linéique

export function current(powerW: number, phase: Phase, cosPhi: number) {
  return phase === 'mono' ? powerW / (230 * cosPhi) : powerW / (Math.sqrt(3) * 400 * cosPhi);
}

/** Chute de tension en % (U0 = 230 V). b = 2 en mono, 1 en tri. */
export function dropPct(I: number, L: number, S: number, metal: Metal, phase: Phase, cosPhi: number) {
  const b = phase === 'mono' ? 2 : 1;
  const sin = Math.sqrt(Math.max(0, 1 - cosPhi * cosPhi));
  const du = b * (RHO[metal] * (L / S) * cosPhi + LAMBDA * L * sin) * I;
  return (du / 230) * 100;
}

// Locaux d'habitation : correspondance section / calibre maximal (NF C 15-100, partie 10).
const HABITAT: Record<number, number> = { 1.5: 16, 2.5: 20, 4: 25, 6: 32 };

export const iz = (S: number, metal: Metal, phase: Phase, pose: Pose) => {
  const i = SECTIONS.indexOf(S);
  const base = IZ_CU[pose][phase === 'mono' ? 2 : 3][i] ?? 0;
  const v = metal === 'cuivre' ? base : base * ALU_FACTOR;
  return metal === 'cuivre' && HABITAT[S] ? Math.min(v, HABITAT[S]) : v;
};

export const breakerFor = (I: number) => BREAKERS.find((b) => b >= I) ?? BREAKERS[BREAKERS.length - 1];

export interface CableResult {
  I: number;
  In: number;
  sThermal: number;
  sDrop: number;
  section: number;
  drop: number;
  limit: number;
  table: { S: number; iz: number; drop: number; ok: boolean }[];
}

export function sizeCable(p: { powerW: number; length: number; metal: Metal; phase: Phase; pose: Pose; cosPhi: number; limitPct: number; minSection?: number }): CableResult {
  const I = current(p.powerW, p.phase, p.cosPhi);
  const In = breakerFor(I);
  const candidates = SECTIONS.filter((S) => (p.metal === 'alu' ? S >= 16 : true) && S >= (p.minSection ?? 0));
  const sThermal = candidates.find((S) => iz(S, p.metal, p.phase, p.pose) >= In) ?? candidates[candidates.length - 1];
  const sDrop = candidates.find((S) => dropPct(I, p.length, S, p.metal, p.phase, p.cosPhi) <= p.limitPct) ?? candidates[candidates.length - 1];
  const section = Math.max(sThermal, sDrop);
  const table = candidates.slice(0, 9).map((S) => {
    const d = dropPct(I, p.length, S, p.metal, p.phase, p.cosPhi);
    const z = iz(S, p.metal, p.phase, p.pose);
    return { S, iz: z, drop: d, ok: z >= In && d <= p.limitPct };
  });
  return { I, In, sThermal, sDrop, section, drop: dropPct(I, p.length, section, p.metal, p.phase, p.cosPhi), limit: p.limitPct, table };
}

/** Prix indicatifs HT au mètre (R2V cuivre). */
export function cablePrice(S: number, phase: Phase, metal: Metal) {
  const base: Record<number, number> = { 1.5: 1.2, 2.5: 2.35, 4: 3.6, 6: 5.4, 10: 9.5, 16: 14.5, 25: 22, 35: 30, 50: 41, 70: 56, 95: 74, 120: 92, 150: 112 };
  const p = (base[S] ?? 20) * (phase === 'tri' ? 1.6 : 1);
  return Math.round((metal === 'alu' ? p * 0.55 : p) * 100) / 100;
}

export const fmtS = (S: number) => String(S).replace('.', ',');
