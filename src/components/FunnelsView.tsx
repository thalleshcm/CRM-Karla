import React, { useState } from 'react';
import {
  Building2,
  DollarSign,
  Phone,
  Flame,
  Zap,
  Snowflake,
  MessageSquare,
  Calendar,
  User,
  UploadCloud,
  FileCheck2,
  Trophy,
  XCircle,
  RotateCcw,
  Search,
  Filter,
  CheckCircle2,
  X,
  AlertCircle,
  UserPlus,
  Tag,
  ChevronDown,
  FileSpreadsheet
} from 'lucide-react';
import { useCrm } from '../context/CrmContext';
import { Header } from './Header';
import { STAGES } from '../data/initialData';
import { StageId, LeadTemperature, LOST_REASON_OPTIONS } from '../types';
import { formatCurrency, formatDateTimePtBR } from '../utils/formatters';
import { computeLeadHealthScore, LEAD_HEALTH_TIER_EMOJI } from '../utils/leadHealth';
import { useEscapeToClose } from '../hooks/useEscapeToClose';

export const FunnelsView: React.FC = () => {
  const {
    visibleLeads,
    activeFunnelId,
    setActiveFunnelId,
    funnels = [],
    settings,
    moveLeadStage,
    setSelectedLead,
    hasPermission,
    openWhatsAppForLead,
    openClientPortalModal,
    leadStatusFilter,
    setLeadStatusFilter,
    markLeadWon,
    markLeadLost,
    reactivateLead,
    setIsNewLeadModalOpen,
    setIsImportModalOpen,
    setImportType
  } = useCrm();

  const [dragOverStageId, setDragOverStageId] = useState<StageId | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [prioritizeByRisk, setPrioritizeByRisk] = useState(false);
  const [selectedTagFilters, setSelectedTagFilters] = useState<string[]>([]);
  const [showTagFilterMenu, setShowTagFilterMenu] = useState(false);
  const [lostModalLeadId, setLostModalLeadId] = useState<string | null>(null);
  const [lostReasonSelected, setLostReasonSelected] = useState<string>(LOST_REASON_OPTIONS[0]);
  const [lostNotesInput, setLostNotesInput] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const canViewAll = hasPermission('canViewAllLeads');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Base filter by funnel
  const currentFunnel = activeFunnelId || 'todos';
  const baseFunnelLeads = visibleLeads.filter(lead => {
    if (currentFunnel === 'todos') return true;
    return lead.funnelId === currentFunnel;
  });

  // Calculate status counts
  const activeCount = baseFunnelLeads.filter(l => !l.status || l.status === 'ativo').length;
  const wonCount = baseFunnelLeads.filter(l => l.status === 'ganho').length;
  const lostCount = baseFunnelLeads.filter(l => l.status === 'perdido').length;
  const totalCount = baseFunnelLeads.length;

  // Filter leads by selected status and search term
  const funnelLeads = baseFunnelLeads.filter(lead => {
    // Status filter
    if (leadStatusFilter === 'ativos') {
      if (lead.status && lead.status !== 'ativo') return false;
    } else if (leadStatusFilter === 'ganhos') {
      if (lead.status !== 'ganho') return false;
    } else if (leadStatusFilter === 'perdidos') {
      if (lead.status !== 'perdido') return false;
    }

    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = lead.name.toLowerCase().includes(q);
      const matchPhone = (lead.phone || '').includes(q);
      const matchProperty = (lead.propertyInterest || '').toLowerCase().includes(q);
      const matchBroker = (lead.brokerName || '').toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchProperty && !matchBroker) return false;
    }

    // Tag filter — combines with every filter above (funnel/status/search).
    // A lead matches if it carries at least one of the selected tags.
    if (selectedTagFilters.length > 0) {
      if (!lead.tags || !lead.tags.some(t => selectedTagFilters.includes(t))) return false;
    }

    return true;
  });

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('text/plain', leadId);
  };

  const handleDragOver = (e: React.DragEvent, stageId: StageId) => {
    e.preventDefault();
    setDragOverStageId(stageId);
  };

  const handleDragLeave = () => {
    setDragOverStageId(null);
  };

  const handleDrop = (e: React.DragEvent, stageId: StageId) => {
    e.preventDefault();
    setDragOverStageId(null);
    const leadId = e.dataTransfer.getData('text/plain');
    if (leadId) {
      moveLeadStage(leadId, stageId);
    }
  };

  const getTemperatureBadge = (temp: LeadTemperature) => {
    switch (temp) {
      case 'quente':
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
            <Flame className="w-3 h-3 text-rose-500" />
            <span>Quente</span>
          </span>
        );
      case 'morno':
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
            <Zap className="w-3 h-3 text-amber-500" />
            <span>Morno</span>
          </span>
        );
      case 'frio':
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
            <Snowflake className="w-3 h-3 text-sky-500" />
            <span>Frio</span>
          </span>
        );
      default:
        return null;
    }
  };

  const selectedLostLead = visibleLeads.find(l => l.id === lostModalLeadId);

  useEscapeToClose(() => setLostModalLeadId(null), !!lostModalLeadId);

  return (
    <div className="flex-1 min-h-screen bg-[#FDFCFB] flex flex-col relative">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-80 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xl flex items-center gap-2 animate-in slide-in-from-top duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      <Header
        title="Funil de Vendas & Atendimento"
        subtitle="Arraste os cards para avançar os estágios da negociação imobiliária."
        actionButton={
          hasPermission('canCreateLeads') ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setImportType('csv');
                  setIsImportModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-[#F4F1EA] text-[#344E41] border border-[#EAE7E2] rounded-xl text-xs font-semibold shadow-2xs transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#588157]" />
                <span>Importar planilha</span>
              </button>
              <button
                onClick={() => setIsNewLeadModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#344E41] hover:bg-[#283d33] text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5 text-[#A3B18A]" />
                <span>Novo Lead</span>
              </button>
            </div>
          ) : undefined
        }
      />

      {/* Main Filter & Status Control Bar */}
      <div className="px-4 sm:px-6 lg:px-8 py-3 bg-[#F4F1EA] border-b border-[#EAE7E2] flex items-center justify-between flex-wrap gap-3">
        {/* Left Side: Funnels & Status Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Funnel Selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#3A403A]/70 mr-1">
              Funil:
            </span>
            <button
              onClick={() => setActiveFunnelId('todos')}
              className={`px-3 py-1 text-xs rounded-full font-medium transition-all cursor-pointer ${
                currentFunnel === 'todos'
                  ? 'bg-[#344E41] text-white shadow-xs font-semibold'
                  : 'bg-white hover:bg-[#FDFCFB] text-[#3A403A] border border-[#EAE7E2]'
              }`}
            >
              Todos
            </button>
            {(funnels || []).map(f => {
              const isActive = currentFunnel === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setActiveFunnelId(f.id)}
                  className={`px-3 py-1 text-xs rounded-full font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#344E41] text-white shadow-xs font-semibold'
                      : 'bg-white hover:bg-[#FDFCFB] text-[#3A403A] border border-[#EAE7E2]'
                  }`}
                >
                  {f.name}
                </button>
              );
            })}
          </div>

          <div className="h-4 w-px bg-[#EAE7E2] hidden sm:block" />

          {/* Lead Status Filter Toggle: Ativos / Ganhos / Perdidos / Todos */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#EAE7E2] shadow-2xs">
            <button
              onClick={() => setLeadStatusFilter('ativos')}
              className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                leadStatusFilter === 'ativos'
                  ? 'bg-[#344E41] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
              title="Exibe apenas os leads em atendimento ativo no funil"
            >
              <span>Ativos</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                leadStatusFilter === 'ativos' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {activeCount}
              </span>
            </button>

            <button
              onClick={() => setLeadStatusFilter('ganhos')}
              className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                leadStatusFilter === 'ganhos'
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50'
              }`}
              title="Exibe leads finalizados com venda concluída (Ganhos)"
            >
              <Trophy className="w-3 h-3" />
              <span>Ganhos</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                leadStatusFilter === 'ganhos' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {wonCount}
              </span>
            </button>

            <button
              onClick={() => setLeadStatusFilter('perdidos')}
              className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                leadStatusFilter === 'perdidos'
                  ? 'bg-rose-700 text-white shadow-2xs'
                  : 'text-rose-700 hover:text-rose-800 hover:bg-rose-50'
              }`}
              title="Exibe leads marcados como perdidos/desistentes"
            >
              <XCircle className="w-3 h-3" />
              <span>Perdidos</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                leadStatusFilter === 'perdidos' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-800'
              }`}>
                {lostCount}
              </span>
            </button>

            <button
              onClick={() => setLeadStatusFilter('todos')}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all cursor-pointer ${
                leadStatusFilter === 'todos'
                  ? 'bg-slate-800 text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
              title="Exibe todos os leads sem ocultação"
            >
              <span>Todos ({totalCount})</span>
            </button>
          </div>
        </div>

        {/* Right Side: Quick Search & Total Summary */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTagFilterMenu(v => !v)}
              className={`px-2.5 py-1.5 text-xs rounded-xl font-semibold border transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                selectedTagFilters.length > 0
                  ? 'bg-[#344E41] text-white border-[#344E41]'
                  : 'bg-white text-[#3A403A] border-[#EAE7E2] hover:bg-[#FDFCFB]'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Tags{selectedTagFilters.length > 0 ? ` (${selectedTagFilters.length})` : ''}</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {showTagFilterMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowTagFilterMenu(false)} />
                <div className="absolute right-0 top-full mt-1.5 z-50 w-60 bg-white border border-slate-200 rounded-xl shadow-lg p-2.5 space-y-1.5 max-h-80 overflow-y-auto">
                  {(settings.leadTags || []).length === 0 && (
                    <p className="text-[11px] text-[#3A403A]/50 italic px-1 py-1">Nenhuma tag cadastrada ainda.</p>
                  )}
                  {(settings.leadTags || []).map(tag => {
                    const isSelected = selectedTagFilters.includes(tag);
                    return (
                      <label
                        key={tag}
                        className="flex items-center gap-2 px-1.5 py-1 rounded-lg hover:bg-[#F4F1EA] cursor-pointer text-xs text-[#3A403A]"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() =>
                            setSelectedTagFilters(prev =>
                              isSelected ? prev.filter(t => t !== tag) : [...prev, tag]
                            )
                          }
                          className="accent-[#588157]"
                        />
                        <span>{tag}</span>
                      </label>
                    );
                  })}
                  {selectedTagFilters.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedTagFilters([])}
                      className="w-full text-left text-[11px] font-semibold text-[#588157] hover:text-[#344E41] pt-1.5 mt-1 border-t border-slate-100"
                    >
                      Limpar filtro de tags
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => setPrioritizeByRisk(v => !v)}
            title="Ordena cada coluna colocando os leads com Lead Health mais baixo (maior risco) primeiro"
            className={`px-2.5 py-1.5 text-xs rounded-xl font-semibold border transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
              prioritizeByRisk
                ? 'bg-rose-600 text-white border-rose-600'
                : 'bg-white text-[#3A403A] border-[#EAE7E2] hover:bg-[#FDFCFB]'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Priorizar por risco</span>
          </button>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar no funil..."
              className="pl-8 pr-3 py-1.5 text-xs bg-white border border-[#EAE7E2] rounded-xl text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#344E41] w-36 sm:w-44 shadow-2xs"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <div className="text-xs text-[#3A403A]/80 font-medium hidden md:block">
            Exibindo: <span className="text-[#344E41] font-bold">{funnelLeads.length} leads</span> (
            {formatCurrency(funnelLeads.reduce((s, l) => s + (l.estimatedValue || 0), 0))})
          </div>
        </div>
      </div>

      {/* Info Banner when viewing Lost or Won leads */}
      {leadStatusFilter === 'perdidos' && (
        <div className="px-4 sm:px-8 py-2 bg-rose-50 border-b border-rose-200 flex items-center justify-between text-xs text-rose-800 font-medium">
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              <strong>Modo de Visualização: Leads Perdidos.</strong> Estes leads ficam ocultos do fluxo de andamento diário para não poluir o funil. Você pode reativá-los a qualquer momento.
            </span>
          </div>
          <button
            onClick={() => setLeadStatusFilter('ativos')}
            className="text-xs font-bold text-rose-900 underline hover:no-underline cursor-pointer shrink-0 ml-4"
          >
            Voltar para Leads Ativos
          </button>
        </div>
      )}

      {leadStatusFilter === 'ganhos' && (
        <div className="px-4 sm:px-8 py-2 bg-emerald-50 border-b border-emerald-200 flex items-center justify-between text-xs text-emerald-800 font-medium">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>Modo de Visualização: Negociações Ganhas (Vendas Concluídas).</strong> Exibindo o histórico de contratos fechados.
            </span>
          </div>
          <button
            onClick={() => setLeadStatusFilter('ativos')}
            className="text-xs font-bold text-emerald-900 underline hover:no-underline cursor-pointer shrink-0 ml-4"
          >
            Voltar para Leads Ativos
          </button>
        </div>
      )}

      {/* Touch devices can't drag cards between columns — point them at the tap alternative */}
      <p className="lg:hidden px-4 sm:px-6 pt-2 text-[11px] text-[#3A403A]/50">
        Toque em um card para abrir os detalhes e mudar de etapa.
      </p>

      {/* Kanban Board Container */}
      <div className="flex-1 p-3 sm:p-4 lg:p-6 overflow-x-auto snap-x snap-mandatory lg:snap-none">
        <div className="flex items-start gap-3.5 min-w-max pb-6">
          {STAGES.map((stage, idx) => {
            const stageLeadsRaw = funnelLeads.filter(l => l.stageId === stage.id);
            const stageLeads = prioritizeByRisk
              ? [...stageLeadsRaw].sort((a, b) => {
                  if ((!a.status || a.status === 'ativo') !== (!b.status || b.status === 'ativo')) {
                    return (!a.status || a.status === 'ativo') ? -1 : 1;
                  }
                  return computeLeadHealthScore(a).score - computeLeadHealthScore(b).score;
                })
              : stageLeadsRaw;
            const stageTotalValue = stageLeads.reduce((sum, l) => sum + (l.estimatedValue || 0), 0);
            const isOver = dragOverStageId === stage.id;
            const isLastStage = idx === STAGES.length - 1 || stage.id === 'pos_venda' || stage.id === 'venda_concluida';

            return (
              <div
                key={stage.id}
                onDragOver={e => handleDragOver(e, stage.id)}
                onDragLeave={handleDragLeave}
                onDrop={e => handleDrop(e, stage.id)}
                className={`w-[82vw] sm:w-72 min-w-[18rem] snap-center rounded-2xl flex flex-col border border-[#EAE7E2] transition-colors ${
                  isOver ? 'bg-[#A3B18A]/20 ring-2 ring-[#588157]' : 'bg-[#F1EFEA]/80'
                }`}
              >
                {/* Column Header */}
                <div className="p-3.5 border-b border-[#EAE7E2] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#344E41] tracking-tight">
                      {stage.name}
                    </span>
                    <span className="w-5 h-5 rounded-full bg-[#EAE7E2] text-[#344E41] text-[11px] font-bold flex items-center justify-center">
                      {stageLeads.length}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-medium text-[#3A403A]/60">
                    {formatCurrency(stageTotalValue)}
                  </span>
                </div>

                {/* Column Body / Cards List */}
                <div className="p-2.5 space-y-2.5 min-h-[450px]">
                  {stageLeads.map(lead => (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={e => handleDragStart(e, lead.id)}
                      onClick={() => setSelectedLead(lead)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer group relative ${
                        lead.status === 'ganho'
                          ? 'bg-emerald-50/70 border-emerald-200 shadow-2xs hover:shadow-md hover:border-emerald-400'
                          : lead.status === 'perdido'
                          ? 'bg-rose-50/70 border-rose-200 shadow-2xs hover:shadow-md hover:border-rose-400'
                          : 'bg-white border-[#EAE7E2] shadow-2xs hover:shadow-md hover:border-[#A3B18A]'
                      }`}
                    >
                      {/* Status Badges for Won / Lost */}
                      {lead.status === 'ganho' && (
                        <div className="mb-2 flex items-center justify-between">
                          <span className="flex items-center gap-1 text-[10px] font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md">
                            <Trophy className="w-3 h-3 text-emerald-600" />
                            <span>VENDA CONCLUÍDA</span>
                          </span>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              reactivateLead(lead.id);
                              showToast('Negociação reaberta no funil.');
                            }}
                            className="text-[10px] font-semibold text-emerald-700 hover:text-emerald-900 underline"
                            title="Reabrir Negociação"
                          >
                            Reabrir
                          </button>
                        </div>
                      )}

                      {lead.status === 'perdido' && (
                        <div className="mb-2 flex items-center justify-between gap-1">
                          <span className="flex items-center gap-1 text-[10px] font-bold text-rose-800 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded-md truncate">
                            <XCircle className="w-3 h-3 text-rose-600 shrink-0" />
                            <span className="truncate">Perdido: {lead.lostReason || 'Desistência'}</span>
                          </span>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              reactivateLead(lead.id);
                              showToast('Lead reativado e retornado ao funil ativo!');
                            }}
                            className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded flex items-center gap-0.5 shrink-0"
                            title="Reativar Lead para o fluxo ativo"
                          >
                            <RotateCcw className="w-2.5 h-2.5" />
                            <span>Reativar</span>
                          </button>
                        </div>
                      )}

                      {/* Top row: Name & Temp */}
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-bold text-[#344E41] group-hover:text-[#588157] transition-colors leading-tight">
                          {lead.name}
                        </h4>
                        {getTemperatureBadge(lead.temperature)}
                      </div>

                      {/* Lead Health badge — rule-based priority signal, only for active deals with enough history to score */}
                      {(!lead.status || lead.status === 'ativo') && (() => {
                        const health = computeLeadHealthScore(lead);
                        const tooNew = health.score === 0 && (Date.now() - Date.parse(lead.createdAt)) < 2 * 24 * 60 * 60 * 1000;
                        if (tooNew) return null;
                        return (
                          <div
                            className="flex items-center gap-1 text-[10px] font-semibold mt-1 w-fit"
                            title={health.breakdown.map(b => `${b.label}: ${b.points > 0 ? '+' : ''}${b.points}`).join(' · ') || 'Sem sinais registrados ainda'}
                          >
                            <span>{LEAD_HEALTH_TIER_EMOJI[health.tier]}</span>
                            <span className="text-[#3A403A]/60">{health.score}/100</span>
                          </div>
                        );
                      })()}

                      {/* Broker Attribution Badge */}
                      {canViewAll && lead.brokerName && (
                        <div className="flex items-center gap-1 text-[10px] text-[#588157] font-semibold mt-1 bg-[#588157]/10 px-1.5 py-0.5 rounded w-fit">
                          <User className="w-2.5 h-2.5" />
                          <span>{lead.brokerName}</span>
                        </div>
                      )}

                      {/* Document Portal Submission Status Badge */}
                      {lead.clientData?.documentsSubmitted && (
                        <div className="flex items-center gap-1 text-[10px] text-emerald-800 font-bold mt-1.5 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md w-fit">
                          <FileCheck2 className="w-3 h-3 text-emerald-600" />
                          <span>Documentos Anexados</span>
                        </div>
                      )}

                      {/* Property Interest */}
                      <div className="flex items-center gap-1.5 text-xs text-[#3A403A]/80 mt-2">
                        <Building2 className="w-3.5 h-3.5 text-[#A3B18A] shrink-0" />
                        <span className="truncate">{lead.propertyInterest}</span>
                      </div>

                      {/* Estimated Value */}
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#344E41] mt-1 font-mono">
                        <DollarSign className="w-3.5 h-3.5 text-[#588157] shrink-0" />
                        <span>{formatCurrency(lead.estimatedValue)}</span>
                      </div>

                      {/* Tags */}
                      {lead.tags && lead.tags.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap mt-1.5">
                          {lead.tags.slice(0, 3).map(tag => (
                            <span
                              key={tag}
                              className="text-[9px] font-bold text-[#344E41] bg-[#A3B18A]/20 border border-[#A3B18A]/30 px-1.5 py-0.5 rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                          {lead.tags.length > 3 && (
                            <span className="text-[9px] font-semibold text-[#3A403A]/50">+{lead.tags.length - 3}</span>
                          )}
                        </div>
                      )}

                      {/* Follow-up reminder if any */}
                      {lead.nextFollowUpDate && (
                        <div className="flex items-center gap-1.5 text-[10px] text-[#588157] bg-[#A3B18A]/15 px-2 py-1 rounded-lg mt-2 border border-[#A3B18A]/30">
                          <Calendar className="w-3 h-3 text-[#588157] shrink-0" />
                          <span className="truncate">
                            {formatDateTimePtBR(lead.nextFollowUpDate)}
                          </span>
                        </div>
                      )}

                      {/* Quick Status Action Bar for Active Leads */}
                      {(!lead.status || lead.status === 'ativo') && (
                        <div className="flex items-center justify-between gap-1.5 pt-2 mt-2 border-t border-slate-100" onClick={e => e.stopPropagation()}>
                          {/* Dar Ganho (Only on Last Stage) */}
                          {isLastStage ? (
                            <button
                              onClick={() => {
                                markLeadWon(lead.id);
                                showToast('🏆 Parabéns! Venda concluída e lead marcado como GANHO!');
                              }}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer"
                              title="Marcar como Ganho (Venda Concluída)"
                            >
                              <Trophy className="w-3 h-3" />
                              <span>Dar Ganho</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                showToast('ℹ️ O lead só pode ser marcado como Ganho na última etapa do funil.');
                              }}
                              className="text-[10px] text-slate-400 hover:text-slate-600 px-1 py-0.5 transition"
                              title="Ganho disponível apenas na última etapa"
                            >
                              Ganho na última etapa
                            </button>
                          )}

                          {/* Dar Perdido (Any Stage) */}
                          <button
                            onClick={() => {
                              setLostModalLeadId(lead.id);
                              setLostReasonSelected(LOST_REASON_OPTIONS[0]);
                              setLostNotesInput('');
                            }}
                            className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-semibold transition flex items-center gap-1 cursor-pointer"
                            title="Marcar lead como perdido nesta etapa"
                          >
                            <XCircle className="w-3 h-3 text-rose-500" />
                            <span>Dar Perdido</span>
                          </button>
                        </div>
                      )}

                      {/* Bottom Footer: Origin, Portal & Direct WhatsApp */}
                      <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-[#EAE7E2]">
                        <span className="text-[10px] text-[#3A403A]/70 font-medium bg-[#F1EFEC] px-2 py-0.5 rounded-md">
                          {lead.origin}
                        </span>

                        <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => openClientPortalModal(lead)}
                            className="p-1.5 text-emerald-800 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                            title="Abrir Ficha do Cliente / Portal"
                          >
                            <UploadCloud className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => openWhatsAppForLead(lead, 'scripts')}
                            className="flex items-center gap-1 px-2 py-1 bg-[#588157]/15 hover:bg-[#588157] text-[#588157] hover:text-white rounded-lg text-[10px] font-bold transition-all shadow-2xs group/wa cursor-pointer"
                            title="Abrir Central WhatsApp com script do estágio"
                          >
                            <MessageSquare className="w-3 h-3 text-[#588157] group-hover/wa:text-white" />
                            <span>WhatsApp</span>
                          </button>

                          <a
                            href={`tel:${lead.phone}`}
                            className="p-1.5 text-[#3A403A]/50 hover:text-[#344E41] hover:bg-[#F1EFEC] rounded-lg transition-colors"
                            title="Ligar"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Empty drop target placeholder */}
                  {stageLeads.length === 0 && (
                    <div className="h-32 border-2 border-dashed border-[#EAE7E2] rounded-2xl flex items-center justify-center text-xs text-[#3A403A]/40 select-none">
                      Nenhum lead nesta etapa
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* QUICK MODAL: Marcar Lead como Perdido do Kanban */}
      {lostModalLeadId && selectedLostLead && (
        <div className="fixed inset-0 z-80 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-rose-100">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2 text-rose-700">
                <XCircle className="w-5 h-5" />
                <h3 className="font-bold text-base text-slate-900">
                  Marcar Lead como Perdido
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setLostModalLeadId(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              O lead <strong>{selectedLostLead.name}</strong> será removido do funil ativo. Você poderá visualizá-lo sempre que quiser usando o filtro <em>"Perdidos"</em>.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Motivo da Perda <span className="text-rose-500">*</span>
              </label>
              <select
                value={lostReasonSelected}
                onChange={e => setLostReasonSelected(e.target.value)}
                className="w-full text-xs font-medium p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              >
                {LOST_REASON_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Observações complementares (opcional)
              </label>
              <textarea
                value={lostNotesInput}
                onChange={e => setLostNotesInput(e.target.value)}
                placeholder="Detalhes sobre o motivo da perda ou desistência..."
                rows={3}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setLostModalLeadId(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  markLeadLost(selectedLostLead.id, lostReasonSelected, lostNotesInput);
                  setLostModalLeadId(null);
                  showToast('Lead arquivado como PERDIDO e ocultado do funil ativo.');
                }}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                <span>Confirmar Perda</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

