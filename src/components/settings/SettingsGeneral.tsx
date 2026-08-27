import React, { useState } from 'react';
import { RotateCcw, Trash2, MessageSquare, BellRing, BellOff, Lock } from 'lucide-react';
import { useCrm } from '../../context/CrmContext';
import { DEFAULT_SETTINGS } from '../../data/initialData';
import { FIXED_COMPANY_NAME } from '../../types';
import { useSettingsNotification } from './SettingsNotification';
import { SaveBar } from './SaveBar';
import { useSaveState } from '../../hooks/useSaveState';
import { useConfirmDanger } from '../ConfirmDangerModal';

export const ProfileSection: React.FC = () => {
  // Note: this section is company-facing info (name shown on proposals,
  // "assinado por" line, etc), not the logged-in user's own account — that
  // now lives in MyProfileModal (Header → clique no seu perfil), which
  // edits the real UserProfile record directly instead of this form
  // guessing at it via a hardcoded user id (a past bug: editing here used
  // to silently blank out the admin's login email).
  const { settings, updateSettings } = useCrm();
  const showNotification = useSettingsNotification();
  const { state, markDirty, save, reset } = useSaveState();

  const [slogan, setSlogan] = useState(settings.slogan);
  const [brokerName, setBrokerName] = useState(settings.brokerName);
  const [brokerRole, setBrokerRole] = useState(settings.brokerRole);
  const [brokerInitials, setBrokerInitials] = useState(settings.brokerInitials);
  const [creci, setCreci] = useState(settings.creci);
  const [brokerPhone, setBrokerPhone] = useState(settings.brokerPhone);
  const [brokerEmail, setBrokerEmail] = useState(settings.brokerEmail);

  const field = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    markDirty();
  };

  const handleDiscard = () => {
    setSlogan(settings.slogan);
    setBrokerName(settings.brokerName);
    setBrokerRole(settings.brokerRole);
    setBrokerInitials(settings.brokerInitials);
    setCreci(settings.creci);
    setBrokerPhone(settings.brokerPhone);
    setBrokerEmail(settings.brokerEmail);
    reset();
  };

  const handleSaveProfile = (e?: React.FormEvent) => {
    e?.preventDefault();
    save(() => {
      updateSettings({ slogan, brokerName, brokerRole, brokerInitials, creci, brokerPhone, brokerEmail });
      showNotification('Dados da imobiliária salvos com sucesso!');
    });
  };

  return (
    <section className="bg-white rounded-2xl p-6 border border-[#EAE7E2] shadow-2xs space-y-5 animate-in fade-in duration-150">
      <h3 className="font-serif-title text-lg font-semibold text-[#344E41] border-b border-[#EAE7E2] pb-3">
        Dados da Imobiliária e do Corretor
      </h3>

      <form onSubmit={handleSaveProfile} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#3A403A]/70 mb-1">
              Nome da Empresa / Marca
            </label>
            <div className="w-full text-xs p-2.5 bg-[#F1EFEC] border border-[#EAE7E2] rounded-xl text-[#3A403A]/70 flex items-center justify-between gap-2">
              <span className="font-semibold text-[#3A403A]">{FIXED_COMPANY_NAME}</span>
              <Lock className="w-3.5 h-3.5 text-[#3A403A]/40 shrink-0" />
            </div>
            <p className="text-[10px] text-[#3A403A]/40 mt-1">
              Nome fixo da plataforma — não pode ser alterado para o de outra imobiliária.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#3A403A]/70 mb-1">
              Slogan / Subtítulo
            </label>
            <input
              type="text"
              maxLength={80}
              value={slogan}
              onChange={e => field(setSlogan)(e.target.value)}
              className="w-full text-xs p-2.5 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
            />
            <p className="text-[10px] text-[#3A403A]/40 mt-1 text-right">{slogan.length}/80</p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#3A403A]/70 mb-1">
              Nome do Profissional Responsável
            </label>
            <input
              type="text"
              value={brokerName}
              onChange={e => field(setBrokerName)(e.target.value)}
              className="w-full text-xs p-2.5 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#3A403A]/70 mb-1">
              Iniciais (Avatar)
            </label>
            <input
              type="text"
              maxLength={3}
              value={brokerInitials}
              onChange={e => field(setBrokerInitials)(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
              className="w-full text-xs p-2.5 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#3A403A]/70 mb-1">
              Cargo / Função
            </label>
            <input
              type="text"
              value={brokerRole}
              onChange={e => field(setBrokerRole)(e.target.value)}
              className="w-full text-xs p-2.5 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#3A403A]/70 mb-1">
              Registro CRECI
            </label>
            <input
              type="text"
              value={creci}
              onChange={e => field(setCreci)(e.target.value)}
              className="w-full text-xs p-2.5 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#3A403A]/70 mb-1">
              WhatsApp Profissional
            </label>
            <input
              type="text"
              value={brokerPhone}
              onChange={e => field(setBrokerPhone)(e.target.value)}
              placeholder="(11) 98765-4321"
              className="w-full text-xs p-2.5 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#3A403A]/70 mb-1">
              E-mail de Contato
            </label>
            <input
              type="email"
              value={brokerEmail}
              onChange={e => field(setBrokerEmail)(e.target.value)}
              className="w-full text-xs p-2.5 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
            />
          </div>
        </div>

        <div className="pt-3">
          <SaveBar state={state} onSave={() => handleSaveProfile()} onDiscard={handleDiscard} saveLabel="Salvar Dados do Perfil" />
        </div>
      </form>
    </section>
  );
};

export const RemindersSection: React.FC = () => {
  const { settings, updateSettings } = useCrm();
  const showNotification = useSettingsNotification();
  const { state, markDirty, save, reset } = useSaveState();

  const [alertsEnabled, setAlertsEnabled] = useState(settings.alertsEnabled);
  const [defaultReminder, setDefaultReminder] = useState(settings.defaultReminderAdvance);
  const [birthdayTemplate, setBirthdayTemplate] = useState(settings.birthdayTemplate);
  const [companyName] = useState(settings.companyName);
  const [brokerName] = useState(settings.brokerName);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(
    'Notification' in window ? Notification.permission : 'unsupported'
  );

  const handleDiscard = () => {
    setAlertsEnabled(settings.alertsEnabled);
    setDefaultReminder(settings.defaultReminderAdvance);
    setBirthdayTemplate(settings.birthdayTemplate);
    reset();
  };

  const handleSave = (e?: React.FormEvent) => {
    e?.preventDefault();
    save(() => {
      updateSettings({ alertsEnabled, defaultReminderAdvance: defaultReminder, birthdayTemplate });
      showNotification('Lembretes e alertas salvos com sucesso!');
    });
  };

  const handleRestoreBirthdayDefault = () => {
    setBirthdayTemplate(DEFAULT_SETTINGS.birthdayTemplate);
    markDirty();
  };

  // "Ativar" requests browser permission (only meaningful once); "Testar" fires
  // a sample notification. These used to both call the same handler, so
  // clicking "Ativar" after permission was already granted silently fired a
  // test notification instead, and "Testar" before granting did nothing.
  const handleEnableNotifications = () => {
    if (!('Notification' in window)) {
      showNotification('Seu navegador não suporta notificações de desktop nativas.', 'warning');
      return;
    }
    if (Notification.permission === 'granted') {
      setNotificationPermission('granted');
      showNotification('Notificações do navegador já estão ativadas.', 'info');
      return;
    }
    Notification.requestPermission().then(permission => {
      setNotificationPermission(permission);
      if (permission === 'granted') {
        new Notification('AURUM CRM', { body: 'Notificações ativadas com sucesso no seu navegador!' });
      } else {
        showNotification('Permissão de notificações negada pelo navegador.', 'warning');
      }
    });
  };

  const handleTestNotification = () => {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      showNotification('Ative as notificações do navegador antes de testar.', 'warning');
      return;
    }
    new Notification('AURUM CRM', { body: 'Lembrete de follow-up: Você tem uma atividade agendada para agora!' });
  };

  const previewBirthdayText = birthdayTemplate
    .replace(/\{primeiro_nome\}/g, 'Maria')
    .replace(/\{nome\}/g, 'Maria Aparecida')
    .replace(/\{empresa\}/g, companyName)
    .replace(/\{corretor\}/g, brokerName)
    .replace(/\{assinatura\}/g, `${brokerName} — ${companyName}`);

  const REQUIRED_VARS = ['{primeiro_nome}'];
  const missingRequiredVars = REQUIRED_VARS.filter(v => !birthdayTemplate.includes(v));

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <section className="bg-white rounded-2xl p-6 border border-[#EAE7E2] shadow-2xs space-y-6">
        <h3 className="font-serif-title text-lg font-semibold text-[#344E41] border-b border-[#EAE7E2] pb-3">
          Lembretes de follow-up & Notificações
        </h3>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#344E41]">Alertas ativados</p>
            <p className="text-[11px] text-[#3A403A]/60 mt-0.5">
              Quando desligado, você não recebe notificações no sino nem no navegador.
            </p>
          </div>
          <button
            onClick={() => {
              setAlertsEnabled(!alertsEnabled);
              markDirty();
            }}
            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
              alertsEnabled ? 'bg-[#344E41] justify-end' : 'bg-[#EAE7E2] justify-start'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
          </button>
        </div>

        <div className="space-y-1.5 max-w-xs">
          <label className="block text-xs font-bold uppercase tracking-widest text-[#3A403A]/70">
            Antecedência padrão do lembrete
          </label>
          <select
            value={defaultReminder}
            onChange={e => {
              setDefaultReminder(e.target.value);
              markDirty();
            }}
            className="w-full text-xs bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl p-2.5 text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
          >
            <option value="15 minutos antes">15 minutos antes</option>
            <option value="30 minutos antes">30 minutos antes</option>
            <option value="1 hora antes">1 hora antes</option>
            <option value="1 dia antes">1 dia antes</option>
            <option value="1 semana antes">1 semana antes</option>
          </select>
        </div>

        <div className="pt-2">
          <p className="text-xs font-semibold text-[#344E41]">Alertas do navegador</p>
          {notificationPermission === 'granted' ? (
            <p className="text-[11px] text-emerald-700 mt-0.5 flex items-center gap-1 font-medium">
              <BellRing className="w-3 h-3" /> Ativadas
            </p>
          ) : (
            <p className="text-[11px] text-[#3A403A]/60 mt-0.5 flex items-center gap-1">
              <BellOff className="w-3 h-3" /> Não configuradas — receba notificações nativas mesmo com o CRM em outra aba.
            </p>
          )}
          <div className="flex items-center gap-2.5 mt-3">
            {notificationPermission !== 'granted' ? (
              <button
                onClick={handleEnableNotifications}
                className="px-3.5 py-2 text-xs font-medium text-[#3A403A] bg-[#F1EFEC] hover:bg-[#EAE7E2] border border-[#EAE7E2] rounded-xl transition-colors"
              >
                Ativar notificações do navegador
              </button>
            ) : (
              <button
                onClick={handleTestNotification}
                className="px-3.5 py-2 text-xs font-medium text-[#3A403A] bg-[#F1EFEC] hover:bg-[#EAE7E2] border border-[#EAE7E2] rounded-xl transition-colors"
              >
                Enviar notificação de teste
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Mensagem de aniversário (WhatsApp) */}
      <section className="bg-white rounded-2xl p-6 border border-[#EAE7E2] shadow-2xs space-y-5">
        <div className="flex items-center justify-between border-b border-[#EAE7E2] pb-3">
          <h3 className="font-serif-title text-lg font-semibold text-[#344E41]">
            Mensagem de Aniversário (WhatsApp)
          </h3>
          <span className="text-xs text-[#588157] font-semibold flex items-center gap-1.5 bg-[#A3B18A]/15 px-3 py-1 rounded-full border border-[#A3B18A]/30">
            <MessageSquare className="w-3.5 h-3.5" /> Automação WhatsApp
          </span>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[#3A403A]">
            Modelo de mensagem de felicitação
          </label>
          <textarea
            rows={7}
            value={birthdayTemplate}
            onChange={e => {
              setBirthdayTemplate(e.target.value);
              markDirty();
            }}
            className="w-full font-mono text-xs p-3.5 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
          />
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-[#3A403A]/60 font-mono">
              Variáveis disponíveis:{' '}
              <code className="text-[#344E41] bg-[#A3B18A]/20 px-1 py-0.5 rounded font-semibold">{'{primeiro_nome}'}</code>{' '}
              <code className="text-[#344E41] bg-[#A3B18A]/20 px-1 py-0.5 rounded font-semibold">{'{nome}'}</code>{' '}
              <code className="text-[#344E41] bg-[#A3B18A]/20 px-1 py-0.5 rounded font-semibold">{'{corretor}'}</code>{' '}
              <code className="text-[#344E41] bg-[#A3B18A]/20 px-1 py-0.5 rounded font-semibold">{'{empresa}'}</code>{' '}
              <code className="text-[#344E41] bg-[#A3B18A]/20 px-1 py-0.5 rounded font-semibold">{'{assinatura}'}</code>
            </p>
            <p className="text-[10px] text-[#3A403A]/40">{birthdayTemplate.length} caracteres</p>
          </div>
          {missingRequiredVars.length > 0 && (
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
              ⚠ Variável obrigatória ausente: <code className="font-mono font-semibold">{missingRequiredVars.join(', ')}</code> — a mensagem sairá sem o nome do cliente.
            </p>
          )}
        </div>

        <div className="p-4 bg-[#F1EFEC]/60 border border-[#EAE7E2] rounded-xl space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#3A403A]/60">
            PRÉ-VISUALIZAÇÃO AO VIVO
          </span>
          <div className="bg-white p-4 rounded-xl border border-[#EAE7E2] text-xs text-[#3A403A] whitespace-pre-line leading-relaxed shadow-2xs">
            {previewBirthdayText}
          </div>
        </div>

        <div className="flex items-center gap-2.5 pt-2 flex-wrap">
          <button
            type="button"
            onClick={handleRestoreBirthdayDefault}
            className="px-4 py-2.5 bg-[#F1EFEC] hover:bg-[#EAE7E2] text-[#3A403A] rounded-xl text-xs font-medium border border-[#EAE7E2] transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar padrão</span>
          </button>
          <SaveBar state={state} onSave={handleSave} onDiscard={handleDiscard} saveLabel="Salvar alterações" />
        </div>
      </section>
    </div>
  );
};

export const DataSection: React.FC = () => {
  const { resetToDemoData, clearAllData } = useCrm();
  const showNotification = useSettingsNotification();
  const { modal, requestConfirm } = useConfirmDanger();

  return (
    <section className="bg-white rounded-2xl p-6 border border-[#EAE7E2] shadow-2xs space-y-4 animate-in fade-in duration-150">
      <h3 className="font-serif-title text-lg font-semibold text-[#344E41] border-b border-[#EAE7E2] pb-3">
        Gerenciamento da Base de Dados
      </h3>
      <p className="text-xs text-[#3A403A]/70">
        Você pode restaurar a qualquer momento os dados de demonstração com imóveis de alto padrão, contatos e comissões, ou limpar os registros para iniciar uma operação real.
      </p>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          onClick={() =>
            requestConfirm({
              title: 'Restaurar dados de demonstração',
              description:
                'Substitui leads, contratos, comissões e perfis de acesso pelos dados de exemplo do Aurum CRM. Seus registros reais atuais serão perdidos.',
              confirmLabel: 'Restaurar demonstração',
              tone: 'default',
              onConfirm: () => {
                resetToDemoData();
                showNotification('Dados de demonstração e acessos restaurados com sucesso!');
              }
            })
          }
          className="px-4 py-2.5 text-xs font-semibold text-[#344E41] bg-[#A3B18A]/20 hover:bg-[#A3B18A]/35 border border-[#A3B18A]/40 rounded-xl transition-colors flex items-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5 text-[#588157]" />
          <span>Restaurar dados e perfis de demonstração</span>
        </button>

        <button
          onClick={() =>
            requestConfirm({
              title: 'Limpar todos os dados',
              description:
                'Apaga permanentemente todos os leads, atividades e contratos cadastrados. Esta ação não pode ser desfeita.',
              confirmLabel: 'Apagar tudo',
              tone: 'critical',
              typedConfirmation: 'APAGAR TUDO',
              onConfirm: () => {
                clearAllData();
                showNotification('Registros limpos com sucesso.');
              }
            })
          }
          className="px-4 py-2.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors flex items-center gap-1.5"
        >
          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
          <span>Limpar todos os dados</span>
        </button>
      </div>

      {modal}
    </section>
  );
};
