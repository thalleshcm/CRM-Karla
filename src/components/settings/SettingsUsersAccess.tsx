import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Lock,
  CheckCircle2,
  XCircle,
  Trash2,
  Link2,
  Copy,
  Check,
  RefreshCw,
  Ban,
  Power,
  LogOut,
  Clock,
  Users as UsersIcon,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  ScrollText,
  X
} from 'lucide-react';
import { useCrm } from '../../context/CrmContext';
import { crmApi } from '../../services/api';
import { MODULES_LIST } from '../../data/initialData';
import { UserRole, ViewType, RolePermissions, Invite, UserProfile, AuditLogEntry } from '../../types';
import { useSettingsNotification } from './SettingsNotification';
import { useConfirmDanger } from '../ConfirmDangerModal';
import { useEscapeToClose } from '../../hooks/useEscapeToClose';

// Which granular action permissions apply to each module, and how to label them.
// Additive to the module visibility toggle — this is what turns "só oculta módulos"
// into a real per-action permission matrix.
export const MODULE_PERMISSION_MAP: Partial<Record<ViewType, (keyof RolePermissions)[]>> = {
  dashboard: ['canSetGoals'],
  funnels: ['canViewAllLeads', 'canViewTeamLeads', 'canCreateLeads', 'canEditLeads', 'canDeleteLeads', 'canExportLeads'],
  contracts: ['canManageContracts', 'canDeleteContracts'],
  commissions: ['canViewAllCommissions', 'canMarkCommissionsPaid'],
  settings: ['canManageTeam', 'canAccessSettings', 'canManageWebhooks', 'canManageMcp', 'canManageWhatsApp']
};

export const PERMISSION_LABELS: Record<keyof RolePermissions, { label: string; description: string }> = {
  canViewAllLeads: { label: 'Ver todos os leads', description: 'Sem isso, o corretor só vê os leads atribuídos a ele.' },
  canViewTeamLeads: { label: 'Ver leads da equipe supervisionada', description: 'Além dos próprios, vê os leads de quem tem esse corretor como gestor (campo "Gestor" no cadastro do usuário). Ignorado se "Ver todos os leads" já estiver ligado.' },
  canCreateLeads: { label: 'Cadastrar leads', description: 'Permite criar novos leads no funil.' },
  canEditLeads: { label: 'Editar leads', description: 'Permite alterar dados e mover leads entre etapas.' },
  canDeleteLeads: { label: 'Excluir leads', description: 'Permite remover leads permanentemente do sistema.' },
  canExportLeads: { label: 'Exportar (CSV)', description: 'Permite baixar planilhas e exportar contatos.' },
  canViewAllCommissions: { label: 'Ver todas as comissões', description: 'Sem isso, o corretor vê as próprias comissões — e as da equipe supervisionada, se o escopo de dados acima estiver em "Minha equipe".' },
  canMarkCommissionsPaid: { label: 'Marcar comissão como paga', description: 'Permite alterar o status de recebimento das parcelas.' },
  canManageContracts: { label: 'Criar/editar contratos', description: 'Permite registrar vendas e editar contratos existentes.' },
  canDeleteContracts: { label: 'Excluir contratos', description: 'Permite remover contratos e suas parcelas de comissão.' },
  canSetGoals: { label: 'Definir metas', description: 'Permite ajustar a meta mensal de vendas e VGV.' },
  canManageTeam: { label: 'Gerenciar equipe', description: 'Permite cadastrar, editar e remover membros da equipe.' },
  canAccessSettings: { label: 'Acessar configurações gerais', description: 'Perfil, lembretes e dados da imobiliária.' },
  canManageWebhooks: { label: 'Gerenciar webhooks', description: 'Criar, testar e remover integrações via webhook.' },
  canManageMcp: { label: 'Gerenciar servidor MCP', description: 'Emitir e revogar tokens de acesso para assistentes de IA.' },
  canManageWhatsApp: { label: 'Gerenciar conexão WhatsApp', description: 'Configurar a instância, ver QR Code e desconectar/excluir a conexão.' }
};

// canViewAllLeads + canViewTeamLeads together encode a single 3-way "escopo
// de dados" concept (own/team/all) — surfaced as one radio group instead of
// two separate toggles so it can't land in the nonsensical "both team AND
// all" or get out of sync with itself.
type DataScope = 'own' | 'team' | 'all';

const scopeOf = (perms: RolePermissions): DataScope => {
  if (perms.canViewAllLeads) return 'all';
  if (perms.canViewTeamLeads) return 'team';
  return 'own';
};

const SCOPE_LABELS: Record<DataScope, { label: string; description: string }> = {
  own: { label: 'Somente meus registros', description: 'Vê apenas leads, contratos e comissões atribuídos a si mesmo.' },
  team: { label: 'Minha equipe', description: 'Vê também os registros de quem tem este perfil como gestor (campo "Gestor").' },
  all: { label: 'Toda a imobiliária', description: 'Vê os registros de todos os corretores, sem restrição.' }
};

