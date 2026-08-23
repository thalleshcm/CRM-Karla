import React, { createContext, useContext, useState, useEffect, useMemo, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { crmApi } from '../services/api';
import {
  Lead,
  LeadStatusFilter,
  Funnel,
  Activity,
  Contract,
  Commission,
  CommissionSplitPercents,
  CommissionSplitBonus,
  ClientOnboardingData,
  CrmSettings,
  ViewType,
  StageId,
  UserProfile,
  UserRole,
  RolePermissionConfig,
  RolePermissions,
  OutgoingWebhook,
  WebhookEvent,
  McpToken,
  Client
} from '../types';
import { normalizePhoneKey } from '../utils/formatters';
import {
  DEFAULT_FUNNELS,
  DEFAULT_SETTINGS,
  INITIAL_LEADS,
  INITIAL_ACTIVITIES,
  INITIAL_CONTRACTS,
  INITIAL_COMMISSIONS,
  DEFAULT_USERS,
  DEFAULT_ROLE_PERMISSIONS,
  STAGES
} from '../data/initialData';

function safeSetLocalStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    console.error(`Failed to persist "${key}" to localStorage (likely quota exceeded):`, err);
  }
}

export interface ImportLeadRow {
  name: string;
  phone: string;
  email?: string;
  propertyInterest?: string;
  estimatedValue?: number;
  funnelId?: string;
  origin?: string;
}

export interface ImportResult {
  created: number;
  linkedToExistingClient: number;
  errors: { row: number; error: string }[];
}

interface CrmNotification {
  id: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
  type: 'activity' | 'birthday' | 'commission' | 'sale';
}

interface CrmContextType {
  activeView: ViewType;
  setActiveView: (view: ViewType) => void;
  activeFunnelId: string;
  setActiveFunnelId: (id: string) => void;
  
  // Raw Data
  leads: Lead[];
  clients: Client[];
  funnels: Funnel[];
  activities: Activity[];
  contracts: Contract[];
  commissions: Commission[];
  settings: CrmSettings;
  notifications: CrmNotification[];

  // User-scoped / Permission-filtered Data (Isolated per broker or filtered for admin)
  visibleLeads: Lead[];
  visibleActivities: Activity[];
  visibleContracts: Contract[];
  visibleCommissions: Commission[];
  adminFilterBrokerId: string | 'all';
  setAdminFilterBrokerId: (id: string | 'all') => void;

  selectedLead: Lead | null;
  setSelectedLead: (lead: Lead | null) => void;
  isNewLeadModalOpen: boolean;
  setIsNewLeadModalOpen: (open: boolean) => void;
  isImportModalOpen: boolean;
  setIsImportModalOpen: (open: boolean) => void;
  importType: 'csv' | 'whatsapp';
  setImportType: (type: 'csv' | 'whatsapp') => void;
  isSaleModalOpen: boolean;
  setIsSaleModalOpen: (open: boolean) => void;
  saleModalLead: Lead | null;
  setSaleModalLead: (lead: Lead | null) => void;
  isGoalModalOpen: boolean;
  setIsGoalModalOpen: (open: boolean) => void;
  isMyProfileModalOpen: boolean;
  setIsMyProfileModalOpen: (open: boolean) => void;
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (open: boolean) => void;
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: (open: boolean) => void;

  // Auth
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  authToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  firstAccess: (payload: { userId?: string; email?: string; password: string }) => Promise<void>;
  acceptInvite: (inviteToken: string, password: string) => Promise<void>;
  logout: () => void;

  // WhatsApp Central Hub
  isWhatsAppModalOpen: boolean;
  setIsWhatsAppModalOpen: (open: boolean) => void;
  whatsAppModalLead: Lead | null;
  setWhatsAppModalLead: (lead: Lead | null) => void;
  whatsAppModalInitialTab: 'scripts' | 'queue' | 'generator' | 'audio';
  setWhatsAppModalInitialTab: (tab: 'scripts' | 'queue' | 'generator' | 'audio') => void;
  openWhatsAppForLead: (lead: Lead, initialTab?: 'scripts' | 'queue' | 'generator' | 'audio') => void;
  openWhatsAppDirectHub: (initialTab?: 'scripts' | 'queue' | 'generator' | 'audio') => void;

  // Client Portal & Document Collection
  isClientPortalModalOpen: boolean;
  setIsClientPortalModalOpen: (open: boolean) => void;
  clientPortalLead: Lead | null;
  setClientPortalLead: (lead: Lead | null) => void;
  openClientPortalModal: (lead: Lead) => void;
  submitClientOnboardingData: (leadId: string, clientData: ClientOnboardingData) => void;
  generateClientPortalLink: (lead: Lead) => string;

  // Users & Role Permissions
  users: UserProfile[];
  currentUser: UserProfile;
  currentUserId: string;
  setCurrentUserId: (id: string) => void;
  rolePermissions: Record<UserRole, RolePermissionConfig>;
  addUser: (user: Omit<UserProfile, 'id'>) => UserProfile;
  updateUser: (id: string, updates: Partial<UserProfile>) => void;
  deleteUser: (id: string) => void;
  updateRolePermissions: (role: UserRole, updates: Partial<RolePermissionConfig>) => void;
  toggleModuleForRole: (role: UserRole, moduleId: ViewType) => void;
  togglePermissionForRole: (role: UserRole, permissionKey: keyof RolePermissions) => void;
  hasModuleAccess: (moduleId: ViewType, user?: UserProfile) => boolean;
  hasPermission: (permissionKey: keyof RolePermissions, user?: UserProfile) => boolean;

