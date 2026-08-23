import React, { useEffect, useState } from 'react';
import { Lock, Mail, LogIn, UserPlus, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { useCrm } from '../context/CrmContext';
import { crmApi } from '../services/api';
import { UserRole } from '../types';

const ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Administrador',
  broker: 'Corretor'
};

export const LoginView: React.FC = () => {
  const { login, firstAccess, settings } = useCrm();

  const [mode, setMode] = useState<'login' | 'first-access'>('login');
  const [pendingUsers, setPendingUsers] = useState<{ id: string; name: string; role: UserRole }[]>([]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [firstAccessUserId, setFirstAccessUserId] = useState('');
  const [firstAccessEmail, setFirstAccessEmail] = useState('');
  const [firstAccessPassword, setFirstAccessPassword] = useState('');
  const [firstAccessConfirm, setFirstAccessConfirm] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    crmApi.authSetupStatus()
      .then(({ pendingUsers }) => {
        setPendingUsers(pendingUsers);
        if (pendingUsers.length > 0) {
          setMode('first-access');
          setFirstAccessUserId(pendingUsers[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      if (err.code === 'NO_PASSWORD_SET') {
        setError('Essa conta ainda não tem senha configurada. Use "Primeiro acesso" abaixo.');
        setMode('first-access');
        setFirstAccessEmail(email.trim());
      } else {
        setError(err.message || 'Não foi possível entrar');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFirstAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (firstAccessPassword.length < 6) {
      setError('A senha precisa ter ao menos 6 caracteres');
      return;
    }
    if (firstAccessPassword !== firstAccessConfirm) {
      setError('As senhas não coincidem');
      return;
    }

    setIsSubmitting(true);
    try {
      await firstAccess({
        userId: firstAccessUserId || undefined,
        email: firstAccessEmail.trim() || undefined,
        password: firstAccessPassword
      });
    } catch (err: any) {
      setError(err.message || 'Não foi possível configurar a senha');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedPendingUser = pendingUsers.find(u => u.id === firstAccessUserId);

  return (
    <div className="min-h-screen bg-[#3E4A3D] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-[#EAE7E2] overflow-hidden">
        {/* Brand Header */}
        <div className="px-8 pt-8 pb-6 text-center bg-[#F4F1EA]/60 border-b border-[#EAE7E2]">
          <div className="w-12 h-12 rounded-2xl bg-[#344E41] flex items-center justify-center text-white mx-auto mb-3 shadow-xs">
            <span className="font-serif-title font-bold text-xl leading-none">
              {settings.companyName.charAt(0) || 'A'}
            </span>
          </div>
          <h1 className="font-serif-title text-xl font-bold text-[#344E41]">
            {settings.companyName || 'Aurum CRM'}
          </h1>
          <p className="text-xs text-[#3A403A]/60 mt-1">
            {mode === 'login' ? 'Entre com sua conta' : 'Configure a senha da sua conta'}
          </p>
        </div>

        <div className="p-8 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-[#3A403A]/70 mb-1 uppercase tracking-wider">E-mail</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#588157] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    required
                    type="email"
                    autoFocus
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="voce@empresa.com.br"
                    className="w-full text-sm pl-9 pr-3 py-2.5 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#3A403A]/70 mb-1 uppercase tracking-wider">Senha</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#588157] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    required
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full text-sm pl-9 pr-3 py-2.5 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#344E41] hover:bg-[#283d33] text-white rounded-xl text-sm font-semibold shadow-xs transition-colors disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4 text-[#A3B18A]" />}
                <span>{isSubmitting ? 'Entrando...' : 'Entrar'}</span>
              </button>

              <button
                type="button"
                onClick={() => { setError(''); setMode('first-access'); }}
                className="w-full text-xs text-[#588157] hover:text-[#344E41] font-semibold hover:underline"
              >
                Primeiro acesso? Configure sua senha
              </button>
            </form>
          ) : (
            <form onSubmit={handleFirstAccess} className="space-y-4">
              {pendingUsers.length > 0 && (
                <div className="p-3 bg-[#A3B18A]/10 border border-[#A3B18A]/30 rounded-xl flex items-start gap-2 text-xs text-[#344E41]">
                  <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-[#588157]" />
                  <span>Escolha sua conta abaixo e crie sua senha. Isso só é necessário uma vez.</span>
                </div>
              )}

              {pendingUsers.length > 0 && (
                <div>
                  <label className="block text-[11px] font-bold text-[#3A403A]/70 mb-1 uppercase tracking-wider">Sua conta</label>
                  <select
                    value={firstAccessUserId}
                    onChange={e => setFirstAccessUserId(e.target.value)}
                    className="w-full text-sm px-3 py-2.5 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
                  >
                    {pendingUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({ROLE_LABEL[u.role]})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-[#3A403A]/70 mb-1 uppercase tracking-wider">E-mail</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#588157] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    required
                    type="email"
                    value={firstAccessEmail}
                    onChange={e => setFirstAccessEmail(e.target.value)}
                    placeholder="voce@empresa.com.br"
                    className="w-full text-sm pl-9 pr-3 py-2.5 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
                  />
                </div>
                {selectedPendingUser && (
                  <p className="text-[10px] text-[#3A403A]/50 mt-1">Esse será o e-mail de login de {selectedPendingUser.name}.</p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#3A403A]/70 mb-1 uppercase tracking-wider">Nova senha</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#588157] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    required
                    type="password"
                    minLength={6}
                    value={firstAccessPassword}
                    onChange={e => setFirstAccessPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full text-sm pl-9 pr-3 py-2.5 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#3A403A]/70 mb-1 uppercase tracking-wider">Confirmar senha</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#588157] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    required
                    type="password"
                    value={firstAccessConfirm}
                    onChange={e => setFirstAccessConfirm(e.target.value)}
                    placeholder="Repita a senha"
                    className="w-full text-sm pl-9 pr-3 py-2.5 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#344E41] hover:bg-[#283d33] text-white rounded-xl text-sm font-semibold shadow-xs transition-colors disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4 text-[#A3B18A]" />}
                <span>{isSubmitting ? 'Configurando...' : 'Criar senha e entrar'}</span>
              </button>

              <button
                type="button"
                onClick={() => { setError(''); setMode('login'); }}
                className="w-full text-xs text-[#588157] hover:text-[#344E41] font-semibold hover:underline"
              >
                Já tenho senha, quero entrar
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
