import { AnimatePresence, motion } from 'framer-motion';
import { Activity, ChevronLeft, ChevronRight, CircleHelp, LogOut, MapPin, Settings2, Siren, X } from 'lucide-react';
import { institutionalNavigation, primaryNavigation, roleLabels } from '../../data/navigation';
import type { NavigationKey, UserRole } from '../../types/shell';
import { BrandLogo } from '../brand/BrandLogo';

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
  const compact = collapsed && !mobileOpen;
  return <>
    <AnimatePresence>{mobileOpen && <motion.button type="button" className="agri-mobile-scrim" aria-label="Fermer le menu" onClick={onMobileClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />}</AnimatePresence>
    <aside className={['agri-sidebar', compact ? 'agri-sidebar-collapsed' : '', mobileOpen ? 'agri-sidebar-open' : ''].join(' ')} aria-label="Navigation principale">
      <div className="agri-sidebar-top">
        <div className="agri-brand"><BrandLogo showName={!compact} descriptor="CONSEIL · TERRITOIRES" /><button type="button" className="agri-sidebar-close" onClick={onMobileClose} aria-label="Fermer le menu"><X className="h-4 w-4" /></button></div>
        {!compact && <div className="agri-sidebar-territory"><span className="agri-territory-icon"><MapPin className="h-4 w-4" /></span><span className="agri-territory-copy"><small>VOTRE TERRITOIRE</small><strong>Ouagadougou <i>·</i> Burkina Faso</strong></span><span className="agri-territory-pulse" aria-label="Zone active" /> </div>}
        {compact && <div className="agri-sidebar-territory agri-sidebar-territory-compact" title="Ouagadougou · Burkina Faso"><span className="agri-territory-icon"><MapPin className="h-4 w-4" /></span><span className="agri-territory-pulse" /></div>}
        <button type="button" className="agri-sidebar-sos" onClick={() => { onNavigate('emergency'); onMobileClose(); }} aria-label="Ouvrir le centre d’urgence SOS">
          <span className="agri-sidebar-sos-icon"><Siren className="h-[17px] w-[17px]" /></span>
          {!compact && <span><strong>Centre SOS</strong><small>Assistance prioritaire</small></span>}
          {!compact && <ChevronRight className="agri-sidebar-sos-arrow h-4 w-4" />}
        </button>
      </div>
      <div className="agri-sidebar-scroll">
        <SidebarGroup label="Votre espace" collapsed={compact}>{primaryNavigation.map((item, index) => <SidebarItem key={item.key} item={item} active={activeKey === item.key} collapsed={compact} index={index} onClick={() => { onNavigate(item.key); onMobileClose(); }} />)}</SidebarGroup>
        {(role === 'institution' || !compact) && <SidebarGroup label="Pilotage national" collapsed={compact}>{institutionalNavigation.map((item, index) => <SidebarItem key={item.key} item={item} active={activeKey === item.key} collapsed={compact} index={index + primaryNavigation.length} onClick={() => { onNavigate(item.key); onMobileClose(); }} />)}</SidebarGroup>}
      </div>
      <div className="agri-sidebar-footer">
        <div className="agri-sidebar-network"><span className="agri-network-mark"><Activity className="h-4 w-4" /></span><span className="agri-network-copy">{!compact && <><strong>Réseau actif</strong><small>148 experts disponibles</small></>}</span><i title="Tous les services fonctionnent" />
        </div>
        <div className="agri-sidebar-tools"><button type="button" title="Aide" aria-label="Aide"><CircleHelp className="h-4 w-4" />{!compact && 'Centre d’aide'}</button><button type="button" title="Réglages" aria-label="Réglages"><Settings2 className="h-4 w-4" />{!compact && 'Réglages'}</button></div>
        {!compact && <div className="agri-sidebar-account"><span className="agri-sidebar-avatar">SD</span><span><strong>Steve D.</strong><small>{roleLabels[role]} · Espace sécurisé</small></span><button type="button" className="agri-sidebar-logout" title="Se déconnecter" aria-label="Se déconnecter"><LogOut className="h-4 w-4" /></button></div>}
        {compact && <button type="button" className="agri-sidebar-logout agri-sidebar-logout-compact" title="Se déconnecter" aria-label="Se déconnecter"><LogOut className="h-4 w-4" /></button>}
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
