import {
  Funnel,
  StageDefinition,
  Lead,
  Activity,
  Contract,
  Commission,
  CrmSettings,
  UserProfile,
  RolePermissionConfig,
  ModuleMetadata,
  UserRole,
  OutgoingWebhook,
  McpToken,
  FIXED_COMPANY_NAME
} from '../types';

export const DEFAULT_LEAD_TAGS: string[] = ['Quente', 'Frio', 'Apartamento', 'Casa', 'Investidor', 'Alto padrão', 'WhatsApp'];

export const MODULES_LIST: ModuleMetadata[] = [
  {
    id: 'dashboard',
    name: 'Dashboard & Métricas',
    description: 'Painel geral com indicadores de VGV, conversão do funil, metas e previsão financeira.',
    category: 'Comercial'
  },
  {
    id: 'funnels',
    name: 'Funis de Vendas & Leads',
    description: 'Quadro Kanban interativo para qualificação e movimentação de etapas de negociação.',
    category: 'Comercial'
  },
  {
    id: 'agenda',
    name: 'Agenda & Follow-ups',
    description: 'Gerenciamento de visitas, ligações, reuniões e lembretes de acompanhamento.',
    category: 'Relacionamento'
  },
  {
    id: 'birthdays',
    name: 'Aniversariantes',
    description: 'Controle de aniversários de clientes com disparo de mensagens automáticas no WhatsApp.',
    category: 'Relacionamento'
  },
  {
    id: 'contracts',
    name: 'Contratos & Vendas',
    description: 'Registro oficial de fechamentos de unidades, termos e anexos de escrituras.',
    category: 'Financeiro & Gestão'
  },
  {
    id: 'commissions',
    name: 'Comissões & Parcelas',
    description: 'Gestão de repasses, datas de vencimento e controle de pagamentos recebidos.',
    category: 'Financeiro & Gestão'
  },
  {
    id: 'settings',
    name: 'Configurações & Acessos',
    description: 'Gestão de perfis (Admin/Corretor), permissões de módulos, equipe e integrações.',
    category: 'Sistema'
  }
];

export const DEFAULT_USERS: UserProfile[] = [
  {
    id: 'user-admin-1',
    name: 'Administrador',
    email: '',
    role: 'admin',
    roleLabel: 'Diretor / Administrador',
    creci: '',
    phone: '',
    initials: 'AD',
    avatarColor: '#344E41',
    active: true,
    assignedLeadCount: 0
  }
];

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, RolePermissionConfig> = {
  admin: {
    role: 'admin',
    name: 'Administrador / Gestor',
    badgeLabel: 'ADMINISTRADOR',
    description: 'Acesso irrestrito a todos os módulos, relatórios de toda a equipe e permissões.',
    allowedModules: ['dashboard', 'funnels', 'agenda', 'birthdays', 'contracts', 'commissions', 'settings'],
    permissions: {
      canViewAllLeads: true,
      canDeleteLeads: true,
      canExportLeads: true,
      canViewAllCommissions: true,
      canManageContracts: true,
      canSetGoals: true,
      canManageTeam: true,
      canAccessSettings: true,
      canCreateLeads: true,
      canEditLeads: true,
      canDeleteContracts: true,
      canMarkCommissionsPaid: true,
      canManageWebhooks: true,
      canManageMcp: true,
      canManageWhatsApp: true,
      canViewTeamLeads: true
    }
  },
  broker: {
    role: 'broker',
    name: 'Corretor de Imóveis',
    badgeLabel: 'CORRETOR',
    description: 'Visualiza estritamente os seus próprios leads, visitas, aniversariantes e comissões.',
    allowedModules: ['dashboard', 'funnels', 'agenda', 'birthdays', 'contracts', 'commissions'],
    permissions: {
      canViewAllLeads: false,
      canDeleteLeads: false,
      canExportLeads: true,
      canViewAllCommissions: false,
      canManageContracts: true,
      canSetGoals: false,
      canManageTeam: false,
      canAccessSettings: false,
      canCreateLeads: true,
      canEditLeads: true,
      canDeleteContracts: false,
      canMarkCommissionsPaid: false,
      canManageWebhooks: false,
      canManageMcp: false,
      canManageWhatsApp: false,
      canViewTeamLeads: false
    }
  }
};

export const STAGES: StageDefinition[] = [
  { id: 'lead_novo', name: 'Lead Novo' },
  { id: 'primeiro_contato', name: 'Primeiro Contato' },
  { id: 'qualificacao', name: 'Qualificação' },
  { id: 'apresentacao', name: 'Apresentação' },
  { id: 'simulacao', name: 'Simulação' },
  { id: 'reserva', name: 'Reserva' },
  { id: 'documentacao', name: 'Documentação' },
  { id: 'venda_concluida', name: 'Venda Concluída', isSuccess: true },
  { id: 'pos_venda', name: 'Pós-venda' },
];

