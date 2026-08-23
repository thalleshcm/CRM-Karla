import {
  Lead,
  Activity,
  Contract,
  Commission,
  CrmSettings,
  UserProfile,
  RolePermissionConfig,
  UserRole,
  ClientOnboardingData,
  Funnel,
  OutgoingWebhook,
  WebhookEvent,
  McpToken,
  Invite,
  AuditLogEntry,
  Client
} from '../types';

const API_BASE = '/api';

// Centralized fetch wrapper — attaches the Bearer token (same localStorage
// key CrmContext uses) to every request automatically, so individual
// crmApi methods below don't each need to thread it through by hand.
function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('aurum_auth_token');
  const headers = new Headers(options.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(`${API_BASE}${path}`, { ...options, headers });
}

export interface FullBackendState {
  users: UserProfile[];
  funnels: Funnel[];
  rolePermissions: Record<UserRole, RolePermissionConfig>;
  settings: CrmSettings;
  leads: Lead[];
  clients: Client[];
  activities: Activity[];
  contracts: Contract[];
  commissions: Commission[];
  notifications: any[];
  outgoingWebhooks: OutgoingWebhook[];
  mcpTokens: McpToken[];
}

export const crmApi = {
  // Health
  async checkHealth(): Promise<{ status: string; records: Record<string, number> }> {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Falha ao checar saúde da API');
    return res.json();
  },

  // State
  async fetchFullState(): Promise<FullBackendState> {
    const res = await apiFetch('/state');
    if (!res.ok) throw new Error('Falha ao carregar estado do backend');
    return res.json();
  },

  async syncFullState(state: Partial<FullBackendState>): Promise<boolean> {
    try {
      const res = await apiFetch('/state/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state)
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async resetState(): Promise<FullBackendState> {
    const res = await apiFetch('/state/reset', { method: 'POST' });
    if (!res.ok) throw new Error('Falha ao restaurar dados padrão');
    const data = await res.json();
    return data.state;
  },

  async clearState(): Promise<FullBackendState> {
    const res = await apiFetch('/state/clear', { method: 'POST' });
    if (!res.ok) throw new Error('Falha ao limpar dados');
    const data = await res.json();
    return data.state;
  },

  // Leads
  async getLeads(params?: { funnelId?: string; brokerId?: string; status?: string; search?: string }): Promise<Lead[]> {
    const query = new URLSearchParams();
    if (params?.funnelId) query.set('funnelId', params.funnelId);
    if (params?.brokerId) query.set('brokerId', params.brokerId);
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);

    const res = await apiFetch(`/leads?${query.toString()}`);
    if (!res.ok) throw new Error('Falha ao buscar leads');
    return res.json();
  },

  async createLead(lead: Partial<Lead>): Promise<Lead> {
    const res = await apiFetch('/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lead)
    });
    if (!res.ok) throw new Error('Falha ao criar lead');
    return res.json();
  },

  async importLeads(rows: Record<string, any>[]): Promise<{ success: boolean; created: number; linkedToExistingClient: number; errors: { row: number; error: string }[] }> {
    const res = await apiFetch('/leads/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows })
    });
    if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || 'Falha ao importar leads');
    return res.json();
  },

  async updateLead(id: string, updates: Partial<Lead>): Promise<Lead> {
    const res = await apiFetch(`/leads/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Falha ao atualizar lead');
    return res.json();
  },

  async deleteLead(id: string): Promise<boolean> {
    const res = await apiFetch(`/leads/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    return res.ok;
  },

  // Files — uploads a file to Supabase Storage and returns its public URL.
  // Callers should store only the returned url, never the raw base64.
  async uploadFile(fileName: string, mimeType: string, dataBase64: string): Promise<{ url: string; path: string; size: number }> {
    const res = await apiFetch('/uploads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName, mimeType, dataBase64 })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Falha ao enviar arquivo');
    }
    return res.json();
  },

  async uploadPortalFile(token: string, fileName: string, mimeType: string, dataBase64: string): Promise<{ url: string; path: string; size: number }> {
    const res = await fetch(`${API_BASE}/portal/${encodeURIComponent(token)}/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName, mimeType, dataBase64 })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Falha ao enviar arquivo');
    }
    return res.json();
  },

  // WhatsApp — proxied through the backend so the Evolution API key never
  // reaches the browser (previously sent as a header directly from the client).
  async sendWhatsAppMessage(recipientPhone: string, text: string): Promise<{ success: boolean; messageId?: string; statusText: string; error?: string; details?: any }> {
    const res = await apiFetch('/whatsapp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientPhone, text })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, statusText: data.error || `Falha ao enviar mensagem (HTTP ${res.status})`, error: data.error, details: data };
    }
    return data;
  },

  async checkWhatsAppStatus(): Promise<{ connected: boolean; state: string; message: string }> {
    const res = await apiFetch('/whatsapp/status');
    if (!res.ok) {
      return { connected: false, state: 'unknown', message: 'Falha ao checar status da conexão.' };
    }
    return res.json();
  },

  // Instance management (create/pair/disconnect/delete) — also proxied
  // through the backend, same reasoning as sendWhatsAppMessage above. These
  // read credentials exclusively from server-side settings, so no apiKey is
  // ever passed in the request body.
  async getWhatsAppQrCode(): Promise<{ base64?: string; qrcode?: string; pairingCode?: string; message?: string; error?: string }> {
    const res = await apiFetch('/whatsapp/qrcode');
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data.error || `Erro ao obter QR Code (HTTP ${res.status})` };
    return data;
  },

  async createWhatsAppInstance(phoneNumber?: string): Promise<{ success: boolean; instanceName?: string; instanceToken?: string; qrcode?: string; error?: string }> {
    const res = await apiFetch('/whatsapp/instance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: data.error || `Erro HTTP ${res.status}` };
    return data;
  },

  async logoutWhatsAppInstance(): Promise<{ success: boolean; error?: string }> {
    const res = await apiFetch('/whatsapp/logout', { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: data.error || `Erro HTTP ${res.status}` };
    return data;
  },

  async deleteWhatsAppInstance(): Promise<{ success: boolean; error?: string }> {
    const res = await apiFetch('/whatsapp/instance', { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: data.error || `Erro HTTP ${res.status}` };
    return data;
  },

  async moveLeadStage(id: string, stageId: string, author?: string): Promise<Lead> {
    const res = await apiFetch(`/leads/${encodeURIComponent(id)}/stage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stageId, author })
    });
    if (!res.ok) throw new Error('Falha ao mover etapa do lead');
    return res.json();
  },

  async markLeadWon(id: string): Promise<Lead> {
    const res = await apiFetch(`/leads/${encodeURIComponent(id)}/won`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Falha ao marcar lead como ganho');
    return res.json();
  },

  async markLeadLost(id: string, reason?: string, notes?: string): Promise<Lead> {
    const res = await apiFetch(`/leads/${encodeURIComponent(id)}/lost`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, notes })
    });
    if (!res.ok) throw new Error('Falha ao marcar lead como perdido');
    return res.json();
  },

  // Client Portal (public, token-authenticated — intentionally not via apiFetch)
  async getClientPortalData(token: string): Promise<any> {
    const res = await fetch(`${API_BASE}/portal/${encodeURIComponent(token)}`);
    if (!res.ok) throw new Error('Portal não encontrado');
    return res.json();
  },

  async submitClientPortalData(token: string, data: ClientOnboardingData): Promise<{ success: boolean; lead: Lead }> {
    const res = await fetch(`${API_BASE}/portal/${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Falha ao enviar dados do portal');
    return res.json();
  },

  // Activities
  async getActivities(): Promise<Activity[]> {
    const res = await apiFetch('/activities');
    if (!res.ok) throw new Error('Falha ao buscar atividades');
    return res.json();
  },

  async createActivity(activity: Partial<Activity>): Promise<Activity> {
    const res = await apiFetch('/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(activity)
    });
    if (!res.ok) throw new Error('Falha ao agendar atividade');
    return res.json();
  },

  async updateActivity(id: string, updates: Partial<Activity>): Promise<Activity> {
    const res = await apiFetch(`/activities/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Falha ao atualizar atividade');
    return res.json();
  },

  async toggleActivity(id: string): Promise<Activity> {
    const res = await apiFetch(`/activities/${encodeURIComponent(id)}/toggle`, {
      method: 'PUT'
    });
    if (!res.ok) throw new Error('Falha ao alternar status da atividade');
    return res.json();
  },

  async deleteActivity(id: string): Promise<boolean> {
    const res = await apiFetch(`/activities/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    return res.ok;
  },

  // Contracts & Commissions
  async getContracts(): Promise<Contract[]> {
    const res = await apiFetch('/contracts');
    if (!res.ok) throw new Error('Falha ao buscar contratos');
    return res.json();
  },

  async createContract(contractData: any): Promise<Contract> {
    const res = await apiFetch('/contracts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contractData)
    });
    if (!res.ok) throw new Error('Falha ao registrar contrato');
    return res.json();
  },

  async deleteContract(id: string): Promise<boolean> {
    const res = await apiFetch(`/contracts/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    return res.ok;
  },

  async getCommissions(): Promise<Commission[]> {
    const res = await apiFetch('/commissions');
    if (!res.ok) throw new Error('Falha ao buscar comissões');
    return res.json();
  },

  async toggleCommissionPaid(id: string): Promise<Commission> {
    const res = await apiFetch(`/commissions/${encodeURIComponent(id)}/pay`, {
      method: 'PUT'
    });
    if (!res.ok) throw new Error('Falha ao alterar status da comissão');
    return res.json();
  },

  // Settings & Users
  async getSettings(): Promise<{ settings: CrmSettings; rolePermissions: Record<UserRole, RolePermissionConfig> }> {
    const res = await apiFetch('/settings');
    if (!res.ok) throw new Error('Falha ao buscar configurações');
    return res.json();
  },

  async updateSettings(settings: Partial<CrmSettings>): Promise<CrmSettings> {
    const res = await apiFetch('/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    if (!res.ok) throw new Error('Falha ao atualizar configurações');
    return res.json();
  },

  async updatePermissions(rolePermissions: Record<UserRole, RolePermissionConfig>): Promise<Record<UserRole, RolePermissionConfig>> {
    const res = await apiFetch('/settings/permissions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rolePermissions)
    });
    if (!res.ok) throw new Error('Falha ao atualizar permissões');
    return res.json();
  },

  // Evolution WhatsApp Proxy
  async sendWhatsAppProxy(payload: {
    recipientPhone: string;
    text: string;
    instance?: string;
    apiKey?: string;
    apiUrl?: string;
  }): Promise<any> {
    const res = await apiFetch('/whatsapp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  // Outgoing Webhooks
  async listWebhooks(): Promise<OutgoingWebhook[]> {
    const res = await apiFetch('/webhooks');
    if (!res.ok) throw new Error('Falha ao buscar webhooks');
    return res.json();
  },

  async createWebhook(payload: { name: string; url: string; events: WebhookEvent[] }): Promise<OutgoingWebhook> {
    const res = await apiFetch('/webhooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || 'Falha ao criar webhook');
    return res.json();
  },

  async updateWebhook(id: string, updates: Partial<Pick<OutgoingWebhook, 'name' | 'url' | 'events' | 'enabled'>>): Promise<OutgoingWebhook> {
    const res = await apiFetch(`/webhooks/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Falha ao atualizar webhook');
    return res.json();
  },

  async deleteWebhook(id: string): Promise<boolean> {
    const res = await apiFetch(`/webhooks/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return res.ok;
  },

  async testWebhook(id: string): Promise<{ success: boolean; status?: number; error?: string }> {
    const res = await apiFetch(`/webhooks/${encodeURIComponent(id)}/test`, { method: 'POST' });
    return res.json();
  },

  // MCP Tokens
  async listMcpTokens(): Promise<McpToken[]> {
    const res = await apiFetch('/mcp/tokens');
    if (!res.ok) throw new Error('Falha ao buscar tokens MCP');
    return res.json();
  },

  async createMcpToken(name: string, scopes: ('read' | 'write')[], expiresInDays?: number): Promise<McpToken & { token: string }> {
    const res = await apiFetch('/mcp/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, scopes, expiresInDays })
    });
    if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || 'Falha ao criar token MCP');
    return res.json();
  },

  async revokeMcpToken(id: string): Promise<boolean> {
    const res = await apiFetch(`/mcp/tokens/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return res.ok;
  },

  // Invites (team invite links — USUARIOS_MELHORIAS.md Fase 1)
  async listInvites(): Promise<(Invite & { expired: boolean })[]> {
    const res = await apiFetch('/invites');
    if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || 'Falha ao buscar convites');
    return res.json();
  },

  async createInvite(payload: { name: string; email: string; role: UserRole; roleLabel?: string; creci?: string; phone?: string }): Promise<Invite> {
    const res = await apiFetch('/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || 'Falha ao criar convite');
    return res.json();
  },

  async revokeInvite(id: string): Promise<boolean> {
    const res = await apiFetch(`/invites/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return res.ok;
  },

  // Atomic resend — server creates the replacement invite before removing
  // the old one, unlike the previous client-side revoke-then-create pattern.
  async resendInvite(id: string): Promise<Invite> {
    const res = await apiFetch(`/invites/${encodeURIComponent(id)}/resend`, { method: 'POST' });
    if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || 'Falha ao reenviar convite');
    return res.json();
  },

  async listAuditLog(): Promise<AuditLogEntry[]> {
    const res = await apiFetch('/audit');
    if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || 'Falha ao buscar auditoria');
    return res.json();
  },

  // Public — used by the invite-acceptance page, before any session exists.
  async getInviteByToken(token: string): Promise<{ name: string; email: string; roleLabel: string }> {
    const res = await fetch(`${API_BASE}/invites/token/${encodeURIComponent(token)}`);
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || 'Convite não encontrado');
    return data;
  },

  async acceptInvite(token: string, password: string): Promise<{ token: string; user: UserProfile }> {
    const res = await fetch(`${API_BASE}/invites/token/${encodeURIComponent(token)}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || 'Falha ao aceitar convite');
    return data;
  },

  // Auth (unauthenticated endpoints use plain fetch; authenticated ones
  // still take an explicit token param since they run before/without
  // CrmContext necessarily having written it to localStorage yet)
  async authSetupStatus(): Promise<{ pendingUsers: { id: string; name: string; role: UserRole }[] }> {
    const res = await fetch(`${API_BASE}/auth/setup-status`);
    if (!res.ok) throw new Error('Falha ao verificar status de configuração');
    return res.json();
  },

  async login(email: string, password: string): Promise<{ token: string; user: UserProfile }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const err: any = new Error(data?.error || 'Falha ao entrar');
      err.code = data?.error;
      throw err;
    }
    return data;
  },

  async firstAccess(payload: { userId?: string; email?: string; password: string }): Promise<{ token: string; user: UserProfile }> {
    const res = await fetch(`${API_BASE}/auth/first-access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || 'Falha ao configurar senha');
    return data;
  },

  async logout(token: string): Promise<void> {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    }).catch(() => {});
  },

  async getSession(token: string): Promise<{ user: UserProfile }> {
    const res = await fetch(`${API_BASE}/auth/session`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Sessão inválida');
    return res.json();
  },

  async setPassword(token: string, userId: string, newPassword: string, currentPassword?: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/auth/set-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId, newPassword, currentPassword })
    });
    if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || 'Falha ao definir senha');
    return true;
  },

  async revokeSessions(userId: string): Promise<{ success: boolean; message: string }> {
    const res = await apiFetch(`/users/${encodeURIComponent(userId)}/revoke-sessions`, { method: 'POST' });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || 'Falha ao encerrar sessões');
    return data;
  }
};
