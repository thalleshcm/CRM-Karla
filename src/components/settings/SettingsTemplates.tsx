import React, { useEffect, useState } from 'react';
import { MessageSquare, RotateCcw, Plus, Edit2, Trash2, Search, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { useCrm } from '../../context/CrmContext';
import { DEFAULT_SETTINGS } from '../../data/initialData';
import { WhatsAppTemplate, WhatsAppScriptCategory, Lead } from '../../types';
import { useSettingsNotification } from './SettingsNotification';
import { useConfirmDanger } from '../ConfirmDangerModal';
import { renderWhatsAppTemplate, WHATSAPP_TEMPLATE_VARIABLES } from '../../utils/whatsappTemplate';

// Fictional lead used purely to render a realistic preview of a template —
// never persisted, just fed through the same renderWhatsAppTemplate() the
// real send flow uses, so "what you see here" matches what a client gets.
const SAMPLE_LEAD: Lead = {
  id: 'sample-lead',
  name: 'Maria Aparecida Silva',
  phone: '5511999999999',
  funnelId: 'investidores',
  stageId: 'apresentacao',
  temperature: 'quente',
  origin: 'Indicação',
  propertyInterest: 'Residencial Aurora',
  estimatedValue: 850000,
  downPayment: 170000,
  createdAt: new Date().toISOString(),
  visit: { dateTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() } as any
};

const KNOWN_TEMPLATE_VARS = WHATSAPP_TEMPLATE_VARIABLES.map(v => v.key);

// Cheap Levenshtein distance — used only to power "você quis dizer?"
// suggestions for a mistyped variable name, not for anything performance-sensitive.
function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

interface UnknownVariable {
  found: string;
  suggestion?: string;
}

function findUnknownVariables(message: string): UnknownVariable[] {
  const matches = Array.from(message.matchAll(/\{([a-z_]+)\}/g)).map(m => m[1]);
  const unique = Array.from(new Set(matches));
  return unique
    .filter(key => !KNOWN_TEMPLATE_VARS.includes(key))
    .map(found => {
      let best: string | undefined;
      let bestDist = Infinity;
      for (const known of KNOWN_TEMPLATE_VARS) {
        const dist = levenshtein(found, known);
        if (dist < bestDist) {
          bestDist = dist;
          best = known;
        }
      }
      return { found, suggestion: bestDist <= 3 ? best : undefined };
    });
}

const TemplateVariableWarnings: React.FC<{ message: string }> = ({ message }) => {
  const unknown = findUnknownVariables(message);
  if (unknown.length === 0) return null;
  return (
    <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 space-y-0.5">
      {unknown.map(u => (
        <p key={u.found} className="flex items-center gap-1.5">
          <AlertTriangle className="w-3 h-3 shrink-0" />
          <span>
            Variável desconhecida: <code className="font-mono font-semibold">{`{${u.found}}`}</code>
            {u.suggestion && (
              <>
                {' '}— você quis dizer <code className="font-mono font-semibold">{`{${u.suggestion}}`}</code>?
              </>
            )}
          </span>
        </p>
      ))}
    </div>
  );
};

const CATEGORY_META: Record<WhatsAppScriptCategory, { label: string; color: string }> = {
  primeiro_contato: { label: 'Primeiro Contato', color: 'sky' },
  apresentacao: { label: 'Apresentação', color: 'sky' },
  coleta_documentos: { label: 'Coleta de Documentos', color: 'amber' },
  documentacao: { label: 'Documentação', color: 'amber' },
  visita: { label: 'Agendamento de Visita', color: 'violet' },
  simulacao: { label: 'Envio de Simulação', color: 'indigo' },
  objecoes: { label: 'Tratamento de Objeções', color: 'indigo' },
  fechamento: { label: 'Proposta & Fechamento', color: 'emerald' },
  pos_venda: { label: 'Pós-venda', color: 'teal' },
  reativacao: { label: 'Reativação', color: 'teal' },
  aniversario: { label: 'Aniversário', color: 'rose' }
};

const CATEGORY_ORDER: WhatsAppScriptCategory[] = [
  'primeiro_contato',
  'apresentacao',
  'visita',
  'coleta_documentos',
  'documentacao',
  'simulacao',
  'objecoes',
  'fechamento',
  'pos_venda',
  'reativacao',
  'aniversario'
];

const colorClasses: Record<string, string> = {
  sky: 'text-sky-800 bg-sky-50 border-sky-200',
  amber: 'text-amber-800 bg-amber-50 border-amber-200',
  violet: 'text-violet-800 bg-violet-50 border-violet-200',
  indigo: 'text-indigo-800 bg-indigo-50 border-indigo-200',
  emerald: 'text-emerald-800 bg-emerald-50 border-emerald-200',
  teal: 'text-teal-800 bg-teal-50 border-teal-200',
  rose: 'text-rose-800 bg-rose-50 border-rose-200'
};

export const TemplatesSection: React.FC = () => {
  const { settings, updateSettings, currentUser } = useCrm();
  const showNotification = useSettingsNotification();
  const { modal, requestConfirm } = useConfirmDanger();

  const [templatesList, setTemplatesList] = useState<WhatsAppTemplate[]>(settings.quickTemplates || []);
  const [editingTemplate, setEditingTemplate] = useState<WhatsAppTemplate | null>(null);
  const [isAddingTemplate, setIsAddingTemplate] = useState(false);
  const [newTmplTitle, setNewTmplTitle] = useState('');
  const [newTmplCategory, setNewTmplCategory] = useState<WhatsAppScriptCategory>('primeiro_contato');
  const [newTmplMessage, setNewTmplMessage] = useState('');
  const [activeFilter, setActiveFilter] = useState<WhatsAppScriptCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const [previewingId, setPreviewingId] = useState<string | null>(null);

  const renderPreview = (message: string) =>
    renderWhatsAppTemplate(message, {
      lead: SAMPLE_LEAD,
      broker: currentUser,
      company: settings,
      portalLink: `${window.location.origin}/?portal=amostra`
    });

  useEffect(() => {
    setTemplatesList(settings.quickTemplates || []);
  }, [settings.quickTemplates]);

  const handleAddTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTmplTitle.trim() || !newTmplMessage.trim()) return;

    const newTmpl: WhatsAppTemplate = {
      id: `tmpl-custom-${Date.now()}`,
      title: newTmplTitle.trim(),
      category: newTmplCategory,
      message: newTmplMessage.trim()
    };

    const updated = [...templatesList, newTmpl];
    setTemplatesList(updated);
    updateSettings({ quickTemplates: updated });
    setIsAddingTemplate(false);
    setNewTmplTitle('');
    setNewTmplMessage('');
    showNotification(`Modelo "${newTmpl.title}" adicionado com sucesso!`);
  };

  const handleSaveEditTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;

    const updated = templatesList.map(t => (t.id === editingTemplate.id ? editingTemplate : t));
    setTemplatesList(updated);
    updateSettings({ quickTemplates: updated });
    setEditingTemplate(null);
    showNotification(`Modelo "${editingTemplate.title}" atualizado!`);
  };

  const handleDeleteTemplate = (id: string, title: string) => {
    requestConfirm({
      title: 'Remover modelo',
      description: `Remove o modelo "${title}" da biblioteca. Você pode recriá-lo manualmente depois, se precisar.`,
      confirmLabel: 'Remover',
      tone: 'default',
      onConfirm: () => {
        const updated = templatesList.filter(t => t.id !== id);
        setTemplatesList(updated);
        updateSettings({ quickTemplates: updated });
        showNotification(`Modelo "${title}" removido.`);
      }
    });
  };

  const handleRestoreDefaultTemplates = () => {
    requestConfirm({
      title: 'Restaurar modelos padrão',
      description: `Substitui TODOS os ${templatesList.length} modelos atuais (incluindo os que você personalizou ou criou) pelos modelos de fábrica do Aurum CRM. Isso não pode ser desfeito.`,
      confirmLabel: 'Restaurar tudo',
      tone: 'critical',
      typedConfirmation: 'RESTAURAR',
      onConfirm: () => {
        setTemplatesList(DEFAULT_SETTINGS.quickTemplates);
        updateSettings({ quickTemplates: DEFAULT_SETTINGS.quickTemplates });
        showNotification('Modelos restaurados para o padrão original!');
      }
    });
  };

  const filtered = templatesList.filter(t => {
    const matchesCategory = activeFilter === 'all' || t.category === activeFilter;
    const matchesSearch = !search.trim() || t.title.toLowerCase().includes(search.toLowerCase()) || t.message.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const groupedByCategory = CATEGORY_ORDER.map(cat => ({
    category: cat,
    items: filtered.filter(t => t.category === cat)
  })).filter(g => g.items.length > 0);

  const usedCategories: WhatsAppScriptCategory[] = Array.from(new Set(templatesList.map(t => t.category)));

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="bg-gradient-to-r from-[#344E41] via-[#3f5c4d] to-[#588157] text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#E9EDC9]" />
            <h3 className="font-serif-title text-base font-bold text-white">
              Biblioteca de Scripts & Modelos de Mensagem
            </h3>
          </div>
          <p className="text-xs text-[#E9EDC9]/80 max-w-2xl">
            Textos pré-formatados usados pela equipe nos estágios de vendas e no portal do cliente — organizados por categoria.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleRestoreDefaultTemplates}
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-xl border border-white/20 transition flex items-center gap-1.5"
            title="Restaurar templates de fábrica"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar Padrão</span>
          </button>
          <button
            onClick={() => setIsAddingTemplate(true)}
            className="px-4 py-2 bg-white text-[#344E41] hover:bg-[#E9EDC9] text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Script</span>
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition ${
              activeFilter === 'all' ? 'bg-[#344E41] text-white border-[#344E41]' : 'bg-white text-[#3A403A]/70 border-[#EAE7E2] hover:bg-[#F4F1EA]'
            }`}
          >
            Todas ({templatesList.length})
          </button>
          {usedCategories.map(cat => {
            const meta = CATEGORY_META[cat];
            const count = templatesList.filter(t => t.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setActiveFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition ${
                  activeFilter === cat ? 'bg-[#344E41] text-white border-[#344E41]' : `${colorClasses[meta.color]} hover:brightness-95`
                }`}
              >
                {meta.label} ({count})
              </button>
            );
          })}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-[#3A403A]/40 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por texto ou título..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-2 bg-white border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
          />
        </div>
      </div>

      {isAddingTemplate && (
        <form onSubmit={handleAddTemplate} className="p-5 bg-[#F4F1EA]/80 border border-[#EAE7E2] rounded-2xl space-y-3">
          <h4 className="text-xs font-bold text-[#344E41] uppercase tracking-wider">
            Criar Novo Modelo de Mensagem
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#3A403A]/70 mb-1">Título do Script *</label>
              <input
                required
                type="text"
                placeholder="Ex: Convite para Café & Apresentação da Planta"
                value={newTmplTitle}
                onChange={e => setNewTmplTitle(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#3A403A]/70 mb-1">Categoria / Estágio</label>
              <select
                value={newTmplCategory}
                onChange={e => setNewTmplCategory(e.target.value as WhatsAppScriptCategory)}
                className="w-full text-xs p-2.5 bg-white border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
              >
                {CATEGORY_ORDER.map(cat => (
                  <option key={cat} value={cat}>{CATEGORY_META[cat].label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#3A403A]/70 mb-1">Texto da Mensagem *</label>
            <textarea
              required
              rows={4}
              placeholder="Olá {primeiro_nome}! Separei uma oportunidade especial no {imovel}..."
              value={newTmplMessage}
              onChange={e => setNewTmplMessage(e.target.value)}
              className="w-full font-mono text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
            />
            <p className="text-[10px] text-slate-500 font-mono mt-1">
              Tags: <code className="bg-[#EAE7E2] px-1 rounded">{'{primeiro_nome}'}</code>, <code className="bg-[#EAE7E2] px-1 rounded">{'{imovel}'}</code>, <code className="bg-[#EAE7E2] px-1 rounded">{'{valor}'}</code>, <code className="bg-[#EAE7E2] px-1 rounded">{'{corretor}'}</code>, <code className="bg-[#EAE7E2] px-1 rounded">{'{link_portal}'}</code>
            </p>
            <TemplateVariableWarnings message={newTmplMessage} />
            {newTmplMessage.trim() && (
              <div className="mt-2 p-3 bg-[#F1EFEC]/60 border border-[#EAE7E2] rounded-xl">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#3A403A]/50 mb-1">Prévia com dados de exemplo</p>
                <p className="text-xs text-[#3A403A] whitespace-pre-line leading-relaxed">{renderPreview(newTmplMessage)}</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAddingTemplate(false)}
              className="px-3.5 py-1.5 text-xs text-[#3A403A] border border-[#EAE7E2] rounded-xl hover:bg-white transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-[#344E41] hover:bg-[#283d33] text-white text-xs font-semibold rounded-xl shadow-xs transition"
            >
              Salvar Script
            </button>
          </div>
        </form>
      )}

      {editingTemplate && (
        <form onSubmit={handleSaveEditTemplate} className="p-5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
              Editando Script: {editingTemplate.title}
            </h4>
            <button
              type="button"
              onClick={() => setEditingTemplate(null)}
              className="text-xs text-amber-800 hover:underline"
            >
              Cancelar Edição
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#3A403A]/70 mb-1">Título do Script *</label>
              <input
                required
                type="text"
                value={editingTemplate.title}
                onChange={e => setEditingTemplate({ ...editingTemplate, title: e.target.value })}
                className="w-full text-xs p-2.5 bg-white border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#3A403A]/70 mb-1">Categoria / Estágio</label>
              <select
                value={editingTemplate.category}
                onChange={e => setEditingTemplate({ ...editingTemplate, category: e.target.value as WhatsAppScriptCategory })}
                className="w-full text-xs p-2.5 bg-white border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
              >
                {CATEGORY_ORDER.map(cat => (
                  <option key={cat} value={cat}>{CATEGORY_META[cat].label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#3A403A]/70 mb-1">Texto da Mensagem *</label>
            <textarea
              required
              rows={5}
              value={editingTemplate.message}
              onChange={e => setEditingTemplate({ ...editingTemplate, message: e.target.value })}
              className="w-full font-mono text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
            />
            <TemplateVariableWarnings message={editingTemplate.message} />
            {editingTemplate.message.trim() && (
              <div className="mt-2 p-3 bg-[#F1EFEC]/60 border border-[#EAE7E2] rounded-xl">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#3A403A]/50 mb-1">Prévia com dados de exemplo</p>
                <p className="text-xs text-[#3A403A] whitespace-pre-line leading-relaxed">{renderPreview(editingTemplate.message)}</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setEditingTemplate(null)}
              className="px-3.5 py-1.5 text-xs text-[#3A403A] border border-[#EAE7E2] rounded-xl hover:bg-white transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-amber-800 hover:bg-amber-900 text-white text-xs font-semibold rounded-xl shadow-xs transition"
            >
              Salvar Alterações
            </button>
          </div>
        </form>
      )}

      {groupedByCategory.length === 0 && (
        <p className="text-xs text-[#3A403A]/50 italic py-6 text-center">Nenhum modelo encontrado com esse filtro.</p>
      )}

      <div className="space-y-8">
        {groupedByCategory.map(group => {
          const meta = CATEGORY_META[group.category];
          return (
            <div key={group.category} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${colorClasses[meta.color]}`}>
                  {meta.label}
                </span>
                <span className="text-[10px] text-[#3A403A]/40">{group.items.length} modelo{group.items.length !== 1 ? 's' : ''}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {group.items.map(tmpl => (
                  <div
                    key={tmpl.id}
                    className="p-4 rounded-2xl border border-[#EAE7E2] bg-white hover:border-[#A3B18A] hover:shadow-sm transition-all space-y-2.5 flex flex-col"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-xs text-[#344E41] leading-snug">{tmpl.title}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setPreviewingId(prev => (prev === tmpl.id ? null : tmpl.id))}
                          className={`p-1.5 rounded-lg transition ${previewingId === tmpl.id ? 'text-emerald-800 bg-emerald-50' : 'text-slate-500 hover:text-emerald-800 hover:bg-emerald-50'}`}
                          title="Prévia com dados de exemplo"
                        >
                          {previewingId === tmpl.id ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => setEditingTemplate(tmpl)}
                          className="p-1.5 text-slate-500 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition"
                          title="Editar Script"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(tmpl.id, tmpl.title)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Remover Script"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {previewingId === tmpl.id ? (
                      <p className="text-[11px] text-[#3A403A] whitespace-pre-line bg-emerald-50/60 p-3 rounded-lg border border-emerald-200 leading-relaxed flex-1">
                        {renderPreview(tmpl.message)}
                      </p>
                    ) : (
                      <p className="text-[11px] font-mono text-[#3A403A]/70 whitespace-pre-line bg-[#FDFCFB] p-3 rounded-lg border border-[#EAE7E2]/70 leading-relaxed line-clamp-6 flex-1">
                        {tmpl.message}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {modal}
    </div>
  );
};