export const PermissionsSection: React.FC = () => {
  const { rolePermissions, toggleModuleForRole, togglePermissionForRole, updateRolePermissions } = useCrm();
  const showNotification = useSettingsNotification();
  const brokerRoleConfig = rolePermissions.broker;

  const setBrokerScope = (scope: DataScope) => {
    updateRolePermissions('broker', {
      permissions: {
        ...brokerRoleConfig.permissions,
        canViewAllLeads: scope === 'all',
        canViewTeamLeads: scope === 'team'
      }
    });
    showNotification(`Escopo de dados do corretor definido como "${SCOPE_LABELS[scope].label}".`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="bg-[#344E41] text-[#E9EDC9] rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#A3B18A]" />
          <h3 className="font-serif-title text-base font-bold text-white">
            Matriz de Perfis e Permissões de Acesso (RBAC)
          </h3>
        </div>
        <p className="text-xs text-[#EAE7E2]/80 max-w-2xl mt-1">
          Configure com precisão quais módulos do sistema e permissões operacionais cada perfil pode acessar. Administradores possuem visão executiva total.
        </p>
      </div>

      <section className="bg-white rounded-2xl p-6 border border-[#EAE7E2] shadow-2xs space-y-5">
        <div className="border-b border-[#EAE7E2] pb-3 flex items-center justify-between">
          <div>
            <h3 className="font-serif-title text-lg font-semibold text-[#344E41]">
              Módulos & Permissões do Corretor
            </h3>
            <p className="text-xs text-[#3A403A]/60">
              Para cada módulo, defina se o corretor enxerga a tela e quais ações específicas ele pode executar nela.
            </p>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-[#F4F1EA] text-[#344E41] px-2.5 py-1 rounded-full border border-[#EAE7E2]">
            {MODULES_LIST.length} Módulos Disponíveis
          </span>
        </div>

        <div className="divide-y divide-[#EAE7E2]">
          {MODULES_LIST.map(mod => {
            const isBrokerAllowed = brokerRoleConfig.allowedModules.includes(mod.id);
            const isScopeModule = mod.id === 'funnels';
            const actionKeys = (MODULE_PERMISSION_MAP[mod.id] || []).filter(
              key => !isScopeModule || (key !== 'canViewAllLeads' && key !== 'canViewTeamLeads')
            );

            return (
              <div key={mod.id} className="py-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-[#344E41]">{mod.name}</span>
                      <span className="text-[10px] font-semibold text-[#588157] bg-[#588157]/10 px-2 py-0.5 rounded-full">
                        {mod.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#3A403A]/60 mt-0.5">{mod.description}</p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#344E41]/10 text-[#344E41] rounded-lg text-xs font-semibold">
                      <Lock className="w-3 h-3 text-[#588157]" />
                      <span>Admin: Total</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#3A403A]/70 font-medium">Visível ao Corretor:</span>
                      <button
                        onClick={() => {
                          toggleModuleForRole('broker', mod.id);
                          showNotification(`Acesso ao módulo "${mod.name}" para corretores atualizado!`);
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs ${
                          isBrokerAllowed
                            ? 'bg-[#588157] text-white hover:bg-[#466945]'
                            : 'bg-[#EAE7E2] text-[#3A403A]/60 hover:bg-[#ded9d2]'
                        }`}
                      >
                        {isBrokerAllowed ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#E9EDC9]" />
                            <span>Liberado</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-[#3A403A]/40" />
                            <span>Bloqueado</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {isScopeModule && (
                  <div className="pl-3 border-l-2 border-[#EAE7E2] space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#3A403A]/50">Escopo de dados (leads, contratos e comissões)</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {(Object.keys(SCOPE_LABELS) as DataScope[]).map(scope => {
                        const meta = SCOPE_LABELS[scope];
                        const isActive = scopeOf(brokerRoleConfig.permissions) === scope;
                        return (
                          <button
                            key={scope}
                            type="button"
                            onClick={() => setBrokerScope(scope)}
                            className={`text-left p-2.5 rounded-lg border transition-colors ${
                              isActive ? 'bg-[#588157]/10 border-[#588157]' : 'bg-[#FDFCFB] border-[#EAE7E2] hover:bg-[#F4F1EA]'
                            }`}
                          >
                            <p className={`text-[11px] font-bold ${isActive ? 'text-[#344E41]' : 'text-[#3A403A]/70'}`}>{meta.label}</p>
                            <p className="text-[10px] text-[#3A403A]/55 mt-0.5 leading-snug">{meta.description}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {actionKeys.length > 0 && (
                  <div className="pl-3 border-l-2 border-[#EAE7E2] grid grid-cols-1 md:grid-cols-2 gap-2">
                    {actionKeys.map(key => {
                      const meta = PERMISSION_LABELS[key];
                      const enabled = brokerRoleConfig.permissions[key];
                      return (
                        <div
                          key={key}
                          className="p-2.5 rounded-lg border border-[#EAE7E2] bg-[#FDFCFB] flex items-center justify-between gap-2"
                        >
                          <div>
                            <p className="text-[11px] font-bold text-[#344E41]">{meta.label}</p>
                            <p className="text-[10px] text-[#3A403A]/55">{meta.description}</p>
                          </div>
                          <button
                            onClick={() => togglePermissionForRole('broker', key)}
                            className={`w-9 h-5 shrink-0 flex items-center rounded-full p-0.5 transition-colors ${
                              enabled ? 'bg-[#588157] justify-end' : 'bg-[#EAE7E2] justify-start'
                            }`}
                          >
                            <span className="w-3.5 h-3.5 rounded-full bg-white shadow-xs" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <AuditLogPanel />
    </div>
  );
};

const AUDIT_ACTION_LABELS: Record<string, string> = {
  invite_created: 'Convite criado',
  invite_revoked: 'Convite revogado',
  invite_resent: 'Convite reenviado',
  user_created: 'Usuário criado',
  user_deleted: 'Usuário excluído',
  user_activated: 'Usuário reativado',
  user_deactivated: 'Usuário desativado',
  manager_changed: 'Gestor alterado',
  password_reset: 'Senha redefinida (por admin)',
  password_changed_self: 'Senha alterada',
  sessions_revoked: 'Sessões revogadas',
  module_access_changed: 'Acesso a módulo alterado',
  permission_changed: 'Permissão alterada'
};

const AuditLogPanel: React.FC = () => {
  const [entries, setEntries] = useState<AuditLogEntry[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      setEntries(await crmApi.listAuditLog());
    } catch (err: any) {
      setError(err.message || 'Falha ao carregar auditoria');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="bg-white rounded-2xl p-6 border border-[#EAE7E2] shadow-2xs space-y-4">
      <div className="border-b border-[#EAE7E2] pb-3 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-serif-title text-lg font-semibold text-[#344E41] flex items-center gap-2">
            <ScrollText className="w-4 h-4 text-[#588157]" />
            Auditoria
          </h3>
          <p className="text-xs text-[#3A403A]/60">Ações administrativas sensíveis: convites, ativação/desativação, senhas, sessões e permissões.</p>
        </div>
        <button
          onClick={load}
          disabled={isLoading}
          className="px-3 py-1.5 text-xs font-semibold text-[#3A403A] bg-[#F1EFEC] hover:bg-[#EAE7E2] border border-[#EAE7E2] rounded-xl transition disabled:opacity-50 flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Atualizar</span>
        </button>
      </div>

      {error && (
        <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">
          {error} — rode <code className="bg-rose-100 px-1 rounded">supabase/schema_audit.sql</code> se a tabela ainda não existir.
        </p>
      )}

      {!error && entries && entries.length === 0 && (
        <p className="text-xs text-[#3A403A]/50 italic py-2">Nenhuma atividade registrada ainda.</p>
      )}

      {entries && entries.length > 0 && (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {entries.map(entry => (
            <div key={entry.id} className="flex items-start justify-between gap-3 p-2.5 rounded-lg border border-[#EAE7E2] bg-[#FDFCFB] text-xs">
              <div>
                <p className="font-semibold text-[#344E41]">
                  {AUDIT_ACTION_LABELS[entry.action] || entry.action} — {entry.targetLabel}
                </p>
                <p className="text-[10px] text-[#3A403A]/55 mt-0.5">
                  {entry.actorName} • {new Date(entry.createdAt).toLocaleString('pt-BR')}
                  {entry.details ? ` • ${entry.details}` : ''}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export const TeamSection: React.FC = () => {
  const { currentUser, users, leads, deleteUser, updateUser, updateLead, authToken, hasPermission } = useCrm();
  const canManageTeam = hasPermission('canManageTeam');
  const showNotification = useSettingsNotification();
  const { modal, requestConfirm } = useConfirmDanger();

  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('broker');
  const [newUserRoleLabel, setNewUserRoleLabel] = useState('Corretor Associado');
  const [newUserCreci, setNewUserCreci] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [generatedInvite, setGeneratedInvite] = useState<{ name: string; link: string } | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const [pendingInvites, setPendingInvites] = useState<(Invite & { expired: boolean })[]>([]);
  const [isLoadingInvites, setIsLoadingInvites] = useState(false);
  const [reassignForUser, setReassignForUser] = useState<UserProfile | null>(null);
  const [reassignTargetId, setReassignTargetId] = useState('');

  const [resetPasswordFor, setResetPasswordFor] = useState<UserProfile | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState('');
  const [resetPasswordError, setResetPasswordError] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'lastLogin' | 'leads'>('name');
  const [page, setPage] = useState(1);
  const USERS_PER_PAGE = 8;

  const loadPendingInvites = async () => {
    setIsLoadingInvites(true);
    try {
      setPendingInvites(await crmApi.listInvites());
    } catch {
      // silent — this list is a convenience, not critical path
    } finally {
      setIsLoadingInvites(false);
    }
  };

  useEffect(() => {
    loadPendingInvites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim() || !authToken) return;

    setIsCreatingInvite(true);
    try {
      const invite = await crmApi.createInvite({
        name: newUserName.trim(),
        email: newUserEmail.trim(),
        role: newUserRole,
        roleLabel: newUserRoleLabel || (newUserRole === 'admin' ? 'Administrador' : 'Corretor'),
        creci: newUserCreci || undefined,
        phone: newUserPhone || undefined
      });

      const link = `${window.location.origin}/?invite=${invite.token}`;
      setGeneratedInvite({ name: invite.name, link });
      setIsAddingUser(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserCreci('');
      setNewUserPhone('');
      showNotification(`Convite gerado para ${invite.name}!`);
      loadPendingInvites();
    } catch (err: any) {
      showNotification(err.message || 'Falha ao gerar convite', 'error');
    } finally {
      setIsCreatingInvite(false);
    }
  };

  const handleCopyLink = () => {
    if (!generatedInvite) return;
    navigator.clipboard.writeText(generatedInvite.link).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  const handleResendInvite = async (invite: Invite) => {
    try {
      const fresh = await crmApi.resendInvite(invite.id);
      const link = `${window.location.origin}/?invite=${fresh.token}`;
      setGeneratedInvite({ name: fresh.name, link });
      showNotification(`Novo link gerado para ${fresh.name}!`);
      loadPendingInvites();
    } catch (err: any) {
      showNotification(err.message || 'Falha ao reenviar convite', 'error');
    }
  };

  const handleRevokeInvite = (invite: Invite) => {
    requestConfirm({
      title: 'Revogar convite',
      description: `Revoga o convite de ${invite.name}. O link deixará de funcionar.`,
      confirmLabel: 'Revogar',
      tone: 'default',
      onConfirm: async () => {
        try {
          await crmApi.revokeInvite(invite.id);
          showNotification(`Convite de ${invite.name} revogado.`);
          loadPendingInvites();
        } catch (err: any) {
          showNotification(err.message || 'Falha ao revogar convite', 'error');
        }
      }
    });
  };

  const openResetPassword = (u: UserProfile) => {
    setResetPasswordFor(u);
    setResetPasswordValue('');
    setResetPasswordConfirm('');
    setResetPasswordError('');
  };

  const closeResetPassword = () => {
    setResetPasswordFor(null);
    setResetPasswordValue('');
    setResetPasswordConfirm('');
    setResetPasswordError('');
  };

  useEscapeToClose(closeResetPassword, !!resetPasswordFor);

  const handleSubmitResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordFor) return;
    if (resetPasswordValue.length < 6) {
      setResetPasswordError('A senha precisa ter ao menos 6 caracteres.');
      return;
    }
    if (resetPasswordValue !== resetPasswordConfirm) {
      setResetPasswordError('As senhas não coincidem.');
      return;
    }
    setIsResettingPassword(true);
    try {
      if (authToken) await crmApi.setPassword(authToken, resetPasswordFor.id, resetPasswordValue);
      showNotification(`Senha de ${resetPasswordFor.name} redefinida com sucesso!`);
      closeResetPassword();
    } catch (err: any) {
      setResetPasswordError(err.message || 'Falha ao redefinir senha.');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleRevokeSessions = (u: UserProfile) => {
    // Critical tier (typed confirmation) — this is the admin "panic button"
    // that force-logs-out a teammate everywhere; a stray click shouldn't
    // trigger it the way a bare confirm() dialog easily could.
    requestConfirm({
      title: 'Bloquear login e forçar reautenticação',
      description: `Bloqueia o login de ${u.name} e força reautenticação. Sessões já abertas em outros dispositivos expiram em até 1 hora.`,
      confirmLabel: 'Bloquear e encerrar sessões',
      tone: 'critical',
      typedConfirmation: 'BLOQUEAR',
      onConfirm: async () => {
        try {
          const result = await crmApi.revokeSessions(u.id);
          showNotification(result.message);
        } catch (err: any) {
          showNotification(err.message || 'Falha ao encerrar sessões', 'error');
        }
      }
    });
  };

  const assignedLeadsOf = (userId: string) => leads.filter(l => l.brokerId === userId);

  const activeAdminCount = users.filter(u => u.role === 'admin' && u.active).length;

  // Walk the candidate's manager chain — if it ever reaches back to userId,
  // assigning candidateManagerId as userId's manager would create a cycle
  // (A manages B, B manages A), which would break "minha equipe" visibility
  // (infinite/ambiguous team membership).
  const wouldCreateCycle = (userId: string, candidateManagerId: string): boolean => {
    let current: string | undefined = candidateManagerId;
    const seen = new Set<string>();
    while (current) {
      if (current === userId) return true;
      if (seen.has(current)) break;
      seen.add(current);
      current = users.find(u => u.id === current)?.managerId;
    }
    return false;
  };

  const handleToggleActive = (u: UserProfile) => {
    if (u.active) {
      if (u.role === 'admin' && activeAdminCount <= 1) {
        showNotification('Não é possível desativar o último administrador ativo — isso travaria o acesso administrativo do sistema.', 'warning');
        return;
      }
      // Deactivating — if they have leads, force a reassignment first so
      // nothing is left pointing at an inactive broker.
      const theirLeads = assignedLeadsOf(u.id);
      if (theirLeads.length > 0) {
        setReassignForUser(u);
        setReassignTargetId('');
        return;
      }
      updateUser(u.id, { active: false });
      showNotification(`${u.name} foi desativado.`);
    } else {
      updateUser(u.id, { active: true });
      showNotification(`${u.name} foi reativado.`);
    }
  };

  const confirmReassignAndDeactivate = () => {
    if (!reassignForUser || !reassignTargetId) return;
    const target = users.find(u => u.id === reassignTargetId);
    if (!target) return;

    const theirLeads = assignedLeadsOf(reassignForUser.id);
    theirLeads.forEach(lead => {
      updateLead(lead.id, { brokerId: target.id, brokerName: target.name });
    });
    updateUser(reassignForUser.id, { active: false, assignedLeadCount: 0 });
    updateUser(target.id, { assignedLeadCount: (target.assignedLeadCount || 0) + theirLeads.length });

    showNotification(`${theirLeads.length} lead(s) de ${reassignForUser.name} transferido(s) para ${target.name}. Usuário desativado.`);
    setReassignForUser(null);
    setReassignTargetId('');
  };

  const filteredUsers = users
    .filter(u => roleFilter === 'all' || u.role === roleFilter)
    .filter(u => statusFilter === 'all' || (statusFilter === 'active' ? u.active : !u.active))
    .filter(u => {
      const term = userSearch.trim().toLowerCase();
      if (!term) return true;
      return u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term) || (u.creci || '').toLowerCase().includes(term);
    })
    .sort((a, b) => {
      if (sortBy === 'lastLogin') return (b.lastLoginAt || '').localeCompare(a.lastLoginAt || '');
      if (sortBy === 'leads') return (b.assignedLeadCount || 0) - (a.assignedLeadCount || 0);
      return a.name.localeCompare(b.name);
    });

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / USERS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * USERS_PER_PAGE, currentPage * USERS_PER_PAGE);

  const handleExportUsersCsv = () => {
    const header = ['Nome', 'E-mail', 'Perfil', 'Status', 'CRECI', 'Telefone', 'Leads na carteira', 'Último acesso'];
    const rows = filteredUsers.map(u => [
      u.name,
      u.email,
      u.roleLabel,
      u.active ? 'Ativo' : 'Inativo',
      u.creci || '',
      u.phone || '',
      String(u.assignedLeadCount ?? 0),
      u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('pt-BR') : 'Nunca acessou'
    ]);
    const csv = [header, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `usuarios-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <section className="bg-white rounded-2xl p-6 border border-[#EAE7E2] shadow-2xs space-y-5 animate-in fade-in duration-150">
      <div className="flex items-center justify-between border-b border-[#EAE7E2] pb-3 flex-wrap gap-2">
        <div>
          <h3 className="font-serif-title text-lg font-semibold text-[#344E41]">
            Equipe de Corretores & Usuários
          </h3>
          <p className="text-xs text-[#3A403A]/60">
            Cadastre novos membros da equipe e atribua os perfis de acesso.
          </p>
        </div>

        <button
          onClick={() => {
            setGeneratedInvite(null);
            setIsAddingUser(true);
          }}
          className="px-3.5 py-2 bg-[#344E41] hover:bg-[#283d33] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
        >
          <UserPlus className="w-3.5 h-3.5 text-[#A3B18A]" />
          <span>Convidar Usuário / Corretor</span>
        </button>
      </div>

      {generatedInvite && (
        <div className="p-5 bg-[#344E41] rounded-2xl space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center gap-2 text-[#E9EDC9]">
            <Link2 className="w-4 h-4 text-[#A3B18A]" />
            <h4 className="text-xs font-bold uppercase tracking-wider">
              Convite gerado para {generatedInvite.name}
            </h4>
          </div>
          <p className="text-[11px] text-[#EAE7E2]/80">
            Envie este link por WhatsApp ou e-mail. Ele expira em 7 dias e só funciona uma vez — a pessoa cria a própria senha ao abrir.
          </p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={generatedInvite.link}
              onFocus={e => e.target.select()}
              className="flex-1 text-xs p-2.5 bg-white/95 border border-white/10 rounded-xl text-[#3A403A] font-mono truncate"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3 py-2.5 bg-[#588157] hover:bg-[#466945] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors"
            >
              {linkCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{linkCopied ? 'Copiado!' : 'Copiar link'}</span>
            </button>
          </div>
          <button
            type="button"
            onClick={() => setGeneratedInvite(null)}
            className="text-[11px] text-[#EAE7E2]/70 hover:text-[#EAE7E2] underline"
          >
            Fechar
          </button>
        </div>
      )}

      {isAddingUser && (
        <form onSubmit={handleCreateInvite} className="p-5 bg-[#F4F1EA]/80 border border-[#EAE7E2] rounded-2xl space-y-4">
          <h4 className="text-xs font-bold text-[#344E41] uppercase tracking-wider">
            Convidar Novo Membro para a Equipe
          </h4>
          <p className="text-[11px] text-[#3A403A]/60 -mt-2">
            Ninguém digita senha aqui — você gera um link de convite e a pessoa cria a própria senha ao aceitar.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#3A403A]/70 mb-1">Nome Completo *</label>
              <input
                required
                type="text"
                placeholder="Ex: Carlos Eduardo Silveira"
                value={newUserName}
                onChange={e => setNewUserName(e.target.value)}
                className="w-full text-xs p-2 bg-white border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#3A403A]/70 mb-1">E-mail Profissional (login) *</label>
              <input
                required
                type="email"
                placeholder="carlos@aurum.com.br"
                value={newUserEmail}
                onChange={e => setNewUserEmail(e.target.value)}
                className="w-full text-xs p-2 bg-white border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#3A403A]/70 mb-1">Perfil de Acesso</label>
              <select
                value={newUserRole}
                onChange={e => {
                  const r = e.target.value as UserRole;
                  setNewUserRole(r);
                  setNewUserRoleLabel(r === 'admin' ? 'Administrador / Gestor' : 'Corretor Associado');
                }}
                className="w-full text-xs p-2 bg-white border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
              >
                <option value="broker">Corretor de Imóveis (Acesso Restrito)</option>
                <option value="admin">Administrador (Acesso Total)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#3A403A]/70 mb-1">Registro CRECI</label>
              <input
                type="text"
                placeholder="CRECI 24.512-F"
                value={newUserCreci}
                onChange={e => setNewUserCreci(e.target.value)}
                className="w-full text-xs p-2 bg-white border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#3A403A]/70 mb-1">Telefone / WhatsApp</label>
              <input
                type="text"
                placeholder="+55 (11) 98765-4321"
                value={newUserPhone}
                onChange={e => setNewUserPhone(e.target.value)}
                className="w-full text-xs p-2 bg-white border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAddingUser(false)}
              className="px-3.5 py-1.5 text-xs text-[#3A403A] border border-[#EAE7E2] rounded-xl hover:bg-white transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isCreatingInvite}
              className="px-4 py-1.5 bg-[#344E41] hover:bg-[#283d33] disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center gap-1.5"
            >
              <Link2 className="w-3.5 h-3.5 text-[#A3B18A]" />
              <span>{isCreatingInvite ? 'Gerando link...' : 'Gerar Link de Convite'}</span>
            </button>
          </div>
        </form>
      )}

      {!isLoadingInvites && pendingInvites.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[11px] font-bold text-[#3A403A]/60 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Convites Pendentes ({pendingInvites.length})
          </h4>
          {pendingInvites.map(inv => (
            <div
              key={inv.id}
              className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                inv.expired ? 'bg-rose-50/60 border-rose-200' : 'bg-[#F4F1EA]/60 border-[#EAE7E2]'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-[#344E41]">{inv.name}</span>
                  <span className="text-[10px] text-[#3A403A]/60">{inv.roleLabel}</span>
                  {inv.expired && (
                    <span className="text-[9px] font-bold uppercase text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">Expirado</span>
                  )}
                </div>
                <p className="text-[11px] text-[#3A403A]/60 mt-0.5">
                  {inv.email} • expira em {new Date(inv.expiresAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleResendInvite(inv)}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-[#F1EFEC] hover:bg-[#EAE7E2] text-[#3A403A] border border-[#EAE7E2] flex items-center gap-1"
                  title="Gera um novo link e revoga o antigo"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Reenviar</span>
                </button>
                <button
                  onClick={() => handleRevokeInvite(inv)}
                  title="Revogar convite"
                  className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200"
                >
                  <Ban className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {reassignForUser && (
        <div className="p-5 bg-amber-50 border border-amber-300 rounded-2xl space-y-3">
          <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
            <UsersIcon className="w-3.5 h-3.5" />
            Reatribuir leads antes de desativar {reassignForUser.name}
          </h4>
          <p className="text-[11px] text-amber-800">
            {assignedLeadsOf(reassignForUser.id).length} lead(s) estão com {reassignForUser.name}. Escolha quem assume a carteira antes de desativar — ninguém fica sem responsável.
          </p>
          <select
            value={reassignTargetId}
            onChange={e => setReassignTargetId(e.target.value)}
            className="w-full text-xs p-2 bg-white border border-amber-300 rounded-xl text-[#3A403A] focus:outline-hidden"
          >
            <option value="">Selecione o novo responsável...</option>
            {users
              .filter(u => u.id !== reassignForUser.id && u.active)
              .map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.roleLabel})</option>
              ))}
          </select>
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setReassignForUser(null)}
              className="px-3.5 py-1.5 text-xs text-[#3A403A] border border-[#EAE7E2] rounded-xl hover:bg-white transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!reassignTargetId}
              onClick={confirmReassignAndDeactivate}
              className="px-4 py-1.5 bg-amber-700 hover:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl shadow-xs transition"
            >
              Reatribuir e desativar
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 pt-1">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-[#3A403A]/40 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome, e-mail ou CRECI..."
            value={userSearch}
            onChange={e => {
              setUserSearch(e.target.value);
              setPage(1);
            }}
            className="w-full text-xs pl-8 pr-3 py-2 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
          />
        </div>
        <select
          value={roleFilter}
          onChange={e => {
            setRoleFilter(e.target.value as 'all' | UserRole);
            setPage(1);
          }}
          className="text-xs p-2 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A]"
        >
          <option value="all">Todos os perfis</option>
          <option value="admin">Administrador</option>
          <option value="broker">Corretor</option>
        </select>
        <select
          value={statusFilter}
          onChange={e => {
            setStatusFilter(e.target.value as 'all' | 'active' | 'inactive');
            setPage(1);
          }}
          className="text-xs p-2 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A]"
        >
          <option value="all">Todos os status</option>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
        </select>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as 'name' | 'lastLogin' | 'leads')}
          className="text-xs p-2 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A]"
        >
          <option value="name">Ordenar: Nome (A-Z)</option>
          <option value="lastLogin">Ordenar: Último acesso</option>
          <option value="leads">Ordenar: Mais leads</option>
        </select>
        <button
          type="button"
          onClick={handleExportUsersCsv}
          title="Exportar lista filtrada em CSV"
          className="px-3 py-2 text-xs font-semibold text-[#3A403A] bg-[#FDFCFB] hover:bg-[#F4F1EA] border border-[#EAE7E2] rounded-xl transition flex items-center gap-1.5 shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          <span>CSV</span>
        </button>
      </div>

      <p className="text-[11px] text-[#3A403A]/50">
        {filteredUsers.length} usuário{filteredUsers.length !== 1 ? 's' : ''} encontrado{filteredUsers.length !== 1 ? 's' : ''}
        {filteredUsers.length !== users.length ? ` (de ${users.length} no total)` : ''}
      </p>

      <div className="space-y-3">
        {paginatedUsers.map(u => {
          const isCurrent = currentUser.id === u.id;
          return (
            <div
              key={u.id}
              className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 transition-colors ${
                !u.active
                  ? 'bg-[#F1EFEC]/50 border-[#EAE7E2] opacity-70'
                  : isCurrent
                  ? 'bg-[#F4F1EA]/80 border-[#588157]/40 ring-1 ring-[#588157]/30'
                  : 'bg-[#FDFCFB] border-[#EAE7E2]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl text-white font-bold flex items-center justify-center text-xs shadow-2xs shrink-0"
                  style={{ backgroundColor: u.avatarColor || (u.role === 'admin' ? '#344E41' : '#588157') }}
                >
                  {u.initials}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-xs text-[#344E41]">{u.name}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        u.role === 'admin'
                          ? 'bg-[#344E41] text-[#E9EDC9]'
                          : 'bg-[#A3B18A]/25 text-[#344E41] border border-[#A3B18A]/40'
                      }`}
                    >
                      {u.role === 'admin' ? 'Administrador' : 'Corretor'}
                    </span>
                    {!u.active && (
                      <span className="text-[9px] font-bold uppercase text-[#3A403A]/60 bg-[#EAE7E2] px-1.5 py-0.5 rounded">
                        Inativo
                      </span>
                    )}
                    {isCurrent && (
                      <span className="text-[10px] text-[#588157] font-bold bg-[#A3B18A]/20 px-2 py-0.2 rounded-md">
                        Você
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#3A403A]/60 mt-0.5">
                    {u.roleLabel} • {u.creci} • {u.email}
                  </p>
                  <p className="text-[10px] text-[#3A403A]/45 mt-0.5">
                    {(u.assignedLeadCount ?? 0)} lead(s) na carteira
                    {u.lastLoginAt ? ` • último acesso em ${new Date(u.lastLoginAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}` : ' • nunca acessou'}
                  </p>
                  {canManageTeam && u.role === 'broker' && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="text-[10px] text-[#3A403A]/50">Gestor:</span>
                      <select
                        value={u.managerId || ''}
                        onChange={e => {
                          const newManagerId = e.target.value || undefined;
                          if (newManagerId && wouldCreateCycle(u.id, newManagerId)) {
                            showNotification('Isso criaria um ciclo de gestão (um gerenciando o outro) — escolha outro gestor.', 'warning');
                            return;
                          }
                          updateUser(u.id, { managerId: newManagerId });
                        }}
                        className="text-[10px] py-0.5 px-1.5 bg-white border border-[#EAE7E2] rounded-lg text-[#3A403A]"
                      >
                        <option value="">Nenhum (só vê os próprios leads)</option>
                        {users
                          .filter(mgr => mgr.id !== u.id && mgr.active && !wouldCreateCycle(u.id, mgr.id))
                          .map(mgr => (
                            <option key={mgr.id} value={mgr.id}>{mgr.name}</option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {canManageTeam && !isCurrent && (
                  <button
                    onClick={() => handleToggleActive(u)}
                    title={u.active ? 'Desativar usuário' : 'Reativar usuário'}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 border ${
                      u.active
                        ? 'bg-[#F1EFEC] hover:bg-[#EAE7E2] text-[#3A403A] border-[#EAE7E2]'
                        : 'bg-[#588157] hover:bg-[#466945] text-white border-transparent'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>{u.active ? 'Desativar' : 'Reativar'}</span>
                  </button>
                )}

                {canManageTeam && (
                  <button
                    onClick={() => openResetPassword(u)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors bg-[#F1EFEC] hover:bg-[#EAE7E2] text-[#3A403A] border border-[#EAE7E2]"
                  >
                    Redefinir senha
                  </button>
                )}

                {canManageTeam && !isCurrent && (
                  <button
                    onClick={() => handleRevokeSessions(u)}
                    title="Bloquear login e forçar reautenticação em todos os dispositivos"
                    className="p-1.5 text-[#3A403A]/60 hover:bg-[#F1EFEC] rounded-lg transition-colors border border-transparent hover:border-[#EAE7E2]"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}

                {canManageTeam && users.length > 1 && !isCurrent && (
                  <button
                    onClick={() => {
                      if (u.role === 'admin' && activeAdminCount <= 1) {
                        showNotification('Não é possível remover o último administrador ativo — isso travaria o acesso administrativo do sistema.', 'warning');
                        return;
                      }
                      requestConfirm({
                        title: 'Excluir usuário permanentemente',
                        description: `Remove ${u.name} e não pode ser desfeito. Prefira "Desativar" para preservar o histórico de leads, contratos e comissões — a exclusão definitiva deve ser excepcional.${
                          assignedLeadsOf(u.id).length > 0
                            ? ` Este usuário tem ${assignedLeadsOf(u.id).length} lead(s) atribuído(s) que ficarão órfãos.`
                            : ''
                        }`,
                        confirmLabel: 'Excluir permanentemente',
                        tone: 'critical',
                        typedConfirmation: 'EXCLUIR',
                        onConfirm: () => {
                          deleteUser(u.id);
                          showNotification(`Usuário ${u.name} removido.`);
                        }
                      });
                    }}
                    title="Remover usuário permanentemente"
                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {filteredUsers.length === 0 && (
          <p className="text-xs text-[#3A403A]/50 italic py-6 text-center">Nenhum usuário encontrado com esse filtro.</p>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-1">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="p-1.5 text-[#3A403A] border border-[#EAE7E2] rounded-lg hover:bg-[#F4F1EA] disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] text-[#3A403A]/60">Página {currentPage} de {totalPages}</span>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            className="p-1.5 text-[#3A403A] border border-[#EAE7E2] rounded-lg hover:bg-[#F4F1EA] disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {resetPasswordFor && (
        <div
          className="fixed inset-0 z-100 bg-black/50 flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={closeResetPassword}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                  <Lock className="w-5 h-5 text-amber-600" />
                </div>
                <h3 className="font-serif-title text-base font-semibold text-[#344E41]">
                  Redefinir senha de {resetPasswordFor.name}
                </h3>
              </div>
              <button onClick={closeResetPassword} className="p-1 text-[#3A403A]/40 hover:text-[#3A403A] transition-colors" aria-label="Fechar">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitResetPassword} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-[#3A403A]/70 mb-1">Nova senha</label>
                <input
                  type="password"
                  required
                  autoFocus
                  minLength={6}
                  value={resetPasswordValue}
                  onChange={e => setResetPasswordValue(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full text-xs p-2.5 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-[#3A403A]/70 mb-1">Confirmar nova senha</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={resetPasswordConfirm}
                  onChange={e => setResetPasswordConfirm(e.target.value)}
                  placeholder="Repita a senha"
                  className="w-full text-xs p-2.5 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
                />
              </div>

              {resetPasswordError && <p className="text-[11px] text-rose-600 font-medium">{resetPasswordError}</p>}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeResetPassword}
                  disabled={isResettingPassword}
                  className="px-3.5 py-2 text-xs font-medium text-[#3A403A] border border-[#EAE7E2] rounded-xl hover:bg-[#F4F1EA] transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isResettingPassword}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#344E41] hover:bg-[#283d33] rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  {isResettingPassword ? 'Salvando...' : 'Redefinir senha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal}
    </section>
  );
};
