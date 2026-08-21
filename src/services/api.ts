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
  Funnel
} from '../types';

const API_BASE = '/api';

export interface FullBackendState {
  users: UserProfile[];
  funnels: Funnel[];
  rolePermissions: Record<UserRole, RolePermissionConfig>;
  settings: CrmSettings;
  leads: Lead[];
  activities: Activity[];
  contracts: Contract[];
  commissions: Commission[];
  notifications: any[];
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
    const res = await fetch(`${API_BASE}/state`);
    if (!res.ok) throw new Error('Falha ao carregar estado do backend');
    return res.json();
  },

  async syncFullState(state: Partial<FullBackendState>): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/state/sync`, {
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
    const res = await fetch(`${API_BASE}/state/reset`, { method: 'POST' });
    if (!res.ok) throw new Error('Falha ao restaurar dados padrão');
    const data = await res.json();
    return data.state;
  },

  async clearState(): Promise<FullBackendState> {
    const res = await fetch(`${API_BASE}/state/clear`, { method: 'POST' });
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

    const res = await fetch(`${API_BASE}/leads?${query.toString()}`);
    if (!res.ok) throw new Error('Falha ao buscar leads');
    return res.json();
  },

  async createLead(lead: Partial<Lead>): Promise<Lead> {
    const res = await fetch(`${API_BASE}/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lead)
    });
    if (!res.ok) throw new Error('Falha ao criar lead');
    return res.json();
  },

  async updateLead(id: string, updates: Partial<Lead>): Promise<Lead> {
    const res = await fetch(`${API_BASE}/leads/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Falha ao atualizar lead');
    return res.json();
  },

  async deleteLead(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/leads/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    return res.ok;
  },

  async moveLeadStage(id: string, stageId: string, author?: string): Promise<Lead> {
    const res = await fetch(`${API_BASE}/leads/${encodeURIComponent(id)}/stage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stageId, author })
    });
    if (!res.ok) throw new Error('Falha ao mover etapa do lead');
    return res.json();
  },

  async markLeadWon(id: string): Promise<Lead> {
    const res = await fetch(`${API_BASE}/leads/${encodeURIComponent(id)}/won`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Falha ao marcar lead como ganho');
    return res.json();
  },

  async markLeadLost(id: string, reason?: string, notes?: string): Promise<Lead> {
    const res = await fetch(`${API_BASE}/leads/${encodeURIComponent(id)}/lost`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, notes })
    });
    if (!res.ok) throw new Error('Falha ao marcar lead como perdido');
    return res.json();
  },

  // Client Portal
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
    const res = await fetch(`${API_BASE}/activities`);
    if (!res.ok) throw new Error('Falha ao buscar atividades');
    return res.json();
  },

  async createActivity(activity: Partial<Activity>): Promise<Activity> {
    const res = await fetch(`${API_BASE}/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(activity)
    });
    if (!res.ok) throw new Error('Falha ao agendar atividade');
    return res.json();
  },

  async updateActivity(id: string, updates: Partial<Activity>): Promise<Activity> {
    const res = await fetch(`${API_BASE}/activities/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Falha ao atualizar atividade');
    return res.json();
  },

  async toggleActivity(id: string): Promise<Activity> {
    const res = await fetch(`${API_BASE}/activities/${encodeURIComponent(id)}/toggle`, {
      method: 'PUT'
    });
    if (!res.ok) throw new Error('Falha ao alternar status da atividade');
    return res.json();
  },

  async deleteActivity(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/activities/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    return res.ok;
  },

  // Contracts & Commissions
  async getContracts(): Promise<Contract[]> {
    const res = await fetch(`${API_BASE}/contracts`);
    if (!res.ok) throw new Error('Falha ao buscar contratos');
    return res.json();
  },

  async createContract(contractData: any): Promise<Contract> {
    const res = await fetch(`${API_BASE}/contracts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contractData)
    });
    if (!res.ok) throw new Error('Falha ao registrar contrato');
    return res.json();
  },

  async deleteContract(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/contracts/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    return res.ok;
  },

  async getCommissions(): Promise<Commission[]> {
    const res = await fetch(`${API_BASE}/commissions`);
    if (!res.ok) throw new Error('Falha ao buscar comissões');
    return res.json();
  },

  async toggleCommissionPaid(id: string): Promise<Commission> {
    const res = await fetch(`${API_BASE}/commissions/${encodeURIComponent(id)}/pay`, {
      method: 'PUT'
    });
    if (!res.ok) throw new Error('Falha ao alterar status da comissão');
    return res.json();
  },

  // Settings & Users
  async getSettings(): Promise<{ settings: CrmSettings; rolePermissions: Record<UserRole, RolePermissionConfig> }> {
    const res = await fetch(`${API_BASE}/settings`);
    if (!res.ok) throw new Error('Falha ao buscar configurações');
    return res.json();
  },

  async updateSettings(settings: Partial<CrmSettings>): Promise<CrmSettings> {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    if (!res.ok) throw new Error('Falha ao atualizar configurações');
    return res.json();
  },

  async updatePermissions(rolePermissions: Record<UserRole, RolePermissionConfig>): Promise<Record<UserRole, RolePermissionConfig>> {
    const res = await fetch(`${API_BASE}/settings/permissions`, {
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
    const res = await fetch(`${API_BASE}/whatsapp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  }
};
