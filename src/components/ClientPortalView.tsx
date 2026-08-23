import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Upload,
  Check,
  X,
  FileText,
  Building2,
  Phone,
  Mail,
  Calendar,
  CheckCircle2,
  Trash2,
  Eye,
  Plus
} from 'lucide-react';
import { Lead, ClientOnboardingData, ClientDocument, AdditionalBuyer } from '../types';
import { useCrm } from '../context/CrmContext';
import { crmApi } from '../services/api';

interface ClientPortalViewProps {
  lead?: Lead | null;
  token?: string;
  isStandalonePage?: boolean;
  onClose?: () => void;
}

export const ClientPortalView: React.FC<ClientPortalViewProps> = ({
  lead: propLead,
  token,
  isStandalonePage = false,
  onClose
}) => {
  const { leads, clientPortalLead, isClientPortalModalOpen, setIsClientPortalModalOpen, submitClientOnboardingData } = useCrm();

  // Find target lead
  const targetLead =
    propLead ||
    clientPortalLead ||
    (token ? leads.find(l => l.clientPortalToken === token || l.id === token) : null) ||
    leads[0] ||
    null;

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [rg, setRg] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('');
  const [profession, setProfession] = useState('');
  const [naturalness, setNaturalness] = useState('');

  // Address
  const [cep, setCep] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [cepLoading, setCepLoading] = useState(false);

  // Spouse / 2nd Buyer
  const [spouseFullName, setSpouseFullName] = useState('');
  const [spouseCpf, setSpouseCpf] = useState('');
  const [spouseRg, setSpouseRg] = useState('');
  const [spouseBirthDate, setSpouseBirthDate] = useState('');
  const [spouseProfession, setSpouseProfession] = useState('');
  const [spousePhone, setSpousePhone] = useState('');
  const [spouseEmail, setSpouseEmail] = useState('');

  // Additional Buyers (3rd+)
  const [additionalBuyers, setAdditionalBuyers] = useState<AdditionalBuyer[]>([]);

  // Documents
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, ClientDocument>>({});
  const [uploadingDocs, setUploadingDocs] = useState<Record<string, boolean>>({});
  const [previewDoc, setPreviewDoc] = useState<ClientDocument | null>(null);

  // Submission State
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [aiAutoFilled, setAiAutoFilled] = useState(false);

  // Input file refs
  const fileInputRefs = {
    rg_cnh: useRef<HTMLInputElement | null>(null),
    comprovante_endereco: useRef<HTMLInputElement | null>(null),
    certidao_civil: useRef<HTMLInputElement | null>(null),
    comprovante_renda: useRef<HTMLInputElement | null>(null)
  };

  // Sync initial data from lead
  useEffect(() => {
    if (targetLead) {
      setFullName(targetLead.name || '');
      setEmail(targetLead.email || '');
      setPhone(targetLead.phone || '');
      setBirthDate(targetLead.birthday || '');
      setCpf(targetLead.mainBuyer?.cpf || targetLead.clientData?.cpf || '');
      setRg(targetLead.mainBuyer?.rg || targetLead.clientData?.rg || '');
      setMaritalStatus(targetLead.mainBuyer?.maritalStatus || targetLead.clientData?.maritalStatus || '');
      setProfession(targetLead.mainBuyer?.profession || targetLead.clientData?.profession || '');
      setNaturalness(targetLead.mainBuyer?.naturalness || '');

      // Address
      if (targetLead.clientData) {
        setCep(targetLead.clientData.cep || '');
        setStreet(targetLead.clientData.street || '');
        setNumber(targetLead.clientData.number || '');
        setComplement(targetLead.clientData.complement || '');
        setNeighborhood(targetLead.clientData.neighborhood || '');
        setCity(targetLead.clientData.city || '');
        setState(targetLead.clientData.state || '');
      }

      // Spouse
      if (targetLead.spouseBuyer) {
        setSpouseFullName(targetLead.spouseBuyer.fullName || '');
        setSpouseCpf(targetLead.spouseBuyer.cpf || '');
        setSpouseRg(targetLead.spouseBuyer.rg || '');
        setSpouseBirthDate(targetLead.spouseBuyer.birthDate || '');
        setSpouseProfession(targetLead.spouseBuyer.profession || '');
        setSpousePhone(targetLead.spouseBuyer.phone || '');
        setSpouseEmail(targetLead.spouseBuyer.email || '');
      }

      // Additional buyers
      if (targetLead.additionalBuyers) {
        setAdditionalBuyers(targetLead.additionalBuyers);
      }
    }
  }, [targetLead]);

  // Mask helpers
  const maskCpf = (v: string) => {
    return v
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
      .slice(0, 14);
  };

  const maskCep = (v: string) => {
    return v
      .replace(/\D/g, '')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .slice(0, 9);
  };

  const maskPhone = (v: string) => {
    return v
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/g, '($1) $2')
      .replace(/(\d)(\d{4})$/, '$1-$2')
      .slice(0, 15);
  };

  // ViaCEP Lookup
  const handleCepBlur = async () => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      setCepLoading(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setStreet(data.logradouro || '');
          setNeighborhood(data.bairro || '');
          setCity(data.localidade || '');
          setState(data.uf || '');
        }
      } catch (err) {
        console.error('Erro ao consultar CEP:', err);
      } finally {
        setCepLoading(false);
      }
    }
  };

  // File Upload — reads the file, sends it to Supabase Storage, and keeps
  // only the resulting URL (never the raw base64) in form state.
  const handleFileChange = (docKey: string, docLabel: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDocs(prev => ({ ...prev, [docKey]: true }));

    const reader = new FileReader();
    reader.onload = async event => {
      try {
        const dataUrl = event.target?.result as string;
        const base64 = dataUrl.split(',')[1] || '';

        const uploaded = token
          ? await crmApi.uploadPortalFile(token, file.name, file.type, base64)
          : await crmApi.uploadFile(file.name, file.type, base64);

        const newDoc: ClientDocument = {
          id: `doc-${Date.now()}`,
          category: docKey as any,
          categoryLabel: docLabel,
          fileName: file.name,
          fileType: file.type,
          fileDataUrl: uploaded.url,
          fileSize: `${(uploaded.size / (1024 * 1024)).toFixed(1)} MB`,
          uploadedAt: new Date().toLocaleDateString('pt-BR'),
          status: 'pendente'
        };

        setUploadedDocs(prev => ({
          ...prev,
          [docKey]: newDoc
        }));
      } catch (err) {
        console.error('Falha ao enviar documento:', err);
        alert('Não foi possível enviar o documento. Tente novamente.');
      } finally {
        setUploadingDocs(prev => ({ ...prev, [docKey]: false }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveDoc = (docKey: string) => {
    setUploadedDocs(prev => {
      const next = { ...prev };
      delete next[docKey];
      return next;
    });
  };

  const handleAddAdditionalBuyer = () => {
    const newBuyer: AdditionalBuyer = {
      id: `ab-${Date.now()}`,
      fullName: '',
      cpf: '',
      profession: ''
    };
    setAdditionalBuyers(prev => [...prev, newBuyer]);
  };

  const handleUpdateAdditionalBuyer = (index: number, field: keyof AdditionalBuyer, val: string) => {
    setAdditionalBuyers(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleRemoveAdditionalBuyer = (index: number) => {
    setAdditionalBuyers(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetLead) return;

    const docList: ClientDocument[] = Object.values(uploadedDocs);

    const clientData: ClientOnboardingData = {
      fullName,
      cpf,
      rg,
      birthDate,
      maritalStatus,
      profession,
      email,
      phone,
      cep,
      street,
      number,
      complement,
      neighborhood,
      city,
      state,
      spouse: spouseFullName
        ? {
            fullName: spouseFullName,
            cpf: spouseCpf,
            rg: spouseRg,
            birthDate: spouseBirthDate,
            profession: spouseProfession,
            phone: spousePhone,
            email: spouseEmail
          }
        : undefined,
      additionalBuyers: additionalBuyers.length > 0 ? additionalBuyers : undefined,
      documents: docList,
      status: 'enviado'
    };

    submitClientOnboardingData(targetLead.id, clientData);
    setIsSubmitted(true);
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      setIsClientPortalModalOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#2B2927] py-10 px-4 sm:px-6 relative">
      {/* Top Close Bar if viewed inside CRM Modal */}
      {!isStandalonePage && (
        <div className="max-w-3xl mx-auto mb-6 flex items-center justify-between bg-white px-5 py-3 rounded-2xl border border-[#E5E0D8] shadow-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            <span className="text-xs font-bold text-[#344E41]">Pré-visualização do Link de Auto-cadastro</span>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-[#F4F1EA] hover:bg-[#EAE7E2] rounded-xl transition cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>Fechar pré-visualização</span>
          </button>
        </div>
      )}

      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header (Screenshot 2 exact typography) */}
        <div className="text-center space-y-1.5 pt-2 pb-4">
          <h1 className="font-serif-title text-3xl sm:text-4xl text-[#1C1B17] font-bold tracking-tight">
            Cadastro do cliente
          </h1>
          <p className="text-xs sm:text-sm text-[#736E65]">
            Preencha seus dados e anexe os documentos solicitados.
          </p>
        </div>

        {/* AI Notification Banner if auto-filled */}
        {aiAutoFilled && (
          <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 text-xs text-emerald-900 flex items-center gap-2 animate-in fade-in">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>✨ Documento processado por IA! Os campos foram preenchidos automaticamente. Confira antes de enviar.</span>
          </div>
        )}

        {isSubmitted ? (
          /* Success Screen */
          <div className="bg-white rounded-2xl border border-[#E5E0D8] p-8 sm:p-12 text-center space-y-4 shadow-sm animate-in zoom-in-95">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-9 h-9 text-emerald-700" />
            </div>
            <h2 className="font-serif-title text-2xl font-bold text-[#1C1B17]">
              Cadastro Enviado com Sucesso!
            </h2>
            <p className="text-xs sm:text-sm text-[#736E65] max-w-md mx-auto leading-relaxed">
              Obrigado, <strong className="text-[#1C1B17]">{fullName}</strong>. Seus dados e documentos foram recebidos com segurança e estão sendo analisados pela nossa equipe imobiliária.
            </p>
            <div className="pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-2.5 bg-[#1C1B17] hover:bg-[#2C2A24] text-white text-xs font-bold rounded-xl transition shadow"
              >
                Concluir e Fechar
              </button>
            </div>
          </div>
        ) : (
          /* Form Content (Screenshot 2 & 3 exact matching cards) */
          <form onSubmit={handleSubmitForm} className="space-y-6">
            {/* ======================================================== */}
            {/* CARD 1: 1º Comprador                                     */}
            {/* ======================================================== */}
            <div className="bg-white rounded-2xl border border-[#E5E0D8] p-6 sm:p-8 space-y-4 shadow-xs">
              <h2 className="font-bold text-sm sm:text-base text-[#1C1B17]">1º Comprador</h2>

              <div className="space-y-4">
                {/* Nome completo */}
                <div>
                  <label className="block text-[11px] font-medium text-[#736E65] mb-1">
                    Nome completo <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Nome completo do titular"
                    className="w-full text-xs p-3 bg-white border border-[#E5E0D8] rounded-xl text-[#1C1B17] focus:outline-none focus:border-[#1C1B17] transition"
                  />
                </div>

                {/* E-mail & Telefone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-medium text-[#736E65] mb-1">E-mail</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="email@exemplo.com"
                      className="w-full text-xs p-3 bg-white border border-[#E5E0D8] rounded-xl text-[#1C1B17] focus:outline-none focus:border-[#1C1B17] transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#736E65] mb-1">Telefone</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(maskPhone(e.target.value))}
                      placeholder="(00) 00000-0000"
                      className="w-full text-xs p-3 bg-white border border-[#E5E0D8] rounded-xl text-[#1C1B17] focus:outline-none focus:border-[#1C1B17] transition font-mono"
                    />
                  </div>
                </div>

                {/* CPF & RG */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-medium text-[#736E65] mb-1">
                      CPF <span className="text-rose-500 font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={cpf}
                      onChange={e => setCpf(maskCpf(e.target.value))}
                      placeholder="000.000.000-00"
                      className="w-full text-xs p-3 bg-white border border-[#E5E0D8] rounded-xl text-[#1C1B17] focus:outline-none focus:border-[#1C1B17] transition font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#736E65] mb-1">
                      RG <span className="text-rose-500 font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={rg}
                      onChange={e => setRg(e.target.value)}
                      placeholder="Número do RG / Órgão Emissor"
                      className="w-full text-xs p-3 bg-white border border-[#E5E0D8] rounded-xl text-[#1C1B17] focus:outline-none focus:border-[#1C1B17] transition font-mono"
                    />
                  </div>
                </div>

                {/* Data de nascimento & Estado civil */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-medium text-[#736E65] mb-1">
                      Data de nascimento
                    </label>
                    <input
                      type="date"
                      value={birthDate}
                      onChange={e => setBirthDate(e.target.value)}
                      className="w-full text-xs p-3 bg-white border border-[#E5E0D8] rounded-xl text-[#1C1B17] focus:outline-none focus:border-[#1C1B17] transition font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#736E65] mb-1">
                      Estado civil
                    </label>
                    <select
                      value={maritalStatus}
                      onChange={e => setMaritalStatus(e.target.value)}
                      className="w-full text-xs p-3 bg-white border border-[#E5E0D8] rounded-xl text-[#1C1B17] focus:outline-none focus:border-[#1C1B17] transition"
                    >
                      <option value="">Selecione...</option>
                      <option value="Solteiro(a)">Solteiro(a)</option>
                      <option value="Casado(a) - Comunhão Parcial de Bens">Casado(a) - Comunhão Parcial de Bens</option>
                      <option value="Casado(a) - Comunhão Universal de Bens">Casado(a) - Comunhão Universal de Bens</option>
                      <option value="Casado(a) - Separação Total de Bens">Casado(a) - Separação Total de Bens</option>
                      <option value="União Estável">União Estável</option>
                      <option value="Divorciado(a)">Divorciado(a)</option>
                      <option value="Viúvo(a)">Viúvo(a)</option>
                    </select>
                  </div>
                </div>

                {/* Profissão & Naturalidade */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-medium text-[#736E65] mb-1">Profissão</label>
                    <input
                      type="text"
                      value={profession}
                      onChange={e => setProfession(e.target.value)}
                      placeholder="Ex: Engenheiro, Médica, Empresário"
                      className="w-full text-xs p-3 bg-white border border-[#E5E0D8] rounded-xl text-[#1C1B17] focus:outline-none focus:border-[#1C1B17] transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#736E65] mb-1">Naturalidade</label>
                    <input
                      type="text"
                      value={naturalness}
                      onChange={e => setNaturalness(e.target.value)}
                      placeholder="Cidade / Estado natal"
                      className="w-full text-xs p-3 bg-white border border-[#E5E0D8] rounded-xl text-[#1C1B17] focus:outline-none focus:border-[#1C1B17] transition"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ======================================================== */}
            {/* CARD 2: Endereço                                         */}
            {/* ======================================================== */}
            <div className="bg-white rounded-2xl border border-[#E5E0D8] p-6 sm:p-8 space-y-4 shadow-xs">
              <h2 className="font-bold text-sm sm:text-base text-[#1C1B17]">Endereço</h2>

              <div className="space-y-4">
                {/* CEP */}
                <div className="max-w-xs">
                  <label className="block text-[11px] font-medium text-[#736E65] mb-1">
                    CEP {cepLoading && <span className="text-[10px] text-slate-400 animate-pulse">(buscando...)</span>}
                  </label>
                  <input
                    type="text"
                    value={cep}
                    onChange={e => setCep(maskCep(e.target.value))}
                    onBlur={handleCepBlur}
                    placeholder="00000-000"
                    className="w-full text-xs p-3 bg-white border border-[#E5E0D8] rounded-xl text-[#1C1B17] focus:outline-none focus:border-[#1C1B17] transition font-mono"
                  />
                </div>

                {/* Rua */}
                <div>
                  <label className="block text-[11px] font-medium text-[#736E65] mb-1">Rua</label>
                  <input
                    type="text"
                    value={street}
                    onChange={e => setStreet(e.target.value)}
                    placeholder="Logradouro / Avenida / Rua"
                    className="w-full text-xs p-3 bg-white border border-[#E5E0D8] rounded-xl text-[#1C1B17] focus:outline-none focus:border-[#1C1B17] transition"
                  />
                </div>

                {/* Número & Complemento */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-medium text-[#736E65] mb-1">Número</label>
                    <input
                      type="text"
                      value={number}
                      onChange={e => setNumber(e.target.value)}
                      placeholder="123"
                      className="w-full text-xs p-3 bg-white border border-[#E5E0D8] rounded-xl text-[#1C1B17] focus:outline-none focus:border-[#1C1B17] transition font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#736E65] mb-1">Complemento</label>
                    <input
                      type="text"
                      value={complement}
                      onChange={e => setComplement(e.target.value)}
                      placeholder="Apto 402, Bloco B"
                      className="w-full text-xs p-3 bg-white border border-[#E5E0D8] rounded-xl text-[#1C1B17] focus:outline-none focus:border-[#1C1B17] transition"
                    />
                  </div>
                </div>

                {/* Bairro & Cidade */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-medium text-[#736E65] mb-1">Bairro</label>
                    <input
                      type="text"
                      value={neighborhood}
                      onChange={e => setNeighborhood(e.target.value)}
                      placeholder="Bairro"
                      className="w-full text-xs p-3 bg-white border border-[#E5E0D8] rounded-xl text-[#1C1B17] focus:outline-none focus:border-[#1C1B17] transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#736E65] mb-1">Cidade</label>
                    <input
                      type="text"
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      placeholder="Cidade"
                      className="w-full text-xs p-3 bg-white border border-[#E5E0D8] rounded-xl text-[#1C1B17] focus:outline-none focus:border-[#1C1B17] transition"
                    />
                  </div>
                </div>

                {/* Estado */}
                <div className="max-w-xs">
                  <label className="block text-[11px] font-medium text-[#736E65] mb-1">Estado</label>
                  <input
                    type="text"
                    value={state}
                    onChange={e => setState(e.target.value)}
                    placeholder="UF (ex: SP, MG, RJ)"
                    className="w-full text-xs p-3 bg-white border border-[#E5E0D8] rounded-xl text-[#1C1B17] focus:outline-none focus:border-[#1C1B17] transition uppercase font-mono"
                  />
                </div>
              </div>
            </div>

            {/* ======================================================== */}
            {/* CARD 3: Cônjuge / 2º Comprador (se houver)               */}
            {/* ======================================================== */}
            <div className="bg-white rounded-2xl border border-[#E5E0D8] p-6 sm:p-8 space-y-4 shadow-xs">
              <h2 className="font-bold text-sm sm:text-base text-[#1C1B17]">
                Cônjuge / 2º Comprador (se houver)
              </h2>

              <div className="space-y-4">
                {/* Nome completo */}
                <div>
                  <label className="block text-[11px] font-medium text-[#736E65] mb-1">Nome completo</label>
                  <input
                    type="text"
                    value={spouseFullName}
                    onChange={e => setSpouseFullName(e.target.value)}
                    placeholder="Nome completo do cônjuge / co-comprador"
                    className="w-full text-xs p-3 bg-white border border-[#E5E0D8] rounded-xl text-[#1C1B17] focus:outline-none focus:border-[#1C1B17] transition"
                  />
                </div>

                {/* CPF & RG */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-medium text-[#736E65] mb-1">CPF</label>
                    <input
                      type="text"
                      value={spouseCpf}
                      onChange={e => setSpouseCpf(maskCpf(e.target.value))}
                      placeholder="000.000.000-00"
                      className="w-full text-xs p-3 bg-white border border-[#E5E0D8] rounded-xl text-[#1C1B17] focus:outline-none focus:border-[#1C1B17] transition font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#736E65] mb-1">RG</label>
                    <input
                      type="text"
                      value={spouseRg}
                      onChange={e => setSpouseRg(e.target.value)}
                      placeholder="Número do RG"
                      className="w-full text-xs p-3 bg-white border border-[#E5E0D8] rounded-xl text-[#1C1B17] focus:outline-none focus:border-[#1C1B17] transition font-mono"
                    />
                  </div>
                </div>

                {/* Data de nascimento & Profissão */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-medium text-[#736E65] mb-1">
                      Data de nascimento
                    </label>
                    <input
                      type="date"
                      value={spouseBirthDate}
                      onChange={e => setSpouseBirthDate(e.target.value)}
                      className="w-full text-xs p-3 bg-white border border-[#E5E0D8] rounded-xl text-[#1C1B17] focus:outline-none focus:border-[#1C1B17] transition font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#736E65] mb-1">Profissão</label>
                    <input
                      type="text"
                      value={spouseProfession}
                      onChange={e => setSpouseProfession(e.target.value)}
                      placeholder="Profissão do cônjuge"
                      className="w-full text-xs p-3 bg-white border border-[#E5E0D8] rounded-xl text-[#1C1B17] focus:outline-none focus:border-[#1C1B17] transition"
                    />
                  </div>
                </div>

                {/* Telefone & E-mail */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-medium text-[#736E65] mb-1">Telefone</label>
                    <input
                      type="tel"
                      value={spousePhone}
                      onChange={e => setSpousePhone(maskPhone(e.target.value))}
                      placeholder="(00) 00000-0000"
                      className="w-full text-xs p-3 bg-white border border-[#E5E0D8] rounded-xl text-[#1C1B17] focus:outline-none focus:border-[#1C1B17] transition font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#736E65] mb-1">E-mail</label>
                    <input
                      type="email"
                      value={spouseEmail}
                      onChange={e => setSpouseEmail(e.target.value)}
                      placeholder="emaildoconjuge@exemplo.com"
                      className="w-full text-xs p-3 bg-white border border-[#E5E0D8] rounded-xl text-[#1C1B17] focus:outline-none focus:border-[#1C1B17] transition"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ======================================================== */}
            {/* CARD 4: Compradores adicionais                           */}
            {/* ======================================================== */}
            <div className="bg-white rounded-2xl border border-[#E5E0D8] p-6 sm:p-8 space-y-4 shadow-xs">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="font-bold text-sm sm:text-base text-[#1C1B17]">
                  Compradores adicionais
                </h2>
                <button
                  type="button"
                  onClick={handleAddAdditionalBuyer}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-[#E5E0D8] hover:bg-[#FAF7F2] text-[#1C1B17] text-xs font-semibold rounded-xl transition shadow-2xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar</span>
                </button>
              </div>

              <p className="text-xs text-[#736E65]">
                Apenas se houver um 3º comprador em diante. Cônjuge fica na seção acima.
              </p>

              {additionalBuyers.length > 0 && (
                <div className="space-y-4 pt-2">
                  {additionalBuyers.map((b, idx) => (
                    <div key={b.id || idx} className="p-4 bg-[#FAF7F2] rounded-xl border border-[#E5E0D8] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#1C1B17]">
                          Comprador Adicional #{idx + 3}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAdditionalBuyer(idx)}
                          className="text-rose-600 hover:text-rose-800 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remover</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <input
                          type="text"
                          placeholder="Nome completo"
                          value={b.fullName}
                          onChange={e => handleUpdateAdditionalBuyer(idx, 'fullName', e.target.value)}
                          className="text-xs p-2.5 bg-white border border-[#E5E0D8] rounded-xl text-[#1C1B17]"
                        />
                        <input
                          type="text"
                          placeholder="CPF"
                          value={b.cpf}
                          onChange={e => handleUpdateAdditionalBuyer(idx, 'cpf', maskCpf(e.target.value))}
                          className="text-xs p-2.5 bg-white border border-[#E5E0D8] rounded-xl text-[#1C1B17] font-mono"
                        />
                        <input
                          type="text"
                          placeholder="Profissão"
                          value={b.profession}
                          onChange={e => handleUpdateAdditionalBuyer(idx, 'profession', e.target.value)}
                          className="text-xs p-2.5 bg-white border border-[#E5E0D8] rounded-xl text-[#1C1B17]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ======================================================== */}
            {/* AI OCR Sparkle Banner (Screenshot 3 exact gray card)     */}
            {/* ======================================================== */}
            <div className="bg-[#E5E2DA]/90 border border-[#D5D0C6] rounded-xl p-4 flex items-start sm:items-center gap-3 text-xs text-[#4A463F] leading-relaxed">
              <Sparkles className="w-5 h-5 text-[#344E41] shrink-0 mt-0.5 sm:mt-0" />
              <span>
                Ao anexar <strong>RG/CNH</strong>, <strong>comprovante de endereço</strong> ou <strong>certidão de casamento/união estável</strong>, a IA lê o documento e preenche automaticamente seus dados e os do cônjuge. Confira antes de enviar.
              </span>
            </div>

            {/* ======================================================== */}
            {/* CARD 5: Documentos do 1º Comprador (Screenshot 3)        */}
            {/* ======================================================== */}
            <div className="bg-white rounded-2xl border border-[#E5E0D8] p-6 sm:p-8 space-y-4 shadow-xs">
              <h2 className="font-bold text-sm sm:text-base text-[#1C1B17]">
                Documentos do 1º Comprador
              </h2>

              <div className="space-y-3">
                {/* 1. RG ou CNH */}
                <div className="p-3.5 bg-white rounded-xl border border-[#E5E0D8] flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-medium text-[#1C1B17] block">
                      RG ou CNH <span className="text-rose-500 font-bold">*</span>
                    </span>
                    {uploadedDocs['rg_cnh'] ? (
                      <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1 mt-0.5">
                        <Check className="w-3 h-3" /> {uploadedDocs['rg_cnh'].fileName}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">Documento de identificação com foto</span>
                    )}
                  </div>

                  <input
                    type="file"
                    ref={fileInputRefs.rg_cnh}
                    className="hidden"
                    accept="image/*,application/pdf"
                    onChange={e => handleFileChange('rg_cnh', 'RG ou CNH', e)}
                  />

                  <div className="flex items-center gap-2 shrink-0">
                    {uploadedDocs['rg_cnh'] && (
                      <button
                        type="button"
                        onClick={() => handleRemoveDoc('rg_cnh')}
                        className="p-2 text-rose-500 hover:text-rose-700 rounded-lg"
                        title="Remover"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={uploadingDocs['rg_cnh']}
                      onClick={() => fileInputRefs.rg_cnh.current?.click()}
                      className="flex items-center gap-1.5 px-4 py-2 bg-[#1C1B17] hover:bg-[#2C2A24] disabled:opacity-50 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadingDocs['rg_cnh'] ? 'Enviando...' : uploadedDocs['rg_cnh'] ? 'Alterar' : 'Anexar'}</span>
                    </button>
                  </div>
                </div>

                {/* 2. Comprovante de Endereço */}
                <div className="p-3.5 bg-white rounded-xl border border-[#E5E0D8] flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-medium text-[#1C1B17] block">
                      Comprovante de endereço <span className="text-rose-500 font-bold">*</span>
                    </span>
                    {uploadedDocs['comprovante_endereco'] ? (
                      <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1 mt-0.5">
                        <Check className="w-3 h-3" /> {uploadedDocs['comprovante_endereco'].fileName}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">Conta de água, luz ou gás recente</span>
                    )}
                  </div>

                  <input
                    type="file"
                    ref={fileInputRefs.comprovante_endereco}
                    className="hidden"
                    accept="image/*,application/pdf"
                    onChange={e => handleFileChange('comprovante_endereco', 'Comprovante de endereço', e)}
                  />

                  <div className="flex items-center gap-2 shrink-0">
                    {uploadedDocs['comprovante_endereco'] && (
                      <button
                        type="button"
                        onClick={() => handleRemoveDoc('comprovante_endereco')}
                        className="p-2 text-rose-500 hover:text-rose-700 rounded-lg"
                        title="Remover"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={uploadingDocs['comprovante_endereco']}
                      onClick={() => fileInputRefs.comprovante_endereco.current?.click()}
                      className="flex items-center gap-1.5 px-4 py-2 bg-[#1C1B17] hover:bg-[#2C2A24] disabled:opacity-50 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadingDocs['comprovante_endereco'] ? 'Enviando...' : uploadedDocs['comprovante_endereco'] ? 'Alterar' : 'Anexar'}</span>
                    </button>
                  </div>
                </div>

                {/* 3. Certidão de Estado Civil */}
                <div className="p-3.5 bg-white rounded-xl border border-[#E5E0D8] flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-medium text-[#1C1B17] block">
                      Certidão de estado civil <span className="text-rose-500 font-bold">*</span>
                    </span>
                    {uploadedDocs['certidao_civil'] ? (
                      <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1 mt-0.5">
                        <Check className="w-3 h-3" /> {uploadedDocs['certidao_civil'].fileName}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">Casamento, união estável ou nascimento</span>
                    )}
                  </div>

                  <input
                    type="file"
                    ref={fileInputRefs.certidao_civil}
                    className="hidden"
                    accept="image/*,application/pdf"
                    onChange={e => handleFileChange('certidao_civil', 'Certidão de estado civil', e)}
                  />

                  <div className="flex items-center gap-2 shrink-0">
                    {uploadedDocs['certidao_civil'] && (
                      <button
                        type="button"
                        onClick={() => handleRemoveDoc('certidao_civil')}
                        className="p-2 text-rose-500 hover:text-rose-700 rounded-lg"
                        title="Remover"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={uploadingDocs['certidao_civil']}
                      onClick={() => fileInputRefs.certidao_civil.current?.click()}
                      className="flex items-center gap-1.5 px-4 py-2 bg-[#1C1B17] hover:bg-[#2C2A24] disabled:opacity-50 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadingDocs['certidao_civil'] ? 'Enviando...' : uploadedDocs['certidao_civil'] ? 'Alterar' : 'Anexar'}</span>
                    </button>
                  </div>
                </div>

                {/* 4. Comprovante de Renda (opcional) */}
                <div className="p-3.5 bg-white rounded-xl border border-[#E5E0D8] flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-medium text-[#1C1B17] block">
                      Comprovante de renda <span className="text-[#736E65] font-normal">(opcional)</span>
                    </span>
                    {uploadedDocs['comprovante_renda'] ? (
                      <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1 mt-0.5">
                        <Check className="w-3 h-3" /> {uploadedDocs['comprovante_renda'].fileName}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">Holerite, IRPF ou extrato bancário</span>
                    )}
                  </div>

                  <input
                    type="file"
                    ref={fileInputRefs.comprovante_renda}
                    className="hidden"
                    accept="image/*,application/pdf"
                    onChange={e => handleFileChange('comprovante_renda', 'Comprovante de renda', e)}
                  />

                  <div className="flex items-center gap-2 shrink-0">
                    {uploadedDocs['comprovante_renda'] && (
                      <button
                        type="button"
                        onClick={() => handleRemoveDoc('comprovante_renda')}
                        className="p-2 text-rose-500 hover:text-rose-700 rounded-lg"
                        title="Remover"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={uploadingDocs['comprovante_renda']}
                      onClick={() => fileInputRefs.comprovante_renda.current?.click()}
                      className="flex items-center gap-1.5 px-4 py-2 bg-[#1C1B17] hover:bg-[#2C2A24] disabled:opacity-50 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadingDocs['comprovante_renda'] ? 'Enviando...' : uploadedDocs['comprovante_renda'] ? 'Alterar' : 'Anexar'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ======================================================== */}
            {/* SUBMIT ACTION BUTTON (Screenshot 3 bottom button)        */}
            {/* ======================================================== */}
            <div className="pt-2 pb-8">
              <button
                type="submit"
                className="w-full py-4 bg-[#1C1B17] hover:bg-[#2C2A24] text-white text-sm font-bold rounded-xl shadow-lg transition tracking-wide cursor-pointer"
              >
                Enviar cadastro
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Image Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-4 max-w-xl w-full space-y-3 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-[#1C1B17]">{previewDoc.fileName}</span>
              <button onClick={() => setPreviewDoc(null)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            {previewDoc.fileDataUrl && previewDoc.fileType?.includes('pdf') ? (
              <iframe src={previewDoc.fileDataUrl} title={previewDoc.fileName} className="w-full h-[60vh] rounded-lg border border-[#E5E0D8]" />
            ) : previewDoc.fileDataUrl ? (
              <img src={previewDoc.fileDataUrl} alt="Preview" className="max-h-[60vh] mx-auto rounded-lg object-contain" />
            ) : (
              <div className="p-8 text-center text-xs text-slate-500">Documento anexado ({previewDoc.fileSize})</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
