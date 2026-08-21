import React from 'react';
import { MessageSquare, Zap } from 'lucide-react';
import { useCrm } from '../context/CrmContext';

export const WhatsAppFloatingButton: React.FC = () => {
  const { visibleLeads, visibleActivities, openWhatsAppDirectHub } = useCrm();

  // Count pending touchpoints today
  const newLeadsCount = visibleLeads.filter(l => l.stageId === 'lead_novo' && !l.archived).length;
  const pendingActivitiesCount = visibleActivities.filter(a => !a.completed).length;
  const totalPendingToday = newLeadsCount + pendingActivitiesCount;

  return (
    <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2 group">
      {/* Tooltip on hover */}
      <div className="hidden md:flex items-center gap-2 bg-[#344E41] text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all pointer-events-none transform translate-y-1 group-hover:translate-y-0">
        <Zap className="w-3.5 h-3.5 text-[#A3B18A]" />
        <span>Central WhatsApp & Disparos</span>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => openWhatsAppDirectHub('scripts')}
        className="relative w-14 h-14 rounded-full bg-[#588157] hover:bg-[#344E41] text-white shadow-xl hover:shadow-2xl flex items-center justify-center transition-all duration-300 transform hover:scale-105 active:scale-95 border-2 border-white"
        aria-label="Abrir Central WhatsApp"
      >
        <MessageSquare className="w-6 h-6" />

        {/* Pulse badge if items are pending */}
        {totalPendingToday > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-5 w-5 bg-rose-600 text-white text-[10px] font-bold items-center justify-center shadow-xs">
              {totalPendingToday > 9 ? '9+' : totalPendingToday}
            </span>
          </span>
        )}
      </button>
    </div>
  );
};
