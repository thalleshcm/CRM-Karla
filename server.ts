import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import {
  Lead,
  Activity,
  Contract,
  Commission,
  UserProfile,
  CrmSettings,
  RolePermissionConfig,
  Funnel,
  UserRole
} from './src/types';

const app = express();
const PORT = 3000;

interface DatabaseSchema {
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

// Body Parsers with generous limits for documents & media base64
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Database File Path
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Clean Default Dataset
const DEFAULT_DATABASE_STATE: DatabaseSchema = {
  users: [
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
  ],
  funnels: [
    { id: 'investidores', name: 'Investidores', description: 'Funil para compradores de alta renda e investidores' },
    { id: 'moradia', name: 'Moradia', description: 'Funil para famílias e primeiro/segundo imóvel próprio' },
    { id: 'lancamentos', name: 'Lançamentos', description: 'Funil de pré-lançamentos e plantas' }
  ],
  rolePermissions: {
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
  },
  settings: {
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
    birthdayTemplate: `Olá {primeiro_nome}! 🎂🥂✨\n\nA {empresa} passa para te desejar um feliz aniversário! Que este novo ciclo venha repleto de saúde, realizações e novas conquistas — incluindo o seu projeto imobiliário no {imovel}. 🏡✨\n\nConte sempre comigo!\n\n{assinatura}`,
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
  },
  leads: [
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
  ],
  activities: [
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
  ],
  contracts: [
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
  ],
  commissions: [
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
  ],
  notifications: [
    {
      id: 'notif-1',
      title: 'Sistema Conectado',
      message: 'Backend do CRM Aurum inicializado com sucesso!',
      date: 'Agora',
      read: false,
      type: 'activity'
    }
  ]
};

// Database state in memory
let dbState: DatabaseSchema = { ...DEFAULT_DATABASE_STATE };

// Load database from file
function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf8');
      if (content && content.trim().length > 0) {
        const parsed = JSON.parse(content);
        dbState = {
          ...DEFAULT_DATABASE_STATE,
          ...parsed,
          settings: { ...DEFAULT_DATABASE_STATE.settings, ...(parsed.settings || {}) }
        };
        return;
      }
    }
  } catch (err) {
    console.error('Error loading db.json, using defaults:', err);
  }
  saveDatabase();
}

// Save database to file
function saveDatabase() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dbState, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving db.json:', err);
  }
}

// Initialize database
loadDatabase();

// ==========================================
// API ROUTES
// ==========================================

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    records: {
      leads: dbState.leads.length,
      activities: dbState.activities.length,
      contracts: dbState.contracts.length,
      commissions: dbState.commissions.length,
      users: dbState.users.length
    }
  });
});

// Full State API (GET, POST full sync, RESET, CLEAR)
app.get('/api/state', (req, res) => {
  res.json(dbState);
});

app.post('/api/state/sync', (req, res) => {
  const incoming = req.body;
  if (!incoming || typeof incoming !== 'object') {
    return res.status(400).json({ error: 'Payload inválido' });
  }

  if (Array.isArray(incoming.leads)) dbState.leads = incoming.leads;
  if (Array.isArray(incoming.funnels)) dbState.funnels = incoming.funnels;
  if (Array.isArray(incoming.activities)) dbState.activities = incoming.activities;
  if (Array.isArray(incoming.contracts)) dbState.contracts = incoming.contracts;
  if (Array.isArray(incoming.commissions)) dbState.commissions = incoming.commissions;
  if (Array.isArray(incoming.users)) dbState.users = incoming.users;
  if (incoming.settings) dbState.settings = { ...dbState.settings, ...incoming.settings };
  if (incoming.rolePermissions) dbState.rolePermissions = incoming.rolePermissions;
  if (Array.isArray(incoming.notifications)) dbState.notifications = incoming.notifications;

  saveDatabase();
  res.json({ success: true, message: 'Estado sincronizado com sucesso', state: dbState });
});

app.post('/api/state/reset', (req, res) => {
  dbState = JSON.parse(JSON.stringify(DEFAULT_DATABASE_STATE));
  saveDatabase();
  res.json({ success: true, message: 'Base de dados restaurada para o padrão', state: dbState });
});

app.post('/api/state/clear', (req, res) => {
  dbState.leads = [];
  dbState.activities = [];
  dbState.contracts = [];
  dbState.commissions = [];
  dbState.notifications = [];
  saveDatabase();
  res.json({ success: true, message: 'Base limpa com sucesso', state: dbState });
});

