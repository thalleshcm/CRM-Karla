// The CRM serves a single agency — every place that shows/persists a company
// name must use this constant instead of a free-text field, so no user can
// register or display a different imobiliária's name anywhere in the app.
export const FIXED_COMPANY_NAME = 'Karla Imobiliária';

export type LeadTemperature = 'quente' | 'morno' | 'frio';

export type LeadOrigin = 
  | 'Instagram'
  | 'Google Ads'
  | 'WhatsApp'
  | 'Portal Imobiliário'
  | 'Indicação'
  | 'Plantão de Vendas'
  | 'Facebook'
  | 'Outro';

export type StageId = 
  | 'lead_novo'
  | 'primeiro_contato'
  | 'qualificacao'
  | 'apresentacao'
  | 'simulacao'
  | 'reserva'
  | 'documentacao'
  | 'venda_concluida'
  | 'pos_venda';

export interface StageDefinition {
  id: StageId;
  name: string;
  isSuccess?: boolean;
}

export interface Funnel {
  id: string;
  name: string;
  description?: string;
  isDefault?: boolean;
}

export interface LeadTimelineEvent {
  id: string;
  leadId: string;
  type: 'created' | 'stage_change' | 'note' | 'call' | 'whatsapp' | 'meeting' | 'sale' | 'client_portal' | 'deal_won' | 'deal_lost';
  description: string;
  date: string;
  author?: string;
}

export interface ClientDocument {
  id: string;
  category: 'rg_cnh_frente' | 'rg_cnh_verso' | 'rg_cnh' | 'comprovante_residencia' | 'comprovante_endereco' | 'comprovante_renda' | 'declaracao_renda' | 'certidao_civil' | 'certidao_estado_civil' | 'outro';
  categoryLabel: string;
  fileName: string;
  fileType: string;
  fileDataUrl: string; // Base64 or object URL for preview/download
  fileSize: string;
  uploadedAt: string;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  notes?: string;
}

export interface ClientOnboardingData {
  fullName: string;
  cpf: string;
  rg?: string;
  rgEmissor?: string;
  birthDate?: string;
  maritalStatus?: string;
  profession?: string;
  monthlyIncome?: number;
  email?: string;
  phone?: string;
  cep?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  spouse?: {
    fullName?: string;
    cpf?: string;
    rg?: string;
    birthDate?: string;
    profession?: string;
    monthlyIncome?: number;
    phone?: string;
    email?: string;
    maritalRegime?: string;
    marriageDate?: string;
  };
  additionalBuyers?: AdditionalBuyer[];
  documents: ClientDocument[];
  notes?: string;
  submittedAt?: string;
  status: 'pendente' | 'enviado' | 'aprovado';
}

export interface ProposalFinancials {
  downPayment?: number; // ENTRADA (R$)
  balancePayoff?: number; // QUITAÇÃO / SALDO FINAL (R$)
  payoffDate?: string; // DATA DA QUITAÇÃO
  monthlyInstallmentsCount?: number; // QTDE PARCELAS MENSAIS
  monthlyInstallmentValue?: number; // VALOR DA PARCELA MENSAL
  firstMonthlyDueDate?: string; // 1º VENCIMENTO MENSAL
  annualInstallmentsCount?: number; // QTDE PARCELAS ANUAIS
  annualInstallmentValue?: number; // VALOR DA PARCELA ANUAL
  firstAnnualDueDate?: string; // 1º VENCIMENTO ANUAL
}

export interface ProposalData {
  enterprise?: string; // EMPREENDIMENTO
  developer?: string; // CONSTRUTORA
  unit?: string; // UNIDADE
  towerBlock?: string; // TORRE / BLOCO
  floor?: string; // ANDAR
  areaM2?: string | number; // METRAGEM (m²)
  bedrooms?: string | number; // QUARTOS
  suites?: string | number; // SUÍTES
  parkingSpaces?: string | number; // VAGAS DE GARAGEM
  proposalValue?: number; // VALOR DA PROPOSTA
  status?: 'em_negociacao' | 'aprovada' | 'recusada' | 'em_analise' | string; // STATUS DA PROPOSTA
  details?: string; // DETALHES DA PROPOSTA
  financials?: ProposalFinancials;
}

