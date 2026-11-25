import {Check, CheckCircle2, MessageSquare, PhoneCall, X} from 'lucide-react';
import {type FormEvent, useEffect, useMemo, useState} from 'react';
import {COMPANY_INFO, formatBHD, services} from '@/src/data/services';
import {apiClient} from '@/src/lib/api';

interface B2bInquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedServiceIds: number[];
  onToggleService: (serviceId: number) => void;
}

const TIMELINE_OPTIONS = [
  'Immediate (1–2 Weeks)',
  'Standard (2–4 Weeks)',
  'Enterprise (4–8 Weeks)',
  'Ongoing Retainer',
] as const;

function generateInquiryRef(): string {
  const num = Math.floor(100 + Math.random() * 899);
  return `XT-INQ-2026-${num}`;
}

export function B2bInquiryModal({
  isOpen,
  onClose,
  selectedServiceIds,
  onToggleService,
}: B2bInquiryModalProps) {
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactChannel, setContactChannel] = useState('');
  const [timeline, setTimeline] = useState<string>(TIMELINE_OPTIONS[1]);
  const [projectBrief, setProjectBrief] = useState('');
  const [error, setError] = useState('');
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

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

  const whatsappUrl = useMemo(() => {
    const lines = [
      `Hello XeroTech Technologies (CR ${COMPANY_INFO.crNumber}),`,
      `Proposal / Call Request: ${submittedRef || 'Direct B2B Inquiry'}`,
      `Company: ${companyName.trim() || 'N/A'}`,
      `Contact: ${contactName.trim()} (${contactChannel.trim()})`,
      `Target Timeline: ${timeline}`,
      '',
      'Selected Services:',
      ...(selectedServices.length > 0
        ? selectedServices.map((s) => `- [${s.code}] ${s.name}: ${s.benchmarkPriceBHD} BHD`)
        : ['- General Architecture Consultation']),
      '',
      selectedServices.length > 0 ? `Benchmark Total: ${formatBHD(totalBHD)}` : '',
      projectBrief.trim() ? `Project Brief: ${projectBrief.trim()}` : '',
    ].filter(Boolean);

    return `https://wa.me/${COMPANY_INFO.whatsappDigits}?text=${encodeURIComponent(lines.join('\n'))}`;
  }, [companyName, contactChannel, contactName, projectBrief, selectedServices, submittedRef, timeline, totalBHD]);

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setError('Please enter your company or organization name.');
      return;
    }
    if (!contactName.trim()) {
      setError('Please enter a primary contact name.');
      return;
    }
    const channelTrimmed = contactChannel.trim();
    const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(channelTrimmed);
    const looksLikePhone = channelTrimmed.replace(/\D/g, '').length >= 8;
    if (!looksLikeEmail && !looksLikePhone) {
      setError('Please enter a valid work email or WhatsApp / phone number.');
      return;
    }

    setError('');
    const refCode = generateInquiryRef();
    setSubmittedRef(refCode);

    void apiClient
      .post('/leads/', {
        referenceCode: refCode,
        companyName: companyName.trim(),
        contactPerson: contactName.trim(),
        phone: looksLikePhone ? channelTrimmed : '+973 0000 0000',
        email: looksLikeEmail ? channelTrimmed : '',
        serviceNames:
          selectedServices.length > 0
            ? selectedServices.map((s) => s.name)
            : ['B2B Proposal & Architecture Call'],
        estimatedTotalBHD: totalBHD,
        notes: `[Timeline: ${timeline}] ${projectBrief.trim()}`.trim(),
      })
      .catch(() => {
        // Non-blocking background sync
      });
  };

  const handleClose = () => {
    setError('');
    setSubmittedRef(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/45 backdrop-blur-md p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="b2b-inquiry-title"
    >
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl glass-modal">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-white/85 px-5 sm:px-6 py-4">
          <div>
            <div className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#0066FF]">
              Direct B2B Consultation · CR {COMPANY_INFO.crNumber}
            </div>
            <h2 id="b2b-inquiry-title" className="text-lg font-extrabold text-[#0f172a]">
              {submittedRef ? 'Proposal Request Registered' : 'Request Proposal / Engineering Call'}
            </h2>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Close B2B Inquiry Modal"
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl text-[#64748b] hover:bg-slate-100 hover:text-[#0f172a] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        {submittedRef ? (
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-5 flex items-start gap-3.5">
              <CheckCircle2 className="w-6 h-6 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <div className="font-mono text-xs font-bold uppercase tracking-wider text-emerald-800">
                  Inquiry Reference · {submittedRef}
                </div>
                <p className="mt-1 text-sm font-semibold text-[#0f172a]">
                  Thank you, {contactName}. Our Riffa engineering desk has received your scope for{' '}
                  {companyName}.
                </p>
                <p className="mt-1 text-xs text-[#334155]">
                  Target Timeline: <span className="font-semibold">{timeline}</span> · Response SLA:
                  within 4 business hours.
                </p>
              </div>
            </div>

            {selectedServices.length > 0 && (
              <div className="rounded-2xl glass-panel-subtle overflow-hidden">
                <div className="flex items-center justify-between bg-slate-50/90 px-4 py-2.5 border-b border-slate-200">
                  <span className="font-mono text-xs font-semibold text-[#0f172a]">
                    Assigned Scope ({selectedServices.length})
                  </span>
                  <span className="font-mono text-xs font-bold text-[#0066FF] tabular-nums">
                    {formatBHD(totalBHD)}
                  </span>
                </div>
                <div className="divide-y divide-slate-200">
                  {selectedServices.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between px-4 py-2.5 text-xs"
                    >
                      <span className="font-semibold text-[#0f172a]">
                        <span className="font-mono text-[#64748b] mr-2">{s.code}</span>
                        {s.name}
                      </span>
                      <span className="font-mono font-bold text-[#0f172a] tabular-nums">
                        {s.benchmarkPriceBHD} BHD
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#0066FF] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#0052CC] transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Send Scope on WhatsApp</span>
              </a>
              <button
                type="button"
                onClick={handleClose}
                className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-[#0f172a] hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50/90 px-4 py-3 text-xs font-medium text-red-700">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="b2b-company"
                    className="block text-xs font-semibold text-[#0f172a] mb-1.5"
                  >
                    Company Name *
                  </label>
                  <input
                    id="b2b-company"
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Gulf Horizon W.L.L."
                    className="w-full rounded-xl border glass-input px-3.5 py-2.5 text-base sm:text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="b2b-contact"
                    className="block text-xs font-semibold text-[#0f172a] mb-1.5"
                  >
                    Contact Name *
                  </label>
                  <input
                    id="b2b-contact"
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Decision Maker Name"
                    className="w-full rounded-xl border glass-input px-3.5 py-2.5 text-base sm:text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="b2b-channel"
                    className="block text-xs font-semibold text-[#0f172a] mb-1.5"
                  >
                    Email / WhatsApp *
                  </label>
                  <input
                    id="b2b-channel"
                    type="text"
                    required
                    value={contactChannel}
                    onChange={(e) => setContactChannel(e.target.value)}
                    placeholder="name@company.bh or +973 33XX XXXX"
                    className="w-full rounded-xl border glass-input px-3.5 py-2.5 text-base sm:text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="b2b-timeline"
                    className="block text-xs font-semibold text-[#0f172a] mb-1.5"
                  >
                    Estimated Timeline
                  </label>
                  <select
                    id="b2b-timeline"
                    value={timeline}
                    onChange={(e) => setTimeline(e.target.value)}
                    className="w-full rounded-xl border glass-input px-3.5 py-2.5 text-base sm:text-sm focus:outline-none"
                  >
                    {TIMELINE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Selected Services Multi-Select */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-[#0f172a]">
                    Selected Services ({selectedServices.length})
                  </span>
                  {selectedServices.length > 0 && (
                    <span className="font-mono text-xs font-bold text-[#0066FF] tabular-nums">
                      Benchmark: {formatBHD(totalBHD)}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto rounded-2xl border border-slate-200/80 bg-white/55 p-2.5">
                  {services.map((service) => {
                    const checked = selectedServiceIds.includes(service.id);
                    return (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => onToggleService(service.id)}
                        className={`min-h-[44px] flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left transition-colors cursor-pointer ${
                          checked
                            ? 'border-[#0066FF] bg-sky-50/90 text-[#0f172a]'
                            : 'border-slate-200 bg-white/80 text-[#334155] hover:border-sky-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`flex h-4 w-4 items-center justify-center rounded border shrink-0 ${
                              checked
                                ? 'border-[#0066FF] bg-[#0066FF] text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {checked && <Check className="w-3 h-3" />}
                          </span>
                          <span className="text-xs font-semibold truncate">{service.shortName}</span>
                        </div>
                        <span className="font-mono text-[11px] font-bold text-[#0369a1] tabular-nums shrink-0">
                          {service.benchmarkPriceBHD}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label
                  htmlFor="b2b-brief"
                  className="block text-xs font-semibold text-[#0f172a] mb-1.5"
                >
                  Project Brief
                </label>
                <textarea
                  id="b2b-brief"
                  rows={3}
                  value={projectBrief}
                  onChange={(e) => setProjectBrief(e.target.value)}
                  placeholder="Share objectives, integrations (BenefitPay, ERP, AI agents), or preferred call time..."
                  className="w-full rounded-xl border glass-input px-3.5 py-2.5 text-base sm:text-sm focus:outline-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white/85 px-5 sm:px-6 py-4">
              <a
                href={`tel:${COMPANY_INFO.phones[0].replace(/\s+/g, '')}`}
                className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-[#334155] hover:text-[#0066FF]"
              >
                <PhoneCall className="w-3.5 h-3.5 text-[#0066FF]" />
                <span>{COMPANY_INFO.phones[0]}</span>
              </a>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={handleClose}
                  className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-[#334155] hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 sm:flex-initial min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#0066FF] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0052CC] transition-colors cursor-pointer"
                >
                  <span>Submit Proposal Request</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
