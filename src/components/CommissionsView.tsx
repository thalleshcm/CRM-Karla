import React, { useState } from 'react';
import {
  Wallet,
  FileSpreadsheet,
  Building2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  Filter,
  User
} from 'lucide-react';
import { useCrm } from '../context/CrmContext';
import { Header } from './Header';
import { Commission } from '../types';
import { formatCurrency, formatDatePtBR } from '../utils/formatters';

export const CommissionsView: React.FC = () => {
  const { visibleCommissions, markCommissionPaid, setActiveView, hasPermission } = useCrm();
  const [filterTab, setFilterTab] = useState<'todas' | 'a_receber' | 'atrasadas' | 'recebidas'>('todas');

  const canViewAll = hasPermission('canViewAllCommissions');
  const now = new Date();

  // Metrics from visibleCommissions
  const currentMonthPrefix = now.toISOString().slice(0, 7); // "YYYY-MM"

  const aReceberEsteMes = visibleCommissions
    .filter(c => c.status === 'a_receber' && c.dueDate.startsWith(currentMonthPrefix))
    .reduce((sum, c) => sum + c.amount, 0);

  const recebidoEsteMes = visibleCommissions
    .filter(c => c.status === 'recebido' && (c.paymentDate?.startsWith(currentMonthPrefix) || c.dueDate.startsWith(currentMonthPrefix)))
    .reduce((sum, c) => sum + c.amount, 0);

  const atrasadasTotal = visibleCommissions
    .filter(c => c.status === 'atrasado' || (c.status === 'a_receber' && new Date(c.dueDate) < now))
    .reduce((sum, c) => sum + c.amount, 0);

  const pendenteTotal = visibleCommissions
    .filter(c => c.status === 'a_receber' || c.status === 'atrasado')
    .reduce((sum, sumC) => sum + sumC.amount, 0);

  // Filtered List
  const filteredCommissions = visibleCommissions.filter(c => {
    if (filterTab === 'todas') return true;
    if (filterTab === 'a_receber') return c.status === 'a_receber';
    if (filterTab === 'atrasadas') return c.status === 'atrasado' || (c.status === 'a_receber' && new Date(c.dueDate) < now);
    if (filterTab === 'recebidas') return c.status === 'recebido';
    return true;
  });

  const exportToExcel = () => {
    // Generate CSV content
    const headers = ['Empreendimento', 'Cliente', 'Corretor', 'Parcela', 'Vencimento', 'Pagamento', 'Valor (R$)', 'Status'];
    const rows = visibleCommissions.map(c => [
      `"${c.enterpriseName}"`,
      `"${c.clientName}"`,
      `"${c.brokerName || 'Corretor'}"`,
      `"Parcela ${c.installmentNumber}/${c.totalInstallments}"`,
      c.dueDate,
      c.paymentDate || '-',
      c.amount.toFixed(2),
      c.status
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Comissoes_AURUM_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 min-h-screen bg-[#FDFCFB] flex flex-col">
      <Header
        title="Controle de Comissões"
        subtitle="Comissões faturadas, a receber e recebidas."
        actionButton={
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setActiveView('funnels')}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#3A403A] bg-white hover:bg-[#F1EFEC] rounded-xl border border-[#EAE7E2] shadow-2xs transition-all"
            >
              <Building2 className="w-3.5 h-3.5 text-[#588157]" />
              <span>Abrir imóveis</span>
            </button>

            <button
              onClick={exportToExcel}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#344E41] bg-[#A3B18A]/20 hover:bg-[#A3B18A]/35 rounded-xl border border-[#A3B18A]/40 shadow-2xs transition-all"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#588157]" />
              <span>Exportar Excel</span>
            </button>
          </div>
        }
      />

      <main className="p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* 4 Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: A RECEBER ESTE MÊS */}
          <div className="bg-white rounded-2xl p-6 border border-[#EAE7E2] shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-[#3A403A]/70">
                A RECEBER ESTE MÊS
              </span>
              <Wallet className="w-4 h-4 text-[#588157]" />
            </div>
            <p className="font-serif-title text-2xl lg:text-3xl font-bold text-[#344E41] mt-3">
              {formatCurrency(aReceberEsteMes)}
            </p>
          </div>

          {/* Card 2: RECEBIDO ESTE MÊS */}
          <div className="bg-white rounded-2xl p-6 border border-[#EAE7E2] shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-[#588157]">
                RECEBIDO ESTE MÊS
              </span>
              <Wallet className="w-4 h-4 text-[#588157]" />
            </div>
            <p className="font-serif-title text-2xl lg:text-3xl font-bold text-[#588157] mt-3">
              {formatCurrency(recebidoEsteMes)}
            </p>
          </div>

          {/* Card 3: ATRASADO */}
          <div className="bg-white rounded-2xl p-6 border border-[#EAE7E2] shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-rose-700">
                ATRASADO
              </span>
              <Wallet className="w-4 h-4 text-rose-600" />
            </div>
            <p className="font-serif-title text-2xl lg:text-3xl font-bold text-rose-700 mt-3">
              {formatCurrency(atrasadasTotal)}
            </p>
          </div>

          {/* Card 4: PENDENTE TOTAL */}
          <div className="bg-white rounded-2xl p-6 border border-[#EAE7E2] shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-[#3A403A]/70">
                PENDENTE TOTAL
              </span>
              <Wallet className="w-4 h-4 text-[#3A403A]/50" />
            </div>
            <p className="font-serif-title text-2xl lg:text-3xl font-bold text-[#344E41] mt-3">
              {formatCurrency(pendenteTotal)}
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-[#F1EFEC] p-1 rounded-xl border border-[#EAE7E2] w-fit">
          <button
            onClick={() => setFilterTab('todas')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              filterTab === 'todas'
                ? 'bg-white text-[#344E41] shadow-2xs'
                : 'text-[#3A403A]/70 hover:text-[#344E41]'
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setFilterTab('a_receber')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              filterTab === 'a_receber'
                ? 'bg-white text-[#344E41] shadow-2xs'
                : 'text-[#3A403A]/70 hover:text-[#344E41]'
            }`}
          >
            A receber
          </button>
          <button
            onClick={() => setFilterTab('atrasadas')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              filterTab === 'atrasadas'
                ? 'bg-white text-[#344E41] shadow-2xs'
                : 'text-[#3A403A]/70 hover:text-[#344E41]'
            }`}
          >
            Atrasadas
          </button>
          <button
            onClick={() => setFilterTab('recebidas')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              filterTab === 'recebidas'
                ? 'bg-white text-[#344E41] shadow-2xs'
                : 'text-[#3A403A]/70 hover:text-[#344E41]'
            }`}
          >
            Recebidas
          </button>
        </div>

        {/* Commissions Table */}
        <div className="bg-white rounded-2xl border border-[#EAE7E2] shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F4F1EA] border-b border-[#EAE7E2] text-[#344E41] font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Empreendimento</th>
                  <th className="py-3.5 px-4">Cliente</th>
                  {canViewAll && <th className="py-3.5 px-4">Corretor</th>}
                  <th className="py-3.5 px-4">Vencimento</th>
                  <th className="py-3.5 px-4">Parcela</th>
                  <th className="py-3.5 px-4">Valor</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE7E2] text-[#3A403A]">
                {filteredCommissions.length === 0 ? (
                  <tr>
                    <td colSpan={canViewAll ? 8 : 7} className="py-16 text-center text-xs text-[#3A403A]/50">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <span>Nenhuma parcela de comissão encontrada.</span>
                        <button
                          onClick={() => setActiveView('funnels')}
                          className="px-3.5 py-1.5 bg-[#F1EFEC] hover:bg-[#EAE7E2] text-[#344E41] font-semibold rounded-xl text-xs border border-[#EAE7E2]"
                        >
                          Ir para o Funil
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredCommissions.map(comm => (
                    <tr key={comm.id} className="hover:bg-[#FDFCFB] transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-[#344E41]">
                        {comm.enterpriseName}
                      </td>
                      <td className="py-3.5 px-4">{comm.clientName}</td>
                      {canViewAll && (
                        <td className="py-3.5 px-4">
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-[#588157] bg-[#588157]/10 px-2 py-0.5 rounded w-fit">
                            <User className="w-2.5 h-2.5" />
                            {comm.brokerName || 'Corretor'}
                          </span>
                        </td>
                      )}
                      <td className="py-3.5 px-4 text-[#3A403A]/70">
                        {formatDatePtBR(comm.dueDate)}
                      </td>
                      <td className="py-3.5 px-4 text-[#3A403A]/70">
                        Parcela {comm.installmentNumber}/{comm.totalInstallments}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-[#344E41]">
                        {formatCurrency(comm.amount)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            comm.status === 'recebido'
                              ? 'bg-[#A3B18A]/20 text-[#344E41] border border-[#A3B18A]/40'
                              : comm.status === 'atrasado'
                              ? 'bg-rose-50 text-rose-800 border border-rose-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {comm.status === 'recebido'
                            ? 'RECEBIDO'
                            : comm.status === 'atrasado'
                            ? 'ATRASADO'
                            : 'A RECEBER'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {comm.status !== 'recebido' ? (
                          <button
                            onClick={() => markCommissionPaid(comm.id)}
                            className="px-3 py-1 text-[11px] font-semibold text-[#344E41] bg-[#A3B18A]/20 hover:bg-[#A3B18A]/35 border border-[#A3B18A]/40 rounded-lg transition-colors shadow-2xs"
                          >
                            Marcar como pago
                          </button>
                        ) : (
                          <span className="text-[11px] text-[#3A403A]/60 font-medium">
                            Pago em {formatDatePtBR(comm.paymentDate)}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};
