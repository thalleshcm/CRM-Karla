import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  CalendarDays,
  CalendarRange,
  Clock,
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckCircle2,
  Circle,
  Phone,
  MessageSquare,
  Users,
  MapPin,
  FileText,
  Trash2,
  User,
  Search,
  Filter,
  X,
  ExternalLink,
  AlertCircle,
  RotateCcw,
  Check,
  ListFilter,
  Grid,
  TrendingUp,
  Tag,
  Building,
  Cake,
  Sparkles,
  Send,
  Copy,
  Gift
} from 'lucide-react';
import { useCrm } from '../context/CrmContext';
import { Header } from './Header';
import { Activity, ActivityType } from '../types';
import { formatDateTimePtBR, getMonthNamePtBR, getWhatsAppLink, formatPhone } from '../utils/formatters';

type CalendarViewMode = 'mes' | 'semana' | 'dia' | 'lista';

const ACTIVITY_CONFIG: Record<ActivityType, {
  label: string;
  icon: any;
  color: string;
  bgLight: string;
  border: string;
  text: string;
}> = {
  visita: {
    label: 'Visita ao Imóvel',
    icon: MapPin,
    color: '#D97706',
    bgLight: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-800'
  },
  reuniao: {
    label: 'Reunião Presencial/Online',
    icon: Users,
    color: '#7C3AED',
    bgLight: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-800'
  },
  proposta: {
    label: 'Envio / Revisão de Proposta',
    icon: FileText,
    color: '#4F46E5',
    bgLight: 'bg-indigo-50',
    border: 'border-indigo-200',
    text: 'text-indigo-800'
  },
  whatsapp: {
    label: 'Contato WhatsApp',
    icon: MessageSquare,
    color: '#059669',
    bgLight: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-800'
  },
  ligacao: {
    label: 'Ligação Telefônica',
    icon: Phone,
    color: '#2563EB',
    bgLight: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800'
  },
  follow_up: {
    label: 'Follow-up Geral',
    icon: Clock,
    color: '#344E41',
    bgLight: 'bg-stone-50',
    border: 'border-stone-200',
    text: 'text-stone-800'
  },
  aniversario: {
    label: 'Aniversário 🎂',
    icon: Cake,
    color: '#E11D48',
    bgLight: 'bg-rose-50',
    border: 'border-rose-200',
    text: 'text-rose-700'
  }
};

const HOURS = Array.from({ length: 16 }, (_, i) => i + 7); // 07:00 to 22:00
const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const WEEKDAYS_FULL = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

