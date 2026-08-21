import React, { useState, useEffect } from 'react';
import {
  Bell,
  MessageSquare,
  Building2,
  User,
  Save,
  RotateCcw,
  Check,
  Sparkles,
  Trash2,
  Plus,
  Send,
  Shield,
  ShieldCheck,
  Users,
  UserPlus,
  Lock,
  Unlock,
  Eye,
  KeyRound,
  DollarSign,
  Briefcase,
  Layers,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Radio,
  QrCode,
  RefreshCw,
  Zap,
  ExternalLink,
  FileText,
  Copy,
  Edit2
} from 'lucide-react';
import { useCrm } from '../context/CrmContext';
import { Header } from './Header';
import { DEFAULT_SETTINGS, MODULES_LIST } from '../data/initialData';
import { UserRole, ViewType, RolePermissions, UserProfile, WhatsAppTemplate, WhatsAppScriptCategory } from '../types';
import {
  checkEvolutionConnection,
  getEvolutionQrCode,
  createEvolutionInstance,
  logoutEvolutionInstance,
  deleteEvolutionInstance
} from '../services/evolutionApi';

export const SettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    resetToDemoData,
    clearAllData,
    triggerConfetti,
    currentUser,
    users,
    addUser,
    updateUser,
    deleteUser,
    setCurrentUserId,
    rolePermissions,
    updateRolePermissions,
    toggleModuleForRole,
    togglePermissionForRole,
    hasPermission,
    setIsRoleSwitcherOpen
  } = useCrm();

  const [activeTab, setActiveTab] = useState<'access' | 'profile' | 'whatsapp' | 'reminders' | 'data'>('access');

  // Reminders & Notifications state
  const [alertsEnabled, setAlertsEnabled] = useState(settings.alertsEnabled);
  const [defaultReminder, setDefaultReminder] = useState(settings.defaultReminderAdvance);
  const [birthdayTemplate, setBirthdayTemplate] = useState(settings.birthdayTemplate);

  // Broker & Company profile state
  const [companyName, setCompanyName] = useState(settings.companyName);
  const [slogan, setSlogan] = useState(settings.slogan);
  const [brokerName, setBrokerName] = useState(settings.brokerName);
  const [brokerRole, setBrokerRole] = useState(settings.brokerRole);
  const [brokerInitials, setBrokerInitials] = useState(settings.brokerInitials);
  const [creci, setCreci] = useState(settings.creci);
  const [brokerPhone, setBrokerPhone] = useState(settings.brokerPhone);
  const [brokerEmail, setBrokerEmail] = useState(settings.brokerEmail);

  // Evolution API Integration State
  const [evoUrl, setEvoUrl] = useState(settings.evolutionApiUrl || 'https://evolutionapi.thalleshcm.com.br');
  const [evoKey, setEvoKey] = useState(settings.evolutionApiKey || '');
  const [evoInstance, setEvoInstance] = useState(settings.evolutionInstance || 'aurum-crm');
  const [evoInstanceToken, setEvoInstanceToken] = useState(settings.evolutionInstanceToken || '');
  const [evoPhoneNumber, setEvoPhoneNumber] = useState(settings.evolutionPhoneNumber || '');
  const [evoEnabled, setEvoEnabled] = useState(settings.evolutionEnabled ?? true);
  const [evoAutoSend, setEvoAutoSend] = useState(settings.evolutionAutoSendOnMove ?? false);

  const [evoTesting, setEvoTesting] = useState(false);
  const [evoStatus, setEvoStatus] = useState<{ connected: boolean; message: string } | null>(null);
  const [evoQrCode, setEvoQrCode] = useState<string | null>(null);
  const [evoPairingCode, setEvoPairingCode] = useState<string | null>(null);

  // WhatsApp Templates Manager State
  const [templatesList, setTemplatesList] = useState<WhatsAppTemplate[]>(settings.quickTemplates || []);
  const [editingTemplate, setEditingTemplate] = useState<WhatsAppTemplate | null>(null);
  const [isAddingTemplate, setIsAddingTemplate] = useState(false);
  const [newTmplTitle, setNewTmplTitle] = useState('');
  const [newTmplCategory, setNewTmplCategory] = useState<WhatsAppScriptCategory>('primeiro_contato');
  const [newTmplMessage, setNewTmplMessage] = useState('');

  // New User form state
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('broker');
  const [newUserRoleLabel, setNewUserRoleLabel] = useState('Corretor Associado');
  const [newUserCreci, setNewUserCreci] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [savedMessage, setSavedMessage] = useState('Configurações salvas com sucesso!');

  // Sync templates on settings change
  useEffect(() => {
    setTemplatesList(settings.quickTemplates || []);
  }, [settings.quickTemplates]);

  const showNotification = (msg: string) => {
    setSavedMessage(msg);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
    triggerConfetti();
  };

  const handleSaveBirthday = () => {
    updateSettings({ birthdayTemplate });
    showNotification('Modelo de mensagem de aniversário atualizado!');
  };

  const handleRestoreBirthdayDefault = () => {
    setBirthdayTemplate(DEFAULT_SETTINGS.birthdayTemplate);
    updateSettings({ birthdayTemplate: DEFAULT_SETTINGS.birthdayTemplate });
    showNotification('Modelo padrão restaurado!');
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      companyName,
      slogan,
      brokerName,
      brokerRole,
      brokerInitials,
      creci,
      brokerPhone,
      brokerEmail,
      alertsEnabled,
      defaultReminderAdvance: defaultReminder
    });
    if (currentUser.id === 'user-admin-1') {
      updateUser(currentUser.id, {
        name: brokerName,
        creci,
        phone: brokerPhone,
        email: brokerEmail,
        initials: brokerInitials
      });
    }
    showNotification('Dados da imobiliária e perfil salvos com sucesso!');
  };

  const handleSaveEvolutionConfig = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      evolutionApiUrl: evoUrl.trim(),
      evolutionApiKey: evoKey.trim(),
      evolutionInstance: evoInstance.trim(),
      evolutionInstanceToken: evoInstanceToken.trim(),
      evolutionPhoneNumber: evoPhoneNumber.trim(),
      evolutionEnabled: evoEnabled,
      evolutionAutoSendOnMove: evoAutoSend
    });
    showNotification('Configurações da Evolution API salvas com sucesso!');
  };

  const handleTestEvolutionConnection = async () => {
    setEvoTesting(true);
    setEvoStatus(null);
    try {
      const res = await checkEvolutionConnection({
        apiUrl: evoUrl.trim() || 'https://evolutionapi.thalleshcm.com.br',
        apiKey: evoKey.trim(),
        instance: evoInstance.trim() || 'aurum-crm',
        instanceToken: evoInstanceToken.trim() || undefined
      });
      setEvoStatus(res);
      if (res.connected) {
        triggerConfetti();
      }
    } catch (err: any) {
      setEvoStatus({
        connected: false,
        message: `Erro na requisição: ${err.message || 'Falha ao contatar servidor'}`
      });
    } finally {
      setEvoTesting(false);
    }
  };

  const handleCreateEvolutionInstance = async () => {
    if (!evoKey.trim()) {
      alert('Por favor, informe a Chave Global da Evolution API (apikey) antes de criar a instância.');
      return;
    }
    setEvoTesting(true);
    setEvoStatus(null);
    try {
      const result = await createEvolutionInstance(
        {
          apiUrl: evoUrl.trim() || 'https://evolutionapi.thalleshcm.com.br',
          apiKey: evoKey.trim(),
          instance: evoInstance.trim() || 'aurum-crm'
        },
        evoPhoneNumber.trim() || undefined
      );

      if (result.success) {
        if (result.instanceToken) {
          setEvoInstanceToken(result.instanceToken);
          updateSettings({ evolutionInstanceToken: result.instanceToken });
        }
        if (result.qrcode) {
          setEvoQrCode(result.qrcode);
        }
        setEvoStatus({
          connected: false,
          message: `Instância "${evoInstance}" criada no servidor Evolution API! Escaneie o QR Code para parear com o WhatsApp.`
        });
        showNotification(`Instância "${evoInstance}" criada com sucesso!`);
      } else {
        setEvoStatus({
          connected: false,
          message: `Falha ao criar instância: ${result.error || 'Erro desconhecido'}`
        });
      }
    } catch (err: any) {
      setEvoStatus({
        connected: false,
        message: `Erro ao criar instância: ${err.message}`
      });
    } finally {
      setEvoTesting(false);
    }
  };

  const handleFetchEvolutionQr = async () => {
    setEvoTesting(true);
    setEvoStatus(null);
    try {
      const data = await getEvolutionQrCode({
        apiUrl: evoUrl.trim() || 'https://evolutionapi.thalleshcm.com.br',
        apiKey: evoKey.trim(),
        instance: evoInstance.trim() || 'aurum-crm'
      });
      if (data.base64) {
        setEvoQrCode(data.base64);
        if (data.pairingCode) {
          setEvoPairingCode(data.pairingCode);
        }
        setEvoStatus({
          connected: false,
          message: 'Escaneie o QR Code abaixo com o WhatsApp do seu aparelho para conectar a instância.'
        });
      } else {
        setEvoStatus({
          connected: false,
          message: data.message || data.error || 'QR Code não disponível (a instância pode já estar conectada).'
        });
      }
    } catch (err: any) {
      setEvoStatus({
        connected: false,
        message: `Erro ao obter QR Code: ${err.message}`
      });
    } finally {
      setEvoTesting(false);
    }
  };

  const handleLogoutInstance = async () => {
    if (!confirm(`Deseja desconectar a sessão do WhatsApp da instância "${evoInstance}"?`)) return;
    setEvoTesting(true);
    try {
      const ok = await logoutEvolutionInstance({
        apiUrl: evoUrl.trim() || 'https://evolutionapi.thalleshcm.com.br',
        apiKey: evoKey.trim(),
        instance: evoInstance.trim() || 'aurum-crm'
      });
      if (ok) {
        setEvoStatus({
          connected: false,
          message: `Instância "${evoInstance}" desconectada. Gere um novo QR Code para reconectar.`
        });
        setEvoQrCode(null);
        showNotification('Instância WhatsApp desconectada.');
      }
    } catch (err: any) {
      alert(`Erro ao desconectar: ${err.message}`);
    } finally {
      setEvoTesting(false);
    }
  };

  const handleDeleteInstance = async () => {
    if (!confirm(`Tem certeza que deseja DELETAR a instância "${evoInstance}" do servidor Evolution API?`)) return;
    setEvoTesting(true);
    try {
      const ok = await deleteEvolutionInstance({
        apiUrl: evoUrl.trim() || 'https://evolutionapi.thalleshcm.com.br',
        apiKey: evoKey.trim(),
        instance: evoInstance.trim() || 'aurum-crm'
      });
      if (ok) {
        setEvoStatus({
          connected: false,
          message: `Instância "${evoInstance}" deletada do servidor.`
        });
        setEvoQrCode(null);
        setEvoInstanceToken('');
        updateSettings({ evolutionInstanceToken: '' });
        showNotification('Instância removida com sucesso.');
      }
    } catch (err: any) {
      alert(`Erro ao deletar: ${err.message}`);
    } finally {
      setEvoTesting(false);
    }
  };

  const handleAddTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTmplTitle.trim() || !newTmplMessage.trim()) return;

    const newTmpl: WhatsAppTemplate = {
      id: `tmpl-custom-${Date.now()}`,
      title: newTmplTitle.trim(),
      category: newTmplCategory,
      message: newTmplMessage.trim()
    };

    const updated = [...templatesList, newTmpl];
    setTemplatesList(updated);
    updateSettings({ quickTemplates: updated });
    setIsAddingTemplate(false);
    setNewTmplTitle('');
    setNewTmplMessage('');
    showNotification(`Modelo "${newTmpl.title}" adicionado com sucesso!`);
  };

  const handleSaveEditTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;

    const updated = templatesList.map(t => t.id === editingTemplate.id ? editingTemplate : t);
    setTemplatesList(updated);
    updateSettings({ quickTemplates: updated });
    setEditingTemplate(null);
    showNotification(`Modelo "${editingTemplate.title}" atualizado!`);
  };

  const handleDeleteTemplate = (id: string, title: string) => {
    if (confirm(`Deseja realmente remover o modelo "${title}"?`)) {
      const updated = templatesList.filter(t => t.id !== id);
      setTemplatesList(updated);
      updateSettings({ quickTemplates: updated });
      showNotification(`Modelo "${title}" removido.`);
    }
  };

  const handleRestoreDefaultTemplates = () => {
    if (confirm('Deseja restaurar os modelos de WhatsApp para o padrão de fábrica do Aurum CRM?')) {
      setTemplatesList(DEFAULT_SETTINGS.quickTemplates);
      updateSettings({ quickTemplates: DEFAULT_SETTINGS.quickTemplates });
      showNotification('Modelos restaurados para o padrão original!');
    }
  };

  const handleCreateNewUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) return;

    const initials = newUserName
      .split(' ')
      .slice(0, 2)
      .map(p => p[0])
      .join('')
      .toUpperCase();

    addUser({
      name: newUserName,
      email: newUserEmail || `${newUserName.toLowerCase().replace(/\s+/g, '.')}@aurum.com.br`,
      role: newUserRole,
      roleLabel: newUserRoleLabel || (newUserRole === 'admin' ? 'Administrador' : 'Corretor'),
      creci: newUserCreci || 'CRECI Sob Análise',
      phone: newUserPhone || '+55 (11) 98000-0000',
      initials: initials || 'CO',
      avatarColor: newUserRole === 'admin' ? '#344E41' : '#588157',
      active: true,
      assignedLeadCount: 0
    });

    setIsAddingUser(false);
    setNewUserName('');
    setNewUserEmail('');
    setNewUserCreci('');
    setNewUserPhone('');
    showNotification(`Usuário ${newUserName} adicionado à equipe com sucesso!`);
  };

  const handleTestNotification = () => {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('AURUM CRM', {
          body: 'Lembrete de follow-up: Você tem uma atividade agendada para agora!'
        });
      } else {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification('AURUM CRM', {
              body: 'Notificações ativadas com sucesso no seu navegador!'
            });
          }
        });
      }
    } else {
      alert('Seu navegador não suporta notificações de desktop nativas.');
    }
  };

  // Preview formatted birthday text
  const previewBirthdayText = birthdayTemplate
    .replace(/\{primeiro_nome\}/g, 'Maria')
    .replace(/\{nome\}/g, 'Maria Aparecida')
    .replace(/\{empresa\}/g, companyName)
    .replace(/\{corretor\}/g, brokerName)
    .replace(/\{assinatura\}/g, `${brokerName} — ${companyName}`);

  const adminRole = rolePermissions.admin;
  const brokerRoleConfig = rolePermissions.broker;

  return (
    <div className="flex-1 min-h-screen bg-[#FDFCFB] flex flex-col">
      <Header
        title="Configurações do Sistema & Integrações"
        subtitle="Gerencie perfis de acesso, servidor Evolution API WhatsApp, templates de mensagem, dados da imobiliária e regras de negócio."
      />

      <main className="p-8 max-w-5xl mx-auto w-full space-y-6">
        {savedSuccess && (
          <div className="p-4 bg-[#588157] text-[#E9EDC9] rounded-2xl flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-white" />
              <span className="text-xs font-semibold text-white">{savedMessage}</span>
            </div>
            <Sparkles className="w-4 h-4 text-[#A3B18A]" />
          </div>
        )}

        {/* Settings Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-[#EAE7E2] pb-3 overflow-x-auto">
          <button
            onClick={() => setActiveTab('access')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'access'
                ? 'bg-[#344E41] text-white shadow-xs'
                : 'bg-white text-[#3A403A] hover:bg-[#F4F1EA] border border-[#EAE7E2]'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-[#A3B18A]" />
            <span>Perfis, Equipe & Acessos</span>
          </button>

          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'whatsapp'
                ? 'bg-[#344E41] text-white shadow-xs'
                : 'bg-white text-[#3A403A] hover:bg-[#F4F1EA] border border-[#EAE7E2]'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-emerald-600" />
            <span>WhatsApp & Evolution API</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'profile'
                ? 'bg-[#344E41] text-white shadow-xs'
                : 'bg-white text-[#3A403A] hover:bg-[#F4F1EA] border border-[#EAE7E2]'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-[#588157]" />
            <span>Imobiliária & Perfil</span>
          </button>

          <button
            onClick={() => setActiveTab('reminders')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'reminders'
                ? 'bg-[#344E41] text-white shadow-xs'
                : 'bg-white text-[#3A403A] hover:bg-[#F4F1EA] border border-[#EAE7E2]'
            }`}
          >
            <Bell className="w-3.5 h-3.5 text-[#588157]" />
            <span>Lembretes & Alertas</span>
          </button>

          <button
            onClick={() => setActiveTab('data')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'data'
                ? 'bg-[#344E41] text-white shadow-xs'
                : 'bg-white text-[#3A403A] hover:bg-[#F4F1EA] border border-[#EAE7E2]'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#588157]" />
            <span>Banco de Dados & Backup</span>
          </button>
        </div>

        {/* TAB 1: Perfis & Acessos */}
        {activeTab === 'access' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Header info */}
            <div className="bg-[#344E41] text-[#E9EDC9] rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#A3B18A]" />
                  <h3 className="font-serif-title text-base font-bold text-white">
                    Matriz de Perfis e Permissões de Acesso (RBAC)
                  </h3>
                </div>
                <p className="text-xs text-[#EAE7E2]/80 max-w-2xl">
                  Configure com precisão quais módulos do sistema e permissões operacionais cada perfil pode acessar. Administradores possuem visão executiva total.
                </p>
              </div>

              <button
                onClick={() => setIsRoleSwitcherOpen(true)}
                className="px-4 py-2 bg-[#588157] hover:bg-[#466945] text-white rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center gap-2 shrink-0"
              >
                <Users className="w-4 h-4 text-[#E9EDC9]" />
                <span>Simular Perfis de Usuário</span>
              </button>
            </div>

            {/* Modules Matrix */}
            <section className="bg-white rounded-2xl p-6 border border-[#EAE7E2] shadow-2xs space-y-5">
              <div className="border-b border-[#EAE7E2] pb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-serif-title text-lg font-semibold text-[#344E41]">
                    Visibilidade de Módulos por Perfil
                  </h3>
                  <p className="text-xs text-[#3A403A]/60">
                    Defina quais telas aparecem na barra de navegação para corretores e administradores.
                  </p>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#F4F1EA] text-[#344E41] px-2.5 py-1 rounded-full border border-[#EAE7E2]">
                  {MODULES_LIST.length} Módulos Disponíveis
                </span>
              </div>

              <div className="divide-y divide-[#EAE7E2]">
                {MODULES_LIST.map(mod => {
                  const isAdminAllowed = adminRole.allowedModules.includes(mod.id);
                  const isBrokerAllowed = brokerRoleConfig.allowedModules.includes(mod.id);

                  return (
                    <div key={mod.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                        {/* Admin Badge */}
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#344E41]/10 text-[#344E41] rounded-lg text-xs font-semibold">
                          <Lock className="w-3 h-3 text-[#588157]" />
                          <span>Admin: Total</span>
                        </div>

                        {/* Broker Toggle */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#3A403A]/70 font-medium">Corretor:</span>
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
                  );
                })}
              </div>
            </section>

            {/* Granular Permissions Section */}
            <section className="bg-white rounded-2xl p-6 border border-[#EAE7E2] shadow-2xs space-y-5">
              <div className="border-b border-[#EAE7E2] pb-3">
                <h3 className="font-serif-title text-lg font-semibold text-[#344E41]">
                  Permissões Operacionais do Corretor
                </h3>
                <p className="text-xs text-[#3A403A]/60">
                  Controle detalhes finos de visualização, exclusão de dados e regras de negócio para a equipe de vendas.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-[#EAE7E2] bg-[#FDFCFB] flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-[#344E41]">Visualizar Todos os Leads da Imobiliária</p>
                    <p className="text-[11px] text-[#3A403A]/60 mt-0.5">
                      Permite que o corretor veja todos os leads do funil ou apenas os atribuídos a ele.
                    </p>
                  </div>
                  <button
                    onClick={() => togglePermissionForRole('broker', 'canViewAllLeads')}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                      brokerRoleConfig.permissions.canViewAllLeads ? 'bg-[#588157] justify-end' : 'bg-[#EAE7E2] justify-start'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
                  </button>
                </div>

                <div className="p-4 rounded-xl border border-[#EAE7E2] bg-[#FDFCFB] flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-[#344E41]">Exclusão de Contatos & Leads</p>
                    <p className="text-[11px] text-[#3A403A]/60 mt-0.5">
                      Permitir que corretores excluam registros de clientes do sistema.
                    </p>
                  </div>
                  <button
                    onClick={() => togglePermissionForRole('broker', 'canDeleteLeads')}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                      brokerRoleConfig.permissions.canDeleteLeads ? 'bg-[#588157] justify-end' : 'bg-[#EAE7E2] justify-start'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
                  </button>
                </div>

                <div className="p-4 rounded-xl border border-[#EAE7E2] bg-[#FDFCFB] flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-[#344E41]">Exportação de Relatórios (CSV)</p>
                    <p className="text-[11px] text-[#3A403A]/60 mt-0.5">
                      Autorizar download de planilhas e exportação de contatos.
                    </p>
                  </div>
                  <button
                    onClick={() => togglePermissionForRole('broker', 'canExportLeads')}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                      brokerRoleConfig.permissions.canExportLeads ? 'bg-[#588157] justify-end' : 'bg-[#EAE7E2] justify-start'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
                  </button>
                </div>

                <div className="p-4 rounded-xl border border-[#EAE7E2] bg-[#FDFCFB] flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-[#344E41]">Visualizar Comissões Globais</p>
                    <p className="text-[11px] text-[#3A403A]/60 mt-0.5">
                      Quando desligado, corretores só visualizam suas próprias comissões.
                    </p>
                  </div>
                  <button
                    onClick={() => togglePermissionForRole('broker', 'canViewAllCommissions')}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                      brokerRoleConfig.permissions.canViewAllCommissions ? 'bg-[#588157] justify-end' : 'bg-[#EAE7E2] justify-start'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
                  </button>
                </div>
              </div>
            </section>

            {/* Team Members Management */}
            <section className="bg-white rounded-2xl p-6 border border-[#EAE7E2] shadow-2xs space-y-5">
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
                  onClick={() => setIsAddingUser(true)}
                  className="px-3.5 py-2 bg-[#344E41] hover:bg-[#283d33] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                >
                  <UserPlus className="w-3.5 h-3.5 text-[#A3B18A]" />
                  <span>Novo Usuário / Corretor</span>
                </button>
              </div>

              {/* Add User Modal/Inline Form */}
              {isAddingUser && (
                <form onSubmit={handleCreateNewUser} className="p-5 bg-[#F4F1EA]/80 border border-[#EAE7E2] rounded-2xl space-y-4">
                  <h4 className="text-xs font-bold text-[#344E41] uppercase tracking-wider">
                    Cadastrar Novo Membro na Equipe
                  </h4>
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
                      <label className="block text-[11px] font-bold text-[#3A403A]/70 mb-1">E-mail Profissional</label>
                      <input
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
                      className="px-4 py-1.5 bg-[#344E41] hover:bg-[#283d33] text-white text-xs font-semibold rounded-xl shadow-xs transition"
                    >
                      Salvar Membro
                    </button>
                  </div>
                </form>
              )}

              {/* Users List */}
              <div className="space-y-3">
                {users.map(u => {
                  const isCurrent = currentUser.id === u.id;
                  return (
                    <div
                      key={u.id}
                      className={`p-4 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                        isCurrent
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
                          <div className="flex items-center gap-2">
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
                            {isCurrent && (
                              <span className="text-[10px] text-[#588157] font-bold bg-[#A3B18A]/20 px-2 py-0.2 rounded-md">
                                Você
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#3A403A]/60 mt-0.5">
                            {u.roleLabel} • {u.creci} • {u.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setCurrentUserId(u.id);
                            showNotification(`Perfil alternado para ${u.name} (${u.role === 'admin' ? 'Admin' : 'Corretor'})`);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                            isCurrent
                              ? 'bg-[#344E41] text-white'
                              : 'bg-[#F1EFEC] hover:bg-[#EAE7E2] text-[#3A403A] border border-[#EAE7E2]'
                          }`}
                        >
                          {isCurrent ? <Check className="w-3.5 h-3.5 text-[#A3B18A]" /> : null}
                          <span>{isCurrent ? 'Perfil Ativo' : 'Alternar para este Usuário'}</span>
                        </button>

                        {users.length > 1 && !isCurrent && (
                          <button
                            onClick={() => {
                              if (confirm(`Deseja remover o usuário ${u.name}?`)) {
                                deleteUser(u.id);
                                showNotification(`Usuário ${u.name} removido.`);
                              }
                            }}
                            title="Remover usuário"
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {/* TAB 2: WhatsApp & Evolution API Integration & Templates */}
        {activeTab === 'whatsapp' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Top Banner */}
            <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-[#344E41] text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
                  <h3 className="font-serif-title text-base font-bold text-white">
                    Integração Evolution API & Central de Mensagens
                  </h3>
                </div>
                <p className="text-xs text-emerald-100/80 max-w-2xl">
                  Conecte o servidor da Evolution API para envio instantâneo e automático de mensagens de WhatsApp pelo CRM, sem depender de janelas manuais.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleTestEvolutionConnection}
                  disabled={evoTesting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${evoTesting ? 'animate-spin' : ''}`} />
                  <span>{evoTesting ? 'Testando...' : 'Testar Conexão'}</span>
                </button>
              </div>
            </div>

            {/* Status Alert if any */}
            {evoStatus && (
              <div
                className={`p-4 rounded-2xl border flex items-start gap-3 text-xs ${
                  evoStatus.connected
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-amber-50 border-amber-300 text-amber-900'
                }`}
              >
                {evoStatus.connected ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <p className="font-bold">
                    {evoStatus.connected ? 'Servidor Evolution API Online & Conectado!' : 'Aviso da Conexão Evolution API:'}
                  </p>
                  <p className="leading-relaxed">{evoStatus.message}</p>
                </div>
              </div>
            )}

            {/* Evolution Server Settings Form */}
            <section className="bg-white rounded-2xl p-6 border border-[#EAE7E2] shadow-2xs space-y-5">
              <div className="border-b border-[#EAE7E2] pb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-serif-title text-lg font-semibold text-[#344E41]">
                    Credenciais do Servidor Evolution API
                  </h3>
                  <p className="text-xs text-[#3A403A]/60">
                    Defina o endpoint, chave secreta e o nome da instância pareada com o WhatsApp.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                  Instância: {evoInstance || 'aurum-crm'}
                </span>
              </div>

              <form onSubmit={handleSaveEvolutionConfig} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#3A403A]/70 mb-1">
                      Endpoint / URL da API *
                    </label>
                    <input
                      type="url"
                      required
                      value={evoUrl}
                      onChange={e => setEvoUrl(e.target.value)}
                      placeholder="https://evolutionapi.thalleshcm.com.br"
                      className="w-full text-xs font-mono p-2.5 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#3A403A]/70 mb-1">
                      Nome da Instância *
                    </label>
                    <input
                      type="text"
                      required
                      value={evoInstance}
                      onChange={e => setEvoInstance(e.target.value)}
                      placeholder="aurum-crm"
                      className="w-full text-xs font-mono p-2.5 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#3A403A]/70 mb-1">
                      Chave Global (Global API Key) *
                    </label>
                    <input
                      type="password"
                      value={evoKey}
                      onChange={e => setEvoKey(e.target.value)}
                      placeholder="Token Global (/instance/*)"
                      className="w-full text-xs font-mono p-2.5 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Usada para criar, listar, conectar e excluir instâncias.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#3A403A]/70 mb-1">
                      Token da Instância (Opcional)
                    </label>
                    <input
                      type="password"
                      value={evoInstanceToken}
                      onChange={e => setEvoInstanceToken(e.target.value)}
                      placeholder="Hash / Token específico da instância"
                      className="w-full text-xs font-mono p-2.5 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Usado para envio de mensagens (/message/*).</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#3A403A]/70 mb-1">
                      Número do WhatsApp Conectado
                    </label>
                    <input
                      type="text"
                      value={evoPhoneNumber}
                      onChange={e => setEvoPhoneNumber(e.target.value)}
                      placeholder="5511999999999"
                      className="w-full text-xs font-mono p-2.5 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Com DDI + DDD (ex: 5511999999999).</p>
                  </div>
                </div>

                {/* Automation checkboxes */}
                <div className="pt-2 grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-[#EAE7E2]">
                  <label className="flex items-center gap-2 p-3 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl cursor-pointer hover:bg-[#F4F1EA]/50 transition">
                    <input
                      type="checkbox"
                      checked={evoEnabled}
                      onChange={e => setEvoEnabled(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-[#344E41] block">Habilitar Disparo Direto Evolution API</span>
                      <span className="text-[11px] text-[#3A403A]/60">Permite disparos de mensagens e mídias em segundo plano diretamente pela central.</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-3 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl cursor-pointer hover:bg-[#F4F1EA]/50 transition">
                    <input
                      type="checkbox"
                      checked={evoAutoSend}
                      onChange={e => setEvoAutoSend(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-[#344E41] block">Disparo ao Mover Estágio no Kanban</span>
                      <span className="text-[11px] text-[#3A403A]/60">Dispara automaticamente o script da etapa ao mover o card.</span>
                    </div>
                  </label>
                </div>

                <div className="flex items-center justify-between pt-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={handleCreateEvolutionInstance}
                      disabled={evoTesting}
                      className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      title="Cria a instância no servidor Evolution API"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Criar Nova Instância</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleFetchEvolutionQr}
                      disabled={evoTesting}
                      className="px-3.5 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      title="Gera QR Code para escanear no WhatsApp"
                    >
                      <QrCode className="w-3.5 h-3.5 text-emerald-800" />
                      <span>Gerar QR Code</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleLogoutInstance}
                      disabled={evoTesting}
                      className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-medium transition cursor-pointer"
                      title="Desconecta a sessão do WhatsApp"
                    >
                      Desconectar
                    </button>

                    <button
                      type="button"
                      onClick={handleDeleteInstance}
                      disabled={evoTesting}
                      className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-medium transition cursor-pointer"
                      title="Exclui a instância do servidor"
                    >
                      Deletar Instância
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#344E41] hover:bg-[#283d33] text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Salvar Configurações</span>
                  </button>
                </div>
              </form>

              {/* Display QR Code / Pairing Code if requested */}
              {evoQrCode && (
                <div className="p-6 bg-slate-900 text-white rounded-2xl text-center space-y-3 mt-4 animate-in fade-in">
                  <div className="flex items-center justify-center gap-2 text-emerald-400">
                    <QrCode className="w-5 h-5" />
                    <h4 className="font-bold text-sm">Pareamento do WhatsApp via QR Code</h4>
                  </div>
                  <p className="text-xs text-slate-300 max-w-md mx-auto">
                    Abra o WhatsApp no seu celular &gt; Menu dos 3 pontos &gt; <strong>Aparelhos conectados</strong> &gt; <strong>Conectar um aparelho</strong> e aponte para a imagem abaixo:
                  </p>
                  <div className="bg-white p-4 rounded-2xl inline-block shadow-lg mx-auto">
                    <img src={evoQrCode} alt="Evolution API QR Code" className="w-56 h-56 object-contain" />
                  </div>
                  {evoPairingCode && (
                    <div className="text-xs text-slate-300">
                      Código de pareamento: <strong className="font-mono text-emerald-400 bg-slate-800 px-2 py-1 rounded">{evoPairingCode}</strong>
                    </div>
                  )}
                  <div>
                    <button
                      onClick={() => setEvoQrCode(null)}
                      className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl transition cursor-pointer"
                    >
                      Fechar QR Code
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* WhatsApp Templates Library Manager */}
            <section className="bg-white rounded-2xl p-6 border border-[#EAE7E2] shadow-2xs space-y-5">
              <div className="flex items-center justify-between border-b border-[#EAE7E2] pb-3 flex-wrap gap-2">
                <div>
                  <h3 className="font-serif-title text-lg font-semibold text-[#344E41]">
                    Biblioteca de Scripts & Modelos de Mensagem
                  </h3>
                  <p className="text-xs text-[#3A403A]/60">
                    Gerencie os textos pré-formatados utilizados pela equipe nos estágios de vendas e no portal do cliente.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRestoreDefaultTemplates}
                    className="px-3 py-1.5 bg-[#F1EFEC] hover:bg-[#EAE7E2] text-[#3A403A] text-xs font-medium rounded-xl border border-[#EAE7E2] transition flex items-center gap-1"
                    title="Restaurar templates de fábrica"
                  >
                    <RotateCcw className="w-3 h-3 text-[#588157]" />
                    <span>Restaurar Padrão</span>
                  </button>

                  <button
                    onClick={() => setIsAddingTemplate(true)}
                    className="px-3.5 py-1.5 bg-[#344E41] hover:bg-[#283d33] text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#A3B18A]" />
                    <span>Novo Script</span>
                  </button>
                </div>
              </div>

              {/* Form: Add New Template */}
              {isAddingTemplate && (
                <form onSubmit={handleAddTemplate} className="p-5 bg-[#F4F1EA]/80 border border-[#EAE7E2] rounded-2xl space-y-3">
                  <h4 className="text-xs font-bold text-[#344E41] uppercase tracking-wider">
                    Criar Novo Modelo de Mensagem
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-[#3A403A]/70 mb-1">Título do Script *</label>
                      <input
                        required
                        type="text"
                        placeholder="Ex: Convite para Café & Apresentação da Planta"
                        value={newTmplTitle}
                        onChange={e => setNewTmplTitle(e.target.value)}
                        className="w-full text-xs p-2.5 bg-white border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#3A403A]/70 mb-1">Categoria / Estágio</label>
                      <select
                        value={newTmplCategory}
                        onChange={e => setNewTmplCategory(e.target.value as WhatsAppScriptCategory)}
                        className="w-full text-xs p-2.5 bg-white border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
                      >
                        <option value="primeiro_contato">Primeiro Contato</option>
                        <option value="coleta_documentos">Coleta de Documentos (Portal)</option>
                        <option value="visita">Agendamento de Visita</option>
                        <option value="simulacao">Envio de Simulação</option>
                        <option value="fechamento">Proposta & Fechamento</option>
                        <option value="pos_venda">Pós-venda</option>
                        <option value="aniversario">Aniversário</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#3A403A]/70 mb-1">Texto da Mensagem *</label>
                    <textarea
                      required
                      rows={4}
                      placeholder="Olá {primeiro_nome}! Separei uma oportunidade especial no {imovel}..."
                      value={newTmplMessage}
                      onChange={e => setNewTmplMessage(e.target.value)}
                      className="w-full font-mono text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
                    />
                    <p className="text-[10px] text-slate-500 font-mono mt-1">
                      Tags: <code className="bg-[#EAE7E2] px-1 rounded">{'{primeiro_nome}'}</code>, <code className="bg-[#EAE7E2] px-1 rounded">{'{imovel}'}</code>, <code className="bg-[#EAE7E2] px-1 rounded">{'{valor}'}</code>, <code className="bg-[#EAE7E2] px-1 rounded">{'{corretor}'}</code>, <code className="bg-[#EAE7E2] px-1 rounded">{'{link_portal}'}</code>
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingTemplate(false)}
                      className="px-3.5 py-1.5 text-xs text-[#3A403A] border border-[#EAE7E2] rounded-xl hover:bg-white transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-[#344E41] hover:bg-[#283d33] text-white text-xs font-semibold rounded-xl shadow-xs transition"
                    >
                      Salvar Script
                    </button>
                  </div>
                </form>
              )}

              {/* Form: Edit Existing Template */}
              {editingTemplate && (
                <form onSubmit={handleSaveEditTemplate} className="p-5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                      Editando Script: {editingTemplate.title}
                    </h4>
                    <button
                      type="button"
                      onClick={() => setEditingTemplate(null)}
                      className="text-xs text-amber-800 hover:underline"
                    >
                      Cancelar Edição
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-[#3A403A]/70 mb-1">Título do Script *</label>
                      <input
                        required
                        type="text"
                        value={editingTemplate.title}
                        onChange={e => setEditingTemplate({ ...editingTemplate, title: e.target.value })}
                        className="w-full text-xs p-2.5 bg-white border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#3A403A]/70 mb-1">Categoria / Estágio</label>
                      <select
                        value={editingTemplate.category}
                        onChange={e => setEditingTemplate({ ...editingTemplate, category: e.target.value as WhatsAppScriptCategory })}
                        className="w-full text-xs p-2.5 bg-white border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
                      >
                        <option value="primeiro_contato">Primeiro Contato</option>
                        <option value="coleta_documentos">Coleta de Documentos (Portal)</option>
                        <option value="visita">Agendamento de Visita</option>
                        <option value="simulacao">Envio de Simulação</option>
                        <option value="fechamento">Proposta & Fechamento</option>
                        <option value="pos_venda">Pós-venda</option>
                        <option value="aniversario">Aniversário</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#3A403A]/70 mb-1">Texto da Mensagem *</label>
                    <textarea
                      required
                      rows={5}
                      value={editingTemplate.message}
                      onChange={e => setEditingTemplate({ ...editingTemplate, message: e.target.value })}
                      className="w-full font-mono text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setEditingTemplate(null)}
                      className="px-3.5 py-1.5 text-xs text-[#3A403A] border border-[#EAE7E2] rounded-xl hover:bg-white transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-amber-800 hover:bg-amber-900 text-white text-xs font-semibold rounded-xl shadow-xs transition"
                    >
                      Salvar Alterações
                    </button>
                  </div>
                </form>
              )}

              {/* Templates List */}
              <div className="space-y-3">
                {templatesList.map(tmpl => (
                  <div
                    key={tmpl.id}
                    className="p-4 rounded-xl border border-[#EAE7E2] bg-[#FDFCFB] hover:border-[#A3B18A] transition-colors space-y-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs text-[#344E41]">{tmpl.title}</span>
                          <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            {tmpl.category}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => setEditingTemplate(tmpl)}
                          className="p-1.5 text-slate-500 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition"
                          title="Editar Script"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(tmpl.id, tmpl.title)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Remover Script"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs font-mono text-[#3A403A]/80 whitespace-pre-line bg-white p-3 rounded-lg border border-[#EAE7E2]/70 leading-relaxed">
                      {tmpl.message}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* TAB 3: Imobiliária & Perfil */}
        {activeTab === 'profile' && (
          <section className="bg-white rounded-2xl p-6 border border-[#EAE7E2] shadow-2xs space-y-5 animate-in fade-in duration-150">
            <h3 className="font-serif-title text-lg font-semibold text-[#344E41] border-b border-[#EAE7E2] pb-3">
              Dados da Imobiliária e do Corretor
            </h3>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#3A403A]/70 mb-1">
                    Nome da Empresa / Marca
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    className="w-full text-xs p-2.5 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#3A403A]/70 mb-1">
                    Slogan / Subtítulo
                  </label>
                  <input
                    type="text"
                    value={slogan}
                    onChange={e => setSlogan(e.target.value)}
                    className="w-full text-xs p-2.5 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#3A403A]/70 mb-1">
                    Nome do Profissional Responsável
                  </label>
                  <input
                    type="text"
                    value={brokerName}
                    onChange={e => setBrokerName(e.target.value)}
                    className="w-full text-xs p-2.5 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#3A403A]/70 mb-1">
                    Iniciais (Avatar)
                  </label>
                  <input
                    type="text"
                    maxLength={3}
                    value={brokerInitials}
                    onChange={e => setBrokerInitials(e.target.value.toUpperCase())}
                    className="w-full text-xs p-2.5 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#3A403A]/70 mb-1">
                    Cargo / Função
                  </label>
                  <input
                    type="text"
                    value={brokerRole}
                    onChange={e => setBrokerRole(e.target.value)}
                    className="w-full text-xs p-2.5 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#3A403A]/70 mb-1">
                    Registro CRECI
                  </label>
                  <input
                    type="text"
                    value={creci}
                    onChange={e => setCreci(e.target.value)}
                    className="w-full text-xs p-2.5 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#3A403A]/70 mb-1">
                    WhatsApp Profissional
                  </label>
                  <input
                    type="text"
                    value={brokerPhone}
                    onChange={e => setBrokerPhone(e.target.value)}
                    className="w-full text-xs p-2.5 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#3A403A]/70 mb-1">
                    E-mail de Contato
                  </label>
                  <input
                    type="email"
                    value={brokerEmail}
                    onChange={e => setBrokerEmail(e.target.value)}
                    className="w-full text-xs p-2.5 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
                  />
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#344E41] hover:bg-[#283d33] text-white rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar Dados do Perfil</span>
                </button>
              </div>
            </form>
          </section>
        )}

        {/* TAB 4: Lembretes & Notificações */}
        {activeTab === 'reminders' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <section className="bg-white rounded-2xl p-6 border border-[#EAE7E2] shadow-2xs space-y-6">
              <h3 className="font-serif-title text-lg font-semibold text-[#344E41] border-b border-[#EAE7E2] pb-3">
                Lembretes de follow-up & Notificações
              </h3>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-[#344E41]">Alertas ativados</p>
                  <p className="text-[11px] text-[#3A403A]/60 mt-0.5">
                    Quando desligado, você não recebe notificações no sino nem no navegador.
                  </p>
                </div>
                <button
                  onClick={() => {
                    const next = !alertsEnabled;
                    setAlertsEnabled(next);
                    updateSettings({ alertsEnabled: next });
                  }}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    alertsEnabled ? 'bg-[#344E41] justify-end' : 'bg-[#EAE7E2] justify-start'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
                </button>
              </div>

              <div className="space-y-1.5 max-w-xs">
                <label className="block text-xs font-bold uppercase tracking-widest text-[#3A403A]/70">
                  Antecedência padrão do lembrete
                </label>
                <select
                  value={defaultReminder}
                  onChange={e => {
                    setDefaultReminder(e.target.value);
                    updateSettings({ defaultReminderAdvance: e.target.value });
                  }}
                  className="w-full text-xs bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl p-2.5 text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
                >
                  <option value="15 minutos antes">15 minutos antes</option>
                  <option value="30 minutos antes">30 minutos antes</option>
                  <option value="1 hora antes">1 hora antes</option>
                  <option value="1 dia antes">1 dia antes</option>
                </select>
              </div>

              <div className="pt-2">
                <p className="text-xs font-semibold text-[#344E41]">Alertas do navegador</p>
                <p className="text-[11px] text-[#3A403A]/60 mt-0.5">
                  Receba notificações nativas mesmo com o CRM em outra aba.
                </p>
                <div className="flex items-center gap-2.5 mt-3">
                  <button
                    onClick={handleTestNotification}
                    className="px-3.5 py-2 text-xs font-medium text-[#3A403A] bg-[#F1EFEC] hover:bg-[#EAE7E2] border border-[#EAE7E2] rounded-xl transition-colors"
                  >
                    Ativar notificações do navegador
                  </button>
                  <button
                    onClick={handleTestNotification}
                    className="px-3.5 py-2 text-xs font-medium text-[#3A403A] bg-[#F1EFEC] hover:bg-[#EAE7E2] border border-[#EAE7E2] rounded-xl transition-colors"
                  >
                    Testar lembrete
                  </button>
                </div>
              </div>
            </section>

            {/* Mensagem de aniversário (WhatsApp) */}
            <section className="bg-white rounded-2xl p-6 border border-[#EAE7E2] shadow-2xs space-y-5">
              <div className="flex items-center justify-between border-b border-[#EAE7E2] pb-3">
                <h3 className="font-serif-title text-lg font-semibold text-[#344E41]">
                  Mensagem de Aniversário (WhatsApp)
                </h3>
                <span className="text-xs text-[#588157] font-semibold flex items-center gap-1.5 bg-[#A3B18A]/15 px-3 py-1 rounded-full border border-[#A3B18A]/30">
                  <MessageSquare className="w-3.5 h-3.5" /> Automação WhatsApp
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#3A403A]">
                  Modelo de mensagem de felicitação
                </label>
                <textarea
                  rows={7}
                  value={birthdayTemplate}
                  onChange={e => setBirthdayTemplate(e.target.value)}
                  className="w-full font-mono text-xs p-3.5 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
                />
                <p className="text-[11px] text-[#3A403A]/60 font-mono">
                  Variáveis disponíveis:{' '}
                  <code className="text-[#344E41] bg-[#A3B18A]/20 px-1 py-0.5 rounded font-semibold">{'{primeiro_nome}'}</code>{' '}
                  <code className="text-[#344E41] bg-[#A3B18A]/20 px-1 py-0.5 rounded font-semibold">{'{nome}'}</code>{' '}
                  <code className="text-[#344E41] bg-[#A3B18A]/20 px-1 py-0.5 rounded font-semibold">{'{corretor}'}</code>{' '}
                  <code className="text-[#344E41] bg-[#A3B18A]/20 px-1 py-0.5 rounded font-semibold">{'{empresa}'}</code>{' '}
                  <code className="text-[#344E41] bg-[#A3B18A]/20 px-1 py-0.5 rounded font-semibold">{'{assinatura}'}</code>
                </p>
              </div>

              {/* Live Preview Card */}
              <div className="p-4 bg-[#F1EFEC]/60 border border-[#EAE7E2] rounded-xl space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#3A403A]/60">
                  PRÉ-VISUALIZAÇÃO AO VIVO
                </span>
                <div className="bg-white p-4 rounded-xl border border-[#EAE7E2] text-xs text-[#3A403A] whitespace-pre-line leading-relaxed shadow-2xs">
                  {previewBirthdayText}
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  onClick={handleSaveBirthday}
                  className="px-4 py-2.5 bg-[#344E41] hover:bg-[#283d33] text-white rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar modelo de aniversário</span>
                </button>
                <button
                  onClick={handleRestoreBirthdayDefault}
                  className="px-4 py-2.5 bg-[#F1EFEC] hover:bg-[#EAE7E2] text-[#3A403A] rounded-xl text-xs font-medium border border-[#EAE7E2] transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restaurar padrão</span>
                </button>
              </div>
            </section>
          </div>
        )}

        {/* TAB 5: Banco de Dados & Backup */}
        {activeTab === 'data' && (
          <section className="bg-white rounded-2xl p-6 border border-[#EAE7E2] shadow-2xs space-y-4 animate-in fade-in duration-150">
            <h3 className="font-serif-title text-lg font-semibold text-[#344E41] border-b border-[#EAE7E2] pb-3">
              Gerenciamento da Base de Dados
            </h3>
            <p className="text-xs text-[#3A403A]/70">
              Você pode restaurar a qualquer momento os dados de demonstração com imóveis de alto padrão, contatos e comissões, ou limpar os registros para iniciar uma operação real.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => {
                  if (confirm('Deseja restaurar os dados de demonstração iniciais e redefinir perfis?')) {
                    resetToDemoData();
                    showNotification('Dados de demonstração e acessos restaurados com sucesso!');
                  }
                }}
                className="px-4 py-2.5 text-xs font-semibold text-[#344E41] bg-[#A3B18A]/20 hover:bg-[#A3B18A]/35 border border-[#A3B18A]/40 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#588157]" />
                <span>Restaurar dados e perfis de demonstração</span>
              </button>

              <button
                onClick={() => {
                  if (confirm('Tem certeza que deseja limpar todos os leads, atividades e contratos cadastrados?')) {
                    clearAllData();
                    showNotification('Registros limpos com sucesso.');
                  }
                }}
                className="px-4 py-2.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Limpar todos os dados</span>
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};
