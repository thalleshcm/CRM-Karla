import { Lead, Activity, WhatsAppScriptCategory } from '../types';
import { STAGES } from '../data/initialData';
import { formatDateTimePtBR } from './formatters';

export type NBALevel = 'high' | 'medium' | 'low';

export interface NextBestActionResult {
  level: NBALevel;
  /** Maps to a WhatsApp message objective/category, so the WhatsApp composer
   * can pre-select an objective and recommend a matching template. */
  objective: WhatsAppScriptCategory;
  title: string;
  description: string;
}

const REQUIRED_DOC_CATEGORIES = ['rg_cnh', 'comprovante_endereco', 'certidao_estado_civil'];

/**
 * Rule-based Next Best Action for a lead — shared between the lead detail
 * view and the WhatsApp composer so both surface the same suggestion.
 * No AI involved; every branch is traceable to a concrete field.
 */
export function computeNextBestAction(lead: Lead, leadActivities: Activity[]): NextBestActionResult | null {
  if (lead.status === 'ganho' || lead.status === 'perdido') return null;

  const principalDocs = (lead.documentsList || []).filter(d => d.buyerType === 'principal');
  const principalPendingCount = Math.max(
    0,
    3 - principalDocs.filter(d => REQUIRED_DOC_CATEGORIES.includes(d.category) && d.status === 'aprovado').length
  );

  const docStageIndex = STAGES.findIndex(s => s.id === 'documentacao');
  const leadStageIndex = STAGES.findIndex(s => s.id === lead.stageId);

  if (docStageIndex >= 0 && leadStageIndex >= docStageIndex && principalPendingCount > 0) {
    return {
      level: 'high',
      objective: 'coleta_documentos',
      title: 'Cobrar documentação',
      description: `Faltam ${principalPendingCount} documento(s) obrigatório(s) do comprador principal.`
    };
  }

  const pendingActivities = leadActivities
    .filter(a => a.leadId === lead.id && !a.completed)
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
  if (pendingActivities.length > 0) {
    const next = pendingActivities[0];
    const isOverdue = new Date(next.dateTime).getTime() < Date.now();
    return {
      level: isOverdue ? 'high' : 'medium',
      objective: next.type === 'visita' ? 'visita' : 'primeiro_contato',
      title: isOverdue ? 'Atividade atrasada' : 'Atividade agendada',
      description: `${next.type} em ${formatDateTimePtBR(next.dateTime)}${next.notes ? ` — ${next.notes}` : ''}`
    };
  }

  if (!lead.lastContactDate) {
    return {
      level: 'high',
      objective: 'primeiro_contato',
      title: 'Fazer primeiro contato',
      description: 'Este lead ainda não teve nenhum contato registrado.'
    };
  }

  return {
    level: 'low',
    objective: 'primeiro_contato',
    title: 'Sem pendências identificadas',
    description: 'Continue o acompanhamento normal do relacionamento.'
  };
}
