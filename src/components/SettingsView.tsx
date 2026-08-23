import React, { useState, useEffect } from 'react';
import { Header } from './Header';
import { useCrm } from '../context/CrmContext';
import { RolePermissions } from '../types';
import { SettingsNotificationProvider } from './settings/SettingsNotification';
import { SettingsCategoryGrid, SettingsSectionId, SETTINGS_SECTION_IDS } from './settings/SettingsCategoryGrid';
import { ProfileSection, RemindersSection, DataSection } from './settings/SettingsGeneral';
import { TeamSection, PermissionsSection } from './settings/SettingsUsersAccess';
import { TemplatesSection } from './settings/SettingsTemplates';
import { EvolutionSection, WebhooksSection, McpSection } from './settings/SettingsIntegrations';

// Mirrors SettingsCategoryGrid's per-card `requires` — the card being hidden
// isn't a real access boundary on its own since a section is also reachable
// by deep link (?settings=team) or by the last-visited-section memory, so
// SettingsView has to re-check the same permission before rendering.
const SECTION_PERMISSION: Partial<Record<SettingsSectionId, keyof RolePermissions>> = {
  team: 'canManageTeam',
  permissions: 'canManageTeam',
  evolution: 'canManageWhatsApp',
  webhooks: 'canManageWebhooks',
  mcp: 'canManageMcp'
};

const SECTION_META: Record<SettingsSectionId, { title: string; subtitle: string }> = {
  profile: { title: 'Dados da Imobiliária', subtitle: 'Nome, slogan e dados do corretor responsável.' },
  reminders: { title: 'Notificações & Automações', subtitle: 'Lembretes de follow-up e mensagem de aniversário.' },
  data: { title: 'Dados & Backup', subtitle: 'Restaurar dados de demonstração ou limpar tudo.' },
  team: { title: 'Equipe de Corretores', subtitle: 'Cadastre, alterne e remova membros da equipe.' },
  permissions: { title: 'Perfis & Permissões', subtitle: 'Matriz de módulos e ações liberadas por perfil.' },
  templates: { title: 'Modelos de Mensagem', subtitle: 'Biblioteca de scripts por categoria de venda.' },
  evolution: { title: 'WhatsApp', subtitle: 'Conexão, instância e QR Code de pareamento.' },
  webhooks: { title: 'Captura de Leads & Automações Externas', subtitle: 'Recebimento de leads e envio de eventos para sistemas externos.' },
  mcp: { title: 'IA & Automação', subtitle: 'Conecte assistentes de IA aos dados do CRM.' }
};

const SECTION_COMPONENTS: Record<SettingsSectionId, React.FC> = {
  profile: ProfileSection,
  reminders: RemindersSection,
  data: DataSection,
  team: TeamSection,
  permissions: PermissionsSection,
  templates: TemplatesSection,
  evolution: EvolutionSection,
  webhooks: WebhooksSection,
  mcp: McpSection
};

const SECTION_QUERY_KEY = 'settings';
const LAST_SECTION_STORAGE_KEY = 'aurum_last_settings_section';

const isValidSectionId = (value: string | null): value is SettingsSectionId =>
  !!value && (SETTINGS_SECTION_IDS as string[]).includes(value);

const sectionFromUrl = (): SettingsSectionId | null => {
  const value = new URLSearchParams(window.location.search).get(SECTION_QUERY_KEY);
  return isValidSectionId(value) ? value : null;
};

// Falls back to wherever the user last left Settings (grid or a specific
// section) when there's no explicit deep link — previously every visit
// dropped back to the main grid even mid-task.
const lastVisitedSection = (): SettingsSectionId | null => {
  try {
    const value = localStorage.getItem(LAST_SECTION_STORAGE_KEY);
    return isValidSectionId(value) ? value : null;
  } catch {
    return null;
  }
};

export const SettingsView: React.FC = () => {
  const { hasPermission } = useCrm();
  const [activeSection, setActiveSectionState] = useState<SettingsSectionId | null>(() => {
    const requested = sectionFromUrl() ?? lastVisitedSection();
    const requiredPermission = requested ? SECTION_PERMISSION[requested] : undefined;
    return requested && (!requiredPermission || hasPermission(requiredPermission)) ? requested : null;
  });

  // Keep the URL in sync (?settings=team) so a section can be bookmarked or
  // shared. Uses replaceState (not pushState) since CrmContext already owns
  // browser Back/Forward for module-level navigation (dashboard/funnels/...);
  // pushing our own entries here would fight that history stack.
  const navigateToSection = (id: SettingsSectionId | null) => {
    setActiveSectionState(id);
    try {
      if (id) localStorage.setItem(LAST_SECTION_STORAGE_KEY, id);
      else localStorage.removeItem(LAST_SECTION_STORAGE_KEY);
    } catch {
      // localStorage unavailable (private mode, etc) — last-visited memory just won't persist.
    }
    const url = new URL(window.location.href);
    if (id) {
      url.searchParams.set(SECTION_QUERY_KEY, id);
    } else {
      url.searchParams.delete(SECTION_QUERY_KEY);
    }
    window.history.replaceState(window.history.state, '', url);
  };

  // Re-check on every render (not just at mount) — if an admin revokes the
  // permission for the section a user currently has open (e.g. their own
  // role config changing mid-session), boot them back to the grid instead
  // of leaving a now-unauthorized section rendered and interactive.
  useEffect(() => {
    if (!activeSection) return;
    const requiredPermission = SECTION_PERMISSION[activeSection];
    if (requiredPermission && !hasPermission(requiredPermission)) {
      navigateToSection(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, hasPermission]);

  const ActiveComponent = activeSection ? SECTION_COMPONENTS[activeSection] : null;
  const meta = activeSection ? SECTION_META[activeSection] : null;

  return (
    <SettingsNotificationProvider>
      <div className="flex-1 min-h-screen bg-[#FDFCFB] flex flex-col">
        <Header
          title={meta ? meta.title : 'Configurações do Sistema & Integrações'}
          subtitle={
            meta
              ? meta.subtitle
              : 'Gerencie perfis de acesso, WhatsApp, templates de mensagem, dados da imobiliária e regras de negócio.'
          }
          actionButton={
            activeSection ? (
              <button
                onClick={() => navigateToSection(null)}
                className="px-3.5 py-2 bg-white hover:bg-[#F4F1EA] text-[#344E41] border border-[#EAE7E2] rounded-xl text-xs font-semibold transition-colors"
              >
                ← Configurações
              </button>
            ) : undefined
          }
        />

        <main className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full space-y-6">
          {activeSection && ActiveComponent ? <ActiveComponent /> : <SettingsCategoryGrid onSelect={navigateToSection} />}
        </main>
      </div>
    </SettingsNotificationProvider>
  );
};
