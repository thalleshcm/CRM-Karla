import React, { useState } from 'react';
import { X, Upload, MessageSquare, FileSpreadsheet, Check, AlertCircle } from 'lucide-react';
import { useCrm } from '../context/CrmContext';

export const ImportLeadsModal: React.FC = () => {
  const {
    isImportModalOpen,
    setIsImportModalOpen,
    importType,
    setImportType,
    addLead,
    activeFunnelId,
    triggerConfetti
  } = useCrm();

  const [rawText, setRawText] = useState('');
  const [importedCount, setImportedCount] = useState<number | null>(null);

  if (!isImportModalOpen) return null;

  const handleImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim()) return;

    const lines = rawText.trim().split('\n');
    let count = 0;

    lines.forEach(line => {
      if (!line.trim()) return;

      // Handle CSV format: Name, Phone, Email, Property, Value
      if (importType === 'csv' || line.includes(',') || line.includes(';')) {
        const separator = line.includes(';') ? ';' : ',';
        const parts = line.split(separator).map(p => p.trim().replace(/^["']|["']$/g, ''));
        const name = parts[0] || 'Lead Importado';
        const phone = parts[1] || '11999999999';
        const email = parts[2]?.includes('@') ? parts[2] : undefined;
        const property = parts[3] || 'Imóvel em Prospecção';
        const val = parseFloat(parts[4]) || 800000;

        addLead({
          name,
          phone,
          email,
          propertyInterest: property,
          estimatedValue: val,
          funnelId: activeFunnelId || 'investidores',
          stageId: 'lead_novo',
          temperature: 'morno',
          origin: 'Importação CSV',
          notes: 'Importado em lote via CSV.'
        });
        count++;
      } else {
        // WhatsApp format: Name - Phone or Name (Phone)
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
      }
    });

    setImportedCount(count);
    triggerConfetti();
    setTimeout(() => {
      setIsImportModalOpen(false);
      setImportedCount(null);
      setRawText('');
    }, 1800);
  };

  const sampleCsv = `Roberto Silva, 11987654321, roberto@email.com, Reserva dos Lagos, 1200000\nCarla Prado, 11976543210, carla@email.com, Edifício Horizon, 850000`;
  const sampleWa = `Carlos Eduardo - (11) 98111-2233\nFernanda Lima: 11982223344`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3E4A3D]/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-[#EAE7E2] overflow-hidden flex flex-col max-h-[90vh]"
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
                {importType === 'whatsapp' ? 'Importar Leads do WhatsApp' : 'Importar Leads via CSV'}
              </h3>
              <p className="text-xs text-[#3A403A]/60">
                Cole as linhas abaixo para cadastrar múltiplos leads de uma só vez.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsImportModalOpen(false)}
            className="p-1.5 text-[#3A403A]/40 hover:text-[#344E41] rounded-lg hover:bg-[#EAE7E2]/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleImport} className="p-6 space-y-4">
          <div className="flex items-center gap-2 bg-[#F1EFEC] p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setImportType('whatsapp')}
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
              Planilha CSV
            </button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-[#3A403A]/70">
                Cole os dados aqui (1 por linha)
              </label>
              <button
                type="button"
                onClick={() => setRawText(importType === 'csv' ? sampleCsv : sampleWa)}
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
              placeholder={
                importType === 'csv'
                  ? `Nome, Telefone, Email, Imovel, Valor\nEx: João Silva, 11988887777, joao@gmail.com, Mansão Jardins, 2500000`
                  : `Ex:\nCarlos Eduardo - (11) 98111-2233\nFernanda Lima: 11982223344`
              }
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
              onClick={() => setIsImportModalOpen(false)}
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
      </div>
    </div>
  );
};
