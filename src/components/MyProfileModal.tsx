import React, { useState } from 'react';
import { X, UserCircle, Check, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { useCrm } from '../context/CrmContext';
import { crmApi } from '../services/api';
import { useEscapeToClose } from '../hooks/useEscapeToClose';

const AVATAR_COLORS = ['#344E41', '#588157', '#A3B18A', '#3A5A40', '#6B4226', '#7C4A3D', '#4A5859', '#5C4B8A'];

export const MyProfileModal: React.FC = () => {
  const { isMyProfileModalOpen, setIsMyProfileModalOpen, currentUser, updateUser, authToken } = useCrm();

  const [name, setName] = useState(currentUser.name);
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [creci, setCreci] = useState(currentUser.creci || '');
  const [avatarColor, setAvatarColor] = useState(currentUser.avatarColor || '#344E41');
  const [profileSaved, setProfileSaved] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  useEscapeToClose(() => setIsMyProfileModalOpen(false), isMyProfileModalOpen);

  if (!isMyProfileModalOpen) return null;

  const initials = name
    .split(' ')
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toUpperCase();

  const handleClose = () => {
    setIsMyProfileModalOpen(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setPasswordSuccess(false);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser(currentUser.id, {
      name: name.trim() || currentUser.name,
      phone: phone.trim(),
      creci: creci.trim(),
      avatarColor,
      initials: initials || currentUser.initials
    });
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (!currentPassword) {
      setPasswordError('Informe sua senha atual');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('A nova senha precisa ter ao menos 6 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('As senhas não coincidem');
      return;
    }
    if (!authToken) return;

    setIsChangingPassword(true);
    try {
      await crmApi.setPassword(authToken, currentUser.id, newPassword, currentPassword);
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.message || 'Não foi possível trocar a senha');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3E4A3D]/40 backdrop-blur-xs animate-in fade-in duration-150" onClick={handleClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-[#EAE7E2] overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-[#EAE7E2] bg-[#F4F1EA]/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl text-white flex items-center justify-center font-bold shadow-2xs"
              style={{ backgroundColor: avatarColor }}
            >
              {initials || <UserCircle className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-serif-title text-lg font-bold text-[#344E41]">Meu Perfil</h3>
              <p className="text-xs text-[#3A403A]/60">Seus dados pessoais e senha de acesso.</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-[#3A403A]/40 hover:text-[#344E41] rounded-lg hover:bg-[#EAE7E2]/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-6">
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <h4 className="text-[11px] font-bold text-[#3A403A]/70 uppercase tracking-wider">Dados pessoais</h4>

            <div>
              <label className="block text-[11px] font-bold text-[#3A403A]/70 mb-1">Nome completo</label>
              <input
                required
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full text-xs p-2.5 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#3A403A]/70 mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+55 (11) 98765-4321"
                  className="w-full text-xs p-2.5 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#3A403A]/70 mb-1">Registro CRECI</label>
                <input
                  type="text"
                  value={creci}
                  onChange={e => setCreci(e.target.value)}
                  placeholder="CRECI 24.512-F"
                  className="w-full text-xs p-2.5 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#3A403A]/70 mb-1">Cor do avatar</label>
              <div className="flex items-center gap-2 flex-wrap">
                {AVATAR_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setAvatarColor(color)}
                    className={`w-7 h-7 rounded-lg transition-transform ${avatarColor === color ? 'ring-2 ring-offset-2 ring-[#344E41] scale-105' : ''}`}
                    style={{ backgroundColor: color }}
                    aria-label={`Cor ${color}`}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="submit"
                className="px-4 py-2 bg-[#344E41] hover:bg-[#283d33] text-white text-xs rounded-xl font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
              >
                {profileSaved ? <Check className="w-3.5 h-3.5" /> : null}
                <span>{profileSaved ? 'Salvo!' : 'Salvar dados'}</span>
              </button>
            </div>
          </form>

          <div className="border-t border-[#EAE7E2] pt-6">
            <form onSubmit={handleChangePassword} className="space-y-4">
              <h4 className="text-[11px] font-bold text-[#3A403A]/70 uppercase tracking-wider">Alterar senha</h4>

              {passwordError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-[11px] text-rose-800">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{passwordError}</span>
                </div>
              )}
              {passwordSuccess && (
                <div className="p-2.5 bg-[#A3B18A]/10 border border-[#A3B18A]/30 rounded-xl flex items-start gap-2 text-[11px] text-[#344E41]">
                  <Check className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#588157]" />
                  <span>Senha alterada com sucesso!</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-[#3A403A]/70 mb-1">Senha atual</label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-[#588157] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    className="w-full text-xs pl-8 pr-2.5 py-2.5 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#3A403A]/70 mb-1">Nova senha</label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-[#588157] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      minLength={6}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full text-xs pl-8 pr-2.5 py-2.5 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#3A403A]/70 mb-1">Confirmar</label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-[#588157] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Repita a senha"
                      className="w-full text-xs pl-8 pr-2.5 py-2.5 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-1">
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="px-4 py-2 bg-[#344E41] hover:bg-[#283d33] disabled:opacity-60 text-white text-xs rounded-xl font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
                >
                  {isChangingPassword ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5 text-[#A3B18A]" />}
                  <span>{isChangingPassword ? 'Alterando...' : 'Alterar senha'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
