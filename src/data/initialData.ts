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
  UserRole
} from '../types';

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
    name: 'Thalles Henrique',
    email: 'thalles.admin@aurum.com.br',
    role: 'admin',
    roleLabel: 'Diretor / Administrador',
    creci: 'CRECI 18.942-F',
    phone: '+55 (11) 98765-4321',
    initials: 'TH',
    avatarColor: '#344E41',
    active: true,
    assignedLeadCount: 3
  },
  {
    id: 'user-broker-1',
    name: 'Juliana Silveira',
    email: 'juliana.corretora@aurum.com.br',
    role: 'broker',
    roleLabel: 'Corretora de Alto Padrão',
    creci: 'CRECI 24.118-F',
    phone: '+55 (11) 98112-9900',
    initials: 'JS',
    avatarColor: '#588157',
    active: true,
    assignedLeadCount: 2
  },
  {
    id: 'user-broker-2',
    name: 'Carlos Mendes',
    email: 'carlos.mendes@aurum.com.br',
    role: 'broker',
    roleLabel: 'Corretor Associado',
    creci: 'CRECI 31.802-F',
    phone: '+55 (11) 97433-2122',
    initials: 'CM',
    avatarColor: '#A3B18A',
    active: true,
    assignedLeadCount: 2
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
      canAccessSettings: true
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
      canAccessSettings: false
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
  companyName: 'AURUM SOLUÇÕES IMOBILIÁRIAS',
  slogan: 'Soluções que constroem legados',
  brokerName: 'Thalles Henrique',
  brokerRole: 'Diretor / Administrador',
  brokerInitials: 'TH',
  creci: 'CRECI 18.942-F',
  brokerPhone: '+55 11 98765-4321',
  brokerEmail: 'thalleshcmartins@gmail.com',
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
  evolutionApiUrl: 'https://evolutionapi.thalleshcm.com.br',
  evolutionApiKey: '',
  evolutionInstance: 'aurum-crm',
  evolutionEnabled: true,
  evolutionAutoSendOnMove: false
};

export const INITIAL_LEADS: Lead[] = [
  {
    id: 'lead-1',
    name: 'Carlos Eduardo Mendes',
    phone: '11994821034',
    email: 'carlos.mendes@investmail.com',
    funnelId: 'investidores',
    stageId: 'lead_novo',
    temperature: 'quente',
    origin: 'Instagram',
    propertyInterest: 'Residencial Jardins 3Q',
    estimatedValue: 890000,
    birthday: '1985-08-18',
    notes: 'Investidor procurando 2 a 3 unidades na planta com potencial de rentabilidade por locação.',
    brokerId: 'user-admin-1',
    brokerName: 'Thalles Henrique',
    lastContactDate: '2026-08-18',
    nextFollowUpDate: '2026-08-22T14:30',
    createdAt: '2026-08-10',
    clientPortalToken: 'portal-lead-1',
    history: [
      {
        id: 'h-1',
        leadId: 'lead-1',
        type: 'stage_change',
        description: 'Lead capturado via campanha Instagram Stories.',
        date: '2026-08-10 14:20',
        author: 'Sistema'
      }
    ]
  },
  {
    id: 'lead-2',
    name: 'Juliana Beatriz Fontes',
    phone: '11981234499',
    email: 'juliana.fontes@medicina.usp.br',
    funnelId: 'investidores',
    stageId: 'qualificacao',
    temperature: 'quente',
    origin: 'Google Ads',
    propertyInterest: 'Infinity Tower Penthouse',
    estimatedValue: 2400000,
    birthday: '1990-08-25',
    notes: 'Médica, busca cobertura duplex na região nobre. Exigência: 4 vagas e vista livre.',
    brokerId: 'user-broker-1',
    brokerName: 'Juliana Silveira',
    lastContactDate: '2026-08-19',
    nextFollowUpDate: '2026-08-22T10:00',
    createdAt: '2026-08-05',
    clientPortalToken: 'portal-lead-2',
    history: [
      {
        id: 'h-2',
        leadId: 'lead-2',
        type: 'call',
        description: 'Ligação de 15 min realizada. Alinhou perfil de busca.',
        date: '2026-08-19 11:30',
        author: 'Juliana Silveira'
      }
    ]
  },
  {
    id: 'lead-4',
    name: 'Dra. Fernanda Siqueira',
    phone: '11987771234',
    email: 'fernanda.siqueira@advogados.com.br',
    funnelId: 'investidores',
    stageId: 'documentacao',
    temperature: 'quente',
    origin: 'WhatsApp',
    propertyInterest: 'Lumina Grand Residence 4Q',
    estimatedValue: 1750000,
    birthday: '1982-08-30',
    notes: 'Documentação enviada pelo portal! Comprovantes de renda e CNH aprovados.',
    brokerId: 'user-admin-1',
    brokerName: 'Thalles Henrique',
    lastContactDate: '2026-08-20',
    nextFollowUpDate: '2026-08-22T11:00',
    createdAt: '2026-07-28',
    clientPortalToken: 'portal-lead-4',
    clientData: {
      fullName: 'Dra. Fernanda Siqueira',
      cpf: '284.912.438-20',
      rg: '42.891.034-X',
      rgEmissor: 'SSP/SP',
      birthDate: '1982-08-30',
      maritalStatus: 'casado_comunhao_parcial',
      profession: 'Advogada Sócia',
      monthlyIncome: 38500,
      email: 'fernanda.siqueira@advogados.com.br',
      phone: '11987771234',
      cep: '04538-132',
      street: 'Rua Joaquim Floriano',
      number: '1052',
      complement: 'Apto 141',
      neighborhood: 'Itaim Bibi',
      city: 'São Paulo',
      state: 'SP',
      spouse: {
        fullName: 'Eduardo Silveira Prado',
        cpf: '193.482.018-91',
        rg: '38.102.944-1',
        birthDate: '1980-05-14',
        profession: 'Engenheiro Diretor',
        monthlyIncome: 45000
      },
      status: 'enviado',
      submittedAt: '2026-08-20 18:40',
      notes: 'Gostaria de dar 35% de entrada e parcelar em 3 balões anuais.',
      documents: []
    },
    history: [
      {
        id: 'h-f1',
        leadId: 'lead-4',
        type: 'client_portal',
        description: 'Cliente enviou cadastro completo e documentos pelo Portal Seguro.',
        date: '2026-08-20 18:40',
        author: 'Portal do Cliente'
      }
    ]
  },
  {
    id: 'lead-5',
    name: 'Roberto Valente',
    phone: '11993321144',
    email: 'rvalente@holding.com.br',
    funnelId: 'investidores',
    stageId: 'venda_concluida',
    temperature: 'quente',
    origin: 'Plantão de Vendas',
    propertyInterest: 'Palazzo Reale Apto 182',
    estimatedValue: 3200000,
    birthday: '1976-11-04',
    notes: 'Contrato assinado! Primeira parcela da comissão a receber.',
    brokerId: 'user-admin-1',
    brokerName: 'Thalles Henrique',
    lastContactDate: '2026-08-18',
    createdAt: '2026-07-15',
    clientPortalToken: 'portal-lead-5'
  }
];