  // Actions
  leadStatusFilter: LeadStatusFilter;
  setLeadStatusFilter: (filter: LeadStatusFilter) => void;
  addLead: (lead: Omit<Lead, 'id' | 'createdAt' | 'history'>) => Lead;
  findClientMatch: (phone: string) => { client: Client; leadCount: number } | null;
  getClientLeads: (clientId: string | undefined) => Lead[];
  importLeadsBulk: (rows: ImportLeadRow[]) => Promise<ImportResult>;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  deleteLead: (id: string) => void;
  moveLeadStage: (id: string, stageId: StageId) => void;
  markLeadWon: (id: string) => void;
  markLeadLost: (id: string, reason?: string, notes?: string) => void;
  reactivateLead: (id: string) => void;
  addActivity: (activity: Omit<Activity, 'id' | 'createdAt' | 'completed'>) => Activity;
  toggleActivityComplete: (id: string) => void;
  deleteActivity: (id: string) => void;
  registerSale: (saleData: {
    leadId?: string;
    brokerId?: string;
    clientName: string;
    enterpriseName: string;
    unit: string;
    value: number;
    closedAt: string;
    firstDueDate?: string;
    commissionPercent: number;
    brokerCommissionPercent?: number;
    splitPercents?: CommissionSplitPercents;
    splitBonus?: CommissionSplitBonus;
    installmentsCount: number;
    isCompletedDirectly?: boolean;
    notes?: string;
  }) => Contract;
  updateContract: (id: string, updates: Partial<Contract>) => void;
  deleteContract: (id: string) => void;
  markCommissionPaid: (id: string) => void;
  updateSettings: (newSettings: Partial<CrmSettings>) => void;
  resetToDemoData: () => void;
  clearAllData: () => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  triggerConfetti: () => void;

  // Integrations: outgoing webhooks & MCP tokens
  outgoingWebhooks: OutgoingWebhook[];
  createWebhook: (payload: { name: string; url: string; events: WebhookEvent[] }) => Promise<void>;
  updateWebhook: (id: string, updates: Partial<Pick<OutgoingWebhook, 'name' | 'url' | 'events' | 'enabled'>>) => Promise<void>;
  deleteWebhook: (id: string) => Promise<void>;
  testWebhook: (id: string) => Promise<{ success: boolean; status?: number; error?: string }>;
  mcpTokens: McpToken[];
  createMcpToken: (name: string, scopes: ('read' | 'write')[], expiresInDays?: number) => Promise<string>;
  revokeMcpToken: (id: string) => Promise<void>;
}

const CrmContext = createContext<CrmContextType | undefined>(undefined);

