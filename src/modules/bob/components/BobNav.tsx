import { NavLink } from 'react-router-dom';
import { Icon, cn } from '@/components/ui';
import { useBrix } from '@/lib/store';
import type { ModuleKey } from '@/lib/catalog';

const ITEMS: { to: string; label: string; icon: string; module: ModuleKey }[] = [
  { to: '/app/bob', label: 'Bob', icon: 'AudioLines', module: 'bob' },
  { to: '/app/bob/brief', label: 'Brief du matin', icon: 'Sunrise', module: 'brief' },
  { to: '/app/bob/nuit', label: 'Agent de nuit', icon: 'MoonStar', module: 'agent_nuit' },
  { to: '/app/bob/secretaire', label: 'Secrétaire', icon: 'PhoneCall', module: 'secretaire' },
  { to: '/app/bob/mcp', label: 'Brix AI MCP', icon: 'Plug', module: 'mcp' },
];

/** Onglets entre les écrans de Bob (seulement les modules actifs). */
export function BobNav() {
  const enabled = useBrix((s) => s.enabled);
  const items = ITEMS.filter((i) => i.module === 'bob' || enabled.includes(i.module));
  if (items.length < 2) return null;
  return (
    <nav className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 scrollbar-none md:mx-0 md:px-0">
      {items.map((i) => (
        <NavLink
          key={i.to}
          to={i.to}
          end
          className={({ isActive }) =>
            cn('flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition duration-300 ease-spring', isActive ? 'bg-white text-ink shadow-pill' : 'text-ink-2 hover:bg-white/70 hover:text-ink')
          }
        >
          <Icon name={i.icon} className="h-3.5 w-3.5" />
          {i.label}
        </NavLink>
      ))}
    </nav>
  );
}
