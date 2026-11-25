import axios from 'axios';
import {CheckCircle2, Sparkles, X} from 'lucide-react';
import {useEffect, useMemo, useState, type FormEvent} from 'react';
import {COMPANY_INFO, services} from '@/src/data/services';
import {apiClient} from '@/src/lib/api';
import type {PaymentChannel, PaymentTerms, ReceiptRecord} from '@/src/types/xbms';
import {formatBHD, roundBHD} from '@/src/types/xbms';

export interface ReceiptPrefillData {
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  serviceName?: string;
  projectTitle?: string;
  totalBHD?: number;
}

interface CreateReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (receipt: ReceiptRecord) => void;
  prefill?: ReceiptPrefillData | null;
  nextSequenceNo?: string;
}

export function CreateReceiptModal({
  isOpen,
  onClose,
  onCreated,
  prefill,
  nextSequenceNo = 'XT-REC-2026-11-005',
}: CreateReceiptModalProps) {
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('+973 ');
  const [clientEmail, setClientEmail] = useState('');
  const [serviceName, setServiceName] = useState(services[0].name);
  const [projectTitle, setProjectTitle] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentChannel>('BenefitPay');
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>('Partial Payment (50%)');
  const [totalStr, setTotalStr] = useState('150.000');
  const [balanceStr, setBalanceStr] = useState('50.000');
  const [notes, setNotes] = useState('');
  const [stampOn, setStampOn] = useState(true);
  const [viewMode, setViewMode] = useState<'split' | 'form'>('split');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg('');
    if (prefill) {
      setClientName(prefill.clientName || '');
      setClientPhone(prefill.clientPhone || '+973 ');
      setClientEmail(prefill.clientEmail || '');
      if (prefill.serviceName) setServiceName(prefill.serviceName);
      setProjectTitle(prefill.projectTitle || '');
      if (typeof prefill.totalBHD === 'number' && prefill.totalBHD > 0) {
        setTotalStr(prefill.totalBHD.toFixed(3));
        setBalanceStr((prefill.totalBHD * 0.5).toFixed(3));
      }
    }
  }, [isOpen, prefill]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const numericTotal = useMemo(() => {
    const val = Number.parseFloat(totalStr);
    return Number.isFinite(val) && val >= 0 ? roundBHD(val) : 0;
  }, [totalStr]);

  const numericBalance = useMemo(() => {
    const val = Number.parseFloat(balanceStr);
    const clamped = Number.isFinite(val) && val >= 0 ? Math.min(val, numericTotal) : 0;
    return roundBHD(clamped);
  }, [balanceStr, numericTotal]);

  const calculatedPaid = useMemo(
    () => roundBHD(Math.max(0, numericTotal - numericBalance)),
    [numericTotal, numericBalance],
  );

  const derivedStatus = useMemo(() => {
    if (numericTotal <= 0) return 'UNPAID';
    if (numericBalance === 0) return 'PAID';
    if (calculatedPaid === 0) return 'UNPAID';
    return 'PARTIAL';
  }, [numericTotal, numericBalance, calculatedPaid]);

  if (!isOpen) return null;

  const handleTermsChange = (nextTerms: PaymentTerms) => {
    setPaymentTerms(nextTerms);
    if (nextTerms === 'Full Payment') {
      setBalanceStr('0.000');
    } else if (nextTerms === 'Partial Payment (50%)') {
      setBalanceStr(roundBHD(numericTotal * 0.5).toFixed(3));
    } else if (nextTerms === 'Unpaid / Credit') {
      setBalanceStr(numericTotal.toFixed(3));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (clientName.trim().length < 2) {
      setErrorMsg('Please enter the client or organization name.');
      return;
    }
    if (clientPhone.replace(/\D/g, '').length < 8) {
      setErrorMsg('Please enter a valid Bahrain phone/WhatsApp number.');
      return;
    }
    if (numericTotal <= 0) {
      setErrorMsg('Total project cost must be greater than 0.000 BHD.');
      return;
    }

    setSubmitting(true);
    try {
      const {data} = await apiClient.post<{receipt: ReceiptRecord}>('/receipts/', {
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        clientEmail: clientEmail.trim(),
        serviceName,
        projectTitle: projectTitle.trim() || serviceName,
        paymentMethod,
        paymentTerms,
        totalBHD: numericTotal,
        balanceBHD: numericBalance,
        notes: notes.trim(),
      });
      onCreated(data.receipt);
      onClose();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setErrorMsg(
          (err.response?.data as {error?: string} | undefined)?.error ||
            'Unable to finalize receipt. Check inputs and retry.',
        );
      } else {
        setErrorMsg('Unexpected error while creating receipt.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-sm p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-receipt-title"
    >
      <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl glass-modal">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-5 py-3.5">
          <div>
            <div className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#0066FF]">
              Billing Core Module · Next Sequence {nextSequenceNo}
            </div>
            <h2 id="create-receipt-title" className="text-base sm:text-lg font-extrabold text-[#0f172a]">
              Create Official Payment Receipt
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStampOn((prev) => !prev)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                stampOn
                  ? 'border-sky-200 bg-sky-50 text-[#0066FF]'
                  : 'border-slate-300 bg-white text-[#475569]'
              }`}
            >
              Stamp: {stampOn ? 'ON' : 'OFF'}
            </button>
            <div className="hidden md:inline-flex rounded-lg glass-panel-subtle p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`rounded-md px-2.5 py-1 font-semibold cursor-pointer ${
                  viewMode === 'split' ? 'bg-[#0066FF] text-white' : 'text-[#475569] hover:text-[#0f172a]'
                }`}
              >
                Split View
              </button>
              <button
                type="button"
                onClick={() => setViewMode('form')}
                className={`rounded-md px-2.5 py-1 font-semibold cursor-pointer ${
                  viewMode === 'form' ? 'bg-[#0066FF] text-white' : 'text-[#475569] hover:text-[#0f172a]'
                }`}
              >
                Form Only
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Create Receipt"
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-[#0f172a] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 bg-slate-100/75">
          <div
            className={`grid gap-6 ${
              viewMode === 'split' ? 'grid-cols-1 lg:grid-cols-12' : 'grid-cols-1 max-w-2xl mx-auto'
            }`}
          >
            {/* Left Form */}
            <form
              onSubmit={handleSubmit}
              className={`${
                viewMode === 'split' ? 'lg:col-span-5' : ''
              } rounded-2xl glass-surface p-5 space-y-5`}
            >
              {errorMsg && (
                <div className="rounded-xl border border-red-200 bg-red-50/90 px-3.5 py-2.5 text-xs font-medium text-red-700">
                  {errorMsg}
                </div>
              )}

              {/* 1. Client Information */}
              <div className="space-y-3">
                <div className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#0066FF]">
                  1. Client Information
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0f172a] mb-1">
                    Client Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Enter client name or company"
                    className="w-full rounded-xl border px-3 py-2 text-xs sm:text-sm glass-input focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#0f172a] mb-1">
                      Contact / WhatsApp *
                    </label>
                    <input
                      type="tel"
                      required
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="+973 3XXXXXXX"
                      className="w-full rounded-xl border px-3 py-2 font-mono text-xs sm:text-sm glass-input focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#0f172a] mb-1">
                      Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="client@domain.bh"
                      className="w-full rounded-xl border px-3 py-2 text-xs sm:text-sm glass-input focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Service & Project Description */}
              <div className="space-y-3 border-t border-slate-200 pt-4">
                <div className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#0066FF]">
                  2. Service &amp; Project Description
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0f172a] mb-1">
                    Official Service Category *
                  </label>
                  <select
                    value={serviceName}
                    onChange={(e) => setServiceName(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2 text-xs sm:text-sm glass-input focus:outline-none"
                  >
                    {services.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name} ({s.benchmarkPriceBHD} BHD)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0f172a] mb-1">
                    Project Title / Deliverables
                  </label>
                  <input
                    type="text"
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                    placeholder="e.g. Corporate Portal Deployment Phase 1"
                    className="w-full rounded-xl border px-3 py-2 text-xs sm:text-sm glass-input focus:outline-none"
                  />
                </div>
              </div>

              {/* 3. Payment Details */}
              <div className="space-y-3 border-t border-slate-200 pt-4">
                <div className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#0066FF]">
                  3. Payment Details
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#0f172a] mb-1">
                      Payment Channel
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentChannel)}
                      className="w-full rounded-xl border px-3 py-2 text-xs sm:text-sm glass-input focus:outline-none"
                    >
                      <option value="BenefitPay">BenefitPay (Bahrain)</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Card Payment">Card Payment</option>
                      <option value="Cash">Cash</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#0f172a] mb-1">
                      Payment Terms
                    </label>
                    <select
                      value={paymentTerms}
                      onChange={(e) => handleTermsChange(e.target.value as PaymentTerms)}
                      className="w-full rounded-xl border px-3 py-2 text-xs sm:text-sm glass-input focus:outline-none"
                    >
                      <option value="Partial Payment (50%)">Partial Payment (50%)</option>
                      <option value="Full Payment">Full Payment</option>
                      <option value="Milestone Payment">Milestone Payment</option>
                      <option value="Unpaid / Credit">Unpaid / Credit</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 4. Financial Breakdown */}
              <div className="space-y-3 border-t border-slate-200 pt-4">
                <div className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#0066FF]">
                  4. Financial Breakdown (BHD 3 Decimals)
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#0f172a] mb-1">
                      Total Project Cost (BHD) *
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      required
                      value={totalStr}
                      onChange={(e) => setTotalStr(e.target.value)}
                      onBlur={() => setTotalStr(numericTotal.toFixed(3))}
                      className="w-full rounded-xl border px-3 py-2 font-mono text-sm font-bold tabular-nums glass-input focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#0f172a] mb-1">
                      Remaining Balance (BHD) *
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      required
                      value={balanceStr}
                      onChange={(e) => setBalanceStr(e.target.value)}
                      onBlur={() => setBalanceStr(numericBalance.toFixed(3))}
                      className="w-full rounded-xl border px-3 py-2 font-mono text-sm font-bold tabular-nums glass-input focus:outline-none"
                    />
                  </div>
                </div>

                <div className="rounded-xl glass-panel-subtle px-3.5 py-2.5 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#475569]">Calculated Advance Received:</span>
                    <span className="font-mono font-bold text-emerald-700 tabular-nums">
                      {formatBHD(calculatedPaid)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#475569]">Automated Status:</span>
                    <span
                      className={`rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold ${
                        derivedStatus === 'PAID'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : derivedStatus === 'PARTIAL'
                            ? 'border-amber-300 bg-amber-50 text-amber-800'
                            : 'border-red-200 bg-red-50 text-red-700'
                      }`}
                    >
                      {derivedStatus}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0f172a] mb-1">
                    Internal Transaction Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Paid via BenefitPay reference #123456"
                    className="w-full rounded-xl border px-3 py-2 text-xs glass-input focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#0066FF] px-4 py-3 text-xs sm:text-sm font-bold text-white hover:bg-[#0052CC] shadow-lg shadow-blue-600/20 disabled:opacity-60 transition-colors cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-white" />
                <span>{submitting ? 'Issuing Official Receipt...' : 'ISSUE & FINALIZE RECEIPT NOW'}</span>
              </button>
            </form>

            {/* Right Live A4 Preview */}
            {viewMode === 'split' && (
              <div className="lg:col-span-7 space-y-2.5">
                <div className="flex items-center justify-between px-1 text-[11px] font-mono text-[#475569]">
                  <span>Live A4 Receipt Render (Bahrain Local Time)</span>
                  <span>Next Sequence: {nextSequenceNo}</span>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white text-[#0A192F] overflow-hidden shadow-xl">
                  <div className="bg-[#0A192F] px-5 py-4 text-white flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <img
                        src="/assets/aistudio/logo_e1b61aee.png"
                        alt="XeroTech"
                        className="h-9 w-9 object-contain"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <div className="text-sm font-extrabold">XeroTech Technologies</div>
                        <div className="font-mono text-[10px] text-[#00C2FF]">
                          {COMPANY_INFO.slogan} · CR {COMPANY_INFO.crNumber}
                        </div>
                      </div>
                    </div>
                    <div className="text-right font-mono text-[10px] text-slate-300">
                      <div>{COMPANY_INFO.primaryEmail}</div>
                      <div>{COMPANY_INFO.whatsappDisplay}</div>
                    </div>
                  </div>

                  <div className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-xl font-extrabold text-[#0A192F]">Payment Receipt</div>
                        <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-slate-400">
                          XEROTECH TECHNOLOGIES
                        </div>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] space-y-0.5 min-w-[190px]">
                        <div className="flex justify-between gap-3">
                          <span className="text-slate-500">Receipt No.:</span>
                          <span className="font-mono font-bold text-[#0066FF]">{nextSequenceNo}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-slate-500">Status:</span>
                          <span className="font-mono font-bold text-[#0A192F]">{derivedStatus}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-[11px]">
                      <div className="rounded-lg border border-slate-200 overflow-hidden">
                        <div className="bg-[#0066FF] px-3 py-1.5 font-bold text-white">
                          Client Details
                        </div>
                        <div className="p-2.5 space-y-1">
                          <div className="font-bold text-[#0A192F] truncate">
                            {clientName.trim() || 'Client Name Preview'}
                          </div>
                          <div className="font-mono text-slate-600">{clientPhone || '+973 3XXXXXXX'}</div>
                          <div className="text-slate-500 truncate">{clientEmail || 'client@domain.bh'}</div>
                        </div>
                      </div>
                      <div className="rounded-lg border border-slate-200 overflow-hidden">
                        <div className="bg-[#0A192F] px-3 py-1.5 font-bold text-white">
                          Project Details
                        </div>
                        <div className="p-2.5 space-y-1">
                          <div className="font-bold text-[#0A192F] truncate">{serviceName}</div>
                          <div className="text-slate-600 truncate">
                            {projectTitle.trim() || 'Commercial Engagement'}
                          </div>
                          <div className="text-slate-500">{paymentMethod} · {paymentTerms}</div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5">
                        <div className="text-[11px] font-semibold text-[#0066FF]">Total Project Cost</div>
                        <div className="mt-1 font-mono text-xl font-extrabold text-[#0A192F] tabular-nums">
                          {formatBHD(numericTotal)}
                        </div>
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-1.5">
                          <span className="font-semibold text-emerald-800">Advance Received</span>
                          <span className="font-mono font-bold text-emerald-700 tabular-nums">
                            {formatBHD(calculatedPaid)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between rounded-lg bg-[#0A192F] px-3 py-1.5 text-white">
                          <span className="text-slate-200 font-semibold">Remaining Balance</span>
                          <span className="font-mono font-bold tabular-nums">
                            {formatBHD(numericBalance)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3.5 py-2.5 text-[11px]">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#0066FF]" />
                        <span>Strict 3-decimal Bahraini Dinar (BHD) sequential audit record</span>
                      </div>
                      {stampOn && (
                        <img
                          src="/assets/aistudio/STAMP_d1ea7849.png"
                          alt="Official Stamp"
                          className="h-14 w-14 object-contain"
                          referrerPolicy="no-referrer"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
