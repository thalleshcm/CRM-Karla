import { Lead } from '../types';
import { parseFlexibleDate } from './formatters';

export interface LeadHealthResult {
  score: number; // 0-100
  tier: 'saudavel' | 'atencao' | 'risco';
  breakdown: { label: string; points: number }[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Rule-based Lead Health Score — a computed signal of how healthy a deal
 * looks, separate from the broker's manual "temperatura" perception.
 * No AI involved; every point is traceable to a concrete field.
 */
export function computeLeadHealthScore(lead: Lead): LeadHealthResult {
  const breakdown: { label: string; points: number }[] = [];

  // Proposta enviada
  const hasProposal = !!(lead.proposal?.enterprise || lead.proposal?.proposalValue);
  if (hasProposal) breakdown.push({ label: 'Proposta enviada', points: 20 });

  // Respondeu WhatsApp (histórico de interação registrada)
  const hasWhatsAppInteraction = (lead.history || []).some(h => h.type === 'whatsapp');
  if (hasWhatsAppInteraction) breakdown.push({ label: 'Respondeu WhatsApp', points: 20 });

  // Visitou o imóvel
  const hasVisit = !!(lead.visit?.dateTime);
  if (hasVisit) breakdown.push({ label: 'Visitou o imóvel', points: 15 });

  // Documentação avançada (parcial, proporcional aos 3 documentos obrigatórios aprovados)
  const requiredCategories = ['rg_cnh', 'comprovante_endereco', 'certidao_estado_civil'];
  const principalDocs = (lead.documentsList || []).filter(d => d.buyerType === 'principal');
  const approvedRequired = principalDocs.filter(d => requiredCategories.includes(d.category) && d.status === 'aprovado').length;
  const docPoints = Math.round((approvedRequired / 3) * 15);
  if (docPoints > 0) breakdown.push({ label: `Documentação (${approvedRequired}/3 aprovados)`, points: docPoints });

  // Capacidade financeira informada
  const hasFinancialInfo = !!(lead.downPayment || lead.paymentMethod);
  if (hasFinancialInfo) breakdown.push({ label: 'Capacidade financeira informada', points: 10 });

  // Contato recente (últimos 3 dias)
  const lastContactMs = lead.lastContactDate ? Date.parse(lead.lastContactDate) : NaN;
  const hasRecentContact = !Number.isNaN(lastContactMs) && (Date.now() - lastContactMs) <= 3 * DAY_MS;
  if (hasRecentContact) breakdown.push({ label: 'Contato recente', points: 10 });

  // Penalidade: sem interação há 5+ dias
  const mostRecentEventMs = Math.max(
    Number.isNaN(lastContactMs) ? 0 : lastContactMs,
    ...(lead.history || []).map(h => parseFlexibleDate(h.date) || 0)
  );
  // Falls back to the lead's creation date (never Infinity) when there's no
  // lastContactDate and no history — a lead always has a createdAt, so this
  // still yields a real day count instead of leaking "Infinity" into the
  // breakdown label shown to the broker.
  const fallbackEventMs = mostRecentEventMs > 0 ? mostRecentEventMs : Date.parse(lead.createdAt) || Date.now();
  const staleForDays = (Date.now() - fallbackEventMs) / DAY_MS;
  if (staleForDays >= 5) breakdown.push({ label: `Sem interação há ${Math.floor(staleForDays)} dias`, points: -8 });

  const rawScore = breakdown.reduce((sum, b) => sum + b.points, 0);
  const score = Math.max(0, Math.min(100, rawScore));

  const tier: LeadHealthResult['tier'] = score >= 80 ? 'saudavel' : score >= 50 ? 'atencao' : 'risco';

  return { score, tier, breakdown };
}

export const LEAD_HEALTH_TIER_LABELS: Record<LeadHealthResult['tier'], string> = {
  saudavel: 'Saudável',
  atencao: 'Atenção',
  risco: 'Em risco'
};

export const LEAD_HEALTH_TIER_EMOJI: Record<LeadHealthResult['tier'], string> = {
  saudavel: '🟢',
  atencao: '🟡',
  risco: '🔴'
};
