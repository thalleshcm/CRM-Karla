import React from 'react';
import { ShieldAlert, ArrowLeft, UserCheck, Lock } from 'lucide-react';
import { useCrm } from '../context/CrmContext';
import { ViewType } from '../types';

interface AccessRestrictedViewProps {
  moduleId: ViewType;
  moduleName: string;
}

export const AccessRestrictedView: React.FC<AccessRestrictedViewProps> = ({ moduleId, moduleName }) => {
  const { currentUser, setActiveView, setIsRoleSwitcherOpen } = useCrm();

  return (
    <div className="flex-1 min-h-screen bg-[#FDFCFB] flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-200">
      <div className="w-16 h-16 rounded-3xl bg-[#A3B18A]/20 border border-[#A3B18A]/40 flex items-center justify-center text-[#344E41] mb-5 shadow-2xs">
        <Lock className="w-8 h-8 text-[#588157]" />
      </div>

      <span className="px-3 py-1 bg-[#A3B18A]/15 border border-[#A3B18A]/30 text-[#344E41] text-xs font-bold uppercase tracking-widest rounded-full mb-3">
        Módulo Bloqueado para o Perfil {currentUser.role === 'broker' ? 'Corretor' : currentUser.role}
      </span>

      <h2 className="font-serif-title text-2xl font-bold text-[#344E41] max-w-md">
        Acesso restrito ao módulo de {moduleName}
      </h2>

      <p className="text-xs text-[#3A403A]/70 max-w-md mt-2 leading-relaxed">
        O Administrador configurou as políticas de acesso e este módulo está desativado para o seu perfil atual ({currentUser.name} - {currentUser.roleLabel}).
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
        <button
          onClick={() => setActiveView('dashboard')}
          className="px-4 py-2.5 bg-[#F1EFEC] hover:bg-[#EAE7E2] text-[#3A403A] border border-[#EAE7E2] rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Voltar ao Dashboard</span>
        </button>

        <button
          onClick={() => setIsRoleSwitcherOpen(true)}
          className="px-5 py-2.5 bg-[#344E41] hover:bg-[#283d33] text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2 transition-colors"
        >
          <UserCheck className="w-4 h-4 text-[#A3B18A]" />
          <span>Alternar para Administrador</span>
        </button>
      </div>
    </div>
  );
};
