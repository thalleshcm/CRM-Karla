import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  MessageSquare,
  CheckCircle2,
  Settings as SettingsIcon
} from 'lucide-react';
import { useCrm } from '../context/CrmContext';
import { Lead, WhatsAppTemplate, WhatsAppScriptCategory } from '../types';
import { getWhatsAppLink } from '../utils/formatters';
import { STAGES } from '../data/initialData';
import { crmApi } from '../services/api';
import { computeNextBestAction } from '../utils/nextBestAction';
import { renderWhatsAppTemplate } from '../utils/whatsappTemplate';
import { LeadSelector } from './WhatsAppComposer/LeadSelector';
import { MessageTemplatePicker } from './WhatsAppComposer/MessageTemplatePicker';
import { MessageEditor, StageSuggestion } from './WhatsAppComposer/MessageEditor';
import { SendActions } from './WhatsAppComposer/SendActions';

export const WhatsAppDirectModal: React.FC = () => {
  const {
    isWhatsAppModalOpen,
    setIsWhatsAppModalOpen,
    whatsAppModalLead,
    visibleLeads,
    activities,
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
  const [stageSuggestion, setStageSuggestion] = useState<StageSuggestion | null>(null);

  // Stage advance is never applied automatically — sending a message doesn't
  // mean the deal moved forward. This only drives a dismissible suggestion
  // shown after a successful send; the broker decides.
  const STAGE_ADVANCE_SUGGESTION: Record<string, string> = {
    lead_novo: 'primeiro_contato',
    primeiro_contato: 'qualificacao'
  };

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
      setStageSuggestion(null);
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

  // Next Best Action for the current lead — same rule-based logic used in
  // the lead detail view, reused here to pre-select the message objective.
  const nextBestAction = useMemo(() => {
    if (!currentLead) return null;
    return computeNextBestAction(currentLead, activities);
  }, [currentLead, activities]);

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

  // Check Evolution API connection on modal open — routed through the
  // backend proxy so the API key never has to reach the browser.
  useEffect(() => {
    if (isWhatsAppModalOpen) {
      crmApi.checkWhatsAppStatus()
        .then(res => setEvolutionConnected(res.connected))
        .catch(() => setEvolutionConnected(false));
    } else {
      setEvolutionConnected(false);
    }
  }, [isWhatsAppModalOpen]);

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
    return renderWhatsAppTemplate(templateString, {
      lead: targetLead,
      broker: currentUser,
      company: settings,
      portalLink: generateClientPortalLink(targetLead),
      leadActivities: activities
    });
  };

  const handleSelectTemplate = (tmpl: WhatsAppTemplate) => {
    setSelectedTemplateId(tmpl.id);
    setMessageText(formatTemplateMessage(tmpl.message, currentLead));
  };

  // On lead switch, pre-select the objective suggested by the Next Best
  // Action and the best matching template for it — the broker can still
  // change the objective/template manually afterwards.
  //
  // Depends on currentLead?.id rather than the currentLead object itself:
  // updateLead() (called after a send when autoLogHistory is on) returns a
  // new lead object for the *same* id, which would otherwise re-trigger this
  // effect and silently overwrite whatever the broker had just sent/edited
  // in messageText with a freshly generated canned message.
  useEffect(() => {
    if (!currentLead) return;
    const templates = settings.quickTemplates || [];
    const suggestedObjective = nextBestAction?.objective;
    const recommended = suggestedObjective ? templates.find(t => t.category === suggestedObjective) : undefined;
    const template = recommended || templates.find(t => t.id === selectedTemplateId) || templates[0];

    if (suggestedObjective) setSelectedCategory(suggestedObjective);
    if (template) {
      setSelectedTemplateId(template.id);
      setMessageText(formatTemplateMessage(template.message, currentLead));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLead?.id]);

  const handleSelectLeadFromSearch = (lead: Lead) => {
    setSelectedLeadId(lead.id);
    setIsLeadDropdownOpen(false);
    setLeadSearchQuery('');
    setStageSuggestion(null);

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

  const suggestStageAdvance = (lead: Lead) => {
    const toStageId = STAGE_ADVANCE_SUGGESTION[lead.stageId];
    if (!toStageId) return;
    const toStageName = STAGES.find(s => s.id === toStageId)?.name || toStageId;
    setStageSuggestion({ leadId: lead.id, fromStageId: lead.stageId, toStageId, toStageName });
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

    // 2. Suggest a stage advance — never applied automatically
    suggestStageAdvance(lead);

    // 3. Open WhatsApp link in new tab
    window.open(finalLink, '_blank', 'noopener,noreferrer');
  };

  // Direct Dispatch via Evolution API
  const handleSendEvolutionDirect = async (lead: Lead | null, textToSend: string) => {
    if (!lead || !lead.phone) return;

    setEvolutionSending(true);
    setEvolutionStatusMsg(null);

    // Routed through the backend proxy — the Evolution API key stays
    // server-side and never reaches this browser session.
    const result = await crmApi.sendWhatsAppMessage(lead.phone, textToSend);

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

      suggestStageAdvance(lead);
    } else {
      setEvolutionStatusMsg({
        type: 'error',
        text: `❌ Falha no envio Evolution API: ${result.error || result.statusText}`
      });
    }
  };

  const handleCopyMessage = () => {
    // messageText is already fully rendered (set by handleSelectTemplate /
    // the lead-switch effect) — re-running it through formatTemplateMessage
    // here would re-substitute any literal "{variavel}"-shaped text the
    // broker typed or that happened to survive from a prior substitution.
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
      className="fixed inset-0 z-50 flex items-center justify-center sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={() => setIsWhatsAppModalOpen(false)}
    >
      <div
        id="whatsapp-direct-modal-container"
        className="bg-white w-full h-full sm:h-auto sm:max-w-5xl rounded-none sm:rounded-3xl border-0 sm:border border-[#EAE7E2] shadow-2xl flex flex-col sm:max-h-[92vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Clean, Focused Modal Header */}
        <div className="px-6 py-4 border-b border-[#EAE7E2] bg-[#FDFCFB] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800 shadow-2xs shrink-0">
              <MessageSquare className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h3 className="font-serif-title font-bold text-lg text-[#344E41]">
                Enviar Mensagem WhatsApp
              </h3>
              <p className="text-xs text-[#3A403A]/70">
                Escolha o lead, um modelo e envie.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Connection Status Pill */}
            {evolutionConnected === true ? (
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                <span className="hidden sm:inline">Evolution API</span> Online
              </span>
            ) : (
              <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span className="hidden sm:inline">Modo</span> WhatsApp Web
              </span>
            )}

            {currentUser.role === 'admin' && (
              <button
                id="btn-wa-settings"
                type="button"
                onClick={handleGoToSettings}
                className="p-2 text-slate-400 hover:text-[#344E41] hover:bg-[#F4F1EA] rounded-xl transition cursor-pointer"
                title="Configurar servidor Evolution API e templates"
              >
                <SettingsIcon className="w-4 h-4" />
              </button>
            )}

            <button
              id="btn-close-wa-modal"
              type="button"
              onClick={() => setIsWhatsAppModalOpen(false)}
              className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              aria-label="Fechar"
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
              <LeadSelector
                dropdownRef={dropdownRef}
                searchInputRef={searchInputRef}
                leadSearchQuery={leadSearchQuery}
                onSearchChange={setLeadSearchQuery}
                isDropdownOpen={isLeadDropdownOpen}
                onToggleDropdown={setIsLeadDropdownOpen}
                filteredLeads={filteredSearchLeads}
                currentLead={currentLead}
                onSelectLead={handleSelectLeadFromSearch}
                portalLinkCopied={portalLinkCopied}
                onCopyPortalLink={handleCopyPortalLink}
              />

              <MessageTemplatePicker
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                nextBestAction={nextBestAction}
                filteredTemplates={filteredTemplates}
                selectedTemplateId={selectedTemplateId}
                onSelectTemplate={handleSelectTemplate}
                formatTemplateMessage={formatTemplateMessage}
                currentLead={currentLead}
              />
            </div>

            {/* Right Column: Message Editor & Direct Dispatch Actions */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-[#EAE7E2] shadow-2xs space-y-4">
                <MessageEditor
                  messageText={messageText}
                  onChangeMessage={setMessageText}
                  onInsertFormatting={insertFormatting}
                  onInsertTag={insertTag}
                  onInsertPortalLink={insertPortalLink}
                  autoLogHistory={autoLogHistory}
                  onChangeAutoLogHistory={setAutoLogHistory}
                  stageSuggestion={currentLead?.id === stageSuggestion?.leadId ? stageSuggestion : null}
                  stageSuggestionFromName={
                    stageSuggestion ? STAGES.find(s => s.id === stageSuggestion.fromStageId)?.name || 'contato' : ''
                  }
                  onDismissStageSuggestion={() => setStageSuggestion(null)}
                  onConfirmStageSuggestion={() => {
                    if (!stageSuggestion) return;
                    moveLeadStage(stageSuggestion.leadId, stageSuggestion.toStageId as any);
                    setStageSuggestion(null);
                  }}
                />

                <SendActions
                  copied={copied}
                  onCopy={handleCopyMessage}
                  canSend={!!currentLead && !!currentLead.phone}
                  evolutionSending={evolutionSending}
                  onSendWeb={() => handleSendWhatsAppWeb(currentLead, messageText)}
                  onSendEvolution={() => handleSendEvolutionDirect(currentLead, messageText)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
