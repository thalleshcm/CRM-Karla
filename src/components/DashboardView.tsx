import React, { useState } from 'react';
import {
  Flame,
  Calendar,
  Handshake,
  Wallet,
  TrendingUp,
  Award,
  Edit2,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  MessageCircle,
  ChevronRight
} from 'lucide-react';
import { useCrm } from '../context/CrmContext';
import { Header } from './Header';
import { formatCurrency, parseFlexibleDate } from '../utils/formatters';
import { STAGES } from '../data/initialData';
import { computeLeadHealthScore } from '../utils/leadHealth';
import { computeNextBestAction, NBALevel } from '../utils/nextBestAction';

const DAY_MS = 24 * 60 * 60 * 1000;

const NBA_LEVEL_EMOJI: Record<NBALevel, string> = { high: '🔴', medium: '🟠', low: '🟡' };
const NBA_LEVEL_ORDER: Record<NBALevel, number> = { high: 0, medium: 1, low: 2 };

export const DashboardView: React.FC = () => {
  const {
    leads,
    visibleLeads,
    visibleActivities,
    visibleContracts,
    visibleCommissions,
    contracts,
    settings,
    funnels,
    users,
    currentUser,
    hasPermission,
    setIsGoalModalOpen,
    setActiveView,
    setSelectedLead,
    openWhatsAppForLead
  } = useCrm();

  const [selectedFunnelFilter, setSelectedFunnelFilter] = useState<string>(
    funnels[0]?.id || 'investidores'
  );

  const canViewAll = hasPermission('canViewAllLeads');

  // Calculate Metrics from isolated visible dataset
  const hotLeads = visibleLeads.filter(l => l.temperature === 'quente' && !l.archived);
  const pendingFollowUps = visibleActivities.filter(a => !a.completed);

  // Active deals = not archived, not won/lost — the working pipeline
  const activeLeads = visibleLeads.filter(l => !l.archived && l.status !== 'ganho' && l.status !== 'perdido');

  // Negociações em risco: rule-based health score below the "atenção" threshold
  const riskLeads = activeLeads.filter(l => computeLeadHealthScore(l).tier === 'risco');

  // Próximas Ações: next best action per active lead, ranked by urgency
  const nextActions = activeLeads
    .map(lead => ({ lead, nba: computeNextBestAction(lead, visibleActivities) }))
    .filter((x): x is { lead: typeof x.lead; nba: NonNullable<typeof x.nba> } => !!x.nba && x.nba.level !== 'low')
    .sort((a, b) => NBA_LEVEL_ORDER[a.nba.level] - NBA_LEVEL_ORDER[b.nba.level])
    .slice(0, 6);

  // Negociações paradas: three operational red flags over the active pipeline
  const mostRecentEventMsFor = (lead: (typeof activeLeads)[number]) => {
    const lastContactMs = lead.lastContactDate ? Date.parse(lead.lastContactDate) : NaN;
    const historyMs = (lead.history || []).map(h => parseFlexibleDate(h.date) || 0);
    const best = Math.max(Number.isNaN(lastContactMs) ? 0 : lastContactMs, ...historyMs);
    return best > 0 ? best : Date.parse(lead.createdAt) || 0;
  };
  const staleLeadsCount = activeLeads.filter(l => {
    const ms = mostRecentEventMsFor(l);
    return ms > 0 && (Date.now() - ms) / DAY_MS >= 7;
  }).length;
  const staleProposalsCount = activeLeads.filter(l => {
    const hasProposal = !!(l.proposal?.enterprise || l.proposal?.proposalValue);
    if (!hasProposal) return false;
    const ms = mostRecentEventMsFor(l);
    return ms > 0 && (Date.now() - ms) / DAY_MS >= 3;
  }).length;
  const leadsWithoutNextActivityCount = activeLeads.filter(
    l => !visibleActivities.some(a => a.leadId === l.id && !a.completed)
  ).length;
  const hasStalledDeals = staleLeadsCount > 0 || staleProposalsCount > 0 || leadsWithoutNextActivityCount > 0;

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const isClosedInMonth = (c: { status: string; closedAt: string }, monthKey: string) =>
    c.status !== 'excluido' && c.status !== 'cancelado' && (c.closedAt || '').startsWith(monthKey);

  // Sales actually closed in the current calendar month (not all-time)
  const currentMonthContracts = visibleContracts.filter(c => isClosedInMonth(c, currentMonthKey));
  const currentMonthSalesCount = currentMonthContracts.length;
  const currentMonthSalesVgv = currentMonthContracts.reduce((sum, c) => sum + c.value, 0);

  // Commissions
  const pendingCommissionsAmount = visibleCommissions
    .filter(c => c.status === 'a_receber' || c.status === 'atrasado')
    .reduce((sum, c) => sum + c.amount, 0);
  const receivedCommissionsAmount = visibleCommissions
    .filter(c => c.status === 'recebido')
    .reduce((sum, c) => sum + c.amount, 0);

  // Monthly goals calculation
  const salesGoal = settings.monthlySalesGoalCount || 4;
  const vgvGoal = settings.monthlyVgvGoal || 3500000;
  const salesProgressPercent = Math.min(100, Math.round((currentMonthSalesCount / salesGoal) * 100));
  const vgvProgressPercent = Math.min(100, Math.round((currentMonthSalesVgv / vgvGoal) * 100));

  // Pace analysis: are we on track to hit the goal by month-end?
  const daysInMonthForPace = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const monthElapsedPercent = dayOfMonth / daysInMonthForPace;
  const expectedVgvByNow = vgvGoal * monthElapsedPercent;
  const vgvRemaining = Math.max(0, vgvGoal - currentMonthSalesVgv);
  const isOnPace = currentMonthSalesVgv >= expectedVgvByNow || vgvProgressPercent >= 100;
  const daysRemainingInMonth = Math.max(1, daysInMonthForPace - dayOfMonth);
  const dailyVgvNeeded = vgvRemaining / daysRemainingInMonth;

  // Pipeline Coverage: how much open pipeline exists relative to what's left to hit the goal
  const pipelineActiveValue = activeLeads.reduce((sum, l) => sum + (l.estimatedValue || 0), 0);
  const pipelineStageOrderForWeight = [
    'lead_novo', 'primeiro_contato', 'qualificacao', 'apresentacao',
    'simulacao', 'reserva', 'documentacao', 'venda_concluida'
  ];
  const pipelineWeightedValue = activeLeads.reduce((sum, l) => {
    const idx = pipelineStageOrderForWeight.indexOf(l.stageId);
    const weight = idx >= 0 ? (idx + 1) / pipelineStageOrderForWeight.length : 0.1;
    return sum + (l.estimatedValue || 0) * weight;
  }, 0);
  const pipelineCoverage = vgvRemaining > 0 ? pipelineActiveValue / vgvRemaining : (pipelineActiveValue > 0 ? Infinity : 0);
  const dailyPaceActual = dayOfMonth > 0 ? currentMonthSalesVgv / dayOfMonth : 0;
  const monthProjection = dailyPaceActual * daysInMonthForPace;

  // Funnel conversion calculation for selected funnel
  const funnelLeads = visibleLeads.filter(l => l.funnelId === selectedFunnelFilter && !l.archived);
  const totalFunnelLeads = funnelLeads.length;

  const stageOrder = [
    'lead_novo',
    'primeiro_contato',
    'qualificacao',
    'apresentacao',
    'simulacao',
    'reserva',
    'documentacao',
    'venda_concluida',
    'pos_venda'
  ];

  // Calculate funnel stages count
  const stageStats = stageOrder.map(stageId => {
    const stageDef = STAGES.find(s => s.id === stageId);
    const countInStage = funnelLeads.filter(l => l.stageId === stageId).length;
    const stageIdx = stageOrder.indexOf(stageId);
    const cumulativeCount = funnelLeads.filter(l => {
      const idx = stageOrder.indexOf(l.stageId);
      return idx >= stageIdx;
    }).length;

    const percentage = totalFunnelLeads > 0 ? Math.round((cumulativeCount / totalFunnelLeads) * 100) : 0;
    return {
      id: stageId,
      name: stageDef?.name || stageId,
      count: countInStage,
      cumulativeCount,
      percentage,
      isSuccess: stageDef?.isSuccess
    };
  });

  // Step-to-step conversion: what share of the previous stage's cumulative count advances
  const stageStatsWithConversion = stageStats.map((st, idx) => {
    const prev = idx > 0 ? stageStats[idx - 1] : null;
    const stepConversion = prev && prev.cumulativeCount > 0
      ? Math.round((st.cumulativeCount / prev.cumulativeCount) * 100)
      : null;
    return { ...st, stepConversion };
  });
  const finalConversion = totalFunnelLeads > 0
    ? Math.round(((stageStats.find(s => s.isSuccess)?.cumulativeCount || 0) / totalFunnelLeads) * 1000) / 10
    : 0;

  // Aging por etapa: há quanto tempo os leads ATUALMENTE em cada etapa estão lá,
  // usando o evento mais recente de entrada na etapa (created/stage_change/sale)
  const STAGE_ENTRY_EVENT_TYPES = new Set(['created', 'stage_change', 'sale']);
  const enteredCurrentStageMs = (lead: (typeof funnelLeads)[number]) => {
    const entryEvent = (lead.history || []).find(h => STAGE_ENTRY_EVENT_TYPES.has(h.type));
    const ms = entryEvent ? parseFlexibleDate(entryEvent.date) : NaN;
    return !Number.isNaN(ms) && ms > 0 ? ms : (Date.parse(lead.createdAt) || Date.now());
  };
  const agingByStage = stageOrder.map(stageId => {
    const stageDef = STAGES.find(s => s.id === stageId);
    const leadsInStage = funnelLeads.filter(l => l.stageId === stageId);
    const avgDays = leadsInStage.length > 0
      ? leadsInStage.reduce((sum, l) => sum + (Date.now() - enteredCurrentStageMs(l)) / DAY_MS, 0) / leadsInStage.length
      : null;
    return { id: stageId, name: stageDef?.name || stageId, avgDays, leadsCount: leadsInStage.length };
  });
  const bottleneckStage = agingByStage
    .filter(s => s.avgDays !== null && s.leadsCount > 0)
    .sort((a, b) => (b.avgDays as number) - (a.avgDays as number))[0] || null;

  // Cohort conversion: leads criados neste mês vs. no mês anterior, no funil selecionado
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthKey = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
  const cohortStats = (monthKey: string) => {
    const cohort = visibleLeads.filter(l => l.funnelId === selectedFunnelFilter && (l.createdAt || '').startsWith(monthKey));
    const won = cohort.filter(l => l.status === 'ganho');
    const conversion = cohort.length > 0 ? Math.round((won.length / cohort.length) * 1000) / 10 : 0;
    const avgVgv = won.length > 0 ? won.reduce((sum, l) => sum + (l.estimatedValue || 0), 0) / won.length : 0;
    return { total: cohort.length, conversion, avgVgv };
  };
  const currentCohort = cohortStats(currentMonthKey);
  const prevCohort = cohortStats(prevMonthKey);
  const conversionDeltaPp = Math.round((currentCohort.conversion - prevCohort.conversion) * 10) / 10;

  // Leads by origin distribution
  const originCounts: Record<string, number> = {};
  visibleLeads.forEach(l => {
    originCounts[l.origin] = (originCounts[l.origin] || 0) + 1;
  });
  const totalLeadsWithOrigin = visibleLeads.length;

  // Origin quality: leads generated vs. deals actually won, not just volume
  const originStats = Object.entries(originCounts)
    .map(([origin, count]) => {
      const originLeadIds = new Set(visibleLeads.filter(l => l.origin === origin).map(l => l.id));
      const originContracts = visibleContracts.filter(c => c.leadId && originLeadIds.has(c.leadId));
      const vgv = originContracts.reduce((sum, c) => sum + c.value, 0);
      const conversion = count > 0 ? Math.round((originContracts.length / count) * 1000) / 10 : 0;
      return { origin, leads: count, vendas: originContracts.length, conversion, vgv };
    })
    .sort((a, b) => b.vgv - a.vgv);

  // Real Broker Rankings computed from actual contracts
  const brokerStatsMap: Record<string, { name: string; vgv: number; deals: number; color: string; leadsCount: number; currentMonthVgv: number; prevMonthVgv: number }> = {};
  users.forEach(u => {
    const leadsCount = leads.filter(l => l.brokerId === u.id && !l.archived).length;
    brokerStatsMap[u.id] = { name: u.name, vgv: 0, deals: 0, color: u.avatarColor, leadsCount, currentMonthVgv: 0, prevMonthVgv: 0 };
  });

  // Populate all-time totals from every contract; track current/previous month separately for trend
  contracts.forEach(c => {
    if (!c.brokerId || !brokerStatsMap[c.brokerId]) return;
    brokerStatsMap[c.brokerId].vgv += c.value;
    brokerStatsMap[c.brokerId].deals += 1;
    if (isClosedInMonth(c, currentMonthKey)) brokerStatsMap[c.brokerId].currentMonthVgv += c.value;
    if (isClosedInMonth(c, prevMonthKey)) brokerStatsMap[c.brokerId].prevMonthVgv += c.value;
  });

  const brokerRankings = Object.values(brokerStatsMap)
    .sort((a, b) => b.vgv - a.vgv)
    .map((b, idx) => {
      const conversion = b.leadsCount > 0 ? Math.round((b.deals / b.leadsCount) * 1000) / 10 : 0;
      const trendPercent = b.prevMonthVgv > 0
        ? Math.round(((b.currentMonthVgv - b.prevMonthVgv) / b.prevMonthVgv) * 100)
        : (b.currentMonthVgv > 0 ? 100 : null);
      return {
        rank: idx + 1,
        name: b.name,
        vgv: b.vgv,
        deals: b.deals,
        conversion,
        trendPercent,
        badge: idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}º`
      };
    });

  // Monthly VGV Evolution — computed from real closed contracts, last 6 months
  const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { year: d.getFullYear(), month: d.getMonth(), key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` };
  });

  const vgvByMonth = last6Months.map(({ month, year, key }) => {
    const vgv = visibleContracts
      .filter(c => isClosedInMonth(c, key))
      .reduce((sum, c) => sum + c.value, 0);
    return { month: MONTH_LABELS[month], year, vgv, current: key === currentMonthKey };
  });

  const maxHistoricVgv = Math.max(1, ...vgvByMonth.map(h => h.vgv));
  const vgvHistory = vgvByMonth.map(h => ({
    ...h,
    height: `${Math.max(h.vgv > 0 ? 6 : 2, Math.round((h.vgv / maxHistoricVgv) * 100))}%`
  }));

  const prevMonthVgvTotal = vgvByMonth[vgvByMonth.length - 2]?.vgv || 0;
  const vgvMomChangePercent = prevMonthVgvTotal > 0
    ? Math.round(((currentMonthSalesVgv - prevMonthVgvTotal) / prevMonthVgvTotal) * 100)
    : (currentMonthSalesVgv > 0 ? 100 : 0);

  const daysRemaining = daysRemainingInMonth;

  // Saúde da Operação (gestor): semáforo por dimensão + gargalo da semana
  const documentationAging = agingByStage.find(s => s.id === 'documentacao')?.avgDays ?? null;
  type HealthTier = 'bom' | 'atencao' | 'critico';
  const opsHealth: { label: string; tier: HealthTier }[] = [
    {
      label: 'Pipeline',
      tier: pipelineCoverage >= 1.5 ? 'bom' : pipelineCoverage >= 1 ? 'atencao' : 'critico'
    },
    {
      label: 'VGV',
      tier: vgvProgressPercent >= 100 ? 'bom' : isOnPace ? 'bom' : (vgvProgressPercent >= 50 ? 'atencao' : 'critico')
    },
    {
      label: 'Conversão',
      tier: finalConversion >= 8 ? 'bom' : finalConversion >= 4 ? 'atencao' : 'critico'
    },
    {
      label: 'Documentação',
      tier: documentationAging === null ? 'bom' : documentationAging <= 3 ? 'bom' : documentationAging <= 7 ? 'atencao' : 'critico'
    },
    {
      label: 'Comissões',
      tier: visibleCommissions.some(c => c.status === 'atrasado')
        ? 'critico'
        : (pendingCommissionsAmount > 0 ? 'atencao' : 'bom')
    }
  ];
  const HEALTH_TIER_EMOJI: Record<HealthTier, string> = { bom: '🟢', atencao: '🟡', critico: '🔴' };
  const HEALTH_TIER_LABEL: Record<HealthTier, string> = { bom: 'Bom', atencao: 'Atenção', critico: 'Crítico' };

  return (
    <div className="flex-1 min-h-screen bg-[#FDFCFB] flex flex-col">
      <Header
        title={canViewAll ? "Painel de Controle Geral" : `Meu Painel · ${currentUser.name}`}
        subtitle={
          canViewAll
            ? "Como está a operação: pipeline, conversão, equipe e gargalos da imobiliária."
            : "O que precisa da sua atenção agora para avançar suas negociações."
        }
      />

      <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* 4 KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Leads Quentes */}
          <div
            onClick={() => setActiveView('funnels')}
            className="bg-[#A3B18A]/10 rounded-[1.75rem] p-6 border border-[#A3B18A]/25 shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-widest text-[#588157] font-bold">
                LEADS QUENTES
              </span>
              <Flame className="w-4 h-4 text-[#588157] group-hover:scale-110 transition-transform" />
            </div>
            <div className="mt-3">
              <p className="font-serif-title text-3xl font-bold text-[#344E41]">
                {hotLeads.length}
              </p>
              <p className="text-xs text-[#588157] mt-1 font-medium">
                {visibleLeads.length} leads sob sua gestão
              </p>
            </div>
          </div>

          {/* Card 2: Follow-ups Hoje */}
          <div
            onClick={() => setActiveView('agenda')}
            className="bg-white rounded-[1.75rem] p-6 border border-[#EAE7E2] shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-widest text-[#3A403A]/70 font-bold">
                FOLLOW-UPS HOJE
              </span>
              <Calendar className="w-4 h-4 text-[#588157] group-hover:scale-110 transition-transform" />
            </div>
            <div className="mt-3">
              <p className="font-serif-title text-3xl font-bold text-[#344E41]">
                {pendingFollowUps.length}
              </p>
              <p className="text-xs text-[#3A403A]/60 mt-1">
                Atividades da sua agenda
              </p>
            </div>
          </div>

          {/* Card 3: Negociações em Risco */}
          <div
            onClick={() => setActiveView('funnels')}
            className={`rounded-[1.75rem] p-6 border shadow-2xs hover:shadow-xs transition-all cursor-pointer group ${
              riskLeads.length > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-[#EAE7E2]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs uppercase tracking-widest font-bold ${riskLeads.length > 0 ? 'text-red-700' : 'text-[#3A403A]/70'}`}>
                NEGOCIAÇÕES EM RISCO
              </span>
              <AlertTriangle className={`w-4 h-4 group-hover:scale-110 transition-transform ${riskLeads.length > 0 ? 'text-red-600' : 'text-[#344E41]'}`} />
            </div>
            <div className="mt-3">
              <p className="font-serif-title text-3xl font-bold text-[#344E41]">
                {riskLeads.length}
              </p>
              <p className="text-xs text-[#3A403A]/60 mt-1">
                Health score abaixo de 50 pontos
              </p>
            </div>
          </div>

          {/* Card 4: Comissões a Receber */}
          <div
            onClick={() => setActiveView('commissions')}
            className="bg-white rounded-[1.75rem] p-6 border border-[#EAE7E2] shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-widest text-[#3A403A]/70 font-bold">
                COMISSÕES A RECEBER
              </span>
              <Wallet className="w-4 h-4 text-[#588157] group-hover:scale-110 transition-transform" />
            </div>
            <div className="mt-3">
              <p className="font-serif-title text-2xl lg:text-3xl font-bold text-[#344E41] truncate">
                {formatCurrency(pendingCommissionsAmount)}
              </p>
              <p className="text-xs text-[#3A403A]/60 mt-1">
                Recebido: {formatCurrency(receivedCommissionsAmount)}
              </p>
            </div>
          </div>
        </div>

        {/* Próximas Ações — the operational priority list, ranked by urgency */}
        <div className="bg-white rounded-[1.75rem] p-6 border border-[#EAE7E2] shadow-2xs">
          <h3 className="font-serif-title text-lg font-semibold text-[#344E41] mb-4">
            Próximas Ações
          </h3>

          {nextActions.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#3A403A]/50">
              Nenhuma ação pendente identificada. Sua carteira está em dia.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {nextActions.map(({ lead, nba }) => (
                <div
                  key={lead.id}
                  className="p-4 rounded-2xl border border-[#EAE7E2] bg-[#FDFCFB] hover:bg-[#F1EFEC]/60 transition-colors flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-[#344E41] flex items-center gap-1.5">
                      <span>{NBA_LEVEL_EMOJI[nba.level]}</span>
                      <span>{lead.name}</span>
                    </p>
                  </div>
                  <p className="text-xs text-[#3A403A]/70">
                    <span className="font-medium text-[#344E41]">{nba.title}</span> — {nba.description}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      onClick={() => openWhatsAppForLead(lead)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#588157] hover:bg-[#4a6b49] rounded-full transition-colors"
                    >
                      <MessageCircle className="w-3 h-3" />
                      WhatsApp
                    </button>
                    <button
                      onClick={() => setSelectedLead(lead)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#344E41] bg-[#F1EFEC] hover:bg-[#EAE7E2] rounded-full transition-colors"
                    >
                      Abrir lead
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Goal Card */}
        <div className="bg-white rounded-[1.75rem] p-6 border border-[#EAE7E2] shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-[#588157]">🎯</span>
              <span className="text-sm font-semibold text-[#344E41]">
                {canViewAll ? "Meta Geral da Imobiliária" : `Sua Meta Pessoal (${currentUser.name})`}
              </span>
              <span className="text-xs text-[#3A403A]/40">·</span>
              <span className="text-xs text-[#3A403A]/70">
                {daysRemaining} {daysRemaining === 1 ? 'dia restante' : 'dias restantes'}
              </span>
            </div>
            <button
              onClick={() => setIsGoalModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#344E41] bg-[#F1EFEC] hover:bg-[#EAE7E2] rounded-full transition-colors"
            >
              <Edit2 className="w-3 h-3 text-[#588157]" />
              <span>Ajustar meta</span>
            </button>
          </div>

          {/* Pace status: is the current run-rate on track to hit the monthly VGV goal? */}
          {vgvProgressPercent < 100 && (
            <div
              className={`mb-4 flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-medium ${
                isOnPace
                  ? 'bg-[#A3B18A]/15 text-[#344E41] border border-[#A3B18A]/30'
                  : 'bg-amber-50 text-amber-900 border border-amber-200'
              }`}
            >
              {isOnPace ? (
                <TrendingUp className="w-3.5 h-3.5 text-[#588157] shrink-0" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              )}
              <span>
                {isOnPace
                  ? 'No ritmo certo para bater a meta do mês.'
                  : `Fora do ritmo — faltam ${formatCurrency(vgvRemaining)} em VGV. Precisa fechar em média ${formatCurrency(dailyVgvNeeded)}/dia para chegar na meta.`}
              </span>
            </div>
          )}

          {vgvProgressPercent >= 100 && (
            <div className="mb-4 flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-[#588157]/10 text-[#344E41] border border-[#588157]/30">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#588157] shrink-0" />
              <span>Meta de VGV do mês batida! 🎉</span>
            </div>
          )}

          <div className="space-y-4">
            {/* Vendas Progress */}
            <div>
              <div className="flex justify-between text-xs font-medium text-[#3A403A] mb-1.5">
                <span>Vendas Realizadas</span>
                <span>
                  {currentMonthSalesCount} / {salesGoal}{' '}
                  <span className="text-[#3A403A]/50 font-normal">({salesProgressPercent}%)</span>
                </span>
              </div>
              <div className="w-full h-2.5 bg-[#F1EFEC] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#A3B18A] to-[#588157] rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(2, salesProgressPercent)}%` }}
                />
              </div>
            </div>

            {/* VGV Progress */}
            <div>
              <div className="flex justify-between text-xs font-medium text-[#3A403A] mb-1.5">
                <span>VGV Comercializado</span>
                <span>
                  {formatCurrency(currentMonthSalesVgv)} / {formatCurrency(vgvGoal)}{' '}
                  <span className="text-[#3A403A]/50 font-normal">({vgvProgressPercent}%)</span>
                </span>
              </div>
              <div className="w-full h-2.5 bg-[#F1EFEC] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#588157] to-[#344E41] rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(2, vgvProgressPercent)}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-[#3A403A]/60">Projeção do mês (ritmo atual)</span>
              <span className="font-bold text-[#344E41]">{formatCurrency(monthProjection)}</span>
            </div>
          </div>
        </div>

        {/* Pipeline Coverage + Negociações Paradas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pipeline Coverage */}
          <div className="bg-white rounded-[1.75rem] p-6 border border-[#EAE7E2] shadow-2xs">
            <div className="flex items-center gap-2 mb-4">
              <Handshake className="w-4 h-4 text-[#588157]" />
              <h3 className="font-serif-title text-lg font-semibold text-[#344E41]">Pipeline Coverage</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[#3A403A]/60 font-bold">Falta p/ meta</p>
                <p className="text-lg font-bold text-[#344E41] mt-1">{formatCurrency(vgvRemaining)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[#3A403A]/60 font-bold">Pipeline ativo</p>
                <p className="text-lg font-bold text-[#344E41] mt-1">{formatCurrency(pipelineActiveValue)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[#3A403A]/60 font-bold">Pipeline ponderado</p>
                <p className="text-lg font-bold text-[#344E41] mt-1">{formatCurrency(pipelineWeightedValue)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[#3A403A]/60 font-bold">Cobertura</p>
                <p className={`text-lg font-bold mt-1 ${pipelineCoverage >= 1 ? 'text-[#344E41]' : 'text-amber-700'}`}>
                  {Number.isFinite(pipelineCoverage) ? `${pipelineCoverage.toFixed(1)}x` : '—'}
                </p>
              </div>
            </div>
            <p className="text-[10px] text-[#3A403A]/50 mt-4 leading-tight">
              Cobertura = pipeline ativo ÷ VGV que ainda falta para a meta do mês. Abaixo de 1x, a meta não é alcançável mesmo fechando tudo em aberto.
            </p>
          </div>

          {/* Negociações Paradas */}
          <div className="bg-white rounded-[1.75rem] p-6 border border-[#EAE7E2] shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h3 className="font-serif-title text-lg font-semibold text-[#344E41]">Negociações Paradas</h3>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs px-3.5 py-2.5 rounded-xl bg-red-50 border border-red-100">
                  <span className="text-red-800">🔴 Leads &gt; 7 dias sem interação</span>
                  <span className="font-bold text-red-800">{staleLeadsCount}</span>
                </div>
                <div className="flex items-center justify-between text-xs px-3.5 py-2.5 rounded-xl bg-amber-50 border border-amber-100">
                  <span className="text-amber-800">🟠 Propostas &gt; 3 dias sem movimentação</span>
                  <span className="font-bold text-amber-800">{staleProposalsCount}</span>
                </div>
                <div className="flex items-center justify-between text-xs px-3.5 py-2.5 rounded-xl bg-[#F1EFEC] border border-[#EAE7E2]">
                  <span className="text-[#3A403A]">🟡 Leads sem próxima atividade</span>
                  <span className="font-bold text-[#344E41]">{leadsWithoutNextActivityCount}</span>
                </div>
              </div>
            </div>
            {hasStalledDeals && (
              <button
                onClick={() => setActiveView('funnels')}
                className="mt-4 w-full text-center px-3 py-2 text-xs font-semibold text-[#344E41] bg-[#F1EFEC] hover:bg-[#EAE7E2] rounded-full transition-colors"
              >
                Ver negociações paradas
              </button>
            )}
          </div>
        </div>

        {/* 2-Column Grid Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Block 1: Origem dos leads — qualidade, não só volume */}
          <div className="bg-white rounded-[1.75rem] p-6 border border-[#EAE7E2] shadow-2xs">
            <h3 className="font-serif-title text-lg font-semibold text-[#344E41] mb-4">
              Origem dos Leads na sua Carteira
            </h3>

            {totalLeadsWithOrigin === 0 ? (
              <div className="h-64 flex items-center justify-center text-xs text-[#3A403A]/50">
                Nenhum lead atribuído até o momento.
              </div>
            ) : (
              <div className="overflow-x-auto -mx-2">
                <table className="w-full text-xs min-w-[420px]">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-widest text-[#3A403A]/50 font-bold">
                      <th className="text-left font-bold px-2 pb-2">Origem</th>
                      <th className="text-right font-bold px-2 pb-2">Leads</th>
                      <th className="text-right font-bold px-2 pb-2">Vendas</th>
                      <th className="text-right font-bold px-2 pb-2">Conversão</th>
                      <th className="text-right font-bold px-2 pb-2">VGV</th>
                    </tr>
                  </thead>
                  <tbody>
                    {originStats.map(o => (
                      <tr key={o.origin} className="border-t border-[#EAE7E2]">
                        <td className="py-2.5 px-2 font-medium text-[#3A403A]">{o.origin}</td>
                        <td className="py-2.5 px-2 text-right text-[#3A403A]/70">{o.leads}</td>
                        <td className="py-2.5 px-2 text-right text-[#3A403A]/70">{o.vendas}</td>
                        <td className="py-2.5 px-2 text-right font-semibold text-[#344E41]">{o.conversion}%</td>
                        <td className="py-2.5 px-2 text-right font-bold text-[#344E41]">{formatCurrency(o.vgv)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Block 2: Funil de conversão */}
          <div className="bg-white rounded-[1.75rem] p-6 border border-[#EAE7E2] shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#588157]" />
                  <h3 className="font-serif-title text-lg font-semibold text-[#344E41]">
                    Funil de Conversão
                  </h3>
                </div>
                <select
                  value={selectedFunnelFilter}
                  onChange={e => setSelectedFunnelFilter(e.target.value)}
                  className="text-xs bg-[#F1EFEC] border border-[#EAE7E2] rounded-xl px-3 py-1.5 text-[#3A403A] focus:outline-hidden"
                >
                  {funnels.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                {stageStatsWithConversion.map(st => (
                  <div key={st.id}>
                    {st.stepConversion !== null && (
                      <div className="text-center text-[10px] text-[#3A403A]/40 py-0.5">
                        ↓ {st.stepConversion}%
                      </div>
                    )}
                    <div
                      className={`px-3.5 py-2 rounded-xl flex items-center justify-between text-xs ${
                        st.isSuccess
                          ? 'bg-[#A3B18A]/20 text-[#344E41] border border-[#A3B18A]/40 font-semibold'
                          : 'bg-[#FDFCFB] border border-[#EAE7E2] text-[#3A403A]'
                      }`}
                    >
                      <span className="font-medium">{st.name}</span>
                      <span className="text-[#3A403A]/70 font-mono text-[11px]">
                        {st.count} · {st.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs mt-4 pt-3 border-t border-[#EAE7E2]">
              <span className="text-[#3A403A]/60">Conversão final do funil</span>
              <span className="font-bold text-[#344E41]">{finalConversion}%</span>
            </div>

            <div className="mt-3 pt-3 border-t border-[#EAE7E2] grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[9px] uppercase tracking-widest text-[#3A403A]/50 font-bold">Coorte deste mês</p>
                <p className="text-sm font-bold text-[#344E41] mt-1">{currentCohort.conversion}%</p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-widest text-[#3A403A]/50 font-bold">Mês anterior</p>
                <p className="text-sm font-bold text-[#3A403A]/70 mt-1">{prevCohort.conversion}%</p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-widest text-[#3A403A]/50 font-bold">Variação</p>
                <p className={`text-sm font-bold mt-1 ${conversionDeltaPp >= 0 ? 'text-[#588157]' : 'text-red-600'}`}>
                  {conversionDeltaPp >= 0 ? '+' : ''}{conversionDeltaPp} p.p.
                </p>
              </div>
            </div>
            <p className="text-[9px] text-[#3A403A]/40 mt-2 leading-tight">
              Conversão dos leads criados neste funil em cada mês (coorte), não do estado atual do funil.
            </p>
          </div>

          {/* Block 3: Ranking do Time */}
          <div className="bg-white rounded-[1.75rem] p-6 border border-[#EAE7E2] shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-serif-title text-lg font-semibold text-[#344E41]">
                  Performance da Equipe
                </h3>
                <p className="text-xs text-[#3A403A]/60">VGV e vendas por corretor</p>
              </div>
              <Award className="w-4 h-4 text-[#588157]" />
            </div>

            <div className="space-y-2.5">
              {brokerRankings.map(broker => (
                <div
                  key={broker.rank}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                    broker.name === currentUser.name
                      ? 'bg-[#588157]/10 border-[#588157]/30 ring-1 ring-[#588157]/20'
                      : 'bg-[#FDFCFB] border-[#EAE7E2] hover:bg-[#F1EFEC]/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base">{broker.badge}</span>
                    <div>
                      <p className="text-xs font-semibold text-[#344E41] flex items-center gap-1.5">
                        <span>{broker.name}</span>
                        {broker.name === currentUser.name && (
                          <span className="text-[10px] bg-[#588157] text-white px-1.5 py-0.2 rounded font-bold">Você</span>
                        )}
                      </p>
                      <p className="text-[11px] text-[#3A403A]/60">
                        {broker.deals} {broker.deals === 1 ? 'venda' : 'vendas'} · {broker.conversion}% conversão
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-[#344E41] font-mono block">
                      {formatCurrency(broker.vgv)}
                    </span>
                    {broker.trendPercent !== null && (
                      <span className={`text-[10px] font-semibold ${
                        broker.trendPercent >= 10 ? 'text-[#588157]' : broker.trendPercent >= -15 ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        {broker.trendPercent >= 10 ? '🟢' : broker.trendPercent >= -15 ? '🟡' : '🔴'}{' '}
                        {broker.trendPercent >= 0 ? '+' : ''}{broker.trendPercent}%
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Block 4: Evolução mensal de VGV */}
          <div className="bg-white rounded-[1.75rem] p-6 border border-[#EAE7E2] shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif-title text-lg font-semibold text-[#344E41]">
                Evolução Histórica de VGV
              </h3>
              <span className={`text-xs font-bold ${vgvMomChangePercent >= 0 ? 'text-[#588157]' : 'text-red-600'}`}>
                {vgvMomChangePercent >= 0 ? '+' : ''}{vgvMomChangePercent}% vs mês anterior
              </span>
            </div>

            <div className="h-44 flex items-end justify-between gap-3 px-2 pt-4 pb-2 border-b border-[#EAE7E2]">
              {vgvHistory.map(item => (
                <div key={item.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <span className="text-[10px] text-[#3A403A]/60 group-hover:text-[#344E41] transition-colors whitespace-nowrap opacity-0 group-hover:opacity-100">
                    {formatCurrency(item.vgv).replace('R$', '').trim()}
                  </span>
                  <div
                    className={`w-full max-w-[36px] rounded-t-lg transition-all ${
                      item.current
                        ? 'bg-gradient-to-t from-[#588157] to-[#344E41] shadow-xs'
                        : 'bg-[#DAD7CD] group-hover:bg-[#A3B18A]'
                    }`}
                    style={{ height: item.height }}
                  />
                  <span className={`text-xs ${item.current ? 'font-bold text-[#344E41]' : 'text-[#3A403A]/60'}`}>
                    {item.month}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-xs text-[#3A403A]/70 pt-2">
              <span>Total no semestre:</span>
              <span className="font-bold text-[#344E41]">
                {formatCurrency(vgvHistory.reduce((s, h) => s + h.vgv, 0))}
              </span>
            </div>
          </div>
        </div>

        {/* Aging por etapa + Saúde da Operação */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Aging do Pipeline */}
          <div className="bg-white rounded-[1.75rem] p-6 border border-[#EAE7E2] shadow-2xs">
            <h3 className="font-serif-title text-lg font-semibold text-[#344E41] mb-1">
              Tempo Médio por Etapa
            </h3>
            <p className="text-xs text-[#3A403A]/60 mb-4">
              Há quanto tempo, em média, os leads estão parados na etapa atual ({funnels.find(f => f.id === selectedFunnelFilter)?.name})
            </p>
            <div className="space-y-2">
              {agingByStage.filter(s => s.leadsCount > 0).map(s => (
                <div key={s.id} className="flex items-center justify-between text-xs px-3.5 py-2.5 rounded-xl bg-[#FDFCFB] border border-[#EAE7E2]">
                  <span className="font-medium text-[#3A403A] flex items-center gap-1.5">
                    {bottleneckStage?.id === s.id && <span title="Principal gargalo">⚠️</span>}
                    {s.name}
                  </span>
                  <span className="text-[#3A403A]/70 font-mono text-[11px]">
                    {s.avgDays !== null ? `${s.avgDays.toFixed(1)} dias` : '—'} · {s.leadsCount} leads
                  </span>
                </div>
              ))}
              {agingByStage.every(s => s.leadsCount === 0) && (
                <div className="py-6 text-center text-xs text-[#3A403A]/50">
                  Sem leads ativos neste funil.
                </div>
              )}
            </div>
            {bottleneckStage && (
              <p className="text-[10px] text-[#3A403A]/50 mt-4 leading-tight">
                Principal gargalo: <span className="font-semibold text-[#344E41]">{bottleneckStage.name}</span> ({bottleneckStage.avgDays?.toFixed(1)} dias em média).
              </p>
            )}
          </div>

          {/* Saúde da Operação — visão de gestão */}
          {canViewAll && (
            <div className="bg-white rounded-[1.75rem] p-6 border border-[#EAE7E2] shadow-2xs flex flex-col justify-between">
              <div>
                <h3 className="font-serif-title text-lg font-semibold text-[#344E41] mb-4">
                  Saúde da Operação
                </h3>
                <div className="space-y-2">
                  {opsHealth.map(h => (
                    <div key={h.label} className="flex items-center justify-between text-xs px-3.5 py-2.5 rounded-xl bg-[#FDFCFB] border border-[#EAE7E2]">
                      <span className="font-medium text-[#3A403A]">{h.label}</span>
                      <span className="font-semibold text-[#344E41]">
                        {HEALTH_TIER_EMOJI[h.tier]} {HEALTH_TIER_LABEL[h.tier]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              {bottleneckStage && (
                <p className="text-xs text-[#3A403A]/70 mt-4 pt-3 border-t border-[#EAE7E2]">
                  Principal gargalo da semana: <span className="font-bold text-[#344E41]">{bottleneckStage.name}</span>
                </p>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
