import axios from 'axios';
import {CheckCircle2, FileCheck2, FilePlus2, X, XCircle} from 'lucide-react';
import {useCallback, useEffect, useMemo, useState, type FormEvent} from 'react';
import {CreateReceiptModal, type ReceiptPrefillData} from '@/src/components/admin/CreateReceiptModal';
import {AdminLayout} from '@/src/components/layout/AdminLayout';
import {apiClient} from '@/src/lib/api';
import type {QuotationRecord, QuotationStatus} from '@/src/types/xbms';
import {formatBHD} from '@/src/types/xbms';

type FilterTab = 'ALL' | QuotationStatus;

export function QuotationsPage() {
  const [quotations, setQuotations] = useState<QuotationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [statusTab, setStatusTab] = useState<FilterTab>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const [rejectTarget, setRejectTarget] = useState<QuotationRecord | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');

  const [receiptPrefill, setReceiptPrefill] = useState<ReceiptPrefillData | null>(null);
  const [createReceiptOpen, setCreateReceiptOpen] = useState(false);

  const loadQuotations = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const {data} = await apiClient.get<{quotations: QuotationRecord[]}>('/quotations/');
      setQuotations(data.quotations);
    } catch {
      setErrorMsg('Unable to load commercial quotation pipeline.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadQuotations();
  }, [loadQuotations]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return quotations.filter((item) => {
      if (statusTab !== 'ALL' && item.status !== statusTab) return false;
      if (!q) return true;
      return (
        item.referenceCode.toLowerCase().includes(q) ||
        (item.quotationNo || '').toLowerCase().includes(q) ||
        item.clientName.toLowerCase().includes(q) ||
        item.contactPerson.toLowerCase().includes(q) ||
        item.serviceNames.join(' ').toLowerCase().includes(q)
      );
    });
  }, [quotations, statusTab, searchQuery]);

  const handleApprove = async (item: QuotationRecord) => {
    setBusyId(item.id);
    setErrorMsg('');
    try {
      const {data} = await apiClient.post<{quotation: QuotationRecord}>(
        `/quotations/${item.id}/approve/`,
      );
      setQuotations((prev) => prev.map((q) => (q.id === item.id ? data.quotation : q)));
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setErrorMsg(
          (err.response?.data as {error?: string} | undefined)?.error ||
            'Failed to approve quotation.',
        );
      } else {
        setErrorMsg('Failed to approve quotation.');
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleRejectSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!rejectTarget) return;
    if (rejectReason.trim().length < 5) {
      setRejectError('Mandatory rejection feedback must be at least 5 characters.');
      return;
    }

    setBusyId(rejectTarget.id);
    setRejectError('');
    try {
      const {data} = await apiClient.post<{quotation: QuotationRecord}>(
        `/quotations/${rejectTarget.id}/reject/`,
        {reason: rejectReason.trim()},
      );
      setQuotations((prev) =>
        prev.map((q) => (q.id === rejectTarget.id ? data.quotation : q)),
      );
      setRejectTarget(null);
      setRejectReason('');
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setRejectError(
          (err.response?.data as {error?: string} | undefined)?.error ||
            'Failed to reject quotation.',
        );
      } else {
        setRejectError('Failed to reject quotation.');
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleConvertToReceipt = (item: QuotationRecord) => {
    setReceiptPrefill({
      clientName: item.clientName,
      clientPhone: item.clientPhone,
      clientEmail: item.clientEmail,
      serviceName: item.serviceNames[0],
      projectTitle: `${item.quotationNo || item.referenceCode} — ${item.serviceNames.join(', ')}`,
      totalBHD: item.estimatedTotalBHD,
    });
    setCreateReceiptOpen(true);
  };

  return (
    <AdminLayout
      title="Commercial Quotation Approval Pipeline"
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      onOpenNewReceipt={() => {
        setReceiptPrefill(null);
        setCreateReceiptOpen(true);
      }}
    >
      <div className="space-y-6">
        {/* Header Card */}
        <div className="rounded-2xl glass-surface px-6 py-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#0066FF]">
              Commercial Governance
            </div>
            <h1 className="mt-1 text-xl sm:text-2xl font-extrabold text-[#0f172a]">
              Quotation Approval Pipeline ({quotations.length})
            </h1>
            <p className="mt-0.5 text-xs text-[#334155]">
              Review staff drafts and incoming public estimator leads (XT-LEAD-2026-###). Approving
              allocates a gapless sequential XT-QOT-YYYY-MM-### quotation number.
            </p>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="rounded-2xl glass-surface px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                {key: 'ALL', label: 'All Submissions'},
                {key: 'PENDING_APPROVAL', label: 'Pending Approval'},
                {key: 'DRAFT', label: 'Staff Drafts'},
                {key: 'APPROVED', label: 'Approved'},
                {key: 'REJECTED', label: 'Rejected'},
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusTab(tab.key)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                  statusTab === tab.key
                    ? 'bg-[#0066FF] text-white'
                    : 'bg-slate-100 text-[#334155] hover:bg-slate-200/80 hover:text-[#0f172a]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by XT-LEAD, XT-QOT, client..."
            className="w-full sm:w-64 rounded-xl border px-3 py-1.5 text-xs glass-input focus:outline-none"
          />
        </div>

        {errorMsg && (
          <div className="rounded-xl border border-red-200 bg-red-50/90 px-4 py-3 text-xs font-medium text-red-700">
            {errorMsg}
          </div>
        )}

        {/* Quotations List */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({length: 3}).map((_, idx) => (
              <div
                key={idx}
                className="h-32 rounded-2xl glass-surface animate-pulse"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl glass-surface p-10 text-center space-y-2">
            <FileCheck2 className="w-8 h-8 text-slate-400 mx-auto" />
            <div className="text-sm font-bold text-[#0f172a]">No quotations match this filter</div>
            <p className="text-xs text-[#64748b]">
              Incoming leads from the public Project Estimator appear here automatically.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl glass-surface p-5 transition-colors hover:border-[#0066FF]/40"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-extrabold text-[#0066FF]">
                        {item.quotationNo || item.referenceCode}
                      </span>
                      {item.quotationNo && (
                        <span className="font-mono text-[11px] text-[#64748b]">
                          Lead: {item.referenceCode}
                        </span>
                      )}
                      <span
                        className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-bold ${
                          item.status === 'APPROVED'
                            ? 'bg-emerald-50/90 text-emerald-700 border border-emerald-200'
                            : item.status === 'REJECTED'
                              ? 'bg-red-50/90 text-red-700 border border-red-200'
                              : item.status === 'PENDING_APPROVAL'
                                ? 'bg-amber-50/90 text-amber-800 border border-amber-300'
                                : 'bg-slate-100 text-[#334155] border border-slate-200'
                        }`}
                      >
                        {item.status.replace('_', ' ')}
                      </span>
                      <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-[#334155]">
                        {item.source === 'PUBLIC_ESTIMATOR' ? 'Public Lead' : 'Staff Draft'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                      <h2 className="text-base font-extrabold text-[#0f172a]">{item.clientName}</h2>
                      <span className="text-xs text-[#334155]">
                        Contact: {item.contactPerson} ·{' '}
                        <span className="font-mono">{item.clientPhone}</span>
                      </span>
                      {item.clientEmail && (
                        <span className="text-xs text-[#64748b]">{item.clientEmail}</span>
                      )}
                    </div>

                    <div className="text-xs text-[#334155]">
                      <span className="font-semibold text-[#0f172a]">Scope:</span>{' '}
                      {item.serviceNames.join(' · ')}
                    </div>

                    {item.notes && (
                      <p className="text-xs text-[#334155] glass-panel-subtle rounded-xl px-3 py-2">
                        {item.notes}
                      </p>
                    )}

                    {item.status === 'REJECTED' && item.rejectionReason && (
                      <div className="rounded-xl border border-red-200 bg-red-50/90 px-3 py-2 text-xs text-red-700">
                        <strong>Rejection Feedback:</strong> {item.rejectionReason}
                      </div>
                    )}
                  </div>

                  {/* Right Valuation & Actions */}
                  <div className="flex flex-col items-end justify-between gap-3 shrink-0">
                    <div className="text-right">
                      <div className="font-mono text-[10px] uppercase tracking-wider text-[#64748b]">
                        Quotation Value
                      </div>
                      <div className="font-mono text-xl font-extrabold text-[#0f172a] tabular-nums">
                        {formatBHD(item.estimatedTotalBHD)}
                      </div>
                      <div className="font-mono text-[11px] font-semibold text-[#0066FF] tabular-nums">
                        50% Kickoff: {formatBHD(item.advanceMilestoneBHD)}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {item.status !== 'APPROVED' && (
                        <>
                          <button
                            type="button"
                            disabled={busyId === item.id}
                            onClick={() => void handleApprove(item)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>

                          {item.status !== 'REJECTED' && (
                            <button
                              type="button"
                              disabled={busyId === item.id}
                              onClick={() => {
                                setRejectTarget(item);
                                setRejectReason('');
                                setRejectError('');
                              }}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          )}
                        </>
                      )}

                      {item.status === 'APPROVED' && (
                        <button
                          type="button"
                          onClick={() => handleConvertToReceipt(item)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-[#0066FF] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#0052CC] shadow-lg shadow-blue-600/20 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <FilePlus2 className="w-3.5 h-3.5" />
                          <span>Issue Receipt</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reject Quotation Modal */}
      {rejectTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reject-qot-title"
        >
          <div className="w-full max-w-md rounded-2xl glass-modal overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h3 id="reject-qot-title" className="text-sm font-extrabold text-[#0f172a]">
                Reject Quotation {rejectTarget.referenceCode}
              </h3>
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-[#0f172a] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleRejectSubmit} className="p-5 space-y-4">
              <p className="text-xs text-[#334155]">
                Provide mandatory commercial rejection feedback (minimum 5 characters) for{' '}
                <strong className="text-[#0f172a]">{rejectTarget.clientName}</strong>.
              </p>

              {rejectError && (
                <div className="rounded-xl border border-red-200 bg-red-50/90 px-3 py-2 text-xs text-red-700">
                  {rejectError}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="reject-reason" className="text-xs font-semibold text-[#0f172a]">
                    Rejection Feedback *
                  </label>
                  <span className="font-mono text-[11px] text-[#64748b]">
                    {rejectReason.trim().length}/5 min chars
                  </span>
                </div>
                <textarea
                  id="reject-reason"
                  rows={3}
                  required
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Discount below margin policy or scope clarification required."
                  className="w-full rounded-xl border px-3 py-2 text-xs sm:text-sm glass-input focus:border-red-400 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejectTarget(null)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-[#334155] hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busyId === rejectTarget.id || rejectReason.trim().length < 5}
                  className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 cursor-pointer"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <CreateReceiptModal
        isOpen={createReceiptOpen}
        onClose={() => setCreateReceiptOpen(false)}
        prefill={receiptPrefill}
        onCreated={() => void loadQuotations()}
      />
    </AdminLayout>
  );
}
