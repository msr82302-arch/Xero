import {ArrowLeft, ArrowRight, Check, MessageSquare, X} from 'lucide-react';
import {useEffect, useMemo, useState} from 'react';
import {COMPANY_INFO, formatBHD, services} from '@/src/data/services';
import {apiClient} from '@/src/lib/api';

interface EstimatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedServiceIds: number[];
  onToggleService: (serviceId: number) => void;
  onClearServices: () => void;
}

interface ClientFormState {
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  notes: string;
}

function generateLeadReferenceId(): string {
  const num = Math.floor(100 + Math.random() * 899);
  return `XT-LEAD-2026-${num}`;
}

export function EstimatorModal({
  isOpen,
  onClose,
  selectedServiceIds,
  onToggleService,
  onClearServices,
}: EstimatorModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [leadRef, setLeadRef] = useState<string>(() => generateLeadReferenceId());
  const [formError, setFormError] = useState<string>('');
  const [formData, setFormData] = useState<ClientFormState>({
    companyName: '',
    contactPerson: '',
    phone: '+973 ',
    email: '',
    notes: '',
  });

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const selectedServices = useMemo(
    () => services.filter((s) => selectedServiceIds.includes(s.id)),
    [selectedServiceIds],
  );

  const totalBHD = useMemo(
    () => selectedServices.reduce((acc, item) => acc + item.numericPriceBHD, 0),
    [selectedServices],
  );

  const advanceGateBHD = useMemo(() => totalBHD * 0.5, [totalBHD]);

  const whatsappUrl = useMemo(() => {
    const lines = [
      `Hello XeroTech Technologies (CR ${COMPANY_INFO.crNumber}),`,
      `Lead Reference: ${leadRef}`,
      `Company: ${formData.companyName.trim() || 'N/A'}`,
      `Contact: ${formData.contactPerson.trim()} (${formData.phone.trim()})`,
      formData.email.trim() ? `Email: ${formData.email.trim()}` : '',
      '',
      'Selected Scope:',
      ...selectedServices.map(
        (s) => `- [${s.code}] ${s.name}: ${s.benchmarkPriceBHD} BHD`,
      ),
      '',
      `Estimated Benchmark Total: ${formatBHD(totalBHD)}`,
      `50% Kickoff Milestone: ${formatBHD(advanceGateBHD)}`,
      formData.notes.trim() ? `Project Notes: ${formData.notes.trim()}` : '',
    ].filter(Boolean);

    return `https://wa.me/${COMPANY_INFO.whatsappDigits}?text=${encodeURIComponent(lines.join('\n'))}`;
  }, [advanceGateBHD, formData, leadRef, selectedServices, totalBHD]);

  if (!isOpen) return null;

  const handleNextToDetails = () => {
    if (selectedServices.length === 0) {
      setFormError('Select at least one service line to build an estimate.');
      return;
    }
    setFormError('');
    setStep(2);
  };

  const handleConfirmEstimate = () => {
    if (!formData.contactPerson.trim()) {
      setFormError('Please enter your contact name.');
      return;
    }
    if (formData.phone.replace(/\D/g, '').length < 8) {
      setFormError('Please provide a valid Bahrain phone or WhatsApp number.');
      return;
    }
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      setFormError('Please enter a valid email address.');
      return;
    }
    setFormError('');
    const nextRef = generateLeadReferenceId();
    setLeadRef(nextRef);
    setStep(3);

    void apiClient
      .post('/leads/', {
        referenceCode: nextRef,
        companyName: formData.companyName.trim(),
        contactPerson: formData.contactPerson.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        serviceNames: selectedServices.map((s) => s.name),
        estimatedTotalBHD: totalBHD,
        notes: formData.notes.trim(),
      })
      .catch(() => {
        // Non-blocking background sync to XBMS quotation pipeline
      });
  };

  const handleResetAndClose = () => {
    setStep(1);
    setFormError('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-md p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="estimator-modal-title"
    >
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl glass-modal">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-white/85">
          <div>
            <div className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#0066FF]">
              Step {step} of 3 · Bahrain BHD Estimator
            </div>
            <h2 id="estimator-modal-title" className="text-lg font-extrabold text-[#0f172a]">
              {step === 1 && 'Select Project Scope & Capabilities'}
              {step === 2 && 'Client & Organization Details'}
              {step === 3 && 'Estimate Summary & Dispatch Ready'}
            </h2>
          </div>

          <button
            type="button"
            onClick={handleResetAndClose}
            aria-label="Close Project Estimator"
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg p-2 text-[#64748b] hover:bg-slate-100 hover:text-[#0f172a] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {formError && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50/90 px-4 py-3 text-xs font-medium text-red-700">
              {formError}
            </div>
          )}

          {/* STEP 1: Multi-select Services Checklist */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-[#334155]">
                <span>Choose one or more capabilities from our 12 official Bahrain service lines.</span>
                {selectedServices.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearServices}
                    className="font-semibold text-[#334155] hover:text-[#0066FF] cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {services.map((service) => {
                  const checked = selectedServiceIds.includes(service.id);
                  return (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => {
                        setFormError('');
                        onToggleService(service.id);
                      }}
                      className={`flex items-start justify-between gap-3 rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                        checked
                          ? 'border-[#0066FF] bg-sky-50/90 ring-1 ring-[#0066FF]/30'
                          : 'border-slate-200 bg-white/80 hover:border-[#0066FF]/45'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <span
                          className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-md border shrink-0 transition-colors ${
                            checked
                              ? 'border-[#0066FF] bg-[#0066FF] text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {checked && <Check className="w-3.5 h-3.5" />}
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[#0f172a] truncate">
                            {service.name}
                          </div>
                          <div className="mt-0.5 font-mono text-[11px] text-[#64748b]">
                            {service.code} · {service.timeline}
                          </div>
                        </div>
                      </div>

                      <span className="font-mono text-xs font-bold text-[#0066FF] tabular-nums shrink-0">
                        {service.benchmarkPriceBHD} BHD
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: Client Form */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="rounded-xl glass-panel-subtle px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#334155]">
                  {selectedServices.length} Service Line(s) Selected
                </span>
                <span className="font-mono text-sm font-extrabold text-[#0066FF] tabular-nums">
                  Estimated Benchmark: {formatBHD(totalBHD)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="est-company"
                    className="block text-xs font-semibold text-[#0f172a] mb-1.5"
                  >
                    Company / Organization Name
                  </label>
                  <input
                    id="est-company"
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                    placeholder="e.g. Easy Travels SPC"
                    className="w-full rounded-xl border glass-input px-3.5 py-2.5 text-base sm:text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="est-contact"
                    className="block text-xs font-semibold text-[#0f172a] mb-1.5"
                  >
                    Contact Person *
                  </label>
                  <input
                    id="est-contact"
                    type="text"
                    required
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({...formData, contactPerson: e.target.value})}
                    placeholder="Full Name"
                    className="w-full rounded-xl border glass-input px-3.5 py-2.5 text-base sm:text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="est-phone"
                    className="block text-xs font-semibold text-[#0f172a] mb-1.5"
                  >
                    Bahrain Phone / WhatsApp *
                  </label>
                  <input
                    id="est-phone"
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="+973 33XX XXXX"
                    className="w-full rounded-xl border glass-input px-3.5 py-2.5 font-mono text-base sm:text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="est-email"
                    className="block text-xs font-semibold text-[#0f172a] mb-1.5"
                  >
                    Email Address
                  </label>
                  <input
                    id="est-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="name@company.bh"
                    className="w-full rounded-xl border glass-input px-3.5 py-2.5 text-base sm:text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="est-notes"
                  className="block text-xs font-semibold text-[#0f172a] mb-1.5"
                >
                  Project Requirements / Timeline Notes
                </label>
                <textarea
                  id="est-notes"
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Describe integrations (BenefitPay, AFS, ERP), target launch date, or branch count..."
                  className="w-full rounded-xl border glass-input px-3.5 py-2.5 text-base sm:text-sm focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* STEP 3: Confirmation & WhatsApp Dispatch */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-sky-200 bg-sky-50/90 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-mono text-xs uppercase tracking-wider text-[#0066FF]">
                      Generated Lead Reference
                    </div>
                    <div className="mt-1 font-mono text-xl font-extrabold text-[#0f172a] tabular-nums">
                      {leadRef}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-xs uppercase tracking-wider text-[#475569]">
                      Estimated Benchmark
                    </div>
                    <div className="mt-1 font-mono text-xl font-extrabold text-[#0066FF] tabular-nums">
                      {formatBHD(totalBHD)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl glass-panel-subtle overflow-hidden">
                <div className="bg-slate-50/90 px-4 py-2.5 border-b border-slate-200 font-mono text-xs font-semibold text-[#0f172a]">
                  Itemized Scope ({selectedServices.length})
                </div>
                <div className="divide-y divide-slate-200">
                  {selectedServices.map((service) => (
                    <div
                      key={service.id}
                      className="flex items-center justify-between px-4 py-2.5 text-xs"
                    >
                      <span className="font-semibold text-[#0f172a]">
                        <span className="font-mono text-[#64748b] mr-2">{service.code}</span>
                        {service.name}
                      </span>
                      <span className="font-mono font-bold text-[#0f172a] tabular-nums">
                        {service.benchmarkPriceBHD} BHD
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between bg-slate-50/80 px-4 py-3 text-xs">
                    <span className="font-semibold text-[#334155]">
                      Standard 50% Advance Kickoff Milestone
                    </span>
                    <span className="font-mono font-bold text-[#0066FF] tabular-nums">
                      {formatBHD(advanceGateBHD)}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-[#475569] leading-relaxed">
                Click below to send this pre-compiled engineering scope directly to XeroTech
                Technologies WhatsApp ({COMPANY_INFO.whatsappDisplay}) for formal CR{' '}
                {COMPANY_INFO.crNumber} quotation issuance.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 bg-white/85 px-6 py-4">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-wider text-[#64748b]">
              Live Estimate Total
            </div>
            <div className="font-mono text-lg font-extrabold text-[#0f172a] tabular-nums">
              {formatBHD(totalBHD)}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {step === 1 && (
              <button
                type="button"
                onClick={handleNextToDetails}
                className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-[#0066FF] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0052CC] transition-colors cursor-pointer"
              >
                <span>Next: Contact Details</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {step === 2 && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setFormError('');
                    setStep(1);
                  }}
                  className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-[#334155] hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={handleConfirmEstimate}
                  className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-[#0066FF] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0052CC] transition-colors cursor-pointer"
                >
                  <span>Generate Scope Reference</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}

            {step === 3 && (
              <>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-[#334155] hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Edit Details</span>
                </button>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-[#0066FF] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0052CC] transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Submit via WhatsApp ({COMPANY_INFO.whatsappDisplay})</span>
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
