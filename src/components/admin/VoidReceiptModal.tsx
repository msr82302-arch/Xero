import axios from 'axios';
import {AlertTriangle, X} from 'lucide-react';
import {useEffect, useState, type FormEvent} from 'react';
import {apiClient} from '@/src/lib/api';
import type {ReceiptRecord} from '@/src/types/xbms';
import {formatBHD} from '@/src/types/xbms';

interface VoidReceiptModalProps {
  receipt: ReceiptRecord | null;
  onClose: () => void;
  onVoided: (updated: ReceiptRecord) => void;
}

export function VoidReceiptModal({receipt, onClose, onVoided}: VoidReceiptModalProps) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!receipt) return;
    setReason('');
    setErrorMsg('');
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [receipt, onClose]);

  if (!receipt) return null;

  const trimmedLen = reason.trim().length;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (trimmedLen < 15) {
      setErrorMsg('Mandatory justification must be at least 15 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const {data} = await apiClient.post<{receipt: ReceiptRecord}>(
        `/receipts/${receipt.id}/cancel/`,
        {reason: reason.trim()},
      );
      onVoided(data.receipt);
      onClose();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setErrorMsg(
          (err.response?.data as {error?: string} | undefined)?.error ||
            'Unable to void receipt.',
        );
      } else {
        setErrorMsg('Unexpected error while voiding receipt.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="void-receipt-title"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl glass-modal">
        <div className="flex items-center justify-between border-b border-red-200 bg-red-50/90 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-red-100 border border-red-200 p-2 text-red-700">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-red-700">
                Forensic Ledger Reversal
              </div>
              <h2 id="void-receipt-title" className="text-sm sm:text-base font-extrabold text-[#0f172a]">
                Cancel / Void Receipt {receipt.receiptNo}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Void Modal"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-red-100/60 hover:text-[#0f172a] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="rounded-xl glass-panel-subtle p-3.5 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-[#64748b]">Client Account:</span>
              <span className="font-bold text-[#0f172a]">{receipt.clientName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748b]">Total Invoiced Reversal:</span>
              <span className="font-mono font-bold text-[#0f172a] tabular-nums">
                {formatBHD(receipt.totalBHD)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748b]">Collections / Receivables Reversal:</span>
              <span className="font-mono font-semibold text-red-700 tabular-nums">
                -{formatBHD(receipt.paidBHD)} / -{formatBHD(receipt.balanceBHD)}
              </span>
            </div>
          </div>

          <p className="text-xs text-[#334155] leading-relaxed">
            Voiding retains this sequential receipt in the permanent audit trail, stamps{' '}
            <span className="font-mono font-semibold text-[#0f172a]">cancelled_by</span> and{' '}
            <span className="font-mono font-semibold text-[#0f172a]">cancelled_at</span>, applies a{' '}
            <strong className="text-red-700">CANCELLED</strong> watermark to PDF exports, and
            automatically reverses client CRM receivables rollups.
          </p>

          {errorMsg && (
            <div className="rounded-xl border border-red-200 bg-red-50/90 px-3.5 py-2.5 text-xs font-medium text-red-700">
              {errorMsg}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="void-reason" className="text-xs font-semibold text-[#0f172a]">
                Mandatory Voiding Justification *
              </label>
              <span
                className={`font-mono text-[11px] font-semibold tabular-nums ${
                  trimmedLen >= 15 ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {trimmedLen}/15 min chars
              </span>
            </div>
            <textarea
              id="void-reason"
              rows={3}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this receipt is being voided (e.g., Duplicate entry or client scope revision before clearing)..."
              className="w-full rounded-xl border px-3.5 py-2.5 text-xs sm:text-sm glass-input focus:border-red-400 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-[#334155] hover:bg-slate-50 cursor-pointer"
            >
              Keep Active
            </button>
            <button
              type="submit"
              disabled={submitting || trimmedLen < 15}
              className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {submitting ? 'Voiding Receipt...' : 'Confirm & Void Receipt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