export interface VisitData {
  dateTime?: string; // DATA E HORÁRIO
  location?: string; // LOCAL (Decorado, estande, escritório...)
}

export interface MainBuyerDocs {
  cpf?: string;
  rg?: string;
  maritalStatus?: string;
  profession?: string;
  birthPlace?: string; // NATURALIDADE (Cidade/UF de nascimento)
}

export interface SpouseBuyerData {
  fullName?: string;
  cpf?: string;
  rg?: string;
  birthDate?: string;
  profession?: string;
  phone?: string;
  email?: string;
  maritalRegime?: string; // REGIME DE BENS
  marriageDate?: string; // DATA DO CASAMENTO
}

export interface AdditionalBuyer {
  id: string;
  fullName: string;
  cpf?: string;
  rg?: string;
  birthDate?: string;
  profession?: string;
  phone?: string;
  email?: string;
  relationship?: string;
}

export type DocumentStatus = 'pendente' | 'enviado' | 'em_analise' | 'aprovado' | 'rejeitado' | 'expirado';

export interface LeadAttachedDocument {
  id: string;
  buyerType: 'principal' | 'conjuge' | 'adicional';
  buyerName?: string;
  category: 'rg_cnh' | 'comprovante_endereco' | 'certidao_estado_civil' | 'declaracao_renda' | 'outro';
  label: string;
  fileName?: string;
  fileSize?: string;
  fileDataUrl?: string;
  uploadedAt?: string;
  status: DocumentStatus;
  rejectionReason?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  required?: boolean;
}

export interface LeadContractDetails {
  contractId?: string; // links to the real Contract record once the sale is registered
  enterpriseName?: string;
  unit?: string;
  saleValue?: number;
  closedAt?: string;
  status?: 'em_andamento' | 'concluido' | 'cancelado';
  commissionPercent?: number;
  totalCommissionValue?: number;
  installmentsCount?: number;
  splitPercents?: CommissionSplitPercents;
  splitBonus?: CommissionSplitBonus;
  managerId?: string;
  managerName?: string;
  affiliateId?: string;
  affiliateName?: string;
  referrerName?: string;
  firstDueDate?: string;
  isCompletedDirectly?: boolean;
  signedContractFile?: { name: string; size: string; date: string; url?: string };
  otherAttachments?: { name: string; size: string; date: string; url?: string }[];
}

// A person, independent of any single negotiation — exists so the same buyer
// can be recognized across multiple Leads (repeat purchases) and so imports/
// manual creation can dedupe by phone instead of creating a new silo per deal.
export interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  createdAt: string;
  notes?: string;
}

export interface Lead {
  id: string;
  clientId?: string; // links to the Client this negotiation belongs to
  name: string;
  phone: string;
  email?: string;
  funnelId: string;
  stageId: StageId;
  temperature: LeadTemperature;
  origin: LeadOrigin;
  propertyInterest: string;
  estimatedValue: number;
  birthday?: string; // Format: "MM-DD" or "YYYY-MM-DD"
  notes?: string;
  brokerId?: string; // ID of the assigned broker/user
  brokerName?: string; // Name of the assigned broker
  lastContactDate?: string;
  lastContactAttempts?: number;
  nextFollowUpDate?: string;
  createdAt: string;
  archived?: boolean;
  history?: LeadTimelineEvent[];
  clientPortalToken?: string; // Unique token for customer onboarding link
  clientData?: ClientOnboardingData;
  
  // Status: active, won (only at last stage), lost (at any stage)
  status?: 'ativo' | 'ganho' | 'perdido';
  won?: boolean;
  lost?: boolean;
  lostReason?: string;
  lostNotes?: string;
  lostAt?: string;
  wonAt?: string;
  
  // Rich details from screenshots
  region?: string; // REGIÃO (Jardins, Pinheiros...)
  downPayment?: number; // ENTRADA (R$)
  paymentMethod?: string; // FORMA DE PAGAMENTO (Financiamento, à vista...)
  tag?: string; // e.g. "Investidores", "Moradia", "Família"
  contactStatus?: string; // e.g. "Contatado", "Sem Contato", "Qualificado"
  proposal?: ProposalData;
  visit?: VisitData;
  mainBuyer?: MainBuyerDocs;
  spouseBuyer?: SpouseBuyerData;
  additionalBuyers?: AdditionalBuyer[];
  documentsList?: LeadAttachedDocument[];
  contractDetails?: LeadContractDetails;
  tags?: string[];
}

