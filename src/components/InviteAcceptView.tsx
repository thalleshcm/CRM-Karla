import React, { useEffect, useState } from 'react';
import { Lock, UserPlus, ShieldCheck, AlertCircle, Loader2, XCircle } from 'lucide-react';
import { useCrm } from '../context/CrmContext';
import { crmApi } from '../services/api';

interface InviteAcceptViewProps {
  token: string;
  onDone: () => void;
}

export const InviteAcceptView: React.FC<InviteAcceptViewProps> = ({ token, onDone }) => {
  const { acceptInvite, settings } = useCrm();

  const [invite, setInvite] = useState<{ name: string; email: string; roleLabel: string } | null>(null);
  const [lookupError, setLookupError] = useState('');
  const [isLoadingInvite, setIsLoadingInvite] = useState(true);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    crmApi.getInviteByToken(token)
      .then(setInvite)
      .catch(err => setLookupError(err.message || 'Convite não encontrado'))
      .finally(() => setIsLoadingInvite(false));
  }, [token]);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('A senha precisa ter ao menos 6 caracteres');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    setIsSubmitting(true);
    try {
      await acceptInvite(token, password);
      onDone();
    } catch (err: any) {
      setError(err.message || 'Não foi possível criar sua conta');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#3E4A3D] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-[#EAE7E2] overflow-hidden">
        <div className="px-8 pt-8 pb-6 text-center bg-[#F4F1EA]/60 border-b border-[#EAE7E2]">
          <div className="w-12 h-12 rounded-2xl bg-[#344E41] flex items-center justify-center text-white mx-auto mb-3 shadow-xs">
            <span className="font-serif-title font-bold text-xl leading-none">
              {settings.companyName.charAt(0) || 'A'}
            </span>
          </div>
          <h1 className="font-serif-title text-xl font-bold text-[#344E41]">
            {settings.companyName || 'Aurum CRM'}
          </h1>
          <p className="text-xs text-[#3A403A]/60 mt-1">Você foi convidado para a equipe</p>
        </div>

        <div className="p-8 space-y-5">
          {isLoadingInvite && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-[#588157] animate-spin" />
            </div>
          )}

          {!isLoadingInvite && lookupError && (
            <div className="space-y-4">
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-sm text-rose-800">
                <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{lookupError}</span>
              </div>
              <p className="text-xs text-[#3A403A]/60 text-center">
                Peça ao administrador para gerar um novo link de convite.
              </p>
              <button
                type="button"
                onClick={onDone}
                className="w-full text-xs text-[#588157] hover:text-[#344E41] font-semibold hover:underline"
              >
                Ir para a tela de login
              </button>
            </div>
          )}

          {!isLoadingInvite && invite && (
            <form onSubmit={handleAccept} className="space-y-4">
              <div className="p-3 bg-[#A3B18A]/10 border border-[#A3B18A]/30 rounded-xl flex items-start gap-2 text-xs text-[#344E41]">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-[#588157]" />
                <span>
                  Bem-vindo(a), <strong>{invite.name}</strong>! Crie sua senha para ativar sua conta como {invite.roleLabel.toLowerCase()}.
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#3A403A]/70 mb-1 uppercase tracking-wider">E-mail de login</label>
                <input
                  disabled
                  value={invite.email}
                  className="w-full text-sm px-3 py-2.5 bg-[#F4F1EA] border border-[#EAE7E2] rounded-xl text-[#3A403A]/60"
                />
              </div>

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-800">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-[#3A403A]/70 mb-1 uppercase tracking-wider">Nova senha</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#588157] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    required
                    autoFocus
                    type="password"
                    minLength={6}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
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
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
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
                <span>{isSubmitting ? 'Criando conta...' : 'Criar conta e entrar'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
