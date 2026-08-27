import React, { useMemo, useState } from 'react';
import { X, Upload, MessageSquare, FileSpreadsheet, Check, AlertCircle, ArrowLeft, FileUp, Trash2, ShieldAlert } from 'lucide-react';
import { useCrm } from '../context/CrmContext';
import { useEscapeToClose } from '../hooks/useEscapeToClose';
import { ImportLeadRow, ImportResult } from '../context/CrmContext';
import { normalizePhoneKey } from '../utils/formatters';

type CsvStep = 'upload' | 'map' | 'review' | 'result';
type FieldKey = 'name' | 'phone' | 'email' | 'propertyInterest' | 'estimatedValue' | 'origin' | 'tags';

const FIELD_LABELS: Record<FieldKey, string> = {
  name: 'Nome *',
  phone: 'Telefone *',
  email: 'E-mail',
  propertyInterest: 'Imóvel de interesse',
  estimatedValue: 'Valor estimado',
  origin: 'Origem',
  tags: 'Tags'
};

const FIELD_KEYWORDS: Record<FieldKey, string[]> = {
  name: ['nome', 'name', 'cliente', 'lead'],
  phone: ['telefone', 'phone', 'celular', 'whatsapp', 'fone', 'contato'],
  email: ['email', 'e-mail'],
  propertyInterest: ['imovel', 'empreendimento', 'interesse', 'property', 'unidade'],
  estimatedValue: ['valor', 'value', 'preco', 'price', 'vgv'],
  origin: ['origem', 'source', 'canal'],
  tags: ['tag', 'tags', 'etiqueta']
};

// A single reviewable row in the pre-import validation table — editable so
// the user can fix a missing/bad name or phone before confirming, instead of
// having to re-upload the whole file for one typo.
interface ReviewRow {
  key: string;
  name: string;
  phone: string;
  email: string;
  propertyInterest: string;
  estimatedValue: string;
  origin: string;
  tagsText: string;
  excluded: boolean;
}

const normalizeText = (s: string): string =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

function autoDetectColumns(headerRow: string[]): Record<FieldKey, number | null> {
  const map = {} as Record<FieldKey, number | null>;
  (Object.keys(FIELD_KEYWORDS) as FieldKey[]).forEach(field => {
    const idx = headerRow.findIndex(h => FIELD_KEYWORDS[field].some(k => normalizeText(h).includes(k)));
    map[field] = idx >= 0 ? idx : null;
  });
  return map;
}

// Accepts both "1.200.000,50" (pt-BR) and "1200000.50" (plain) shaped values.
function parseLocaleNumber(raw: string): number | undefined {
  const cleaned = String(raw || '').replace(/[^\d,.-]/g, '');
  if (!cleaned) return undefined;
  const normalized = cleaned.includes(',') ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned;
  const n = parseFloat(normalized);
  return isNaN(n) ? undefined : n;
}