export const CrmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeView, setActiveViewState] = useState<ViewType>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Track module navigation in browser history so the Back button moves
  // between modules (Dashboard, Funil, Contratos...) instead of leaving the
  // app entirely — previously switching views never touched history at all.
  const isHandlingPopState = useRef(false);
  useEffect(() => {
    // Seed the very first history entry with the initial view, so the
    // first Back press has something of ours to land on.
    window.history.replaceState({ crmView: 'dashboard' }, '');

    const handlePopState = (event: PopStateEvent) => {
      const view = (event.state?.crmView as ViewType) || 'dashboard';
      isHandlingPopState.current = true;
      setActiveViewState(view);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const setActiveView = (view: ViewType) => {
    if (isHandlingPopState.current) {
      // This change came from the user pressing Back/Forward — the
      // history entry already exists, don't push a duplicate one.
      isHandlingPopState.current = false;
    } else if (view !== activeView) {
      window.history.pushState({ crmView: view }, '');
    }
    setActiveViewState(view);
  };

  // Close the mobile off-canvas drawer whenever navigation happens, no
  // matter where the nav originated (sidebar link, command palette, etc.)
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [activeView]);
  const [activeFunnelId, setActiveFunnelId] = useState<string>('investidores');
  
  // Modals state
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importType, setImportType] = useState<'csv' | 'whatsapp'>('csv');
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [saleModalLead, setSaleModalLead] = useState<Lead | null>(null);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isMyProfileModalOpen, setIsMyProfileModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Auth state
  const [authToken, setAuthToken] = useState<string | null>(() => localStorage.getItem('aurum_auth_token'));
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // WhatsApp Central Hub Modal State
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [whatsAppModalLead, setWhatsAppModalLead] = useState<Lead | null>(null);
  const [whatsAppModalInitialTab, setWhatsAppModalInitialTab] = useState<'scripts' | 'queue' | 'generator' | 'audio'>('scripts');

  // Client Portal / Onboarding Modal State
  const [isClientPortalModalOpen, setIsClientPortalModalOpen] = useState(false);
  const [clientPortalLead, setClientPortalLead] = useState<Lead | null>(null);

  const openWhatsAppForLead = (lead: Lead, initialTab: 'scripts' | 'queue' | 'generator' | 'audio' = 'scripts') => {
    setWhatsAppModalLead(lead);
    setWhatsAppModalInitialTab(initialTab);
    setIsWhatsAppModalOpen(true);
  };

  const openWhatsAppDirectHub = (initialTab: 'scripts' | 'queue' | 'generator' | 'audio' = 'scripts') => {
    setWhatsAppModalLead(null);
    setWhatsAppModalInitialTab(initialTab);
    setIsWhatsAppModalOpen(true);
  };

  const openClientPortalModal = (lead: Lead) => {
    setClientPortalLead(lead);
    setIsClientPortalModalOpen(true);
  };

  const generateClientPortalLink = (lead: Lead): string => {
    const token = lead.clientPortalToken || `portal-${lead.id}`;
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?portal=${encodeURIComponent(token)}`;
  };

  const submitClientOnboardingData = (leadId: string, clientData: ClientOnboardingData) => {
    setLeads(prev =>
      prev.map(lead => {
        if (lead.id !== leadId && lead.clientPortalToken !== leadId) return lead;
        
        const docCount = clientData.documents?.length || 0;
        const newHistoryItem: any = {
          id: `h-portal-${Date.now()}`,
          leadId: lead.id,
          type: 'client_portal',
          description: `Cliente preencheu cadastro e enviou ${docCount} documento(s) com sucesso via Portal do Cliente.`,
          date: new Date().toLocaleString('pt-BR'),
          author: 'Portal do Cliente'
        };

        const updated: Lead = {
          ...lead,
          name: clientData.fullName || lead.name,
          phone: clientData.phone || lead.phone,
          email: clientData.email || lead.email,
          stageId: lead.stageId === 'lead_novo' || lead.stageId === 'primeiro_contato' ? 'documentacao' : lead.stageId,
          clientData: {
            ...clientData,
            submittedAt: new Date().toLocaleString('pt-BR'),
            status: 'enviado'
          },
          history: [newHistoryItem, ...(lead.history || [])]
        };

        if (selectedLead?.id === lead.id) {
          setSelectedLead(updated);
        }
        return updated;
      })
    );

    // Add a notification for the broker
    setNotifications(prev => [
      {
        id: `notif-doc-${Date.now()}`,
        title: 'Documentos Recebidos!',
        message: `${clientData.fullName || 'Cliente'} enviou ficha cadastral e ${clientData.documents?.length || 0} documento(s) pelo Portal.`,
        date: 'Agora',
        read: false,
        type: 'activity'
      },
      ...prev
    ]);

    triggerConfetti();
  };

  // Users and Roles state
  const [users, setUsers] = useState<UserProfile[]>(() => {
    const saved = localStorage.getItem('aurum_users');
    return saved ? JSON.parse(saved) : DEFAULT_USERS;
  });

  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    const saved = localStorage.getItem('aurum_current_user_id');
    return saved || 'user-admin-1';
  });

  // Merges onto DEFAULT_ROLE_PERMISSIONS (rather than trusting the stored
  // object as-is) so a permission key added after this cache was last
  // written — like canManageWhatsApp — doesn't silently evaluate to
  // false/undefined for an admin until settings are re-saved.
  const mergeRolePermissions = (stored: Partial<Record<UserRole, RolePermissionConfig>>): Record<UserRole, RolePermissionConfig> => {
    const merged = { ...DEFAULT_ROLE_PERMISSIONS };
    (Object.keys(DEFAULT_ROLE_PERMISSIONS) as UserRole[]).forEach(role => {
      const storedConfig = stored[role];
      if (storedConfig) {
        merged[role] = {
          ...DEFAULT_ROLE_PERMISSIONS[role],
          ...storedConfig,
          permissions: { ...DEFAULT_ROLE_PERMISSIONS[role].permissions, ...storedConfig.permissions }
        };
      }
    });
    return merged;
  };

  const [rolePermissions, setRolePermissions] = useState<Record<UserRole, RolePermissionConfig>>(() => {
    const saved = localStorage.getItem('aurum_role_permissions');
    return saved ? mergeRolePermissions(JSON.parse(saved)) : DEFAULT_ROLE_PERMISSIONS;
  });

  // Admin filter state: allow Admin to view 'all' or narrow down to a specific broker
  const [adminFilterBrokerId, setAdminFilterBrokerId] = useState<string | 'all'>('all');

  // Status Filter for Funnel: 'ativos' (default, hides won/lost) | 'ganhos' | 'perdidos' | 'todos'
  const [leadStatusFilter, setLeadStatusFilter] = useState<LeadStatusFilter>('ativos');

  const currentUser = useMemo(() => {
    return users.find(u => u.id === currentUserId) || users[0] || DEFAULT_USERS[0];
  }, [users, currentUserId]);

  // Persistent storage state
  const [leads, setLeads] = useState<Lead[]>(() => {
    const saved = localStorage.getItem('aurum_leads');
    return saved ? JSON.parse(saved) : INITIAL_LEADS;
  });

  const [clients, setClients] = useState<Client[]>(() => {
    const saved = localStorage.getItem('aurum_clients');
    return saved ? JSON.parse(saved) : [];
  });

  const [funnels, setFunnels] = useState<Funnel[]>(() => {
    const saved = localStorage.getItem('aurum_funnels');
    return saved ? JSON.parse(saved) : DEFAULT_FUNNELS;
  });

  const [activities, setActivities] = useState<Activity[]>(() => {
    const saved = localStorage.getItem('aurum_activities');
    return saved ? JSON.parse(saved) : INITIAL_ACTIVITIES;
  });

  const [contracts, setContracts] = useState<Contract[]>(() => {
    const saved = localStorage.getItem('aurum_contracts');
    return saved ? JSON.parse(saved) : INITIAL_CONTRACTS;
  });

  const [commissions, setCommissions] = useState<Commission[]>(() => {
    const saved = localStorage.getItem('aurum_commissions');
    return saved ? JSON.parse(saved) : INITIAL_COMMISSIONS;
  });

  const [settings, setSettings] = useState<CrmSettings>(() => {
    const saved = localStorage.getItem('aurum_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  const [notifications, setNotifications] = useState<CrmNotification[]>([]);

  // Integrations: outgoing webhooks & MCP tokens (server-authoritative,
  // never round-tripped through the generic debounced state sync below)
  const [outgoingWebhooks, setOutgoingWebhooks] = useState<OutgoingWebhook[]>([]);
  const [mcpTokens, setMcpTokens] = useState<McpToken[]>([]);

  const createWebhook = async (payload: { name: string; url: string; events: WebhookEvent[] }) => {
    const webhook = await crmApi.createWebhook(payload);
    setOutgoingWebhooks(prev => [webhook, ...prev]);
  };

  const updateWebhook = async (id: string, updates: Partial<Pick<OutgoingWebhook, 'name' | 'url' | 'events' | 'enabled'>>) => {
    const updated = await crmApi.updateWebhook(id, updates);
    setOutgoingWebhooks(prev => prev.map(w => (w.id === id ? updated : w)));
  };

  const deleteWebhook = async (id: string) => {
    await crmApi.deleteWebhook(id);
    setOutgoingWebhooks(prev => prev.filter(w => w.id !== id));
  };

  const testWebhook = async (id: string) => {
    const result = await crmApi.testWebhook(id);
    const refreshed = await crmApi.listWebhooks();
    setOutgoingWebhooks(refreshed);
    return result;
  };

  const createMcpToken = async (name: string, scopes: ('read' | 'write')[], expiresInDays?: number) => {
    const created = await crmApi.createMcpToken(name, scopes, expiresInDays);
    const { token, ...publicToken } = created;
    setMcpTokens(prev => [publicToken, ...prev]);
    return token;
  };

  const revokeMcpToken = async (id: string) => {
    await crmApi.revokeMcpToken(id);
    setMcpTokens(prev => prev.map(t => (t.id === id ? { ...t, revoked: true } : t)));
  };

  // Resolve any persisted session token on first load
  useEffect(() => {
    let isMounted = true;
    if (!authToken) {
      setIsAuthLoading(false);
      return;
    }
    crmApi.getSession(authToken)
      .then(({ user }) => {
        if (!isMounted) return;
        setUsers(prev => (prev.some(u => u.id === user.id) ? prev.map(u => (u.id === user.id ? user : u)) : [...prev, user]));
        setCurrentUserId(user.id);
        setIsAuthenticated(true);
      })
      .catch(() => {
        if (!isMounted) return;
        localStorage.removeItem('aurum_auth_token');
        setAuthToken(null);
        setIsAuthenticated(false);
      })
      .finally(() => {
        if (isMounted) setIsAuthLoading(false);
      });
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email: string, password: string) => {
    const { token, user } = await crmApi.login(email, password);
    localStorage.setItem('aurum_auth_token', token);
    setAuthToken(token);
    // Keep local `users` in sync with whatever the server returns for this
    // account — otherwise the next debounced full-state sync would push the
    // stale local copy back and clobber server-side fields (e.g. email).
    setUsers(prev => (prev.some(u => u.id === user.id) ? prev.map(u => (u.id === user.id ? user : u)) : [...prev, user]));
    setCurrentUserId(user.id);
    setIsAuthenticated(true);
  };

  const firstAccess = async (payload: { userId?: string; email?: string; password: string }) => {
    const { token, user } = await crmApi.firstAccess(payload);
    localStorage.setItem('aurum_auth_token', token);
    setAuthToken(token);
    setUsers(prev => (prev.some(u => u.id === user.id) ? prev.map(u => (u.id === user.id ? user : u)) : [...prev, user]));
    setCurrentUserId(user.id);
    setIsAuthenticated(true);
  };

  const acceptInvite = async (inviteToken: string, password: string) => {
    const { token, user } = await crmApi.acceptInvite(inviteToken, password);
    localStorage.setItem('aurum_auth_token', token);
    setAuthToken(token);
    setUsers(prev => (prev.some(u => u.id === user.id) ? prev.map(u => (u.id === user.id ? user : u)) : [...prev, user]));
    setCurrentUserId(user.id);
    setIsAuthenticated(true);
  };

  const logout = () => {
    if (authToken) crmApi.logout(authToken).catch(() => {});
    localStorage.removeItem('aurum_auth_token');
    setAuthToken(null);
    setIsAuthenticated(false);
  };

  // Initial Load from Backend API — every /api/state* route now requires a
  // valid session token, so this can't run (successfully) until auth has
  // resolved. Depends on isAuthenticated so it re-fires right after login,
  // instead of the old mount-only effect that ran (and failed with 401)
  // before any token existed.
  const hasLoadedFromBackendRef = useRef(false);
  useEffect(() => {
    if (!isAuthenticated) return;
    let isMounted = true;
    crmApi.fetchFullState()
      .then(backendState => {
        if (!isMounted || !backendState) return;
        if (Array.isArray(backendState.users) && backendState.users.length > 0) setUsers(backendState.users);
        if (backendState.rolePermissions) setRolePermissions(backendState.rolePermissions);
        if (Array.isArray(backendState.funnels) && backendState.funnels.length > 0) setFunnels(backendState.funnels);
        if (Array.isArray(backendState.leads) && backendState.leads.length > 0) setLeads(backendState.leads);
        if (Array.isArray(backendState.clients)) setClients(backendState.clients);
        if (Array.isArray(backendState.activities)) setActivities(backendState.activities);
        if (Array.isArray(backendState.contracts)) setContracts(backendState.contracts);
        if (Array.isArray(backendState.commissions)) setCommissions(backendState.commissions);
        if (backendState.settings) setSettings(prev => ({ ...prev, ...backendState.settings }));
        if (Array.isArray(backendState.notifications)) setNotifications(backendState.notifications);
        if (Array.isArray(backendState.outgoingWebhooks)) setOutgoingWebhooks(backendState.outgoingWebhooks);
        if (Array.isArray(backendState.mcpTokens)) setMcpTokens(backendState.mcpTokens);
      })
      .catch(err => {
        console.log('Backend sync notice (using local data):', err?.message || err);
      })
      .finally(() => {
        // Only allow the debounced full-state sync to fire after the backend's
        // own state has been loaded — otherwise a slow fetch loses the race
        // against the sync debounce and stale localStorage data overwrites
        // data/db.json, making server-side changes appear to "not sync".
        hasLoadedFromBackendRef.current = true;
      });

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  // Sync to localStorage
  useEffect(() => {
    safeSetLocalStorage('aurum_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    safeSetLocalStorage('aurum_current_user_id', currentUserId);
  }, [currentUserId]);

  useEffect(() => {
    safeSetLocalStorage('aurum_role_permissions', JSON.stringify(rolePermissions));
  }, [rolePermissions]);

  useEffect(() => {
    safeSetLocalStorage('aurum_leads', JSON.stringify(leads));
  }, [leads]);

  useEffect(() => {
    safeSetLocalStorage('aurum_clients', JSON.stringify(clients));
  }, [clients]);

  useEffect(() => {
    safeSetLocalStorage('aurum_funnels', JSON.stringify(funnels));
  }, [funnels]);

  useEffect(() => {
    safeSetLocalStorage('aurum_activities', JSON.stringify(activities));
  }, [activities]);

  useEffect(() => {
    safeSetLocalStorage('aurum_contracts', JSON.stringify(contracts));
  }, [contracts]);

  useEffect(() => {
    safeSetLocalStorage('aurum_commissions', JSON.stringify(commissions));
  }, [commissions]);

  useEffect(() => {
    safeSetLocalStorage('aurum_settings', JSON.stringify(settings));
  }, [settings]);

  // Sync full state to backend debounce
  useEffect(() => {
    if (!hasLoadedFromBackendRef.current) return;
    const timer = setTimeout(() => {
      crmApi.syncFullState({
        users,
        funnels,
        rolePermissions,
        leads,
        clients,
        activities,
        contracts,
        commissions,
        settings,
        notifications
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, [users, funnels, rolePermissions, leads, clients, activities, contracts, commissions, settings, notifications]);

  // Global keyboard shortcuts (⌘K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const hasModuleAccess = (moduleId: ViewType, user?: UserProfile): boolean => {
    const activeUser = user || currentUser;
    if (!activeUser) return true;
    const roleConfig = rolePermissions[activeUser.role];
    if (!roleConfig) return true;
    return roleConfig.allowedModules.includes(moduleId);
  };

  const hasPermission = (permissionKey: keyof RolePermissions, user?: UserProfile): boolean => {
    const activeUser = user || currentUser;
    if (!activeUser) return true;
    const roleConfig = rolePermissions[activeUser.role];
    if (!roleConfig) return true;
    return !!roleConfig.permissions[permissionKey];
  };

  // User-scoped data calculation: each user sees only their data unless permitted (Admin or canViewAll)
  const canViewAll = hasPermission('canViewAllLeads');
  const canViewAllComms = hasPermission('canViewAllCommissions');
  const canViewTeam = hasPermission('canViewTeamLeads');

  // Ids of everyone this user supervises (their `managerId` points here) —
  // only relevant when canViewTeamLeads is on and canViewAllLeads is off.
  const teamMemberIds = useMemo(() => {
    if (canViewAll || !canViewTeam) return new Set<string>();
    return new Set(users.filter(u => u.managerId === currentUser.id).map(u => u.id));
  }, [users, canViewAll, canViewTeam, currentUser.id]);

  const visibleLeads = useMemo(() => {
    if (!canViewAll) {
      if (canViewTeam && teamMemberIds.size > 0) {
        return leads.filter(l => l.brokerId === currentUser.id || l.brokerName === currentUser.name || (l.brokerId && teamMemberIds.has(l.brokerId)));
      }
      // Corretor vê estritamente os seus leads
      return leads.filter(l => l.brokerId === currentUser.id || l.brokerName === currentUser.name || (!l.brokerId && currentUser.role === 'admin'));
    }
    // Administrador ou usuário com permissão de ver tudo
    if (adminFilterBrokerId !== 'all') {
      return leads.filter(l => l.brokerId === adminFilterBrokerId);
    }
    return leads;
  }, [leads, canViewAll, canViewTeam, teamMemberIds, currentUser, adminFilterBrokerId]);

  const visibleActivities = useMemo(() => {
    if (!canViewAll) {
      if (canViewTeam && teamMemberIds.size > 0) {
        return activities.filter(a => a.brokerId === currentUser.id || a.brokerName === currentUser.name || (a.brokerId && teamMemberIds.has(a.brokerId)));
      }
      return activities.filter(a => a.brokerId === currentUser.id || a.brokerName === currentUser.name);
    }
    if (adminFilterBrokerId !== 'all') {
      return activities.filter(a => a.brokerId === adminFilterBrokerId);
    }
    return activities;
  }, [activities, canViewAll, canViewTeam, teamMemberIds, currentUser, adminFilterBrokerId]);

  const visibleContracts = useMemo(() => {
    if (!canViewAll) {
      // Mirrors visibleLeads/visibleActivities' team-scope path — previously
      // contracts only had the binary own-vs-all split, so a manager with
      // "ver leads da equipe" still couldn't see their team's contracts.
      if (canViewTeam && teamMemberIds.size > 0) {
        return contracts.filter(c => c.brokerId === currentUser.id || c.brokerName === currentUser.name || (c.brokerId && teamMemberIds.has(c.brokerId)));
      }
      return contracts.filter(c => c.brokerId === currentUser.id || c.brokerName === currentUser.name);
    }
    if (adminFilterBrokerId !== 'all') {
      return contracts.filter(c => c.brokerId === adminFilterBrokerId);
    }
    return contracts;
  }, [contracts, canViewAll, canViewTeam, teamMemberIds, currentUser, adminFilterBrokerId]);

  const visibleCommissions = useMemo(() => {
    if (!canViewAllComms) {
      // Same team-scope extension as visibleContracts above, gated by
      // canViewTeam (commissions don't have their own separate team flag).
      if (canViewTeam && teamMemberIds.size > 0) {
        return commissions.filter(c => c.brokerId === currentUser.id || c.brokerName === currentUser.name || (c.brokerId && teamMemberIds.has(c.brokerId)));
      }
      return commissions.filter(c => c.brokerId === currentUser.id || c.brokerName === currentUser.name);
    }
    if (adminFilterBrokerId !== 'all') {
      return commissions.filter(c => c.brokerId === adminFilterBrokerId);
    }
    return commissions;
  }, [commissions, canViewAllComms, canViewTeam, teamMemberIds, currentUser, adminFilterBrokerId]);

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#344E41', '#588157', '#A3B18A', '#E9EDC9']
      });
    } catch {
      // Ignore if canvas not supported
    }
  };

  // Finds an existing Client by normalized phone (dedup key), or creates one
  // — used by addLead and importLeadsBulk so the same buyer is recognized
  // across negotiations instead of siloed per-lead. Mutates `clients` via
  // setter but returns the resolved client synchronously (from a ref-backed
  // read) so the caller can link the new Lead to it in the same tick.
  const clientsRef = useRef(clients);
  clientsRef.current = clients;

  const findOrCreateClient = (name: string, phone: string, email?: string): Client => {
    const normalized = normalizePhoneKey(phone);
    const existing = normalized ? clientsRef.current.find(c => normalizePhoneKey(c.phone) === normalized) : undefined;
    if (existing) {
      if (email && !existing.email) {
        const patched = { ...existing, email };
        clientsRef.current = clientsRef.current.map(c => (c.id === existing.id ? patched : c));
        setClients(clientsRef.current);
        return patched;
      }
      return existing;
    }
    const client: Client = {
      id: `client-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      phone,
      email,
      createdAt: new Date().toISOString()
    };
    clientsRef.current = [client, ...clientsRef.current];
    setClients(clientsRef.current);
    return client;
  };

  const findClientMatch = useCallback(
    (phone: string): { client: Client; leadCount: number } | null => {
      const normalized = normalizePhoneKey(phone);
      if (!normalized) return null;
      const client = clients.find(c => normalizePhoneKey(c.phone) === normalized);
      if (!client) return null;
      return { client, leadCount: leads.filter(l => l.clientId === client.id).length };
    },
    [clients, leads]
  );

  const getClientLeads = (clientId: string | undefined): Lead[] => {
    if (!clientId) return [];
    return leads.filter(l => l.clientId === clientId);
  };

  const addLead = (leadData: Omit<Lead, 'id' | 'createdAt' | 'history'>): Lead => {
    const assignedId = leadData.brokerId || currentUser.id;
    const assignedUser = users.find(u => u.id === assignedId) || currentUser;
    const client = findOrCreateClient(leadData.name, leadData.phone, leadData.email);
    const newId = `lead-${Date.now()}`;

    const newLead: Lead = {
      ...leadData,
      id: newId,
      clientId: leadData.clientId || client.id,
      brokerId: assignedId,
      brokerName: assignedUser.name,
      createdAt: new Date().toISOString().split('T')[0],
      history: [
        {
          id: `h-${Date.now()}`,
          leadId: newId,
          type: 'note',
          description: `Lead cadastrado e atribuído a ${assignedUser.name}.`,
          date: new Date().toLocaleString('pt-BR'),
          author: currentUser.name
        }
      ]
    };
    setLeads(prev => [newLead, ...prev]);
    return newLead;
  };

  const importLeadsBulk = async (rows: ImportLeadRow[]): Promise<ImportResult> => {
    const result = await crmApi.importLeads(rows);
    // The server created the leads/clients directly in its own dbState —
    // pull the fresh full state back down rather than trying to reconstruct
    // 1..2000 rows' worth of ids/history locally.
    const backendState = await crmApi.fetchFullState();
    if (Array.isArray(backendState.leads)) setLeads(backendState.leads);
    if (Array.isArray(backendState.clients)) setClients(backendState.clients);
    return { created: result.created, linkedToExistingClient: result.linkedToExistingClient, errors: result.errors };
  };

  const updateLead = (id: string, updates: Partial<Lead>) => {
    setLeads(prev =>
      prev.map(lead => {
        if (lead.id !== id) return lead;
        const updated = { ...lead, ...updates };
        if (selectedLead?.id === id) {
          setSelectedLead(updated);
        }
        return updated;
      })
    );
  };

  const deleteLead = (id: string) => {
    setLeads(prev => prev.filter(l => l.id !== id));
    if (selectedLead?.id === id) {
      setSelectedLead(null);
    }
  };

  const moveLeadStage = (id: string, stageId: StageId) => {
    setLeads(prev =>
      prev.map(lead => {
        if (lead.id !== id) return lead;
        if (lead.stageId === stageId) return lead;

        const isSuccessStage = stageId === 'venda_concluida';
        if (isSuccessStage) {
          triggerConfetti();
        }

        const newHistoryItem = {
          id: `h-${Date.now()}`,
          leadId: lead.id,
          type: (isSuccessStage ? 'sale' : 'stage_change') as any,
          description: `Movido para a etapa: ${stageId.replace('_', ' ').toUpperCase()}`,
          date: new Date().toLocaleString('pt-BR'),
          author: currentUser.name
        };

        const updated = {
          ...lead,
          stageId,
          history: [newHistoryItem, ...(lead.history || [])]
        };

        if (selectedLead?.id === id) {
          setSelectedLead(updated);
        }
        return updated;
      })
    );
  };

  const markLeadWon = (id: string) => {
    setLeads(prev =>
      prev.map(lead => {
        if (lead.id !== id) return lead;

        const newHistoryItem = {
          id: `h-won-${Date.now()}`,
          leadId: lead.id,
          type: 'sale' as any,
          description: `🎉 Negociação marcada como GANHA (Venda Concluída). VGV: R$ ${(lead.estimatedValue || 0).toLocaleString('pt-BR')}`,
          date: new Date().toLocaleString('pt-BR'),
          author: currentUser.name
        };

        const updated: Lead = {
          ...lead,
          status: 'ganho',
          wonAt: new Date().toISOString(),
          history: [newHistoryItem, ...(lead.history || [])]
        };

        if (selectedLead?.id === id) {
          setSelectedLead(updated);
        }
        return updated;
      })
    );

    triggerConfetti();
    setNotifications(prev => [
      {
        id: `notif-won-${Date.now()}`,
        title: '🏆 Negociação Ganha!',
        message: `Parabéns! A negociação foi finalizada como Ganho (Venda Concluída).`,
        date: 'Agora',
        read: false,
        type: 'sale'
      },
      ...prev
    ]);
  };

  const markLeadLost = (id: string, reason?: string, notes?: string) => {
    setLeads(prev =>
      prev.map(lead => {
        if (lead.id !== id) return lead;

        const reasonText = reason || 'Motivo não especificado';
        const newHistoryItem = {
          id: `h-lost-${Date.now()}`,
          leadId: lead.id,
          type: 'stage_change' as any,
          description: `❌ Lead marcado como PERDIDO na etapa [${lead.stageId.replace('_', ' ').toUpperCase()}]. Motivo: ${reasonText}${notes ? ` | Obs: ${notes}` : ''}`,
          date: new Date().toLocaleString('pt-BR'),
          author: currentUser.name
        };

        const updated: Lead = {
          ...lead,
          status: 'perdido',
          lostReason: reasonText,
          lostNotes: notes,
          lostAt: new Date().toISOString(),
          history: [newHistoryItem, ...(lead.history || [])]
        };

        if (selectedLead?.id === id) {
          setSelectedLead(updated);
        }
        return updated;
      })
    );

    setNotifications(prev => [
      {
        id: `notif-lost-${Date.now()}`,
        title: 'Lead Marcado como Perdido',
        message: `O lead foi arquivado como perdido e ocultado do funil ativo.`,
        date: 'Agora',
        read: false,
        type: 'activity'
      },
      ...prev
    ]);
  };

  const reactivateLead = (id: string) => {
    setLeads(prev =>
      prev.map(lead => {
        if (lead.id !== id) return lead;

        const newHistoryItem = {
          id: `h-reopen-${Date.now()}`,
          leadId: lead.id,
          type: 'stage_change' as any,
          description: `🔄 Lead reativado no funil de atendimento.`,
          date: new Date().toLocaleString('pt-BR'),
          author: currentUser.name
        };

        const updated: Lead = {
          ...lead,
          status: 'ativo',
          lostReason: undefined,
          lostNotes: undefined,
          lostAt: undefined,
          wonAt: undefined,
          history: [newHistoryItem, ...(lead.history || [])]
        };

        if (selectedLead?.id === id) {
          setSelectedLead(updated);
        }
        return updated;
      })
    );
  };

  const addActivity = (activityData: Omit<Activity, 'id' | 'createdAt' | 'completed'>): Activity => {
    const assignedId = activityData.brokerId || currentUser.id;
    const assignedUser = users.find(u => u.id === assignedId) || currentUser;

    const newAct: Activity = {
      ...activityData,
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      brokerId: assignedId,
      brokerName: assignedUser.name,
      completed: false,
      createdAt: new Date().toISOString()
    };
    setActivities(prev => [newAct, ...prev]);

    if (activityData.leadId && activityData.dateTime) {
      updateLead(activityData.leadId, {
        nextFollowUpDate: activityData.dateTime
      });
    }

    return newAct;
  };

  const toggleActivityComplete = (id: string) => {
    setActivities(prev =>
      prev.map(act => (act.id === id ? { ...act, completed: !act.completed } : act))
    );
  };

  const deleteActivity = (id: string) => {
    setActivities(prev => prev.filter(a => a.id !== id));
  };

  const registerSale = (saleData: {
    leadId?: string;
    brokerId?: string;
    clientName: string;
    enterpriseName: string;
    unit: string;
    value: number;
    closedAt: string;
    firstDueDate?: string;
    commissionPercent: number;
    brokerCommissionPercent?: number;
    splitPercents?: CommissionSplitPercents;
    splitBonus?: CommissionSplitBonus;
    installmentsCount: number;
    isCompletedDirectly?: boolean;
    status?: 'assinado' | 'concluido' | 'cancelado';
    notes?: string;
  }): Contract => {
    const totalCommVal = (saleData.value * saleData.commissionPercent) / 100;
    
    // Effective broker percentage from splitPercents or explicit brokerCommissionPercent
    const effectiveBrokerPerc = saleData.splitPercents?.broker !== undefined
      ? saleData.splitPercents.broker
      : (saleData.brokerCommissionPercent !== undefined ? saleData.brokerCommissionPercent : 50);

    const brokerCommVal = (totalCommVal * effectiveBrokerPerc) / 100;
    const contractId = `cont-${Date.now()}`;
    const assignedBrokerId = saleData.brokerId || currentUser.id;
    const assignedUser = users.find(u => u.id === assignedBrokerId) || currentUser;

    const newContract: Contract = {
      id: contractId,
      leadId: saleData.leadId,
      brokerId: assignedBrokerId,
      brokerName: assignedUser.name,
      clientName: saleData.clientName,
      enterpriseName: saleData.enterpriseName,
      unit: saleData.unit,
      value: saleData.value,
      closedAt: saleData.closedAt,
      firstDueDate: saleData.firstDueDate || saleData.closedAt,
      status: saleData.status || (saleData.isCompletedDirectly ? 'concluido' : 'assinado'),
      commissionPercent: saleData.commissionPercent,
      brokerCommissionPercent: effectiveBrokerPerc,
      splitPercents: saleData.splitPercents,
      splitBonus: saleData.splitBonus,
      totalCommissionValue: totalCommVal,
      brokerCommissionValue: brokerCommVal,
      installmentsCount: saleData.installmentsCount || 1,
      isCompletedDirectly: saleData.isCompletedDirectly,
      notes: saleData.notes,
      attachments: [
        {
          name: `Contrato_${saleData.enterpriseName.replace(/\s+/g, '_')}_Assinado.pdf`,
          size: '2.4 MB',
          date: saleData.closedAt
        }
      ]
    };

    setContracts(prev => [newContract, ...prev]);

    // Generate installment commission entries
    const numInstallments = Math.max(1, saleData.installmentsCount || 1);
    const installmentAmount = brokerCommVal / numInstallments;
    const installmentBonus = (saleData.splitBonus?.broker || 0) / numInstallments;
    const baseDate = new Date(saleData.firstDueDate || saleData.closedAt);

    const generatedCommissions: Commission[] = [];
    for (let i = 1; i <= numInstallments; i++) {
      const dueDate = new Date(baseDate);
      dueDate.setMonth(dueDate.getMonth() + (i - 1));
      
      generatedCommissions.push({
        id: `comm-${Date.now()}-${i}`,
        contractId: contractId,
        brokerId: assignedBrokerId,
        brokerName: assignedUser.name,
        enterpriseName: saleData.enterpriseName,
        clientName: saleData.clientName,
        recipientRole: 'corretor',
        installmentNumber: i,
        totalInstallments: numInstallments,
        dueDate: dueDate.toISOString().split('T')[0],
        paymentDate: saleData.isCompletedDirectly ? saleData.closedAt : undefined,
        amount: installmentAmount,
        bonusAmount: installmentBonus > 0 ? installmentBonus : undefined,
        status: saleData.isCompletedDirectly ? 'recebido' : 'a_receber',
        notes: `Parcela ${i}/${numInstallments} - Comissão de venda (${assignedUser.name})`
      });
    }

    setCommissions(prev => [...generatedCommissions, ...prev]);

    // A contract explicitly saved as 'cancelado' shouldn't advance the lead's
    // stage or trigger the win celebration — only signed/completed sales do.
    if (newContract.status !== 'cancelado') {
      if (saleData.leadId) {
        moveLeadStage(saleData.leadId, 'venda_concluida');
      }
      triggerConfetti();
    }
    return newContract;
  };

  const updateContract = (id: string, updates: Partial<Contract>) => {
    setContracts(prev => prev.map(c => (c.id === id ? { ...c, ...updates } : c)));
  };

  const deleteContract = (id: string) => {
    setContracts(prev => prev.filter(c => c.id !== id));
  };

  const markCommissionPaid = (id: string) => {
    setCommissions(prev =>
      prev.map(c =>
        c.id === id
          ? {
              ...c,
              status: 'recebido',
              paymentDate: new Date().toISOString().split('T')[0]
            }
          : c
      )
    );
    triggerConfetti();
  };

  const addUser = (userData: Omit<UserProfile, 'id'>) => {
    const newUser: UserProfile = {
      ...userData,
      id: `user-${Date.now()}`
    };
    setUsers(prev => [...prev, newUser]);
    return newUser;
  };

  const updateUser = (id: string, updates: Partial<UserProfile>) => {
    setUsers(prev => prev.map(u => (u.id === id ? { ...u, ...updates } : u)));
  };

  const deleteUser = (id: string) => {
    if (users.length <= 1) return;
    setUsers(prev => prev.filter(u => u.id !== id));
    if (currentUserId === id) {
      const fallback = users.find(u => u.id !== id) || users[0];
      if (fallback) setCurrentUserId(fallback.id);
    }
  };

  const updateRolePermissions = (role: UserRole, updates: Partial<RolePermissionConfig>) => {
    setRolePermissions(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        ...updates
      }
    }));
  };

  const toggleModuleForRole = (role: UserRole, moduleId: ViewType) => {
    setRolePermissions(prev => {
      const currentRoleConfig = prev[role];
      const hasModule = currentRoleConfig.allowedModules.includes(moduleId);
      const newAllowed = hasModule
        ? currentRoleConfig.allowedModules.filter(m => m !== moduleId)
        : [...currentRoleConfig.allowedModules, moduleId];
      return {
        ...prev,
        [role]: {
          ...currentRoleConfig,
          allowedModules: newAllowed
        }
      };
    });
  };

  const togglePermissionForRole = (role: UserRole, permissionKey: keyof RolePermissions) => {
    setRolePermissions(prev => {
      const currentRoleConfig = prev[role];
      return {
        ...prev,
        [role]: {
          ...currentRoleConfig,
          permissions: {
            ...currentRoleConfig.permissions,
            [permissionKey]: !currentRoleConfig.permissions[permissionKey]
          }
        }
      };
    });
  };

  const updateSettings = (newSettings: Partial<CrmSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const resetToDemoData = () => {
    localStorage.removeItem('aurum_leads');
    localStorage.removeItem('aurum_funnels');
    localStorage.removeItem('aurum_activities');
    localStorage.removeItem('aurum_contracts');
    localStorage.removeItem('aurum_commissions');
    localStorage.removeItem('aurum_settings');
    localStorage.removeItem('aurum_users');
    localStorage.removeItem('aurum_current_user_id');
    localStorage.removeItem('aurum_role_permissions');

    setLeads(INITIAL_LEADS);
    setFunnels(DEFAULT_FUNNELS);
    setActivities(INITIAL_ACTIVITIES);
    setContracts(INITIAL_CONTRACTS);
    setCommissions(INITIAL_COMMISSIONS);
    setSettings(DEFAULT_SETTINGS);
    setUsers(DEFAULT_USERS);
    setCurrentUserId('user-admin-1');
    setRolePermissions(DEFAULT_ROLE_PERMISSIONS);
    setAdminFilterBrokerId('all');

    crmApi.resetState().catch(err => console.log('Reset backend:', err));
  };

  const clearAllData = () => {
    setLeads([]);
    setActivities([]);
    setContracts([]);
    setCommissions([]);
    crmApi.clearState().catch(err => console.log('Clear backend:', err));
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <CrmContext.Provider
      value={{
        activeView,
        setActiveView,
        activeFunnelId,
        setActiveFunnelId,
        leads,
        clients,
        findClientMatch,
        getClientLeads,
        importLeadsBulk,
        funnels,
        activities,
        contracts,
        commissions,
        settings,
        notifications,
        visibleLeads,
        visibleActivities,
        visibleContracts,
        visibleCommissions,
        adminFilterBrokerId,
        setAdminFilterBrokerId,
        selectedLead,
        setSelectedLead,
        isNewLeadModalOpen,
        setIsNewLeadModalOpen,
        isImportModalOpen,
        setIsImportModalOpen,
        importType,
        setImportType,
        isSaleModalOpen,
        setIsSaleModalOpen,
        saleModalLead,
        setSaleModalLead,
        isGoalModalOpen,
        setIsGoalModalOpen,
        isMyProfileModalOpen,
        setIsMyProfileModalOpen,
        isCommandPaletteOpen,
        setIsCommandPaletteOpen,
        isMobileSidebarOpen,
        setIsMobileSidebarOpen,
        isAuthenticated,
        isAuthLoading,
        authToken,
        login,
        firstAccess,
        acceptInvite,
        logout,
        isWhatsAppModalOpen,
        setIsWhatsAppModalOpen,
        whatsAppModalLead,
        setWhatsAppModalLead,
        whatsAppModalInitialTab,
        setWhatsAppModalInitialTab,
        openWhatsAppForLead,
        openWhatsAppDirectHub,
        isClientPortalModalOpen,
        setIsClientPortalModalOpen,
        clientPortalLead,
        setClientPortalLead,
        openClientPortalModal,
        submitClientOnboardingData,
        generateClientPortalLink,
        users,
        currentUser,
        currentUserId,
        setCurrentUserId,
        rolePermissions,
        addUser,
        updateUser,
        deleteUser,
        updateRolePermissions,
        toggleModuleForRole,
        togglePermissionForRole,
        hasModuleAccess,
        hasPermission,
        addLead,
        updateLead,
        deleteLead,
        moveLeadStage,
        leadStatusFilter,
        setLeadStatusFilter,
        markLeadWon,
        markLeadLost,
        reactivateLead,
        addActivity,
        toggleActivityComplete,
        deleteActivity,
        registerSale,
        updateContract,
        deleteContract,
        markCommissionPaid,
        updateSettings,
        resetToDemoData,
        clearAllData,
        markNotificationRead,
        markAllNotificationsRead,
        triggerConfetti,
        outgoingWebhooks,
        createWebhook,
        updateWebhook,
        deleteWebhook,
        testWebhook,
        mcpTokens,
        createMcpToken,
        revokeMcpToken
      }}
    >
      {children}
    </CrmContext.Provider>
  );
};

export const useCrm = () => {
  const context = useContext(CrmContext);
  if (!context) {
    throw new Error('useCrm must be used within a CrmProvider');
  }
  return context;
};
