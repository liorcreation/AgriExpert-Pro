import { Bell, ChevronDown, Menu, ShieldCheck } from 'lucide-react';
import type { LanguageCode, UserRole } from '../../types/shell';
import { RoleLanguageControls } from './RoleLanguageControls';
import { BrandLogo } from '../brand/BrandLogo';

type InstitutionalHeaderProps = {
  role: UserRole;
  language: LanguageCode;
  voiceEnabled: boolean;
  darkMode: boolean;
  onMenuOpen: () => void;
  onRoleChange: (role: UserRole) => void;
  onLanguageChange: (language: LanguageCode) => void;
  onVoiceToggle: () => void;
  onThemeToggle: () => void;
};

export function InstitutionalHeader({
  role,
  language,
  voiceEnabled,
  darkMode,
  onMenuOpen,
  onRoleChange,
  onLanguageChange,
  onVoiceToggle,
  onThemeToggle,
}: InstitutionalHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-cream-300/80 bg-cream-50/90 backdrop-blur-glass dark:border-obsidian-700 dark:bg-obsidian-950/90">
      <div className="flex min-h-[76px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            className="ag-button-ghost min-h-11 min-w-11 px-2 lg:hidden"
            onClick={onMenuOpen}
            aria-label="Ouvrir le menu principal"
          >
            <Menu className="h-5 w-5" />
          </button>

          <BrandLogo descriptor="Plateforme agropastorale nationale" />
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <div className="flex items-center gap-2 border-r border-cream-300 pr-3 dark:border-obsidian-700">
            <ShieldCheck className="h-4 w-4 text-gold-600 dark:text-gold-300" />
            <span className="text-xs font-semibold text-obsidian-600 dark:text-cream-300">Espace sécurisé</span>
          </div>
          <RoleLanguageControls
            role={role}
            language={language}
            voiceEnabled={voiceEnabled}
            darkMode={darkMode}
            onRoleChange={onRoleChange}
            onLanguageChange={onLanguageChange}
            onVoiceToggle={onVoiceToggle}
            onThemeToggle={onThemeToggle}
          />
          <button type="button" className="ag-button-ghost relative min-h-10 min-w-10 px-2.5" aria-label="Voir les notifications">
            <Bell className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-danger-500 ring-2 ring-cream-50 dark:ring-obsidian-950" />
          </button>
          <button type="button" className="flex items-center gap-2 rounded-control px-2 py-1.5 text-left hover:bg-territory-500/10" aria-label="Ouvrir le profil">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-100 text-sm font-bold text-gold-700 dark:bg-gold-500/20 dark:text-gold-300">SD</span>
            <span className="hidden xl:block">
              <span className="block text-xs font-bold text-obsidian-800 dark:text-cream-100">Steve D.</span>
              <span className="block text-[11px] text-obsidian-600 dark:text-cream-300">Administrateur</span>
            </span>
            <ChevronDown className="h-4 w-4 text-obsidian-600 dark:text-cream-300" />
          </button>
        </div>

        <div className="flex items-center gap-1 lg:hidden">
          <button type="button" className="ag-button-ghost relative min-h-10 min-w-10 px-2.5" aria-label="Voir les notifications">
            <Bell className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-danger-500 ring-2 ring-cream-50 dark:ring-obsidian-950" />
          </button>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-100 text-xs font-bold text-gold-700 dark:bg-gold-500/20 dark:text-gold-300">SD</span>
        </div>
      </div>
    </header>
  );
}
