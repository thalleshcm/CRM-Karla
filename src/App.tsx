import React, { useEffect, useState } from 'react';
import { CrmProvider, useCrm } from './context/CrmContext';
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
import { UserRoleSwitcherModal } from './components/UserRoleSwitcherModal';
import { WhatsAppDirectModal } from './components/WhatsAppDirectModal';
import { WhatsAppFloatingButton } from './components/WhatsAppFloatingButton';
import { ClientPortalView } from './components/ClientPortalView';
import { MODULES_LIST } from './data/initialData';

const AppContent: React.FC = () => {
  const {
    activeView,
    setIsCommandPaletteOpen,
    hasModuleAccess,
    isClientPortalModalOpen,
    setIsClientPortalModalOpen,
    clientPortalLead
  } = useCrm();

  const [portalToken, setPortalToken] = useState<string | null>(null);

  // Check URL query param for standalone portal link e.g. ?portal=token or /c/token
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('portal') || params.get('c');
    if (token) {
      setPortalToken(token);
    }
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
      <UserRoleSwitcherModal />
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
    <CrmProvider>
      <AppContent />
    </CrmProvider>
  );
}

export default App;

