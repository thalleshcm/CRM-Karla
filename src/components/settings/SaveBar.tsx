import React from 'react';
import { Save, RotateCcw, Loader2, CheckCircle2 } from 'lucide-react';

export type SaveState = 'idle' | 'dirty' | 'saving' | 'saved';

interface SaveBarProps {
  state: SaveState;
  onSave: () => void;
  onDiscard?: () => void;
  saveLabel?: string;
}

/**
 * Unified save control for Settings forms — indicator + Save/Discard/Saving...
 * so every section behaves the same way instead of some auto-saving on
 * toggle and others requiring an explicit click.
 */
export const SaveBar: React.FC<SaveBarProps> = ({ state, onSave, onDiscard, saveLabel = 'Salvar alterações' }) => {
  if (state === 'idle') return null;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {state === 'dirty' && (
        <>
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-700">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Alterações não salvas
          </span>
          {onDiscard && (
            <button
              type="button"
              onClick={onDiscard}
              className="px-3.5 py-2 text-xs font-medium text-[#3A403A] border border-[#EAE7E2] rounded-xl hover:bg-[#F4F1EA] transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Descartar</span>
            </button>
          )}
          <button
            type="button"
            onClick={onSave}
            className="px-4 py-2 bg-[#344E41] hover:bg-[#283d33] text-white rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saveLabel}</span>
          </button>
        </>
      )}
      {state === 'saving' && (
        <span className="flex items-center gap-1.5 text-xs font-semibold text-[#3A403A]/70">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Salvando...
        </span>
      )}
      {state === 'saved' && (
        <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 motion-safe:animate-in motion-safe:fade-in">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Salvo
        </span>
      )}
    </div>
  );
};