export const ImportLeadsModal: React.FC = () => {
  const { isImportModalOpen, setIsImportModalOpen, importType, setImportType, addLead, activeFunnelId, funnels, importLeadsBulk, triggerConfetti } =
    useCrm();

  // WhatsApp paste-text flow (unchanged from before)
  const [rawText, setRawText] = useState('');
  const [importedCount, setImportedCount] = useState<number | null>(null);

  // CSV/XLS file-upload wizard
  const [csvStep, setCsvStep] = useState<CsvStep>('upload');
  const [fileName, setFileName] = useState('');
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [hasHeaderRow, setHasHeaderRow] = useState(true);
  const [colMap, setColMap] = useState<Record<FieldKey, number | null>>({
    name: null,
    phone: null,
    email: null,
    propertyInterest: null,
    estimatedValue: null,
    origin: null,
    tags: null
  });
  const [targetFunnelId, setTargetFunnelId] = useState(activeFunnelId || 'investidores');
  const [parseError, setParseError] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [reviewRows, setReviewRows] = useState<ReviewRow[]>([]);

  useEscapeToClose(() => setIsImportModalOpen(false), isImportModalOpen);

  const resetCsvWizard = () => {
    setCsvStep('upload');
    setFileName('');
    setRawRows([]);
    setHasHeaderRow(true);
    setColMap({ name: null, phone: null, email: null, propertyInterest: null, estimatedValue: null, origin: null, tags: null });
    setParseError('');
    setImportResult(null);
    setReviewRows([]);
  };

  const handleClose = () => {
    setIsImportModalOpen(false);
    setRawText('');
    setImportedCount(null);
    resetCsvWizard();
  };

  const finalizeParsedRows = (rows: any[][]) => {
    const cleaned = rows
      .map(r => r.map(cell => (cell === null || cell === undefined ? '' : String(cell))))
      .filter(r => r.some(cell => cell.trim() !== ''));
    if (cleaned.length === 0) {
      setParseError('Não encontramos dados legíveis nesse arquivo.');
      return;
    }
    setRawRows(cleaned);
    setColMap(autoDetectColumns(cleaned[0]));
    setCsvStep('map');
  };

  const handleFile = async (file: File) => {
    setParseError('');
    setFileName(file.name);
    try {
      if (/\.(xlsx|xls)$/i.test(file.name)) {
        // Dynamically imported — xlsx is a large lib only needed by this
        // rarely-used modal, no reason to bloat the app's main bundle.
        const XLSX = await import('xlsx');
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' }) as any[][];
        finalizeParsedRows(rows);
      } else {
        const Papa = (await import('papaparse')).default;
        Papa.parse(file, {
          skipEmptyLines: true,
          complete: res => finalizeParsedRows(res.data as any[][]),
          error: (err: any) => setParseError(err?.message || 'Falha ao ler o CSV')
        });
      }
    } catch (err: any) {
      setParseError(err?.message || 'Falha ao ler o arquivo. Verifique se é um .csv, .xlsx ou .xls válido.');
    }
  };

  const dataRows = hasHeaderRow ? rawRows.slice(1) : rawRows;
  const previewRows = dataRows.slice(0, 5);
  const canProceedToImport = colMap.name !== null && colMap.phone !== null;

  // Moves from column-mapping into the editable review/validation step —
  // every row (not just a preview) becomes an editable draft so the user can
  // fix a missing/malformed Nome or Telefone right here instead of having to
  // patch the source file and re-upload.
  const handleProceedToReview = () => {
    const rows: ReviewRow[] = dataRows
      .filter(r => r.some(cell => cell.trim() !== ''))
      .map((r, i) => ({
        key: `row-${i}`,
        name: colMap.name !== null ? (r[colMap.name] || '').trim() : '',
        phone: colMap.phone !== null ? (r[colMap.phone] || '').trim() : '',
        email: colMap.email !== null ? (r[colMap.email] || '').trim() : '',
        propertyInterest: colMap.propertyInterest !== null ? (r[colMap.propertyInterest] || '').trim() : '',
        estimatedValue: colMap.estimatedValue !== null ? (r[colMap.estimatedValue] || '').trim() : '',
        origin: colMap.origin !== null ? (r[colMap.origin] || '').trim() : '',
        tagsText: colMap.tags !== null ? (r[colMap.tags] || '').trim() : '',
        excluded: false
      }));
    setReviewRows(rows);
    setCsvStep('review');
  };

  const updateReviewRow = (key: string, updates: Partial<ReviewRow>) => {
    setReviewRows(prev => prev.map(r => (r.key === key ? { ...r, ...updates } : r)));
  };

  const removeReviewRow = (key: string) => {
    setReviewRows(prev => prev.filter(r => r.key !== key));
  };

  // Row-level validation for the review table: missing Nome/Telefone block
  // import outright; a phone repeated elsewhere in this same file is flagged
  // so the user can dedupe before sending (the server also dedupes against
  // leads already in the system, but not against siblings in the same batch).
  const phoneCounts = useMemo(() => {
    const counts = new Map<string, number>();
    reviewRows.forEach(r => {
      if (r.excluded) return;
      const key = normalizePhoneKey(r.phone);
      if (!key) return;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }, [reviewRows]);

  const rowErrors = (row: ReviewRow): string[] => {
    const errs: string[] = [];
    if (!row.name.trim()) errs.push('Nome é obrigatório');
    if (!row.phone.trim()) errs.push('Telefone é obrigatório');
    const phoneKey = normalizePhoneKey(row.phone);
    if (phoneKey && (phoneCounts.get(phoneKey) || 0) > 1) errs.push('Telefone duplicado nesta planilha');
    return errs;
  };

  const activeReviewRows = reviewRows.filter(r => !r.excluded);
  const invalidReviewRows = activeReviewRows.filter(r => rowErrors(r).length > 0);
  const validReviewCount = activeReviewRows.length - invalidReviewRows.length;

  const handleCsvImport = async () => {
    setImporting(true);
    setParseError('');
    try {
      const rows: ImportLeadRow[] = activeReviewRows
        .filter(r => rowErrors(r).length === 0)
        .map(r => ({
          name: r.name.trim(),
          phone: r.phone.trim(),
          email: r.email.trim() || undefined,
          propertyInterest: r.propertyInterest.trim() || undefined,
          estimatedValue: parseLocaleNumber(r.estimatedValue),
          origin: r.origin.trim() || undefined,
          tags: r.tagsText.trim() ? r.tagsText.split(/[,;]/).map(t => t.trim()).filter(Boolean) : undefined,
          funnelId: targetFunnelId
        }));
      const result = await importLeadsBulk(rows);
      setImportResult(result);
      setCsvStep('result');
      if (result.created > 0) triggerConfetti();
    } catch (err: any) {
      setParseError(err?.message || 'Falha ao importar os leads.');
    } finally {
      setImporting(false);
    }
  };

  const handleWhatsappImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim()) return;

    const lines = rawText.trim().split('\n');
    let count = 0;

    lines.forEach(line => {
      if (!line.trim()) return;
      const phoneMatch = line.match(/\+?\d[\d\s-]{8,}/);
      const phone = phoneMatch ? phoneMatch[0].replace(/\D/g, '') : '11999999999';
      const name = line.replace(/\+?\d[\d\s-]{8,}/, '').replace(/[-():]/g, '').trim() || 'Lead WhatsApp';

      addLead({
        name,
        phone,
        propertyInterest: 'Empreendimento em Avaliação',
        estimatedValue: 650000,
        funnelId: activeFunnelId || 'investidores',
        stageId: 'lead_novo',
        temperature: 'morno',
        origin: 'WhatsApp',
        notes: 'Importado de contatos do WhatsApp.'
      });
      count++;
    });

    setImportedCount(count);
    triggerConfetti();
    setTimeout(() => {
      setIsImportModalOpen(false);
      setImportedCount(null);
      setRawText('');
    }, 1800);
  };

  const sampleWa = `Carlos Eduardo - (11) 98111-2233\nFernanda Lima: 11982223344`;

  const columnOptions = useMemo(() => {
    const headerRow = rawRows[0] || [];
    return (rawRows[0] || []).map((_, idx) => {
      const label = hasHeaderRow && headerRow[idx] ? headerRow[idx] : `Coluna ${idx + 1}`;
      return { idx, label };
    });
  }, [rawRows, hasHeaderRow]);

  // Every hook above must run on every render regardless of open/closed state
  // — this early return has to come after all of them (never before a hook),
  // otherwise React sees a different number of hooks between renders and
  // crashes with "Rendered more hooks than during the previous render."
  if (!isImportModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3E4A3D]/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-[#EAE7E2] overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-[#EAE7E2] bg-[#F4F1EA]/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#344E41] text-[#E9EDC9] flex items-center justify-center font-bold shadow-2xs">
              {importType === 'whatsapp' ? (
                <MessageSquare className="w-5 h-5 text-[#A3B18A]" />
              ) : (
                <FileSpreadsheet className="w-5 h-5 text-[#A3B18A]" />
              )}
            </div>
            <div>
              <h3 className="font-serif-title text-lg font-bold text-[#344E41]">
                {importType === 'whatsapp' ? 'Importar Leads do WhatsApp' : 'Importar Leads via Planilha'}
              </h3>
              <p className="text-xs text-[#3A403A]/60">
                {importType === 'whatsapp'
                  ? 'Cole as linhas abaixo para cadastrar múltiplos leads de uma só vez.'
                  : 'Envie um arquivo .csv, .xlsx ou .xls — leads com telefone já cadastrado são vinculados ao cliente existente.'}
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-1.5 text-[#3A403A]/40 hover:text-[#344E41] rounded-lg hover:bg-[#EAE7E2]/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          <div className="flex items-center gap-2 bg-[#F1EFEC] p-1 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setImportType('whatsapp');
                resetCsvWizard();
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                importType === 'whatsapp' ? 'bg-white shadow-2xs text-[#344E41]' : 'text-[#3A403A]/70'
              }`}
            >
              WhatsApp
            </button>
            <button
              type="button"
              onClick={() => setImportType('csv')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                importType === 'csv' ? 'bg-white shadow-2xs text-[#344E41]' : 'text-[#3A403A]/70'
              }`}
            >
              Planilha (CSV / Excel)
            </button>
          </div>

          {importType === 'whatsapp' ? (
            <form onSubmit={handleWhatsappImport} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-[#3A403A]/70">
                    Cole os contatos aqui (1 por linha)
                  </label>
                  <button
                    type="button"
                    onClick={() => setRawText(sampleWa)}
                    className="text-xs text-[#588157] hover:text-[#344E41] hover:underline font-semibold"
                  >
                    Colar exemplo
                  </button>
                </div>
                <textarea
                  required
                  rows={8}
                  value={rawText}
                  onChange={e => setRawText(e.target.value)}
                  placeholder={`Ex:\nCarlos Eduardo - (11) 98111-2233\nFernanda Lima: 11982223344`}
                  className="w-full text-xs font-mono p-3 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A] placeholder-[#3A403A]/40 focus:outline-hidden focus:border-[#A3B18A]"
                />
              </div>

              {importedCount !== null && (
                <div className="p-3 bg-[#A3B18A]/20 border border-[#A3B18A]/40 text-[#344E41] rounded-xl text-xs font-semibold flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#588157]" />
                  <span>{importedCount} leads importados com sucesso para o Funil!</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#EAE7E2]">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 border border-[#EAE7E2] text-[#3A403A] hover:bg-[#F1EFEC] text-xs rounded-xl font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#344E41] hover:bg-[#283d33] text-white text-xs rounded-xl font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Processar Importação</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {parseError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}

              {csvStep === 'upload' && (
                <label
                  onDragOver={e => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={e => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleFile(file);
                  }}
                  className={`flex flex-col items-center justify-center gap-2 p-10 border-2 border-dashed rounded-2xl cursor-pointer transition-colors ${
                    isDragging ? 'border-[#588157] bg-[#588157]/10' : 'border-[#EAE7E2] bg-[#FDFCFB] hover:bg-[#F4F1EA]/60'
                  }`}
                >
                  <FileUp className="w-8 h-8 text-[#588157]" />
                  <p className="text-xs font-semibold text-[#344E41]">Arraste um arquivo aqui ou clique para escolher</p>
                  <p className="text-[11px] text-[#3A403A]/50">Formatos aceitos: .csv, .xlsx, .xls</p>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handleFile(file);
                      e.target.value = '';
                    }}
                  />
                </label>
              )}

              {csvStep === 'map' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-[#3A403A]/70">
                      Arquivo: <strong className="text-[#344E41]">{fileName}</strong> · {dataRows.length} linha(s) de dados
                    </p>
                    <label className="flex items-center gap-1.5 text-[11px] text-[#3A403A]/70 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasHeaderRow}
                        onChange={e => setHasHeaderRow(e.target.checked)}
                        className="accent-[#588157]"
                      />
                      A 1ª linha é cabeçalho
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#3A403A]/70 mb-1.5">
                      Funil de destino
                    </label>
                    <select
                      value={targetFunnelId}
                      onChange={e => setTargetFunnelId(e.target.value)}
                      className="w-full text-xs p-2.5 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
                    >
                      {funnels.map(f => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(Object.keys(FIELD_LABELS) as FieldKey[]).map(field => (
                      <div key={field}>
                        <label className="block text-[11px] font-bold uppercase tracking-widest text-[#3A403A]/70 mb-1">
                          {FIELD_LABELS[field]}
                        </label>
                        <select
                          value={colMap[field] ?? ''}
                          onChange={e =>
                            setColMap(prev => ({ ...prev, [field]: e.target.value === '' ? null : Number(e.target.value) }))
                          }
                          className="w-full text-xs p-2 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
                        >
                          <option value="">— Não mapear —</option>
                          {columnOptions.map(opt => (
                            <option key={opt.idx} value={opt.idx}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>

                  {previewRows.length > 0 && (
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-[#3A403A]/70 mb-1.5">
                        Pré-visualização (primeiras {previewRows.length} linhas)
                      </p>
                      <div className="overflow-x-auto border border-[#EAE7E2] rounded-xl">
                        <table className="w-full text-[11px]">
                          <thead>
                            <tr className="bg-[#F4F1EA]">
                              {(Object.keys(FIELD_LABELS) as FieldKey[]).map(field => (
                                <th key={field} className="text-left p-2 font-semibold text-[#344E41] whitespace-nowrap">
                                  {FIELD_LABELS[field].replace(' *', '')}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {previewRows.map((row, i) => (
                              <tr key={i} className="border-t border-[#EAE7E2]">
                                {(Object.keys(FIELD_LABELS) as FieldKey[]).map(field => (
                                  <td key={field} className="p-2 text-[#3A403A]/80 whitespace-nowrap">
                                    {colMap[field] !== null ? row[colMap[field] as number] || '—' : '—'}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {!canProceedToImport && (
                    <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-2.5">
                      Mapeie pelo menos as colunas de <strong>Nome</strong> e <strong>Telefone</strong> para continuar.
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-[#EAE7E2]">
                    <button
                      type="button"
                      onClick={resetCsvWizard}
                      className="px-3 py-2 text-[#3A403A] hover:bg-[#F1EFEC] text-xs rounded-xl font-medium transition-colors flex items-center gap-1.5"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Escolher outro arquivo
                    </button>
                    <button
                      type="button"
                      disabled={!canProceedToImport}
                      onClick={handleProceedToReview}
                      className="px-5 py-2 bg-[#344E41] hover:bg-[#283d33] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs rounded-xl font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Validar {dataRows.length} linha(s)</span>
                    </button>
                  </div>
                </div>
              )}

              {csvStep === 'review' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <p className="text-xs text-[#3A403A]/70">
                      Revise os dados antes de confirmar. Corrija Nome/Telefone diretamente na tabela ou remova a linha.
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        {validReviewCount} válido(s)
                      </span>
                      {invalidReviewRows.length > 0 && (
                        <span className="text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                          {invalidReviewRows.length} com erro
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-[#EAE7E2] rounded-xl max-h-96">
                    <table className="w-full text-[11px]">
                      <thead className="sticky top-0 bg-[#F4F1EA] z-10">
                        <tr>
                          <th className="text-left p-2 font-semibold text-[#344E41] whitespace-nowrap">Nome *</th>
                          <th className="text-left p-2 font-semibold text-[#344E41] whitespace-nowrap">Telefone *</th>
                          <th className="text-left p-2 font-semibold text-[#344E41] whitespace-nowrap">E-mail</th>
                          <th className="text-left p-2 font-semibold text-[#344E41] whitespace-nowrap">Tags</th>
                          <th className="text-left p-2 font-semibold text-[#344E41] whitespace-nowrap">Status</th>
                          <th className="p-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {reviewRows.map(row => {
                          if (row.excluded) return null;
                          const errs = rowErrors(row);
                          const hasError = errs.length > 0;
                          return (
                            <tr key={row.key} className={`border-t border-[#EAE7E2] ${hasError ? 'bg-red-50/60' : ''}`}>
                              <td className="p-1.5">
                                <input
                                  type="text"
                                  value={row.name}
                                  onChange={e => updateReviewRow(row.key, { name: e.target.value })}
                                  className={`w-32 text-[11px] p-1.5 bg-white border rounded-lg text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A] ${
                                    !row.name.trim() ? 'border-red-300' : 'border-[#EAE7E2]'
                                  }`}
                                />
                              </td>
                              <td className="p-1.5">
                                <input
                                  type="text"
                                  value={row.phone}
                                  onChange={e => updateReviewRow(row.key, { phone: e.target.value })}
                                  className={`w-28 text-[11px] p-1.5 bg-white border rounded-lg text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A] ${
                                    !row.phone.trim() ? 'border-red-300' : 'border-[#EAE7E2]'
                                  }`}
                                />
                              </td>
                              <td className="p-1.5">
                                <input
                                  type="text"
                                  value={row.email}
                                  onChange={e => updateReviewRow(row.key, { email: e.target.value })}
                                  className="w-32 text-[11px] p-1.5 bg-white border border-[#EAE7E2] rounded-lg text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
                                />
                              </td>
                              <td className="p-1.5">
                                <input
                                  type="text"
                                  value={row.tagsText}
                                  placeholder="quente, apartamento"
                                  onChange={e => updateReviewRow(row.key, { tagsText: e.target.value })}
                                  className="w-32 text-[11px] p-1.5 bg-white border border-[#EAE7E2] rounded-lg text-[#3A403A] focus:outline-hidden focus:border-[#A3B18A]"
                                />
                              </td>
                              <td className="p-1.5">
                                {hasError ? (
                                  <span className="text-red-700 font-semibold" title={errs.join(' · ')}>
                                    {errs[0]}{errs.length > 1 ? ` (+${errs.length - 1})` : ''}
                                  </span>
                                ) : (
                                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                                    <Check className="w-3 h-3" /> OK
                                  </span>
                                )}
                              </td>
                              <td className="p-1.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => removeReviewRow(row.key)}
                                  title="Remover esta linha da importação"
                                  className="p-1 text-[#3A403A]/40 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {invalidReviewRows.length > 0 && (
                    <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-2.5">
                      A importação fica bloqueada enquanto houver linhas com erro. Corrija Nome/Telefone na tabela acima ou remova a linha com o ícone de lixeira.
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-[#EAE7E2]">
                    <button
                      type="button"
                      onClick={() => setCsvStep('map')}
                      className="px-3 py-2 text-[#3A403A] hover:bg-[#F1EFEC] text-xs rounded-xl font-medium transition-colors flex items-center gap-1.5"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Voltar ao mapeamento
                    </button>
                    <button
                      type="button"
                      disabled={validReviewCount === 0 || invalidReviewRows.length > 0 || importing}
                      onClick={handleCsvImport}
                      className="px-5 py-2 bg-[#344E41] hover:bg-[#283d33] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs rounded-xl font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{importing ? 'Importando...' : `Confirmar importação de ${validReviewCount} lead(s)`}</span>
                    </button>
                  </div>
                </div>
              )}

              {csvStep === 'result' && importResult && (
                <div className="space-y-4">
                  <div className="p-4 bg-[#A3B18A]/20 border border-[#A3B18A]/40 text-[#344E41] rounded-xl text-xs font-semibold flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#588157] mt-0.5 shrink-0" />
                    <div className="space-y-0.5">
                      <p>{importResult.created} lead(s) importado(s) com sucesso!</p>
                      {importResult.linkedToExistingClient > 0 && (
                        <p className="font-normal text-[11px]">
                          {importResult.linkedToExistingClient} deles vinculado(s) a clientes já cadastrados (telefone já existente).
                        </p>
                      )}
                      {importResult.duplicatesSkipped > 0 && (
                        <p className="font-normal text-[11px]">
                          {importResult.duplicatesSkipped} linha(s) ignorada(s) por telefone já existir em outro lead.
                        </p>
                      )}
                    </div>
                  </div>

                  {importResult.errors.length > 0 && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
                      <p className="font-semibold mb-1">{importResult.errors.length} linha(s) com erro:</p>
                      <ul className="space-y-0.5 max-h-32 overflow-y-auto">
                        {importResult.errors.map((err, i) => (
                          <li key={i}>
                            Linha {err.row}: {err.error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#EAE7E2]">
                    <button
                      type="button"
                      onClick={resetCsvWizard}
                      className="px-4 py-2 border border-[#EAE7E2] text-[#3A403A] hover:bg-[#F1EFEC] text-xs rounded-xl font-medium transition-colors"
                    >
                      Importar outro arquivo
                    </button>
                    <button
                      type="button"
                      onClick={handleClose}
                      className="px-5 py-2 bg-[#344E41] hover:bg-[#283d33] text-white text-xs rounded-xl font-semibold shadow-xs transition-colors"
                    >
                      Concluir
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
