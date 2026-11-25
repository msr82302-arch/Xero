import {CheckCircle2, Lock, Server, X} from 'lucide-react';
import {useEffect} from 'react';
import {Link} from 'react-router-dom';
import {COMPANY_INFO, XBMS_BASELINE_RECEIPTS} from '@/src/data/services';

interface XbmsPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenEstimator: () => void;
}

export function XbmsPortalModal({isOpen, onClose, onOpenEstimator}: XbmsPortalModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="xbms-portal-title"
    >
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-[#0A192F] px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <img
              src="/assets/aistudio/logo_e1b61aee.png"
              alt="XeroTech Emblem"
              className="h-8 w-8 object-contain"
              referrerPolicy="no-referrer"
            />
            <div>
              <div className="font-mono text-[11px] uppercase tracking-wider text-[#00C2FF]">
                XeroTech Business Management System (XBMS) · CR {COMPANY_INFO.crNumber}
              </div>
              <h2 id="xbms-portal-title" className="text-base sm:text-lg font-bold">
                Verified Financial Baseline &amp; Two-Role Ledger Architecture
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close XBMS Portal Preview"
            className="rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Verified BHD Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="font-mono text-xs uppercase tracking-wider text-slate-500">
                Gross Invoiced
              </div>
              <div className="mt-1 font-mono text-2xl font-extrabold text-[#0A192F] tabular-nums">
                1,000.000 BHD
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
              <div className="font-mono text-xs uppercase tracking-wider text-emerald-700">
                Collected Capital
              </div>
              <div className="mt-1 font-mono text-2xl font-extrabold text-emerald-700 tabular-nums">
                620.000 BHD
              </div>
            </div>

            <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4">
              <div className="font-mono text-xs uppercase tracking-wider text-[#0066FF]">
                Pending Receivables
              </div>
              <div className="mt-1 font-mono text-2xl font-extrabold text-[#0066FF] tabular-nums">
                380.000 BHD
              </div>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="rounded-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between bg-slate-50 px-4 py-3 border-b border-slate-200">
              <span className="font-mono text-xs font-semibold text-[#0A192F]">
                Verified XBMS Receipt Registry (Nov 2026 Baseline)
              </span>
              <span className="font-mono text-[11px] text-slate-500">
                Strict 3-Decimal BHD
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-white text-slate-500 font-mono">
                    <th className="py-2.5 px-4">Receipt No.</th>
                    <th className="py-2.5 px-4">Client / Engagement</th>
                    <th className="py-2.5 px-4 text-right">Total (BHD)</th>
                    <th className="py-2.5 px-4 text-right">Paid (BHD)</th>
                    <th className="py-2.5 px-4 text-right">Balance (BHD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {XBMS_BASELINE_RECEIPTS.map((rec) => (
                    <tr key={rec.receiptNo} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-mono font-semibold text-[#0066FF] whitespace-nowrap">
                        {rec.receiptNo}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#0A192F]">{rec.client}</div>
                        <div className="text-slate-500">{rec.service}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-[#0A192F]">
                        {rec.totalBHD}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-700 font-semibold">
                        {rec.paidBHD}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                        {rec.balanceBHD}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Two-Role & API Specs Note */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="rounded-2xl border border-slate-200 p-4 space-y-2">
              <div className="flex items-center gap-2 font-bold text-[#0A192F]">
                <Lock className="w-4 h-4 text-[#0066FF]" />
                <span>Two-Role Governance</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Separate authenticated workspaces for <strong className="text-[#0A192F]">Admin / Staff</strong>{' '}
                (invoicing, receipt generation, CR stamp controls) and{' '}
                <strong className="text-[#0A192F]">Client Portal</strong> (milestone approval, PDF receipt download).
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4 space-y-2">
              <div className="flex items-center gap-2 font-bold text-[#0A192F]">
                <Server className="w-4 h-4 text-[#0066FF]" />
                <span>Django REST API Contract</span>
              </div>
              <p className="text-slate-600 leading-relaxed font-mono text-[11px]">
                GET /api/v1/services/ · POST /api/v1/leads/ · GET /api/v1/docs/ (Swagger/Redoc)
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Audited BHD financial precision enforced across all XeroTech systems.</span>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href="/XeroTech_Phase1_Technical_Report.pdf"
              download="XeroTech_Phase1_Technical_Report.pdf"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-[#0A192F] hover:border-blue-300 hover:text-[#0066FF] transition-colors"
            >
              Download Phase 1 Report (PDF)
            </a>
            <Link
              to="/terminal"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-[#0A192F] hover:border-blue-300 hover:text-[#0066FF] transition-colors"
            >
              Staff Terminal
            </Link>
            <Link
              to="/admin/dashboard"
              onClick={onClose}
              className="rounded-xl bg-[#0A192F] px-4 py-2 text-xs font-semibold text-white hover:bg-[#13294B] transition-colors"
            >
              Open Admin Console
            </Link>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenEstimator();
              }}
              className="rounded-xl bg-[#0066FF] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0052CC] transition-colors cursor-pointer"
            >
              Start New Project Estimate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
