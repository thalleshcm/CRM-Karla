import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Phone,
  MessageSquare,
  Mail,
  DollarSign,
  Cake,
  Flame,
  Zap,
  Snowflake,
  Trash2,
  Edit2,
  CheckCircle2,
  Plus,
  Send,
  User,
  UploadCloud,
  FileCheck,
  FileText,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Download,
  Eye,
  AlertCircle,
  ArrowLeft,
  Calendar,
  Building2,
  Paperclip,
  Receipt,
  FileSpreadsheet,
  Clock,
  Sparkles,
  Trophy,
  XCircle,
  RotateCcw,
  Info
} from 'lucide-react';
import { useCrm } from '../context/CrmContext';
import {
  LeadTemperature,
  StageId,
  ActivityType,
  LeadOrigin,
  AdditionalBuyer,
  LeadAttachedDocument,
  CommissionSplitPercents,
  CommissionSplitBonus,
  LOST_REASON_OPTIONS
} from '../types';
import { STAGES } from '../data/initialData';
import {
  formatCurrency,
  formatPhone,
  getWhatsAppLink,
  formatDatePtBR,
  formatDateTimePtBR
} from '../utils/formatters';
import { ProposalPdfModal } from './ProposalPdfModal';
import { ContractDossierModal } from './ContractDossierModal';
import { InvoiceModal } from './InvoiceModal';

