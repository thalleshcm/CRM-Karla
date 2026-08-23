import React, { useState } from 'react';
import { Bell, UserCheck, Menu } from 'lucide-react';
import { useCrm } from '../context/CrmContext';

interface HeaderProps {
  title: string;
  subtitle: string;
  actionButton?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, actionButton }) => {
  const {
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    currentUser,
    hasPermission,
    setIsMobileSidebarOpen,
    setIsMyProfileModalOpen
  } = useCrm();
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;
  const canViewAll = hasPermission('canViewAllLeads');

  return (
    <header className="px-4 sm:px-6 lg:px-8 py-4 lg:py-5 border-b border-[#EAE7E2] bg-white/80 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 sm:gap-4 sticky top-0 z-10">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={() => setIsMobileSidebarOpen(true)}
          className="lg:hidden p-2 -ml-2 text-[#344E41] hover:bg-[#F1EFEC] rounded-xl transition-colors shrink-0"
          aria-label="Abrir menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h2 className="font-serif-title text-lg sm:text-xl lg:text-2xl font-semibold text-[#344E41] tracking-tight truncate">
            {title}
          </h2>
          <p className="text-xs text-[#3A403A]/70 mt-0.5 hidden sm:block">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center flex-wrap gap-3">
        {!canViewAll && (
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-[#588157]/10 border border-[#588157]/20 rounded-xl text-xs">
            <UserCheck className="w-3.5 h-3.5 text-[#588157]" />
            <span className="text-[11px] font-semibold text-[#344E41]">Meu Portfólio Exclusivo</span>
          </div>
        )}

        {/* User Profile Pill */}
        <button
          onClick={() => setIsMyProfileModalOpen(true)}
          title="Meu Perfil"
          className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 bg-[#FDFCFB] hover:bg-[#F1EFEC] border border-[#EAE7E2] rounded-xl text-xs shadow-2xs transition-colors"
        >
          <div
            className="w-6 h-6 rounded-lg text-white flex items-center justify-center font-bold text-[10px] shadow-2xs"
            style={{ backgroundColor: currentUser.avatarColor || '#344E41' }}
          >
            {currentUser.initials}
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-xs font-semibold text-[#344E41] leading-tight flex items-center gap-1.5">
              <span>{currentUser.name}</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider ${
                  currentUser.role === 'admin'
                    ? 'bg-[#344E41] text-[#E9EDC9]'
                    : 'bg-[#588157] text-white'
                }`}
              >
                {currentUser.role === 'admin' ? 'Admin' : 'Corretor'}
              </span>
            </p>
          </div>
        </button>

        {actionButton}

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative p-2 rounded-xl text-[#3A403A] hover:text-[#344E41] hover:bg-[#F1EFEC] transition-colors border border-transparent hover:border-[#EAE7E2]"
            title="Notificações e lembretes"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#588157] ring-2 ring-white" />
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-[#EAE7E2] py-3 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="flex items-center justify-between px-4 pb-2 border-b border-[#EAE7E2]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#344E41]">Notificações</span>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-[#A3B18A]/20 text-[#588157] rounded-full">
                      {unreadCount} novas
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllNotificationsRead}
                    className="text-[11px] text-[#588157] hover:underline font-semibold"
                  >
                    Marcar lidas
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto py-1">
                {notifications.length === 0 ? (
                  <p className="text-xs text-[#3A403A]/50 text-center py-6">
                    Nenhuma notificação no momento.
                  </p>
                ) : (
                  notifications.map(notif => (
                    <div
                      key={notif.id}
                      onClick={() => markNotificationRead(notif.id)}
                      className={`px-4 py-2.5 hover:bg-[#FDFCFB] transition-colors cursor-pointer border-b border-[#EAE7E2]/50 last:border-0 ${
                        !notif.read ? 'bg-[#A3B18A]/10' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-[#344E41]">{notif.title}</p>
                        <span className="text-[10px] text-[#3A403A]/50 whitespace-nowrap">{notif.date}</span>
                      </div>
                      <p className="text-[11px] text-[#3A403A]/80 mt-0.5 leading-snug">{notif.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