export const AgendaView: React.FC = () => {
  const {
    visibleActivities,
    visibleLeads,
    addActivity,
    toggleActivityComplete,
    deleteActivity,
    currentUser,
    hasPermission,
    openWhatsAppForLead,
    openWhatsAppDirectHub,
    setSelectedLead,
    settings
  } = useCrm();

  // Navigation & View State
  const [viewMode, setViewMode] = useState<CalendarViewMode>('mes');
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());

  // Filter State
  const [typeFilter, setTypeFilter] = useState<string>('todos');
  const [brokerFilter, setBrokerFilter] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals State
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedActivityDetail, setSelectedActivityDetail] = useState<Activity | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Completed and Dismissed Birthday Wish IDs (persisted locally)
  const [completedBirthdayIds, setCompletedBirthdayIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('aurum_completed_birthdays');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [dismissedBirthdayIds, setDismissedBirthdayIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('aurum_dismissed_birthdays');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('aurum_completed_birthdays', JSON.stringify(completedBirthdayIds));
    } catch {}
  }, [completedBirthdayIds]);

  useEffect(() => {
    try {
      localStorage.setItem('aurum_dismissed_birthdays', JSON.stringify(dismissedBirthdayIds));
    } catch {}
  }, [dismissedBirthdayIds]);

  // New Activity Form State
  const [formLeadId, setFormLeadId] = useState('');
  const [formType, setFormType] = useState<ActivityType>('visita');
  const [formDateTime, setFormDateTime] = useState('');
  const [formReminder, setFormReminder] = useState('30 minutos antes');
  const [formNotes, setFormNotes] = useState('');

  const canViewAll = hasPermission('canViewAllLeads');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Helper date conversions
  const isSameDay = (d1: Date, d2: Date) => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const toISODateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const now = new Date();

  // Helper to generate personalized birthday message
  const generateBirthdayMessage = (leadName: string) => {
    const firstName = leadName.split(' ')[0];
    const brokerDisplayName = currentUser?.name || settings?.brokerName || 'Seu Corretor';
    const tmpl = settings?.birthdayTemplate || 'Olá {primeiro_nome}! 🥂✨\n\nFeliz Aniversário! Desejo muita saúde, sucesso e grandes realizações neste novo ciclo de vida.\n\n{assinatura}';

    return tmpl
      .replace(/\{primeiro_nome\}/g, firstName)
      .replace(/\{nome\}/g, leadName)
      .replace(/\{empresa\}/g, settings?.companyName || 'Imobiliária')
      .replace(/\{corretor\}/g, brokerDisplayName)
      .replace(/\{assinatura\}/g, `${brokerDisplayName} — ${settings?.companyName || 'Imobiliária'}`);
  };

  // Automatically generate birthday activities for all visible leads with a birthday
  const birthdayActivities = useMemo<Activity[]>(() => {
    const bdays: Activity[] = [];
    const currentYr = currentDate.getFullYear();
    const years = [currentYr - 1, currentYr, currentYr + 1];

    visibleLeads.forEach(lead => {
      const rawDate = lead.birthday || lead.clientData?.birthDate;
      if (!rawDate) return;

      let month = 0;
      let day = 0;
      let birthYear: number | null = null;

      if (rawDate.includes('-')) {
        const parts = rawDate.split('-');
        if (parts.length === 3) {
          birthYear = parseInt(parts[0], 10);
          month = parseInt(parts[1], 10);
          day = parseInt(parts[2], 10);
        } else if (parts.length === 2) {
          month = parseInt(parts[0], 10);
          day = parseInt(parts[1], 10);
        }
      } else if (rawDate.includes('/')) {
        const parts = rawDate.split('/');
        if (parts.length === 3) {
          day = parseInt(parts[0], 10);
          month = parseInt(parts[1], 10);
          birthYear = parseInt(parts[2], 10);
        } else if (parts.length === 2) {
          day = parseInt(parts[0], 10);
          month = parseInt(parts[1], 10);
        }
      }

      if (!month || !day || month < 1 || month > 12 || day < 1 || day > 31) return;

      years.forEach(yr => {
        const bdayId = `bday-${lead.id}-${yr}-${month}-${day}`;
        if (dismissedBirthdayIds.includes(bdayId)) return;

        const age = birthYear && yr >= birthYear ? yr - birthYear : null;
        const pad = (n: number) => String(n).padStart(2, '0');
        const dateTime = `${yr}-${pad(month)}-${pad(day)}T09:00`;
        const ageLabel = age ? ` (${age} anos)` : '';

        bdays.push({
          id: bdayId,
          leadId: lead.id,
          leadName: lead.name,
          brokerId: lead.brokerId,
          brokerName: lead.brokerName,
          type: 'aniversario',
          dateTime,
          reminderTime: 'exact',
          notes: `🎂 Aniversário de ${lead.name}${ageLabel} — Envie uma mensagem comemorativa e fortaleça o relacionamento!`,
          completed: completedBirthdayIds.includes(bdayId),
          createdAt: lead.createdAt || '2026-01-01'
        });
      });
    });

    return bdays;
  }, [visibleLeads, currentDate, completedBirthdayIds, dismissedBirthdayIds]);

  // Combined activities (Manual activities + Automatic birthday events)
  const allCombinedActivities = useMemo(() => {
    return [...visibleActivities, ...birthdayActivities];
  }, [visibleActivities, birthdayActivities]);

  // Filter activities
  const filteredActivities = useMemo(() => {
    return allCombinedActivities.filter(act => {
      // Type Filter
      if (typeFilter !== 'todos' && act.type !== typeFilter) return false;

      // Broker Filter
      if (brokerFilter !== 'todos' && act.brokerId !== brokerFilter) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchLead = act.leadName.toLowerCase().includes(q);
        const matchNotes = (act.notes || '').toLowerCase().includes(q);
        const matchBroker = (act.brokerName || '').toLowerCase().includes(q);
        if (!matchLead && !matchNotes && !matchBroker) return false;
      }

      return true;
    });
  }, [allCombinedActivities, typeFilter, brokerFilter, searchQuery]);

  // Count of birthdays in current month
  const currentMonthBirthdaysCount = useMemo(() => {
    const yr = currentDate.getFullYear();
    const mo = String(currentDate.getMonth() + 1).padStart(2, '0');
    const prefix = `${yr}-${mo}`;
    return birthdayActivities.filter(b => (b.dateTime || '').startsWith(prefix)).length;
  }, [birthdayActivities, currentDate]);

  // Unified Toggle Complete
  const handleToggleItemComplete = (actId: string) => {
    if (actId.startsWith('bday-')) {
      const isCurrentlyCompleted = completedBirthdayIds.includes(actId);
      setCompletedBirthdayIds(prev =>
        isCurrentlyCompleted ? prev.filter(id => id !== actId) : [...prev, actId]
      );
      showToast(!isCurrentlyCompleted ? 'Felicitações marcadas como enviadas! 🎉' : 'Lembrete de aniversário reaberto.');
    } else {
      toggleActivityComplete(actId);
      const act = visibleActivities.find(a => a.id === actId);
      showToast(act?.completed ? 'Compromisso reaberto.' : 'Compromisso concluído!');
    }
  };

  // Unified Delete
  const handleDeleteItem = (actId: string, leadName: string) => {
    if (actId.startsWith('bday-')) {
      if (confirm(`Ocultar o lembrete de aniversário de ${leadName} para este ano?`)) {
        setDismissedBirthdayIds(prev => [...prev, actId]);
        showToast('Lembrete de aniversário ocultado.');
      }
    } else {
      if (confirm(`Excluir este compromisso com ${leadName}?`)) {
        deleteActivity(actId);
        showToast('Compromisso excluído.');
      }
    }
  };

  // Unique brokers in dataset
  const brokersList = useMemo(() => {
    const map = new Map<string, string>();
    visibleActivities.forEach(a => {
      if (a.brokerId && a.brokerName) {
        map.set(a.brokerId, a.brokerName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [visibleActivities]);

  // Navigate dates
  const handlePrev = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'mes') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (viewMode === 'semana') {
      newDate.setDate(newDate.getDate() - 7);
    } else if (viewMode === 'dia') {
      newDate.setDate(newDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'mes') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (viewMode === 'semana') {
      newDate.setDate(newDate.getDate() + 7);
    } else if (viewMode === 'dia') {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  // Open modal with prefilled date/time
  const openNewActivityModal = (targetDate?: Date, hour?: number) => {
    const base = targetDate || selectedDate || new Date();
    const d = new Date(base);
    if (hour !== undefined) {
      d.setHours(hour, 0, 0, 0);
    } else if (!targetDate) {
      d.setHours(d.getHours() + 1, 0, 0, 0);
    }

    const pad = (n: number) => String(n).padStart(2, '0');
    const localDateTimeStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

    setFormDateTime(localDateTimeStr);
    setFormLeadId(visibleLeads[0]?.id || '');
    setFormType('visita');
    setFormNotes('');
    setIsNewModalOpen(true);
  };

  const handleCreateActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formLeadId || !formDateTime) {
      alert('Selecione o lead e a data/horário.');
      return;
    }

    const lead = visibleLeads.find(l => l.id === formLeadId);
    if (!lead) return;

    addActivity({
      leadId: lead.id,
      leadName: lead.name,
      brokerId: lead.brokerId || currentUser.id,
      brokerName: lead.brokerName || currentUser.name,
      type: formType,
      dateTime: formDateTime,
      reminderTime: formReminder,
      notes: formNotes.trim() || undefined
    });

    setIsNewModalOpen(false);
    showToast(`Compromisso com ${lead.name} agendado com sucesso!`);
  };

  // Quick reschedule helper
  const handleQuickReschedule = (actId: string, hoursToAdd: number) => {
    const act = visibleActivities.find(a => a.id === actId);
    if (!act || !act.dateTime) return;
    const current = new Date(act.dateTime);
    current.setHours(current.getHours() + hoursToAdd);
    
    // We update through re-adding or deleting old and creating new
    deleteActivity(actId);
    addActivity({
      leadId: act.leadId,
      leadName: act.leadName,
      brokerId: act.brokerId,
      brokerName: act.brokerName,
      type: act.type,
      dateTime: current.toISOString().slice(0, 16),
      reminderTime: act.reminderTime,
      notes: act.notes
    });

    setSelectedActivityDetail(null);
    showToast(`Compromisso reagendado para ${formatDateTimePtBR(current.toISOString())}`);
  };

  // Month grid calculation
  const monthGrid = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: {
      date: Date;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      activities: Activity[];
    }[] = [];

    // Previous month padding
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, daysInPrevMonth - i);
      const dateStr = toISODateString(date);
      const dayActs = filteredActivities.filter(a => (a.dateTime || '').startsWith(dateStr));
      days.push({
        date,
        isCurrentMonth: false,
        isToday: isSameDay(date, now),
        isSelected: isSameDay(date, selectedDate),
        activities: dayActs
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      const dateStr = toISODateString(date);
      const dayActs = filteredActivities.filter(a => (a.dateTime || '').startsWith(dateStr));
      days.push({
        date,
        isCurrentMonth: true,
        isToday: isSameDay(date, now),
        isSelected: isSameDay(date, selectedDate),
        activities: dayActs
      });
    }

    // Next month padding to fill grid to 35 or 42 cells
    const remainingCells = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remainingCells; i++) {
      const date = new Date(year, month + 1, i);
      const dateStr = toISODateString(date);
      const dayActs = filteredActivities.filter(a => (a.dateTime || '').startsWith(dateStr));
      days.push({
        date,
        isCurrentMonth: false,
        isToday: isSameDay(date, now),
        isSelected: isSameDay(date, selectedDate),
        activities: dayActs
      });
    }

    return days;
  }, [currentDate, selectedDate, filteredActivities]);

  // Week days calculation
  const weekDays = useMemo(() => {
    const curr = new Date(currentDate);
    const dayOfWeek = curr.getDay(); // 0 is Sunday
    const sunday = new Date(curr);
    sunday.setDate(curr.getDate() - dayOfWeek);

    const days: { date: Date; dateStr: string; isToday: boolean; isSelected: boolean }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      days.push({
        date: d,
        dateStr: toISODateString(d),
        isToday: isSameDay(d, now),
        isSelected: isSameDay(d, selectedDate)
      });
    }
    return days;
  }, [currentDate, selectedDate]);

  // Title header text for current view
  const viewTitleText = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    if (viewMode === 'mes') {
      return `${getMonthNamePtBR(month)} de ${year}`;
    }
    if (viewMode === 'semana') {
      const start = weekDays[0]?.date;
      const end = weekDays[6]?.date;
      if (!start || !end) return '';
      if (start.getMonth() === end.getMonth()) {
        return `${start.getDate()} a ${end.getDate()} de ${getMonthNamePtBR(start.getMonth())} de ${year}`;
      }
      return `${start.getDate()} de ${getMonthNamePtBR(start.getMonth()).slice(0, 3)} a ${end.getDate()} de ${getMonthNamePtBR(end.getMonth()).slice(0, 3)} de ${year}`;
    }
    if (viewMode === 'dia') {
      const dayName = WEEKDAYS_FULL[currentDate.getDay()];
      return `${dayName}, ${currentDate.getDate()} de ${getMonthNamePtBR(month)} de ${year}`;
    }
    return `Todas as Atividades (${filteredActivities.length})`;
  }, [viewMode, currentDate, weekDays, filteredActivities]);

  return (
    <div className="flex-1 min-h-screen bg-[#FDFCFB] flex flex-col relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-80 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xl flex items-center gap-2 animate-in slide-in-from-top duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      <Header
        title="Agenda & Calendário"
        subtitle="Gerencie seus horários, visitas aos empreendimentos, reuniões e follow-ups diários."
      />

      {/* Main Top Control Bar */}
      <div className="px-6 sm:px-8 py-3 bg-[#F4F1EA] border-b border-[#EAE7E2] flex items-center justify-between flex-wrap gap-4">
        {/* Left Side: Navigation Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Today Button */}
          <button
            onClick={handleToday}
            className="px-3 py-1.5 bg-white hover:bg-[#FDFCFB] text-[#344E41] font-bold text-xs rounded-xl border border-[#EAE7E2] shadow-2xs transition cursor-pointer flex items-center gap-1.5"
            title="Ir para a data atual"
          >
            <CalendarIcon className="w-3.5 h-3.5 text-[#588157]" />
            <span>Hoje</span>
          </button>

          {/* Prev / Next Arrows */}
          <div className="flex items-center bg-white rounded-xl border border-[#EAE7E2] p-0.5 shadow-2xs">
            <button
              onClick={handlePrev}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              title="Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              title="Próximo"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Current Period Title */}
          <div className="text-sm sm:text-base font-serif-title font-bold text-[#344E41] tracking-tight">
            {viewTitleText}
          </div>
        </div>

        {/* Center/Right: View Switcher (Mês, Semana, Dia, Lista) */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-white p-1 rounded-xl border border-[#EAE7E2] shadow-2xs">
            <button
              onClick={() => setViewMode('mes')}
              className={`px-3 py-1.5 text-xs rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'mes'
                  ? 'bg-[#344E41] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Mês</span>
            </button>

            <button
              onClick={() => setViewMode('semana')}
              className={`px-3 py-1.5 text-xs rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'semana'
                  ? 'bg-[#344E41] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <CalendarRange className="w-3.5 h-3.5" />
              <span>Semana</span>
            </button>

            <button
              onClick={() => setViewMode('dia')}
              className={`px-3 py-1.5 text-xs rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'dia'
                  ? 'bg-[#344E41] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Dia</span>
            </button>

            <button
              onClick={() => setViewMode('lista')}
              className={`px-3 py-1.5 text-xs rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'lista'
                  ? 'bg-[#344E41] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Lista</span>
            </button>
          </div>

          {/* New Activity Action Button */}
          <button
            onClick={() => openNewActivityModal()}
            className="px-4 py-2 bg-[#344E41] hover:bg-[#283d33] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Novo Compromisso</span>
            <span className="sm:hidden">Agendar</span>
          </button>
        </div>
      </div>

      {/* Secondary Filter & Search Bar */}
      <div className="px-6 sm:px-8 py-2.5 bg-white border-b border-[#EAE7E2] flex items-center justify-between flex-wrap gap-3">
        {/* Activity Type Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#3A403A]/60 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Tipo:
          </span>
          <button
            onClick={() => setTypeFilter('todos')}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition cursor-pointer ${
              typeFilter === 'todos'
                ? 'bg-[#344E41] text-white font-bold'
                : 'bg-[#F4F1EA] text-[#3A403A] hover:bg-slate-200'
            }`}
          >
            Todos ({allCombinedActivities.length})
          </button>

          {/* Birthday Filter Chip */}
          <button
            onClick={() => setTypeFilter(typeFilter === 'aniversario' ? 'todos' : 'aniversario')}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition flex items-center gap-1.5 cursor-pointer ${
              typeFilter === 'aniversario'
                ? 'bg-rose-600 text-white font-bold shadow-2xs'
                : 'bg-rose-50 text-rose-800 border border-rose-200/70 hover:bg-rose-100'
            }`}
          >
            <Cake className="w-3 h-3 text-rose-500" />
            <span>Aniversários</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              typeFilter === 'aniversario' ? 'bg-white/20 text-white font-bold' : 'bg-white text-rose-700 font-bold border border-rose-200'
            }`}>
              {birthdayActivities.length}
            </span>
          </button>

          {(['visita', 'reuniao', 'proposta', 'whatsapp', 'ligacao'] as ActivityType[]).map(type => {
            const count = allCombinedActivities.filter(a => a.type === type).length;
            const cfg = ACTIVITY_CONFIG[type];
            const Icon = cfg.icon;
            const isSel = typeFilter === type;
            return (
              <button
                key={type}
                onClick={() => setTypeFilter(isSel ? 'todos' : type)}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition flex items-center gap-1.5 cursor-pointer ${
                  isSel
                    ? 'bg-[#344E41] text-white font-bold shadow-2xs'
                    : 'bg-[#F4F1EA] text-[#3A403A] hover:bg-slate-200'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{cfg.label.split(' ')[0]}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  isSel ? 'bg-white/20 text-white' : 'bg-white text-slate-600'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Side: Broker Filter (if supervisor/admin) & Search */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {canViewAll && brokersList.length > 1 && (
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-slate-500 font-medium">Corretor:</span>
              <select
                value={brokerFilter}
                onChange={e => setBrokerFilter(e.target.value)}
                className="text-xs bg-[#F4F1EA] border border-[#EAE7E2] rounded-lg px-2 py-1 text-[#3A403A] focus:outline-none"
              >
                <option value="todos">Todos os Corretores</option>
                {brokersList.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar compromisso..."
              className="pl-8 pr-3 py-1 text-xs bg-[#F4F1EA] border border-[#EAE7E2] rounded-lg text-[#3A403A] focus:outline-none focus:ring-1 focus:ring-[#344E41] w-36 sm:w-48"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area Based on View Mode */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {/* ======================================================== */}
        {/* 1. MÊS (MONTH VIEW)                                      */}
        {/* ======================================================== */}
        {viewMode === 'mes' && (
          <div className="bg-white rounded-2xl border border-[#EAE7E2] shadow-2xs overflow-hidden flex flex-col">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 border-b border-[#EAE7E2] bg-[#F4F1EA]">
              {WEEKDAYS_SHORT.map((day, idx) => (
                <div
                  key={day}
                  className={`py-2.5 text-center text-xs font-bold tracking-wider uppercase ${
                    idx === 0 || idx === 6 ? 'text-[#588157]' : 'text-[#3A403A]/80'
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Month Calendar Cells */}
            <div className="grid grid-cols-7 divide-x divide-y divide-[#EAE7E2] bg-[#EAE7E2]">
              {monthGrid.map((cell, idx) => {
                const isSelected = isSameDay(cell.date, selectedDate);
                const hasActs = cell.activities.length > 0;

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setSelectedDate(cell.date);
                    }}
                    onDoubleClick={() => {
                      setSelectedDate(cell.date);
                      setCurrentDate(cell.date);
                      setViewMode('dia');
                    }}
                    className={`min-h-[110px] sm:min-h-[130px] p-1.5 sm:p-2 bg-white flex flex-col justify-between transition-colors relative group cursor-pointer hover:bg-emerald-50/20 ${
                      !cell.isCurrentMonth ? 'bg-slate-50/60 opacity-60' : ''
                    } ${cell.isToday ? 'bg-amber-50/30 ring-1 ring-inset ring-[#588157]' : ''} ${
                      isSelected ? 'ring-2 ring-inset ring-[#344E41]' : ''
                    }`}
                  >
                    {/* Top Row: Date Number & Quick Add Button */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                          cell.isToday
                            ? 'bg-[#344E41] text-white shadow-2xs font-extrabold'
                            : isSelected
                            ? 'bg-slate-200 text-[#344E41]'
                            : cell.isCurrentMonth
                            ? 'text-slate-800'
                            : 'text-slate-400'
                        }`}
                      >
                        {cell.date.getDate()}
                      </span>

                      {/* Quick Add Button on Hover */}
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          openNewActivityModal(cell.date);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-[#344E41] hover:bg-slate-100 rounded-md transition cursor-pointer"
                        title="Agendar neste dia"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Middle: Activities Pills (Max 3 visible + overflow) */}
                    <div className="flex-1 my-1 space-y-1 overflow-hidden">
                      {cell.activities.slice(0, 3).map(act => {
                        const cfg = ACTIVITY_CONFIG[act.type] || ACTIVITY_CONFIG.follow_up;
                        const Icon = cfg.icon;
                        const timeStr = act.dateTime ? act.dateTime.split('T')[1]?.slice(0, 5) : '';

                        return (
                          <div
                            key={act.id}
                            onClick={e => {
                              e.stopPropagation();
                              setSelectedActivityDetail(act);
                            }}
                            className={`px-1.5 py-0.8 rounded-md text-[10px] font-semibold border flex items-center gap-1 truncate shadow-2xs hover:scale-[1.02] transition cursor-pointer ${
                              act.completed
                                ? 'bg-slate-100 text-slate-400 line-through border-slate-200'
                                : `${cfg.bgLight} ${cfg.border} ${cfg.text}`
                            }`}
                            title={`${timeStr} - ${act.leadName} (${cfg.label}): ${act.notes || ''}`}
                          >
                            <Icon className="w-2.5 h-2.5 shrink-0" />
                            {timeStr && <span className="font-mono text-[9px] opacity-85 shrink-0">{timeStr}</span>}
                            <span className="truncate">{act.leadName}</span>
                          </div>
                        );
                      })}

                      {cell.activities.length > 3 && (
                        <div
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedDate(cell.date);
                            setCurrentDate(cell.date);
                            setViewMode('dia');
                          }}
                          className="text-[10px] font-bold text-[#588157] hover:underline cursor-pointer pl-1"
                        >
                          +{cell.activities.length - 3} mais...
                        </div>
                      )}
                    </div>

                    {/* Bottom Indicator for Events */}
                    {hasActs && (
                      <div className="flex items-center gap-1 pt-0.5">
                        <span className="text-[9px] text-slate-400 font-medium">
                          {cell.activities.length} {cell.activities.length === 1 ? 'evento' : 'eventos'}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 2. SEMANA (WEEK VIEW - GRADE COM HORÁRIOS)               */}
        {/* ======================================================== */}
        {viewMode === 'semana' && (
          <div className="bg-white rounded-2xl border border-[#EAE7E2] shadow-2xs overflow-hidden flex flex-col">
            {/* Week Header with 7 Days */}
            <div className="grid grid-cols-8 border-b border-[#EAE7E2] bg-[#F4F1EA]">
              {/* Time Column Header */}
              <div className="p-3 text-center text-xs font-bold text-slate-500 border-r border-[#EAE7E2]">
                Horário
              </div>

              {/* 7 Days Headers */}
              {weekDays.map((d, i) => (
                <div
                  key={i}
                  onClick={() => {
                    setSelectedDate(d.date);
                    setCurrentDate(d.date);
                  }}
                  className={`p-2 sm:p-3 text-center border-r last:border-r-0 border-[#EAE7E2] transition cursor-pointer hover:bg-slate-200/50 ${
                    d.isToday ? 'bg-amber-100/50 font-bold' : ''
                  }`}
                >
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#3A403A]/70">
                    {WEEKDAYS_SHORT[d.date.getDay()]}
                  </div>
                  <div
                    className={`text-sm sm:text-base font-extrabold inline-flex items-center justify-center w-7 h-7 rounded-full mt-0.5 ${
                      d.isToday
                        ? 'bg-[#344E41] text-white shadow-2xs'
                        : isSameDay(d.date, selectedDate)
                        ? 'bg-slate-200 text-[#344E41]'
                        : 'text-slate-800'
                    }`}
                  >
                    {d.date.getDate()}
                  </div>
                </div>
              ))}
            </div>

            {/* Hourly Grid Rows */}
            <div className="divide-y divide-[#EAE7E2] max-h-[700px] overflow-y-auto">
              {HOURS.map(hour => {
                const hourStr = String(hour).padStart(2, '0');

                return (
                  <div key={hour} className="grid grid-cols-8 min-h-[64px]">
                    {/* Time Label Column */}
                    <div className="p-2 text-center text-xs font-mono font-semibold text-slate-400 bg-slate-50/50 border-r border-[#EAE7E2] flex items-start justify-center pt-2">
                      {hourStr}:00
                    </div>

                    {/* 7 Day Slot Cells */}
                    {weekDays.map((d, dayIdx) => {
                      const dayStr = d.dateStr;
                      const hourPrefix = `${dayStr}T${hourStr}`;
                      const slotActivities = filteredActivities.filter(a =>
                        (a.dateTime || '').startsWith(hourPrefix)
                      );

                      return (
                        <div
                          key={dayIdx}
                          onClick={() => {
                            openNewActivityModal(d.date, hour);
                          }}
                          className={`p-1 border-r last:border-r-0 border-[#EAE7E2] hover:bg-slate-50 transition relative group cursor-pointer flex flex-col gap-1 ${
                            d.isToday ? 'bg-amber-50/15' : ''
                          }`}
                        >
                          {/* Slot content */}
                          {slotActivities.map(act => {
                            const cfg = ACTIVITY_CONFIG[act.type] || ACTIVITY_CONFIG.follow_up;
                            const Icon = cfg.icon;
                            const timeStr = act.dateTime ? act.dateTime.split('T')[1]?.slice(0, 5) : '';

                            return (
                              <div
                                key={act.id}
                                onClick={e => {
                                  e.stopPropagation();
                                  setSelectedActivityDetail(act);
                                }}
                                className={`p-1.5 rounded-lg border text-[11px] shadow-2xs hover:scale-[1.02] transition cursor-pointer flex flex-col gap-0.5 ${
                                  act.completed
                                    ? 'bg-slate-100 text-slate-400 line-through border-slate-200'
                                    : `${cfg.bgLight} ${cfg.border} ${cfg.text}`
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-mono font-bold text-[10px] flex items-center gap-1">
                                    <Icon className="w-3 h-3" />
                                    {timeStr}
                                  </span>
                                  {act.completed && <Check className="w-3 h-3 text-emerald-600" />}
                                </div>
                                <span className="font-bold truncate text-[11px]">{act.leadName}</span>
                                {act.notes && (
                                  <span className="text-[10px] opacity-75 truncate">{act.notes}</span>
                                )}
                              </div>
                            );
                          })}

                          {/* Quick add hover sign */}
                          {slotActivities.length === 0 && (
                            <div className="opacity-0 group-hover:opacity-100 h-full flex items-center justify-center text-[10px] text-slate-400 font-medium">
                              + Agendar
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 3. DIA (DAY VIEW - LINHA DO TEMPO DETALHADA)             */}
        {/* ======================================================== */}
        {viewMode === 'dia' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Left 2 Cols: Timeline for Current Day */}
            <div className="lg:col-span-2 space-y-4">
              {/* Day Header Banner */}
              <div className="bg-white rounded-2xl p-5 border border-[#EAE7E2] shadow-2xs flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#344E41] text-white flex flex-col items-center justify-center font-bold shadow-xs">
                    <span className="text-xs uppercase">{WEEKDAYS_SHORT[currentDate.getDay()]}</span>
                    <span className="text-lg leading-tight">{currentDate.getDate()}</span>
                  </div>
                  <div>
                    <h3 className="font-serif-title font-bold text-[#344E41] text-lg">
                      {WEEKDAYS_FULL[currentDate.getDay()]}, {currentDate.getDate()} de {getMonthNamePtBR(currentDate.getMonth())} de {currentDate.getFullYear()}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {(() => {
                        const dayStr = toISODateString(currentDate);
                        const dayActs = filteredActivities.filter(a => (a.dateTime || '').startsWith(dayStr));
                        const completedCount = dayActs.filter(a => a.completed).length;
                        return `${dayActs.length} ${dayActs.length === 1 ? 'compromisso agendado' : 'compromissos agendados'} (${completedCount} concluídos)`;
                      })()}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => openNewActivityModal(currentDate)}
                  className="px-4 py-2 bg-[#344E41] hover:bg-[#283d33] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Novo no Dia</span>
                </button>
              </div>

              {/* Celebratory Birthday Banner for this specific day (if any birthdays) */}
              {(() => {
                const dayStr = toISODateString(currentDate);
                const dayBdays = birthdayActivities.filter(b => (b.dateTime || '').startsWith(dayStr));
                if (dayBdays.length === 0) return null;

                return (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-500/10 via-pink-500/10 to-amber-500/10 border border-rose-200 shadow-2xs flex items-center justify-between flex-wrap gap-3 animate-in fade-in">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold shadow-xs">
                        <Cake className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-rose-950 flex items-center gap-1.5">
                          <span>Aniversariante(s) de Hoje!</span>
                          <span className="text-xs font-normal">🎂🥂✨</span>
                        </h4>
                        <p className="text-xs text-rose-800">
                          {dayBdays.map(b => b.leadName).join(', ')} — Fortaleça o relacionamento enviando uma mensagem personalizada.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {dayBdays.map(b => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => setSelectedActivityDetail(b)}
                          className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <Cake className="w-3.5 h-3.5" />
                          <span>Parabenizar {b.leadName.split(' ')[0]}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Hourly Timeline Container */}
              <div className="bg-white rounded-2xl border border-[#EAE7E2] shadow-2xs divide-y divide-[#EAE7E2] overflow-hidden">
                {HOURS.map(hour => {
                  const hourStr = String(hour).padStart(2, '0');
                  const dayStr = toISODateString(currentDate);
                  const hourPrefix = `${dayStr}T${hourStr}`;
                  const slotActivities = filteredActivities.filter(a =>
                    (a.dateTime || '').startsWith(hourPrefix)
                  );

                  return (
                    <div
                      key={hour}
                      className="p-4 flex items-start gap-4 hover:bg-slate-50/50 transition group"
                    >
                      {/* Hour Time Label */}
                      <div className="w-16 shrink-0 font-mono font-bold text-xs text-slate-500 pt-1">
                        {hourStr}:00
                      </div>

                      {/* Activities in this hour */}
                      <div className="flex-1 space-y-2.5">
                        {slotActivities.length > 0 ? (
                          slotActivities.map(act => {
                            const cfg = ACTIVITY_CONFIG[act.type] || ACTIVITY_CONFIG.follow_up;
                            const Icon = cfg.icon;
                            const actLead = visibleLeads.find(l => l.id === act.leadId);

                            return (
                              <div
                                key={act.id}
                                className={`p-4 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                                  act.completed
                                    ? 'bg-slate-50 border-slate-200 opacity-70'
                                    : `${cfg.bgLight} ${cfg.border} shadow-2xs hover:shadow-xs`
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  {/* Complete checkbox */}
                                  <button
                                    type="button"
                                    onClick={() => handleToggleItemComplete(act.id)}
                                    className="mt-0.5 text-slate-400 hover:text-emerald-600 transition cursor-pointer"
                                    title={act.completed ? 'Reabrir compromisso' : 'Concluir compromisso'}
                                  >
                                    {act.completed ? (
                                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                    ) : (
                                      <Circle className="w-5 h-5" />
                                    )}
                                  </button>

                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${cfg.bgLight} ${cfg.text} border ${cfg.border}`}>
                                        <Icon className="w-3 h-3" />
                                        <span>{cfg.label}</span>
                                      </span>

                                      <span className="font-mono text-xs font-bold text-slate-700">
                                        {act.dateTime ? formatDateTimePtBR(act.dateTime) : ''}
                                      </span>

                                      {act.brokerName && canViewAll && (
                                        <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600 font-medium">
                                          Corretor: {act.brokerName}
                                        </span>
                                      )}
                                    </div>

                                    {/* Lead Name & Details */}
                                    <h4
                                      onClick={() => actLead && setSelectedLead(actLead)}
                                      className={`text-sm font-bold cursor-pointer hover:underline ${
                                        act.completed ? 'line-through text-slate-500' : 'text-slate-900'
                                      }`}
                                    >
                                      {act.leadName} {actLead?.propertyInterest && `· ${actLead.propertyInterest}`}
                                    </h4>

                                    {act.notes && (
                                      <p className="text-xs text-slate-600 leading-relaxed bg-white/70 p-2 rounded-lg border border-slate-100">
                                        {act.notes}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Right Side Actions */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {actLead && (
                                    <button
                                      type="button"
                                      onClick={() => openWhatsAppForLead(actLead, act.type === 'aniversario' ? 'birthday' : 'scripts')}
                                      className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition cursor-pointer shadow-2xs"
                                      title="Abrir Central WhatsApp"
                                    >
                                      <MessageSquare className="w-3.5 h-3.5" />
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => setSelectedActivityDetail(act)}
                                    className="p-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl transition cursor-pointer"
                                    title="Ver detalhes"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteItem(act.id, act.leadName)}
                                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                                    title="Excluir compromisso"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div
                            onClick={() => openNewActivityModal(currentDate, hour)}
                            className="text-xs text-slate-400 py-1.5 px-3 rounded-lg border border-dashed border-slate-200 opacity-0 group-hover:opacity-100 transition cursor-pointer hover:bg-emerald-50/40 hover:border-[#A3B18A] flex items-center justify-between"
                          >
                            <span>Nenhum compromisso às {hourStr}:00</span>
                            <span className="font-bold text-[#588157]">+ Adicionar</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Mini Calendar & Quick Scheduler */}
            <div className="space-y-6">
              {/* Mini Month Picker */}
              <div className="bg-white rounded-2xl p-5 border border-[#EAE7E2] shadow-2xs">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-serif-title font-bold text-sm text-[#344E41]">
                    {getMonthNamePtBR(currentDate.getMonth())} {currentDate.getFullYear()}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handlePrev}
                      className="p-1 hover:bg-slate-100 rounded text-slate-600"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleNext}
                      className="p-1 hover:bg-slate-100 rounded text-slate-600"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 text-center gap-1 text-xs">
                  {WEEKDAYS_SHORT.map(d => (
                    <span key={d} className="font-bold text-slate-400 text-[10px] uppercase">
                      {d[0]}
                    </span>
                  ))}
                  {monthGrid.slice(0, 35).map((c, i) => {
                    const isCur = isSameDay(c.date, currentDate);
                    return (
                      <button
                        key={i}
                        onClick={() => setCurrentDate(c.date)}
                        className={`w-7 h-7 rounded-lg text-xs font-semibold flex items-center justify-center transition cursor-pointer ${
                          isCur
                            ? 'bg-[#344E41] text-white shadow-2xs'
                            : c.isToday
                            ? 'bg-amber-100 text-amber-900 font-bold'
                            : c.isCurrentMonth
                            ? 'text-slate-700 hover:bg-slate-100'
                            : 'text-slate-300'
                        }`}
                      >
                        {c.date.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick Today's Summary */}
              <div className="bg-white rounded-2xl p-5 border border-[#EAE7E2] shadow-2xs space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                  Resumo do Dia
                </span>
                {(() => {
                  const dayStr = toISODateString(currentDate);
                  const dayActs = filteredActivities.filter(a => (a.dateTime || '').startsWith(dayStr));
                  const visits = dayActs.filter(a => a.type === 'visita').length;
                  const meetings = dayActs.filter(a => a.type === 'reuniao').length;
                  const proposals = dayActs.filter(a => a.type === 'proposta').length;

                  return (
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                        <span className="text-lg font-extrabold text-amber-800 block">{visits}</span>
                        <span className="text-[10px] font-bold text-amber-700">Visitas</span>
                      </div>
                      <div className="p-3 bg-purple-50 rounded-xl border border-purple-100">
                        <span className="text-lg font-extrabold text-purple-800 block">{meetings}</span>
                        <span className="text-[10px] font-bold text-purple-700">Reuniões</span>
                      </div>
                      <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                        <span className="text-lg font-extrabold text-indigo-800 block">{proposals}</span>
                        <span className="text-[10px] font-bold text-indigo-700">Propostas</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 4. LISTA (LIST VIEW - PENDÊNCIAS & TAREFAS)              */}
        {/* ======================================================== */}
        {viewMode === 'lista' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Left 2 Columns: Atrasados & Próximos */}
            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Atrasados */}
                <div className="bg-white rounded-2xl border border-[#EAE7E2] shadow-2xs overflow-hidden flex flex-col min-h-[420px]">
                  <div className="p-4 border-b border-[#EAE7E2] flex items-center justify-between bg-rose-50/40">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                      <span className="font-serif-title font-semibold text-rose-900 text-sm">
                        Atrasados
                      </span>
                    </div>
                    {(() => {
                      const overdue = filteredActivities.filter(a => !a.completed && a.dateTime && new Date(a.dateTime) < now);
                      return (
                        <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-800 text-xs font-bold flex items-center justify-center">
                          {overdue.length}
                        </span>
                      );
                    })()}
                  </div>

                  <div className="p-4 flex-1 overflow-y-auto space-y-3">
                    {(() => {
                      const overdue = filteredActivities.filter(a => !a.completed && a.dateTime && new Date(a.dateTime) < now);
                      if (overdue.length === 0) {
                        return (
                          <div className="h-full flex items-center justify-center text-xs text-slate-400">
                            Nenhum compromisso atrasado.
                          </div>
                        );
                      }
                      return overdue.map(act => {
                        const cfg = ACTIVITY_CONFIG[act.type] || ACTIVITY_CONFIG.follow_up;
                        const Icon = cfg.icon;
                        const actLead = visibleLeads.find(l => l.id === act.leadId);

                        return (
                          <div
                            key={act.id}
                            className="p-3.5 rounded-xl border border-rose-100 bg-rose-50/20 hover:bg-rose-50/60 transition flex items-start justify-between gap-2.5 group"
                          >
                            <div className="flex items-start gap-2.5">
                              <button
                                onClick={() => handleToggleItemComplete(act.id)}
                                className="mt-0.5 text-slate-400 hover:text-emerald-600 transition"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                              <div className="space-y-0.5">
                                <p className="text-xs font-bold text-slate-900">{act.leadName}</p>
                                <div className="flex items-center gap-1.5 text-[11px] text-rose-700 font-bold">
                                  <Icon className="w-3 h-3" />
                                  <span>{formatDateTimePtBR(act.dateTime)}</span>
                                </div>
                                {act.notes && (
                                  <p className="text-[11px] text-slate-600 leading-snug">{act.notes}</p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              {actLead && (
                                <button
                                  onClick={() => openWhatsAppForLead(actLead, act.type === 'aniversario' ? 'birthday' : 'scripts')}
                                  className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                                  title="WhatsApp"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => setSelectedActivityDetail(act)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Próximos */}
                <div className="bg-white rounded-2xl border border-[#EAE7E2] shadow-2xs overflow-hidden flex flex-col min-h-[420px]">
                  <div className="p-4 border-b border-[#EAE7E2] flex items-center justify-between bg-emerald-50/40">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#588157]" />
                      <span className="font-serif-title font-semibold text-[#344E41] text-sm">
                        Próximos
                      </span>
                    </div>
                    {(() => {
                      const upcoming = filteredActivities.filter(a => !a.completed && (!a.dateTime || new Date(a.dateTime) >= now));
                      return (
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center">
                          {upcoming.length}
                        </span>
                      );
                    })()}
                  </div>

                  <div className="p-4 flex-1 overflow-y-auto space-y-3">
                    {(() => {
                      const upcoming = filteredActivities.filter(a => !a.completed && (!a.dateTime || new Date(a.dateTime) >= now));
                      if (upcoming.length === 0) {
                        return (
                          <div className="h-full flex items-center justify-center text-xs text-slate-400">
                            Nenhum compromisso futuro agendado.
                          </div>
                        );
                      }
                      return upcoming.map(act => {
                        const cfg = ACTIVITY_CONFIG[act.type] || ACTIVITY_CONFIG.follow_up;
                        const Icon = cfg.icon;
                        const actLead = visibleLeads.find(l => l.id === act.leadId);

                        return (
                          <div
                            key={act.id}
                            className="p-3.5 rounded-xl border border-slate-100 bg-[#FDFCFB] hover:bg-slate-50 transition flex items-start justify-between gap-2.5 group"
                          >
                            <div className="flex items-start gap-2.5">
                              <button
                                onClick={() => handleToggleItemComplete(act.id)}
                                className="mt-0.5 text-slate-400 hover:text-emerald-600 transition"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                              <div className="space-y-0.5">
                                <p className="text-xs font-bold text-slate-900">{act.leadName}</p>
                                <div className="flex items-center gap-1.5 text-[11px] text-[#588157] font-bold">
                                  <Icon className="w-3 h-3" />
                                  <span>{formatDateTimePtBR(act.dateTime)}</span>
                                </div>
                                {act.notes && (
                                  <p className="text-[11px] text-slate-600 leading-snug">{act.notes}</p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              {actLead && (
                                <button
                                  onClick={() => openWhatsAppForLead(actLead, act.type === 'aniversario' ? 'birthday' : 'scripts')}
                                  className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                                  title="WhatsApp"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => setSelectedActivityDetail(act)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>

              {/* Concluídos */}
              {(() => {
                const completed = filteredActivities.filter(a => a.completed);
                if (completed.length === 0) return null;

                return (
                  <div className="bg-white rounded-2xl p-5 border border-[#EAE7E2] shadow-2xs">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-3">
                      Concluídas Recentemente ({completed.length})
                    </span>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {completed.map(act => (
                        <div
                          key={act.id}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-400 line-through"
                        >
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{act.leadName} · {act.notes || 'Atividade'}</span>
                          </div>
                          <button
                            onClick={() => handleToggleItemComplete(act.id)}
                            className="no-underline text-[11px] text-[#588157] hover:underline font-bold"
                          >
                            Reabrir
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Right Column: Quick Add Form */}
            <div className="bg-white rounded-2xl p-6 border border-[#EAE7E2] shadow-2xs space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <CalendarIcon className="w-4 h-4 text-[#588157]" />
                <h3 className="font-serif-title font-bold text-[#344E41] text-base">
                  Nova Atividade
                </h3>
              </div>

              <form onSubmit={handleCreateActivity} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Lead da Carteira *
                  </label>
                  <select
                    required
                    value={formLeadId}
                    onChange={e => setFormLeadId(e.target.value)}
                    className="w-full text-xs bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-[#344E41]"
                  >
                    <option value="">Escolha o lead...</option>
                    {visibleLeads.map(l => (
                      <option key={l.id} value={l.id}>
                        {l.name} ({l.propertyInterest})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Tipo de Compromisso *
                  </label>
                  <select
                    value={formType}
                    onChange={e => setFormType(e.target.value as ActivityType)}
                    className="w-full text-xs bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-[#344E41]"
                  >
                    <option value="visita">Visita ao Imóvel / Stand</option>
                    <option value="reuniao">Reunião Presencial / Online</option>
                    <option value="proposta">Envio de Proposta</option>
                    <option value="whatsapp">Mensagem no WhatsApp</option>
                    <option value="ligacao">Ligação Telefônica</option>
                    <option value="follow_up">Follow-up Geral</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Data & Horário *
                  </label>
                  <input
                    required
                    type="datetime-local"
                    value={formDateTime}
                    onChange={e => setFormDateTime(e.target.value)}
                    className="w-full text-xs bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-[#344E41]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Observações & Pauta
                  </label>
                  <textarea
                    rows={3}
                    value={formNotes}
                    onChange={e => setFormNotes(e.target.value)}
                    placeholder="Ex: Apresentar decorado 3 quartos e tirar dúvidas de fluxo de obras..."
                    className="w-full text-xs bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-[#344E41] resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-[#344E41] hover:bg-[#283d33] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Agendar Atividade</span>
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL: NOVA ATIVIDADE GERAL                              */}
      {/* ======================================================== */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-80 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-[#344E41]">
                <CalendarIcon className="w-5 h-5 text-[#588157]" />
                <h3 className="font-serif-title font-bold text-base text-slate-900">
                  Agendar Novo Compromisso
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateActivity} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Lead da Carteira <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={formLeadId}
                  onChange={e => setFormLeadId(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#344E41]/20 focus:border-[#344E41]"
                >
                  <option value="">Selecione o lead...</option>
                  {visibleLeads.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.name} — {l.propertyInterest} ({l.origin})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tipo de Atividade <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['visita', 'reuniao', 'proposta', 'whatsapp', 'ligacao', 'follow_up'] as ActivityType[]).map(t => {
                    const cfg = ACTIVITY_CONFIG[t];
                    const Icon = cfg.icon;
                    const isSel = formType === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setFormType(t)}
                        className={`p-2 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition cursor-pointer ${
                          isSel
                            ? `${cfg.bgLight} ${cfg.border} ${cfg.text} ring-2 ring-[#344E41]`
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-[11px] truncate w-full text-center">{cfg.label.split(' ')[0]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Data & Horário <span className="text-rose-500">*</span>
                  </label>
                  <input
                    required
                    type="datetime-local"
                    value={formDateTime}
                    onChange={e => setFormDateTime(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#344E41]/20 focus:border-[#344E41]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Aviso Antecipado
                  </label>
                  <select
                    value={formReminder}
                    onChange={e => setFormReminder(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#344E41]/20 focus:border-[#344E41]"
                  >
                    <option value="15 minutos antes">15 minutos antes</option>
                    <option value="30 minutos antes">30 minutos antes</option>
                    <option value="1 hora antes">1 hora antes</option>
                    <option value="1 dia antes">1 dia antes</option>
                    <option value="No horário">No horário exato</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Observações / Local / Pauta da Conversa
                </label>
                <textarea
                  rows={3}
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  placeholder="Ex: Apresentar o decorado 3 quartos e tirar dúvidas de fluxo de obras..."
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#344E41]/20 focus:border-[#344E41]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#344E41] hover:bg-[#283d33] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirmar Agendamento</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: DETALHES DA ATIVIDADE SELECIONADA                 */}
      {/* ======================================================== */}
      {selectedActivityDetail && (
        <div className="fixed inset-0 z-80 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl border border-slate-200">
            {(() => {
              const act = selectedActivityDetail;
              const cfg = ACTIVITY_CONFIG[act.type] || ACTIVITY_CONFIG.follow_up;
              const Icon = cfg.icon;
              const actLead = visibleLeads.find(l => l.id === act.leadId);
              const isBirthday = act.type === 'aniversario';

              if (isBirthday) {
                const firstName = act.leadName ? act.leadName.split(' ')[0] : 'Cliente';
                const rawTemplate = settings?.birthdayTemplate || 'Olá {primeiro_nome}! 🎂 Parabéns pelo seu dia! Desejo muita saúde, realizações e sucesso neste novo ciclo! Que seu sonho de conquistar o {imovel} se realize em breve! 🥂✨';
                const propertyName = actLead?.propertyInterest || 'seu novo imóvel';
                const brokerName = (currentUser as any)?.name || act.brokerName || 'Consultor Imobiliário';
                const companyName = settings?.companyName || 'Aurum Imóveis';
                const signature = (currentUser as any)?.signature || `${brokerName} | ${companyName}`;

                const renderedMessage = rawTemplate
                  .replace(/\{primeiro_nome\}/gi, firstName)
                  .replace(/\{nome_cliente\}/gi, act.leadName)
                  .replace(/\{imovel\}/gi, propertyName)
                  .replace(/\{corretor\}/gi, brokerName)
                  .replace(/\{empresa\}/gi, companyName)
                  .replace(/\{assinatura\}/gi, signature);

                return (
                  <>
                    <div className="flex items-start justify-between pb-3 border-b border-rose-100">
                      <div className="flex items-center gap-2.5">
                        <span className="p-2.5 rounded-xl border bg-rose-50 border-rose-200 text-rose-700 shadow-2xs">
                          <Cake className="w-5 h-5 text-rose-600" />
                        </span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded">
                              🎂 Aniversário do Lead
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              act.completed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {act.completed ? 'PARABÉNS ENVIADO' : 'PENDENTE DE ENVIO'}
                            </span>
                          </div>
                          <h3 className="font-serif-title font-bold text-lg text-slate-900 mt-0.5">
                            {act.leadName}
                          </h3>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedActivityDetail(null)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Birthday Info Card */}
                    <div className="bg-gradient-to-br from-rose-50/60 via-pink-50/40 to-amber-50/40 p-4 rounded-xl border border-rose-100 space-y-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 font-medium">Data Comemorativa:</span>
                        <strong className="text-rose-900 font-mono font-bold">
                          {act.dateTime ? formatDateTimePtBR(act.dateTime).split(' ')[0] : 'Hoje'}
                        </strong>
                      </div>

                      {actLead?.propertyInterest && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 font-medium">Interesse Imobiliário:</span>
                          <strong className="text-slate-800">{actLead.propertyInterest}</strong>
                        </div>
                      )}

                      {actLead?.phone && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 font-medium">WhatsApp / Telefone:</span>
                          <strong className="text-[#344E41] font-mono">{actLead.phone}</strong>
                        </div>
                      )}

                      <div className="pt-2 border-t border-rose-200/60">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-bold text-rose-900 uppercase tracking-wider">
                            Mensagem Pronta de Parabéns:
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(renderedMessage);
                              showToast('Mensagem de aniversário copiada!');
                            }}
                            className="text-[11px] font-bold text-rose-700 hover:text-rose-900 flex items-center gap-1 cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                            <span>Copiar</span>
                          </button>
                        </div>
                        <p className="p-3 bg-white rounded-xl border border-rose-100 text-slate-800 leading-relaxed font-sans text-xs shadow-2xs">
                          {renderedMessage}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        {actLead && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedActivityDetail(null);
                              openWhatsAppForLead(actLead, 'birthday');
                            }}
                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
                            title="Enviar Parabéns no WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Enviar no WhatsApp</span>
                          </button>
                        )}

                        {actLead && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedActivityDetail(null);
                              setSelectedLead(actLead);
                            }}
                            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
                          >
                            Ver Lead
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            handleToggleItemComplete(act.id);
                            setSelectedActivityDetail(null);
                          }}
                          className={`px-3.5 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                            act.completed
                              ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                              : 'bg-rose-600 text-white hover:bg-rose-700 shadow-2xs'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{act.completed ? 'Reabrir Lembrete' : 'Marcar como Enviado'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            handleDeleteItem(act.id, act.leadName);
                            setSelectedActivityDetail(null);
                          }}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                          title="Ocultar lembrete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </>
                );
              }

              return (
                <>
                  <div className="flex items-start justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className={`p-2 rounded-xl border ${cfg.bgLight} ${cfg.border} ${cfg.text}`}>
                        <Icon className="w-5 h-5" />
                      </span>
                      <div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${cfg.text}`}>
                          {cfg.label}
                        </span>
                        <h3 className="font-serif-title font-bold text-base text-slate-900">
                          {act.leadName}
                        </h3>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedActivityDetail(null)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Activity Details Card */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Data & Horário:</span>
                      <strong className="text-slate-800 font-mono">
                        {formatDateTimePtBR(act.dateTime)}
                      </strong>
                    </div>

                    {actLead?.propertyInterest && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Imóvel de Interesse:</span>
                        <strong className="text-slate-800">{actLead.propertyInterest}</strong>
                      </div>
                    )}

                    {act.brokerName && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Corretor Responsável:</span>
                        <strong className="text-[#344E41]">{act.brokerName}</strong>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Status:</span>
                      <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                        act.completed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {act.completed ? 'CONCLUÍDO' : 'PENDENTE'}
                      </span>
                    </div>

                    {act.notes && (
                      <div className="pt-2 border-t border-slate-200/80">
                        <span className="text-slate-500 block mb-1 font-semibold">Observações:</span>
                        <p className="text-slate-700 leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200">
                          {act.notes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Quick Reschedule Options */}
                  {!act.completed && (
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-600 block">Reagendamento Rápido:</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleQuickReschedule(act.id, 1)}
                          className="flex-1 py-1 px-2 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                        >
                          +1 hora
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickReschedule(act.id, 24)}
                          className="flex-1 py-1 px-2 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                        >
                          Amanhã
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickReschedule(act.id, 168)}
                          className="flex-1 py-1 px-2 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                        >
                          Próx. Semana
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      {actLead && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedActivityDetail(null);
                            openWhatsAppForLead(actLead, 'scripts');
                          }}
                          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-2xs transition flex items-center gap-1 cursor-pointer"
                          title="Enviar WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </button>
                      )}

                      {actLead && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedActivityDetail(null);
                            setSelectedLead(actLead);
                          }}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
                        >
                          Ver Lead
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          handleToggleItemComplete(act.id);
                          setSelectedActivityDetail(null);
                        }}
                        className={`px-3.5 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                          act.completed
                            ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                            : 'bg-emerald-700 text-white hover:bg-emerald-800 shadow-2xs'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{act.completed ? 'Reabrir' : 'Concluir'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          handleDeleteItem(act.id, act.leadName);
                          setSelectedActivityDetail(null);
                        }}
                        className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
