import {ArrowRight, CheckCircle2, Clock, FileCheck2, X, XCircle} from 'lucide-react';
import {useEffect} from 'react';
import type {QuotationRecord} from '@/src/types/xbms';
import {formatBHD} from '@/src/types/xbms';

interface DraftQuotationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotations: QuotationRecord[];
  loading: boolean;
  onSelectApprovedQuotation: (quotation: QuotationRecord) => void;
}

export function DraftQuotationsModal({
  isOpen,
  onClose,
  quotations,
  loading,
  onSelectApprovedQuotation,
}: DraftQuotationsModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="draft-quotations-title"
    >
      <div className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 bg-[#0A192F] px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-white/10 p-2">
              <FileCheck2 className="w-5 h-5 text-[#00C2FF]" />
            </div>
            <div>
              <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#00C2FF]">
                Staff Operational Queue
              </div>
              <h2 id="draft-quotations-title" className="text-base font-extrabold">
                Draft Quotations &amp; Approval Status ({quotations.length})
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Draft Quotations Queue"
            className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 bg-[#F8FAFC] space-y-3">
          {loading ? (
            <div className="space-y-3">
              {Array.from({length: 3}).map((_, idx) => (
                <div
                  key={idx}
                  className="h-24 rounded-xl border border-slate-200 bg-white animate-pulse"
                />
              ))}
            </div>
          ) : quotations.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center space-y-2">
              <FileCheck2 className="w-8 h-8 text-slate-300 mx-auto" />
              <div className="text-sm font-bold text-[#0A192F]">No submitted quotations yet</div>
              <p className="text-xs text-slate-500">
                Use &ldquo;Submit Draft Quote for Approval&rdquo; in the billing terminal to queue a
                proposal for executive review.
              </p>
            </div>
          ) : (
            quotations.map((qot) => {
              const isApproved = qot.status === 'APPROVED';
              const isRejected = qot.status === 'REJECTED';
              return (
                <div
                  key={qot.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-extrabold text-[#0066FF]">
                        {qot.quotationNo || qot.referenceCode}
                      </span>
                      {qot.quotationNo && (
                        <span className="font-mono text-[11px] text-slate-400">
                          Ref: {qot.referenceCode}
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold ${
                          isApproved
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : isRejected
                              ? 'border-red-200 bg-red-50 text-red-700'
                              : qot.status === 'PENDING_APPROVAL'
                                ? 'border-amber-200 bg-amber-50 text-amber-700'
                                : 'border-slate-200 bg-slate-100 text-slate-700'
                        }`}
                      >
                        {isApproved ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : isRejected ? (
                          <XCircle className="w-3 h-3" />
                        ) : (
                          <Clock className="w-3 h-3" />
                        )}
                        <span>{qot.status.replace('_', ' ')}</span>
                      </span>
                    </div>

                    <div className="text-sm font-bold text-[#0A192F]">
                      {qot.clientName}{' '}
                      <span className="font-mono text-xs font-normal text-slate-500">
                        · {qot.clientPhone}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 truncate">
                      {qot.serviceNames.join(' · ')}
                    </div>

                    {isRejected && qot.rejectionReason && (
                      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] text-red-700">
                        <strong>Admin Feedback:</strong> {qot.rejectionReason}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="text-right">
                      <div className="font-mono text-base font-extrabold text-[#0A192F] tabular-nums">
                        {formatBHD(qot.estimatedTotalBHD)}
                      </div>
                      <div className="font-mono text-[10px] text-slate-500 tabular-nums">
                        Advance Milestone: {formatBHD(qot.advanceMilestoneBHD)}
                      </div>
                    </div>

                    {isApproved && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectApprovedQuotation(qot);
                          onClose();
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#0066FF] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#0052CC] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <span>Load into Receipt Biller</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
