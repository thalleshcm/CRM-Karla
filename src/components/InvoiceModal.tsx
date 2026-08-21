import React, { useState } from 'react';
import { X, Receipt, CheckCircle2, DollarSign, Building2, User, FileText, Send } from 'lucide-react';
import { Lead } from '../types';
import { formatCurrency, formatDatePtBR } from '../utils/formatters';
import { useCrm } from '../context/CrmContext';

interface InvoiceModalProps {
  lead: Lead;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ lead, onClose }) => {
  const { settings, currentUser } = useCrm();

  const contract = lead.contractDetails || {};
  const defaultSaleValue = contract.saleValue || lead.proposal?.proposalValue || lead.estimatedValue || 0;
  const defaultCommPercent = contract.commissionPercent || 3.5;
  const defaultCommValue = contract.totalCommissionValue || (defaultSaleValue * (defaultCommPercent / 100));

  const [serviceDescription, setServiceDescription] = useState(
    `Intermediação imobiliária referente à venda da unidade ${contract.unit || lead.proposal?.unit || '—'} do empreendimento ${contract.enterpriseName || lead.proposal?.enterprise || lead.propertyInterest}.`
  );
  const [invoiceValue, setInvoiceValue] = useState<number>(defaultCommValue);
  const [taxPercent, setTaxPercent] = useState<number>(6.0); // Simples Nacional padrão serviços imobiliários
  const [takerCnpjCpf, setTakerCnpjCpf] = useState(lead.mainBuyer?.cpf || lead.clientData?.cpf || '00.000.000/0001-00');
  const [takerName, setTakerName] = useState(lead.proposal?.developer || lead.name);
  const [isEmitted, setIsEmitted] = useState(false);

  const netValue = invoiceValue * (1 - taxPercent / 100);

  const handleEmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEmitted(true);
  };

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl w-full max-w-xl max-h-[92vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-sm">Emissão de Nota Fiscal de Serviço (NFS-e)</h3>
              <p className="text-[11px] text-slate-400">Comissão de corretagem e intermediação imobiliária</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 text-xs space-y-4">
          {isEmitted ? (
            <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm text-emerald-900">Nota Fiscal Emitida com Sucesso!</h4>
              <p className="text-emerald-700 text-xs">
                NFS-e Nº <strong className="font-mono">20260821-{(Math.random() * 9000 + 1000).toFixed(0)}</strong> autorizada pela Prefeitura Municipal.
              </p>
              <div className="p-3 bg-white rounded-xl border border-emerald-200 text-left space-y-1 font-mono text-[11px] text-slate-700">
                <p><strong>Tomador:</strong> {takerName}</p>
                <p><strong>Valor Total da NF:</strong> {formatCurrency(invoiceValue)}</p>
                <p><strong>Retenção de Imposto ({taxPercent}%):</strong> {formatCurrency(invoiceValue * (taxPercent / 100))}</p>
                <p><strong>Valor Líquido:</strong> {formatCurrency(netValue)}</p>
              </div>
              <button
                onClick={onClose}
                className="mt-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-semibold transition"
              >
                Fechar
              </button>
            </div>
          ) : (
            <form onSubmit={handleEmit} className="space-y-4">
              {/* Prestador */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Prestador dos Serviços</span>
                <p className="font-bold text-slate-900">{settings.companyName}</p>
                <p className="text-[11px] text-slate-600">{settings.creci} · {settings.brokerEmail}</p>
              </div>

              {/* Tomador */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                    Tomador do Serviço (Construtora ou Cliente)
                  </label>
                  <input
                    type="text"
                    required
                    value={takerName}
                    onChange={e => setTakerName(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                    CNPJ / CPF do Tomador
                  </label>
                  <input
                    type="text"
                    required
                    value={takerCnpjCpf}
                    onChange={e => setTakerCnpjCpf(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Valores */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                    Valor dos Serviços / Comissão (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={invoiceValue}
                    onChange={e => setInvoiceValue(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-mono text-slate-800 focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                    Alíquota de Impostos (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={taxPercent}
                    onChange={e => setTaxPercent(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-mono text-slate-800 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Discriminacao dos servicos */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                  Discriminação dos Serviços
                </label>
                <textarea
                  rows={3}
                  required
                  value={serviceDescription}
                  onChange={e => setServiceDescription(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-emerald-600"
                />
              </div>

              {/* Resumo */}
              <div className="p-3 bg-slate-900 text-white rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Valor Líquido a Receber</span>
                  <span className="font-mono text-base font-bold text-emerald-400">{formatCurrency(netValue)}</span>
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow transition flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Transmitir NFS-e</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
