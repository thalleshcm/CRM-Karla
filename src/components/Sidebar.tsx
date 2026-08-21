import React from 'react';
import {
  LayoutDashboard,
  Kanban,
  CalendarDays,
  Cake,
  FileText,
  Wallet,
  Settings,
  Search,
  LogOut,
  Building2,
  Sparkles,
  Users,
  Shield,
  Lock,
  MessageSquare
} from 'lucide-react';
import { useCrm } from '../context/CrmContext';
import { ViewType } from '../types';

export const Sidebar: React.FC = () => {
  const {
    activeView,
    setActiveView,
    settings,
    setIsCommandPaletteOpen,
    notifications,
    currentUser,
    hasModuleAccess,
    setIsRoleSwitcherOpen,
    openWhatsAppDirectHub
  } = useCrm();

  const navItems: { id: ViewType; label: string; icon: React.FC<{ className?: string }>; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'funnels', label: 'Funis de Vendas', icon: Kanban },
    { id: 'agenda', label: 'Agenda & Follow-up', icon: CalendarDays },
    { id: 'birthdays', label: 'Aniversariantes', icon: Cake },
    { id: 'contracts', label: 'Contratos', icon: FileText },
    { id: 'commissions', label: 'Comissões', icon: Wallet },
    { id: 'settings', label: 'Configurações & Acessos', icon: Settings },
  ];

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <aside className="w-64 min-w-[16rem] bg-[#3E4A3D] text-[#E9EDC9] flex flex-col justify-between h-screen sticky top-0 select-none z-20 shadow-md">
      <div className="p-4 flex flex-col gap-5">
        {/* Brand Header */}
        <div className="px-2 pt-1 pb-2 flex flex-col items-start gap-1">
          <div className="flex items-center gap-2.5">
            {/* Natural Tones Emblem Logo */}
            <div className="w-8 h-8 rounded-xl bg-[#A3B18A] flex items-center justify-center text-[#3E4A3D] shadow-xs">
              <span className="font-serif-title font-bold text-base leading-none">
                {settings.companyName.charAt(0) || 'A'}
              </span>
            </div>
            <div>
              <h1 className="font-brand font-bold text-white tracking-[0.2em] text-base leading-tight">
                {settings.companyName.split(' ')[0] || 'AURUM'}
              </h1>
              <p className="text-[9px] uppercase tracking-widest text-[#A3B18A] font-semibold">
                Soluções Imobiliárias
              </p>
            </div>
          </div>
          <p className="text-[10px] text-[#E9EDC9]/70 font-normal italic pl-0.5 mt-0.5 tracking-tight">
            {settings.slogan || 'Soluções que constroem legados'}
          </p>
        </div>

        {/* Global Search Input trigger */}
        <button
          onClick={() => setIsCommandPaletteOpen(true)}
          className="w-full flex items-center justify-between px-3 py-2 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl text-xs text-[#E9EDC9]/80 transition-all shadow-xs group"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-[#A3B18A] group-hover:text-white" />
            <span className="text-[#E9EDC9]/90">Buscar...</span>
          </div>
          <kbd className="px-1.5 py-0.5 bg-black/20 border border-white/10 rounded text-[10px] font-mono text-[#E9EDC9]/70">
            ⌘K
          </kbd>
        </button>

        {/* Nav Items */}
        <nav className="flex flex-col gap-1.5">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            const isAccessible = hasModuleAccess(item.id);

            // Hide or mark restricted
            if (!isAccessible && currentUser.role !== 'admin') {
              return null; // hide completely for clean broker UI
            }

            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all ${
                  isActive
                    ? 'bg-[#A3B18A]/25 text-white shadow-xs font-semibold'
                    : 'text-[#E9EDC9]/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-[#E9EDC9]' : 'text-[#A3B18A]'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.id === 'agenda' && unreadCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-[#E9EDC9] ring-2 ring-[#3E4A3D]" />
                )}
              </button>
            );
          })}
          {/* WhatsApp Direct Hub Action */}
          <div className="pt-2 border-t border-white/10 mt-1">
            <button
              onClick={() => openWhatsAppDirectHub('scripts')}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs bg-[#588157]/40 hover:bg-[#588157]/60 text-white font-semibold border border-[#588157]/40 shadow-xs transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <MessageSquare className="w-4 h-4 text-[#E9EDC9] group-hover:scale-110 transition-transform" />
                <span>Central WhatsApp</span>
              </div>
              <span className="text-[10px] bg-[#588157] text-white px-1.5 py-0.5 rounded-full font-bold">
                PRO
              </span>
            </button>
          </div>
        </nav>
      </div>

      {/* Bottom Profile Footer */}
      <div className="p-3 border-t border-white/10 bg-[#344E41]/60">
        <button
          onClick={() => setIsRoleSwitcherOpen(true)}
          className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-white/10 transition-colors group text-left"
          title="Clique para alternar usuário ou perfil"
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl text-white flex items-center justify-center font-bold text-xs shadow-xs"
              style={{ backgroundColor: currentUser.avatarColor || '#344E41' }}
            >
              {currentUser.initials}
            </div>
            <div className="text-left leading-tight">
              <p className="text-xs font-semibold text-white truncate max-w-[110px]">
                {currentUser.name}
              </p>
              <p className="text-[10px] text-[#A3B18A] flex items-center gap-1">
                <span>{currentUser.role === 'admin' ? 'Administrador' : 'Corretor'}</span>
              </p>
            </div>
          </div>

          <span className="text-[10px] bg-white/10 group-hover:bg-white/20 text-[#E9EDC9] px-2 py-0.5 rounded-md font-mono transition-colors">
            Trocar
          </span>
        </button>
      </div>
    </aside>
  );
};

