import React, { useState } from 'react';
import { X, Target, DollarSign, Check } from 'lucide-react';
import { useCrm } from '../context/CrmContext';
import { useEscapeToClose } from '../hooks/useEscapeToClose';

export const SetGoalModal: React.FC = () => {
  const {
    isGoalModalOpen,
    setIsGoalModalOpen,
    settings,
    updateSettings,
    triggerConfetti
  } = useCrm();

  const [salesGoal, setSalesGoal] = useState<number>(settings.monthlySalesGoalCount || 4);
  const [vgvGoal, setVgvGoal] = useState<number>(settings.monthlyVgvGoal || 3500000);

  useEscapeToClose(() => setIsGoalModalOpen(false), isGoalModalOpen);

  if (!isGoalModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      monthlySalesGoalCount: Number(salesGoal) || 1,
      monthlyVgvGoal: Number(vgvGoal) || 100000
    });
    triggerConfetti();
    setIsGoalModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3E4A3D]/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-[#EAE7E2] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-[#EAE7E2] bg-[#F4F1EA]/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#344E41] text-[#E9EDC9] flex items-center justify-center font-bold shadow-2xs">
              <Target className="w-5 h-5 text-[#A3B18A]" />
            </div>
            <div>
              <h3 className="font-serif-title text-lg font-bold text-[#344E41]">
                Definir Meta do Mês
              </h3>
              <p className="text-xs text-[#3A403A]/60">
                Ajuste os seus objetivos de vendas e faturamento (VGV).
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsGoalModalOpen(false)}
            className="p-1.5 text-[#3A403A]/40 hover:text-[#344E41] rounded-lg hover:bg-[#EAE7E2]/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#3A403A]/70 mb-1">
              Meta de Vendas Fechadas (Quantidade)
            </label>
            <input
              required
              type="number"
              min="1"
              max="100"
              value={salesGoal}
              onChange={e => setSalesGoal(parseInt(e.target.value, 10))}
              className="w-full text-xs p-2.5 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#3A403A]/70 mb-1">
              Meta de VGV (Volume Geral de Vendas em R$)
            </label>
            <input
              required
              type="number"
              min="10000"
              step="50000"
              value={vgvGoal}
              onChange={e => setVgvGoal(parseFloat(e.target.value))}
              className="w-full text-xs p-2.5 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A] font-mono focus:outline-hidden focus:border-[#A3B18A]"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#EAE7E2]">
            <button
              type="button"
              onClick={() => setIsGoalModalOpen(false)}
              className="px-4 py-2 border border-[#EAE7E2] text-[#3A403A] hover:bg-[#F1EFEC] text-xs rounded-xl font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#344E41] hover:bg-[#283d33] text-white text-xs rounded-xl font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Salvar Meta</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