export const DEFAULT_FUNNELS: Funnel[] = [
  { id: 'investidores', name: 'Investidores', description: 'Funil para compradores de alta renda e investidores' },
  { id: 'moradia', name: 'Moradia', description: 'Funil para famílias e primeiro/segundo imóvel próprio' },
  { id: 'lancamentos', name: 'Lançamentos', description: 'Funil de pré-lançamentos e plantas' }
];

export const DEFAULT_SETTINGS: CrmSettings = {
  companyName: FIXED_COMPANY_NAME,
  slogan: '',
  brokerName: 'Administrador',
  brokerRole: 'Diretor / Administrador',
  brokerInitials: 'AD',
  creci: '',
  brokerPhone: '',
  brokerEmail: '',
  alertsEnabled: true,
  defaultReminderAdvance: '30 minutos antes',
  birthdayTemplate: `Olá {primeiro_nome}! 🎂🥂✨\n\nA {empresa} passa para te desejar um feliz aniversário! Que este novo ciclo venha repleto de saúde, realizações e novas conquistas — incluindo o seu projeto no {imovel}. 🏡✨\n\nConte sempre comigo!\n\n{assinatura}`,
  quickTemplates: [
    {
      id: 'tmpl-link-portal',
      title: '🔗 Envio do Link Seguro de Documentos & Ficha Cadastral',
      category: 'coleta_documentos',
      stage: 'documentacao',
      message: 'Olá {primeiro_nome}, tudo bem? 📑✨\n\nPara agilizar a análise e garantir a reserva exclusiva da sua unidade no *{imovel}*, criamos um portal seguro e criptografado para você preencher seus dados e anexar fotos dos documentos pelo celular:\n\n👉 *Acesse seu link exclusivo:*\n{link_portal}\n\nLeva menos de 3 minutinhos e seus dados ficam 100% protegidos conforme a LGPD. Qualquer dúvida, estou à disposição!',
      audioTip: 'Explique que o link é seguro, criptografado e evita ter que enviar documentos soltos por email.',
      tags: ['Portal', 'Documentos', 'Link do Cliente', 'LGPD']
    },
    {
      id: 'tmpl-1',
      title: '⚡ 1º Contato Imediato (Lead Novo < 5min)',
      category: 'primeiro_contato',
      stage: 'primeiro_contato',
      message: 'Olá {primeiro_nome}, {saudacao}! Aqui é o {corretor}, consultor imobiliário da {empresa}. 🏡\n\nRecebi seu interesse exclusivo no *{imovel}*. Para que eu possa te enviar a apresentação completa e a tabela de valores atualizada, você prefere receber em PDF por aqui ou tem 2 minutinhos para falarmos?',
      audioTip: 'Fale com tom acolhedor e seguro. Mencione o nome do cliente logo nos primeiros 2 segundos.',
      tags: ['Velocidade', 'Lead Novo', 'Apresentação']
    },
    {
      id: 'tmpl-2',
      title: '☕ Convite para Café no Decorado / Stand',
      category: 'visita',
      stage: 'apresentacao',
      message: 'Olá {primeiro_nome}, tudo bem? Separei os melhores horários para receber você e sua família no decorado do *{imovel}*. Tomamos um café especial e você sente a experiência real do espaço! ☕🏢\n\nFica melhor para você nesta *quinta-feira às 16h* ou no *sábado pela manhã*?',
      audioTip: 'Dê sempre duas opções de horário para facilitar a tomada de decisão.',
      tags: ['Visita', 'Decorado', 'Fechamento']
    },
    {
      id: 'tmpl-3',
      title: '📊 Envio de Simulação & Condição Comercial',
      category: 'simulacao',
      stage: 'simulacao',
      message: 'Olá {primeiro_nome}! Preparei a simulação de fluxo para a unidade no *{imovel}* (estimado em *{valor}*). 📄\n\nConseguimos estruturar um fluxo suave com entrada parcelada direto com a construtora e saldo via financiamento bancário com as melhores taxas do mercado. Posso te enviar os números detalhados?',
      audioTip: 'Destaque o poder de negociação e a flexibilidade do fluxo de obras.',
      tags: ['Simulação', 'Financiamento', 'Fluxo']
    }
  ],
  monthlySalesGoalCount: 4,
  monthlySalesGoalVgv: 3500000,
  leadTags: DEFAULT_LEAD_TAGS,
  evolutionApiUrl: '',
  evolutionApiKey: '',
  evolutionInstance: '',
  evolutionEnabled: false,
  evolutionAutoSendOnMove: false,
  inboundWebhookSecret: '',
  inboundWebhookDefaults: {
    funnelId: 'investidores',
    stageId: 'lead_novo'
  },
  mcpEnabled: false
};

export const INITIAL_LEADS: Lead[] = [];

export const INITIAL_ACTIVITIES: Activity[] = [];

export const INITIAL_CONTRACTS: Contract[] = [];

export const INITIAL_COMMISSIONS: Commission[] = [];

export const INITIAL_WEBHOOKS: OutgoingWebhook[] = [];

export const INITIAL_MCP_TOKENS: McpToken[] = [];
