import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, CircleHelp, Leaf, LogOut, Settings2, X } from 'lucide-react';
import { institutionalNavigation, primaryNavigation } from '../../data/navigation';
import type { NavigationKey, UserRole } from '../../types/shell';

type AppSidebarProps = {
  activeKey: NavigationKey;
  role: UserRole;
  collapsed: boolean;
  mobileOpen: boolean;
  onNavigate: (key: NavigationKey) => void;
  onCollapseToggle: () => void;
  onMobileClose: () => void;
};

export function AppSidebar({ activeKey, role, collapsed, mobileOpen, onNavigate, onCollapseToggle, onMobileClose }: AppSidebarProps) {
  return <>
    <AnimatePresence>{mobileOpen && <motion.button type="button" className="agri-mobile-scrim" aria-label="Fermer le menu" onClick={onMobileClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />}</AnimatePresence>
    <aside className={['agri-sidebar', collapsed ? 'agri-sidebar-collapsed' : '', mobileOpen ? 'agri-sidebar-open' : ''].join(' ')} aria-label="Navigation principale">
      <div className="agri-brand"><div className="agri-brand-mark"><Leaf className="h-5 w-5" /><span>+</span></div>{!collapsed && <div className="agri-brand-copy"><strong>AGRIEXPERT</strong><small>PRO · TERRITOIRES</small></div>}<button type="button" className="agri-sidebar-close" onClick={onMobileClose} aria-label="Fermer le menu"><X className="h-4 w-4" /></button></div>
      <div className="agri-sidebar-scroll">
        <SidebarGroup label="Espace de travail" collapsed={collapsed}>{primaryNavigation.map((item) => <SidebarItem key={item.key} item={item} active={activeKey === item.key} collapsed={collapsed} onClick={() => { onNavigate(item.key); onMobileClose(); }} />)}</SidebarGroup>
        {(role === 'institution' || !collapsed) && <SidebarGroup label="Gouvernance" collapsed={collapsed}>{institutionalNavigation.map((item) => <SidebarItem key={item.key} item={item} active={activeKey === item.key} collapsed={collapsed} onClick={() => { onNavigate(item.key); onMobileClose(); }} />)}</SidebarGroup>}
      </div>
      <div className="agri-sidebar-footer"><div className="agri-sidebar-status"><span /><div>{!collapsed && <><strong>Services opérationnels</strong><small>Dernière synchronisation · à l’instant</small></>}</div></div><div className="agri-sidebar-tools"><button type="button" title="Aide"><CircleHelp className="h-4 w-4" />{!collapsed && 'Aide'}</button><button type="button" title="Réglages"><Settings2 className="h-4 w-4" />{!collapsed && 'Réglages'}</button></div><button type="button" className="agri-sidebar-logout" title="Se déconnecter"><LogOut className="h-4 w-4" />{!collapsed && 'Se déconnecter'}</button><button type="button" className="agri-sidebar-collapse" onClick={onCollapseToggle} aria-label={collapsed ? 'Déployer le menu' : 'Réduire le menu'}>{collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />} {!collapsed && 'Réduire le menu'}</button></div>
    </aside>
  </>;
}

function SidebarGroup({ label, collapsed, children }: { label: string; collapsed: boolean; children: React.ReactNode }) {
  return <section className="agri-sidebar-group">{!collapsed && <p>{label}</p>}<div>{children}</div></section>;
}

function SidebarItem({ item, active, collapsed, onClick }: { item: (typeof primaryNavigation)[number]; active: boolean; collapsed: boolean; onClick: () => void }) {
  const Icon = item.icon;
  return <button type="button" onClick={onClick} className={['agri-sidebar-item', active ? 'agri-sidebar-item-active' : ''].join(' ')} aria-current={active ? 'page' : undefined} title={collapsed ? item.label : undefined}><span className="agri-sidebar-item-icon"><Icon className="h-[17px] w-[17px]" /></span>{!collapsed && <span className="agri-sidebar-item-content"><strong>{item.label}</strong><small>{item.description}</small></span>}{!collapsed && item.badge && <span className={item.badge === 'Urgent' ? 'agri-sidebar-badge agri-sidebar-badge-danger' : 'agri-sidebar-badge'}>{item.badge}</span>}</button>;
}
