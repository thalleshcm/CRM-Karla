import React, { useState } from 'react';
import { Bell, ChevronDown, Filter, Users, UserCheck } from 'lucide-react';
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
    users,
    adminFilterBrokerId,
    setAdminFilterBrokerId,
    setIsRoleSwitcherOpen,
    hasPermission
  } = useCrm();
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;
  const canViewAll = hasPermission('canViewAllLeads');

  return (
    <header className="px-8 py-5 border-b border-[#EAE7E2] bg-white/80 backdrop-blur-md flex flex-wrap items-center justify-between gap-4 sticky top-0 z-10">
      <div>
        <h2 className="font-serif-title text-2xl font-semibold text-[#344E41] tracking-tight">
          {title}
        </h2>
        <p className="text-xs text-[#3A403A]/70 mt-0.5">
          {subtitle}
        </p>
      </div>

      <div className="flex items-center flex-wrap gap-3">
        {/* Admin Filter: View entire agency or filter by individual broker */}
        {canViewAll && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F4F1EA] border border-[#EAE7E2] rounded-xl text-xs">
            <Filter className="w-3.5 h-3.5 text-[#588157]" />
            <span className="text-[11px] font-medium text-[#3A403A]/70 hidden md:inline">Visão:</span>
            <select
              value={adminFilterBrokerId}
              onChange={e => setAdminFilterBrokerId(e.target.value)}
              className="bg-transparent text-xs font-semibold text-[#344E41] focus:outline-hidden cursor-pointer"
            >
              <option value="all">🏢 Toda a Imobiliária (Geral)</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  👤 {u.name} ({u.role === 'admin' ? 'Admin' : 'Corretor'})
                </option>
              ))}
            </select>
          </div>
        )}

        {!canViewAll && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#588157]/10 border border-[#588157]/20 rounded-xl text-xs">
            <UserCheck className="w-3.5 h-3.5 text-[#588157]" />
            <span className="text-[11px] font-semibold text-[#344E41]">Meu Portfólio Exclusivo</span>
          </div>
        )}

        {/* User Profile / Role Switcher Pill */}
        <button
          onClick={() => setIsRoleSwitcherOpen(true)}
          className="flex items-center gap-2.5 px-3 py-1.5 bg-[#FDFCFB] hover:bg-[#F4F1EA] border border-[#EAE7E2] rounded-xl text-xs transition-all shadow-2xs group"
          title="Clique para alternar perfil de usuário"
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
          <ChevronDown className="w-3.5 h-3.5 text-[#3A403A]/50 group-hover:text-[#344E41] transition-colors" />
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
