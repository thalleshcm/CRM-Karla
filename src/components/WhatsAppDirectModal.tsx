import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  MessageSquare,
  Send,
  Copy,
  Check,
  Zap,
  Building2,
  Phone,
  User,
  ExternalLink,
  Search,
  CheckCircle2,
  Bold,
  Italic,
  Strikethrough,
  Code,
  Link,
  Flame,
  ChevronDown,
  Settings as SettingsIcon,
  Tag
} from 'lucide-react';
import { useCrm } from '../context/CrmContext';
import { Lead, WhatsAppTemplate, WhatsAppScriptCategory } from '../types';
import { getWhatsAppLink, formatCurrency, formatPhone } from '../utils/formatters';
import { STAGES } from '../data/initialData';
import { sendEvolutionMessage, checkEvolutionConnection } from '../services/evolutionApi';

export const WhatsAppDirectModal: React.FC = () => {
  const {
    isWhatsAppModalOpen,
    setIsWhatsAppModalOpen,
    whatsAppModalLead,
    visibleLeads,
    settings,
    currentUser,
    updateLead,
    moveLeadStage,
    generateClientPortalLink,
    triggerConfetti,
    setActiveView
  } = useCrm();

  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [leadSearchQuery, setLeadSearchQuery] = useState<string>('');
  const [isLeadDropdownOpen, setIsLeadDropdownOpen] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<WhatsAppScriptCategory | 'todas'>('todas');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [messageText, setMessageText] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [portalLinkCopied, setPortalLinkCopied] = useState(false);
  const [autoLogHistory, setAutoLogHistory] = useState(true);
  const [autoAdvanceStage, setAutoAdvanceStage] = useState(false);

  // Evolution API Direct Sending State
  const [evolutionSending, setEvolutionSending] = useState(false);
  const [evolutionStatusMsg, setEvolutionStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [evolutionConnected, setEvolutionConnected] = useState<boolean | null>(null);

  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Sync initial lead on modal open
  useEffect(() => {
    if (isWhatsAppModalOpen) {
      if (whatsAppModalLead) {
        setSelectedLeadId(whatsAppModalLead.id);
      } else if (visibleLeads.length > 0 && !selectedLeadId) {
        setSelectedLeadId(visibleLeads[0].id);
      }
      setLeadSearchQuery('');
      setIsLeadDropdownOpen(false);
      setEvolutionStatusMsg(null);
    }
  }, [isWhatsAppModalOpen, whatsAppModalLead, visibleLeads]);

  // Click outside to close lead search dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsLeadDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLead = useMemo(() => {
    return visibleLeads.find(l => l.id === selectedLeadId) || whatsAppModalLead || visibleLeads[0] || null;
  }, [visibleLeads, selectedLeadId, whatsAppModalLead]);

  // Fast searchable leads filter (optimized for 1,000+ leads)
  const filteredSearchLeads = useMemo(() => {
    if (!leadSearchQuery.trim()) {
      return visibleLeads;
    }
    const q = leadSearchQuery.toLowerCase().trim();
    return visibleLeads.filter(l => {
      const matchName = l.name.toLowerCase().includes(q);
      const matchPhone = l.phone ? l.phone.replace(/\D/g, '').includes(q.replace(/\D/g, '')) || l.phone.toLowerCase().includes(q) : false;
      const matchProperty = l.propertyInterest ? l.propertyInterest.toLowerCase().includes(q) : false;
      const matchEmail = l.email ? l.email.toLowerCase().includes(q) : false;
      const matchStage = STAGES.find(s => s.id === l.stageId)?.name.toLowerCase().includes(q) || false;
      return matchName || matchPhone || matchProperty || matchEmail || matchStage;
    });
  }, [visibleLeads, leadSearchQuery]);

  // Check Evolution API connection on modal open
  useEffect(() => {
    if (isWhatsAppModalOpen && settings.evolutionApiUrl && settings.evolutionApiKey) {
      checkEvolutionConnection({
        apiUrl: settings.evolutionApiUrl,
        apiKey: settings.evolutionApiKey,
        instance: settings.evolutionInstance || 'aurum-crm'
      }).then(res => {
        setEvolutionConnected(res.connected);
      }).catch(() => {
        setEvolutionConnected(false);
      });
    } else {
      setEvolutionConnected(false);
    }
  }, [isWhatsAppModalOpen, settings.evolutionApiUrl, settings.evolutionApiKey, settings.evolutionInstance]);

  // Filter templates by category
  const filteredTemplates = useMemo(() => {
    if (selectedCategory === 'todas') {
      return settings.quickTemplates || [];
    }
    return (settings.quickTemplates || []).filter(t => t.category === selectedCategory);
  }, [settings.quickTemplates, selectedCategory]);

  // Format template message with real lead variables
  const formatTemplateMessage = (templateString: string, targetLead: Lead | null): string => {
    if (!targetLead) return templateString;

    const firstName = targetLead.name.split(' ')[0] || targetLead.name;
    const hour = new Date().getHours();
    const saudacao = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
    const corretorNome = targetLead.brokerName || currentUser.name || settings.brokerName || 'Consultor Aurum';
    const portalLink = generateClientPortalLink(targetLead);

    return templateString
      .replace(/{primeiro_nome}/g, firstName)
      .replace(/{nome_lead}/g, targetLead.name)
      .replace(/{imovel}/g, targetLead.propertyInterest || 'Empreendimento Selecionado')
      .replace(/{valor}/g, formatCurrency(targetLead.estimatedValue || 0))
      .replace(/{corretor}/g, corretorNome)
      .replace(/{imobiliaria}/g, settings.companyName || 'Aurum Imóveis')
      .replace(/{saudacao}/g, saudacao)
      .replace(/{link_portal}/g, portalLink);
  };

  const handleSelectTemplate = (tmpl: WhatsAppTemplate) => {
    setSelectedTemplateId(tmpl.id);
    setMessageText(formatTemplateMessage(tmpl.message, currentLead));
  };

  // Prepopulate message on lead switch if template selected or text empty
  useEffect(() => {
    if (currentLead) {
      const templates = settings.quickTemplates || [];
      const template = templates.find(t => t.id === selectedTemplateId) || templates[0];
      if (template && (!messageText || selectedTemplateId)) {
        setSelectedTemplateId(template.id);
        setMessageText(formatTemplateMessage(template.message, currentLead));
      }
    }
  }, [currentLead]);

  const handleSelectLeadFromSearch = (lead: Lead) => {
    setSelectedLeadId(lead.id);
    setIsLeadDropdownOpen(false);
    setLeadSearchQuery('');
    
    // Update message text for newly selected lead if a template is active
    if (selectedTemplateId) {
      const template = (settings.quickTemplates || []).find(t => t.id === selectedTemplateId);
      if (template) {
        setMessageText(formatTemplateMessage(template.message, lead));
      }
    }
  };

  const insertTag = (tag: string) => {
    setMessageText(prev => prev + ' ' + tag);
  };

  const insertFormatting = (prefix: string, suffix: string) => {
    setMessageText(prev => `${prev}${prefix}texto${suffix}`);
  };

  const insertPortalLink = () => {
    if (!currentLead) return;
    const link = generateClientPortalLink(currentLead);
    const linkText = `\n\n📌 *Ficha Cadastral & Envio de Documentos:*\nAcesse o portal exclusivo para enviar fotos de documentos com total segurança:\n🔗 ${link}`;
    setMessageText(prev => prev + linkText);
  };

  // Dispatch via WhatsApp Web Link (wa.me)
  const handleSendWhatsAppWeb = (lead: Lead | null, textToSend: string) => {
    if (!lead || !lead.phone) return;

    const finalLink = getWhatsAppLink(lead.phone, textToSend);

    // 1. Log interaction in lead history
    if (autoLogHistory) {
      const nowFormatted = new Date().toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const historyEntry = {
        id: `h-wa-${Date.now()}`,
        leadId: lead.id,
        type: 'whatsapp' as const,
        description: `Mensagem enviada no WhatsApp: "${textToSend.substring(0, 80)}..."`,
        date: nowFormatted,
        author: currentUser.name
      };

      const updatedHistory = [historyEntry, ...(lead.history || [])];
      updateLead(lead.id, {
        history: updatedHistory,
        lastContactDate: new Date().toISOString().split('T')[0]
      });
    }

    // 2. Auto advance stage if requested
    if (autoAdvanceStage) {
      if (lead.stageId === 'lead_novo') {
        moveLeadStage(lead.id, 'primeiro_contato');
      } else if (lead.stageId === 'primeiro_contato') {
        moveLeadStage(lead.id, 'qualificacao');
      }
    }

    // 3. Open WhatsApp link in new tab
    window.open(finalLink, '_blank', 'noopener,noreferrer');
  };

  // Direct Dispatch via Evolution API
  const handleSendEvolutionDirect = async (lead: Lead | null, textToSend: string) => {
    if (!lead || !lead.phone) return;

    setEvolutionSending(true);
    setEvolutionStatusMsg(null);

    const result = await sendEvolutionMessage(
      {
        apiUrl: settings.evolutionApiUrl || 'https://evolutionapi.thalleshcm.com.br',
        apiKey: settings.evolutionApiKey || '',
        instance: settings.evolutionInstance || 'aurum-crm',
        instanceToken: settings.evolutionInstanceToken || undefined
      },
      lead.phone,
      textToSend
    );

    setEvolutionSending(false);

    if (result.success) {
      setEvolutionStatusMsg({
        type: 'success',
        text: `✅ Mensagem enviada para ${lead.name} com sucesso via Evolution API!`
      });
      triggerConfetti();

      // Log in lead history
      if (autoLogHistory) {
        const historyEntry = {
          id: `h-evo-${Date.now()}`,
          leadId: lead.id,
          type: 'whatsapp' as const,
          description: `Disparo automático Evolution API: "${textToSend.substring(0, 80)}..." (ID: ${result.messageId})`,
          date: new Date().toLocaleString('pt-BR'),
          author: `${currentUser.name} (Evolution API)`
        };

        const updatedHistory = [historyEntry, ...(lead.history || [])];
        updateLead(lead.id, {
          history: updatedHistory,
          lastContactDate: new Date().toISOString().split('T')[0]
        });
      }

      if (autoAdvanceStage && lead.stageId === 'lead_novo') {
        moveLeadStage(lead.id, 'primeiro_contato');
      }
    } else {
      setEvolutionStatusMsg({
        type: 'error',
        text: `❌ Falha no envio Evolution API: ${result.error || result.statusText}`
      });
    }
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyPortalLink = () => {
    if (!currentLead) return;
    const link = generateClientPortalLink(currentLead);
    navigator.clipboard.writeText(link);
    setPortalLinkCopied(true);
    setTimeout(() => setPortalLinkCopied(false), 2000);
  };

  const handleGoToSettings = () => {
    setIsWhatsAppModalOpen(false);
    setActiveView('settings');
  };

  // Keyboard shortcut: close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isWhatsAppModalOpen) {
        setIsWhatsAppModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isWhatsAppModalOpen, setIsWhatsAppModalOpen]);

  if (!isWhatsAppModalOpen) return null;

  return (
    <div
      id="whatsapp-direct-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={() => setIsWhatsAppModalOpen(false)}
    >
      <div
        id="whatsapp-direct-modal-container"
        className="bg-white w-full max-w-5xl rounded-3xl border border-[#EAE7E2] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Clean, Focused Modal Header */}
        <div className="px-6 py-4 border-b border-[#EAE7E2] bg-[#FDFCFB] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800 shadow-2xs shrink-0">
              <MessageSquare className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="font-serif-title font-bold text-lg text-[#344E41]">
                  Central de Disparos WhatsApp
                </h3>
                
                {/* Connection Status Pill */}
                {evolutionConnected === true ? (
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                    Evolution API Online (1-Clique)
                  </span>
                ) : (
                  <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Modo WhatsApp Web (wa.me)
                  </span>
                )}
              </div>
              <p className="text-xs text-[#3A403A]/70">
                Selecione o lead pesquisável, escolha um modelo de alta conversão e envie com 1 clique.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {currentUser.role === 'admin' && (
              <button
                id="btn-wa-settings"
                type="button"
                onClick={handleGoToSettings}
                className="px-3 py-1.5 text-xs text-[#3A403A] hover:text-[#344E41] bg-[#F4F1EA] hover:bg-[#EAE7E2] border border-[#EAE7E2] rounded-xl transition flex items-center gap-1.5 cursor-pointer font-medium"
                title="Configurar servidor Evolution API e templates"
              >
                <SettingsIcon className="w-3.5 h-3.5 text-[#588157]" />
                <span className="hidden sm:inline">Configurar API</span>
              </button>
            )}

            <button
              id="btn-close-wa-modal"
              type="button"
              onClick={() => setIsWhatsAppModalOpen(false)}
              className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              aria-label="Fechar Central WhatsApp"
              title="Fechar (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Content (Clean 2-Column Focus) */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#FAF9F5]/50 space-y-4">
          {/* Status Message Alert */}
          {evolutionStatusMsg && (
            <div
              id="wa-status-feedback-alert"
              className={`p-3.5 rounded-xl border flex items-center justify-between text-xs animate-in fade-in ${
                evolutionStatusMsg.type === 'success'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-rose-50 border-rose-300 text-rose-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{evolutionStatusMsg.text}</span>
              </div>
              <button
                onClick={() => setEvolutionStatusMsg(null)}
                className="text-slate-400 hover:text-slate-700 ml-2 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Searchable Lead Selector & Message Templates */}
            <div className="lg:col-span-5 space-y-4">
              {/* Searchable Lead Card (Scalable for 1000+ leads) */}
              <div className="bg-white p-4 rounded-2xl border border-[#EAE7E2] shadow-2xs space-y-3" ref={dropdownRef}>
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#344E41]">
                    Lead Destinatário ({visibleLeads.length} leads)
                  </label>
                  {currentLead && (
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      Selecionado
                    </span>
                  )}
                </div>

                {/* Search Bar Input with Auto-complete Dropdown */}
                <div className="relative">
                  <div className="relative flex items-center">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                    <input
                      id="lead-search-input"
                      ref={searchInputRef}
                      type="text"
                      value={leadSearchQuery}
                      onChange={e => {
                        setLeadSearchQuery(e.target.value);
                        if (!isLeadDropdownOpen) setIsLeadDropdownOpen(true);
                      }}
                      onFocus={() => setIsLeadDropdownOpen(true)}
                      placeholder="Pesquisar por nome, telefone, imóvel..."
                      className="w-full text-xs pl-9 pr-8 py-2.5 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A] placeholder:text-slate-400 focus:outline-hidden focus:border-[#A3B18A] focus:ring-1 focus:ring-[#A3B18A] transition-all font-medium"
                    />
                    {leadSearchQuery ? (
                      <button
                        type="button"
                        onClick={() => {
                          setLeadSearchQuery('');
                          searchInputRef.current?.focus();
                        }}
                        className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsLeadDropdownOpen(prev => !prev)}
                        className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
                      >
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isLeadDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                    )}
                  </div>

                  {/* Dropdown Results List (Search Results) */}
                  {isLeadDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-[#EAE7E2] rounded-2xl shadow-xl z-30 max-h-60 overflow-y-auto divide-y divide-[#F4F1EA] animate-in fade-in zoom-in-95 duration-100">
                      <div className="p-2 bg-[#F4F1EA]/60 text-[10px] font-semibold text-[#3A403A]/70 flex items-center justify-between sticky top-0 backdrop-blur-xs z-10">
                        <span>{filteredSearchLeads.length} leads encontrados</span>
                        {leadSearchQuery && (
                          <span className="text-emerald-800 font-bold">Filtro: "{leadSearchQuery}"</span>
                        )}
                      </div>

                      {filteredSearchLeads.length > 0 ? (
                        filteredSearchLeads.slice(0, 50).map(lead => {
                          const isSelected = currentLead?.id === lead.id;
                          const stageInfo = STAGES.find(s => s.id === lead.stageId);
                          return (
                            <button
                              key={lead.id}
                              type="button"
                              onClick={() => handleSelectLeadFromSearch(lead)}
                              className={`w-full text-left p-2.5 hover:bg-[#FAF9F5] transition flex items-center justify-between gap-2 cursor-pointer ${
                                isSelected ? 'bg-emerald-50/70' : ''
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-xs font-bold text-[#344E41] truncate">{lead.name}</p>
                                  {lead.temperature === 'quente' && <Flame className="w-3 h-3 text-rose-500 shrink-0" />}
                                </div>
                                <p className="text-[11px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                                  <span>{formatPhone(lead.phone)}</span>
                                  {lead.propertyInterest && (
                                    <>
                                      <span>•</span>
                                      <span className="text-[#3A403A]">{lead.propertyInterest}</span>
                                    </>
                                  )}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="text-[9px] font-semibold uppercase px-2 py-0.5 rounded-md bg-[#F4F1EA] text-[#344E41]">
                                  {stageInfo?.name || lead.stageId}
                                </span>
                              </div>
                            </button>
                          );
                        })
                      ) : (
                        <div className="p-4 text-center text-xs text-slate-500">
                          Nenhum lead encontrado com esse termo.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Active Lead Details Card */}
                {currentLead ? (
                  <div className="p-3 bg-[#F4F1EA]/60 rounded-xl text-xs space-y-2 border border-[#EAE7E2]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <User className="w-3.5 h-3.5 text-[#588157] shrink-0" />
                        <span className="font-bold text-[#344E41] truncate">{currentLead.name}</span>
                      </div>
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 shrink-0">
                        {STAGES.find(s => s.id === currentLead.stageId)?.name || currentLead.stageId}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-[#3A403A]/80 pt-1 border-t border-[#EAE7E2]">
                      <div className="flex items-center gap-1.5 truncate">
                        <Phone className="w-3 h-3 text-[#588157] shrink-0" />
                        <span className="font-mono text-slate-700 font-medium">{formatPhone(currentLead.phone)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 truncate">
                        <Building2 className="w-3 h-3 text-[#588157] shrink-0" />
                        <span className="truncate">{currentLead.propertyInterest || 'Imóvel sob consulta'}</span>
                      </div>
                    </div>

                    <div className="pt-1 flex items-center justify-between border-t border-[#EAE7E2] text-[10px]">
                      <span className="text-slate-500">
                        Valor: <strong className="text-emerald-800">{formatCurrency(currentLead.estimatedValue || 0)}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyPortalLink}
                        className="text-emerald-800 hover:text-emerald-950 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                        title="Copiar link do portal de onboarding e envio de documentos"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{portalLinkCopied ? 'Link Copiado!' : 'Copiar Link Portal'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 rounded-xl text-xs text-amber-800 border border-amber-200">
                    Nenhum lead selecionado. Use a busca acima para encontrar um lead.
                  </div>
                )}
              </div>

              {/* Templates Category Filter & List */}
              <div className="bg-white p-4 rounded-2xl border border-[#EAE7E2] shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#344E41]">
                    Modelos de Mensagem
                  </label>
                  <span className="text-[10px] font-bold text-slate-500">
                    {filteredTemplates.length} modelos
                  </span>
                </div>

                {/* Filter chips */}
                <div className="flex flex-wrap gap-1.5 pb-1">
                  {[
                    { id: 'todas', label: 'Todos' },
                    { id: 'primeiro_contato', label: '1º Contato' },
                    { id: 'coleta_documentos', label: 'Portal Doc' },
                    { id: 'visita', label: 'Visita' },
                    { id: 'simulacao', label: 'Simulação' },
                    { id: 'fechamento', label: 'Fechamento' },
                    { id: 'aniversario', label: 'Aniversário' }
                  ].map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id as any)}
                      className={`text-[10px] px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                        selectedCategory === cat.id
                          ? 'bg-[#344E41] text-white shadow-2xs'
                          : 'bg-[#F4F1EA] text-[#3A403A] hover:bg-[#EAE7E2]'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Templates Scrollable List */}
                <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                  {filteredTemplates.map(tmpl => {
                    const isSelected = selectedTemplateId === tmpl.id;
                    return (
                      <button
                        key={tmpl.id}
                        type="button"
                        onClick={() => handleSelectTemplate(tmpl)}
                        className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50/70 border-emerald-400 ring-1 ring-emerald-300'
                            : 'bg-[#FDFCFB] border-[#EAE7E2] hover:border-[#A3B18A]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs text-[#344E41]">{tmpl.title}</span>
                          <span className="text-[9px] uppercase tracking-wider font-bold text-emerald-800 bg-emerald-100/70 px-1.5 py-0.5 rounded-md">
                            {tmpl.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#3A403A]/70 line-clamp-2 leading-relaxed">
                          {formatTemplateMessage(tmpl.message, currentLead)}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column: Message Editor & Direct Dispatch Actions */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-[#EAE7E2] shadow-2xs space-y-4">
                {/* Format Bar & Dynamic Tag Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EAE7E2] pb-3">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => insertFormatting('*', '*')}
                      className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-bold cursor-pointer"
                      title="Negrito (*texto*)"
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('_', '_')}
                      className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-xs italic cursor-pointer"
                      title="Itálico (_texto_)"
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('~', '~')}
                      className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-xs line-through cursor-pointer"
                      title="Riscado (~texto~)"
                    >
                      <Strikethrough className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('```', '```')}
                      className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-mono cursor-pointer"
                      title="Código (```texto```)"
                    >
                      <Code className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Quick variable tags */}
                    <button
                      type="button"
                      onClick={() => insertTag('{primeiro_nome}')}
                      className="px-2 py-1 text-[10px] font-medium text-[#344E41] bg-[#F4F1EA] hover:bg-[#EAE7E2] rounded-lg transition cursor-pointer"
                      title="Inserir primeiro nome do lead"
                    >
                      + {`{primeiro_nome}`}
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTag('{imovel}')}
                      className="px-2 py-1 text-[10px] font-medium text-[#344E41] bg-[#F4F1EA] hover:bg-[#EAE7E2] rounded-lg transition cursor-pointer"
                      title="Inserir nome do imóvel de interesse"
                    >
                      + {`{imovel}`}
                    </button>
                    <button
                      type="button"
                      onClick={insertPortalLink}
                      className="px-2.5 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition flex items-center gap-1 cursor-pointer"
                    >
                      <Link className="w-3 h-3" />
                      <span>+ Link do Portal LGPD</span>
                    </button>
                  </div>
                </div>

                {/* Main Textarea */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#344E41]">
                      Conteúdo da Mensagem WhatsApp
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {messageText.length} caracteres
                    </span>
                  </div>
                  <textarea
                    id="wa-message-textarea"
                    rows={10}
                    value={messageText}
                    onChange={e => setMessageText(e.target.value)}
                    placeholder="Escreva sua mensagem aqui ou selecione um modelo ao lado..."
                    className="w-full text-xs font-sans p-3.5 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A] leading-relaxed focus:outline-hidden focus:border-[#A3B18A] transition"
                  />
                </div>

                {/* Automation Toggles */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-1 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-[#3A403A] select-none">
                    <input
                      type="checkbox"
                      checked={autoLogHistory}
                      onChange={e => setAutoLogHistory(e.target.checked)}
                      className="w-4 h-4 text-[#344E41] rounded border-gray-300 focus:ring-[#A3B18A]"
                    />
                    <span>Registrar envio no histórico de atividades do lead</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-[#3A403A] select-none">
                    <input
                      type="checkbox"
                      checked={autoAdvanceStage}
                      onChange={e => setAutoAdvanceStage(e.target.checked)}
                      className="w-4 h-4 text-[#344E41] rounded border-gray-300 focus:ring-[#A3B18A]"
                    />
                    <span>Avançar etapa de funil automaticamente</span>
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#EAE7E2] flex-wrap">
                  <button
                    id="btn-copy-wa-message"
                    type="button"
                    onClick={handleCopyMessage}
                    className="px-3.5 py-2.5 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer font-medium"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {/* Send via WhatsApp Web wa.me */}
                    <button
                      id="btn-open-wa-web"
                      type="button"
                      onClick={() => handleSendWhatsAppWeb(currentLead, messageText)}
                      disabled={!currentLead || !currentLead.phone}
                      className="px-4 py-2.5 bg-white hover:bg-[#F4F1EA] text-[#344E41] border border-[#EAE7E2] rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-40 cursor-pointer shadow-2xs"
                    >
                      <ExternalLink className="w-4 h-4 text-emerald-700" />
                      <span>Abrir WhatsApp Web</span>
                    </button>

                    {/* Direct Send via Evolution API */}
                    <button
                      id="btn-send-evolution-direct"
                      type="button"
                      onClick={() => handleSendEvolutionDirect(currentLead, messageText)}
                      disabled={!currentLead || !currentLead.phone || evolutionSending}
                      className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-2 disabled:opacity-40 cursor-pointer"
                    >
                      <Zap className={`w-4 h-4 ${evolutionSending ? 'animate-spin' : 'text-emerald-300'}`} />
                      <span>{evolutionSending ? 'Disparando...' : '⚡ Disparar via Evolution API'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
