import React, { useState, useEffect } from 'react';
import {
  X,
  Handshake,
  User,
  DollarSign,
  Building2,
  Calendar,
  FileText,
  Percent,
  CheckCircle,
  HelpCircle,
  Gift,
  Users
} from 'lucide-react';
import { useCrm } from '../context/CrmContext';
import { formatCurrency } from '../utils/formatters';
import { CommissionSplitPercents, CommissionSplitBonus } from '../types';
import { useEscapeToClose } from '../hooks/useEscapeToClose';

export const RegisterSaleModal: React.FC = () => {
  const {
    isSaleModalOpen,
    setIsSaleModalOpen,
    saleModalLead,
    visibleLeads,
    users,
    currentUser,
    hasPermission,
    registerSale
  } = useCrm();

  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [enterpriseName, setEnterpriseName] = useState('');
  const [unit, setUnit] = useState('');
  const [value, setValue] = useState<string>('');
  const [closedAt, setClosedAt] = useState<string>(new Date().toISOString().slice(0, 10));
  const [firstDueDate, setFirstDueDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [commissionPercent, setCommissionPercent] = useState<string>('5.0');
  const [installments, setInstallments] = useState<number>(3);
  const [assignedBrokerId, setAssignedBrokerId] = useState(currentUser.id);
  const [isCompletedDirectly, setIsCompletedDirectly] = useState(false);
  const [showAdvancedSplits, setShowAdvancedSplits] = useState(false);
  const [notes, setNotes] = useState('');

  // Split percentages
  const [splits, setSplits] = useState<CommissionSplitPercents>({
    broker: 50,
    agency: 35,
    manager: 10,
    finder: 5
  });

  // Bonuses
  const [bonuses, setBonuses] = useState<CommissionSplitBonus>({
    broker: 0,
    manager: 0
  });

  const canAssignAnyBroker = hasPermission('canManageTeam') || currentUser.role === 'admin';

  useEffect(() => {
    if (saleModalLead) {
      setSelectedLeadId(saleModalLead.id);
      setPropertyFromLead(saleModalLead);
      if (saleModalLead.brokerId) {
        setAssignedBrokerId(saleModalLead.brokerId);
      }
    } else if (visibleLeads.length > 0) {
      setSelectedLeadId(visibleLeads[0].id);
      setPropertyFromLead(visibleLeads[0]);
    }
  }, [saleModalLead, visibleLeads, isSaleModalOpen]);

  const setPropertyFromLead = (lead: any) => {
    if (!lead) return;
    setEnterpriseName(lead.propertyInterest || '');
    if (lead.estimatedValue) {
      setValue(lead.estimatedValue.toString());
    }
    if (lead.brokerId) {
      setAssignedBrokerId(lead.brokerId);
    }
  };

  const handleLeadChange = (leadId: string) => {
    setSelectedLeadId(leadId);
    const found = visibleLeads.find(l => l.id === leadId);
    if (found) {
      setPropertyFromLead(found);
    }
  };

  useEscapeToClose(() => setIsSaleModalOpen(false), isSaleModalOpen);

  if (!isSaleModalOpen) return null;

  const numValue = parseFloat(value) || 0;
  const numPercent = parseFloat(commissionPercent) || 0;
  const totalAgencyCommission = (numValue * numPercent) / 100;

  // Split Values Calculated
  const brokerAmount = (totalAgencyCommission * (splits.broker || 0)) / 100 + (bonuses.broker || 0);
  const agencyAmount = (totalAgencyCommission * (splits.agency || 0)) / 100;
  const managerAmount = (totalAgencyCommission * (splits.manager || 0)) / 100 + (bonuses.manager || 0);
  const finderAmount = (totalAgencyCommission * (splits.finder || 0)) / 100;

  const perInstallmentBroker = installments > 0 ? brokerAmount / installments : 0;

  const totalSplitPercent = (splits.broker || 0) + (splits.agency || 0) + (splits.manager || 0) + (splits.finder || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!enterpriseName || numValue <= 0) return;

    const lead = visibleLeads.find(l => l.id === selectedLeadId);
    const clientName = lead ? lead.name : 'Cliente Avulso';
    const finalBrokerId = canAssignAnyBroker ? assignedBrokerId : currentUser.id;

    registerSale({
      leadId: selectedLeadId || undefined,
      brokerId: finalBrokerId,
      clientName,
      enterpriseName,
      unit: unit || 'Unidade Principal',
      value: numValue,
      commissionPercent: numPercent,
      brokerCommissionPercent: splits.broker,
      splitPercents: splits,
      splitBonus: bonuses,
      closedAt,
      firstDueDate,
      installmentsCount: installments,
      isCompletedDirectly,
      notes: notes || undefined
    });

    setIsSaleModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200 bg-gradient-to-r from-emerald-900 via-slate-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center font-bold">
              <Handshake className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-white">
                Registrar Venda & Gestão de Contrato
              </h3>
              <p className="text-xs text-slate-300">
                Oficialize o fechamento imobiliário e configure a grade de comissionamento.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsSaleModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {/* Broker Assignment Selector */}
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-700" />
              <span className="text-xs font-semibold text-emerald-950">Corretor Titular da Venda:</span>
            </div>
            {canAssignAnyBroker ? (
              <select
                value={assignedBrokerId}
                onChange={e => setAssignedBrokerId(e.target.value)}
                className="text-xs p-1.5 bg-white border border-emerald-300 rounded-lg text-emerald-950 font-medium focus:outline-none focus:border-emerald-600"
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role === 'admin' ? 'Admin / Diretor' : u.role === 'gerente' ? 'Gerente' : 'Corretor'})
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-md">
                {currentUser.name} (Você)
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Cliente / Lead Vinculado
              </label>
              <select
                value={selectedLeadId}
                onChange={e => handleLeadChange(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-emerald-600"
              >
                <option value="">Cliente Avulso (Sem lead)</option>
                {visibleLeads.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.propertyInterest || 'Geral'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Empreendimento / Imóvel *
              </label>
              <input
                required
                type="text"
                value={enterpriseName}
                onChange={e => setEnterpriseName(e.target.value)}
                placeholder="Ex.: Edifício Villa Magna"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Unidade / Torre
              </label>
              <input
                type="text"
                value={unit}
                onChange={e => setUnit(e.target.value)}
                placeholder="Ex.: Torre 1 - Apto 182"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Valor Total da Venda (VGV) *
              </label>
              <input
                required
                type="number"
                value={value}
                onChange={e => setValue(e.target.value)}
                placeholder="Ex.: 1500000"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono font-bold focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Data do Fechamento
              </label>
              <input
                type="date"
                value={closedAt}
                onChange={e => setClosedAt(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                1º Vencimento de Comissão
              </label>
              <input
                type="date"
                value={firstDueDate}
                onChange={e => setFirstDueDate(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                % Comissão Geral da Transação
              </label>
              <input
                required
                type="number"
                step="0.1"
                value={commissionPercent}
                onChange={e => setCommissionPercent(e.target.value)}
                placeholder="Ex: 5.0"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Número de Parcelas
              </label>
              <select
                value={installments}
                onChange={e => setInstallments(parseInt(e.target.value, 10))}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-emerald-600"
              >
                <option value={1}>À vista (1x parcela única)</option>
                <option value={2}>2 parcelas mensais</option>
                <option value={3}>3 parcelas mensais</option>
                <option value={4}>4 parcelas mensais</option>
                <option value={5}>5 parcelas mensais</option>
                <option value={6}>6 parcelas mensais</option>
              </select>
            </div>
          </div>

          {/* Direct completion checkbox */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2">
            <input
              type="checkbox"
              id="isDirect"
              checked={isCompletedDirectly}
              onChange={e => setIsCompletedDirectly(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
            />
            <label htmlFor="isDirect" className="text-xs text-slate-700 cursor-pointer font-medium">
              Venda já liquidada / Comissão 100% recebida (marca contrato como <strong>Concluído</strong> e parcelas como <strong>Pagas</strong>)
            </label>
          </div>

          {/* Advanced Commission Split Toggle */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAdvancedSplits(!showAdvancedSplits)}
              className="w-full px-4 py-2.5 bg-slate-100 hover:bg-slate-200/70 text-slate-800 flex items-center justify-between text-xs font-bold transition"
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>Divisão de Comissões & Bônus de Meta</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-normal">
                  Soma: {totalSplitPercent}%
                </span>
              </div>
              <span className="text-emerald-700 text-xs">{showAdvancedSplits ? 'Ocultar ▲' : 'Personalizar ▼'}</span>
            </button>

            {showAdvancedSplits && (
              <div className="p-4 bg-slate-50 space-y-3 border-t border-slate-200">
                <p className="text-[11px] text-slate-500">
                  Defina o percentual de repasse para cada interveniente da venda.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Corretor Vendedor (%)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={splits.broker}
                      onChange={e => setSplits({ ...splits, broker: parseFloat(e.target.value) || 0 })}
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg text-slate-800 font-bold focus:border-emerald-600 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-500">{formatCurrency((totalAgencyCommission * (splits.broker || 0)) / 100)}</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Imobiliária (%)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={splits.agency}
                      onChange={e => setSplits({ ...splits, agency: parseFloat(e.target.value) || 0 })}
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg text-slate-800 font-bold focus:border-emerald-600 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-500">{formatCurrency((totalAgencyCommission * (splits.agency || 0)) / 100)}</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Gerente (%)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={splits.manager}
                      onChange={e => setSplits({ ...splits, manager: parseFloat(e.target.value) || 0 })}
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg text-slate-800 font-bold focus:border-emerald-600 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-500">{formatCurrency((totalAgencyCommission * (splits.manager || 0)) / 100)}</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Captador / Parceria (%)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={splits.finder}
                      onChange={e => setSplits({ ...splits, finder: parseFloat(e.target.value) || 0 })}
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg text-slate-800 font-bold focus:border-emerald-600 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-500">{formatCurrency((totalAgencyCommission * (splits.finder || 0)) / 100)}</span>
                  </div>
                </div>

                {/* Optional Bonus Row */}
                <div className="pt-2 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                      <Gift className="w-3.5 h-3.5 text-amber-500" />
                      Bônus Extra Corretor (R$)
                    </label>
                    <input
                      type="number"
                      value={bonuses.broker || ''}
                      onChange={e => setBonuses({ ...bonuses, broker: parseFloat(e.target.value) || 0 })}
                      placeholder="0,00"
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:border-emerald-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                      <Gift className="w-3.5 h-3.5 text-amber-500" />
                      Bônus Extra Gerente (R$)
                    </label>
                    <input
                      type="number"
                      value={bonuses.manager || ''}
                      onChange={e => setBonuses({ ...bonuses, manager: parseFloat(e.target.value) || 0 })}
                      placeholder="0,00"
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Observações do Contrato / Minuta
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ex: Financiamento aprovado Itaú, 30% ato + 70% saldo..."
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-emerald-600"
            />
          </div>

          {/* Financial Calculation Box */}
          <div className="p-4 bg-gradient-to-br from-slate-900 to-emerald-950 text-white rounded-xl space-y-2.5 shadow-lg">
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
              Demonstrativo Financeiro da Transação
            </span>
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-300">Comissão Bruta ({numPercent}%):</span>
              <span className="font-mono font-bold text-white">
                {formatCurrency(totalAgencyCommission)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300">Repasse Corretor ({splits.broker}% + Bônus):</span>
              <span className="font-mono font-bold text-emerald-400">
                {formatCurrency(brokerAmount)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs border-t border-slate-700/60 pt-2">
              <span className="text-slate-300">Valor de Cada Parcela ({installments}x):</span>
              <span className="font-mono font-bold text-white">
                {formatCurrency(perInstallmentBroker)} / mês
              </span>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsSaleModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs rounded-xl font-medium transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded-xl font-bold shadow-lg shadow-emerald-900/20 flex items-center gap-1.5 transition"
            >
              <Handshake className="w-4 h-4 text-emerald-200" />
              <span>Concluir Venda & Gerar Contrato</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
