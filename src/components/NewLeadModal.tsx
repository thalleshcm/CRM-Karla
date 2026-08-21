import React, { useState } from 'react';
import { X, Plus, UserPlus, User } from 'lucide-react';
import { useCrm } from '../context/CrmContext';
import { LeadTemperature, StageId } from '../types';
import { STAGES } from '../data/initialData';

export const NewLeadModal: React.FC = () => {
  const {
    isNewLeadModalOpen,
    setIsNewLeadModalOpen,
    addLead,
    funnels,
    activeFunnelId,
    users,
    currentUser,
    hasPermission,
    triggerConfetti
  } = useCrm();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [propertyInterest, setPropertyInterest] = useState('');
  const [estimatedValue, setEstimatedValue] = useState<string>('');
  const [funnelId, setFunnelId] = useState(activeFunnelId || 'investidores');
  const [stageId, setStageId] = useState<StageId>('lead_novo');
  const [temperature, setTemperature] = useState<LeadTemperature>('quente');
  const [origin, setOrigin] = useState('Instagram');
  const [birthday, setBirthday] = useState('');
  const [notes, setNotes] = useState('');
  const [assignedBrokerId, setAssignedBrokerId] = useState(currentUser.id);

  if (!isNewLeadModalOpen) return null;

  const canAssignAnyBroker = hasPermission('canManageTeam') || currentUser.role === 'admin';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    const targetBrokerId = canAssignAnyBroker ? assignedBrokerId : currentUser.id;
    const targetBrokerUser = users.find(u => u.id === targetBrokerId) || currentUser;

    addLead({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      propertyInterest: propertyInterest.trim() || 'Não especificado',
      estimatedValue: parseFloat(estimatedValue) || 0,
      funnelId,
      stageId,
      temperature,
      origin,
      birthday: birthday || undefined,
      notes: notes.trim() || undefined,
      brokerId: targetBrokerId,
      brokerName: targetBrokerUser.name
    });

    triggerConfetti();
    setIsNewLeadModalOpen(false);

    // Reset fields
    setName('');
    setPhone('');
    setEmail('');
    setPropertyInterest('');
    setEstimatedValue('');
    setBirthday('');
    setNotes('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3E4A3D]/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl w-full max-w-xl shadow-2xl border border-[#EAE7E2] overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-[#EAE7E2] bg-[#F4F1EA]/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#344E41] text-[#E9EDC9] flex items-center justify-center font-bold shadow-2xs">
              <UserPlus className="w-5 h-5 text-[#A3B18A]" />
            </div>
            <div>
              <h3 className="font-serif-title text-lg font-bold text-[#344E41]">
                Cadastrar Novo Lead
              </h3>
              <p className="text-xs text-[#3A403A]/60">
                {canAssignAnyBroker 
                  ? 'Cadastre um novo lead e defina o corretor responsável pela carteira.'
                  : `Adicione um novo lead diretamente ao seu portfólio (${currentUser.name}).`}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsNewLeadModalOpen(false)}
            className="p-1.5 text-[#3A403A]/40 hover:text-[#344E41] rounded-lg hover:bg-[#EAE7E2]/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {/* Broker Assignment Selector */}
          <div className="p-3 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-[#588157]" />
              <span className="text-xs font-semibold text-[#344E41]">Corretor Responsável:</span>
            </div>
            {canAssignAnyBroker ? (
              <select
                value={assignedBrokerId}
                onChange={e => setAssignedBrokerId(e.target.value)}
                className="text-xs p-1.5 bg-white border border-[#EAE7E2] rounded-lg text-[#344E41] font-semibold focus:outline-hidden focus:border-[#588157]"
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role === 'admin' ? 'Admin' : 'Corretor'})
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-xs font-bold text-[#588157] bg-[#588157]/10 px-2 py-0.5 rounded">
                {currentUser.name} (Você)
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[#3A403A]/70 mb-1">
                Nome do Lead *
              </label>
              <input
                required
                type="text"
                placeholder="Ex: Roberto Almeida"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full text-xs p-2.5 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A] placeholder-[#3A403A]/40 focus:outline-hidden focus:border-[#A3B18A]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[#3A403A]/70 mb-1">
                WhatsApp / Telefone *
              </label>
              <input
                required
                type="text"
                placeholder="(11) 98765-4321"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full text-xs p-2.5 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A] placeholder-[#3A403A]/40 focus:outline-hidden focus:border-[#A3B18A]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[#3A403A]/70 mb-1">
                E-mail (opcional)
              </label>
              <input
                type="email"
                placeholder="cliente@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full text-xs p-2.5 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A] placeholder-[#3A403A]/40 focus:outline-hidden focus:border-[#A3B18A]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[#3A403A]/70 mb-1">
                Data de Aniversário
              </label>
              <input
                type="date"
                value={birthday}
                onChange={e => setBirthday(e.target.value)}
                className="w-full text-xs p-2.5 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[#3A403A]/70 mb-1">
                Imóvel / Perfil de Interesse *
              </label>
              <input
                required
                type="text"
                placeholder="Ex: Mansão Alphaville ou 3Q Jardins"
                value={propertyInterest}
                onChange={e => setPropertyInterest(e.target.value)}
                className="w-full text-xs p-2.5 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A] placeholder-[#3A403A]/40 focus:outline-hidden focus:border-[#A3B18A]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[#3A403A]/70 mb-1">
                Valor Estimado (R$)
              </label>
              <input
                type="number"
                placeholder="Ex: 850000"
                value={estimatedValue}
                onChange={e => setEstimatedValue(e.target.value)}
                className="w-full text-xs p-2.5 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A] placeholder-[#3A403A]/40 focus:outline-hidden focus:border-[#A3B18A]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[#3A403A]/70 mb-1">
                Funil de Vendas
              </label>
              <select
                value={funnelId}
                onChange={e => setFunnelId(e.target.value)}
                className="w-full text-xs p-2.5 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
              >
                {funnels.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[#3A403A]/70 mb-1">
                Etapa Inicial
              </label>
              <select
                value={stageId}
                onChange={e => setStageId(e.target.value as StageId)}
                className="w-full text-xs p-2.5 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
              >
                {STAGES.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[#3A403A]/70 mb-1">
                Temperatura
              </label>
              <select
                value={temperature}
                onChange={e => setTemperature(e.target.value as LeadTemperature)}
                className="w-full text-xs p-2.5 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
              >
                <option value="quente">🔥 Quente (Alta urgência)</option>
                <option value="morno">⚡ Morno (Em avaliação)</option>
                <option value="frio">❄️ Frio (Longo prazo)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[#3A403A]/70 mb-1">
                Origem do Lead
              </label>
              <select
                value={origin}
                onChange={e => setOrigin(e.target.value)}
                className="w-full text-xs p-2.5 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
              >
                <option value="Instagram">Instagram</option>
                <option value="Google Ads">Google Ads</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Indicação">Indicação</option>
                <option value="Portal Imobiliário">Portal Imobiliário (ZAP/VivaReal)</option>
                <option value="Plantão de Vendas">Plantão de Vendas</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#3A403A]/70 mb-1">
              Notas & Histórico Inicial
            </label>
            <textarea
              rows={2}
              placeholder="Preferências de localização, formas de pagamento ou observações..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full text-xs p-2.5 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A] placeholder-[#3A403A]/40 focus:outline-hidden focus:border-[#A3B18A]"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#EAE7E2]">
            <button
              type="button"
              onClick={() => setIsNewLeadModalOpen(false)}
              className="px-4 py-2 border border-[#EAE7E2] text-[#3A403A] hover:bg-[#F1EFEC] text-xs rounded-xl font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#344E41] hover:bg-[#283d33] text-white text-xs rounded-xl font-semibold shadow-xs flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Salvar e Inserir no Funil</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
