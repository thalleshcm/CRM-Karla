import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  RotateCcw,
  Users,
  ShieldCheck,
  MessageSquare,
  Bell,
  Radio,
  Webhook,
  Bot,
  ChevronRight,
  Search
} from 'lucide-react';
import { useCrm } from '../../context/CrmContext';
import { crmApi } from '../../services/api';
import { RolePermissions } from '../../types';

export type SettingsSectionId =
  | 'profile'
  | 'reminders'
  | 'data'
  | 'team'
  | 'permissions'
  | 'templates'
  | 'evolution'
  | 'webhooks'
  | 'mcp';

export const SETTINGS_SECTION_IDS: SettingsSectionId[] = [
  'profile',
  'reminders',
  'data',
  'team',
  'permissions',
  'templates',
  'evolution',
  'webhooks',
  'mcp'
];

interface CardDef {
  id: SettingsSectionId;
  label: string;
  description: string;
  icon: React.ReactNode;
  /** Card is hidden unless the current user has this permission. Omit for always-visible cards. */
  requires?: keyof RolePermissions;
}

interface CategoryDef {
  title: string;
  cards: CardDef[];
}

const Card: React.FC<{ card: CardDef; status?: string; onSelect: (id: SettingsSectionId) => void }> = ({ card, status, onSelect }) => {
  const descId = `settings-card-desc-${card.id}`;
  return (
    <button
      onClick={() => onSelect(card.id)}
      aria-describedby={descId}
      className="w-full text-left p-4 bg-white border border-[#EAE7E2] rounded-2xl flex items-center gap-3 hover:border-[#A3B18A] hover:shadow-sm transition-all group"
    >
      <div className="w-10 h-10 rounded-xl bg-[#F4F1EA] flex items-center justify-center shrink-0 group-hover:bg-[#E9EDC9] transition-colors">
        {card.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-[#344E41]">{card.label}</p>
        <p id={descId} className="text-[11px] text-[#3A403A]/60 mt-0.5 leading-snug">{card.description}</p>
        {status && <p className="text-[10px] font-semibold text-[#588157] mt-1">{status}</p>}
      </div>
      <ChevronRight className="w-4 h-4 text-[#3A403A]/30 shrink-0 group-hover:text-[#588157] transition-colors" />
    </button>
  );
};

export const SettingsCategoryGrid: React.FC<{ onSelect: (id: SettingsSectionId) => void }> = ({ onSelect }) => {
  const { hasPermission, users, outgoingWebhooks, mcpTokens, settings } = useCrm();
  const [search, setSearch] = useState('');
  const [whatsappConnected, setWhatsappConnected] = useState<boolean | null>(null);

  const canSeeWhatsApp = hasPermission('canManageWhatsApp');
  useEffect(() => {
    if (!canSeeWhatsApp) return;
    crmApi
      .checkWhatsAppStatus()
      .then(res => setWhatsappConnected(res.connected))
      .catch(() => setWhatsappConnected(null));
  }, [canSeeWhatsApp]);

  // Quick status/count per card — gives a panorama of the system without
  // having to open each section, e.g. "🟢 Conectado" or "18 modelos".
  const statusFor = (id: SettingsSectionId): string | undefined => {
    switch (id) {
      case 'evolution':
        if (whatsappConnected === null) return undefined;
        return whatsappConnected ? '🟢 Conectado' : '🔴 Desconectado';
      case 'templates':
        return `${settings.quickTemplates?.length ?? 0} modelos`;
      case 'webhooks':
        return `${outgoingWebhooks.filter(w => w.enabled).length} webhook(s) ativo(s)`;
      case 'mcp':
        return settings.mcpEnabled ? `${mcpTokens.filter(t => !t.revoked).length} conexão(ões) ativa(s)` : 'Desativado';
      case 'team':
        return `${users.filter(u => u.active).length} usuário(s)`;
      default:
        return undefined;
    }
  };

  // Business-language grouping — the CRM speaks "WhatsApp" / "IA & Automação" to
  // the user even though the backend underneath is Evolution API / MCP.
  // Each card is gated by its OWN permission (not one shared "integrations" flag),
  // so a user with only canManageWebhooks doesn't also see the WhatsApp or IA cards.
  const categories: CategoryDef[] = useMemo(
    () => [
      {
        title: 'Imobiliária',
        cards: [
          {
            id: 'profile',
            label: 'Dados da Imobiliária',
            description: 'Nome, slogan e dados do corretor responsável.',
            icon: <Building2 className="w-5 h-5 text-[#588157]" />
          },
          {
            id: 'data',
            label: 'Dados & Backup',
            description: 'Restaurar dados de demonstração ou limpar tudo.',
            icon: <RotateCcw className="w-5 h-5 text-[#588157]" />
          }
        ]
      },
      {
        title: 'Equipe & Acessos',
        cards: [
          {
            id: 'team',
            label: 'Equipe de Corretores',
            description: 'Cadastre, alterne e remova membros da equipe.',
            icon: <Users className="w-5 h-5 text-[#344E41]" />,
            requires: 'canManageTeam'
          },
          {
            id: 'permissions',
            label: 'Perfis & Permissões',
            description: 'Matriz de módulos e ações liberadas por perfil.',
            icon: <ShieldCheck className="w-5 h-5 text-[#344E41]" />,
            requires: 'canManageTeam'
          }
        ]
      },
      {
        title: 'Comunicação',
        cards: [
          {
            id: 'evolution',
            label: 'WhatsApp',
            description: 'Conexão, instância e QR Code de pareamento.',
            icon: <Radio className="w-5 h-5 text-emerald-700" />,
            requires: 'canManageWhatsApp'
          },
          {
            id: 'templates',
            label: 'Modelos de Mensagem',
            description: 'Biblioteca de scripts por categoria de venda.',
            icon: <MessageSquare className="w-5 h-5 text-emerald-700" />
          },
          {
            id: 'reminders',
            label: 'Notificações & Automações',
            description: 'Lembretes de follow-up e mensagem de aniversário.',
            icon: <Bell className="w-5 h-5 text-[#588157]" />
          }
        ]
      },
      {
        title: 'Integrações',
        cards: [
          {
            id: 'webhooks',
            label: 'Captura de Leads & Automações Externas',
            description: 'Receba leads de fora e dispare eventos para sistemas externos.',
            icon: <Webhook className="w-5 h-5 text-sky-700" />,
            requires: 'canManageWebhooks'
          },
          {
            id: 'mcp',
            label: 'IA & Automação',
            description: 'Conecte assistentes de IA aos dados do CRM.',
            icon: <Bot className="w-5 h-5 text-violet-700" />,
            requires: 'canManageMcp'
          }
        ]
      }
    ],
    []
  );

  const term = search.trim().toLowerCase();
  const visibleCategories = categories
    .map(cat => ({
      ...cat,
      cards: cat.cards
        .filter(card => !card.requires || hasPermission(card.requires))
        .filter(card => !term || card.label.toLowerCase().includes(term) || card.description.toLowerCase().includes(term))
    }))
    .filter(cat => cat.cards.length > 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="relative max-w-sm">
        <Search className="w-3.5 h-3.5 text-[#3A403A]/40 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Buscar em Configurações..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full text-xs pl-8 pr-3 py-2 bg-white border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
        />
      </div>

      {visibleCategories.length === 0 && (
        <p className="text-xs text-[#3A403A]/50 italic py-6 text-center">Nenhuma seção encontrada para "{search}".</p>
      )}

      <div className="space-y-8">
        {visibleCategories.map(cat => (
          <div key={cat.title} className="space-y-3">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#3A403A]/50">{cat.title}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {cat.cards.map(card => (
                <Card key={card.id} card={card} status={statusFor(card.id)} onSelect={onSelect} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
