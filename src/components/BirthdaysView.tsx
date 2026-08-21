import React, { useState } from 'react';
import {
  Cake,
  MessageSquare,
  Zap,
  Send,
  Copy,
  Check,
  Search,
  Calendar,
  Sparkles,
  User,
  Building2,
  Phone,
  Clock
} from 'lucide-react';
import { useCrm } from '../context/CrmContext';
import { Header } from './Header';
import { getWhatsAppLink, formatPhone } from '../utils/formatters';

export const BirthdaysView: React.FC = () => {
  const {
    visibleLeads,
    settings,
    setSelectedLead,
    currentUser,
    openWhatsAppForLead
  } = useCrm();

  const now = new Date();
  const currentMonthIndex = now.getMonth(); // 0 to 11
  const todayDay = now.getDate();

  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonthIndex);
  const [filterMode, setFilterMode] = useState<'month' | 'upcoming' | 'all'>('month');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedLeadId, setCopiedLeadId] = useState<string | null>(null);

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Helper to parse birth day and month robustly
  const parseBirthday = (bdayStr?: string) => {
    if (!bdayStr) return null;
    const clean = bdayStr.trim();

    // Check ISO: YYYY-MM-DD
    if (clean.includes('-')) {
      const parts = clean.split('-');
      if (parts.length === 3) {
        return { year: parseInt(parts[0], 10), month: parseInt(parts[1], 10), day: parseInt(parts[2], 10) };
      } else if (parts.length === 2) {
        return { year: null, month: parseInt(parts[0], 10), day: parseInt(parts[1], 10) };
      }
    }

    // Check BR: DD/MM/YYYY or DD/MM
    if (clean.includes('/')) {
      const parts = clean.split('/');
      if (parts.length >= 2) {
        return {
          year: parts.length === 3 ? parseInt(parts[2], 10) : null,
          month: parseInt(parts[1], 10),
          day: parseInt(parts[0], 10)
        };
      }
    }

    return null;
  };

  // Compute birthday info for all visible leads with birthdays
  const allBirthdayLeads = visibleLeads
    .map(lead => {
      const bdayRaw = lead.birthday || lead.clientData?.birthDate;
      const parsed = parseBirthday(bdayRaw);
      if (!parsed || isNaN(parsed.month) || isNaN(parsed.day)) return null;

      // Calculate days until next birthday this year
      const currentYear = now.getFullYear();
      let nextDate = new Date(currentYear, parsed.month - 1, parsed.day);
      const todayDate = new Date(currentYear, now.getMonth(), now.getDate());

      // If already passed this year, look at next year for 'upcoming' calculation
      let diffDays = Math.round((nextDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
      const isToday = diffDays === 0;

      return {
        lead,
        day: parsed.day,
        month: parsed.month,
        year: parsed.year,
        diffDays,
        isToday
      };
    })
    .filter(Boolean) as {
      lead: (typeof visibleLeads)[0];
      day: number;
      month: number;
      year: number | null;
      diffDays: number;
      isToday: boolean;
    }[];

  // Filter based on active filterMode and search
  const filteredBirthdayLeads = allBirthdayLeads.filter(item => {
    // Search query
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = item.lead.name.toLowerCase().includes(q);
      const matchProp = (item.lead.propertyInterest || '').toLowerCase().includes(q);
      const matchPhone = (item.lead.phone || '').includes(q);
      if (!matchName && !matchProp && !matchPhone) return false;
    }

    if (filterMode === 'month') {
      return item.month === selectedMonth + 1;
    } else if (filterMode === 'upcoming') {
      return item.diffDays >= 0 && item.diffDays <= 14; // Today and next 14 days
    }
    return true; // 'all'
  }).sort((a, b) => {
    if (filterMode === 'upcoming') {
      return a.diffDays - b.diffDays;
    }
    if (a.month !== b.month) return a.month - b.month;
    return a.day - b.day;
  });

  const generateBirthdayMessage = (lead: (typeof visibleLeads)[0]) => {
    const firstName = lead.name.split(' ')[0];
    const brokerDisplayName = (currentUser as any)?.name || settings.brokerName || 'Consultor Imobiliário';
    const propertyName = lead.propertyInterest || 'seu novo imóvel';
    const company = settings.companyName || 'Aurum Imóveis';
    const signature = (currentUser as any)?.signature || `${brokerDisplayName} | ${company}`;

    let template = settings.birthdayTemplate || `Olá {primeiro_nome}! 🎂🥂✨\n\nParabéns pelo seu dia! Desejo muita saúde, realizações e sucesso neste novo ciclo de vida!\n\nQue este novo ano traga grandes conquistas, inclusive a realização do seu projeto imobiliário no {imovel}.\n\nConte sempre comigo!\n\n{assinatura}`;

    return template
      .replace(/\{primeiro_nome\}/gi, firstName)
      .replace(/\{nome_cliente\}/gi, lead.name)
      .replace(/\{nome\}/gi, lead.name)
      .replace(/\{imovel\}/gi, propertyName)
      .replace(/\{empresa\}/gi, company)
      .replace(/\{corretor\}/gi, brokerDisplayName)
      .replace(/\{assinatura\}/gi, signature);
  };

  const handleCopyMessage = (item: (typeof allBirthdayLeads)[0]) => {
    const msg = generateBirthdayMessage(item.lead);
    navigator.clipboard.writeText(msg);
    setCopiedLeadId(item.lead.id);
    setTimeout(() => setCopiedLeadId(null), 2500);
  };

  const todayCount = allBirthdayLeads.filter(i => i.isToday).length;
  const upcomingCount = allBirthdayLeads.filter(i => i.diffDays >= 0 && i.diffDays <= 14).length;

  return (
    <div className="flex-1 min-h-screen bg-[#FDFCFB] flex flex-col">
      <Header
        title="Aniversariantes & Relacionamento"
        subtitle="Fortaleça laços e fidelize clientes parabenizando-os em datas comemorativas."
      />

      {/* Filter and Control Bar */}
      <div className="px-6 sm:px-8 py-3 bg-[#F4F1EA] border-b border-[#EAE7E2] flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Mode Filters */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#EAE7E2] shadow-2xs">
            <button
              onClick={() => setFilterMode('month')}
              className={`px-3 py-1.5 text-xs rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                filterMode === 'month'
                  ? 'bg-[#344E41] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Por Mês</span>
            </button>

            <button
              onClick={() => setFilterMode('upcoming')}
              className={`px-3 py-1.5 text-xs rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                filterMode === 'upcoming'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'text-rose-700 hover:text-rose-800 hover:bg-rose-50'
              }`}
            >
              <Cake className="w-3.5 h-3.5" />
              <span>Hoje & Próximos 14 Dias</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                filterMode === 'upcoming' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-800 font-bold'
              }`}>
                {upcomingCount}
              </span>
            </button>

            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-slate-800 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span>Todos ({allBirthdayLeads.length})</span>
            </button>
          </div>

          {/* Month Selector dropdown if filterMode is 'month' */}
          {filterMode === 'month' && (
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(parseInt(e.target.value, 10))}
              className="text-xs font-bold bg-white border border-[#EAE7E2] rounded-xl px-3.5 py-2 text-[#344E41] shadow-2xs focus:outline-none focus:ring-1 focus:ring-[#344E41] cursor-pointer"
            >
              {months.map((m, idx) => (
                <option key={m} value={idx}>
                  Mês de {m} {idx === currentMonthIndex ? '(Mês Atual)' : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar aniversariante..."
            className="pl-8 pr-3 py-1.5 text-xs bg-white border border-[#EAE7E2] rounded-xl text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#344E41] w-48 sm:w-60 shadow-2xs"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Main Container */}
      <main className="p-6 sm:p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Today's Special Celebration Alert Banner */}
        {todayCount > 0 && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-500/15 via-pink-500/10 to-amber-500/10 border border-rose-200 shadow-2xs flex items-center justify-between flex-wrap gap-4 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold shadow-xs">
                <Cake className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-rose-950 flex items-center gap-1.5">
                  <span>🎂 Hoje é dia de festa!</span>
                  <span className="text-xs font-normal text-rose-800">
                    ({todayCount} {todayCount === 1 ? 'cliente faz aniversário' : 'clientes fazem aniversário'} hoje)
                  </span>
                </h4>
                <p className="text-xs text-rose-800/90">
                  Aproveite para enviar uma mensagem carinhosa e fortalecer o relacionamento com seus clientes.
                </p>
              </div>
            </div>

            <button
              onClick={() => setFilterMode('upcoming')}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-2xs transition cursor-pointer"
            >
              Ver Aniversariantes de Hoje
            </button>
          </div>
        )}

        {filteredBirthdayLeads.length === 0 ? (
          <div className="bg-white rounded-[1.75rem] border border-[#EAE7E2] p-16 flex flex-col items-center justify-center text-center shadow-2xs">
            <div className="w-14 h-14 rounded-2xl bg-[#A3B18A]/15 border border-[#A3B18A]/30 flex items-center justify-center text-[#588157] mb-4 shadow-2xs">
              <Cake className="w-7 h-7" />
            </div>
            <h3 className="font-serif-title text-xl font-semibold text-[#344E41]">
              Nenhum aniversariante encontrado {filterMode === 'month' ? `em ${months[selectedMonth]}` : 'para este filtro'}.
            </h3>
            <p className="text-xs text-[#3A403A]/60 max-w-md mt-1.5 leading-relaxed">
              Adicione a data de nascimento no cadastro do lead para ser lembrado automaticamente e manter o pós-venda sempre ativo.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredBirthdayLeads.map(item => {
              const { lead, day, month, year, diffDays, isToday } = item;
              const isCopied = copiedLeadId === lead.id;

              return (
                <div
                  key={lead.id}
                  className={`rounded-2xl border p-5 transition-all flex flex-col justify-between ${
                    isToday
                      ? 'bg-gradient-to-br from-rose-50/90 via-pink-50/50 to-amber-50/30 border-rose-300 shadow-md ring-2 ring-rose-400/30'
                      : diffDays > 0 && diffDays <= 7
                      ? 'bg-amber-50/40 border-amber-200/80 shadow-2xs hover:shadow-xs'
                      : 'bg-white border-[#EAE7E2] shadow-2xs hover:shadow-xs'
                  }`}
                >
                  <div className="space-y-3.5">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shadow-2xs ${
                          isToday
                            ? 'bg-rose-600 text-white animate-bounce-short'
                            : 'bg-[#A3B18A]/20 text-[#588157]'
                        }`}>
                          <Cake className="w-5 h-5" />
                        </div>
                        <div>
                          <h4
                            onClick={() => setSelectedLead(lead)}
                            className="font-bold text-sm text-[#344E41] hover:text-[#588157] cursor-pointer transition-colors leading-tight"
                          >
                            {lead.name}
                          </h4>
                          <p className="text-xs text-[#3A403A]/60 font-mono mt-0.5">
                            {formatPhone(lead.phone)}
                          </p>
                        </div>
                      </div>

                      {/* Date Badge */}
                      <div className="text-right">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full inline-block ${
                          isToday
                            ? 'bg-rose-600 text-white shadow-2xs'
                            : 'bg-[#A3B18A]/20 text-[#344E41] border border-[#A3B18A]/30'
                        }`}>
                          {isToday ? '🎂 HOJE!' : `Dia ${day} de ${months[month - 1].slice(0, 3)}`}
                        </span>
                        {!isToday && diffDays > 0 && diffDays <= 14 && (
                          <span className="block text-[10px] text-amber-700 font-semibold mt-0.5">
                            em {diffDays} {diffDays === 1 ? 'dia' : 'dias'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Details */}
                    <div className="space-y-1.5 pt-2 border-t border-black/5 text-xs text-slate-700">
                      {lead.propertyInterest && (
                        <div className="flex items-center gap-1.5 text-xs text-[#3A403A]/80">
                          <Building2 className="w-3.5 h-3.5 text-[#588157] shrink-0" />
                          <span className="truncate">{lead.propertyInterest}</span>
                        </div>
                      )}

                      {lead.brokerName && (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                          <User className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>Corretor: <strong>{lead.brokerName}</strong></span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="mt-4 pt-3 border-t border-black/5 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyMessage(item)}
                      className={`px-3 py-2 text-xs font-semibold rounded-xl border transition flex items-center gap-1.5 cursor-pointer ${
                        isCopied
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                      title="Copiar mensagem personalizada de aniversário"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isCopied ? 'Copiado!' : 'Copiar'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openWhatsAppForLead(lead, 'birthday')}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer ${
                        isToday
                          ? 'bg-rose-600 hover:bg-rose-700 text-white'
                          : 'bg-[#588157] hover:bg-[#344E41] text-white'
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Parabenizar</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

