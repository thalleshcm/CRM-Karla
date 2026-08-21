import React, { useState } from 'react';
import {
  FileText,
  Search,
  Plus,
  Paperclip,
  Trash2,
  CheckCircle2,
  Download,
  User,
  ExternalLink,
  ChevronRight,
  DollarSign,
  Percent,
  Calendar,
  Building,
  ShieldCheck,
  Printer,
  Sparkles
} from 'lucide-react';
import { useCrm } from '../context/CrmContext';
import { Header } from './Header';
import { Contract } from '../types';
import { formatCurrency, formatDatePtBR } from '../utils/formatters';

export const ContractsView: React.FC = () => {
  const {
    visibleContracts,
    updateContract,
    setIsSaleModalOpen,
    setSaleModalLead,
    hasPermission
  } = useCrm();

  const [filterTab, setFilterTab] = useState<'ativos' | 'excluidos' | 'concluidos'>('ativos');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContractForDetails, setSelectedContractForDetails] = useState<Contract | null>(null);

  const canViewAll = hasPermission('canViewAllLeads');

  const activeContracts = visibleContracts.filter(c => c.status !== 'excluido' && c.status !== 'cancelado');
  const completedContracts = visibleContracts.filter(c => c.status === 'concluido');
  const excludedContracts = visibleContracts.filter(c => c.status === 'excluido' || c.status === 'cancelado');

  const displayedList = filterTab === 'ativos'
    ? activeContracts
    : filterTab === 'concluidos'
    ? completedContracts
    : excludedContracts;

  const filteredContracts = displayedList.filter(
    c =>
      c.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.enterpriseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.unit.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalValue = activeContracts.reduce((sum, c) => sum + c.value, 0);
  const totalCommission = activeContracts.reduce((sum, c) => sum + c.totalCommissionValue, 0);
  const completedCount = completedContracts.length;

  const handleOpenNewSale = () => {
    setSaleModalLead(null);
    setIsSaleModalOpen(true);
  };

  const handleStatusChange = (id: string, newStatus: Contract['status']) => {
    updateContract(id, { status: newStatus });
    if (selectedContractForDetails && selectedContractForDetails.id === id) {
      setSelectedContractForDetails({ ...selectedContractForDetails, status: newStatus });
    }
  };

  return (
    <div className="flex-1 min-h-screen bg-[#FDFCFB] flex flex-col">
      <Header
        title="Gestão de Contratos & Vendas"
        subtitle="Controle jurídico de minutas, contratos assinados e comissões imobiliárias."
      />

      <main className="p-4 sm:p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* 3 Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#EAE7E2] shadow-2xs">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold uppercase tracking-widest text-[#3A403A]/70">
                Contratos Ativos
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                {activeContracts.length} no total
              </span>
            </div>
            <p className="font-serif text-3xl font-bold text-[#344E41] mt-2">
              {activeContracts.length}
            </p>
            <p className="text-xs text-[#3A403A]/60 mt-1">Vendas formalizadas e em execução</p>
          </div>

          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#EAE7E2] shadow-2xs">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold uppercase tracking-widest text-[#3A403A]/70">
                VGV Total Contratado
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold">
                Volume
              </span>
            </div>
            <p className="font-serif text-3xl font-bold text-[#344E41] mt-2 font-mono">
              {formatCurrency(totalValue)}
            </p>
            <p className="text-xs text-[#3A403A]/60 mt-1">Comissões previstas: <strong>{formatCurrency(totalCommission)}</strong></p>
          </div>

          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#EAE7E2] shadow-2xs">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold uppercase tracking-widest text-[#3A403A]/70">
                Vendas Concluídas
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#A3B18A]/30 text-[#344E41] font-semibold">
                Liquidado
              </span>
            </div>
            <p className="font-serif text-3xl font-bold text-[#344E41] mt-2">
              {completedCount}
            </p>
            <p className="text-xs text-[#3A403A]/60 mt-1">100% escriturado e comissões quitadas</p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center bg-[#F1EFEC] p-1 rounded-xl border border-[#EAE7E2]">
              <button
                onClick={() => setFilterTab('ativos')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  filterTab === 'ativos'
                    ? 'bg-white text-[#344E41] shadow-2xs'
                    : 'text-[#3A403A]/70 hover:text-[#344E41]'
                }`}
              >
                Ativos ({activeContracts.length})
              </button>
              <button
                onClick={() => setFilterTab('concluidos')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  filterTab === 'concluidos'
                    ? 'bg-white text-[#344E41] shadow-2xs'
                    : 'text-[#3A403A]/70 hover:text-[#344E41]'
                }`}
              >
                Concluídos ({completedContracts.length})
              </button>
              <button
                onClick={() => setFilterTab('excluidos')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  filterTab === 'excluidos'
                    ? 'bg-white text-[#344E41] shadow-2xs'
                    : 'text-[#3A403A]/70 hover:text-[#344E41]'
                }`}
              >
                Cancelados ({excludedContracts.length})
              </button>
            </div>

            <div className="relative flex-1 sm:w-72">
              <Search className="w-3.5 h-3.5 text-[#3A403A]/40 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por cliente ou imóvel..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3.5 py-2 bg-white border border-[#EAE7E2] rounded-xl text-xs text-[#3A403A] placeholder-[#3A403A]/40 focus:outline-none focus:border-[#A3B18A]"
              />
            </div>
          </div>

          <button
            onClick={handleOpenNewSale}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#344E41] hover:bg-[#283d33] rounded-xl shadow-xs transition shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Nova Venda</span>
          </button>
        </div>

        {/* Contracts Table */}
        <div className="bg-white rounded-2xl border border-[#EAE7E2] shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F4F1EA] border-b border-[#EAE7E2] text-[#344E41] font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Cliente & Empreendimento</th>
                  {canViewAll && <th className="py-3.5 px-4">Corretor</th>}
                  <th className="py-3.5 px-4">Unidade</th>
                  <th className="py-3.5 px-4">VGV Total</th>
                  <th className="py-3.5 px-4">Comissão Geral</th>
                  <th className="py-3.5 px-4">Repasse Corretor</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE7E2] text-[#3A403A]">
                {filteredContracts.length === 0 ? (
                  <tr>
                    <td colSpan={canViewAll ? 8 : 7} className="py-16 text-center text-xs text-[#3A403A]/50">
                      Nenhum contrato encontrado nesta categoria.
                    </td>
                  </tr>
                ) : (
                  filteredContracts.map(contract => (
                    <tr key={contract.id} className="hover:bg-[#FDFCFB] transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#344E41]">{contract.clientName}</div>
                        <div className="text-[11px] text-[#3A403A]/60">{contract.enterpriseName}</div>
                      </td>
                      {canViewAll && (
                        <td className="py-3.5 px-4">
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-[#588157] bg-[#588157]/10 px-2 py-0.5 rounded w-fit">
                            <User className="w-2.5 h-2.5" />
                            {contract.brokerName || 'Corretor'}
                          </span>
                        </td>
                      )}
                      <td className="py-3.5 px-4 text-[#3A403A]/80">{contract.unit}</td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-[#344E41]">
                        {formatCurrency(contract.value)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[#3A403A]">
                        {formatCurrency(contract.totalCommissionValue)}
                        <span className="text-[10px] text-slate-400 block font-sans">({contract.commissionPercent}%)</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-emerald-700">
                        {formatCurrency(contract.brokerCommissionValue)}
                        <span className="text-[10px] text-emerald-600/70 block font-sans">({contract.brokerCommissionPercent}%)</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            contract.status === 'concluido'
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              : contract.status === 'assinado'
                              ? 'bg-blue-100 text-blue-900 border border-blue-300'
                              : contract.status === 'analise'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-rose-100 text-rose-900 border border-rose-300'
                          }`}
                        >
                          {contract.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedContractForDetails(contract)}
                            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#344E41] bg-[#F1EFEC] hover:bg-[#EAE7E2] rounded-lg border border-[#EAE7E2] transition"
                          >
                            <FileText className="w-3 h-3 text-emerald-700" />
                            <span>Detalhes</span>
                          </button>

                          {contract.status !== 'cancelado' && contract.status !== 'excluido' ? (
                            <button
                              onClick={() => handleStatusChange(contract.id, 'cancelado')}
                              className="p-1.5 text-[#3A403A]/40 hover:text-rose-600 rounded-lg transition"
                              title="Cancelar contrato"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleStatusChange(contract.id, 'assinado')}
                              className="px-2 py-1 text-[10px] text-[#588157] font-semibold bg-[#A3B18A]/20 hover:bg-[#A3B18A]/30 rounded-lg"
                            >
                              Restaurar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Contract Full Details & Commission Split Modal */}
        {selectedContractForDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-[#EAE7E2] space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-[#EAE7E2]">
                <div>
                  <h3 className="font-serif font-bold text-[#344E41] text-lg">
                    Contrato: {selectedContractForDetails.enterpriseName}
                  </h3>
                  <p className="text-xs text-[#3A403A]/70 mt-0.5">
                    Cliente: <strong>{selectedContractForDetails.clientName}</strong> • {selectedContractForDetails.unit}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedContractForDetails(null)}
                  className="p-1 text-[#3A403A]/50 hover:text-[#344E41] rounded-md"
                >
                  ✕
                </button>
              </div>

              {/* General Financials */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-[#FDFCFB] p-3.5 rounded-xl border border-[#EAE7E2] text-xs">
                <div>
                  <span className="text-[#3A403A]/60 block text-[10px] uppercase">Valor VGV</span>
                  <strong className="text-sm font-mono text-[#344E41]">
                    {formatCurrency(selectedContractForDetails.value)}
                  </strong>
                </div>
                <div>
                  <span className="text-[#3A403A]/60 block text-[10px] uppercase">Comissão Total ({selectedContractForDetails.commissionPercent}%)</span>
                  <strong className="text-sm font-mono text-emerald-800">
                    {formatCurrency(selectedContractForDetails.totalCommissionValue)}
                  </strong>
                </div>
                <div>
                  <span className="text-[#3A403A]/60 block text-[10px] uppercase">Data Fechamento</span>
                  <span className="font-medium text-[#344E41]">
                    {formatDatePtBR(selectedContractForDetails.closedAt)}
                  </span>
                </div>
              </div>

              {/* Status Selector */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-700">Status Atual do Contrato:</span>
                <select
                  value={selectedContractForDetails.status}
                  onChange={e => handleStatusChange(selectedContractForDetails.id, e.target.value as any)}
                  className="text-xs font-bold p-1.5 bg-white border border-slate-300 rounded-lg text-slate-800"
                >
                  <option value="analise">Em Análise Jurídica</option>
                  <option value="assinado">Assinado pelas Partes</option>
                  <option value="concluido">Concluído & Liquidado</option>
                  <option value="cancelado">Distrato / Cancelado</option>
                </select>
              </div>

              {/* Commission Splits Breakdown */}
              <div className="space-y-2 border border-[#EAE7E2] rounded-xl p-4 bg-[#F4F1EA]/60">
                <span className="text-xs font-bold uppercase tracking-wider text-[#344E41] flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-emerald-700" />
                  Divisão de Comissões & Repasses
                </span>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="bg-white p-2.5 rounded-lg border border-[#EAE7E2]">
                    <span className="text-slate-500 text-[10px] block">Corretor ({selectedContractForDetails.brokerName})</span>
                    <strong className="font-mono text-emerald-800">
                      {formatCurrency(selectedContractForDetails.brokerCommissionValue)}
                    </strong>
                    {selectedContractForDetails.splitBonus?.broker ? (
                      <span className="text-[10px] text-amber-600 block">+ Bônus: {formatCurrency(selectedContractForDetails.splitBonus.broker)}</span>
                    ) : null}
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-[#EAE7E2]">
                    <span className="text-slate-500 text-[10px] block">Imobiliária ({selectedContractForDetails.splitPercents?.agency || 35}%)</span>
                    <strong className="font-mono text-slate-800">
                      {formatCurrency((selectedContractForDetails.totalCommissionValue * (selectedContractForDetails.splitPercents?.agency || 35)) / 100)}
                    </strong>
                  </div>

                  {selectedContractForDetails.splitPercents?.manager ? (
                    <div className="bg-white p-2.5 rounded-lg border border-[#EAE7E2]">
                      <span className="text-slate-500 text-[10px] block">Gerência ({selectedContractForDetails.splitPercents.manager}%)</span>
                      <strong className="font-mono text-slate-800">
                        {formatCurrency((selectedContractForDetails.totalCommissionValue * selectedContractForDetails.splitPercents.manager) / 100)}
                      </strong>
                    </div>
                  ) : null}

                  {selectedContractForDetails.splitPercents?.finder ? (
                    <div className="bg-white p-2.5 rounded-lg border border-[#EAE7E2]">
                      <span className="text-slate-500 text-[10px] block">Captador ({selectedContractForDetails.splitPercents.finder}%)</span>
                      <strong className="font-mono text-slate-800">
                        {formatCurrency((selectedContractForDetails.totalCommissionValue * selectedContractForDetails.splitPercents.finder) / 100)}
                      </strong>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Attachments Section */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700">Anexos & Documentos do Contrato:</span>
                {selectedContractForDetails.attachments?.map((att, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-[#EAE7E2] bg-[#FDFCFB]"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#588157]" />
                      <div>
                        <p className="text-xs font-semibold text-[#344E41]">{att.name}</p>
                        <p className="text-[10px] text-slate-400">{att.size} • {att.date}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => alert(`Baixando cópia oficial de: ${att.name}`)}
                      className="p-1.5 text-emerald-800 hover:bg-emerald-50 rounded-lg transition"
                      title="Download PDF"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-[#EAE7E2] flex justify-end">
                <button
                  onClick={() => setSelectedContractForDetails(null)}
                  className="px-5 py-2 bg-[#344E41] text-white rounded-xl text-xs font-semibold hover:bg-[#283d33] transition"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