export const LeadDetailModal: React.FC = () => {
  const {
    selectedLead,
    setSelectedLead,
    updateLead,
    deleteLead,
    moveLeadStage,
    markLeadWon,
    markLeadLost,
    reactivateLead,
    addActivity,
    toggleActivityComplete,
    deleteActivity,
    activities,
    contracts,
    settings,
    users,
    currentUser,
    hasPermission,
    openWhatsAppForLead,
    openClientPortalModal,
    generateClientPortalLink,
    triggerConfetti
  } = useCrm();

  // Active Main Tab
  const [activeTab, setActiveTab] = useState<'dados' | 'documentos' | 'atividades' | 'negocio'>('dados');
  const [isEditing, setIsEditing] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sub-modals
  const [showAutoRegisterModal, setShowAutoRegisterModal] = useState(false);
  const [showLostModal, setShowLostModal] = useState(false);
  const [lostReasonSelected, setLostReasonSelected] = useState<string>(LOST_REASON_OPTIONS[0]);
  const [lostNotesInput, setLostNotesInput] = useState('');
  const [showWonConfirmModal, setShowWonConfirmModal] = useState(false);
  const [showProposalPdf, setShowProposalPdf] = useState(false);
  const [showDossier, setShowDossier] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [selectedDocPreview, setSelectedDocPreview] = useState<{ title: string; url: string } | null>(null);

  // Documents sub-tab
  const [docBuyerTab, setDocBuyerTab] = useState<'principal' | 'conjuge' | string>('principal');

  // --- EDIT FORM STATE ---
  // Section 1: Dados Básicos
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [birthday, setBirthday] = useState('');
  const [region, setRegion] = useState('');
  const [estimatedValue, setEstimatedValue] = useState<number>(0);
  const [downPayment, setDownPayment] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [origin, setOrigin] = useState<LeadOrigin>('Indicação');
  const [notes, setNotes] = useState('');
  const [temperature, setTemperature] = useState<LeadTemperature>('quente');
  const [tag, setTag] = useState('Investidores');
  const [contactStatus, setContactStatus] = useState('Contatado');
  const [lastContactDate, setLastContactDate] = useState('');
  const [lastContactAttempts, setLastContactAttempts] = useState(2);

  // Section 2: Proposta em Negociação
  const [propEnterprise, setPropEnterprise] = useState('');
  const [propDeveloper, setPropDeveloper] = useState('');
  const [propUnit, setPropUnit] = useState('');
  const [propTowerBlock, setPropTowerBlock] = useState('');
  const [propFloor, setPropFloor] = useState('');
  const [propAreaM2, setPropAreaM2] = useState<string | number>('');
  const [propBedrooms, setPropBedrooms] = useState<string | number>('');
  const [propSuites, setPropSuites] = useState<string | number>('');
  const [propParkingSpaces, setPropParkingSpaces] = useState<string | number>('');
  const [propValue, setPropValue] = useState<number>(0);
  const [propStatus, setPropStatus] = useState('Em negociação');
  const [propDetails, setPropDetails] = useState('');

  // Section 3: Detalhamento Financeiro da Proposta
  const [finDownPayment, setFinDownPayment] = useState<number>(0);
  const [finBalancePayoff, setFinBalancePayoff] = useState<number>(0);
  const [finPayoffDate, setFinPayoffDate] = useState('');
  const [finMonthlyCount, setFinMonthlyCount] = useState<number>(0);
  const [finMonthlyValue, setFinMonthlyValue] = useState<number>(0);
  const [finFirstMonthlyDueDate, setFinFirstMonthlyDueDate] = useState('');
  const [finAnnualCount, setFinAnnualCount] = useState<number>(0);
  const [finAnnualValue, setFinAnnualValue] = useState<number>(0);
  const [finFirstAnnualDueDate, setFinFirstAnnualDueDate] = useState('');

  // Section 4: Visita / Apresentação
  const [visitDateTime, setVisitDateTime] = useState('');
  const [visitLocation, setVisitLocation] = useState('');

  // Section 5: Comprador Principal — Documentação
  const [mainCpf, setMainCpf] = useState('');
  const [mainRg, setMainRg] = useState('');
  const [mainMaritalStatus, setMainMaritalStatus] = useState('');
  const [mainProfession, setMainProfession] = useState('');
  const [mainBirthPlace, setMainBirthPlace] = useState('');

  // Section 6: Cônjuge / 2º Comprador
  const [spouseFullName, setSpouseFullName] = useState('');
  const [spouseCpf, setSpouseCpf] = useState('');
  const [spouseRg, setSpouseRg] = useState('');
  const [spouseBirthDate, setSpouseBirthDate] = useState('');
  const [spouseProfession, setSpouseProfession] = useState('');
  const [spousePhone, setSpousePhone] = useState('');
  const [spouseEmail, setSpouseEmail] = useState('');
  const [spouseMaritalRegime, setSpouseMaritalRegime] = useState('Comunhão Parcial de Bens');
  const [spouseMarriageDate, setSpouseMarriageDate] = useState('');

  // Section 7: Compradores Adicionais
  const [additionalBuyers, setAdditionalBuyers] = useState<AdditionalBuyer[]>([]);

  // --- NEW ACTIVITY FORM STATE ---
  const [actType, setActType] = useState<ActivityType>('ligacao');
  const [actDateTime, setActDateTime] = useState('');
  const [actReminderTime, setActReminderTime] = useState('30 minutos antes');
  const [actNotes, setActNotes] = useState('');

  // --- TAB NEGÓCIO STATE ---
  const [contractStatus, setContractStatus] = useState<'em_andamento' | 'concluido' | 'cancelado'>('em_andamento');
  const [commPercentOnSale, setCommPercentOnSale] = useState<number>(0);
  const [commTotalValue, setCommTotalValue] = useState<number>(0);
  const [commInstallments, setCommInstallments] = useState<number>(1);
  const [splitPercents, setSplitPercents] = useState<CommissionSplitPercents>({
    agency: 0,
    manager: 0,
    administrative: 0,
    broker: 0,
    affiliate: 0,
    referrer: 0
  });
  const [splitBonus, setSplitBonus] = useState<CommissionSplitBonus>({
    agency: 0,
    manager: 0,
    administrative: 0,
    broker: 0,
    affiliate: 0,
    referrer: 0
  });
  const [assignedManagerId, setAssignedManagerId] = useState('');
  const [assignedAffiliateId, setAssignedAffiliateId] = useState('');
  const [referrerFreeName, setReferrerFreeName] = useState('');
  const [commFirstDueDate, setCommFirstDueDate] = useState('2026-08-21');
  const [isCommissionCompleted, setIsCommissionCompleted] = useState(false);

  // File upload input refs
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadCategory, setUploadCategory] = useState<string>('outro');

  // Load Lead Data into Form States when lead is opened
  useEffect(() => {
    if (!selectedLead) return;

    setName(selectedLead.name || '');
    setPhone(selectedLead.phone || '');
    setEmail(selectedLead.email || '');
    setBirthday(selectedLead.birthday || '');
    setRegion(selectedLead.region || '');
    setEstimatedValue(selectedLead.estimatedValue || 0);
    setDownPayment(selectedLead.downPayment || 0);
    setPaymentMethod(selectedLead.paymentMethod || '');
    setOrigin(selectedLead.origin || 'Indicação');
    setNotes(selectedLead.notes || '');
    setTemperature(selectedLead.temperature || 'quente');
    setTag(selectedLead.tag || (selectedLead.funnelId === 'investidores' ? 'Investidores' : 'Moradia'));
    setContactStatus(selectedLead.contactStatus || 'Contatado');
    setLastContactDate(selectedLead.lastContactDate || '21/08/2026, 16:00');
    setLastContactAttempts(selectedLead.lastContactAttempts || 2);

    // Proposal
    const prop = selectedLead.proposal || {};
    setPropEnterprise(prop.enterprise || selectedLead.propertyInterest || '');
    setPropDeveloper(prop.developer || '');
    setPropUnit(prop.unit || '');
    setPropTowerBlock(prop.towerBlock || '');
    setPropFloor(prop.floor || '');
    setPropAreaM2(prop.areaM2 || '');
    setPropBedrooms(prop.bedrooms || '');
    setPropSuites(prop.suites || '');
    setPropParkingSpaces(prop.parkingSpaces || '');
    setPropValue(prop.proposalValue || selectedLead.estimatedValue || 0);
    setPropStatus(prop.status || 'Em negociação');
    setPropDetails(prop.details || '');

    // Financials
    const fin = prop.financials || {};
    setFinDownPayment(fin.downPayment || selectedLead.downPayment || 0);
    setFinBalancePayoff(fin.balancePayoff || 0);
    setFinPayoffDate(fin.payoffDate || '');
    setFinMonthlyCount(fin.monthlyInstallmentsCount || 0);
    setFinMonthlyValue(fin.monthlyInstallmentValue || 0);
    setFinFirstMonthlyDueDate(fin.firstMonthlyDueDate || '');
    setFinAnnualCount(fin.annualInstallmentsCount || 0);
    setFinAnnualValue(fin.annualInstallmentValue || 0);
    setFinFirstAnnualDueDate(fin.firstAnnualDueDate || '');

    // Visit
    const vis = selectedLead.visit || {};
    setVisitDateTime(vis.dateTime || '');
    setVisitLocation(vis.location || '');

    // Main Buyer
    const mb = selectedLead.mainBuyer || {};
    const cd = selectedLead.clientData || {};
    setMainCpf(mb.cpf || cd.cpf || '');
    setMainRg(mb.rg || cd.rg || '');
    setMainMaritalStatus(mb.maritalStatus || cd.maritalStatus || '');
    setMainProfession(mb.profession || cd.profession || '');
    setMainBirthPlace(mb.birthPlace || '');

    // Spouse
    const sp = selectedLead.spouseBuyer || cd.spouse || {};
    setSpouseFullName(sp.fullName || '');
    setSpouseCpf(sp.cpf || '');
    setSpouseRg(sp.rg || '');
    setSpouseBirthDate(sp.birthDate || '');
    setSpouseProfession(sp.profession || '');
    setSpousePhone(selectedLead.spouseBuyer?.phone || '');
    setSpouseEmail(selectedLead.spouseBuyer?.email || '');
    setSpouseMaritalRegime(selectedLead.spouseBuyer?.maritalRegime || 'Comunhão Parcial de Bens');
    setSpouseMarriageDate(selectedLead.spouseBuyer?.marriageDate || '');

    // Additional Buyers
    setAdditionalBuyers(selectedLead.additionalBuyers || []);

    // Contract / Negócio Tab
    const cDet = selectedLead.contractDetails || {};
    setContractStatus(cDet.status || 'em_andamento');
    setCommPercentOnSale(cDet.commissionPercent || 0);
    setCommTotalValue(cDet.totalCommissionValue || 0);
    setCommInstallments(cDet.installmentsCount || 1);
    setSplitPercents(cDet.splitPercents || {
      agency: 0,
      manager: 0,
      administrative: 0,
      broker: 0,
      affiliate: 0,
      referrer: 0
    });
    setSplitBonus(cDet.splitBonus || {
      agency: 0,
      manager: 0,
      administrative: 0,
      broker: 0,
      affiliate: 0,
      referrer: 0
    });
    setAssignedManagerId(cDet.managerId || '');
    setAssignedAffiliateId(cDet.affiliateId || '');
    setReferrerFreeName(cDet.referrerName || '');
    setCommFirstDueDate(cDet.firstDueDate || '2026-08-21');
    setIsCommissionCompleted(cDet.isCompletedDirectly || false);
  }, [selectedLead]);

  if (!selectedLead) return null;

  const portalLink = generateClientPortalLink(selectedLead);
  const leadActivities = activities.filter(a => a.leadId === selectedLead.id);

  // Financial calculations
  const totalMonthlyFin = finMonthlyCount * finMonthlyValue;
  const totalAnnualFin = finAnnualCount * finAnnualValue;
  const totalGeneralFin = (finDownPayment || 0) + totalMonthlyFin + totalAnnualFin + (finBalancePayoff || 0);

  // Commission % split sum calculation
  const totalSplitPercent = (
    (Number(splitPercents.agency) || 0) +
    (Number(splitPercents.manager) || 0) +
    (Number(splitPercents.administrative) || 0) +
    (Number(splitPercents.broker) || 0) +
    (Number(splitPercents.affiliate) || 0) +
    (Number(splitPercents.referrer) || 0)
  );

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const copyPortalLink = () => {
    navigator.clipboard.writeText(portalLink);
    setLinkCopied(true);
    showToast('Link do portal copiado com sucesso!');
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleSaveFullEdit = (e: React.FormEvent) => {
    e.preventDefault();

    const updatedProposal = {
      enterprise: propEnterprise,
      developer: propDeveloper,
      unit: propUnit,
      towerBlock: propTowerBlock,
      floor: propFloor,
      areaM2: propAreaM2,
      bedrooms: propBedrooms,
      suites: propSuites,
      parkingSpaces: propParkingSpaces,
      proposalValue: Number(propValue) || Number(estimatedValue) || 0,
      status: propStatus,
      details: propDetails,
      financials: {
        downPayment: Number(finDownPayment) || 0,
        balancePayoff: Number(finBalancePayoff) || 0,
        payoffDate: finPayoffDate,
        monthlyInstallmentsCount: Number(finMonthlyCount) || 0,
        monthlyInstallmentValue: Number(finMonthlyValue) || 0,
        firstMonthlyDueDate: finFirstMonthlyDueDate,
        annualInstallmentsCount: Number(finAnnualCount) || 0,
        annualInstallmentValue: Number(finAnnualValue) || 0,
        firstAnnualDueDate: finFirstAnnualDueDate
      }
    };

    const updatedMainBuyer = {
      cpf: mainCpf,
      rg: mainRg,
      maritalStatus: mainMaritalStatus,
      profession: mainProfession,
      birthPlace: mainBirthPlace
    };

    const updatedSpouse = {
      fullName: spouseFullName,
      cpf: spouseCpf,
      rg: spouseRg,
      birthDate: spouseBirthDate,
      profession: spouseProfession,
      phone: spousePhone,
      email: spouseEmail,
      maritalRegime: spouseMaritalRegime,
      marriageDate: spouseMarriageDate
    };

    updateLead(selectedLead.id, {
      name,
      phone,
      email: email || undefined,
      birthday: birthday || undefined,
      region,
      propertyInterest: propEnterprise || selectedLead.propertyInterest,
      estimatedValue: Number(propValue) || Number(estimatedValue) || 0,
      downPayment: Number(finDownPayment) || Number(downPayment) || 0,
      paymentMethod,
      origin,
      notes,
      temperature,
      tag,
      contactStatus,
      proposal: updatedProposal,
      visit: {
        dateTime: visitDateTime,
        location: visitLocation
      },
      mainBuyer: updatedMainBuyer,
      spouseBuyer: updatedSpouse,
      additionalBuyers
    });

    setIsEditing(false);
    showToast('Alterações salvas com sucesso!');
  };

  const handleSaveCommission = () => {
    const saleVal = Number(propValue) || Number(estimatedValue) || 0;
    const computedCommTotal = commTotalValue || (saleVal * (Number(commPercentOnSale) || 0)) / 100;

    const updatedContractDetails = {
      enterpriseName: propEnterprise || selectedLead.propertyInterest || 'Empreendimento',
      unit: propUnit || '—',
      saleValue: saleVal,
      closedAt: new Date().toISOString().split('T')[0],
      status: contractStatus,
      commissionPercent: Number(commPercentOnSale) || 0,
      totalCommissionValue: computedCommTotal,
      installmentsCount: Number(commInstallments) || 1,
      splitPercents,
      splitBonus,
      managerId: assignedManagerId,
      managerName: users.find(u => u.id === assignedManagerId)?.name,
      affiliateId: assignedAffiliateId,
      affiliateName: users.find(u => u.id === assignedAffiliateId)?.name,
      referrerName: referrerFreeName,
      firstDueDate: commFirstDueDate,
      isCompletedDirectly: isCommissionCompleted
    };

    updateLead(selectedLead.id, {
      contractDetails: updatedContractDetails
    });

    if (isCommissionCompleted) {
      triggerConfetti();
    }

    showToast('Comissão salva com sucesso!');
  };

  const handleAddAdditionalBuyer = () => {
    const newBuyer: AdditionalBuyer = {
      id: `buyer_${Date.now()}`,
      fullName: '',
      cpf: '',
      rg: '',
      profession: '',
      phone: '',
      email: '',
      relationship: 'Co-comprador'
    };
    setAdditionalBuyers([...additionalBuyers, newBuyer]);
  };

  const handleUpdateAdditionalBuyer = (index: number, field: keyof AdditionalBuyer, val: string) => {
    const updated = [...additionalBuyers];
    updated[index] = { ...updated[index], [field]: val };
    setAdditionalBuyers(updated);
  };

  const handleRemoveAdditionalBuyer = (index: number) => {
    setAdditionalBuyers(additionalBuyers.filter((_, i) => i !== index));
  };

  const handleAddActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!actDateTime) return;

    addActivity({
      leadId: selectedLead.id,
      leadName: selectedLead.name,
      brokerId: selectedLead.brokerId || currentUser.id,
      brokerName: selectedLead.brokerName || currentUser.name,
      type: actType,
      dateTime: actDateTime,
      reminderTime: actReminderTime,
      notes: actNotes || undefined
    });

    // Also add to timeline history
    const timelineEntry = {
      id: `h_${Date.now()}`,
      leadId: selectedLead.id,
      type: actType === 'whatsapp' ? ('whatsapp' as const) : ('call' as const),
      description: `Atividade agendada (${actType}): ${actNotes || 'Sem observações'}`,
      date: new Date().toISOString(),
      author: currentUser.name || settings.brokerName
    };

    updateLead(selectedLead.id, {
      nextFollowUpDate: actDateTime,
      history: [timelineEntry, ...(selectedLead.history || [])]
    });

    setActDateTime('');
    setActNotes('');
    showToast('Nova atividade agendada!');
  };

  const handleDeleteLead = () => {
    if (confirm(`Deseja realmente excluir o lead "${selectedLead.name}"?`)) {
      deleteLead(selectedLead.id);
      setSelectedLead(null);
    }
  };

  const handleWhatsAppChargePendingDocs = () => {
    const text = `Olá ${selectedLead.name.split(' ')[0]}! Para darmos sequência e garantirmos a aprovação da sua proposta no *${propEnterprise || selectedLead.propertyInterest}*, precisamos apenas dos documentos obrigatórios (RG/CNH, Comprovante de Residência e Certidão Civil).\n\nVocê pode enviar fotos com total segurança pelo link exclusivo:\n🔗 ${portalLink}\n\nQualquer dúvida estou à disposição!`;
    window.open(getWhatsAppLink(selectedLead.phone, text), '_blank', 'noopener,noreferrer');
  };

  // Mock upload document handler for local interactive preview
  const handleUploadDocument = (category: 'rg_cnh' | 'comprovante_endereco' | 'certidao_estado_civil' | 'declaracao_renda' | 'outro') => {
    const dummyFileUrl = 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=800&auto=format&fit=crop&q=80';
    const newDoc: LeadAttachedDocument = {
      id: `doc_${Date.now()}`,
      buyerType: docBuyerTab === 'conjuge' ? 'conjuge' : 'principal',
      category,
      label: category === 'rg_cnh' ? 'RG ou CNH' : category === 'comprovante_endereco' ? 'Comprovante de Endereço' : category === 'certidao_estado_civil' ? 'Certidão de Estado Civil' : category === 'declaracao_renda' ? 'Declaração de Renda' : 'Documento Adicional',
      fileName: `${category}_${selectedLead.name.replace(/\s+/g, '_')}.pdf`,
      fileSize: '1.4 MB',
      fileDataUrl: dummyFileUrl,
      uploadedAt: new Date().toISOString(),
      status: 'aprovado',
      required: true
    };

    const currentDocs = selectedLead.documentsList || [];
    const filtered = currentDocs.filter(d => !(d.category === category && d.buyerType === newDoc.buyerType));
    updateLead(selectedLead.id, {
      documentsList: [...filtered, newDoc]
    });
    showToast(`Documento (${newDoc.label}) anexado com sucesso!`);
  };

  // Checklist counts
  const currentLeadDocs = selectedLead.documentsList || [];
  const requiredCategories = ['rg_cnh', 'comprovante_endereco', 'certidao_estado_civil'];
  const uploadedRequired = currentLeadDocs.filter(d => requiredCategories.includes(d.category) && d.buyerType === 'principal');
  const pendingCount = Math.max(0, 3 - uploadedRequired.length);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl w-full max-w-7xl max-h-[96vh] shadow-2xl border border-[#EAE7E2] flex flex-col overflow-hidden text-[#3A403A]"
        onClick={e => e.stopPropagation()}
      >
        {/* Toast alert */}
        {toastMessage && (
          <div className="absolute top-4 right-4 z-80 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs shadow-lg flex items-center gap-2 animate-in slide-in-from-top duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* --- MAIN HEADER (Screenshots 4, 5, 6) --- */}
        <div className="p-6 border-b border-[#EAE7E2] bg-[#FDFCFB] flex flex-col gap-4">
          <div className="flex items-start justify-between flex-wrap gap-4">
            {/* Left title info */}
            <div>
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <button
                  onClick={() => setSelectedLead(null)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#EAE7E2] hover:bg-[#F4F1EA] text-[#344E41] text-xs font-semibold rounded-xl shadow-2xs transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Voltar</span>
                </button>

                <span className="px-3 py-1 bg-amber-50 text-amber-900 border border-amber-200/80 rounded-full text-xs font-bold">
                  {tag}
                </span>

                {/* Status Badge */}
                {selectedLead.status === 'ganho' && (
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-full text-xs font-black animate-in fade-in">
                    <Trophy className="w-3.5 h-3.5 text-emerald-600" />
                    <span>GANHO (Venda Concluída)</span>
                  </span>
                )}

                {selectedLead.status === 'perdido' && (
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-rose-100 text-rose-900 border border-rose-300 rounded-full text-xs font-black animate-in fade-in">
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                    <span>PERDIDO: {selectedLead.lostReason || 'Desistência'}</span>
                  </span>
                )}
              </div>

              <h2 className="font-serif text-3xl font-bold text-[#1F2937] tracking-tight">
                {name || selectedLead.name}
              </h2>

              <div className="flex items-center gap-3 text-xs text-slate-500 mt-1.5 flex-wrap">
                <span className="flex items-center gap-1 text-slate-700 font-medium">
                  <Phone className="w-3.5 h-3.5 text-[#588157]" /> {formatPhone(phone || selectedLead.phone)}
                </span>
                <span className="text-slate-300">•</span>
                <span className="flex items-center gap-1 text-slate-700">
                  <Mail className="w-3.5 h-3.5 text-slate-400" /> {email || selectedLead.email || 'thalleshcmartins@gmail.com'}
                </span>
                <span className="text-slate-300">•</span>
                <span>Origem: <strong className="text-slate-700">{origin}</strong></span>
                <span className="text-slate-300">•</span>
                <span>Último contato: <strong className="text-slate-700">{lastContactDate} · {lastContactAttempts} tentativa(s)</strong></span>
              </div>
            </div>

            {/* Right Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* STATUS ACTION BUTTONS: GANHO / PERDIDO / REATIVAR */}
              {selectedLead.status === 'perdido' ? (
                <button
                  onClick={() => {
                    reactivateLead(selectedLead.id);
                    setToastMessage('Lead reativado com sucesso e retornado ao funil ativo!');
                    setTimeout(() => setToastMessage(null), 3500);
                  }}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reativar Lead</span>
                </button>
              ) : selectedLead.status === 'ganho' ? (
                <button
                  onClick={() => {
                    reactivateLead(selectedLead.id);
                    setToastMessage('Negociação reaberta no funil.');
                    setTimeout(() => setToastMessage(null), 3500);
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reabrir Negociação</span>
                </button>
              ) : (
                <>
                  {/* DAR GANHO: Only allowed in the last stage */}
                  {(selectedLead.stageId === STAGES[STAGES.length - 1].id || selectedLead.stageId === 'pos_venda' || selectedLead.stageId === 'venda_concluida') ? (
                    <button
                      onClick={() => {
                        markLeadWon(selectedLead.id);
                        setToastMessage('🏆 Parabéns! Lead marcado como GANHO com sucesso!');
                        setTimeout(() => setToastMessage(null), 4000);
                      }}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                      title="Marcar como Ganho (Venda Concluída)"
                    >
                      <Trophy className="w-3.5 h-3.5" />
                      <span>Dar Ganho</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setToastMessage('ℹ️ Dar Ganho só é permitido na última etapa do funil (Venda Concluída / Pós-venda). Avance o lead até a última etapa primeiro.');
                        setTimeout(() => setToastMessage(null), 4500);
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 text-xs font-medium rounded-xl border border-dashed border-slate-300 transition flex items-center gap-1.5 cursor-pointer"
                      title="Dar Ganho só é permitido na última etapa"
                    >
                      <Trophy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Dar Ganho (Última Etapa)</span>
                    </button>
                  )}

                  {/* DAR PERDIDO: Allowed in any stage */}
                  <button
                    onClick={() => {
                      setLostReasonSelected(LOST_REASON_OPTIONS[0]);
                      setLostNotesInput('');
                      setShowLostModal(true);
                    }}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    title="Marcar como Perdido em qualquer etapa"
                  >
                    <XCircle className="w-3.5 h-3.5 text-rose-500" />
                    <span>Dar Perdido</span>
                  </button>
                </>
              )}

              {/* Temperature Badge / Selector */}
              <div className="relative">
                <select
                  value={temperature}
                  onChange={e => {
                    setTemperature(e.target.value as LeadTemperature);
                    updateLead(selectedLead.id, { temperature: e.target.value as LeadTemperature });
                  }}
                  className="appearance-none text-xs font-bold px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 cursor-pointer shadow-2xs pr-7 focus:outline-none"
                >
                  <option value="quente">🔥 Quente · fixa</option>
                  <option value="morno">⚡ Morno</option>
                  <option value="frio">❄️ Frio</option>
                </select>
                <Flame className="w-3.5 h-3.5 text-rose-500 absolute right-2 top-2 pointer-events-none" />
              </div>

              {/* Status dropdown */}
              <select
                value={contactStatus}
                onChange={e => {
                  setContactStatus(e.target.value);
                  updateLead(selectedLead.id, { contactStatus: e.target.value });
                }}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-[#EAE7E2] bg-white text-slate-700 shadow-2xs focus:outline-none"
              >
                <option value="Contatado">Contatado</option>
                <option value="Sem contato">Sem contato</option>
                <option value="Em qualificação">Em qualificação</option>
                <option value="Proposta enviada">Proposta enviada</option>
              </select>

              {/* WhatsApp Button */}
              <button
                onClick={() => openWhatsAppForLead(selectedLead, 'scripts')}
                className="px-3 py-1.5 bg-[#F4F1EA] hover:bg-[#EAE7E2] text-[#344E41] text-xs font-semibold rounded-xl border border-[#EAE7E2] transition flex items-center gap-1.5 shadow-2xs"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                <span>WhatsApp</span>
              </button>

              {/* Modelos Button */}
              <button
                onClick={() => openWhatsAppForLead(selectedLead, 'scripts')}
                className="px-3 py-1.5 bg-[#F4F1EA] hover:bg-[#EAE7E2] text-[#344E41] text-xs font-semibold rounded-xl border border-[#EAE7E2] transition shadow-2xs"
              >
                Modelos
              </button>

              {/* PDF Proposta Button */}
              <button
                onClick={() => setShowProposalPdf(true)}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-xl border border-slate-300 transition flex items-center gap-1.5 shadow-2xs"
              >
                <FileText className="w-3.5 h-3.5 text-slate-600" />
                <span>PDF Proposta</span>
              </button>

              {/* Dossiê do contrato Button */}
              <button
                onClick={() => setShowDossier(true)}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-xl border border-slate-300 transition flex items-center gap-1.5 shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>Dossiê do contrato</span>
              </button>

              {/* Emitir Nota Fiscal Button */}
              <button
                onClick={() => setShowInvoice(true)}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-xl border border-slate-300 transition flex items-center gap-1.5 shadow-2xs"
              >
                <Receipt className="w-3.5 h-3.5 text-slate-600" />
                <span>Emitir Nota Fiscal</span>
              </button>

              {/* Excluir Button */}
              <button
                onClick={handleDeleteLead}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xl border border-rose-200 transition flex items-center gap-1 shadow-2xs"
                title="Excluir Lead"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir</span>
              </button>
            </div>
          </div>

          {/* --- PIPELINE STAGE STEP BAR (Horizontal Progression) --- */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-2 no-scrollbar">
            {STAGES.map((s, idx) => {
              const isCurrent = selectedLead.stageId === s.id;
              const isPassed = STAGES.findIndex(st => st.id === selectedLead.stageId) > idx;

              return (
                <button
                  key={s.id}
                  onClick={() => moveLeadStage(selectedLead.id, s.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 ${
                    isCurrent
                      ? 'bg-slate-900 text-white shadow-md'
                      : isPassed
                      ? 'bg-slate-200/80 text-slate-700 hover:bg-slate-300'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {isPassed && <Check className="w-3 h-3 text-emerald-700" />}
                  <span>{s.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* --- MAIN TABS BAR --- */}
        <div className="px-6 border-b border-[#EAE7E2] bg-white flex items-center gap-2 text-xs font-bold text-slate-600">
          <button
            onClick={() => setActiveTab('dados')}
            className={`px-4 py-3.5 border-b-2 transition-all ${
              activeTab === 'dados'
                ? 'border-slate-900 text-slate-900 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Dados
          </button>
          <button
            onClick={() => setActiveTab('documentos')}
            className={`px-4 py-3.5 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'documentos'
                ? 'border-slate-900 text-slate-900 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <span>Documentos</span>
            {pendingCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('atividades')}
            className={`px-4 py-3.5 border-b-2 transition-all ${
              activeTab === 'atividades'
                ? 'border-slate-900 text-slate-900 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Atividades
          </button>
          <button
            onClick={() => setActiveTab('negocio')}
            className={`px-4 py-3.5 border-b-2 transition-all ${
              activeTab === 'negocio'
                ? 'border-slate-900 text-slate-900 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Negócio
          </button>
        </div>

        {/* --- TAB CONTENTS CONTAINER --- */}
        <div className="p-6 overflow-y-auto flex-1 bg-[#FDFCFB]">
          {/* ========================================================== */}
          {/* TAB 1: DADOS (SCREENSHOTS 1, 2, 3)                         */}
          {/* ========================================================== */}
          {activeTab === 'dados' && (
            <div className="max-w-6xl mx-auto space-y-8">
              {/* Header inside Edit View */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <h3 className="font-bold text-xs uppercase tracking-widest text-slate-800">
                  EDITAR LEAD
                </h3>
                <button
                  type="button"
                  onClick={handleDeleteLead}
                  className="flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir Lead</span>
                </button>
              </div>

              <form onSubmit={handleSaveFullEdit} className="space-y-8">
                {/* SECTION 1: DADOS BÁSICOS */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                        NOME
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Thalles"
                        className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 focus:outline-none focus:border-slate-900 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                        TELEFONE
                      </label>
                      <input
                        type="text"
                        required
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="31998395194"
                        className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 focus:outline-none focus:border-slate-900 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                        E-MAIL
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="thalleshcmartins@gmail.com"
                        className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 focus:outline-none focus:border-slate-900 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                        DATA DE ANIVERSÁRIO
                      </label>
                      <input
                        type="date"
                        value={birthday}
                        onChange={e => setBirthday(e.target.value)}
                        className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 focus:outline-none focus:border-slate-900 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                        REGIÃO
                      </label>
                      <input
                        type="text"
                        value={region}
                        onChange={e => setRegion(e.target.value)}
                        placeholder="Jardins, Pinheiros..."
                        className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 focus:outline-none focus:border-slate-900 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                        VALOR ESTIMADO (R$)
                      </label>
                      <input
                        type="number"
                        value={estimatedValue || ''}
                        onChange={e => setEstimatedValue(parseFloat(e.target.value) || 0)}
                        placeholder="Ex.: 850000"
                        className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 focus:outline-none focus:border-slate-900 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                        ENTRADA (R$)
                      </label>
                      <input
                        type="number"
                        value={downPayment || ''}
                        onChange={e => setDownPayment(parseFloat(e.target.value) || 0)}
                        placeholder="Ex.: 170000"
                        className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 focus:outline-none focus:border-slate-900 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                        FORMA DE PAGAMENTO
                      </label>
                      <input
                        type="text"
                        value={paymentMethod}
                        onChange={e => setPaymentMethod(e.target.value)}
                        placeholder="Financiamento, à vista..."
                        className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 focus:outline-none focus:border-slate-900 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                        ORIGEM
                      </label>
                      <select
                        value={origin}
                        onChange={e => setOrigin(e.target.value as LeadOrigin)}
                        className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 focus:outline-none focus:border-slate-900 shadow-2xs"
                      >
                        <option value="Indicação">Indicação</option>
                        <option value="Instagram">Instagram</option>
                        <option value="Google Ads">Google Ads</option>
                        <option value="WhatsApp">WhatsApp</option>
                        <option value="Portal Imobiliário">Portal Imobiliário</option>
                        <option value="Plantão de Vendas">Plantão de Vendas</option>
                        <option value="Facebook">Facebook</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                      ANOTAÇÕES
                    </label>
                    <textarea
                      rows={3}
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 focus:outline-none focus:border-slate-900 shadow-2xs"
                    />
                  </div>
                </div>

                {/* SECTION 2: PROPOSTA EM NEGOCIAÇÃO */}
                <div className="space-y-4 pt-6 border-t border-slate-200">
                  <h4 className="font-bold text-xs uppercase tracking-widest text-slate-800">
                    PROPOSTA EM NEGOCIAÇÃO
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                        EMPREENDIMENTO
                      </label>
                      <input
                        type="text"
                        value={propEnterprise}
                        onChange={e => setPropEnterprise(e.target.value)}
                        placeholder="Ex.: Residencial Aurora"
                        className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 focus:outline-none focus:border-slate-900 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                        CONSTRUTORA
                      </label>
                      <input
                        type="text"
                        value={propDeveloper}
                        onChange={e => setPropDeveloper(e.target.value)}
                        placeholder="Ex.: MRV, Cyrela..."
                        className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 focus:outline-none focus:border-slate-900 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                        UNIDADE
                      </label>
                      <input
                        type="text"
                        value={propUnit}
                        onChange={e => setPropUnit(e.target.value)}
                        placeholder="Ex.: Apto 1204"
                        className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 focus:outline-none focus:border-slate-900 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                        TORRE / BLOCO
                      </label>
                      <input
                        type="text"
                        value={propTowerBlock}
                        onChange={e => setPropTowerBlock(e.target.value)}
                        placeholder="Ex.: Torre B"
                        className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 focus:outline-none focus:border-slate-900 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                        ANDAR
                      </label>
                      <input
                        type="text"
                        value={propFloor}
                        onChange={e => setPropFloor(e.target.value)}
                        placeholder="Ex.: 12º"
                        className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 focus:outline-none focus:border-slate-900 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                        METRAGEM (M²)
                      </label>
                      <input
                        type="text"
                        value={propAreaM2}
                        onChange={e => setPropAreaM2(e.target.value)}
                        placeholder="Ex.: 72.5"
                        className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 focus:outline-none focus:border-slate-900 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                        QUARTOS
                      </label>
                      <input
                        type="text"
                        value={propBedrooms}
                        onChange={e => setPropBedrooms(e.target.value)}
                        placeholder="Ex.: 3"
                        className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 focus:outline-none focus:border-slate-900 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                        SUÍTES
                      </label>
                      <input
                        type="text"
                        value={propSuites}
                        onChange={e => setPropSuites(e.target.value)}
                        placeholder="Ex.: 1"
                        className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 focus:outline-none focus:border-slate-900 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                        VAGAS DE GARAGEM
                      </label>
                      <input
                        type="text"
                        value={propParkingSpaces}
                        onChange={e => setPropParkingSpaces(e.target.value)}
                        placeholder="Ex.: 2"
                        className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 focus:outline-none focus:border-slate-900 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                        VALOR DA PROPOSTA
                      </label>
                      <input
                        type="number"
                        value={propValue || ''}
                        onChange={e => setPropValue(parseFloat(e.target.value) || 0)}
                        placeholder="R$ 720.000,00"
                        className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 font-bold focus:outline-none focus:border-slate-900 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                        STATUS DA PROPOSTA
                      </label>
                      <select
                        value={propStatus}
                        onChange={e => setPropStatus(e.target.value)}
                        className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 focus:outline-none focus:border-slate-900 shadow-2xs"
                      >
                        <option value="Em negociação">Em negociação</option>
                        <option value="Aprovada">Aprovada</option>
                        <option value="Em análise">Em análise</option>
                        <option value="Recusada">Recusada</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                      DETALHES DA PROPOSTA
                    </label>
                    <textarea
                      rows={2}
                      value={propDetails}
                      onChange={e => setPropDetails(e.target.value)}
                      placeholder="Condições, contrapropostas, decisões..."
                      className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 focus:outline-none focus:border-slate-900 shadow-2xs"
                    />
                  </div>
                </div>

                {/* SECTION 3: DETALHAMENTO FINANCEIRO DA PROPOSTA */}
                <div className="space-y-4 pt-6 border-t border-slate-200">
                  <h4 className="font-bold text-xs uppercase tracking-widest text-slate-800">
                    DETALHAMENTO FINANCEIRO DA PROPOSTA
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                        ENTRADA
                      </label>
                      <input
                        type="number"
                        value={finDownPayment || ''}
                        onChange={e => setFinDownPayment(parseFloat(e.target.value) || 0)}
                        placeholder="R$ 0,00"
                        className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 font-mono focus:outline-none focus:border-slate-900 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                        QUITAÇÃO / SALDO FINAL
                      </label>
                      <input
                        type="number"
                        value={finBalancePayoff || ''}
                        onChange={e => setFinBalancePayoff(parseFloat(e.target.value) || 0)}
                        placeholder="R$ 0,00"
                        className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 font-mono focus:outline-none focus:border-slate-900 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                        DATA DA QUITAÇÃO
                      </label>
                      <input
                        type="date"
                        value={finPayoffDate}
                        onChange={e => setFinPayoffDate(e.target.value)}
                        className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 focus:outline-none focus:border-slate-900 shadow-2xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                        QTDE PARCELAS MENSAIS
                      </label>
                      <input
                        type="number"
                        value={finMonthlyCount || ''}
                        onChange={e => setFinMonthlyCount(parseInt(e.target.value) || 0)}
                        placeholder="Ex.: 60"
                        className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 focus:outline-none focus:border-slate-900 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                        VALOR DA PARCELA MENSAL
                      </label>
                      <input
                        type="number"
                        value={finMonthlyValue || ''}
                        onChange={e => setFinMonthlyValue(parseFloat(e.target.value) || 0)}
                        placeholder="R$ 0,00"
                        className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 font-mono focus:outline-none focus:border-slate-900 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                        1º VENCIMENTO MENSAL
                      </label>
                      <input
                        type="date"
                        value={finFirstMonthlyDueDate}
                        onChange={e => setFinFirstMonthlyDueDate(e.target.value)}
                        className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 focus:outline-none focus:border-slate-900 shadow-2xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                        QTDE PARCELAS ANUAIS
                      </label>
                      <input
                        type="number"
                        value={finAnnualCount || ''}
                        onChange={e => setFinAnnualCount(parseInt(e.target.value) || 0)}
                        placeholder="Ex.: 5"
                        className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 focus:outline-none focus:border-slate-900 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                        VALOR DA PARCELA ANUAL
                      </label>
                      <input
                        type="number"
                        value={finAnnualValue || ''}
                        onChange={e => setFinAnnualValue(parseFloat(e.target.value) || 0)}
                        placeholder="R$ 0,00"
                        className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 font-mono focus:outline-none focus:border-slate-900 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                        1º VENCIMENTO ANUAL
                      </label>
                      <input
                        type="date"
                        value={finFirstAnnualDueDate}
                        onChange={e => setFinFirstAnnualDueDate(e.target.value)}
                        className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 focus:outline-none focus:border-slate-900 shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Dynamic calculation banner */}
                  <div className="p-3 bg-[#F4F1EA] rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-2">
                    <span>Total mensais: <strong>{formatCurrency(totalMonthlyFin)}</strong></span>
                    <span>·</span>
                    <span>Total anuais: <strong>{formatCurrency(totalAnnualFin)}</strong></span>
                    <span>·</span>
                    <span>Soma geral: <strong className="text-slate-900 font-bold">{formatCurrency(totalGeneralFin)}</strong></span>
                  </div>
                </div>

                {/* SECTION 4: VISITA / APRESENTAÇÃO */}
                <div className="space-y-4 pt-6 border-t border-slate-200">
                  <h4 className="font-bold text-xs uppercase tracking-widest text-slate-800">
                    VISITA / APRESENTAÇÃO
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                        DATA E HORÁRIO
                      </label>
                      <input
                        type="datetime-local"
                        value={visitDateTime}
                        onChange={e => setVisitDateTime(e.target.value)}
                        className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 focus:outline-none focus:border-slate-900 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                        LOCAL
                      </label>
                      <input
                        type="text"
                        value={visitLocation}
                        onChange={e => setVisitLocation(e.target.value)}
                        placeholder="Decorado, estande, escritório..."
                        className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 focus:outline-none focus:border-slate-900 shadow-2xs"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 5: COMPRADOR PRINCIPAL — DOCUMENTAÇÃO */}
                <div className="space-y-4 pt-6 border-t border-slate-200">
                  <h4 className="font-bold text-xs uppercase tracking-widest text-slate-800">
                    COMPRADOR PRINCIPAL — DOCUMENTAÇÃO
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                        CPF
                      </label>
                      <input
                        type="text"
                        value={mainCpf}
                        onChange={e => setMainCpf(e.target.value)}
                        placeholder="000.000.000-00"
                        className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 focus:outline-none focus:border-slate-900 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                        RG
                      </label>
                      <input
                        type="text"
                        value={mainRg}
                        onChange={e => setMainRg(e.target.value)}
                        placeholder="00.000.000-0"
                        className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 focus:outline-none focus:border-slate-900 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                        ESTADO CIVIL
                      </label>
                      <input
                        type="text"
                        value={mainMaritalStatus}
                        onChange={e => setMainMaritalStatus(e.target.value)}
                        placeholder="Solteiro(a), Casado(a)..."
                        className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 focus:outline-none focus:border-slate-900 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                        PROFISSÃO
                      </label>
                      <input
                        type="text"
                        value={mainProfession}
                        onChange={e => setMainProfession(e.target.value)}
                        className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 focus:outline-none focus:border-slate-900 shadow-2xs"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                        NATURALIDADE
                      </label>
                      <input
                        type="text"
                        value={mainBirthPlace}
                        onChange={e => setMainBirthPlace(e.target.value)}
                        placeholder="Cidade/UF de nascimento"
                        className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 focus:outline-none focus:border-slate-900 shadow-2xs"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 6: CÔNJUGE / 2º COMPRADOR */}
                <div className="space-y-4 pt-6 border-t border-slate-200">
                  <h4 className="font-bold text-xs uppercase tracking-widest text-slate-800">
                    CÔNJUGE / 2º COMPRADOR
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                        NOME COMPLETO
                      </label>
                      <input
                        type="text"
                        value={spouseFullName}
                        onChange={e => setSpouseFullName(e.target.value)}
                        className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 focus:outline-none focus:border-slate-900 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                        CPF
                      </label>
                      <input
                        type="text"
                        value={spouseCpf}
                        onChange={e => setSpouseCpf(e.target.value)}
                        className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 focus:outline-none focus:border-slate-900 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                        RG
                      </label>
                      <input
                        type="text"
                        value={spouseRg}
                        onChange={e => setSpouseRg(e.target.value)}
                        className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 focus:outline-none focus:border-slate-900 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                        DATA DE NASCIMENTO
                      </label>
                      <input
                        type="date"
                        value={spouseBirthDate}
                        onChange={e => setSpouseBirthDate(e.target.value)}
                        className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 focus:outline-none focus:border-slate-900 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                        PROFISSÃO
                      </label>
                      <input
                        type="text"
                        value={spouseProfession}
                        onChange={e => setSpouseProfession(e.target.value)}
                        className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 focus:outline-none focus:border-slate-900 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                        TELEFONE
                      </label>
                      <input
                        type="text"
                        value={spousePhone}
                        onChange={e => setSpousePhone(e.target.value)}
                        className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 focus:outline-none focus:border-slate-900 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                        E-MAIL
                      </label>
                      <input
                        type="email"
                        value={spouseEmail}
                        onChange={e => setSpouseEmail(e.target.value)}
                        className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 focus:outline-none focus:border-slate-900 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                        REGIME DE BENS
                      </label>
                      <select
                        value={spouseMaritalRegime}
                        onChange={e => setSpouseMaritalRegime(e.target.value)}
                        className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 focus:outline-none focus:border-slate-900 shadow-2xs"
                      >
                        <option value="Comunhão Parcial de Bens">Comunhão Parcial de Bens</option>
                        <option value="Comunhão Universal de Bens">Comunhão Universal de Bens</option>
                        <option value="Separação Total de Bens">Separação Total de Bens</option>
                        <option value="Participação Final nos Aquestos">Participação Final nos Aquestos</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                        DATA DO CASAMENTO
                      </label>
                      <input
                        type="date"
                        value={spouseMarriageDate}
                        onChange={e => setSpouseMarriageDate(e.target.value)}
                        className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 focus:outline-none focus:border-slate-900 shadow-2xs"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        Deixe em branco se não houver cônjuge / 2º comprador. Compradores extras (3º em diante) ficam na seção abaixo.
                      </p>
                    </div>
                  </div>
                </div>

                {/* SECTION 7: COMPRADORES ADICIONAIS */}
                <div className="space-y-4 pt-6 border-t border-slate-200">
                  <h4 className="font-bold text-xs uppercase tracking-widest text-slate-800">
                    COMPRADORES ADICIONAIS
                  </h4>

                  {additionalBuyers.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">Nenhum comprador adicional cadastrado.</p>
                  ) : (
                    <div className="space-y-4">
                      {additionalBuyers.map((b, idx) => (
                        <div key={b.id || idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700">Comprador Adicional #{idx + 3}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveAdditionalBuyer(idx)}
                              className="text-rose-600 hover:text-rose-800 text-xs font-semibold"
                            >
                              Remover
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <input
                              type="text"
                              placeholder="Nome completo"
                              value={b.fullName}
                              onChange={e => handleUpdateAdditionalBuyer(idx, 'fullName', e.target.value)}
                              className="text-xs p-2.5 bg-white border border-slate-200 rounded-xl"
                            />
                            <input
                              type="text"
                              placeholder="CPF"
                              value={b.cpf}
                              onChange={e => handleUpdateAdditionalBuyer(idx, 'cpf', e.target.value)}
                              className="text-xs p-2.5 bg-white border border-slate-200 rounded-xl"
                            />
                            <input
                              type="text"
                              placeholder="Profissão"
                              value={b.profession}
                              onChange={e => handleUpdateAdditionalBuyer(idx, 'profession', e.target.value)}
                              className="text-xs p-2.5 bg-white border border-slate-200 rounded-xl"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleAddAdditionalBuyer}
                    className="flex items-center gap-1.5 px-4 py-2 bg-white border border-[#EAE7E2] hover:bg-[#F4F1EA] text-slate-800 text-xs font-semibold rounded-xl transition shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar comprador</span>
                  </button>
                </div>

                {/* BOTTOM ACTIONS */}
                <div className="flex items-center gap-3 pt-6 border-t border-slate-200">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md transition"
                  >
                    Salvar alterações
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedLead(null)}
                    className="px-6 py-2.5 bg-white border border-[#EAE7E2] hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl transition"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ========================================================== */}
          {/* TAB 2: DOCUMENTOS (SCREENSHOT 4)                           */}
          {/* ========================================================== */}
          {activeTab === 'documentos' && (
            <div className="max-w-6xl mx-auto space-y-6">
              {/* Top Sub-tabs & Generate link button */}
              <div className="flex items-center justify-between flex-wrap gap-4 pb-2">
                {/* Sub-tabs: Comprador principal, Cônjuge, etc. */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                  <button
                    onClick={() => setDocBuyerTab('principal')}
                    className={`px-4 py-2 rounded-lg transition ${
                      docBuyerTab === 'principal' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Comprador principal
                  </button>
                  <button
                    onClick={() => setDocBuyerTab('conjuge')}
                    className={`px-4 py-2 rounded-lg transition ${
                      docBuyerTab === 'conjuge' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Cônjuge / 2º Comprador
                  </button>
                  {additionalBuyers.map((ab, idx) => (
                    <button
                      key={ab.id}
                      onClick={() => setDocBuyerTab(ab.id)}
                      className={`px-4 py-2 rounded-lg transition ${
                        docBuyerTab === ab.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {ab.fullName ? ab.fullName.split(' ')[0] : `Comprador #${idx + 3}`}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setShowAutoRegisterModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-xl shadow-2xs transition cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Gerar link do cliente</span>
                </button>
              </div>

              {/* Yellow Warning Card: Checklist Obrigatório */}
              <div className="p-4 bg-[#FDF8E7] border border-[#F3E5AB] rounded-2xl space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-amber-700 shrink-0" />
                    <div>
                      <h4 className="font-bold text-xs text-amber-900 flex items-center gap-2">
                        <span>Checklist obrigatório</span>
                        <span className="bg-amber-200/70 text-amber-900 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          {pendingCount} de 3 pendentes
                        </span>
                      </h4>
                      <p className="text-[11px] text-amber-800/80 mt-0.5">
                        Anexe e aprove os documentos obrigatórios abaixo para liberar a próxima etapa.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleWhatsAppChargePendingDocs}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 rounded-xl text-xs font-semibold shadow-2xs transition"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Cobrar via WhatsApp</span>
                  </button>
                </div>

                {/* Badges */}
                <div className="flex items-center gap-6 pt-2 text-xs flex-wrap">
                  <div className="flex items-center gap-1.5 text-amber-900 font-medium">
                    <span className="text-amber-700 font-bold">✕</span> RG ou CNH
                  </div>
                  <div className="flex items-center gap-1.5 text-amber-900 font-medium">
                    <span className="text-amber-700 font-bold">✕</span> Comprovante de Endereço
                  </div>
                  <div className="flex items-center gap-1.5 text-amber-900 font-medium">
                    <span className="text-amber-700 font-bold">✕</span> Certidão de Estado Civil
                  </div>
                </div>
              </div>

              {/* 2x2 Grid of Standard Document Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. RG ou CNH */}
                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
                  <div>
                    <h5 className="font-bold text-xs text-slate-900">RG ou CNH</h5>
                    <span className="text-[11px] text-slate-400">Pendente</span>
                  </div>
                  <button
                    onClick={() => handleUploadDocument('rg_cnh')}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow transition"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Enviar</span>
                  </button>
                </div>

                {/* 2. Comprovante de Endereço */}
                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
                  <div>
                    <h5 className="font-bold text-xs text-slate-900">Comprovante de Endereço</h5>
                    <span className="text-[11px] text-slate-400">Pendente</span>
                  </div>
                  <button
                    onClick={() => handleUploadDocument('comprovante_endereco')}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow transition"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Enviar</span>
                  </button>
                </div>

                {/* 3. Certidão de Estado Civil */}
                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
                  <div>
                    <h5 className="font-bold text-xs text-slate-900">Certidão de Estado Civil</h5>
                    <span className="text-[11px] text-slate-400">Pendente</span>
                  </div>
                  <button
                    onClick={() => handleUploadDocument('certidao_estado_civil')}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow transition"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Enviar</span>
                  </button>
                </div>

                {/* 4. Declaração de Renda */}
                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
                  <div>
                    <h5 className="font-bold text-xs text-slate-900">
                      Declaração de Renda <span className="text-slate-400 font-normal">(opcional)</span>
                    </h5>
                    <span className="text-[11px] text-slate-400">Pendente</span>
                  </div>
                  <button
                    onClick={() => handleUploadDocument('declaracao_renda')}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow transition"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Enviar</span>
                  </button>
                </div>
              </div>

              {/* Uploaded Documents List */}
              {currentLeadDocs.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-slate-200">
                  <h4 className="font-bold text-xs uppercase tracking-widest text-slate-800">
                    Documentos Enviados ({currentLeadDocs.length})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {currentLeadDocs.map((doc, idx) => (
                      <div key={doc.id || idx} className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                          <div className="truncate text-xs">
                            <strong className="text-slate-900 block truncate">{doc.label}</strong>
                            <span className="text-[10px] text-slate-400">{doc.fileName} • {doc.fileSize}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {doc.fileDataUrl && (
                            <button
                              onClick={() => setSelectedDocPreview({ title: doc.label, url: doc.fileDataUrl! })}
                              className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
                              title="Visualizar"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Outros documentos section */}
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs uppercase tracking-widest text-slate-800">
                    Outros documentos
                  </h4>
                  <button
                    onClick={() => handleUploadDocument('outro')}
                    className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-xl transition shadow-2xs"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Adicionar</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* TAB 3: ATIVIDADES (SCREENSHOT 5)                           */}
          {/* ========================================================== */}
          {activeTab === 'atividades' && (
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left 2 Columns: Activity Timeline & List */}
              <div className="lg:col-span-2 space-y-4">
                {/* Rendered Activities Timeline */}
                <div className="space-y-4">
                  {/* Mock Concluded WhatsApp Item 1 */}
                  <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <MessageSquare className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-bold text-xs text-slate-900">WhatsApp</span>
                        <span className="text-[11px] text-slate-500">21/08/2026, 16:00</span>
                        <span className="text-[10px] font-bold uppercase text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          CONCLUIDA
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button className="text-xs font-semibold text-slate-600 hover:text-slate-900">
                          Reabrir
                        </button>
                        <button className="text-rose-500 hover:text-rose-700 p-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 font-medium">
                      Etapa: Lead Novo
                    </p>

                    <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700 space-y-1.5 leading-relaxed font-sans">
                      <p className="font-bold text-slate-800">Mensagem:</p>
                      <p>Olá {name.split(' ')[0] || selectedLead.name.split(' ')[0]}, aqui é {currentUser.name || 'Thalles'} da {settings.companyName}. vi que você demonstrou interesse em um imóvel com a gente e quero te ajudar a encontrar o melhor negócio. 🏡</p>
                      <p>Para já te enviar opções alinhadas, me conta rapidinho:</p>
                      <p>• Você busca para *morar* ou *investir*?</p>
                      <p>• Qual *região* prefere?</p>
                      <p>• Tem uma *faixa de valor* em mente?</p>
                      <p>Pode responder por aqui mesmo, {name.split(' ')[0] || selectedLead.name.split(' ')[0]}. Em poucos minutos eu te retorno com 2 ou 3 opções selecionadas. 🙌</p>
                    </div>
                  </div>

                  {/* Mock Concluded WhatsApp Item 2 */}
                  <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <MessageSquare className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-bold text-xs text-slate-900">WhatsApp</span>
                        <span className="text-[11px] text-slate-500">21/08/2026, 14:40</span>
                        <span className="text-[10px] font-bold uppercase text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          CONCLUIDA
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button className="text-xs font-semibold text-slate-600 hover:text-slate-900">
                          Reabrir
                        </button>
                        <button className="text-rose-500 hover:text-rose-700 p-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 font-medium">
                      Etapa: Apresentação
                    </p>

                    <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700 space-y-1.5 leading-relaxed font-sans">
                      <p className="font-bold text-slate-800">Mensagem:</p>
                      <p>Olá {name.split(' ')[0] || selectedLead.name.split(' ')[0]}, aqui é {currentUser.name || 'Thalles'} da {settings.companyName}. tudo bem? Quero te ajudar a encontrar o imóvel ideal. 🏡</p>
                      <p>Me responde só 3 coisinhas para eu já te enviar opções:</p>
                      <p>• *morar* ou *investir*?</p>
                      <p>• *região* preferida?</p>
                      <p>• *Faixa de valor*?</p>
                      <p>Pode mandar por aqui mesmo, {name.split(' ')[0] || selectedLead.name.split(' ')[0]}. 🙌</p>
                    </div>
                  </div>

                  {/* Custom Dynamic Activities */}
                  {leadActivities.map(act => (
                    <div key={act.id} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center capitalize">
                            <Calendar className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-bold text-xs text-slate-900 capitalize">{act.type}</span>
                          <span className="text-[11px] text-slate-500">{formatDateTimePtBR(act.dateTime)}</span>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                            act.completed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {act.completed ? 'CONCLUÍDA' : 'PENDENTE'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleActivityComplete(act.id)}
                            className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                          >
                            {act.completed ? 'Reabrir' : 'Concluir'}
                          </button>
                          <button
                            onClick={() => deleteActivity(act.id)}
                            className="text-rose-500 hover:text-rose-700 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {act.notes && (
                        <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl whitespace-pre-line">
                          {act.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: "Nova atividade" Form Card */}
              <div className="space-y-4">
                <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                  <h4 className="font-serif font-bold text-base text-slate-900">
                    Nova atividade
                  </h4>

                  <form onSubmit={handleAddActivity} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                        TIPO
                      </label>
                      <select
                        value={actType}
                        onChange={e => setActType(e.target.value as ActivityType)}
                        className="w-full text-xs p-3 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-slate-900"
                      >
                        <option value="ligacao">Ligação</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="reuniao">Reunião</option>
                        <option value="visita">Visita</option>
                        <option value="proposta">Proposta</option>
                        <option value="follow_up">Follow-up</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                        QUANDO
                      </label>
                      <input
                        type="datetime-local"
                        required
                        value={actDateTime}
                        onChange={e => setActDateTime(e.target.value)}
                        className="w-full text-xs p-3 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                        LEMBRETE (MIN ANTES)
                      </label>
                      <select
                        value={actReminderTime}
                        onChange={e => setActReminderTime(e.target.value)}
                        className="w-full text-xs p-3 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-slate-900"
                      >
                        <option value="15 minutos antes">15 minutos antes</option>
                        <option value="30 minutos antes">30 minutos antes</option>
                        <option value="1 hora antes">1 hora antes</option>
                        <option value="1 dia antes">1 dia antes</option>
                        <option value="No horário">No horário</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                        NOTAS
                      </label>
                      <textarea
                        rows={3}
                        value={actNotes}
                        onChange={e => setActNotes(e.target.value)}
                        className="w-full text-xs p-3 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-slate-900"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Adicionar</span>
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* TAB 4: NEGÓCIO (SCREENSHOT 6)                              */}
          {/* ========================================================== */}
          {activeTab === 'negocio' && (
            <div className="max-w-6xl mx-auto space-y-8">
              {/* Header Title */}
              <div className="flex items-start justify-between flex-wrap gap-4 pb-4 border-b border-slate-200">
                <div>
                  <h3 className="font-serif text-xl font-bold text-slate-900">
                    Contrato + Comissão
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Venda registrada, splits e parcelas em uma única visão. A Nota Fiscal já pode ser emitida no topo do lead.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase text-slate-500">STATUS</span>
                  <select
                    value={contractStatus}
                    onChange={e => setContractStatus(e.target.value as any)}
                    className="text-xs font-semibold px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none"
                  >
                    <option value="em_andamento">Em andamento</option>
                    <option value="concluido">Concluído</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
              </div>

              {/* Deal Summary Info Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block">EMPREENDIMENTO</span>
                  <strong className="text-sm text-slate-900 block mt-0.5">{propEnterprise || selectedLead.propertyInterest || 'TESTE'}</strong>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block">UNIDADE</span>
                  <span className="text-sm text-slate-900 font-medium block mt-0.5">{propUnit || '—'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block">VALOR DA VENDA</span>
                  <strong className="text-sm font-mono text-slate-900 block mt-0.5">
                    {formatCurrency(propValue || estimatedValue || 10000000)}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block">FECHADO EM</span>
                  <span className="text-sm text-slate-900 font-medium block mt-0.5">20/08/2026</span>
                </div>
              </div>

              {/* Section COMISSÃO */}
              <div className="space-y-4 pt-6 border-t border-slate-200">
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-widest text-slate-900">
                    COMISSÃO
                  </h4>
                  <p className="text-xs text-slate-500">Defina o total, a divisão entre as partes e as parcelas.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                      % SOBRE A VENDA (PODE VARIAR, EX.: 1,5)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={commPercentOnSale || ''}
                      onChange={e => {
                        const p = parseFloat(e.target.value) || 0;
                        setCommPercentOnSale(p);
                        const v = (propValue || estimatedValue || 10000000) * (p / 100);
                        setCommTotalValue(v);
                      }}
                      placeholder="0"
                      className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 font-mono focus:outline-none focus:border-slate-900 shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                      VALOR TOTAL DA COMISSÃO (R$)
                    </label>
                    <input
                      type="number"
                      value={commTotalValue || ''}
                      onChange={e => setCommTotalValue(parseFloat(e.target.value) || 0)}
                      placeholder="0,00"
                      className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 font-mono font-bold focus:outline-none focus:border-slate-900 shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                      PARCELAS
                    </label>
                    <input
                      type="number"
                      value={commInstallments}
                      onChange={e => setCommInstallments(parseInt(e.target.value) || 1)}
                      className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 focus:outline-none focus:border-slate-900 shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* Section DIVISÃO (LIVRE) */}
              <div className="space-y-4 pt-6 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs uppercase tracking-widest text-slate-900">
                    DIVISÃO (LIVRE)
                  </h4>
                  <span className="font-mono text-xs font-bold text-slate-700">
                    {totalSplitPercent}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-slate-900 transition-all duration-300"
                    style={{ width: `${Math.min(100, totalSplitPercent)}%` }}
                  />
                </div>

                {/* Split Percentages Rows */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                      IMOBILIÁRIA (%)
                    </label>
                    <input
                      type="number"
                      value={splitPercents.agency || ''}
                      onChange={e => setSplitPercents({ ...splitPercents, agency: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                      className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 font-mono shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                      GERENTE (%)
                    </label>
                    <input
                      type="number"
                      value={splitPercents.manager || ''}
                      onChange={e => setSplitPercents({ ...splitPercents, manager: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                      className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 font-mono shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                      ADMINISTRATIVO (%)
                    </label>
                    <input
                      type="number"
                      value={splitPercents.administrative || ''}
                      onChange={e => setSplitPercents({ ...splitPercents, administrative: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                      className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 font-mono shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                      CORRETOR (%)
                    </label>
                    <input
                      type="number"
                      value={splitPercents.broker || ''}
                      onChange={e => setSplitPercents({ ...splitPercents, broker: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                      className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 font-mono shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                      AFILIADO (%)
                    </label>
                    <input
                      type="number"
                      value={splitPercents.affiliate || ''}
                      onChange={e => setSplitPercents({ ...splitPercents, affiliate: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                      className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 font-mono shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                      INDICADOR (%)
                    </label>
                    <input
                      type="number"
                      value={splitPercents.referrer || ''}
                      onChange={e => setSplitPercents({ ...splitPercents, referrer: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                      className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 font-mono shadow-2xs"
                    />
                  </div>
                </div>

                <p className="text-[11px] text-slate-500">
                  Distribuição livre — ajuste os percentuais conforme o combinado (atual: {totalSplitPercent}%).
                </p>

                {/* Assignees and Due Date */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                      GERENTE
                    </label>
                    <select
                      value={assignedManagerId}
                      onChange={e => setAssignedManagerId(e.target.value)}
                      className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 shadow-2xs"
                    >
                      <option value="">—</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                      CORRETOR AFILIADO
                    </label>
                    <select
                      value={assignedAffiliateId}
                      onChange={e => setAssignedAffiliateId(e.target.value)}
                      className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 shadow-2xs"
                    >
                      <option value="">—</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                      INDICADOR (NOME LIVRE)
                    </label>
                    <input
                      type="text"
                      placeholder="Quem indicou?"
                      value={referrerFreeName}
                      onChange={e => setReferrerFreeName(e.target.value)}
                      className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 shadow-2xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                    1º VENCIMENTO
                  </label>
                  <input
                    type="date"
                    value={commFirstDueDate}
                    onChange={e => setCommFirstDueDate(e.target.value)}
                    className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 shadow-2xs"
                  />
                </div>
              </div>

              {/* Section Gratificação / Bônus (opcional) */}
              <div className="space-y-4 pt-6 border-t border-slate-200">
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-widest text-slate-900">
                    Gratificação / Bônus (opcional)
                  </h4>
                  <p className="text-xs text-slate-500">Valores livres em R$ somados ao recebimento de cada vendedor.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                      IMOBILIÁRIA (R$)
                    </label>
                    <input
                      type="number"
                      value={splitBonus.agency || ''}
                      onChange={e => setSplitBonus({ ...splitBonus, agency: parseFloat(e.target.value) || 0 })}
                      placeholder="0,00"
                      className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 font-mono shadow-2xs"
                    />
                    <span className="text-[10px] text-slate-400 block mt-1">R$ {(splitBonus.agency || 0).toFixed(2)}</span>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                      GERENTE (R$)
                    </label>
                    <input
                      type="number"
                      value={splitBonus.manager || ''}
                      onChange={e => setSplitBonus({ ...splitBonus, manager: parseFloat(e.target.value) || 0 })}
                      placeholder="0,00"
                      className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 font-mono shadow-2xs"
                    />
                    <span className="text-[10px] text-slate-400 block mt-1">R$ {(splitBonus.manager || 0).toFixed(2)}</span>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                      ADMINISTRATIVO (R$)
                    </label>
                    <input
                      type="number"
                      value={splitBonus.administrative || ''}
                      onChange={e => setSplitBonus({ ...splitBonus, administrative: parseFloat(e.target.value) || 0 })}
                      placeholder="0,00"
                      className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 font-mono shadow-2xs"
                    />
                    <span className="text-[10px] text-slate-400 block mt-1">R$ {(splitBonus.administrative || 0).toFixed(2)}</span>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                      CORRETOR (R$)
                    </label>
                    <input
                      type="number"
                      value={splitBonus.broker || ''}
                      onChange={e => setSplitBonus({ ...splitBonus, broker: parseFloat(e.target.value) || 0 })}
                      placeholder="0,00"
                      className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 font-mono shadow-2xs"
                    />
                    <span className="text-[10px] text-slate-400 block mt-1">R$ {(splitBonus.broker || 0).toFixed(2)}</span>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                      AFILIADO (R$)
                    </label>
                    <input
                      type="number"
                      value={splitBonus.affiliate || ''}
                      onChange={e => setSplitBonus({ ...splitBonus, affiliate: parseFloat(e.target.value) || 0 })}
                      placeholder="0,00"
                      className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 font-mono shadow-2xs"
                    />
                    <span className="text-[10px] text-slate-400 block mt-1">R$ {(splitBonus.affiliate || 0).toFixed(2)}</span>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                      INDICADOR (R$)
                    </label>
                    <input
                      type="number"
                      value={splitBonus.referrer || ''}
                      onChange={e => setSplitBonus({ ...splitBonus, referrer: parseFloat(e.target.value) || 0 })}
                      placeholder="0,00"
                      className="w-full text-xs p-3 bg-white border border-[#EAE7E2] rounded-xl text-slate-800 font-mono shadow-2xs"
                    />
                    <span className="text-[10px] text-slate-400 block mt-1">R$ {(splitBonus.referrer || 0).toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="markCompleted"
                    checked={isCommissionCompleted}
                    onChange={e => setIsCommissionCompleted(e.target.checked)}
                    className="w-4 h-4 rounded text-slate-900 border-slate-300 focus:ring-slate-900"
                  />
                  <label htmlFor="markCompleted" className="text-xs text-slate-700 select-none">
                    Marcar comissão como <strong>concluída</strong> (todas as parcelas como recebidas e contrato como Concluído)
                  </label>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleSaveCommission}
                    className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow transition"
                  >
                    Salvar comissão
                  </button>
                </div>
              </div>

              {/* Anexos de Contrato */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-slate-200">
                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
                  <div>
                    <h5 className="font-bold text-xs text-slate-900">Contrato assinado</h5>
                    <p className="text-[11px] text-slate-400">PDF do contrato principal</p>
                  </div>
                  <button
                    onClick={() => showToast('Arquivo do contrato principal anexado!')}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>Anexar</span>
                  </button>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
                  <div>
                    <h5 className="font-bold text-xs text-slate-900">Outros anexos</h5>
                    <p className="text-[11px] text-slate-400">Boletos, aditivos, distrato...</p>
                  </div>
                  <button
                    onClick={() => showToast('Novo anexo adicionado!')}
                    className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-semibold transition shadow-2xs"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Adicionar</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SUB-MODALS */}
      {showProposalPdf && (
        <ProposalPdfModal lead={selectedLead} onClose={() => setShowProposalPdf(false)} />
      )}

      {showDossier && (
        <ContractDossierModal lead={selectedLead} onClose={() => setShowDossier(false)} />
      )}

      {showInvoice && (
        <InvoiceModal lead={selectedLead} onClose={() => setShowInvoice(false)} />
      )}

      {/* MODAL: Link de auto-cadastro (Screenshot 1 exact design) */}
      {showAutoRegisterModal && (
        <div className="fixed inset-0 z-80 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 sm:p-7 max-w-lg w-full space-y-4 shadow-2xl border border-[#E5E0D8]">
            {/* Header */}
            <div className="flex items-center justify-between pb-1">
              <h3 className="font-bold text-base sm:text-lg text-[#1C1B17]">
                Link de auto-cadastro
              </h3>
              <button
                type="button"
                onClick={() => setShowAutoRegisterModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Description Text */}
            <p className="text-xs sm:text-sm text-[#736E65] leading-relaxed">
              Envie este link ao cliente. Ele pode preencher os dados e anexar a documentação sem precisar de login. O link expira em 30 dias.
            </p>

            {/* Input Link with Copy Button */}
            <div className="flex items-center justify-between gap-2 p-2.5 bg-[#FAF7F2] border border-[#E5E0D8] rounded-xl">
              <input
                type="text"
                readOnly
                value={portalLink}
                className="w-full text-xs bg-transparent border-none text-[#1C1B17] focus:outline-none font-mono px-2 select-all truncate"
              />
              <button
                type="button"
                onClick={copyPortalLink}
                className="p-2 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-[#E5E0D8] shadow-2xs transition shrink-0 cursor-pointer"
                title="Copiar link"
              >
                {linkCopied ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4 text-slate-600" />
                )}
              </button>
            </div>

            {/* Action Buttons (Ver status & Enviar pelo WhatsApp) */}
            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => {
                  setShowAutoRegisterModal(false);
                  openClientPortalModal(selectedLead);
                }}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-[#E5E0D8] hover:bg-[#FAF7F2] text-[#1C1B17] text-xs font-semibold rounded-xl transition shadow-2xs cursor-pointer"
              >
                <ExternalLink className="w-4 h-4 text-slate-600" />
                <span>Ver status</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowAutoRegisterModal(false);
                  const firstName = selectedLead.name ? selectedLead.name.split(' ')[0] : 'Cliente';
                  const msg = `Olá ${firstName}, segue o seu link exclusivo e seguro para preenchimento dos dados cadastrais e envio de documentos da sua proposta:\n\n${portalLink}\n\nQualquer dúvida estou à disposição!`;
                  const url = getWhatsAppLink(selectedLead.phone, msg);
                  window.open(url, '_blank');
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#1C1B17] hover:bg-[#2C2A24] text-white text-xs font-bold rounded-xl transition shadow cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <span>Enviar pelo WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Marcar como Perdido */}
      {showLostModal && (
        <div className="fixed inset-0 z-80 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 sm:p-7 max-w-md w-full space-y-4 shadow-2xl border border-rose-100">
            {/* Header */}
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2 text-rose-700">
                <XCircle className="w-5 h-5" />
                <h3 className="font-bold text-base sm:text-lg text-slate-900">
                  Marcar Lead como Perdido
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowLostModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              O lead <strong>{selectedLead.name}</strong> será ocultado do funil de vendas ativo. Você poderá localizá-lo a qualquer momento usando o filtro <em>"Perdidos"</em> e reativá-lo se necessário.
            </p>

            {/* Reason selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Motivo da Perda <span className="text-rose-500">*</span>
              </label>
              <select
                value={lostReasonSelected}
                onChange={e => setLostReasonSelected(e.target.value)}
                className="w-full text-xs font-medium p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              >
                {LOST_REASON_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {/* Notes textarea */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Observações complementares (opcional)
              </label>
              <textarea
                value={lostNotesInput}
                onChange={e => setLostNotesInput(e.target.value)}
                placeholder="Ex: Cliente fechou outro empreendimento no mesmo bairro com 4 dormitórios..."
                rows={3}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowLostModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  markLeadLost(selectedLead.id, lostReasonSelected, lostNotesInput);
                  setShowLostModal(false);
                  setToastMessage('Lead arquivado como PERDIDO com sucesso.');
                  setTimeout(() => setToastMessage(null), 3500);
                }}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                <span>Confirmar Perda</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Image Preview Modal */}
      {selectedDocPreview && (
        <div className="fixed inset-0 z-80 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-4 max-w-2xl w-full space-y-3 shadow-2xl">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-slate-800">{selectedDocPreview.title}</h4>
              <button
                onClick={() => setSelectedDocPreview(null)}
                className="p-1 text-slate-400 hover:text-slate-800"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto flex items-center justify-center bg-slate-50 p-2 rounded-xl">
              <img src={selectedDocPreview.url} alt={selectedDocPreview.title} className="max-w-full rounded-lg object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