export type LeadStatusFilter = 'ativos' | 'ganhos' | 'perdidos' | 'todos';

export const LOST_REASON_OPTIONS = [
  'Preço / Fora do orçamento',
  'Comprou com a concorrência / outro corretor',
  'Desistiu da compra / Momento desfavorável',
  'Financiamento / Crédito reprovado',
  'Sem contato / Não responde após tentativas',
  'Imóvel / Perfil / Região incompatível',
  'Decidiu postergar para o próximo ano',
  'Outro motivo'
] as const;

export type ActivityType = 
  | 'ligacao'
  | 'whatsapp'
  | 'reuniao'
  | 'visita'
  | 'proposta'
  | 'follow_up'
  | 'aniversario';

export interface Activity {
  id: string;
  leadId: string;
  leadName: string;
  brokerId?: string; // Assigned broker ID
  brokerName?: string;
  type: ActivityType;
  dateTime: string; // ISO or YYYY-MM-DDTHH:mm
  reminderTime: string; // '15min' | '30min' | '1h' | '1d' | 'exact'
  notes?: string;
  completed: boolean;
  createdAt: string;
}

export interface CommissionSplitPercents {
  agency: number;        // Imobiliária (%)
  manager: number;       // Gerente (%)
  administrative: number;// Administrativo (%)
  broker: number;        // Corretor (%)
  affiliate: number;     // Afiliado (%)
  referrer: number;      // Indicador (%)
}

export interface CommissionSplitBonus {
  agency: number;        // Imobiliária (R$)
  manager: number;       // Gerente (R$)
  administrative: number;// Administrativo (R$)
  broker: number;        // Corretor (R$)
  affiliate: number;     // Afiliado (R$)
  referrer: number;      // Indicador (R$)
}

export interface Contract {
  id: string;
  leadId?: string;
  brokerId?: string; // Assigned broker ID
  brokerName?: string;
  clientName: string;
  enterpriseName: string;
  unit: string;
  value: number;
  closedAt: string; // YYYY-MM-DD
  firstDueDate?: string; // 1º Vencimento
  status: 'ativo' | 'analise' | 'assinado' | 'concluido' | 'cancelado' | 'excluido';
  commissionPercent: number; // e.g. 3.5%
  brokerCommissionPercent: number; // e.g. 50%
  splitPercents?: CommissionSplitPercents;
  splitBonus?: CommissionSplitBonus;
  totalCommissionValue: number;
  brokerCommissionValue: number;
  installmentsCount: number;
  isCompletedDirectly?: boolean;
  notes?: string;
  attachments?: { name: string; size: string; date: string }[];
}

export interface Commission {
  id: string;
  contractId: string;
  brokerId?: string; // Broker who receives this commission
  brokerName?: string;
  enterpriseName: string;
  clientName: string;
  recipientRole?: 'corretor' | 'imobiliaria' | 'gerente' | 'administrativo' | 'afiliado' | 'indicador';
  installmentNumber: number;
  totalInstallments: number;
  dueDate: string; // YYYY-MM-DD
  paymentDate?: string;
  amount: number;
  bonusAmount?: number;
  status: 'a_receber' | 'recebido' | 'atrasado';
  notes?: string;
}

export type WhatsAppScriptCategory = 
  | 'primeiro_contato'
  | 'apresentacao'
  | 'visita'
  | 'simulacao'
  | 'objecoes'
  | 'documentacao'
  | 'fechamento'
  | 'pos_venda'
  | 'aniversario'
  | 'reativacao'
  | 'coleta_documentos';

export interface WhatsAppTemplate {
  id: string;
  title: string;
  category: WhatsAppScriptCategory;
  stage?: StageId | 'geral';
  message: string;
  audioTip?: string;
  tags?: string[];
}

