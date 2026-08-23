import React, { useEffect, useRef, useState } from 'react';
import {
  Radio,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Plus,
  QrCode,
  Save,
  Webhook,
  Globe,
  Copy,
  Trash2,
  Bot,
  ShieldAlert,
  KeyRound,
  ChevronDown,
  ChevronUp,
  ShieldOff
} from 'lucide-react';
import { useCrm } from '../../context/CrmContext';
import { crmApi } from '../../services/api';
import { STAGES } from '../../data/initialData';
import { WebhookEvent } from '../../types';
import { useSettingsNotification } from './SettingsNotification';
import { useConfirmDanger } from '../ConfirmDangerModal';

const QR_TTL_SECONDS = 45;

export const EvolutionSection: React.FC = () => {
  const { settings, updateSettings } = useCrm();
  const showNotification = useSettingsNotification();
  const { modal, requestConfirm } = useConfirmDanger();

  const [evoUrl, setEvoUrl] = useState(settings.evolutionApiUrl || 'https://evolutionapi.thalleshcm.com.br');
  const [evoKey, setEvoKey] = useState(settings.evolutionApiKey || '');
  const [evoInstance, setEvoInstance] = useState(settings.evolutionInstance || 'aurum-crm');
  const [evoInstanceToken, setEvoInstanceToken] = useState(settings.evolutionInstanceToken || '');
  const [evoPhoneNumber, setEvoPhoneNumber] = useState(settings.evolutionPhoneNumber || '');
  const [evoEnabled, setEvoEnabled] = useState(settings.evolutionEnabled ?? true);
  const [evoAutoSend, setEvoAutoSend] = useState(settings.evolutionAutoSendOnMove ?? false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [evoTesting, setEvoTesting] = useState(false);
  const [evoStatus, setEvoStatus] = useState<{ connected: boolean; message: string } | null>(null);
  const [evoQrCode, setEvoQrCode] = useState<string | null>(null);
  const [evoPairingCode, setEvoPairingCode] = useState<string | null>(null);
  const [qrSecondsLeft, setQrSecondsLeft] = useState(0);
  const qrIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleSaveEvolutionConfig = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      evolutionApiUrl: evoUrl.trim(),
      evolutionApiKey: evoKey.trim(),
      evolutionInstance: evoInstance.trim(),
      evolutionInstanceToken: evoInstanceToken.trim(),
      evolutionPhoneNumber: evoPhoneNumber.trim(),
      evolutionEnabled: evoEnabled,
      evolutionAutoSendOnMove: evoAutoSend
    });
    showNotification('Configurações da Evolution API salvas com sucesso!');
  };

  const handleTestEvolutionConnection = async () => {
    setEvoTesting(true);
    setEvoStatus(null);
    try {
      const res = await crmApi.checkWhatsAppStatus();
      setEvoStatus(res);
    } catch (err: any) {
      setEvoStatus({ connected: false, message: err?.message || 'Falha ao testar conexão.' });
    } finally {
      setEvoTesting(false);
    }
  };

  const stopQrCountdown = () => {
    if (qrIntervalRef.current) {
      clearInterval(qrIntervalRef.current);
      qrIntervalRef.current = null;
    }
  };

  // QR codes from Evolution API expire quickly (~45s) — count down visibly
  // and fetch a fresh one automatically instead of showing a stale, dead
  // image the admin has no way of knowing has expired.
  const startQrCountdown = () => {
    stopQrCountdown();
    setQrSecondsLeft(QR_TTL_SECONDS);
    qrIntervalRef.current = setInterval(() => {
      setQrSecondsLeft(prev => {
        if (prev <= 1) {
          stopQrCountdown();
          handleFetchEvolutionQr(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => stopQrCountdown, []);

  const handleCreateEvolutionInstance = async () => {
    if (!evoKey.trim()) {
      showNotification('Por favor, informe a Chave Global da Evolution API (apikey) antes de criar a instância.', 'warning');
      return;
    }
    setEvoTesting(true);
    setEvoStatus(null);
    try {
      const result = await crmApi.createWhatsAppInstance(evoPhoneNumber.trim() || undefined);

      if (result.success) {
        if (result.instanceToken) {
          setEvoInstanceToken(result.instanceToken);
        }
        if (result.qrcode) {
          setEvoQrCode(result.qrcode);
          startQrCountdown();
        }
        setEvoStatus({
          connected: false,
          message: `Instância "${evoInstance}" criada no servidor Evolution API! Escaneie o QR Code para parear com o WhatsApp.`
        });
        showNotification(`Instância "${evoInstance}" criada com sucesso!`);
      } else {
        setEvoStatus({
          connected: false,
          message: `Falha ao criar instância: ${result.error || 'Erro desconhecido'}`
        });
      }
    } catch (err: any) {
      setEvoStatus({ connected: false, message: err?.message || 'Falha ao criar instância.' });
    } finally {
      setEvoTesting(false);
    }
  };

  const handleFetchEvolutionQr = async (isAutoRefresh = false) => {
    setEvoTesting(true);
    if (!isAutoRefresh) setEvoStatus(null);
    try {
      const data = await crmApi.getWhatsAppQrCode();
      if (data.base64) {
        setEvoQrCode(data.base64);
        if (data.pairingCode) setEvoPairingCode(data.pairingCode);
        setEvoStatus({
          connected: false,
          message: 'Escaneie o QR Code abaixo com o WhatsApp do seu aparelho para conectar a instância.'
        });
        startQrCountdown();
      } else {
        setEvoStatus({
          connected: false,
          message: data.message || data.error || 'QR Code não disponível (a instância pode já estar conectada).'
        });
        if (!isAutoRefresh) {
          setEvoQrCode(null);
          stopQrCountdown();
        }
      }
    } catch (err: any) {
      setEvoStatus({ connected: false, message: err?.message || 'Falha ao buscar QR Code.' });
      if (!isAutoRefresh) {
        setEvoQrCode(null);
        stopQrCountdown();
      }
    } finally {
      setEvoTesting(false);
    }
  };

  const handleLogoutInstance = () => {
    requestConfirm({
      title: 'Desconectar WhatsApp',
      description: `Desconecta a sessão do WhatsApp pareada na instância "${evoInstance}". A instância continua existindo — você pode reconectar gerando um novo QR Code.`,
      confirmLabel: 'Desconectar',
      tone: 'default',
      onConfirm: async () => {
        setEvoTesting(true);
        const result = await crmApi.logoutWhatsAppInstance();
        if (result.success) {
          setEvoStatus({
            connected: false,
            message: `Instância "${evoInstance}" desconectada. Gere um novo QR Code para reconectar.`
          });
          setEvoQrCode(null);
          stopQrCountdown();
          showNotification('Instância WhatsApp desconectada.');
        } else {
          showNotification(`Erro ao desconectar: ${result.error}`, 'error');
        }
        setEvoTesting(false);
      }
    });
  };

  const handleDeleteInstance = () => {
    requestConfirm({
      title: 'Excluir instância do WhatsApp',
      description: `Apaga permanentemente a instância "${evoInstance}" do servidor Evolution API, junto com o pareamento e o token associado. Você precisará criar uma nova instância e escanear o QR Code de novo para reconectar.`,
      confirmLabel: 'Excluir instância',
      tone: 'critical',
      typedConfirmation: 'EXCLUIR',
      onConfirm: async () => {
        setEvoTesting(true);
        const result = await crmApi.deleteWhatsAppInstance();
        if (result.success) {
          setEvoStatus({ connected: false, message: `Instância "${evoInstance}" deletada do servidor.` });
          setEvoQrCode(null);
          stopQrCountdown();
          setEvoInstanceToken('');
          updateSettings({ evolutionInstanceToken: '' });
          showNotification('Instância removida com sucesso.');
        } else {
          showNotification(`Erro ao deletar: ${result.error}`, 'error');
        }
        setEvoTesting(false);
      }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Business-language primary view — the Evolution API / instance /
          token vocabulary lives only inside "Configurações avançadas" below,
          matching the doc's "usuário configura WhatsApp, não infraestrutura". */}
      <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-[#344E41] text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
            <h3 className="font-serif-title text-base font-bold text-white">WhatsApp</h3>
          </div>
          <p className="text-xs text-emerald-100/80 max-w-2xl">
            Conecte um número de WhatsApp para enviar mensagens direto pelo CRM, sem depender de janelas manuais no celular.
          </p>
          {evoPhoneNumber && (
            <p className="text-xs text-emerald-200 font-mono pt-1">+{evoPhoneNumber}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleTestEvolutionConnection}
            disabled={evoTesting}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${evoTesting ? 'animate-spin' : ''}`} />
            <span>{evoTesting ? 'Testando...' : 'Testar Conexão'}</span>
          </button>
        </div>
      </div>

      {evoStatus && (
        <div
          className={`p-4 rounded-2xl border flex items-start gap-3 text-xs ${
            evoStatus.connected
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-amber-50 border-amber-300 text-amber-900'
          }`}
        >
          {evoStatus.connected ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1">
            <p className="font-bold">{evoStatus.connected ? '🟢 Conectado' : 'Aviso da conexão:'}</p>
            <p className="leading-relaxed">{evoStatus.message}</p>
          </div>
        </div>
      )}

      <section className="bg-white rounded-2xl p-6 border border-[#EAE7E2] shadow-2xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="font-serif-title text-base font-semibold text-[#344E41]">Conexão</h3>
            <p className="text-xs text-[#3A403A]/60">Gere um QR Code e escaneie com o WhatsApp do celular para parear.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleCreateEvolutionInstance}
              disabled={evoTesting}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova conexão</span>
            </button>
            <button
              type="button"
              onClick={() => handleFetchEvolutionQr(false)}
              disabled={evoTesting}
              className="px-3.5 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <QrCode className="w-3.5 h-3.5 text-emerald-800" />
              <span>Gerar QR Code</span>
            </button>
            <button
              type="button"
              onClick={handleLogoutInstance}
              disabled={evoTesting}
              className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-medium transition cursor-pointer disabled:opacity-50"
            >
              Desconectar
            </button>
          </div>
        </div>

        {evoQrCode && (
          <div className="p-6 bg-slate-900 text-white rounded-2xl text-center space-y-3 animate-in fade-in">
            <div className="flex items-center justify-center gap-2 text-emerald-400">
              <QrCode className="w-5 h-5" />
              <h4 className="font-bold text-sm">Pareamento do WhatsApp via QR Code</h4>
            </div>
            <p className="text-xs text-slate-300 max-w-md mx-auto">
              Abra o WhatsApp no seu celular &gt; Menu dos 3 pontos &gt; <strong>Aparelhos conectados</strong> &gt; <strong>Conectar um aparelho</strong> e aponte para a imagem abaixo:
            </p>
            <div className="bg-white p-4 rounded-2xl inline-block shadow-lg mx-auto">
              <img src={evoQrCode} alt="Evolution API QR Code" className="w-56 h-56 object-contain" />
            </div>
            <p className={`text-xs font-mono ${qrSecondsLeft <= 10 ? 'text-amber-400' : 'text-slate-400'}`}>
              {qrSecondsLeft > 0 ? `Expira em ${qrSecondsLeft}s — atualiza automaticamente` : 'Atualizando QR Code...'}
            </p>
            {evoPairingCode && (
              <div className="text-xs text-slate-300">
                Código de pareamento: <strong className="font-mono text-emerald-400 bg-slate-800 px-2 py-1 rounded">{evoPairingCode}</strong>
              </div>
            )}
            <div>
              <button
                onClick={() => {
                  setEvoQrCode(null);
                  stopQrCountdown();
                }}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl transition cursor-pointer"
              >
                Fechar QR Code
              </button>
            </div>
          </div>
        )}

        <div className="pt-2 grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-[#EAE7E2]">
          <label className="flex items-center gap-2 p-3 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl cursor-pointer hover:bg-[#F4F1EA]/50 transition">
            <input
              type="checkbox"
              checked={evoEnabled}
              onChange={e => {
                setEvoEnabled(e.target.checked);
                updateSettings({ evolutionEnabled: e.target.checked });
              }}
              className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
            />
            <div>
              <span className="text-xs font-bold text-[#344E41] block">Permitir envio automático</span>
              <span className="text-[11px] text-[#3A403A]/60">Disparos de mensagens e mídias em segundo plano diretamente pela central.</span>
            </div>
          </label>

          <label className="flex items-center gap-2 p-3 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl cursor-pointer hover:bg-[#F4F1EA]/50 transition">
            <input
              type="checkbox"
              checked={evoAutoSend}
              onChange={e => {
                setEvoAutoSend(e.target.checked);
                updateSettings({ evolutionAutoSendOnMove: e.target.checked });
              }}
              className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
            />
            <div>
              <span className="text-xs font-bold text-[#344E41] block">Enviar mensagem ao mudar etapa</span>
              <span className="text-[11px] text-[#3A403A]/60">Dispara automaticamente o script da etapa ao mover o card no Kanban.</span>
            </div>
          </label>
        </div>
      </section>

      <button
        type="button"
        onClick={() => setShowAdvanced(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-[#3A403A]/70 hover:text-[#344E41] bg-[#F4F1EA]/60 hover:bg-[#F4F1EA] rounded-xl border border-[#EAE7E2] transition"
      >
        <span>Configurações avançadas (Evolution API)</span>
        {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {showAdvanced && (
        <section className="bg-white rounded-2xl p-6 border border-[#EAE7E2] shadow-2xs space-y-5 animate-in fade-in duration-150">
          <div className="border-b border-[#EAE7E2] pb-3 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="font-serif-title text-lg font-semibold text-[#344E41]">Credenciais do Servidor Evolution API</h3>
              <p className="text-xs text-[#3A403A]/60">
                As credenciais abaixo nunca saem do servidor — o navegador não faz mais chamadas diretas à Evolution API.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
              Instância: {evoInstance || 'aurum-crm'}
            </span>
          </div>

          <form onSubmit={handleSaveEvolutionConfig} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-[#3A403A]/70 mb-1">
                  Endpoint / URL da API *
                </label>
                <input
                  type="url"
                  required
                  value={evoUrl}
                  onChange={e => setEvoUrl(e.target.value)}
                  placeholder="https://evolutionapi.thalleshcm.com.br"
                  className="w-full text-xs font-mono p-2.5 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#3A403A]/70 mb-1">
                  Nome da Instância *
                </label>
                <input
                  type="text"
                  required
                  value={evoInstance}
                  onChange={e => setEvoInstance(e.target.value)}
                  placeholder="aurum-crm"
                  className="w-full text-xs font-mono p-2.5 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#3A403A]/70 mb-1">
                  Chave Global (Global API Key) *
                </label>
                <input
                  type="password"
                  value={evoKey}
                  onChange={e => setEvoKey(e.target.value)}
                  placeholder="Token Global (/instance/*)"
                  className="w-full text-xs font-mono p-2.5 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
                />
                <p className="text-[10px] text-slate-500 mt-1">Usada pelo servidor para criar, listar, conectar e excluir instâncias.</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#3A403A]/70 mb-1">
                  Token da Instância (Opcional)
                </label>
                <input
                  type="password"
                  value={evoInstanceToken}
                  onChange={e => setEvoInstanceToken(e.target.value)}
                  placeholder="Hash / Token específico da instância"
                  className="w-full text-xs font-mono p-2.5 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
                />
                <p className="text-[10px] text-slate-500 mt-1">Usado para envio de mensagens (/message/*).</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#3A403A]/70 mb-1">
                  Número do WhatsApp Conectado
                </label>
                <input
                  type="text"
                  value={evoPhoneNumber}
                  onChange={e => setEvoPhoneNumber(e.target.value)}
                  placeholder="5511999999999"
                  className="w-full text-xs font-mono p-2.5 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
                />
                <p className="text-[10px] text-slate-500 mt-1">Com DDI + DDD (ex: 5511999999999).</p>
              </div>
            </div>

            <div className="flex items-center justify-end pt-3">
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#344E41] hover:bg-[#283d33] text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Salvar Configurações</span>
              </button>
            </div>
          </form>

          <div className="pt-4 border-t border-rose-200 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-widest text-rose-700 flex items-center gap-1.5">
              <ShieldOff className="w-3.5 h-3.5" /> Zona de perigo
            </p>
            <p className="text-[11px] text-[#3A403A]/60">
              Exclui a instância inteira do servidor Evolution API — irreversível, exige criar tudo de novo.
            </p>
            <button
              type="button"
              onClick={handleDeleteInstance}
              disabled={evoTesting}
              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-medium transition cursor-pointer disabled:opacity-50"
            >
              Excluir conexão
            </button>
          </div>
        </section>
      )}

      {modal}
    </div>
  );
};

const WEBHOOK_EVENT_LABELS: Record<WebhookEvent, string> = {
  'lead.created': 'Lead criado',
  'lead.stage_changed': 'Lead mudou de etapa',
  'lead.won': 'Lead ganho',
  'lead.lost': 'Lead perdido',
  'contract.created': 'Contrato criado'
};

// Small representative example per event — lets whoever configures the
// receiving side see the shape of the payload without guessing at the schema.
const WEBHOOK_EVENT_EXAMPLES: Record<WebhookEvent, string> = {
  'lead.created': `{\n  "event": "lead.created",\n  "data": { "id": "lead-123", "name": "Maria Silva", "phone": "5511999999999", "stageId": "lead_novo" },\n  "timestamp": "2026-08-23T12:00:00.000Z"\n}`,
  'lead.stage_changed': `{\n  "event": "lead.stage_changed",\n  "data": { "id": "lead-123", "stageId": "qualificacao", "previousStageId": "primeiro_contato" },\n  "timestamp": "2026-08-23T12:00:00.000Z"\n}`,
  'lead.won': `{\n  "event": "lead.won",\n  "data": { "id": "lead-123", "name": "Maria Silva", "estimatedValue": 850000 },\n  "timestamp": "2026-08-23T12:00:00.000Z"\n}`,
  'lead.lost': `{\n  "event": "lead.lost",\n  "data": { "id": "lead-123", "name": "Maria Silva" },\n  "timestamp": "2026-08-23T12:00:00.000Z"\n}`,
  'contract.created': `{\n  "event": "contract.created",\n  "data": { "id": "ctr-456", "leadId": "lead-123", "value": 850000, "status": "ativo" },\n  "timestamp": "2026-08-23T12:00:00.000Z"\n}`
};

export const WebhooksSection: React.FC = () => {
  const { settings, updateSettings, funnels, outgoingWebhooks, createWebhook, updateWebhook, deleteWebhook, testWebhook } = useCrm();
  const showNotification = useSettingsNotification();
  const { modal, requestConfirm } = useConfirmDanger();

  const [newWebhookName, setNewWebhookName] = useState('');
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newWebhookEvents, setNewWebhookEvents] = useState<WebhookEvent[]>([]);
  const [isAddingWebhook, setIsAddingWebhook] = useState(false);
  const [webhookTestResult, setWebhookTestResult] = useState<Record<string, string>>({});
  const [expandedWebhookId, setExpandedWebhookId] = useState<string | null>(null);

  const [inboundFunnelId, setInboundFunnelId] = useState(settings.inboundWebhookDefaults?.funnelId || 'investidores');
  const [inboundStageId, setInboundStageId] = useState(settings.inboundWebhookDefaults?.stageId || 'lead_novo');

  const inboundWebhookUrl = `${window.location.origin}/api/webhooks/inbound/leads/${settings.inboundWebhookSecret}`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard?.writeText(text).then(() => showNotification(`${label} copiado para a área de transferência!`));
  };

  const toggleWebhookEvent = (event: WebhookEvent) => {
    setNewWebhookEvents(prev => (prev.includes(event) ? prev.filter(e => e !== event) : [...prev, event]));
  };

  const handleAddWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWebhookName.trim() || !newWebhookUrl.trim() || newWebhookEvents.length === 0) return;
    try {
      await createWebhook({ name: newWebhookName.trim(), url: newWebhookUrl.trim(), events: newWebhookEvents });
      setIsAddingWebhook(false);
      setNewWebhookName('');
      setNewWebhookUrl('');
      setNewWebhookEvents([]);
      showNotification('Webhook criado com sucesso!');
    } catch (err: any) {
      showNotification(err.message || 'Falha ao criar webhook', 'error');
    }
  };

  const handleToggleWebhookEnabled = async (id: string, enabled: boolean) => {
    try {
      await updateWebhook(id, { enabled: !enabled });
    } catch (err: any) {
      showNotification(err?.message || 'Falha ao atualizar webhook.', 'error');
    }
  };

  const handleDeleteWebhook = (id: string, name: string) => {
    requestConfirm({
      title: 'Remover webhook',
      description: `Remove o webhook "${name}". Sistemas externos que dependem dele deixarão de receber eventos imediatamente.`,
      confirmLabel: 'Remover',
      tone: 'default',
      onConfirm: async () => {
        try {
          await deleteWebhook(id);
          showNotification('Webhook removido.');
        } catch (err: any) {
          showNotification(err?.message || 'Falha ao remover webhook.', 'error');
        }
      }
    });
  };

  const handleTestWebhook = async (id: string) => {
    setWebhookTestResult(prev => ({ ...prev, [id]: 'Testando...' }));
    const result = await testWebhook(id);
    setWebhookTestResult(prev => ({
      ...prev,
      [id]: result.success ? `OK (HTTP ${result.status})` : `Falhou: ${result.error || 'erro desconhecido'}`
    }));
  };

  const handleSaveInboundDefaults = () => {
    updateSettings({ inboundWebhookDefaults: { funnelId: inboundFunnelId, stageId: inboundStageId as any } });
    showNotification('Padrões de captura de leads salvos!');
  };

  const handleRegenerateInboundSecret = () => {
    requestConfirm({
      title: 'Gerar novo link de captura',
      description: 'Isso invalida o link atual de captura de leads. Todos os formulários, landing pages e integrações que usam o link antigo vão parar de funcionar até serem atualizados com o novo link.',
      confirmLabel: 'Gerar novo link',
      tone: 'default',
      onConfirm: () => {
        const secret = Array.from(crypto.getRandomValues(new Uint8Array(24))).map(b => b.toString(16).padStart(2, '0')).join('');
        updateSettings({ inboundWebhookSecret: `inbound_${secret}` });
        showNotification('Novo link de captura gerado!');
      }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <section className="bg-white rounded-2xl p-6 border border-[#EAE7E2] shadow-2xs space-y-5">
        <div className="flex items-center justify-between border-b border-[#EAE7E2] pb-3 flex-wrap gap-2">
          <div>
            <h3 className="font-serif-title text-lg font-semibold text-[#344E41] flex items-center gap-2">
              <Webhook className="w-4 h-4 text-sky-600" />
              Webhooks de Saída
            </h3>
            <p className="text-xs text-[#3A403A]/60">
              Dispare uma chamada HTTP para sistemas externos (Zapier, n8n, planilhas...) quando algo acontecer no CRM.
            </p>
          </div>
          <button
            onClick={() => setIsAddingWebhook(true)}
            className="px-3.5 py-1.5 bg-[#344E41] hover:bg-[#283d33] text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 text-[#A3B18A]" />
            <span>Novo Webhook</span>
          </button>
        </div>

        {isAddingWebhook && (
          <form onSubmit={handleAddWebhook} className="p-5 bg-[#F4F1EA]/80 border border-[#EAE7E2] rounded-2xl space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#3A403A]/70 mb-1">Nome *</label>
                <input
                  required
                  type="text"
                  placeholder="Ex: Planilha de Leads"
                  value={newWebhookName}
                  onChange={e => setNewWebhookName(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#3A403A]/70 mb-1">URL de Destino *</label>
                <input
                  required
                  type="url"
                  placeholder="https://hooks.zapier.com/..."
                  value={newWebhookUrl}
                  onChange={e => setNewWebhookUrl(e.target.value)}
                  className="w-full text-xs font-mono p-2.5 bg-white border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#3A403A]/70 mb-2">Eventos *</label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(WEBHOOK_EVENT_LABELS) as WebhookEvent[]).map(evt => (
                  <button
                    key={evt}
                    type="button"
                    onClick={() => toggleWebhookEvent(evt)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${
                      newWebhookEvents.includes(evt)
                        ? 'bg-[#588157] text-white border-[#588157]'
                        : 'bg-white text-[#3A403A]/70 border-[#EAE7E2] hover:bg-[#F4F1EA]'
                    }`}
                  >
                    {WEBHOOK_EVENT_LABELS[evt]}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAddingWebhook(false)}
                className="px-3.5 py-1.5 text-xs text-[#3A403A] border border-[#EAE7E2] rounded-xl hover:bg-white transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#344E41] hover:bg-[#283d33] text-white text-xs font-semibold rounded-xl shadow-xs transition"
              >
                Criar Webhook
              </button>
            </div>
          </form>
        )}

        {outgoingWebhooks.length === 0 && !isAddingWebhook && (
          <p className="text-xs text-[#3A403A]/50 italic py-2">Nenhum webhook configurado ainda.</p>
        )}

        <div className="space-y-3">
          {outgoingWebhooks.map(wh => (
            <div key={wh.id} className="p-4 rounded-xl border border-[#EAE7E2] bg-[#FDFCFB] space-y-2">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-xs text-[#344E41]">{wh.name}</span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        wh.enabled ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}
                    >
                      {wh.enabled ? 'Ativo' : 'Pausado'}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-[#3A403A]/60 mt-0.5 break-all">{wh.url}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {wh.events.map(evt => (
                      <span key={evt} className="text-[10px] font-semibold text-sky-800 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded-full">
                        {WEBHOOK_EVENT_LABELS[evt]}
                      </span>
                    ))}
                  </div>
                  {wh.lastTriggeredAt && (
                    <p className="text-[10px] text-[#3A403A]/50 mt-1.5">
                      Último disparo: {new Date(wh.lastTriggeredAt).toLocaleString('pt-BR')} —{' '}
                      <span className={wh.lastStatus === 'success' ? 'text-emerald-700 font-semibold' : 'text-rose-600 font-semibold'}>
                        {wh.lastStatus === 'success' ? 'sucesso' : `falhou (${wh.lastError})`}
                      </span>
                    </p>
                  )}
                  {webhookTestResult[wh.id] && (
                    <p className="text-[10px] text-[#3A403A]/70 mt-1">Teste: {webhookTestResult[wh.id]}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setExpandedWebhookId(prev => (prev === wh.id ? null : wh.id))}
                    className="px-2.5 py-1.5 text-[11px] font-semibold text-[#3A403A] bg-white hover:bg-[#F4F1EA] border border-[#EAE7E2] rounded-lg transition"
                  >
                    {expandedWebhookId === wh.id ? 'Ocultar' : 'Detalhes'}
                  </button>
                  <button
                    onClick={() => handleTestWebhook(wh.id)}
                    className="px-2.5 py-1.5 text-[11px] font-semibold text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition"
                  >
                    Testar
                  </button>
                  <button
                    onClick={() => handleToggleWebhookEnabled(wh.id, wh.enabled)}
                    className="px-2.5 py-1.5 text-[11px] font-semibold text-[#3A403A] bg-white hover:bg-[#F4F1EA] border border-[#EAE7E2] rounded-lg transition"
                  >
                    {wh.enabled ? 'Pausar' : 'Ativar'}
                  </button>
                  <button
                    onClick={() => handleDeleteWebhook(wh.id, wh.name)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Remover webhook"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {expandedWebhookId === wh.id && (
                <div className="pt-3 mt-1 border-t border-[#EAE7E2] space-y-3 animate-in fade-in duration-150">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#3A403A]/50 mb-1">Segredo (HMAC)</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-[11px] font-mono text-[#344E41] bg-white border border-[#EAE7E2] rounded-lg px-2.5 py-1.5 break-all">
                        {wh.secret}
                      </code>
                      <button
                        onClick={() => copyToClipboard(wh.secret, 'Segredo do webhook')}
                        className="p-1.5 text-[#588157] hover:bg-[#588157]/10 rounded-lg transition shrink-0"
                        title="Copiar segredo"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-[10px] text-[#3A403A]/50 mt-1">
                      Toda requisição inclui o header <code className="bg-[#EAE7E2] px-1 rounded">X-Aurum-Signature: sha256=&lt;hmac&gt;</code> — valide com este segredo para confirmar que veio do CRM.
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#3A403A]/50 mb-1">Exemplo de payload por evento</p>
                    <div className="space-y-2">
                      {wh.events.map(evt => (
                        <pre key={evt} className="text-[10px] font-mono text-[#3A403A] bg-white border border-[#EAE7E2] rounded-lg p-2.5 overflow-x-auto">
                          {WEBHOOK_EVENT_EXAMPLES[evt]}
                        </pre>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-2xl p-6 border border-[#EAE7E2] shadow-2xs space-y-4">
        <div className="border-b border-[#EAE7E2] pb-3">
          <h3 className="font-serif-title text-lg font-semibold text-[#344E41] flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#588157]" />
            Captura de Leads por Webhook (Entrada)
          </h3>
          <p className="text-xs text-[#3A403A]/60">
            Use esta URL em formulários de site, landing pages ou automações externas para criar leads direto no funil.
          </p>
        </div>

        <div className="p-3 bg-[#F4F1EA]/60 border border-[#EAE7E2] rounded-xl flex items-center justify-between gap-2">
          <code className="text-[11px] font-mono text-[#344E41] break-all">{inboundWebhookUrl}</code>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => copyToClipboard(inboundWebhookUrl, 'Link de captura')}
              className="p-1.5 text-[#588157] hover:bg-[#588157]/10 rounded-lg transition"
              title="Copiar link"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleRegenerateInboundSecret}
              className="p-1.5 text-amber-700 hover:bg-amber-50 rounded-lg transition"
              title="Gerar novo link (invalida o atual)"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <p className="text-[10px] text-[#3A403A]/50">
          Envie um POST com JSON <code className="bg-[#EAE7E2] px-1 rounded">{'{ "name", "phone", "email", "origin", "propertyInterest" }'}</code> — nome e telefone são obrigatórios. Limite de 20 requisições/minuto por origem — se precisar de mais, regenere o link para isolar o abuso.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div>
            <label className="block text-[11px] font-bold text-[#3A403A]/70 mb-1">Funil padrão</label>
            <select
              value={inboundFunnelId}
              onChange={e => setInboundFunnelId(e.target.value)}
              className="w-full text-xs p-2.5 bg-white border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
            >
              {funnels.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[#3A403A]/70 mb-1">Etapa padrão</label>
            <select
              value={inboundStageId}
              onChange={e => setInboundStageId(e.target.value)}
              className="w-full text-xs p-2.5 bg-white border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
            >
              {STAGES.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <button
            onClick={handleSaveInboundDefaults}
            className="px-4 py-2 bg-[#344E41] hover:bg-[#283d33] text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Salvar padrões</span>
          </button>
        </div>
      </section>

      {modal}
    </div>
  );
};

export const McpSection: React.FC = () => {
  const { settings, updateSettings, mcpTokens, createMcpToken, revokeMcpToken } = useCrm();
  const showNotification = useSettingsNotification();
  const { modal, requestConfirm } = useConfirmDanger();

  const [newTokenName, setNewTokenName] = useState('');
  const [newTokenScope, setNewTokenScope] = useState<'read' | 'read-write'>('read');
  const [newTokenExpiry, setNewTokenExpiry] = useState<'never' | '30' | '90' | '365'>('90');
  const [isCreatingToken, setIsCreatingToken] = useState(false);
  const [revealedToken, setRevealedToken] = useState<string | null>(null);

  const mcpEndpointUrl = `${window.location.origin}/mcp`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard?.writeText(text).then(() => showNotification(`${label} copiado para a área de transferência!`));
  };

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTokenName.trim()) return;
    const scopes: ('read' | 'write')[] = newTokenScope === 'read-write' ? ['read', 'write'] : ['read'];
    const expiresInDays = newTokenExpiry === 'never' ? undefined : Number(newTokenExpiry);
    try {
      const token = await createMcpToken(newTokenName.trim(), scopes, expiresInDays);
      setRevealedToken(token);
      setIsCreatingToken(false);
      setNewTokenName('');
      setNewTokenScope('read');
      setNewTokenExpiry('90');
    } catch (err: any) {
      showNotification(err.message || 'Falha ao criar token', 'error');
    }
  };

  const handleRevokeToken = (id: string, name: string) => {
    requestConfirm({
      title: 'Revogar token de IA',
      description: `Revoga o token "${name}". Qualquer assistente de IA usando-o perderá acesso imediatamente.`,
      confirmLabel: 'Revogar',
      tone: 'default',
      onConfirm: async () => {
        try {
          await revokeMcpToken(id);
          showNotification('Token revogado.');
        } catch (err: any) {
          showNotification(err?.message || 'Falha ao revogar token.', 'error');
        }
      }
    });
  };

  return (
    <section className="bg-white rounded-2xl p-6 border border-[#EAE7E2] shadow-2xs space-y-4 animate-in fade-in duration-150">
      <div className="border-b border-[#EAE7E2] pb-3 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-serif-title text-lg font-semibold text-[#344E41] flex items-center gap-2">
            <Bot className="w-4 h-4 text-violet-600" />
            Servidor MCP (Model Context Protocol)
          </h3>
          <p className="text-xs text-[#3A403A]/60">
            Conecte um assistente de IA (Claude e compatíveis) diretamente aos dados do seu CRM.
          </p>
        </div>
        <button
          onClick={() => {
            const activeTokens = mcpTokens.filter(t => !t.revoked).length;
            if (settings.mcpEnabled && activeTokens > 0) {
              requestConfirm({
                title: 'Desativar IA & Automação',
                description: `Existem ${activeTokens} conexão(ões) ativa(s). Desativar agora impedirá o acesso dessas integrações imediatamente.`,
                confirmLabel: 'Desativar',
                tone: 'default',
                onConfirm: () => updateSettings({ mcpEnabled: false })
              });
              return;
            }
            updateSettings({ mcpEnabled: !settings.mcpEnabled });
          }}
          className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
            settings.mcpEnabled ? 'bg-[#588157] justify-end' : 'bg-[#EAE7E2] justify-start'
          }`}
        >
          <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
        </button>
      </div>

      {!settings.mcpEnabled && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-900">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>O servidor MCP está desabilitado. Ative acima para permitir conexões.</span>
        </div>
      )}

      <div className="p-3 bg-[#F4F1EA]/60 border border-[#EAE7E2] rounded-xl flex items-center justify-between gap-2">
        <code className="text-[11px] font-mono text-[#344E41] break-all">{mcpEndpointUrl}</code>
        <button
          onClick={() => copyToClipboard(mcpEndpointUrl, 'URL do servidor MCP')}
          className="p-1.5 text-[#588157] hover:bg-[#588157]/10 rounded-lg transition shrink-0"
          title="Copiar URL"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
      </div>
      <p className="text-[10px] text-[#3A403A]/50">
        Configure este endpoint como servidor MCP remoto (HTTP) no seu cliente de IA, com um dos tokens abaixo no cabeçalho <code className="bg-[#EAE7E2] px-1 rounded">Authorization: Bearer &lt;token&gt;</code>.
      </p>

      <div className="flex items-center justify-between pt-2 border-t border-[#EAE7E2]">
        <h4 className="text-xs font-bold text-[#344E41] uppercase tracking-wider flex items-center gap-1.5">
          <KeyRound className="w-3.5 h-3.5 text-[#588157]" />
          Tokens de Acesso
        </h4>
        <button
          onClick={() => setIsCreatingToken(true)}
          className="px-3.5 py-1.5 bg-[#344E41] hover:bg-[#283d33] text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5 text-[#A3B18A]" />
          <span>Gerar Novo Token</span>
        </button>
      </div>

      {revealedToken && (
        <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-2 animate-in fade-in">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
            <ShieldAlert className="w-4 h-4" />
            Salve este token agora — ele não será mostrado novamente!
          </div>
          <div className="flex items-center justify-between gap-2 bg-slate-800 rounded-xl p-3">
            <code className="text-xs font-mono break-all">{revealedToken}</code>
            <button
              onClick={() => copyToClipboard(revealedToken, 'Token MCP')}
              className="p-1.5 text-emerald-400 hover:bg-slate-700 rounded-lg transition shrink-0"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => setRevealedToken(null)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl transition"
          >
            Já salvei, fechar
          </button>
        </div>
      )}

      {isCreatingToken && (
        <form onSubmit={handleCreateToken} className="p-5 bg-[#F4F1EA]/80 border border-[#EAE7E2] rounded-2xl space-y-3">
          <div>
            <label className="block text-[11px] font-bold text-[#3A403A]/70 mb-1">Nome do Token *</label>
            <input
              required
              type="text"
              placeholder="Ex: Claude Desktop"
              value={newTokenName}
              onChange={e => setNewTokenName(e.target.value)}
              className="w-full text-xs p-2.5 bg-white border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[#3A403A]/70 mb-1">Escopo</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setNewTokenScope('read')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                  newTokenScope === 'read' ? 'bg-[#588157] text-white border-[#588157]' : 'bg-white text-[#3A403A]/70 border-[#EAE7E2]'
                }`}
              >
                Somente leitura
              </button>
              <button
                type="button"
                onClick={() => setNewTokenScope('read-write')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                  newTokenScope === 'read-write' ? 'bg-[#588157] text-white border-[#588157]' : 'bg-white text-[#3A403A]/70 border-[#EAE7E2]'
                }`}
              >
                Leitura e escrita
              </button>
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[#3A403A]/70 mb-1">Expiração</label>
            <select
              value={newTokenExpiry}
              onChange={e => setNewTokenExpiry(e.target.value as typeof newTokenExpiry)}
              className="w-full text-xs p-2 bg-white border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
            >
              <option value="30">30 dias</option>
              <option value="90">90 dias (recomendado)</option>
              <option value="365">1 ano</option>
              <option value="never">Nunca expira</option>
            </select>
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsCreatingToken(false)}
              className="px-3.5 py-1.5 text-xs text-[#3A403A] border border-[#EAE7E2] rounded-xl hover:bg-white transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-[#344E41] hover:bg-[#283d33] text-white text-xs font-semibold rounded-xl shadow-xs transition"
            >
              Gerar Token
            </button>
          </div>
        </form>
      )}

      {mcpTokens.length === 0 && !isCreatingToken && (
        <p className="text-xs text-[#3A403A]/50 italic py-2">Nenhum token emitido ainda.</p>
      )}

      <div className="space-y-2">
        {mcpTokens.map(tok => {
          const isExpired = !!tok.expiresAt && new Date(tok.expiresAt).getTime() < Date.now();
          return (
            <div
              key={tok.id}
              className={`p-3 rounded-xl border flex items-center justify-between gap-3 flex-wrap ${
                tok.revoked || isExpired ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-[#FDFCFB] border-[#EAE7E2]'
              }`}
            >
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-xs text-[#344E41]">{tok.name}</span>
                  <span className="text-[10px] font-mono text-[#3A403A]/50">•••• {tok.tokenPreview}</span>
                  {tok.scopes.map(s => (
                    <span key={s} className="text-[10px] font-semibold text-violet-800 bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded-full">
                      {s === 'write' ? 'escrita' : 'leitura'}
                    </span>
                  ))}
                  {tok.revoked && <span className="text-[10px] font-bold uppercase text-rose-600">Revogado</span>}
                  {!tok.revoked && isExpired && <span className="text-[10px] font-bold uppercase text-amber-600">Expirado</span>}
                </div>
                <p className="text-[10px] text-[#3A403A]/50 mt-0.5">
                  Criado em {new Date(tok.createdAt).toLocaleDateString('pt-BR')}
                  {tok.lastUsedAt ? ` • Último uso: ${new Date(tok.lastUsedAt).toLocaleString('pt-BR')}` : ' • Nunca usado'}
                  {tok.expiresAt ? ` • Expira em ${new Date(tok.expiresAt).toLocaleDateString('pt-BR')}` : ' • Nunca expira'}
                </p>
              </div>
              {!tok.revoked && (
                <button
                  onClick={() => handleRevokeToken(tok.id, tok.name)}
                  className="px-2.5 py-1.5 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition"
                >
                  Revogar
                </button>
              )}
            </div>
          );
        })}
      </div>

      {modal}
    </section>
  );
};
