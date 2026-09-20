import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, HelpCircle, LogOut, Settings, X } from 'lucide-react';
import { institutionalNavigation, primaryNavigation } from '../../data/navigation';
import type { NavigationKey, UserRole } from '../../types/shell';
import { RoleSummary } from './RoleLanguageControls';

type AppSidebarProps = {
  activeKey: NavigationKey;
  role: UserRole;
  collapsed: boolean;
  mobileOpen: boolean;
  onNavigate: (key: NavigationKey) => void;
  onCollapseToggle: () => void;
  onMobileClose: () => void;
};

export function AppSidebar({
  activeKey,
  role,
  collapsed,
  mobileOpen,
  onNavigate,
  onCollapseToggle,
  onMobileClose,
}: AppSidebarProps) {
  return (
    <>
      <AnimatePresence>
        {mobileOpen && (
          <motion.button
            type="button"
            className="fixed inset-0 z-40 bg-obsidian-950/50 backdrop-blur-sm lg:hidden"
            aria-label="Fermer le menu principal"
            onClick={onMobileClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>

      <aside
        className={[
          'fixed inset-y-0 left-0 z-50 flex w-[286px] flex-col border-r border-cream-300/80 bg-cream-50 px-3 py-4 shadow-soft transition-transform duration-300 dark:border-obsidian-700 dark:bg-obsidian-950 lg:static lg:z-auto lg:translate-x-0 lg:shadow-none',
          collapsed ? 'lg:w-[88px]' : 'lg:w-[286px]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
        aria-label="Navigation principale"
      >
        <div className="mb-5 flex items-center justify-between px-2 lg:justify-end">
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-obsidian-600 dark:text-cream-300 lg:hidden">Menu</span>
          <button type="button" className="ag-button-ghost min-h-10 min-w-10 px-2.5 lg:hidden" onClick={onMobileClose} aria-label="Fermer le menu">
            <X className="h-4 w-4" />
          </button>
          <button type="button" className="ag-button-ghost hidden min-h-10 min-w-10 px-2.5 lg:inline-flex" onClick={onCollapseToggle} aria-label={collapsed ? 'Déployer la barre latérale' : 'Réduire la barre latérale'}>
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-1">
          <SidebarGroup label="Espace de travail" collapsed={collapsed}>
            {primaryNavigation.map((item) => (
              <SidebarItem key={item.key} item={item} active={activeKey === item.key} collapsed={collapsed} onClick={() => { onNavigate(item.key); onMobileClose(); }} />
            ))}
          </SidebarGroup>

          {(role === 'institution' || !collapsed) && (
            <SidebarGroup label="Gouvernance" collapsed={collapsed}>
              {institutionalNavigation.map((item) => (
                <SidebarItem key={item.key} item={item} active={activeKey === item.key} collapsed={collapsed} onClick={() => { onNavigate(item.key); onMobileClose(); }} />
              ))}
            </SidebarGroup>
          )}
        </nav>

        <div className="mt-4 space-y-3 border-t border-cream-300/80 pt-4 dark:border-obsidian-700">
          {!collapsed && <RoleSummary role={role} />}
          <div className={collapsed ? 'space-y-1' : 'grid grid-cols-2 gap-1'}>
            <SidebarUtility icon={HelpCircle} label="Aide" collapsed={collapsed} />
            <SidebarUtility icon={Settings} label="Réglages" collapsed={collapsed} />
          </div>
          <SidebarUtility icon={LogOut} label="Se déconnecter" collapsed={collapsed} danger />
        </div>
      </aside>
    </>
  );
}

function SidebarGroup({ label, collapsed, children }: { label: string; collapsed: boolean; children: React.ReactNode }) {
  return (
    <div>
      {!collapsed && <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-obsidian-600 dark:text-cream-300">{label}</p>}
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function SidebarItem({ item, active, collapsed, onClick }: { item: (typeof primaryNavigation)[number]; active: boolean; collapsed: boolean; onClick: () => void }) {
  const Icon = item.icon;
  return (
    <button type="button" onClick={onClick} className={['group flex min-h-[52px] w-full items-center gap-3 rounded-control px-3 text-left transition duration-200', active ? 'bg-territory-900 text-white shadow-soft dark:bg-territory-500 dark:text-obsidian-950' : 'text-obsidian-700 hover:bg-territory-500/10 dark:text-cream-200 dark:hover:bg-white/10'].join(' ')} aria-current={active ? 'page' : undefined} title={collapsed ? item.label : undefined}>
      <Icon className={['h-5 w-5 shrink-0', active ? 'text-gold-300 dark:text-obsidian-950' : 'text-territory-700 dark:text-territory-300'].join(' ')} />
      {!collapsed && (
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold">{item.label}</span>
          <span className={['mt-0.5 block truncate text-[11px]', active ? 'text-white/70 dark:text-obsidian-950/70' : 'text-obsidian-600 dark:text-cream-300'].join(' ')}>{item.description}</span>
        </span>
      )}
      {!collapsed && item.badge && <span className={['rounded-full px-2 py-0.5 text-[10px] font-bold', item.badge === 'Urgent' ? 'bg-danger-500 text-white' : active ? 'bg-white/15 text-white' : 'bg-territory-500/10 text-territory-700 dark:text-territory-300'].join(' ')}>{item.badge}</span>}
    </button>
  );
}

function SidebarUtility({ icon: Icon, label, collapsed, danger = false }: { icon: typeof HelpCircle; label: string; collapsed: boolean; danger?: boolean }) {
  return (
    <button type="button" className={['flex min-h-10 items-center gap-2 rounded-control px-3 text-left text-xs font-semibold transition hover:bg-territory-500/10', collapsed ? 'w-full justify-center' : 'w-full', danger ? 'text-danger-600 dark:text-danger-500' : 'text-obsidian-600 dark:text-cream-300'].join(' ')} title={collapsed ? label : undefined}>
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span>{label}</span>}
    </button>
  );
}
