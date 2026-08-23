import React, { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export interface ConfirmDangerRequest {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 'critical' requires typing a confirmation word before the button unlocks. */
  tone?: 'default' | 'critical';
  /** Word/phrase the user must type to unlock the confirm button. Defaults to "EXCLUIR" for critical tone. */
  typedConfirmation?: string;
  onConfirm: () => void | Promise<void>;
}

interface ConfirmDangerModalProps {
  request: ConfirmDangerRequest | null;
  onClose: () => void;
}

/**
 * Reusable destructive-action confirmation dialog. Two tiers:
 *  - 'default': a single explicit confirm click (replaces bare window.confirm()).
 *  - 'critical': irreversible actions (delete forever, wipe data) also require
 *    typing a confirmation word, so a stray click can't trigger them.
 */
export const ConfirmDangerModal: React.FC<ConfirmDangerModalProps> = ({ request, onClose }) => {
  const [typedValue, setTypedValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setTypedValue('');
    setIsSubmitting(false);
  }, [request]);

  if (!request) return null;

  const isCritical = request.tone === 'critical';
  const requiredWord = request.typedConfirmation || 'EXCLUIR';
  const isUnlocked = !isCritical || typedValue.trim().toUpperCase() === requiredWord.toUpperCase();

  const handleConfirm = async () => {
    if (!isUnlocked || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await request.onConfirm();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-100 bg-black/50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4 animate-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isCritical ? 'bg-rose-50' : 'bg-amber-50'}`}>
              <AlertTriangle className={`w-5 h-5 ${isCritical ? 'text-rose-600' : 'text-amber-600'}`} />
            </div>
            <h3 className="font-serif-title text-base font-semibold text-[#344E41]">{request.title}</h3>
          </div>
          <button onClick={onClose} className="p-1 text-[#3A403A]/40 hover:text-[#3A403A] transition-colors" aria-label="Fechar">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-[#3A403A]/70 leading-relaxed">{request.description}</p>

        {isCritical && (
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-widest text-[#3A403A]/70">
              Digite <span className="font-mono text-rose-700">{requiredWord}</span> para confirmar
            </label>
            <input
              type="text"
              value={typedValue}
              onChange={e => setTypedValue(e.target.value)}
              autoFocus
              className="w-full text-xs font-mono p-2.5 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-rose-400"
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-3.5 py-2 text-xs font-medium text-[#3A403A] border border-[#EAE7E2] rounded-xl hover:bg-[#F4F1EA] transition-colors disabled:opacity-50"
          >
            {request.cancelLabel || 'Cancelar'}
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isUnlocked || isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Aguarde...' : request.confirmLabel || 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
};

/** Convenience hook: returns [modalElement, requestConfirm(request)] for a single owned modal instance. */
export const useConfirmDanger = () => {
  const [request, setRequest] = useState<ConfirmDangerRequest | null>(null);
  const modal = <ConfirmDangerModal request={request} onClose={() => setRequest(null)} />;
  return { modal, requestConfirm: setRequest };
};