export type UserRole = 'admin' | 'broker';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roleLabel: string;
  creci?: string;
  phone?: string;
  initials: string;
  avatarColor?: string;
  active: boolean;
  assignedLeadCount?: number;
  managerId?: string; // supervising user's id — enables "team" visibility via canViewTeamLeads
  lastLoginAt?: string;
}

export interface RolePermissions {
  canViewAllLeads: boolean;
  canDeleteLeads: boolean;
  canExportLeads: boolean;
  canViewAllCommissions: boolean;
  canManageContracts: boolean;
  canSetGoals: boolean;
  canManageTeam: boolean;
  canAccessSettings: boolean;
  // Granular per-action additions (kept additive so existing checks never break)
  canCreateLeads: boolean;
  canEditLeads: boolean;
  canDeleteContracts: boolean;
  canMarkCommissionsPaid: boolean;
  canManageWebhooks: boolean;
  canManageMcp: boolean;
  canManageWhatsApp: boolean;
  // Visibility one notch below canViewAllLeads: leads/activities of people
  // whose managerId points at the viewer, plus their own — ignored entirely
  // when canViewAllLeads is already true.
  canViewTeamLeads: boolean;
}

export interface RolePermissionConfig {
  role: UserRole;
  name: string;
  badgeLabel: string;
  description: string;
  allowedModules: ViewType[];
  permissions: RolePermissions;
}

export interface ModuleMetadata {
  id: ViewType;
  name: string;
  description: string;
  category: 'Comercial' | 'Relacionamento' | 'Financeiro & Gestão' | 'Sistema';
}

export type WebhookEvent =
  | 'lead.created'
  | 'lead.stage_changed'
  | 'lead.won'
  | 'lead.lost'
  | 'contract.created';

export interface OutgoingWebhook {
  id: string;
  name: string;
  url: string;
  events: WebhookEvent[];
  secret: string;
  enabled: boolean;
  createdAt: string;
  lastTriggeredAt?: string;
  lastStatus?: 'success' | 'failed';
  lastError?: string;
}

export interface Invite {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roleLabel: string;
  creci?: string;
  phone?: string;
  token: string;
  invitedBy: string; // userId of the admin who created it
  createdAt: string;
  expiresAt: string;
  usedAt?: string;
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorName: string;
  action: string; // e.g. 'invite_created', 'user_deactivated', 'permission_changed'
  targetLabel: string; // human-readable subject, e.g. a user's name or "Corretor de Imóveis"
  details?: string;
  createdAt: string;
}

export interface McpToken {
  id: string;
  name: string;
  tokenPreview: string; // last 4 chars only, for display
  scopes: ('read' | 'write')[];
  createdAt: string;
  lastUsedAt?: string;
  expiresAt?: string; // absent = never expires
  revoked: boolean;
}

export interface CrmSettings {
  companyName: string;
  slogan: string;
  brokerName: string;
  brokerRole: string;
  brokerInitials: string;
  creci: string;
  brokerPhone: string;
  brokerEmail: string;
  alertsEnabled: boolean;
  defaultReminderAdvance: string;
  birthdayTemplate: string;
  quickTemplates: WhatsAppTemplate[];
  monthlySalesGoalCount: number;
  monthlySalesGoalVgv: number;

  // Global catalog of lead tags (e.g. "Quente", "Investidor") — leads
  // reference these by name in Lead.tags. Managed from the lead detail modal.
  leadTags: string[];

  // Evolution API Integration
  evolutionApiUrl: string;
  evolutionApiKey: string; // Global API Key
  evolutionInstance: string;
  evolutionInstanceToken?: string; // Token from /instance/create (hash)
  evolutionPhoneNumber?: string;
  evolutionEnabled: boolean;
  evolutionAutoSendOnMove?: boolean;

  // Inbound lead-capture webhook
  inboundWebhookSecret: string;
  inboundWebhookDefaults: {
    funnelId: string;
    stageId: StageId;
    brokerId?: string;
  };

  // MCP server
  mcpEnabled: boolean;
}

export type ViewType = 
  | 'dashboard'
  | 'funnels'
  | 'agenda'
  | 'birthdays'
  | 'contracts'
  | 'commissions'
  | 'settings';


