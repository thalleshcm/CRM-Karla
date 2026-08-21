import React from 'react';
import { X, Download, Printer, Share2, Building2, CheckCircle2, FileText, Calendar, DollarSign, User, ShieldCheck } from 'lucide-react';
import { Lead } from '../types';
import { formatCurrency, formatPhone, formatDatePtBR } from '../utils/formatters';
import { useCrm } from '../context/CrmContext';

interface ProposalPdfModalProps {
  lead: Lead;
  onClose: () => void;
}

export const ProposalPdfModal: React.FC<ProposalPdfModalProps> = ({ lead, onClose }) => {
  const { settings, currentUser } = useCrm();

  const proposal = lead.proposal || {};
  const financials = proposal.financials || {};
  const mainBuyer = lead.mainBuyer || {};
  const spouse = lead.spouseBuyer || {};

  const propValue = proposal.proposalValue || lead.estimatedValue || 0;
  const downPayment = financials.downPayment || lead.downPayment || 0;
  const balancePayoff = financials.balancePayoff || 0;
  const monthlyCount = financials.monthlyInstallmentsCount || 0;
  const monthlyVal = financials.monthlyInstallmentValue || 0;
  const totalMonthly = monthlyCount * monthlyVal;

  const annualCount = financials.annualInstallmentsCount || 0;
  const annualVal = financials.annualInstallmentValue || 0;
  const totalAnnual = annualCount * annualVal;

  const totalCalculated = downPayment + totalMonthly + totalAnnual + balancePayoff;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const text = `*PROPOSTA COMERCIAL — ${settings.companyName}*\n\n` +
      `*Cliente:* ${lead.name}\n` +
      `*Empreendimento:* ${proposal.enterprise || lead.propertyInterest}\n` +
      `*Unidade:* ${proposal.unit || 'A definir'} ${proposal.towerBlock ? `· Bloco ${proposal.towerBlock}` : ''}\n` +
      `*Valor Total:* ${formatCurrency(propValue)}\n` +
      `*Entrada:* ${formatCurrency(downPayment)}\n` +
      (monthlyCount > 0 ? `*Parcelas Mensais:* ${monthlyCount}x de ${formatCurrency(monthlyVal)}\n` : '') +
      (annualCount > 0 ? `*Parcelas Anuais / Balões:* ${annualCount}x de ${formatCurrency(annualVal)}\n` : '') +
      (balancePayoff > 0 ? `*Saldo na Chave / Quitação:* ${formatCurrency(balancePayoff)}\n` : '') +
      `\n*Consultor Responsável:* ${lead.brokerName || currentUser.name} (${settings.companyName})`;

    window.open(`https://wa.me/${lead.phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl w-full max-w-3xl max-h-[92vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Controls */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-sm">PDF Proposta Comercial Oficial</h3>
              <p className="text-[11px] text-slate-400">Documento timbrado para apresentação e assinatura</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShareWhatsApp}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Enviar WhatsApp</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / Salvar PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Proposal Document Body */}
        <div className="p-8 overflow-y-auto flex-1 bg-white text-slate-800 space-y-6 print:p-0 print:m-0" id="printable-proposal">
          {/* Header Timbrado */}
          <div className="flex items-start justify-between pb-6 border-b-2 border-slate-900">
            <div>
              <span className="text-[10px] font-bold tracking-widest text-emerald-700 uppercase block">
                Imobiliária & Consultoria
              </span>
              <h1 className="font-serif text-2xl font-bold text-slate-900">
                {settings.companyName}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {settings.creci} · {settings.brokerEmail} · {settings.brokerPhone}
              </p>
            </div>
            <div className="text-right">
              <div className="inline-block px-3 py-1 bg-slate-900 text-white rounded-md text-xs font-bold uppercase tracking-wider">
                Proposta de Compra
              </div>
              <p className="text-xs text-slate-500 mt-1.5">
                Data: {new Date().toLocaleDateString('pt-BR')}
              </p>
              <p className="text-[11px] text-slate-400">
                Validade: 5 dias úteis
              </p>
            </div>
          </div>

          {/* Dados do Proponente */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-1 border-b border-slate-200 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-700" />
              1. Qualificação do Proponente Comprador
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Nome do Comprador</span>
                <span className="font-semibold text-slate-900">{lead.name}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold">CPF</span>
                <span className="font-semibold text-slate-900">{mainBuyer.cpf || lead.clientData?.cpf || 'A preencher'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold">RG</span>
                <span className="font-semibold text-slate-900">{mainBuyer.rg || lead.clientData?.rg || 'A preencher'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Telefone / WhatsApp</span>
                <span className="text-slate-800">{formatPhone(lead.phone)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold">E-mail</span>
                <span className="text-slate-800">{lead.email || 'Não informado'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Estado Civil</span>
                <span className="text-slate-800">{mainBuyer.maritalStatus || lead.clientData?.maritalStatus || 'Não informado'}</span>
              </div>
              {spouse.fullName && (
                <div className="col-span-2 sm:col-span-3 pt-2 mt-1 border-t border-slate-200">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Cônjuge / 2º Comprador</span>
                  <span className="text-slate-800 font-medium">
                    {spouse.fullName} {spouse.cpf ? `· CPF: ${spouse.cpf}` : ''} {spouse.maritalRegime ? `· Regime: ${spouse.maritalRegime}` : ''}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Dados do Imóvel Proposto */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-1 border-b border-slate-200 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-emerald-700" />
              2. Objeto da Proposta (Imóvel & Especificações)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="col-span-2">
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Empreendimento</span>
                <span className="font-bold text-slate-900 text-sm">{proposal.enterprise || lead.propertyInterest}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Construtora / Incorporadora</span>
                <span className="font-semibold text-slate-800">{proposal.developer || 'A informar'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Unidade / Torre</span>
                <span className="font-semibold text-slate-800">{proposal.unit || 'A definir'} {proposal.towerBlock ? `(${proposal.towerBlock})` : ''}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Andar</span>
                <span className="text-slate-800">{proposal.floor || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Metragem Privativa</span>
                <span className="text-slate-800">{proposal.areaM2 ? `${proposal.areaM2} m²` : '—'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Quartos / Suítes</span>
                <span className="text-slate-800">{proposal.bedrooms ? `${proposal.bedrooms} quartos` : '—'} {proposal.suites ? `(${proposal.suites} suíte)` : ''}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Vagas de Garagem</span>
                <span className="text-slate-800">{proposal.parkingSpaces ? `${proposal.parkingSpaces} vagas` : '—'}</span>
              </div>
            </div>
          </div>

          {/* Condições Financeiras & Fluxo */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-1 border-b border-slate-200 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-700" />
              3. Condições Comerciais e Fluxo de Pagamento Proposto
            </h4>
            
            <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wide">Valor Total da Proposta</span>
                <p className="text-xs text-emerald-700">Preço global ajustado para a presente oferta de compra</p>
              </div>
              <span className="font-mono text-xl font-bold text-emerald-900">
                {formatCurrency(propValue)}
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5">Item / Descrição</th>
                    <th className="p-2.5">Qtd / Parcelamento</th>
                    <th className="p-2.5">Vencimento</th>
                    <th className="p-2.5 text-right">Valor Total (R$)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="p-2.5 font-semibold text-slate-800">Entrada / Sinal</td>
                    <td className="p-2.5 text-slate-600">À vista / Negociada</td>
                    <td className="p-2.5 text-slate-600">No ato da assinatura</td>
                    <td className="p-2.5 text-right font-mono font-bold text-slate-900">{formatCurrency(downPayment)}</td>
                  </tr>
                  {monthlyCount > 0 && (
                    <tr>
                      <td className="p-2.5 font-semibold text-slate-800">Parcelas Mensais</td>
                      <td className="p-2.5 text-slate-600">{monthlyCount}x de {formatCurrency(monthlyVal)}</td>
                      <td className="p-2.5 text-slate-600">{financials.firstMonthlyDueDate ? formatDatePtBR(financials.firstMonthlyDueDate) : 'Mensal'}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900">{formatCurrency(totalMonthly)}</td>
                    </tr>
                  )}
                  {annualCount > 0 && (
                    <tr>
                      <td className="p-2.5 font-semibold text-slate-800">Parcelas Anuais / Intermediárias</td>
                      <td className="p-2.5 text-slate-600">{annualCount}x de {formatCurrency(annualVal)}</td>
                      <td className="p-2.5 text-slate-600">{financials.firstAnnualDueDate ? formatDatePtBR(financials.firstAnnualDueDate) : 'Anual'}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900">{formatCurrency(totalAnnual)}</td>
                    </tr>
                  )}
                  {balancePayoff > 0 && (
                    <tr>
                      <td className="p-2.5 font-semibold text-slate-800">Saldo Final / Quitação / Financiamento</td>
                      <td className="p-2.5 text-slate-600">Na entrega das chaves</td>
                      <td className="p-2.5 text-slate-600">{financials.payoffDate ? formatDatePtBR(financials.payoffDate) : 'Chaves'}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900">{formatCurrency(balancePayoff)}</td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-slate-50 font-bold border-t border-slate-300">
                  <tr>
                    <td colSpan={3} className="p-2.5 text-slate-800 uppercase text-[10px]">Soma Geral do Fluxo</td>
                    <td className="p-2.5 text-right font-mono text-slate-900">{formatCurrency(totalCalculated || propValue)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {proposal.details && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <span className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Observações & Condições Especiais:</span>
                <p className="text-slate-700 whitespace-pre-line leading-relaxed">{proposal.details}</p>
              </div>
            )}
          </div>

          {/* Assinaturas */}
          <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs">
            <div className="space-y-2">
              <div className="border-b border-slate-400 h-12"></div>
              <p className="font-bold text-slate-900">{lead.name}</p>
              <p className="text-[10px] text-slate-500 uppercase">Proponente Comprador</p>
            </div>
            <div className="space-y-2">
              <div className="border-b border-slate-400 h-12"></div>
              <p className="font-bold text-slate-900">{lead.brokerName || currentUser.name}</p>
              <p className="text-[10px] text-slate-500 uppercase">Consultor Imobiliário / {settings.companyName}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
