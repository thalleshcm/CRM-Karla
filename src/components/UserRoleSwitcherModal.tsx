import React, { useState } from 'react';
import {
  ShieldCheck,
  UserCheck,
  UserPlus,
  Check,
  X,
  Shield,
  Briefcase,
  Sparkles,
  Edit2,
  Trash2
} from 'lucide-react';
import { useCrm } from '../context/CrmContext';
import { UserRole, UserProfile } from '../types';

export const UserRoleSwitcherModal: React.FC = () => {
  const {
    isRoleSwitcherOpen,
    setIsRoleSwitcherOpen,
    users,
    currentUser,
    setCurrentUserId,
    addUser,
    deleteUser,
    rolePermissions,
    setActiveView,
    triggerConfetti
  } = useCrm();

  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('broker');
  const [newRoleLabel, setNewRoleLabel] = useState('Corretor Associado');
  const [newCreci, setNewCreci] = useState('');
  const [newPhone, setNewPhone] = useState('');

  if (!isRoleSwitcherOpen) return null;

  const handleSelectUser = (id: string) => {
    setCurrentUserId(id);
    setIsRoleSwitcherOpen(false);
    triggerConfetti();
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const initials = newName
      .split(' ')
      .slice(0, 2)
      .map(part => part[0])
      .join('')
      .toUpperCase();

    const avatarColor = newRole === 'admin' ? '#344E41' : '#588157';

    const created = addUser({
      name: newName,
      email: newEmail || `${newName.toLowerCase().replace(/\s+/g, '.')}@aurum.com.br`,
      role: newRole,
      roleLabel: newRoleLabel || (newRole === 'admin' ? 'Administrador' : 'Corretor'),
      creci: newCreci || 'CRECI Sob Análise',
      phone: newPhone || '+55 (11) 98000-0000',
      initials: initials || 'CO',
      avatarColor,
      active: true,
      assignedLeadCount: 0
    });

    setCurrentUserId(created.id);
    setIsCreatingUser(false);
    setNewName('');
    setNewEmail('');
    setNewCreci('');
    setNewPhone('');
    triggerConfetti();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3E4A3D]/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-[#EAE7E2] overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-[#EAE7E2] bg-[#F4F1EA]/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#344E41] text-[#E9EDC9] flex items-center justify-center font-bold shadow-2xs">
              <ShieldCheck className="w-5 h-5 text-[#A3B18A]" />
            </div>
            <div>
              <h3 className="font-serif-title text-lg font-bold text-[#344E41]">
                Perfis & Simulação de Usuário
              </h3>
              <p className="text-xs text-[#3A403A]/60">
                Alterne entre Administrador e Corretor para testar as permissões de acesso.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsRoleSwitcherOpen(false)}
            className="p-1.5 text-[#3A403A]/40 hover:text-[#344E41] rounded-lg hover:bg-[#EAE7E2]/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Active User Highlight Card */}
          <div className="p-4 bg-[#F4F1EA]/80 border border-[#EAE7E2] rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div
                className="w-11 h-11 rounded-xl text-white flex items-center justify-center font-bold text-sm shadow-xs"
                style={{ backgroundColor: currentUser.avatarColor || '#344E41' }}
              >
                {currentUser.initials}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-[#344E41]">{currentUser.name}</h4>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      currentUser.role === 'admin'
                        ? 'bg-[#344E41] text-[#E9EDC9]'
                        : 'bg-[#A3B18A]/25 text-[#344E41] border border-[#A3B18A]/40'
                    }`}
                  >
                    {currentUser.role === 'admin' ? 'Administrador' : 'Corretor'}
                  </span>
                </div>
                <p className="text-xs text-[#3A403A]/70">{currentUser.roleLabel} • {currentUser.creci}</p>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-[#588157] bg-[#A3B18A]/20 px-2.5 py-1 rounded-lg">
              Ativo Agora
            </span>
          </div>

          {/* Quick Switch Profiles List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h5 className="text-xs font-bold uppercase tracking-widest text-[#3A403A]/70">
                Selecione um Perfil para Alternar
              </h5>
              {!isCreatingUser && (
                <button
                  onClick={() => setIsCreatingUser(true)}
                  className="text-xs font-semibold text-[#588157] hover:text-[#344E41] flex items-center gap-1 hover:underline"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Cadastrar Usuário</span>
                </button>
              )}
            </div>

            {isCreatingUser ? (
              <form onSubmit={handleCreateUser} className="p-4 bg-[#FDFCFB] border border-[#EAE7E2] rounded-2xl space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between border-b border-[#EAE7E2] pb-2">
                  <span className="text-xs font-bold text-[#344E41]">Novo Membro da Equipe</span>
                  <button
                    type="button"
                    onClick={() => setIsCreatingUser(false)}
                    className="text-xs text-[#3A403A]/60 hover:text-[#344E41]"
                  >
                    Cancelar
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#3A403A]/70 mb-1">Nome Completo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Roberto Alencar"
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#3A403A]/70 mb-1">Perfil de Acesso *</label>
                    <select
                      value={newRole}
                      onChange={e => {
                        const r = e.target.value as UserRole;
                        setNewRole(r);
                        setNewRoleLabel(r === 'admin' ? 'Diretor / Administrador' : 'Corretor Associado');
                      }}
                      className="w-full text-xs p-2.5 bg-white border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
                    >
                      <option value="broker">Corretor (Acesso configurável aos módulos)</option>
                      <option value="admin">Administrador (Acesso total)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#3A403A]/70 mb-1">Cargo / Função</label>
                    <input
                      type="text"
                      placeholder="Ex: Corretor Especialista"
                      value={newRoleLabel}
                      onChange={e => setNewRoleLabel(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#3A403A]/70 mb-1">CRECI</label>
                    <input
                      type="text"
                      placeholder="Ex: CRECI 45.123-F"
                      value={newCreci}
                      onChange={e => setNewCreci(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#344E41] hover:bg-[#283d33] text-white text-xs font-semibold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Check className="w-3.5 h-3.5 text-[#A3B18A]" />
                    <span>Salvar e Alternar para este Usuário</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-2.5">
                {users.map(u => {
                  const isCurrent = u.id === currentUser.id;
                  const allowedModules = rolePermissions[u.role]?.allowedModules || [];

                  return (
                    <div
                      key={u.id}
                      onClick={() => handleSelectUser(u.id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        isCurrent
                          ? 'border-[#344E41] bg-[#A3B18A]/10 shadow-2xs'
                          : 'border-[#EAE7E2] bg-white hover:border-[#A3B18A] hover:bg-[#FDFCFB]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl text-white flex items-center justify-center font-bold text-xs shadow-2xs shrink-0"
                          style={{ backgroundColor: u.avatarColor || '#344E41' }}
                        >
                          {u.initials}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-[#344E41]">{u.name}</span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                u.role === 'admin'
                                  ? 'bg-[#344E41] text-[#E9EDC9]'
                                  : 'bg-[#EAE7E2] text-[#3A403A]'
                              }`}
                            >
                              {u.role === 'admin' ? 'Admin' : 'Corretor'}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#3A403A]/60">
                            {u.roleLabel} • {allowedModules.length} módulos liberados
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isCurrent ? (
                          <span className="w-6 h-6 rounded-full bg-[#344E41] text-white flex items-center justify-center text-xs">
                            <Check className="w-3.5 h-3.5 text-[#E9EDC9]" />
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="text-xs px-3 py-1.5 rounded-xl border border-[#EAE7E2] hover:bg-[#344E41] hover:text-white hover:border-[#344E41] font-semibold text-[#3A403A] transition-colors"
                          >
                            Alternar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Link to Permissions Settings */}
          {currentUser.role === 'admin' && (
            <div className="p-4 bg-[#F1EFEC]/80 border border-[#EAE7E2] rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#344E41]">Configurar Permissões dos Módulos</p>
                <p className="text-[11px] text-[#3A403A]/60">
                  Defina quais telas os corretores podem acessar em Configurações.
                </p>
              </div>
              <button
                onClick={() => {
                  setIsRoleSwitcherOpen(false);
                  setActiveView('settings');
                }}
                className="px-3 py-1.5 bg-white border border-[#EAE7E2] hover:border-[#344E41] text-xs font-semibold text-[#344E41] rounded-xl transition-colors"
              >
                Abrir Matriz de Acessos
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#EAE7E2] bg-[#F4F1EA]/40 flex justify-end">
          <button
            onClick={() => setIsRoleSwitcherOpen(false)}
            className="px-4 py-2 bg-[#344E41] hover:bg-[#283d33] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
