import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Lead, WhatsAppTemplate, WhatsAppScriptCategory } from '../../types';
import { NextBestActionResult } from '../../utils/nextBestAction';

interface MessageTemplatePickerProps {
  selectedCategory: WhatsAppScriptCategory | 'todas';
  onSelectCategory: (category: WhatsAppScriptCategory | 'todas') => void;
  nextBestAction: NextBestActionResult | null;
  filteredTemplates: WhatsAppTemplate[];
  selectedTemplateId: string;
  onSelectTemplate: (tmpl: WhatsAppTemplate) => void;
  formatTemplateMessage: (message: string, lead: Lead | null) => string;
  currentLead: Lead | null;
}

export const MessageTemplatePicker: React.FC<MessageTemplatePickerProps> = ({
  selectedCategory,
  onSelectCategory,
  nextBestAction,
  filteredTemplates,
  selectedTemplateId,
  onSelectTemplate,
  formatTemplateMessage,
  currentLead
}) => {
  return (
    <div className="bg-white p-4 rounded-2xl border border-[#EAE7E2] shadow-2xs space-y-3">
      <div className="flex items-center gap-2">
        <span className="w-5 h-5 rounded-full bg-[#344E41] text-white text-[10px] font-bold flex items-center justify-center shrink-0">2</span>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-[#344E41] flex-1">
          Objetivo
        </label>
        <select
          value={selectedCategory}
          onChange={e => onSelectCategory(e.target.value as WhatsAppScriptCategory | 'todas')}
          className="text-[11px] font-medium bg-[#F4F1EA] border border-[#EAE7E2] rounded-lg px-2 py-1 text-[#344E41] focus:outline-hidden cursor-pointer"
        >
          <option value="todas">Todos os objetivos</option>
          <option value="primeiro_contato">Primeiro contato</option>
          <option value="apresentacao">Apresentação</option>
          <option value="visita">Agendar / confirmar visita</option>
          <option value="simulacao">Simulação</option>
          <option value="coleta_documentos">Cobrar documentação</option>
          <option value="documentacao">Documentação (avançado)</option>
          <option value="fechamento">Enviar proposta / Fechamento</option>
          <option value="objecoes">Tratar objeções</option>
          <option value="reativacao">Reativação</option>
          <option value="pos_venda">Pós-venda</option>
          <option value="aniversario">Aniversário</option>
        </select>
      </div>

      {/* Next Best Action hint — same rule-based suggestion shown on the lead */}
      {nextBestAction && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] ${
          nextBestAction.level === 'high' ? 'bg-rose-50 text-rose-900 border border-rose-200' :
          nextBestAction.level === 'medium' ? 'bg-amber-50 text-amber-900 border border-amber-200' :
          'bg-emerald-50 text-emerald-900 border border-emerald-200'
        }`}>
          <span>{nextBestAction.level === 'high' ? '🔴' : nextBestAction.level === 'medium' ? '🟡' : '🟢'}</span>
          <span><strong>{nextBestAction.title}:</strong> {nextBestAction.description}</span>
        </div>
      )}

      {/* Templates Scrollable List */}
      {filteredTemplates.length === 0 ? (
        <p className="text-xs text-[#3A403A]/50 italic py-3 text-center">Nenhum modelo nessa categoria.</p>
      ) : (
        <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
          {filteredTemplates.map(tmpl => {
            const isSelected = selectedTemplateId === tmpl.id;
            return (
              <button
                key={tmpl.id}
                type="button"
                onClick={() => onSelectTemplate(tmpl)}
                className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-50/70 border-emerald-400 ring-1 ring-emerald-300'
                    : 'bg-[#FDFCFB] border-[#EAE7E2] hover:border-[#A3B18A]'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                  <span className="font-bold text-xs text-[#344E41] truncate">{tmpl.title}</span>
                </div>
                <p className="text-[11px] text-[#3A403A]/70 line-clamp-2 leading-relaxed">
                  {formatTemplateMessage(tmpl.message, currentLead)}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
