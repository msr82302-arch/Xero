import axios from 'axios';
import {
  CheckCircle2,
  Download,
  FilePlus2,
  MessageSquare,
  Plus,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import {useEffect, useRef, useState, type FormEvent} from 'react';
import {services} from '@/src/data/services';
import {
  apiClient,
  buildTerminalDispatchWhatsAppUrl,
  downloadReceiptPdf,
} from '@/src/lib/api';
import type {
  BoqLineItem,
  ClientSummary,
  PaymentChannel,
  PaymentTerms,
  QuotationRecord,
  ReceiptRecord,
} from '@/src/types/xbms';
import {formatBHD, formatBHDNumber, roundBHD} from '@/src/types/xbms';

interface QuickBillerFormProps {
  clientName: string;
  setClientName: (v: string) => void;
  clientPhone: string;
  setClientPhone: (v: string) => void;
  clientEmail: string;
  setClientEmail: (v: string) => void;
  serviceName: string;
  setServiceName: (v: string) => void;
  projectTitle: string;
  setProjectTitle: (v: string) => void;
  paymentMethod: PaymentChannel;
  setPaymentMethod: (v: PaymentChannel) => void;
  paymentTerms: PaymentTerms;
  setPaymentTerms: (v: PaymentTerms) => void;
  items: BoqLineItem[];
  setItems: (items: BoqLineItem[]) => void;
  advanceStr: string;
  setAdvanceStr: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  totalBHD: number;
  advancePaidBHD: number;
  balanceBHD: number;
  derivedStatus: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID';
  onReceiptFinalized: (receipt: ReceiptRecord, nextSequenceNo: string) => void;
  onQuotationSubmitted: (quotation: QuotationRecord) => void;
  onResetForm: () => void;
}

export function QuickBillerForm({
  clientName,
  setClientName,
  clientPhone,
  setClientPhone,
  clientEmail,
  setClientEmail,
  serviceName,
  setServiceName,
  projectTitle,
  setProjectTitle,
  paymentMethod,
  setPaymentMethod,
  paymentTerms,
  setPaymentTerms,
  items,
  setItems,
  advanceStr,
  setAdvanceStr,
  notes,
  setNotes,
  totalBHD,
  advancePaidBHD,
  balanceBHD,
  derivedStatus,
  onReceiptFinalized,
  onQuotationSubmitted,
  onResetForm,
}: QuickBillerFormProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [clientResults, setClientResults] = useState<ClientSummary[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchingClients, setSearchingClients] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const [newClientModalOpen, setNewClientModalOpen] = useState(false);
  const [newCliName, setNewCliName] = useState('');
  const [newCliPhone, setNewCliPhone] = useState('+973 ');
  const [newCliEmail, setNewCliEmail] = useState('');
  const [newCliError, setNewCliError] = useState('');
  const [creatingClient, setCreatingClient] = useState(false);

  const [submittingAction, setSubmittingAction] = useState<'quote' | 'receipt' | null>(null);
  const [formError, setFormError] = useState('');
  const [quoteNotice, setQuoteNotice] = useState<QuotationRecord | null>(null);
  const [finalizedReceipt, setFinalizedReceipt] = useState<ReceiptRecord | null>(null);

  // Async client lookup
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setSearchingClients(true);
      try {
        const {data} = await apiClient.get<{clients: ClientSummary[]}>('/clients/', {
          params: searchTerm.trim() ? {search: searchTerm.trim()} : undefined,
        });
        if (active) setClientResults(data.clients);
      } catch {
        // Keep current results
      } finally {
        if (active) setSearchingClients(false);
      }
    }, 180);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchTerm]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const handleSelectClient = (client: ClientSummary) => {
    setClientName(client.name);
    setClientPhone(client.phone);
    setClientEmail(client.email);
    setSearchTerm(client.name);
    setSearchOpen(false);
    setFormError('');
  };

  const handleCreateNewClient = async (e: FormEvent) => {
    e.preventDefault();
    setNewCliError('');
    const digits = newCliPhone.replace(/\D/g, '');
    if (!newCliPhone.trim().startsWith('+973') || digits.length < 11) {
      setNewCliError('Phone must follow Bahrain +973 format (e.g. +973 3311 2244).');
      return;
    }

    setCreatingClient(true);
    try {
      const {data} = await apiClient.post<{client: ClientSummary}>('/clients/', {
        name: newCliName.trim(),
        phone: newCliPhone.trim(),
        email: newCliEmail.trim(),
      });
      setClientResults((prev) => [data.client, ...prev]);
      handleSelectClient(data.client);
      setNewClientModalOpen(false);
      setNewCliName('');
      setNewCliPhone('+973 ');
      setNewCliEmail('');
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setNewCliError(
          (err.response?.data as {error?: string} | undefined)?.error ||
            'Unable to register new client.',
        );
      } else {
        setNewCliError('Unexpected error while registering client.');
      }
    } finally {
      setCreatingClient(false);
    }
  };

  const handleServiceSelect = (nextServiceName: string) => {
    setServiceName(nextServiceName);
    const matched = services.find((s) => s.name === nextServiceName);
    if (matched && items.length === 1) {
      const nextUnit = matched.numericPriceBHD;
      const qty = Math.max(1, items[0].qty);
      const nextAmt = roundBHD((qty * Math.round(nextUnit * 1000)) / 1000);
      setItems([
        {
          ...items[0],
          description: matched.name,
          unitPriceBHD: nextUnit,
          amountBHD: nextAmt,
        },
      ]);
      if (paymentTerms === 'Full Payment') {
        setAdvanceStr(nextAmt.toFixed(3));
      } else if (paymentTerms === 'Partial Payment (50%)') {
        setAdvanceStr(roundBHD(nextAmt * 0.5).toFixed(3));
      }
    }
  };

  const handleUpdateBoqRow = (
    rowId: string,
    patch: Partial<Pick<BoqLineItem, 'description' | 'qty' | 'unitPriceBHD'>>,
  ) => {
    const next = items.map((row) => {
      if (row.id !== rowId) return row;
      const qty =
        patch.qty !== undefined ? Math.max(1, Math.round(patch.qty) || 1) : row.qty;
      const unitPriceBHD =
        patch.unitPriceBHD !== undefined
          ? Math.max(0, roundBHD(patch.unitPriceBHD))
          : row.unitPriceBHD;
      const amountBHD = roundBHD((qty * Math.round(unitPriceBHD * 1000)) / 1000);
      return {
        ...row,
        description: patch.description !== undefined ? patch.description : row.description,
        qty,
        unitPriceBHD,
        amountBHD,
      };
    });
    setItems(next);
  };

  const handleAddBoqRow = () => {
    setItems([
      ...items,
      {
        id: `boq-${Date.now()}-${items.length + 1}`,
        description: 'Additional Engineering Deliverable',
        qty: 1,
        unitPriceBHD: 50.0,
        amountBHD: 50.0,
      },
    ]);
  };

  const handleRemoveBoqRow = (rowId: string) => {
    if (items.length <= 1) return;
    setItems(items.filter((row) => row.id !== rowId));
  };

  const handleTermsChange = (nextTerms: PaymentTerms) => {
    setPaymentTerms(nextTerms);
    if (nextTerms === 'Full Payment') {
      setAdvanceStr(totalBHD.toFixed(3));
    } else if (nextTerms === 'Partial Payment (50%)') {
      setAdvanceStr(roundBHD(totalBHD * 0.5).toFixed(3));
    } else if (nextTerms === 'Unpaid / Credit') {
      setAdvanceStr('0.000');
    }
  };

  const validateCommonInputs = (): string | null => {
    if (clientName.trim().length < 2) {
      return 'Select an existing client or register a new client before proceeding.';
    }
    const digits = clientPhone.replace(/\D/g, '');
    if (!clientPhone.trim().startsWith('+973') || digits.length < 11) {
      return 'Valid Bahrain phone number in +973 XXXXXXXX format is required.';
    }
    if (items.length === 0 || items.some((r) => !r.description.trim())) {
      return 'Every Bill of Quantities (BoQ) line item requires a description.';
    }
    if (totalBHD <= 0) {
      return 'Total project cost must be greater than 0.000 BHD.';
    }
    return null;
  };

  const handleSubmitQuote = async () => {
    setFormError('');
    setQuoteNotice(null);
    const validationErr = validateCommonInputs();
    if (validationErr) {
      setFormError(validationErr);
      return;
    }

    setSubmittingAction('quote');
    try {
      const {data} = await apiClient.post<{quotation: QuotationRecord}>('/quotations/', {
        clientName: clientName.trim(),
        contactPerson: clientName.trim(),
        clientPhone: clientPhone.trim(),
        clientEmail: clientEmail.trim(),
        serviceName,
        projectTitle: projectTitle.trim() || serviceName,
        items,
        advancePaidBHD: advancePaidBHD,
        notes: notes.trim(),
      });
      setQuoteNotice(data.quotation);
      onQuotationSubmitted(data.quotation);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setFormError(
          (err.response?.data as {error?: string} | undefined)?.error ||
            'Unable to submit draft quotation.',
        );
      } else {
        setFormError('Unexpected error while submitting draft quotation.');
      }
    } finally {
      setSubmittingAction(null);
    }
  };

  const handleFinalizeReceipt = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setQuoteNotice(null);
    const validationErr = validateCommonInputs();
    if (validationErr) {
      setFormError(validationErr);
      return;
    }

    setSubmittingAction('receipt');
    try {
      const {data} = await apiClient.post<{receipt: ReceiptRecord; nextSequenceNo: string}>(
        '/receipts/finalize/',
        {
          clientName: clientName.trim(),
          clientPhone: clientPhone.trim(),
          clientEmail: clientEmail.trim(),
          serviceName,
          projectTitle: projectTitle.trim() || serviceName,
          paymentMethod,
          paymentTerms,
          totalBHD,
          advancePaidBHD,
          balanceBHD,
          notes: notes.trim(),
          items,
        },
      );
      setFinalizedReceipt(data.receipt);
      onReceiptFinalized(data.receipt, data.nextSequenceNo);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setFormError(
          (err.response?.data as {error?: string} | undefined)?.error ||
            'Unable to finalize official receipt.',
        );
      } else {
        setFormError('Unexpected error while finalizing receipt.');
      }
    } finally {
      setSubmittingAction(null);
    }
  };

  return (
    <div className="rounded-2xl glass-surface p-5 space-y-5">
      {formError && (
        <div className="rounded-xl border border-red-200 bg-red-50/90 px-3.5 py-2.5 text-xs font-medium text-red-700">
          {formError}
        </div>
      )}

      {quoteNotice && (
        <div className="rounded-xl border border-sky-200 bg-sky-50/90 px-4 py-3 text-xs text-[#0f172a] space-y-1">
          <div className="flex items-center justify-between gap-2 font-bold text-[#0066FF]">
            <span>Draft Quotation Submitted for Admin Approval</span>
            <span className="font-mono">{quoteNotice.referenceCode}</span>
          </div>
          <p className="text-[#334155]">
            Queued for {quoteNotice.clientName} ({formatBHD(quoteNotice.estimatedTotalBHD)}). Track
            approval status in Draft Quotations.
          </p>
        </div>
      )}

      {finalizedReceipt && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <div className="font-mono text-xs font-extrabold text-emerald-800">
                  FINALIZED: {finalizedReceipt.receiptNo}
                </div>
                <div className="text-xs text-emerald-700">
                  {finalizedReceipt.clientName} · {formatBHD(finalizedReceipt.paidBHD)} received
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setFinalizedReceipt(null);
                onResetForm();
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Next Client</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void downloadReceiptPdf(finalizedReceipt)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-[#0f172a] hover:bg-slate-50 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#0066FF]" />
              <span>Download A4 PDF</span>
            </button>
            <a
              href={buildTerminalDispatchWhatsAppUrl(finalizedReceipt)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0066FF] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#0052CC]"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp Dispatch (+973 3357 8768)</span>
            </a>
          </div>
        </div>
      )}

      <form onSubmit={handleFinalizeReceipt} className="space-y-5">
        {/* 1. CLIENT SELECTION */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#0066FF]">
              1. Client Information
            </span>
            <button
              type="button"
              onClick={() => {
                setNewCliError('');
                setNewClientModalOpen(true);
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-[#0066FF] hover:bg-[#0066FF] hover:text-white transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ New Client</span>
            </button>
          </div>

          {/* Async Client Search */}
          <div className="relative" ref={dropdownRef}>
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchTerm}
              onFocus={() => setSearchOpen(true)}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setSearchOpen(true);
              }}
              placeholder="Search saved commercial clients by name or +973..."
              className="w-full rounded-xl border pl-9 pr-3 py-2 text-xs glass-input focus:outline-none"
            />
            {searchOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-20 max-h-52 overflow-y-auto rounded-xl glass-modal divide-y divide-slate-200">
                {searchingClients ? (
                  <div className="px-3.5 py-2.5 text-xs text-[#64748b]">Searching clients...</div>
                ) : clientResults.length === 0 ? (
                  <div className="px-3.5 py-2.5 text-xs text-[#334155] flex items-center justify-between">
                    <span>No matching clients found.</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchOpen(false);
                        setNewCliName(searchTerm);
                        setNewClientModalOpen(true);
                      }}
                      className="font-bold text-[#0066FF] hover:underline cursor-pointer"
                    >
                      + Create &ldquo;{searchTerm || 'Client'}&rdquo;
                    </button>
                  </div>
                ) : (
                  clientResults.map((cli) => (
                    <button
                      key={cli.id}
                      type="button"
                      onClick={() => handleSelectClient(cli)}
                      className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#0f172a] truncate">{cli.name}</div>
                        <div className="font-mono text-[10px] text-[#64748b]">
                          {cli.phone} {cli.email ? `· ${cli.email}` : ''}
                        </div>
                      </div>
                      <span className="font-mono text-[10px] font-semibold text-amber-700 shrink-0 tabular-nums">
                        Bal: {formatBHDNumber(cli.outstandingBalanceBHD)}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0f172a] mb-1">
              Client Name / Organization *
            </label>
            <input
              type="text"
              required
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. Easy Travels SPC"
              className="w-full rounded-xl border px-3 py-2 text-xs sm:text-sm glass-input focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#0f172a] mb-1">
                Phone (+973) *
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
                Email (Optional)
              </label>
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="accounts@company.bh"
                className="w-full rounded-xl border px-3 py-2 text-xs sm:text-sm glass-input focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* 2. SERVICE SELECTION */}
        <div className="space-y-3 border-t border-slate-200 pt-4">
          <div className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#0066FF]">
            2. Service &amp; Scope Selection
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#0f172a] mb-1">
              Official Service Category (12 Offerings) *
            </label>
            <select
              value={serviceName}
              onChange={(e) => handleServiceSelect(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-xs sm:text-sm glass-input focus:outline-none"
            >
              {services.map((s) => (
                <option key={s.id} value={s.name}>
                  [{s.code}] {s.name} — {s.benchmarkPriceBHD} BHD
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
              placeholder="e.g. Corporate Visa Portal & BenefitPay Setup"
              className="w-full rounded-xl border px-3 py-2 text-xs sm:text-sm glass-input focus:outline-none"
            />
          </div>
        </div>

        {/* 3. ITEMIZED BILL OF QUANTITIES (BoQ) */}
        <div className="space-y-3 border-t border-slate-200 pt-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#0066FF]">
              3. Itemized Bill of Quantities (BoQ)
            </span>
            <button
              type="button"
              onClick={handleAddBoqRow}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-bold text-[#334155] hover:border-[#0066FF]/40 hover:text-[#0066FF] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add BoQ Item</span>
            </button>
          </div>

          <div className="space-y-2">
            {items.map((row, idx) => (
              <div
                key={row.id}
                className="rounded-xl glass-panel-subtle p-3 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] font-bold text-[#64748b]">
                    LINE #{idx + 1}
                  </span>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveBoqRow(row.id)}
                      aria-label={`Remove line ${idx + 1}`}
                      className="rounded p-1 text-slate-500 hover:bg-red-50 hover:text-red-700 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <input
                  type="text"
                  required
                  value={row.description}
                  onChange={(e) => handleUpdateBoqRow(row.id, {description: e.target.value})}
                  placeholder="Line item description"
                  className="w-full rounded-lg border px-2.5 py-1.5 text-xs glass-input focus:outline-none"
                />

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-[#64748b] mb-0.5">
                      Qty
                    </label>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={row.qty}
                      onChange={(e) =>
                        handleUpdateBoqRow(row.id, {
                          qty: Number.parseInt(e.target.value, 10) || 1,
                        })
                      }
                      className="w-full rounded-lg border px-2.5 py-1.5 font-mono text-xs tabular-nums glass-input focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[#64748b] mb-0.5">
                      Unit Price (BHD)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.001"
                      value={row.unitPriceBHD}
                      onChange={(e) =>
                        handleUpdateBoqRow(row.id, {
                          unitPriceBHD: Number.parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full rounded-lg border px-2.5 py-1.5 font-mono text-xs tabular-nums glass-input focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[#64748b] mb-0.5">
                      Amount (BHD)
                    </label>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-xs font-bold text-[#0f172a] text-right tabular-nums">
                      {formatBHDNumber(row.amountBHD)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. PAYMENT DETAILS & LIVE BHD CALCULATION */}
        <div className="space-y-3 border-t border-slate-200 pt-4">
          <div className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#0066FF]">
            4. Payment Details &amp; Live BHD Ledger
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#0f172a] mb-1">
                Payment Channel
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentChannel)}
                className="w-full rounded-xl border px-3 py-2 text-xs glass-input focus:outline-none"
              >
                <option value="BenefitPay">BenefitPay</option>
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
                className="w-full rounded-xl border px-3 py-2 text-xs glass-input focus:outline-none"
              >
                <option value="Partial Payment (50%)">Advance / Partial (50%)</option>
                <option value="Full Payment">Full Payment</option>
                <option value="Milestone Payment">Milestone Payment</option>
                <option value="Unpaid / Credit">Unpaid / Credit</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#0f172a] mb-1">
                Total Project Cost (Sum BoQ)
              </label>
              <div className="rounded-xl glass-panel-subtle px-3 py-2 font-mono text-sm font-extrabold text-[#0f172a] tabular-nums">
                {formatBHD(totalBHD)}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-[#0f172a]">
                  Advance Received (BHD) *
                </label>
                <div className="flex items-center gap-1 text-[10px] font-mono">
                  <button
                    type="button"
                    onClick={() => setAdvanceStr(roundBHD(totalBHD * 0.5).toFixed(3))}
                    className="rounded bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-[#334155] hover:text-[#0066FF] cursor-pointer"
                  >
                    50%
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdvanceStr(totalBHD.toFixed(3))}
                    className="rounded bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-[#334155] hover:text-[#0066FF] cursor-pointer"
                  >
                    100%
                  </button>
                </div>
              </div>
              <input
                type="number"
                step="0.001"
                min="0"
                max={totalBHD}
                required
                value={advanceStr}
                onChange={(e) => setAdvanceStr(e.target.value)}
                onBlur={() => setAdvanceStr(advancePaidBHD.toFixed(3))}
                className="w-full rounded-xl border px-3 py-2 font-mono text-sm font-bold tabular-nums glass-input focus:outline-none"
              />
            </div>
          </div>

          <div className="rounded-xl glass-panel-subtle px-4 py-3 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#475569]">Remaining Balance (Total − Advance):</span>
              <span className="font-mono font-extrabold text-[#0f172a] tabular-nums">
                {formatBHD(balanceBHD)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#475569]">Calculated Payment Status:</span>
              <span
                className={`rounded-md border px-2 py-0.5 font-mono text-[10px] font-extrabold ${
                  derivedStatus === 'PAID'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : derivedStatus === 'PARTIALLY_PAID'
                      ? 'border-amber-300 bg-amber-50 text-amber-800'
                      : 'border-red-200 bg-red-50 text-red-700'
                }`}
              >
                {derivedStatus.replace('_', ' ')}
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
              placeholder="e.g. BenefitPay ref #89214 or branch handover instructions"
              className="w-full rounded-xl border px-3 py-2 text-xs glass-input focus:outline-none"
            />
          </div>
        </div>

        {/* 5. ACTION BUTTONS */}
        <div className="space-y-2.5 pt-1">
          <button
            type="button"
            disabled={submittingAction !== null}
            onClick={() => void handleSubmitQuote()}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-xs font-bold text-[#0066FF] hover:bg-sky-100 disabled:opacity-50 transition-colors cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>
              {submittingAction === 'quote'
                ? 'Submitting Draft Quote...'
                : 'Submit Draft Quote for Approval'}
            </span>
          </button>

          <button
            type="submit"
            disabled={submittingAction !== null}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#0066FF] px-4 py-3 text-xs sm:text-sm font-bold text-white hover:bg-[#0052CC] shadow-lg shadow-blue-600/20 disabled:opacity-50 transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-white" />
            <span>
              {submittingAction === 'receipt'
                ? 'Finalizing Official Receipt...'
                : 'Issue & Finalize Receipt Now'}
            </span>
          </button>
        </div>
      </form>

      {/* Inline + New Client Modal */}
      {newClientModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-client-modal-title"
        >
          <div className="w-full max-w-md rounded-2xl glass-modal overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white/95 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <FilePlus2 className="w-4 h-4 text-[#0066FF]" />
                <h3 id="new-client-modal-title" className="text-sm font-extrabold text-[#0f172a]">
                  Register New Bahrain Client
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setNewClientModalOpen(false)}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-[#0f172a] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewClient} className="p-5 space-y-4 text-xs">
              {newCliError && (
                <div className="rounded-xl border border-red-200 bg-red-50/90 px-3 py-2 text-red-700 font-medium">
                  {newCliError}
                </div>
              )}

              <div>
                <label className="block font-semibold text-[#0f172a] mb-1">
                  Client / Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={newCliName}
                  onChange={(e) => setNewCliName(e.target.value)}
                  placeholder="e.g. Manama Medical Center W.L.L."
                  className="w-full rounded-xl border px-3 py-2 text-sm glass-input focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#0f172a] mb-1">
                  Bahrain Phone / WhatsApp (+973) *
                </label>
                <input
                  type="tel"
                  required
                  value={newCliPhone}
                  onChange={(e) => setNewCliPhone(e.target.value)}
                  placeholder="+973 3311 2244"
                  className="w-full rounded-xl border px-3 py-2 font-mono text-sm glass-input focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#0f172a] mb-1">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  value={newCliEmail}
                  onChange={(e) => setNewCliEmail(e.target.value)}
                  placeholder="finance@company.bh"
                  className="w-full rounded-xl border px-3 py-2 text-sm glass-input focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewClientModalOpen(false)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-[#334155] hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingClient}
                  className="rounded-xl bg-[#0066FF] px-4 py-2 font-semibold text-white hover:bg-[#0052CC] disabled:opacity-60 cursor-pointer"
                >
                  {creatingClient ? 'Saving Client...' : 'Save & Select Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
