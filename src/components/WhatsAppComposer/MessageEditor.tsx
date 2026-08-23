import React from 'react';
import { Bold, Italic, Strikethrough, Code, Link } from 'lucide-react';
import { WHATSAPP_TEMPLATE_VARIABLES } from '../../utils/whatsappTemplate';

export interface StageSuggestion {
  leadId: string;
  fromStageId: string;
  toStageId: string;
  toStageName: string;
}

interface MessageEditorProps {
  messageText: string;
  onChangeMessage: (value: string) => void;
  onInsertFormatting: (prefix: string, suffix: string) => void;
  onInsertTag: (tag: string) => void;
  onInsertPortalLink: () => void;
  autoLogHistory: boolean;
  onChangeAutoLogHistory: (value: boolean) => void;
  stageSuggestion: StageSuggestion | null;
  stageSuggestionFromName: string;
  onDismissStageSuggestion: () => void;
  onConfirmStageSuggestion: () => void;
}

export const MessageEditor: React.FC<MessageEditorProps> = ({
  messageText,
  onChangeMessage,
  onInsertFormatting,
  onInsertTag,
  onInsertPortalLink,
  autoLogHistory,
  onChangeAutoLogHistory,
  stageSuggestion,
  stageSuggestionFromName,
  onDismissStageSuggestion,
  onConfirmStageSuggestion
}) => {
  return (
    <>
      <div className="flex items-center gap-2">
        <span className="w-5 h-5 rounded-full bg-[#344E41] text-white text-[10px] font-bold flex items-center justify-center shrink-0">3</span>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-[#344E41]">
          Mensagem
        </label>
        <span className="text-[10px] text-slate-400 font-mono ml-auto">
          {messageText.length} caracteres
        </span>
      </div>

      {/* Main Textarea */}
      <textarea
        id="wa-message-textarea"
        rows={9}
        value={messageText}
        onChange={e => onChangeMessage(e.target.value)}
        placeholder="Escreva sua mensagem aqui ou selecione um modelo ao lado..."
        className="w-full text-xs font-sans p-3.5 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A] leading-relaxed focus:outline-hidden focus:border-[#A3B18A] transition"
      />

      {/* Compact Toolbar: formatting + variables in one row */}
      <div className="flex flex-wrap items-center gap-1.5 -mt-1">
        <div className="flex items-center gap-0.5 pr-1.5 border-r border-[#EAE7E2]">
          <button
            type="button"
            onClick={() => onInsertFormatting('*', '*')}
            className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer"
            title="Negrito (*texto*)"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onInsertFormatting('_', '_')}
            className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer"
            title="Itálico (_texto_)"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onInsertFormatting('~', '~')}
            className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer"
            title="Riscado (~texto~)"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onInsertFormatting('```', '```')}
            className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer"
            title="Código (```texto```)"
          >
            <Code className="w-3.5 h-3.5" />
          </button>
        </div>

        {WHATSAPP_TEMPLATE_VARIABLES.filter(v => v.key !== 'link_portal').map(v => (
          <button
            key={v.key}
            type="button"
            onClick={() => onInsertTag(`{${v.key}}`)}
            className="px-2 py-1 text-[10px] font-medium text-[#344E41] bg-[#F4F1EA] hover:bg-[#EAE7E2] rounded-lg transition cursor-pointer"
            title={`Inserir: ${v.label}`}
          >
            + {v.label.toLowerCase()}
          </button>
        ))}
        <button
          type="button"
          onClick={onInsertPortalLink}
          className="px-2 py-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition flex items-center gap-1 cursor-pointer"
          title="Inserir link do portal de envio de documentos (LGPD)"
        >
          <Link className="w-3 h-3" />
          <span>+ link do portal</span>
        </button>
      </div>

      {/* Automation Toggles */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-4 pt-3 border-t border-[#EAE7E2] text-xs">
        <label className="flex items-center gap-2 cursor-pointer text-[#3A403A] select-none">
          <input
            type="checkbox"
            checked={autoLogHistory}
            onChange={e => onChangeAutoLogHistory(e.target.checked)}
            className="w-4 h-4 text-[#344E41] rounded border-gray-300 focus:ring-[#A3B18A]"
          />
          <span>Registrar no histórico do lead</span>
        </label>
      </div>

      {/* Stage Advance Suggestion — shown after a successful send, never applied automatically */}
      {stageSuggestion && (
        <div className="flex items-center justify-between gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs animate-in fade-in">
          <span className="text-amber-900">
            Esta mensagem parece um <strong>{stageSuggestionFromName}</strong>. Avançar o lead para <strong>{stageSuggestion.toStageName}</strong>?
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onDismissStageSuggestion}
              className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition"
            >
              Manter etapa
            </button>
            <button
              type="button"
              onClick={onConfirmStageSuggestion}
              className="px-2.5 py-1.5 text-[11px] font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition"
            >
              Avançar para {stageSuggestion.toStageName}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
