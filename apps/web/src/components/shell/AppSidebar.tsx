import { AnimatePresence, motion } from 'framer-motion';
import { Activity, ChevronLeft, ChevronRight, CircleHelp, LogOut, MapPin, Settings2, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { institutionalNavigation, primaryNavigation, roleLabels, roleNavigation, roleNavigationLabels } from '../../data/navigation';
import type { NavigationKey, UserRole } from '../../types/shell';
import { BrandLogo } from '../brand/BrandLogo';

type AppSidebarProps = {
  activeKey: NavigationKey;
  role: UserRole;
  name: string;
  initials: string;
  collapsed: boolean;
  mobileOpen: boolean;
  onNavigate: (key: NavigationKey) => void;
  onCollapseToggle: () => void;
  onMobileClose: () => void;
  onHelp: () => void;
  onSettings: () => void;
  onLogout: () => void;
};

export function AppSidebar({ activeKey, role, name, initials, collapsed, mobileOpen, onNavigate, onCollapseToggle, onMobileClose, onHelp, onSettings, onLogout }: AppSidebarProps) {
  const sidebarRef = useRef<HTMLElement>(null);
  const compact = collapsed && !mobileOpen;
  const navigation = roleNavigation[role];
  const showInstitutional = role === 'institution' && navigation.every((item) => item.key !== 'institutional');
  useEffect(() => {
    if (!mobileOpen) return;
    const sidebar = sidebarRef.current;
    if (!sidebar) return;
    const workspace = document.querySelector<HTMLElement>('.agri-workspace');
    const previousWorkspaceOverflow = workspace?.style.overflowY ?? '';
    const previousWorkspaceScrollTop = workspace?.scrollTop ?? 0;
    if (workspace) workspace.style.overflowY = 'hidden';
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const getFocusable = () => Array.from(sidebar.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])')).filter((element) => element.getClientRects().length > 0 && element.getAttribute('aria-hidden') !== 'true');
    const focusable = getFocusable();
    focusable[0]?.focus();
    const keepFocusInSidebar = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const currentFocusable = getFocusable();
      if (!currentFocusable.length) { event.preventDefault(); sidebar.focus(); return; }
      const first = currentFocusable[0];
      const last = currentFocusable[currentFocusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !sidebar.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !sidebar.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keepFocusInSidebar);
    return () => {
      document.removeEventListener('keydown', keepFocusInSidebar);
      if (workspace) {
        workspace.style.overflowY = previousWorkspaceOverflow;
        workspace.scrollTop = previousWorkspaceScrollTop;
      }
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [mobileOpen]);
  return <>
    <AnimatePresence>{mobileOpen && <motion.button type="button" className="agri-mobile-scrim" aria-label="Fermer le menu" onClick={onMobileClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />}</AnimatePresence>
    <aside ref={sidebarRef} id="agri-sidebar" className={['agri-sidebar', compact ? 'agri-sidebar-collapsed' : '', mobileOpen ? 'agri-sidebar-open' : ''].join(' ')} role={mobileOpen ? 'dialog' : undefined} aria-modal={mobileOpen || undefined} aria-label="Navigation principale" tabIndex={-1}>
      <div className="agri-sidebar-top">
        <div className="agri-brand"><BrandLogo showName={!compact} descriptor="CONSEIL · TERRITOIRES" /><button type="button" className="agri-sidebar-close" onClick={onMobileClose} aria-label="Fermer le menu"><X className="h-4 w-4" /></button></div>
        {!compact && <div className="agri-sidebar-territory"><span className="agri-territory-icon"><MapPin className="h-4 w-4" /></span><span className="agri-territory-copy"><small>VOTRE TERRITOIRE</small><strong>Ouagadougou <i>·</i> Burkina Faso</strong></span><span className="agri-territory-pulse" aria-label="Zone active" /> </div>}
        {compact && <div className="agri-sidebar-territory agri-sidebar-territory-compact" title="Ouagadougou · Burkina Faso"><span className="agri-territory-icon"><MapPin className="h-4 w-4" /></span><span className="agri-territory-pulse" /></div>}
      </div>
      <div className="agri-sidebar-scroll">
        <SidebarGroup label={roleNavigationLabels[role]} collapsed={compact}>{navigation.map((item, index) => <SidebarItem key={`${item.key}-${role}`} item={item} active={activeKey === item.key} collapsed={compact} index={index} onClick={() => { onNavigate(item.key); onMobileClose(); }} />)}</SidebarGroup>
        {showInstitutional && <SidebarGroup label="Pilotage national" collapsed={compact}>{institutionalNavigation.map((item, index) => <SidebarItem key={item.key} item={item} active={activeKey === item.key} collapsed={compact} index={index + navigation.length} onClick={() => { onNavigate(item.key); onMobileClose(); }} />)}</SidebarGroup>}
      </div>
      <div className="agri-sidebar-footer">
        <div className="agri-sidebar-network"><span className="agri-network-mark"><Activity className="h-4 w-4" /></span><span className="agri-network-copy">{!compact && <><strong>Réseau AgriExpert</strong><small>Producteurs et spécialistes</small></>}</span>
        </div>
        <div className="agri-sidebar-tools"><button type="button" title="Aide" aria-label="Aide" onClick={onHelp}><CircleHelp className="h-4 w-4" />{!compact && 'Centre d’aide'}</button><button type="button" title="Réglages" aria-label="Réglages" onClick={onSettings}><Settings2 className="h-4 w-4" />{!compact && 'Réglages'}</button></div>
        {!compact && <div className="agri-sidebar-account"><span className="agri-sidebar-avatar" aria-hidden="true">{initials}</span><span><strong>{name}</strong><small>{roleLabels[role]} · Espace sécurisé</small></span><button type="button" className="agri-sidebar-logout" title="Se déconnecter" aria-label="Se déconnecter" onClick={onLogout}><LogOut className="h-4 w-4" /></button></div>}
        {compact && <button type="button" className="agri-sidebar-logout agri-sidebar-logout-compact" title="Se déconnecter" aria-label="Se déconnecter" onClick={onLogout}><LogOut className="h-4 w-4" /></button>}
        <button type="button" className="agri-sidebar-collapse" onClick={onCollapseToggle} aria-label={collapsed ? 'Déployer le menu' : 'Réduire le menu'} title={collapsed ? 'Déployer le menu' : 'Réduire le menu'}>{collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />} {!compact && 'Réduire'}</button>
      </div>
    </aside>
  </>;
}

function SidebarGroup({ label, collapsed, children }: { label: string; collapsed: boolean; children: React.ReactNode }) {
  return <section className="agri-sidebar-group">{!collapsed && <p>{label}</p>}<div>{children}</div></section>;
}

function SidebarItem({ item, active, collapsed, index, onClick }: { item: (typeof primaryNavigation)[number]; active: boolean; collapsed: boolean; index: number; onClick: () => void }) {
  const Icon = item.icon;
  return <motion.button type="button" onClick={onClick} className={['agri-sidebar-item', active ? 'agri-sidebar-item-active' : ''].join(' ')} aria-current={active ? 'page' : undefined} aria-label={collapsed ? item.label : undefined} title={collapsed ? item.label : undefined} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .22, delay: index * .035 }} whileTap={{ scale: .98 }}><span className="agri-sidebar-item-icon"><Icon className="h-[17px] w-[17px]" /></span>{!collapsed && <span className="agri-sidebar-item-content"><strong>{item.label}</strong><small>{item.description}</small></span>}{!collapsed && item.badge && <span className={item.badge === 'Urgent' ? 'agri-sidebar-badge agri-sidebar-badge-danger' : 'agri-sidebar-badge'}>{item.badge}</span>}</motion.button>;
}