// ------------------------------------------
// LEADS API
// ------------------------------------------
app.get('/api/leads', (req, res) => {
  let list = [...dbState.leads];
  const { funnelId, brokerId, stageId, search, status } = req.query;

  if (funnelId) {
    list = list.filter(l => l.funnelId === funnelId);
  }
  if (brokerId && brokerId !== 'all') {
    list = list.filter(l => l.brokerId === brokerId);
  }
  if (stageId) {
    list = list.filter(l => l.stageId === stageId);
  }
  if (status === 'ativos') {
    list = list.filter(l => !l.won && !l.lost);
  } else if (status === 'ganhos') {
    list = list.filter(l => l.won || l.stageId === 'venda_concluida');
  } else if (status === 'perdidos') {
    list = list.filter(l => l.lost);
  }
  if (search) {
    const q = String(search).toLowerCase();
    list = list.filter(l =>
      l.name.toLowerCase().includes(q) ||
      (l.phone && l.phone.includes(q)) ||
      (l.email && l.email.toLowerCase().includes(q)) ||
      (l.propertyInterest && l.propertyInterest.toLowerCase().includes(q))
    );
  }

  res.json(list);
});

app.get('/api/leads/:id', (req, res) => {
  const lead = dbState.leads.find(l => l.id === req.params.id || l.clientPortalToken === req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead não encontrado' });
  res.json(lead);
});

app.post('/api/leads', (req, res) => {
  const body = req.body;
  if (!body.name || !body.phone) {
    return res.status(400).json({ error: 'Nome e telefone são obrigatórios' });
  }

  const newId = `lead-${Date.now()}`;
  const nowStr = new Date().toISOString().split('T')[0];
  const newLead = {
    ...body,
    id: newId,
    clientPortalToken: body.clientPortalToken || `portal-${newId}`,
    createdAt: nowStr,
    history: [
      {
        id: `h-${Date.now()}`,
        leadId: newId,
        type: 'created',
        description: 'Lead cadastrado no sistema.',
        date: new Date().toLocaleString('pt-BR'),
        author: body.brokerName || 'Sistema'
      },
      ...(body.history || [])
    ]
  };

  dbState.leads.unshift(newLead);

  // Update user assigned count
  if (newLead.brokerId) {
    const broker = dbState.users.find(u => u.id === newLead.brokerId);
    if (broker) {
      broker.assignedLeadCount = (broker.assignedLeadCount || 0) + 1;
    }
  }

  saveDatabase();
  res.status(201).json(newLead);
});

app.put('/api/leads/:id', (req, res) => {
  const idx = dbState.leads.findIndex(l => l.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Lead não encontrado' });

  const existing = dbState.leads[idx];
  const updated = {
    ...existing,
    ...req.body,
    id: existing.id // protect id
  };

  dbState.leads[idx] = updated;
  saveDatabase();
  res.json(updated);
});

app.delete('/api/leads/:id', (req, res) => {
  const lead = dbState.leads.find(l => l.id === req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead não encontrado' });

  dbState.leads = dbState.leads.filter(l => l.id !== req.params.id);
  dbState.activities = dbState.activities.filter(a => a.leadId !== req.params.id);

  if (lead.brokerId) {
    const broker = dbState.users.find(u => u.id === lead.brokerId);
    if (broker && broker.assignedLeadCount && broker.assignedLeadCount > 0) {
      broker.assignedLeadCount -= 1;
    }
  }

  saveDatabase();
  res.json({ success: true, message: 'Lead excluído com sucesso' });
});

// Stage transition & History
app.post('/api/leads/:id/stage', (req, res) => {
  const { stageId, author } = req.body;
  const lead = dbState.leads.find(l => l.id === req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead não encontrado' });

  const oldStage = lead.stageId;
  lead.stageId = stageId;
  if (!lead.history) lead.history = [];

  lead.history.unshift({
    id: `h-stage-${Date.now()}`,
    leadId: lead.id,
    type: 'stage_change',
    description: `Etapa alterada de "${oldStage}" para "${stageId}".`,
    date: new Date().toLocaleString('pt-BR'),
    author: author || lead.brokerName || 'Sistema'
  });

  saveDatabase();
  res.json(lead);
});

// Mark Won
app.post('/api/leads/:id/won', (req, res) => {
  const lead = dbState.leads.find(l => l.id === req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead não encontrado' });

  lead.won = true;
  lead.lost = false;
  lead.stageId = 'venda_concluida';
  if (!lead.history) lead.history = [];

  lead.history.unshift({
    id: `h-won-${Date.now()}`,
    leadId: lead.id,
    type: 'deal_won',
    description: 'Negociação marcada como VENDA GANHA / CONCLUÍDA! 🥂🎉',
    date: new Date().toLocaleString('pt-BR'),
    author: lead.brokerName || 'Sistema'
  });

  saveDatabase();
  res.json(lead);
});

// Mark Lost
app.post('/api/leads/:id/lost', (req, res) => {
  const { reason, notes } = req.body;
  const lead = dbState.leads.find(l => l.id === req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead não encontrado' });

  lead.lost = true;
  lead.won = false;
  lead.lostReason = reason || 'Outro';
  lead.lostNotes = notes || '';
  if (!lead.history) lead.history = [];

  lead.history.unshift({
    id: `h-lost-${Date.now()}`,
    leadId: lead.id,
    type: 'deal_lost',
    description: `Lead marcado como Perdido. Motivo: ${reason || 'Não informado'}. ${notes ? `(${notes})` : ''}`,
    date: new Date().toLocaleString('pt-BR'),
    author: lead.brokerName || 'Sistema'
  });

  saveDatabase();
  res.json(lead);
});

// ------------------------------------------
// CLIENT PORTAL (PUBLIC / TOKEN-BASED)
// ------------------------------------------
app.get('/api/portal/:token', (req, res) => {
  const token = req.params.token;
  const lead = dbState.leads.find(l => l.clientPortalToken === token || l.id === token);
  if (!lead) return res.status(404).json({ error: 'Portal do cliente não encontrado ou link expirado' });

  res.json({
    id: lead.id,
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    propertyInterest: lead.propertyInterest,
    brokerName: lead.brokerName,
    clientData: lead.clientData || null,
    companyName: dbState.settings.companyName
  });
});

app.post('/api/portal/:token', (req, res) => {
  const token = req.params.token;
  const lead = dbState.leads.find(l => l.clientPortalToken === token || l.id === token);
  if (!lead) return res.status(404).json({ error: 'Portal do cliente não encontrado' });

  const clientData = req.body;
  const docCount = clientData.documents?.length || 0;

  lead.name = clientData.fullName || lead.name;
  lead.phone = clientData.phone || lead.phone;
  lead.email = clientData.email || lead.email;
  lead.stageId = lead.stageId === 'lead_novo' || lead.stageId === 'primeiro_contato' ? 'documentacao' : lead.stageId;
  lead.clientData = {
    ...clientData,
    submittedAt: new Date().toLocaleString('pt-BR'),
    status: 'enviado'
  };

  if (!lead.history) lead.history = [];
  lead.history.unshift({
    id: `h-portal-${Date.now()}`,
    leadId: lead.id,
    type: 'client_portal',
    description: `Cliente preencheu ficha cadastral e enviou ${docCount} documento(s) com sucesso via Portal do Cliente.`,
    date: new Date().toLocaleString('pt-BR'),
    author: 'Portal do Cliente'
  });

  dbState.notifications.unshift({
    id: `notif-doc-${Date.now()}`,
    title: 'Documentos Recebidos!',
    message: `${clientData.fullName || lead.name} enviou ficha cadastral e ${docCount} documento(s) pelo Portal.`,
    date: 'Agora',
    read: false,
    type: 'activity'
  });

  saveDatabase();
  res.json({ success: true, message: 'Dados e documentos enviados com sucesso!', lead });
});

// ------------------------------------------
// ACTIVITIES API
// ------------------------------------------
app.get('/api/activities', (req, res) => {
  res.json(dbState.activities);
});

app.post('/api/activities', (req, res) => {
  const body = req.body;
  const newActivity = {
    ...body,
    id: `act-${Date.now()}`,
    completed: false,
    createdAt: new Date().toISOString().split('T')[0]
  };

  dbState.activities.unshift(newActivity);

  // Update lead follow-up date and history
  if (newActivity.leadId) {
    const lead = dbState.leads.find(l => l.id === newActivity.leadId);
    if (lead) {
      lead.nextFollowUpDate = newActivity.dateTime;
      if (!lead.history) lead.history = [];
      lead.history.unshift({
        id: `h-act-${Date.now()}`,
        leadId: lead.id,
        type: newActivity.type || 'activity',
        description: `Agendado: ${newActivity.type?.toUpperCase()} para ${newActivity.dateTime}. ${newActivity.notes ? `(${newActivity.notes})` : ''}`,
        date: new Date().toLocaleString('pt-BR'),
        author: newActivity.brokerName || 'Sistema'
      });
    }
  }

  saveDatabase();
  res.status(201).json(newActivity);
});

app.put('/api/activities/:id', (req, res) => {
  const idx = dbState.activities.findIndex(a => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Atividade não encontrada' });

  dbState.activities[idx] = { ...dbState.activities[idx], ...req.body };
  saveDatabase();
  res.json(dbState.activities[idx]);
});

app.put('/api/activities/:id/toggle', (req, res) => {
  const act = dbState.activities.find(a => a.id === req.params.id);
  if (!act) return res.status(404).json({ error: 'Atividade não encontrada' });

  act.completed = !act.completed;
  saveDatabase();
  res.json(act);
});

app.delete('/api/activities/:id', (req, res) => {
  dbState.activities = dbState.activities.filter(a => a.id !== req.params.id);
  saveDatabase();
  res.json({ success: true, message: 'Atividade excluída' });
});

// ------------------------------------------
// CONTRACTS & COMMISSIONS API
// ------------------------------------------
app.get('/api/contracts', (req, res) => {
  res.json(dbState.contracts);
});

app.post('/api/contracts', (req, res) => {
  const body = req.body;
  const contractId = `cont-${Date.now()}`;
  const totalCommValue = (body.value * (body.commissionPercent || 5)) / 100;
  const brokerPerc = body.brokerCommissionPercent !== undefined ? body.brokerCommissionPercent : (body.splitPercents?.broker || 50);
  const brokerCommVal = (totalCommValue * brokerPerc) / 100;

  const newContract = {
    ...body,
    id: contractId,
    totalCommissionValue: totalCommValue,
    brokerCommissionValue: brokerCommVal,
    status: body.isCompletedDirectly ? 'concluido' : 'assinado',
    attachments: body.attachments || []
  };

  dbState.contracts.unshift(newContract);

  // Auto-generate commission installments
  const instCount = body.installmentsCount || 1;
  const instAmount = brokerCommVal / instCount;
  const bonusPerInst = (body.splitBonus?.broker || 0) / instCount;
  const baseDate = body.firstDueDate ? new Date(body.firstDueDate) : new Date(body.closedAt);

  for (let i = 1; i <= instCount; i++) {
    const dueDate = new Date(baseDate);
    dueDate.setMonth(dueDate.getMonth() + (i - 1));
    const dueDateStr = dueDate.toISOString().split('T')[0];

    dbState.commissions.unshift({
      id: `comm-${contractId}-${i}`,
      contractId: contractId,
      brokerId: body.brokerId,
      brokerName: body.brokerName,
      enterpriseName: body.enterpriseName,
      clientName: body.clientName,
      recipientRole: 'corretor',
      installmentNumber: i,
      totalInstallments: instCount,
      dueDate: dueDateStr,
      amount: instAmount,
      bonusAmount: bonusPerInst,
      status: body.isCompletedDirectly ? 'recebido' : 'a_receber',
      paymentDate: body.isCompletedDirectly ? new Date().toISOString().split('T')[0] : undefined
    });
  }

  // If tied to a lead, update lead to won
  if (body.leadId) {
    const lead = dbState.leads.find(l => l.id === body.leadId);
    if (lead) {
      lead.won = true;
      lead.stageId = 'venda_concluida';
      if (!lead.history) lead.history = [];
      lead.history.unshift({
        id: `h-sale-${Date.now()}`,
        leadId: lead.id,
        type: 'deal_won',
        description: `Contrato de Venda registrado: ${body.enterpriseName} (${body.unit || 'Unidade'}). VGV: R$ ${body.value.toLocaleString('pt-BR')}.`,
        date: new Date().toLocaleString('pt-BR'),
        author: body.brokerName || 'Sistema'
      });
    }
  }

  saveDatabase();
  res.status(201).json(newContract);
});

app.put('/api/contracts/:id', (req, res) => {
  const idx = dbState.contracts.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Contrato não encontrado' });

  dbState.contracts[idx] = { ...dbState.contracts[idx], ...req.body };
  saveDatabase();
  res.json(dbState.contracts[idx]);
});

app.delete('/api/contracts/:id', (req, res) => {
  dbState.contracts = dbState.contracts.filter(c => c.id !== req.params.id);
  dbState.commissions = dbState.commissions.filter(cm => cm.contractId !== req.params.id);
  saveDatabase();
  res.json({ success: true, message: 'Contrato e parcelas excluídos com sucesso' });
});

app.get('/api/commissions', (req, res) => {
  res.json(dbState.commissions);
});

app.put('/api/commissions/:id/pay', (req, res) => {
  const comm = dbState.commissions.find(c => c.id === req.params.id);
  if (!comm) return res.status(404).json({ error: 'Comissão não encontrada' });

  comm.status = comm.status === 'recebido' ? 'a_receber' : 'recebido';
  comm.paymentDate = comm.status === 'recebido' ? new Date().toISOString().split('T')[0] : undefined;

  saveDatabase();
  res.json(comm);
});

// ------------------------------------------
// USERS & SETTINGS API
// ------------------------------------------
app.get('/api/users', (req, res) => {
  res.json(dbState.users);
});

app.post('/api/users', (req, res) => {
  const newUser = {
    ...req.body,
    id: `user-${Date.now()}`,
    active: true,
    assignedLeadCount: 0
  };
  dbState.users.push(newUser);
  saveDatabase();
  res.status(201).json(newUser);
});

app.put('/api/users/:id', (req, res) => {
  const idx = dbState.users.findIndex(u => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Usuário não encontrado' });

  dbState.users[idx] = { ...dbState.users[idx], ...req.body };
  saveDatabase();
  res.json(dbState.users[idx]);
});

app.delete('/api/users/:id', (req, res) => {
  dbState.users = dbState.users.filter(u => u.id !== req.params.id);
  saveDatabase();
  res.json({ success: true, message: 'Usuário removido' });
});

app.get('/api/settings', (req, res) => {
  res.json({
    settings: dbState.settings,
    rolePermissions: dbState.rolePermissions
  });
});

app.put('/api/settings', (req, res) => {
  dbState.settings = { ...dbState.settings, ...req.body };
  saveDatabase();
  res.json(dbState.settings);
});

app.put('/api/settings/permissions', (req, res) => {
  dbState.rolePermissions = req.body;
  saveDatabase();
  res.json(dbState.rolePermissions);
});

// ------------------------------------------
// EVOLUTION API PROXY (Secure Server-Side)
// ------------------------------------------
app.post('/api/whatsapp/send', async (req, res) => {
  const { recipientPhone, text, instance, apiKey, apiUrl } = req.body;

  const targetUrl = (apiUrl || dbState.settings.evolutionApiUrl || process.env.EVOLUTION_API_URL || 'https://evolutionapi.thalleshcm.com.br').replace(/\/+$/, '');
  const targetInstance = instance || dbState.settings.evolutionInstance || process.env.EVOLUTION_INSTANCE || 'aurum-crm';
  const targetKey = apiKey || dbState.settings.evolutionApiKey || process.env.EVOLUTION_API_KEY;

  if (!recipientPhone || !text) {
    return res.status(400).json({ success: false, error: 'Telefone e mensagem são obrigatórios' });
  }

  // Format phone number with DDI 55
  let cleanPhone = recipientPhone.replace(/\D/g, '');
  if (!cleanPhone.startsWith('55') && (cleanPhone.length === 10 || cleanPhone.length === 11)) {
    cleanPhone = `55${cleanPhone}`;
  }

  if (!targetKey) {
    return res.status(400).json({
      success: false,
      error: 'Evolution API Key não configurada. Configure a chave nas configurações do sistema ou variável de ambiente.'
    });
  }

  try {
    const endpoint = `${targetUrl}/message/sendText/${encodeURIComponent(targetInstance)}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'apikey': targetKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        number: cleanPhone,
        text: text,
        delay: 1200,
        linkPreview: true
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: data?.message || data?.error || 'Erro no envio WhatsApp',
        details: data
      });
    }

    res.json({
      success: true,
      messageId: data?.key?.id || data?.messageId || `msg-${Date.now()}`,
      statusText: 'Mensagem enviada com sucesso pelo WhatsApp via Evolution API!',
      details: data
    });
  } catch (err: any) {
    console.error('Evolution API Proxy error:', err);
    res.status(500).json({
      success: false,
      error: err?.message || 'Falha ao conectar com o servidor da Evolution API'
    });
  }
});

// ==========================================
// VITE OR STATIC SERVING
// ==========================================
async function setupViteOrStatic() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Aurum CRM Server running on port ${PORT}`);
  });
}

setupViteOrStatic();
