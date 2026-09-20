import { Check, ChevronDown, Languages, Mic, Moon, Sun, Volume2, VolumeX } from 'lucide-react';
import type { LanguageCode, UserRole } from '../../types/shell';
import { roleDescriptions, roleLabels } from '../../data/navigation';

type RoleLanguageControlsProps = {
  role: UserRole;
  language: LanguageCode;
  voiceEnabled: boolean;
  darkMode: boolean;
  onRoleChange: (role: UserRole) => void;
  onLanguageChange: (language: LanguageCode) => void;
  onVoiceToggle: () => void;
  onThemeToggle: () => void;
};

const roles: UserRole[] = ['producer', 'expert', 'institution'];

export function RoleLanguageControls({
  role,
  language,
  voiceEnabled,
  darkMode,
  onRoleChange,
  onLanguageChange,
  onVoiceToggle,
  onThemeToggle,
}: RoleLanguageControlsProps) {
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <label className="sr-only" htmlFor="role-selector">
        Sélectionner votre rôle
      </label>
      <div className="relative hidden sm:block">
        <select
          id="role-selector"
          value={role}
          onChange={(event) => onRoleChange(event.target.value as UserRole)}
          className="ag-input min-h-10 w-auto appearance-none py-2 pl-9 pr-9 text-xs font-semibold"
          aria-label="Sélectionner votre rôle"
        >
          {roles.map((item) => (
            <option key={item} value={item}>
              {roleLabels[item]}
            </option>
          ))}
        </select>
        <UsersIcon role={role} />
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-obsidian-600 dark:text-cream-300" />
      </div>

      <label className="sr-only" htmlFor="language-selector">
        Choisir la langue
      </label>
      <div className="relative hidden md:block">
        <Languages className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-territory-600 dark:text-territory-400" />
        <select
          id="language-selector"
          value={language}
          onChange={(event) => onLanguageChange(event.target.value as LanguageCode)}
          className="ag-input min-h-10 w-auto appearance-none py-2 pl-9 pr-9 text-xs font-semibold"
          aria-label="Choisir la langue"
        >
          <option value="fr">Français</option>
          <option value="mo">Mooré</option>
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-obsidian-600 dark:text-cream-300" />
      </div>

      <button
        type="button"
        className="ag-button-ghost min-h-10 px-2.5 sm:px-3"
        onClick={onVoiceToggle}
        aria-pressed={voiceEnabled}
        aria-label={voiceEnabled ? 'Désactiver la voix' : 'Activer la voix'}
        title={voiceEnabled ? 'Voix active' : 'Voix désactivée'}
      >
        {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        <span className="hidden lg:inline">Voix {voiceEnabled ? 'active' : 'off'}</span>
      </button>

      <button
        type="button"
        className="ag-button-ghost min-h-10 min-w-10 px-2.5"
        onClick={onThemeToggle}
        aria-pressed={darkMode}
        aria-label={darkMode ? 'Activer le mode clair' : 'Activer le mode sombre'}
        title={darkMode ? 'Mode clair' : 'Mode sombre'}
      >
        {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
    </div>
  );
}

function UsersIcon({ role }: { role: UserRole }) {
  return (
    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-territory-600 dark:text-territory-400">
      {role === 'producer' ? <Mic className="h-4 w-4" /> : <Check className="h-4 w-4" />}
    </span>
  );
}

export function RoleSummary({ role }: { role: UserRole }) {
  return (
    <div className="rounded-control border border-territory-500/15 bg-territory-500/5 px-3 py-2">
      <p className="text-xs font-bold text-territory-700 dark:text-territory-300">Mode {roleLabels[role]}</p>
      <p className="mt-0.5 text-[11px] leading-4 text-obsidian-600 dark:text-cream-300">{roleDescriptions[role]}</p>
    </div>
  );
}
