import React, { useEffect, useState } from 'react';
import { CrmProvider, useCrm } from './context/CrmContext';
import { ToastProvider } from './context/ToastContext';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { FunnelsView } from './components/FunnelsView';
import { AgendaView } from './components/AgendaView';
import { BirthdaysView } from './components/BirthdaysView';
import { ContractsView } from './components/ContractsView';
import { CommissionsView } from './components/CommissionsView';
import { SettingsView } from './components/SettingsView';
import { AccessRestrictedView } from './components/AccessRestrictedView';
import { CommandPalette } from './components/CommandPalette';
import { LeadDetailModal } from './components/LeadDetailModal';
import { NewLeadModal } from './components/NewLeadModal';
import { RegisterSaleModal } from './components/RegisterSaleModal';
import { ImportLeadsModal } from './components/ImportLeadsModal';
import { SetGoalModal } from './components/SetGoalModal';
import { MyProfileModal } from './components/MyProfileModal';
import { WhatsAppDirectModal } from './components/WhatsAppDirectModal';
import { WhatsAppFloatingButton } from './components/WhatsAppFloatingButton';
import { ClientPortalView } from './components/ClientPortalView';
import { LoginView } from './components/LoginView';
import { InviteAcceptView } from './components/InviteAcceptView';
import { MODULES_LIST } from './data/initialData';
import { useEscapeToClose } from './hooks/useEscapeToClose';

const AppContent: React.FC = () => {
  const {
    activeView,
    setActiveView,
    setIsCommandPaletteOpen,
    hasModuleAccess,
    isClientPortalModalOpen,
    setIsClientPortalModalOpen,
    clientPortalLead,
    isAuthenticated,
    isAuthLoading
  } = useCrm();

  const [portalToken, setPortalToken] = useState<string | null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(null);

  useEscapeToClose(() => setIsClientPortalModalOpen(false), isClientPortalModalOpen);

  // Check URL query params for standalone links: ?portal=token / ?c=token
  // (client portal) or ?invite=token (team invite acceptance).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const portal = params.get('portal') || params.get('c');
    if (portal) setPortalToken(portal);
    const invite = params.get('invite');
    if (invite) setInviteToken(invite);
    // Deep link into a specific Settings section, e.g. /?settings=team
    if (params.get('settings')) setActiveView('settings');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Global keyboard shortcut for ⌘K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsCommandPaletteOpen]);

  // If opening via direct client link in browser
  if (portalToken) {
    return (
      <ClientPortalView
        token={portalToken}
        isStandalonePage={true}
        onClose={() => {
          setPortalToken(null);
          window.history.replaceState({}, document.title, window.location.pathname);
        }}
      />
    );
  }

  if (inviteToken) {
    return (
      <InviteAcceptView
        token={inviteToken}
        onDone={() => {
          setInviteToken(null);
          window.history.replaceState({}, document.title, window.location.pathname);
        }}
      />
    );
  }

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB]">
        <div className="w-8 h-8 border-2 border-[#A3B18A] border-t-[#344E41] rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  const renderActiveView = () => {
    // Check permission for active view
    if (!hasModuleAccess(activeView)) {
      const moduleMeta = MODULES_LIST.find(m => m.id === activeView);
      return (
        <AccessRestrictedView
          moduleId={activeView}
          moduleName={moduleMeta ? moduleMeta.name : activeView}
        />
      );
    }

    switch (activeView) {
      case 'dashboard':
        return <DashboardView />;
      case 'funnels':
        return <FunnelsView />;
      case 'agenda':
        return <AgendaView />;
      case 'birthdays':
        return <BirthdaysView />;
      case 'contracts':
        return <ContractsView />;
      case 'commissions':
        return <CommissionsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex min-h-screen bg-[#FDFCFB] text-[#3A403A] font-sans antialiased selection:bg-[#A3B18A]/30 selection:text-[#344E41]">
      {/* Fixed Left Navigation Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {renderActiveView()}
      </div>

      {/* Modals & Overlays */}
      <CommandPalette />
      <LeadDetailModal />
      <NewLeadModal />
      <RegisterSaleModal />
      <ImportLeadsModal />
      <SetGoalModal />
      <MyProfileModal />
      <WhatsAppDirectModal />
      <WhatsAppFloatingButton />

      {/* Client Portal Modal Preview */}
      {isClientPortalModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/80 overflow-y-auto">
          <ClientPortalView
            lead={clientPortalLead}
            onClose={() => setIsClientPortalModalOpen(false)}
          />
        </div>
      )}
    </div>
  );
};

export function App() {
  return (
    <ToastProvider>
      <CrmProvider>
        <AppContent />
      </CrmProvider>
    </ToastProvider>
  );
}

export default App;

