import React from 'react';
import { Search, X, ChevronDown, Flame, User, Phone, Building2, Copy } from 'lucide-react';
import { Lead } from '../../types';
import { STAGES } from '../../data/initialData';
import { formatPhone } from '../../utils/formatters';

interface LeadSelectorProps {
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  leadSearchQuery: string;
  onSearchChange: (value: string) => void;
  isDropdownOpen: boolean;
  onToggleDropdown: (open: boolean) => void;
  filteredLeads: Lead[];
  currentLead: Lead | null;
  onSelectLead: (lead: Lead) => void;
  portalLinkCopied: boolean;
  onCopyPortalLink: () => void;
}

export const LeadSelector: React.FC<LeadSelectorProps> = ({
  dropdownRef,
  searchInputRef,
  leadSearchQuery,
  onSearchChange,
  isDropdownOpen,
  onToggleDropdown,
  filteredLeads,
  currentLead,
  onSelectLead,
  portalLinkCopied,
  onCopyPortalLink
}) => {
  return (
    <div className="bg-white p-4 rounded-2xl border border-[#EAE7E2] shadow-2xs space-y-3" ref={dropdownRef}>
      <div className="flex items-center gap-2">
        <span className="w-5 h-5 rounded-full bg-[#344E41] text-white text-[10px] font-bold flex items-center justify-center shrink-0">1</span>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-[#344E41]">
          Destinatário
        </label>
      </div>

      {/* Search Bar Input with Auto-complete Dropdown */}
      <div className="relative">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            id="lead-search-input"
            ref={searchInputRef}
            type="text"
            value={leadSearchQuery}
            onChange={e => {
              onSearchChange(e.target.value);
              if (!isDropdownOpen) onToggleDropdown(true);
            }}
            onFocus={() => onToggleDropdown(true)}
            placeholder="Pesquisar por nome, telefone, imóvel..."
            className="w-full text-xs pl-9 pr-8 py-2.5 bg-[#FDFCFB] border border-[#EAE7E2] rounded-xl text-[#3A403A] placeholder:text-slate-400 focus:outline-hidden focus:border-[#A3B18A] focus:ring-1 focus:ring-[#A3B18A] transition-all font-medium"
          />
          {leadSearchQuery ? (
            <button
              type="button"
              onClick={() => {
                onSearchChange('');
                searchInputRef.current?.focus();
              }}
              className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onToggleDropdown(!isDropdownOpen)}
              className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>

        {/* Dropdown Results List (Search Results) */}
        {isDropdownOpen && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-[#EAE7E2] rounded-2xl shadow-xl z-30 max-h-60 overflow-y-auto divide-y divide-[#F4F1EA] animate-in fade-in zoom-in-95 duration-100">
            <div className="p-2 bg-[#F4F1EA]/60 text-[10px] font-semibold text-[#3A403A]/70 flex items-center justify-between sticky top-0 backdrop-blur-xs z-10">
              <span>
                {filteredLeads.length > 50
                  ? `Mostrando 50 de ${filteredLeads.length} leads — refine a busca para ver os demais`
                  : `${filteredLeads.length} leads encontrados`}
              </span>
              {leadSearchQuery && (
                <span className="text-emerald-800 font-bold">Filtro: "{leadSearchQuery}"</span>
              )}
            </div>

            {filteredLeads.length > 0 ? (
              filteredLeads.slice(0, 50).map(lead => {
                const isSelected = currentLead?.id === lead.id;
                const stageInfo = STAGES.find(s => s.id === lead.stageId);
                return (
                  <button
                    key={lead.id}
                    type="button"
                    onClick={() => onSelectLead(lead)}
                    className={`w-full text-left p-2.5 hover:bg-[#FAF9F5] transition flex items-center justify-between gap-2 cursor-pointer ${
                      isSelected ? 'bg-emerald-50/70' : ''
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-[#344E41] truncate">{lead.name}</p>
                        {lead.temperature === 'quente' && <Flame className="w-3 h-3 text-rose-500 shrink-0" />}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                        <span>{formatPhone(lead.phone)}</span>
                        {lead.propertyInterest && (
                          <>
                            <span>•</span>
                            <span className="text-[#3A403A]">{lead.propertyInterest}</span>
                          </>
                        )}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[9px] font-semibold uppercase px-2 py-0.5 rounded-md bg-[#F4F1EA] text-[#344E41]">
                        {stageInfo?.name || lead.stageId}
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-4 text-center text-xs text-slate-500">
                Nenhum lead encontrado com esse termo.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Active Lead Details Card */}
      {currentLead ? (
        <div className="p-3 bg-[#F4F1EA]/60 rounded-xl text-xs space-y-2 border border-[#EAE7E2]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <User className="w-3.5 h-3.5 text-[#588157] shrink-0" />
              <span className="font-bold text-[#344E41] truncate">{currentLead.name}</span>
              {currentLead.temperature === 'quente' && <Flame className="w-3 h-3 text-rose-500 shrink-0" />}
            </div>
            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 shrink-0">
              {STAGES.find(s => s.id === currentLead.stageId)?.name || currentLead.stageId}
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-[#3A403A]/80 pt-1.5 border-t border-[#EAE7E2]">
            <span className="flex items-center gap-1 truncate">
              <Phone className="w-3 h-3 text-[#588157] shrink-0" />
              <span className="font-mono text-slate-700 font-medium">{formatPhone(currentLead.phone)}</span>
            </span>
            <span className="flex items-center gap-1 truncate min-w-0">
              <Building2 className="w-3 h-3 text-[#588157] shrink-0" />
              <span className="truncate">{currentLead.propertyInterest || 'Imóvel sob consulta'}</span>
            </span>
          </div>

          <button
            type="button"
            onClick={onCopyPortalLink}
            className="text-[10px] text-emerald-800 hover:text-emerald-950 font-bold flex items-center gap-1 hover:underline cursor-pointer pt-1"
            title="Copiar link do portal de onboarding e envio de documentos"
          >
            <Copy className="w-3 h-3" />
            <span>{portalLinkCopied ? 'Link do portal copiado!' : 'Copiar link do portal'}</span>
          </button>
        </div>
      ) : (
        <div className="p-3 bg-amber-50 rounded-xl text-xs text-amber-800 border border-amber-200">
          Nenhum lead selecionado. Use a busca acima.
        </div>
      )}
    </div>
  );
};
