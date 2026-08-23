import React from 'react';
import { Copy, Check, ExternalLink, Zap } from 'lucide-react';

interface SendActionsProps {
  copied: boolean;
  onCopy: () => void;
  canSend: boolean;
  evolutionSending: boolean;
  onSendWeb: () => void;
  onSendEvolution: () => void;
}

export const SendActions: React.FC<SendActionsProps> = ({
  copied,
  onCopy,
  canSend,
  evolutionSending,
  onSendWeb,
  onSendEvolution
}) => {
  return (
    <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#EAE7E2] flex-wrap">
      <button
        id="btn-copy-wa-message"
        type="button"
        onClick={onCopy}
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
          onClick={onSendWeb}
          disabled={!canSend}
          className="px-4 py-2.5 bg-white hover:bg-[#F4F1EA] text-[#344E41] border border-[#EAE7E2] rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-40 cursor-pointer shadow-2xs"
        >
          <ExternalLink className="w-4 h-4 text-emerald-700" />
          <span>WhatsApp Web</span>
        </button>

        {/* Direct Send via Evolution API */}
        <button
          id="btn-send-evolution-direct"
          type="button"
          onClick={onSendEvolution}
          disabled={!canSend || evolutionSending}
          className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-2 disabled:opacity-40 cursor-pointer"
        >
          <Zap className={`w-4 h-4 ${evolutionSending ? 'animate-spin' : 'text-emerald-300'}`} />
          <span>{evolutionSending ? 'Disparando...' : 'Disparar via Evolution API'}</span>
        </button>
      </div>
    </div>
  );
};
