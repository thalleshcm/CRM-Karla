import React, { useState, useEffect } from 'react';
import {
  Search,
  X,
  Calendar,
  FileText,
  Plus,
  ArrowRight,
  Kanban,
  Settings,
  ShieldCheck,
  MessageSquare,
  Zap,
  QrCode,
  Mic,
  ListOrdered
} from 'lucide-react';
import { useCrm } from '../context/CrmContext';
import { ViewType } from '../types';
import { formatCurrency } from '../utils/formatters';

export const CommandPalette: React.FC = () => {
  const {
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    visibleLeads,
    visibleContracts,
    setActiveView,
    setSelectedLead,
    setIsNewLeadModalOpen,
    setIsRoleSwitcherOpen,
    hasModuleAccess,
    openWhatsAppDirectHub
  } = useCrm();

  const [query, setQuery] = useState('');

  useEffect(() => {
    if (isCommandPaletteOpen) {
      setQuery('');
    }
  }, [isCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  const filteredLeads = query
    ? visibleLeads.filter(
        l =>
          l.name.toLowerCase().includes(query.toLowerCase()) ||
          l.phone.includes(query) ||
          l.propertyInterest.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const filteredContracts = query
    ? visibleContracts.filter(
        c =>
          c.clientName.toLowerCase().includes(query.toLowerCase()) ||
          c.enterpriseName.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const handleSelectLead = (lead: any) => {
    setSelectedLead(lead);
    setIsCommandPaletteOpen(false);
  };

  const handleNavigate = (view: ViewType) => {
    setActiveView(view);
    setIsCommandPaletteOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-[#3E4A3D]/40 backdrop-blur-xs p-4 animate-in fade-in duration-100">
      <div
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-[#EAE7E2] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search bar input */}
        <div className="flex items-center px-4 border-b border-[#EAE7E2]">
          <Search className="w-4 h-4 text-[#3A403A]/40 mr-2.5 shrink-0" />
          <input
            autoFocus
            type="text"
            placeholder="Buscar por lead, imóvel, contrato ou comando..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full py-4 text-sm text-[#344E41] placeholder-[#3A403A]/40 bg-transparent focus:outline-hidden"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-[#3A403A]/40 hover:text-[#344E41] rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="ml-2 px-2 py-0.5 bg-[#F1EFEC] border border-[#EAE7E2] text-[10px] font-semibold text-[#3A403A]/60 rounded-md">
            ESC
          </kbd>
        </div>

        {/* Search Results / Fast Shortcuts */}
        <div className="max-h-96 overflow-y-auto p-2">
          {query ? (
            <div className="space-y-4">
              {filteredLeads.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold tracking-widest uppercase text-[#3A403A]/50 px-3 py-1">
                    Leads Encontrados ({filteredLeads.length})
                  </p>
                  <div className="space-y-1 mt-1">
                    {filteredLeads.map(lead => (
                      <button
                        key={lead.id}
                        onClick={() => handleSelectLead(lead)}
                        className="w-full text-left px-3 py-2 hover:bg-[#FDFCFB] rounded-xl flex items-center justify-between transition-colors group"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-[#A3B18A]/20 text-[#588157] flex items-center justify-center font-bold text-xs">
                            {lead.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-[#344E41] group-hover:text-[#588157]">
                              {lead.name}
                            </p>
                            <p className="text-[11px] text-[#3A403A]/60">
                              {lead.propertyInterest} · {formatCurrency(lead.estimatedValue)}
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-[#3A403A]/30 group-hover:text-[#344E41]" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {filteredContracts.length > 0 && hasModuleAccess('contracts') && (
                <div>
                  <p className="text-[10px] font-bold tracking-widest uppercase text-[#3A403A]/50 px-3 py-1">
                    Contratos ({filteredContracts.length})
                  </p>
                  <div className="space-y-1 mt-1">
                    {filteredContracts.map(contract => (
                      <button
                        key={contract.id}
                        onClick={() => {
                          setActiveView('contracts');
                          setIsCommandPaletteOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-[#FDFCFB] rounded-xl flex items-center justify-between transition-colors group"
                      >
                        <div className="flex items-center gap-2.5">
                          <FileText className="w-4 h-4 text-[#588157]" />
                          <div>
                            <p className="text-xs font-semibold text-[#344E41]">
                              {contract.enterpriseName} · {contract.clientName}
                            </p>
                            <p className="text-[11px] text-[#3A403A]/60">
                              {formatCurrency(contract.value)}
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-[#3A403A]/30 group-hover:text-[#344E41]" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {filteredLeads.length === 0 && filteredContracts.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-xs text-[#3A403A]/50">Nenhum resultado para "{query}"</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3 p-1">
              <div>
                <p className="text-[10px] font-bold tracking-widest uppercase text-[#3A403A]/50 px-3 py-1">
                  Atalhos WhatsApp & Conversão
                </p>
                <div className="space-y-0.5 mt-1 mb-3">
                  <button
                    onClick={() => {
                      setIsCommandPaletteOpen(false);
                      openWhatsAppDirectHub('scripts');
                    }}
                    className="w-full text-left px-3 py-2.5 hover:bg-[#FDFCFB] rounded-xl flex items-center gap-2.5 text-xs text-[#344E41] font-semibold"
                  >
                    <MessageSquare className="w-4 h-4 text-[#588157]" />
                    <span>Central de Disparos & Scripts WhatsApp</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsCommandPaletteOpen(false);
                      openWhatsAppDirectHub('queue');
                    }}
                    className="w-full text-left px-3 py-2.5 hover:bg-[#FDFCFB] rounded-xl flex items-center gap-2.5 text-xs text-[#3A403A] hover:text-[#344E41]"
                  >
                    <ListOrdered className="w-4 h-4 text-[#588157]" />
                    <span>Iniciar Fila de Atendimento do Dia</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsCommandPaletteOpen(false);
                      openWhatsAppDirectHub('generator');
                    }}
                    className="w-full text-left px-3 py-2.5 hover:bg-[#FDFCFB] rounded-xl flex items-center gap-2.5 text-xs text-[#3A403A] hover:text-[#344E41]"
                  >
                    <QrCode className="w-4 h-4 text-[#588157]" />
                    <span>Gerador de Link WhatsApp & QR Code</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsCommandPaletteOpen(false);
                      openWhatsAppDirectHub('audio');
                    }}
                    className="w-full text-left px-3 py-2.5 hover:bg-[#FDFCFB] rounded-xl flex items-center gap-2.5 text-xs text-[#3A403A] hover:text-[#344E41]"
                  >
                    <Mic className="w-4 h-4 text-[#588157]" />
                    <span>Roteiros e Estruturas de Áudio (Pitch 30s)</span>
                  </button>
                </div>

                <p className="text-[10px] font-bold tracking-widest uppercase text-[#3A403A]/50 px-3 py-1">
                  Navegação & Perfis
                </p>
                <div className="space-y-0.5 mt-1">
                  <button
                    onClick={() => {
                      setIsCommandPaletteOpen(false);
                      setIsRoleSwitcherOpen(true);
                    }}
                    className="w-full text-left px-3 py-2.5 hover:bg-[#FDFCFB] rounded-xl flex items-center gap-2.5 text-xs text-[#344E41] font-semibold"
                  >
                    <ShieldCheck className="w-4 h-4 text-[#588157]" />
                    <span>Alternar Perfil (Administrador / Corretor)</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsCommandPaletteOpen(false);
                      setIsNewLeadModalOpen(true);
                    }}
                    className="w-full text-left px-3 py-2.5 hover:bg-[#FDFCFB] rounded-xl flex items-center gap-2.5 text-xs text-[#3A403A] hover:text-[#344E41]"
                  >
                    <Plus className="w-4 h-4 text-[#588157]" />
                    <span>Cadastrar Novo Lead</span>
                  </button>

                  {hasModuleAccess('agenda') && (
                    <button
                      onClick={() => handleNavigate('agenda')}
                      className="w-full text-left px-3 py-2.5 hover:bg-[#FDFCFB] rounded-xl flex items-center gap-2.5 text-xs text-[#3A403A] hover:text-[#344E41]"
                    >
                      <Calendar className="w-4 h-4 text-[#588157]" />
                      <span>Ver Agenda e Follow-ups de Hoje</span>
                    </button>
                  )}

                  {hasModuleAccess('funnels') && (
                    <button
                      onClick={() => handleNavigate('funnels')}
                      className="w-full text-left px-3 py-2.5 hover:bg-[#FDFCFB] rounded-xl flex items-center gap-2.5 text-xs text-[#3A403A] hover:text-[#344E41]"
                    >
                      <Kanban className="w-4 h-4 text-[#588157]" />
                      <span>Ir para o Funil de Vendas (Kanban)</span>
                    </button>
                  )}

                  {hasModuleAccess('settings') && (
                    <button
                      onClick={() => handleNavigate('settings')}
                      className="w-full text-left px-3 py-2.5 hover:bg-[#FDFCFB] rounded-xl flex items-center gap-2.5 text-xs text-[#3A403A] hover:text-[#344E41]"
                    >
                      <Settings className="w-4 h-4 text-[#588157]" />
                      <span>Configurações & Matriz de Acesso aos Módulos</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <div
        className="fixed inset-0 -z-10"
        onClick={() => setIsCommandPaletteOpen(false)}
      />
    </div>
  );
};