export const INITIAL_ACTIVITIES: Activity[] = [
  {
    id: 'act-1',
    leadId: 'lead-4',
    leadName: 'Dra. Fernanda Siqueira',
    brokerId: 'user-admin-1',
    brokerName: 'Thalles Henrique',
    type: 'ligacao',
    dateTime: '2026-08-22T10:00',
    reminderTime: '30min',
    notes: 'Ligar para revisar os números da simulação e esclarecer fluxo de obras.',
    completed: false,
    createdAt: '2026-08-18'
  },
  {
    id: 'act-2',
    leadId: 'lead-1',
    leadName: 'Carlos Eduardo Mendes',
    brokerId: 'user-admin-1',
    brokerName: 'Thalles Henrique',
    type: 'whatsapp',
    dateTime: '2026-08-22T14:30',
    reminderTime: '30min',
    notes: 'Enviar vídeo exclusivo do andamento das fundações do Jardins.',
    completed: false,
    createdAt: '2026-08-18'
  }
];

export const INITIAL_CONTRACTS: Contract[] = [
  {
    id: 'cont-1',
    leadId: 'lead-5',
    brokerId: 'user-admin-1',
    brokerName: 'Thalles Henrique',
    clientName: 'Roberto Valente',
    enterpriseName: 'Palazzo Reale',
    unit: 'Unidade 182 - Torre Milano',
    value: 3200000,
    closedAt: '2026-08-08',
    firstDueDate: '2026-08-20',
    status: 'assinado',
    commissionPercent: 5,
    brokerCommissionPercent: 45,
    splitPercents: {
      agency: 45,
      manager: 5,
      administrative: 5,
      broker: 45,
      affiliate: 0,
      referrer: 0
    },
    splitBonus: {
      agency: 0,
      manager: 1000,
      administrative: 500,
      broker: 2500,
      affiliate: 0,
      referrer: 0
    },
    totalCommissionValue: 160000,
    brokerCommissionValue: 72000,
    installmentsCount: 3,
    notes: 'Contrato com alienação fiduciária e escritura direta.',
    attachments: []
  }
];

export const INITIAL_COMMISSIONS: Commission[] = [
  {
    id: 'comm-1',
    contractId: 'cont-1',
    brokerId: 'user-admin-1',
    brokerName: 'Thalles Henrique',
    enterpriseName: 'Palazzo Reale',
    clientName: 'Roberto Valente',
    recipientRole: 'corretor',
    installmentNumber: 1,
    totalInstallments: 3,
    dueDate: '2026-08-20',
    amount: 24000,
    bonusAmount: 833.33,
    status: 'a_receber',
    notes: 'Primeira parcela da comissão após assinatura de escritura.'
  },
  {
    id: 'comm-2',
    contractId: 'cont-1',
    brokerId: 'user-admin-1',
    brokerName: 'Thalles Henrique',
    enterpriseName: 'Palazzo Reale',
    clientName: 'Roberto Valente',
    recipientRole: 'corretor',
    installmentNumber: 2,
    totalInstallments: 3,
    dueDate: '2026-09-20',
    amount: 24000,
    bonusAmount: 833.33,
    status: 'a_receber'
  },
  {
    id: 'comm-3',
    contractId: 'cont-1',
    brokerId: 'user-admin-1',
    brokerName: 'Thalles Henrique',
    enterpriseName: 'Palazzo Reale',
    clientName: 'Roberto Valente',
    recipientRole: 'corretor',
    installmentNumber: 3,
    totalInstallments: 3,
    dueDate: '2026-10-20',
    amount: 24000,
    bonusAmount: 833.34,
    status: 'a_receber'
  }
];
