import React, { useState } from 'react';
import {
  Flame,
  Calendar,
  Handshake,
  Wallet,
  TrendingUp,
  Award,
  ChevronRight,
  Filter,
  ArrowUpRight,
  Edit2,
  Users,
  ShieldAlert,
  MessageSquare,
  Zap,
  Send,
  Sparkles,
  QrCode,
  ListOrdered
} from 'lucide-react';
import { useCrm } from '../context/CrmContext';
import { Header } from './Header';
import { formatCurrency, formatPhone } from '../utils/formatters';
import { STAGES } from '../data/initialData';

export const DashboardView: React.FC = () => {
  const {
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
    openWhatsAppForLead,
    openWhatsAppDirectHub
  } = useCrm();

  const [selectedFunnelFilter, setSelectedFunnelFilter] = useState<string>(
    funnels[0]?.id || 'investidores'
  );

  const canViewAll = hasPermission('canViewAllLeads');

  // Calculate Metrics from isolated visible dataset
  const hotLeads = visibleLeads.filter(l => l.temperature === 'quente' && !l.archived);
  const newLeadsPending = visibleLeads.filter(l => l.stageId === 'lead_novo' && !l.archived);
  const pendingFollowUps = visibleActivities.filter(a => !a.completed);

  // Active month sales
  const currentMonthContracts = visibleContracts.filter(c => c.status !== 'excluido');
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

  // Leads by origin distribution
  const originCounts: Record<string, number> = {};
  visibleLeads.forEach(l => {
    originCounts[l.origin] = (originCounts[l.origin] || 0) + 1;
  });
  const totalLeadsWithOrigin = visibleLeads.length;

  // Real Broker Rankings computed from actual contracts
  const brokerStatsMap: Record<string, { name: string; vgv: number; deals: number; color: string }> = {};
  users.forEach(u => {
    brokerStatsMap[u.id] = { name: u.name, vgv: 0, deals: 0, color: u.avatarColor };
  });

  // Populate from all contracts
  contracts.forEach(c => {
    if (c.brokerId && brokerStatsMap[c.brokerId]) {
      brokerStatsMap[c.brokerId].vgv += c.value;
      brokerStatsMap[c.brokerId].deals += 1;
    }
  });

  const brokerRankings = Object.values(brokerStatsMap)
    .sort((a, b) => b.vgv - a.vgv)
    .map((b, idx) => ({
      rank: idx + 1,
      name: b.name,
      vgv: b.vgv,
      deals: b.deals,
      badge: idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}º`
    }));

  // Monthly VGV Evolution
  const vgvHistory = [
    { month: 'Mar', vgv: 1200000, height: '35%' },
    { month: 'Abr', vgv: 1950000, height: '55%' },
    { month: 'Mai', vgv: 1450000, height: '42%' },
    { month: 'Jun', vgv: 2800000, height: '78%' },
    { month: 'Jul', vgv: 2200000, height: '62%' },
    { month: 'Ago', vgv: currentMonthSalesVgv || 3200000, height: '90%', current: true }
  ];

  // Remaining days in month
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysRemaining = Math.max(1, daysInMonth - now.getDate());

  return (
    <div className="flex-1 min-h-screen bg-[#FDFCFB] flex flex-col">
      <Header
        title={canViewAll ? "Painel de Controle Geral" : `Meu Painel · ${currentUser.name}`}
        subtitle={
          canViewAll 
            ? "Visão executiva e consolidação de toda a imobiliária e corretores." 
            : "Acompanhe seus leads exclusivos, follow-ups e comissões particulares."
        }
      />

      <main className="p-8 max-w-7xl mx-auto w-full space-y-6">
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

          {/* Card 3: Vendas do Mês */}
          <div
            onClick={() => setActiveView('contracts')}
            className="bg-white rounded-[1.75rem] p-6 border border-[#EAE7E2] shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-widest text-[#3A403A]/70 font-bold">
                VENDAS FECHADAS
              </span>
              <Handshake className="w-4 h-4 text-[#344E41] group-hover:scale-110 transition-transform" />
            </div>
            <div className="mt-3">
              <p className="font-serif-title text-3xl font-bold text-[#344E41]">
                {currentMonthSalesCount}
              </p>
              <p className="text-xs text-[#588157] mt-1 font-semibold">
                {formatCurrency(currentMonthSalesVgv)}
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

        {/* Central de Disparos e Ações Rápidas WhatsApp */}
        <div className="bg-gradient-to-br from-[#3E4A3D] to-[#2D382C] text-white rounded-[1.75rem] p-6 shadow-md border border-[#588157]/40 relative overflow-hidden">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-[#588157] text-white flex items-center justify-center shadow-xs">
                  <MessageSquare className="w-4 h-4" />
                </span>
                <h3 className="font-serif-title font-bold text-lg text-white">
                  Central de Disparos & Conversão WhatsApp
                </h3>
                <span className="text-[10px] font-bold bg-[#A3B18A]/30 text-[#E9EDC9] px-2 py-0.5 rounded-full border border-white/10">
                  {newLeadsPending.length} novos · {pendingFollowUps.length} follow-ups
                </span>
              </div>
              <p className="text-xs text-[#E9EDC9]/80 max-w-2xl">
                Aumente suas conversões respondendo leads nos primeiros 5 minutos com scripts pré-formatados, agendamentos e quebras de objeções.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={() => openWhatsAppDirectHub('generator')}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#E9EDC9] bg-white/10 hover:bg-white/20 rounded-xl border border-white/10 transition-all"
              >
                <QrCode className="w-3.5 h-3.5 text-[#A3B18A]" />
                <span>Link & QR Code</span>
              </button>

              <button
                onClick={() => openWhatsAppDirectHub('queue')}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-[#3E4A3D] bg-[#A3B18A] hover:bg-[#E9EDC9] rounded-xl shadow-xs transition-all"
              >
                <ListOrdered className="w-4 h-4" />
                <span>Iniciar Fila de Disparos do Dia</span>
              </button>
            </div>
          </div>

          {/* Quick Lead Action Chips */}
          {visibleLeads.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <span className="text-[11px] font-semibold text-[#A3B18A] whitespace-nowrap">
                Disparo 1-clique:
              </span>
              {visibleLeads.slice(0, 5).map(lead => (
                <button
                  key={lead.id}
                  onClick={() => openWhatsAppForLead(lead, 'scripts')}
                  className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-2.5 py-1.5 rounded-lg text-white text-[11px] font-medium transition-colors whitespace-nowrap border border-white/5"
                >
                  <Send className="w-3 h-3 text-[#A3B18A]" />
                  <span>{lead.name.split(' ')[0]}</span>
                  <span className="text-[#A3B18A] text-[10px]">({lead.propertyInterest.split(' ')[0]})</span>
                </button>
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
                {daysRemaining} dias restantes
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
          </div>
        </div>

        {/* 2-Column Grid Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Block 1: Leads por origem */}
          <div className="bg-white rounded-[1.75rem] p-6 border border-[#EAE7E2] shadow-2xs">
            <h3 className="font-serif-title text-lg font-semibold text-[#344E41] mb-4">
              Origem dos Leads na sua Carteira
            </h3>

            {totalLeadsWithOrigin === 0 ? (
              <div className="h-64 flex items-center justify-center text-xs text-[#3A403A]/50">
                Nenhum lead atribuído até o momento.
              </div>
            ) : (
              <div className="space-y-3.5 py-2">
                {Object.entries(originCounts).map(([origin, count]) => {
                  const percent = Math.round((count / totalLeadsWithOrigin) * 100);
                  return (
                    <div key={origin} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-[#3A403A]">{origin}</span>
                        <span className="text-[#3A403A]/60">
                          {count} ({percent}%)
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-[#F1EFEC] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#A3B18A] rounded-full"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
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
                {stageStats.map(st => (
                  <div
                    key={st.id}
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
                ))}
              </div>
            </div>

            <p className="text-[10px] text-[#3A403A]/50 mt-4 leading-tight">
              Taxa de progressão em relação aos leads da sua alçada neste funil.
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
                        {broker.deals} {broker.deals === 1 ? 'venda' : 'vendas'} registradas
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#344E41] font-mono">
                    {formatCurrency(broker.vgv)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Block 4: Evolução mensal de VGV */}
          <div className="bg-white rounded-[1.75rem] p-6 border border-[#EAE7E2] shadow-2xs flex flex-col justify-between">
            <h3 className="font-serif-title text-lg font-semibold text-[#344E41] mb-4">
              Evolução Histórica de VGV
            </h3>

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
      </main>
    </div>
  );
};
