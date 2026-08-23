import { Lead, UserProfile, CrmSettings, Activity } from '../types';
import { STAGES } from '../data/initialData';
import { formatCurrency, formatDatePtBR } from './formatters';
import { computeNextBestAction } from './nextBestAction';

export interface WhatsAppTemplateContext {
  lead: Lead;
  broker: UserProfile;
  company: CrmSettings;
  portalLink: string;
  leadActivities?: Activity[];
}

const REQUIRED_DOC_CATEGORIES = ['rg_cnh', 'comprovante_endereco', 'certidao_estado_civil'];

function pendingDocumentsCount(lead: Lead): number {
  const principalDocs = (lead.documentsList || []).filter(d => d.buyerType === 'principal');
  return Math.max(
    0,
    3 - principalDocs.filter(d => REQUIRED_DOC_CATEGORIES.includes(d.category) && d.status === 'aprovado').length
  );
}

/**
 * Central WhatsApp template renderer — every {variavel} substitution lives
 * here instead of being reimplemented per component.
 */
export function renderWhatsAppTemplate(template: string, context: WhatsAppTemplateContext): string {
  const { lead, broker, company, portalLink, leadActivities = [] } = context;

  const firstName = lead.name.split(' ')[0] || lead.name;
  const hour = new Date().getHours();
  const saudacao = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const corretorNome = lead.brokerName || broker.name || company.brokerName || 'Consultor';
  const stageName = STAGES.find(s => s.id === lead.stageId)?.name || lead.stageId;
  const pendingDocs = pendingDocumentsCount(lead);
  const nba = computeNextBestAction(lead, leadActivities);

  const visitDate = lead.visit?.dateTime ? new Date(lead.visit.dateTime) : null;

  // Single-pass substitution via one regex + a lookup, rather than 13
  // chained .replace() calls on the accumulating string. Chaining had two
  // real bugs: (1) a string second argument to .replace() treats "$&"/"$$"
  // etc as special patterns, so a lead name containing e.g. "Ana $&amp; Cia"
  // would corrupt the output; (2) a value substituted early (like the lead's
  // name) that itself contained literal "{valor}"-shaped text would get
  // re-matched and substituted again by a later .replace() in the chain.
  const values: Record<string, string> = {
    primeiro_nome: firstName,
    nome_lead: lead.name,
    imovel: lead.propertyInterest || 'Empreendimento Selecionado',
    valor: formatCurrency(lead.estimatedValue || 0),
    corretor: corretorNome,
    imobiliaria: company.companyName || 'Imobiliária',
    saudacao,
    link_portal: portalLink,
    data_visita: visitDate ? formatDatePtBR(visitDate.toISOString().split('T')[0]) : '',
    hora_visita: visitDate ? visitDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '',
    valor_entrada: lead.downPayment ? formatCurrency(lead.downPayment) : '',
    etapa: stageName,
    documentos_pendentes: String(pendingDocs),
    proxima_acao: nba?.title || ''
  };

  return template.replace(/{(\w+)}/g, (match, key) => (key in values ? values[key] : match));
}

export const WHATSAPP_TEMPLATE_VARIABLES: { key: string; label: string }[] = [
  { key: 'primeiro_nome', label: 'Nome' },
  { key: 'nome_lead', label: 'Nome completo' },
  { key: 'imovel', label: 'Imóvel' },
  { key: 'valor', label: 'Valor' },
  { key: 'corretor', label: 'Corretor' },
  { key: 'imobiliaria', label: 'Imobiliária' },
  { key: 'saudacao', label: 'Saudação' },
  { key: 'link_portal', label: 'Portal' },
  { key: 'data_visita', label: 'Data da visita' },
  { key: 'hora_visita', label: 'Hora da visita' },
  { key: 'valor_entrada', label: 'Valor de entrada' },
  { key: 'etapa', label: 'Etapa' },
  { key: 'documentos_pendentes', label: 'Docs pendentes' },
  { key: 'proxima_acao', label: 'Próxima ação' }
];
