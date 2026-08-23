export const formatCurrency = (value: number | undefined | null): string => {
  if (value === undefined || value === null || isNaN(value)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

export const formatPhone = (phone: string | undefined): string => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
};

// Normalizes a Brazilian phone to a stable dedup key (55+DDD+number),
// mirroring server.ts's formatBrazilPhone so a match found client-side
// (e.g. while typing in NewLeadModal) agrees with what the backend computes
// during import/webhook dedup.
export const normalizePhoneKey = (rawPhone: string | undefined): string => {
  let phone = (rawPhone || '').replace(/\D/g, '');
  if (!phone) return '';

  if (phone.length >= 12 && phone.startsWith('55')) return phone;
  if (phone.length === 11) return `55${phone}`;

  if (phone.length === 10) {
    const ddd = phone.substring(0, 2);
    const firstDigit = phone.substring(2, 3);
    // Old 8-digit mobile numbers (pre-2012, no leading 9) started with
    // 6/7/8/9 depending on the carrier — not just 8.
    if (['6', '7', '8', '9'].includes(firstDigit)) phone = `${ddd}9${phone.substring(2)}`;
    return `55${phone}`;
  }

  if (phone.length === 9) return `5511${phone}`;

  return phone.startsWith('55') ? phone : `55${phone}`;
};

// Shares the 10-digit "insert the missing mobile 9th digit" fix-up with
// normalizePhoneKey, but deliberately does NOT apply normalizePhoneKey's
// bare-9-digit -> DDD-11 guess: that fallback is fine for dedup (an internal
// grouping key), but here it would produce a syntactically valid wa.me link
// that silently messages an unrelated real person in the guessed area code
// instead of failing visibly. A bare 9-digit phone (no area code) is
// returned as-is, same as before this normalization was ever added.
export const cleanPhoneForWhatsApp = (phone: string | undefined): string => {
  if (!phone) return '';
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('55') && cleaned.length > 11) {
    return cleaned;
  }
  if (cleaned.length === 10) {
    const ddd = cleaned.substring(0, 2);
    const firstDigit = cleaned.substring(2, 3);
    if (['6', '7', '8', '9'].includes(firstDigit)) cleaned = `${ddd}9${cleaned.substring(2)}`;
    return `55${cleaned}`;
  }
  if (cleaned.length === 11) {
    return `55${cleaned}`;
  }
  return cleaned;
};

export const getWhatsAppLink = (phone: string | undefined, message?: string): string => {
  const clean = cleanPhoneForWhatsApp(phone);
  if (!clean) return '#';
  const textParam = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${clean}${textParam}`;
};

export const formatDatePtBR = (dateStr: string | undefined): string => {
  if (!dateStr) return '-';
  try {
    const [year, month, day] = dateStr.split('T')[0].split('-');
    if (!year || !month || !day) return dateStr;
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
};

export const formatDateTimePtBR = (dateTimeStr: string | undefined): string => {
  if (!dateTimeStr) return '-';
  try {
    const date = new Date(dateTimeStr);
    if (isNaN(date.getTime())) return dateTimeStr;
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateTimeStr;
  }
};

/**
 * Timeline history entries are stamped with `new Date().toLocaleString('pt-BR')`
 * (e.g. "23/08/2026, 09:31:56"), which `Date.parse`/`new Date()` cannot read —
 * they silently return Invalid Date. This parses that format, falling back to
 * the native parser for ISO/other date strings.
 */
export const parseFlexibleDate = (dateStr: string | undefined): number => {
  if (!dateStr) return NaN;
  const ptBrMatch = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:,?\s+(\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (ptBrMatch) {
    const [, day, month, year, hour = '0', minute = '0', second = '0'] = ptBrMatch;
    return new Date(
      Number(year), Number(month) - 1, Number(day),
      Number(hour), Number(minute), Number(second)
    ).getTime();
  }
  return Date.parse(dateStr);
};

export const getMonthNamePtBR = (monthIndex: number): string => {
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return months[monthIndex] || '';
};
