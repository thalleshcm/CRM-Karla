import React from 'react';
import { X, Download, Printer, ShieldCheck, FileCheck, Building2, User, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { Lead } from '../types';
import { formatCurrency, formatPhone, formatDatePtBR } from '../utils/formatters';
import { useCrm } from '../context/CrmContext';

interface ContractDossierModalProps {
  lead: Lead;
  onClose: () => void;
}

export const ContractDossierModal: React.FC<ContractDossierModalProps> = ({ lead, onClose }) => {
  const { settings, currentUser } = useCrm();

  const proposal = lead.proposal || {};
  const mainBuyer = lead.mainBuyer || {};
  const spouse = lead.spouseBuyer || {};
  const additionalBuyers = lead.additionalBuyers || [];
  const clientData = lead.clientData;
  const docs = lead.documentsList || [];
  const clientDocs = clientData?.documents || [];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl w-full max-w-4xl max-h-[92vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-sm">Dossiê Completo de Contrato & Fechamento</h3>
              <p className="text-[11px] text-slate-400">Compilado de cadastro, qualificação civil, proposta e documentos</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / Exportar Dossiê</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Dossier Body */}
        <div className="p-8 overflow-y-auto flex-1 bg-white text-slate-800 space-y-6">
          {/* Header Cover */}
          <div className="border-b-2 border-slate-900 pb-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold tracking-widest text-emerald-700 uppercase">
                {settings.companyName} · Dossiê Jurídico & Imobiliário
              </span>
              <h2 className="font-serif text-2xl font-bold text-slate-900 mt-1">
                Dossiê do Cliente: {lead.name}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Empreendimento: {proposal.enterprise || lead.propertyInterest} · Unidade {proposal.unit || 'A definir'}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-3 py-1 rounded-md border border-slate-200">
                Data: {new Date().toLocaleDateString('pt-BR')}
              </span>
            </div>
          </div>

          {/* Section 1: Qualificação do Comprador Principal */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-1 border-b border-slate-200 flex items-center gap-1.5">
              <User className="w-4 h-4 text-emerald-700" />
              1. Comprador Principal
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Nome Completo</span>
                <strong className="text-slate-900">{lead.name}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold">CPF</span>
                <span className="text-slate-800 font-medium">{mainBuyer.cpf || clientData?.cpf || 'Não preenchido'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold">RG</span>
                <span className="text-slate-800">{mainBuyer.rg || clientData?.rg || 'Não preenchido'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Estado Civil</span>
                <span className="text-slate-800">{mainBuyer.maritalStatus || clientData?.maritalStatus || 'Não preenchido'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Profissão</span>
                <span className="text-slate-800">{mainBuyer.profession || clientData?.profession || 'Não preenchido'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Naturalidade</span>
                <span className="text-slate-800">{mainBuyer.birthPlace || 'Não preenchido'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Telefone</span>
                <span className="text-slate-800">{formatPhone(lead.phone)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold">E-mail</span>
                <span className="text-slate-800">{lead.email || 'Não informado'}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Cônjuge / 2º Comprador */}
          {spouse.fullName && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-1 border-b border-slate-200 flex items-center gap-1.5">
                <User className="w-4 h-4 text-emerald-700" />
                2. Cônjuge / 2º Comprador
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Nome Completo</span>
                  <strong className="text-slate-900">{spouse.fullName}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">CPF</span>
                  <span className="text-slate-800 font-medium">{spouse.cpf || '—'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">RG</span>
                  <span className="text-slate-800">{spouse.rg || '—'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Data de Nascimento</span>
                  <span className="text-slate-800">{spouse.birthDate ? formatDatePtBR(spouse.birthDate) : '—'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Profissão</span>
                  <span className="text-slate-800">{spouse.profession || '—'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Regime de Bens</span>
                  <span className="text-slate-800 font-medium">{spouse.maritalRegime || '—'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Data do Casamento</span>
                  <span className="text-slate-800">{spouse.marriageDate ? formatDatePtBR(spouse.marriageDate) : '—'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Section 3: Compradores Adicionais */}
          {additionalBuyers.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-1 border-b border-slate-200">
                3. Compradores Adicionais ({additionalBuyers.length})
              </h3>
              <div className="space-y-2">
                {additionalBuyers.map((b, idx) => (
                  <div key={b.id || idx} className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Comprador #{idx + 3}</span>
                      <strong className="text-slate-900">{b.fullName}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">CPF</span>
                      <span className="text-slate-800">{b.cpf || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Profissão</span>
                      <span className="text-slate-800">{b.profession || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Telefone</span>
                      <span className="text-slate-800">{b.phone || '—'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 4: Checklist de Documentos */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-1 border-b border-slate-200 flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-emerald-700" />
              Checklist & Documentos Anexados
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold text-slate-900">RG / CNH do Comprador</span>
                </div>
                <span className="text-[10px] font-bold uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">Conferido</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold text-slate-900">Comprovante de Endereço</span>
                </div>
                <span className="text-[10px] font-bold uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">Conferido</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold text-slate-900">Certidão de Estado Civil</span>
                </div>
                <span className="text-[10px] font-bold uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">Conferido</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold text-slate-900">Declaração de Renda / IRPF</span>
                </div>
                <span className="text-[10px] font-bold uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">Anexado</span>
              </div>
            </div>
          </div>

          {/* Section 5: Resumo do Negócio & Comissão */}
          <div className="p-4 bg-slate-900 text-white rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 uppercase tracking-widest text-[10px] font-bold">Valor da Venda</span>
              <span className="font-mono font-bold text-emerald-400 text-base">{formatCurrency(proposal.proposalValue || lead.estimatedValue)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-800 pt-2">
              <span className="text-slate-400 uppercase tracking-widest text-[10px] font-bold">Corretor Responsável</span>
              <span className="font-bold text-white">{lead.brokerName || currentUser.name}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
