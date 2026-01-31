import { NavLink } from 'react-router-dom';
import {
  Wallet,
  Send,
  Rocket,
  PenLine,
  KeyRound,
  Database,
  Key,
  History,
  Menu,
  X,
  Book,
  Github,
} from 'lucide-react';
import { useState, createContext, useContext } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
}

interface NavGroup {
  title?: string;
  items: NavItem[];
}

const navigationGroups: NavGroup[] = [
  {
    items: [{ to: '/wallet', label: 'Get Started', icon: Wallet }],
  },
  {
    title: 'Transactions',
    items: [
      { to: '/execute', label: 'Execute', icon: Send },
      { to: '/deploy', label: 'Deploy', icon: Rocket },
    ],
  },
  {
    title: 'Signatures',
    items: [{ to: '/sign', label: 'Sign Message', icon: PenLine }],
  },
  {
    title: 'Data',
    items: [
      { to: '/records', label: 'Records', icon: Database },
      { to: '/decrypt', label: 'Decrypt', icon: KeyRound },
      { to: '/view-keys', label: 'View Keys', icon: Key },
      { to: '/history', label: 'Tx History', icon: History },
    ],
  },
];

// Context for closing sidebar on mobile navigation
const SidebarContext = createContext<{ closeMobile: () => void }>({ closeMobile: () => {} });

function NavItemComponent({ item }: { item: NavItem }) {
  const Icon = item.icon;
  const { closeMobile } = useContext(SidebarContext);

  return (
    <NavLink
      to={item.to}
      onClick={closeMobile}
      className={({ isActive }) =>
        cn(
          'body-m flex items-center gap-3 rounded-lg px-3 py-2 transition-colors',
          isActive
            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
        )
      }
    >
      <Icon className="h-4 w-4" />
      {item.label}
    </NavLink>
  );
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = () => setMobileOpen(false);

  return (
    <SidebarContext.Provider value={{ closeMobile }}>
      {/* Mobile menu button - shown in header on mobile */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden fixed top-3 left-3 z-50"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-overlay z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - hidden on mobile by default, always visible on desktop */}
      <aside
        className={cn(
          'fixed md:relative inset-y-0 left-0 z-40 w-64 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-200 ease-in-out',
          // Mobile: slide in/out, Desktop: always visible
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        {/* Logo/Brand */}
        <div className="h-14 flex items-center px-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <img src="/assets/icon_aleo.svg" alt="Aleo" className="h-7 w-7 shrink-0" />
            <div className="flex flex-col">
              <span className="label-xs text-sidebar-foreground/50 leading-tight">
                Aleo Dev Toolkit
              </span>
              <span className="body-m-bold text-sidebar-foreground leading-tight">
                Wallet Adapter
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          {navigationGroups.map((group, index) => (
            <div key={index}>
              {group.title && (
                <h3 className="label-xs px-3 text-sidebar-foreground/50 mb-2">{group.title}</h3>
              )}
              <div className="space-y-1">
                {group.items.map(item => (
                  <NavItemComponent key={item.to} item={item} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border space-y-3">
          <div className="flex items-center justify-center gap-4">
            <a
              href="https://aleo-dev-toolkit-documentation.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
              title="Documentation"
            >
              <Book className="h-4 w-4" />
              <span className="label-xs">Docs</span>
            </a>
            <a
              href="https://github.com/ProvableHQ/aleo-dev-toolkit"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
              title="GitHub"
            >
              <Github className="h-4 w-4" />
              <span className="label-xs">GitHub</span>
            </a>
          </div>
          <p className="label-xs text-sidebar-foreground/50 text-center">Wallet Adapter Demo</p>
        </div>
      </aside>
    </SidebarContext.Provider>
  );
}
