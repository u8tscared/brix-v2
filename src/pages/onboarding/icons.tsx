// Icônes de l'onboarding : métiers, départements, modules, priorités. Lucide, trait 1,75, choisies une à une.
import type { LucideIcon, LucideProps } from 'lucide-react';
import {
  AirVent, AudioLines, BadgeCheck, BellRing, Boxes, BrickWall, Building, Building2, Calculator, CalendarCheck, CalendarRange, Camera, Car,
  Circle, ClipboardCheck, Contact, CookingPot, CreditCard, DoorOpen, Drill, Droplets, FileSpreadsheet, FileText, FolderCheck, FolderLock,
  Globe, Grid3x3, Hammer, Handshake, HardHat, House, Inbox, KeyRound, Landmark, Layers, Megaphone, MonitorSmartphone, MoonStar,
  PaintRoller, Palmtree, PhoneCall, Plug, Receipt, Ruler, ScanLine, Share2, ShieldCheck, Star, Sunrise, Timer, Trees, Truck, User, Users,
  Wallet, Wrench, Zap, Factory,
} from 'lucide-react';
import type { TradeKey } from '@/lib/types';

/** Un pictogramme par métier, lisible à 18 px. */
export const TRADE_ICON: Record<TradeKey, LucideIcon> = {
  electricien: Zap,
  plombier: Droplets,
  peintre: PaintRoller,
  carreleur: Grid3x3,
  plaquiste: Layers,
  menuisier: DoorOpen,
  couvreur: House,
  macon: BrickWall,
  paysagiste: Trees,
  climaticien: AirVent,
  serrurier: KeyRound,
  cuisiniste: CookingPot,
  renovation: Hammer,
  autre: Drill,
};

/** Départements du menu (Visibilité : mégaphone plutôt que des étincelles). */
export const DEPT_ICON: Record<string, LucideIcon> = {
  vendre: Handshake, facturer: Wallet, chantiers: HardHat, equipe: Users, achats: Truck, bob: AudioLines, metier: Ruler, visibilite: Megaphone, gestion: Landmark,
};

const NAMED: Record<string, LucideIcon> = {
  AudioLines, BadgeCheck, BellRing, Boxes, Building2, Calculator, CalendarCheck, CalendarRange, Camera, Car, ClipboardCheck, Contact, CreditCard,
  FileSpreadsheet, FileText, FolderCheck, FolderLock, Globe, HardHat, Inbox, Landmark, Megaphone, MonitorSmartphone, MoonStar, Palmtree,
  PhoneCall, Plug, Receipt, Ruler, ScanLine, Share2, ShieldCheck, Star, Sunrise, Timer, Truck, Users, Wallet, Wrench, Zap,
};

export const SIZE_ICON = { solo: User, petite: Users, pme: Building, grande: Factory } as const;

/** Icône nommée du catalogue (modules, priorités), avec un cercle par défaut. */
export function Ico({ name, ...p }: { name: string } & LucideProps) {
  const C = NAMED[name] ?? Circle;
  return <C strokeWidth={1.75} aria-hidden {...p} />;
}

/** Teinte de chaque département, alignée sur DEPT_TONE du kit (refonte en cours) : on reconnaît un domaine d'un coup d'œil. */
export const TONE: Record<string, { fg: string; bg: string; ring: string }> = {
  vendre: { fg: '#6d28d9', bg: '#f3edff', ring: '#e4d8fd' },
  facturer: { fg: '#b0219f', bg: '#fcecfa', ring: '#f6d3f1' },
  chantiers: { fg: '#c2410c', bg: '#fff1e7', ring: '#fdd9bf' },
  equipe: { fg: '#0e7490', bg: '#e8f7fa', ring: '#c5e9f0' },
  achats: { fg: '#0f766e', bg: '#e7f6f3', ring: '#c4ebe3' },
  bob: { fg: '#15122a', bg: '#efeef4', ring: '#dfdce9' },
  metier: { fg: '#a16207', bg: '#fdf6e3', ring: '#f5e3b3' },
  visibilite: { fg: '#be123c', bg: '#fdecef', ring: '#f9d0d8' },
  gestion: { fg: '#3730a3', bg: '#eef0fd', ring: '#d9ddfa' },
};

/** Tuile d'icône teintée d'un département. */
export function Tile({ dept, name, size = 32, children }: { dept: string; name?: string; size?: number; children?: React.ReactNode }) {
  const t = TONE[dept] ?? TONE.bob;
  return (
    <span
      className="ob-tile"
      style={{ width: size, height: size, borderRadius: size * 0.3, background: t.bg, color: t.fg, boxShadow: `inset 0 0 0 1px ${t.ring}` }}
    >
      {children ?? (name ? <Ico name={name} style={{ width: size * 0.5, height: size * 0.5 }} /> : null)}
    </span>
  );
}
