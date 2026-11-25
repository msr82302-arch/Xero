import {Download, MessageSquare, X} from 'lucide-react';
import {useEffect, useState} from 'react';
import {buildReceiptWhatsAppUrl, downloadReceiptPdf} from '@/src/lib/api';
import {COMPANY_INFO} from '@/src/data/services';
import type {CompanySettings, ReceiptRecord} from '@/src/types/xbms';
import {formatBHD} from '@/src/types/xbms';

interface ReceiptPreviewModalProps {
  receipt: ReceiptRecord | null;
  settings?: CompanySettings | null;
  onClose: () => void;
}

export function ReceiptPreviewModal({receipt, settings, onClose}: ReceiptPreviewModalProps) {
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!receipt) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [receipt, onClose]);

  if (!receipt) return null;

  const isCancelled = receipt.status === 'CANCELLED';
  const showStamp = settings ? settings.renderOfficialStamp : true;
  const termsList = (
    settings?.defaultTerms ||
    [
      'The receipt confirms the successful receipt of payment for the above-mentioned services.',
      'The remaining balance (if any) is payable upon completion of the project or as per agreement.',
      'This receipt is issued for the amount received and does not substitute for a final invoice.',
      'In case of any dispute, please contact us within 7 days of this receipt.',
    ].join('\n')
  )
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 6);

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      await downloadReceiptPdf(receipt);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-sm p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="receipt-preview-title"
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl glass-modal">
        {/* Modal Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-5 py-3.5">
          <div>
            <div className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#0066FF]">
              Official A4 Receipt Document
            </div>
            <h2 id="receipt-preview-title" className="text-sm sm:text-base font-extrabold text-[#0f172a]">
              {receipt.receiptNo} · {receipt.clientName}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-[#334155] hover:bg-slate-50 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#0066FF]" />
              <span>{downloading ? 'Generating PDF...' : 'Download PDF'}</span>
            </button>

            <a
              href={buildReceiptWhatsAppUrl(receipt)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0066FF] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#0052CC] transition-colors whitespace-nowrap shrink-0"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </a>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close Receipt Preview"
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-[#0f172a] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable A4 Document Preview */}
        <div className="flex-1 overflow-y-auto bg-slate-100/75 p-4 sm:p-6">
          <div className="relative mx-auto max-w-[680px] overflow-hidden rounded-xl border border-slate-200 bg-white text-[#0A192F] shadow-xl">
            {/* CANCELLED Watermark Overlay */}
            {isCancelled && (
              <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
                <div className="-rotate-28 rounded-xl border-4 border-red-600/40 bg-red-50/20 px-8 py-3 font-mono text-4xl sm:text-5xl font-black tracking-[0.22em] text-red-600/45 select-none">
                  CANCELLED
                </div>
              </div>
            )}

            {/* Navy Corporate Header */}
            <div className="bg-[#0A192F] px-6 py-5 text-white flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <img
                  src="/assets/aistudio/logo_e1b61aee.png"
                  alt="XeroTech Emblem"
                  className="h-11 w-11 object-contain"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <div className="text-base font-extrabold tracking-tight">
                    {(settings?.companyName || COMPANY_INFO.brandName).toUpperCase()}
                  </div>
                  <div className="font-mono text-[10px] text-[#00C2FF]">
                    CR NO. {settings?.crNumber || COMPANY_INFO.crNumber} ·{' '}
                    {settings?.slogan || COMPANY_INFO.slogan}
                  </div>
                </div>
              </div>
              <div className="text-right font-mono text-[10px] text-slate-300 space-y-0.5">
                <div>{settings?.primaryEmail || COMPANY_INFO.primaryEmail}</div>
                <div>{settings?.primaryPhone || COMPANY_INFO.phones[0]}</div>
                <div>{settings?.secondaryPhone || COMPANY_INFO.phones[1]}</div>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5 relative z-10">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-extrabold text-[#0A192F]">Payment Receipt</h3>
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400">
                    {(settings?.companyName || COMPANY_INFO.brandName).toUpperCase()}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs space-y-1 min-w-[220px]">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-500">Receipt No.:</span>
                    <span className="font-mono font-bold text-[#0066FF]">{receipt.receiptNo}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-500">Date:</span>
                    <span className="font-semibold text-[#0A192F]">{receipt.dateDisplay}</span>
                  </div>
                </div>
              </div>

              {/* Client & Project Panels */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <div className="bg-[#0066FF] px-3.5 py-2 font-bold text-white">
                    Client Details
                  </div>
                  <div className="p-3.5 space-y-1.5">
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Client Name:</span>
                      <span className="font-bold text-[#0A192F] text-right">{receipt.clientName}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Contact No.:</span>
                      <span className="font-mono text-[#0A192F]">{receipt.clientPhone}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Email:</span>
                      <span className="text-slate-700 truncate">{receipt.clientEmail || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <div className="bg-[#0A192F] px-3.5 py-2 font-bold text-white">
                    Project Details
                  </div>
                  <div className="p-3.5 space-y-1.5">
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Service:</span>
                      <span className="font-bold text-[#0A192F] text-right">{receipt.serviceName}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Channel:</span>
                      <span className="text-[#0A192F]">{receipt.paymentMethod}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Terms:</span>
                      <span className="text-slate-700">{receipt.paymentTerms}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Itemized Table */}
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#0A192F] text-white">
                      <th className="py-2.5 px-3 font-semibold">#</th>
                      <th className="py-2.5 px-3 font-semibold">Description</th>
                      <th className="py-2.5 px-3 font-semibold text-center">Qty</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Unit Price (BHD)</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Amount (BHD)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-slate-100">
                      <td className="py-3 px-3 font-mono text-slate-500">1</td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-[#0A192F]">{receipt.serviceName}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{receipt.projectTitle}</div>
                      </td>
                      <td className="py-3 px-3 text-center font-mono">1</td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums">
                        {receipt.totalBHD.toFixed(3)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold tabular-nums">
                        {receipt.totalBHD.toFixed(3)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Financial Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4">
                  <div className="text-[11px] font-semibold text-[#0066FF]">Total Project Cost</div>
                  <div className="mt-1 font-mono text-2xl font-extrabold text-[#0A192F] tabular-nums">
                    {formatBHD(receipt.totalBHD)}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/70 px-3.5 py-2 text-xs">
                    <span className="font-semibold text-emerald-800">Advance Received</span>
                    <span className="font-mono font-extrabold text-emerald-700 tabular-nums">
                      {formatBHD(receipt.paidBHD)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-[#0A192F] px-3.5 py-2 text-xs text-white">
                    <span className="font-semibold text-slate-200">Remaining Balance</span>
                    <span className="font-mono font-extrabold tabular-nums">
                      {formatBHD(receipt.balanceBHD)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Void Details Box */}
              {isCancelled && (
                <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-xs text-red-800 space-y-1">
                  <div className="font-bold uppercase tracking-wider text-red-700">
                    Receipt Voided · Audit Stamp
                  </div>
                  <div>
                    Cancelled by <span className="font-mono font-semibold">{receipt.cancelledBy}</span>{' '}
                    on <span className="font-mono">{receipt.cancelledAt}</span>
                  </div>
                  <div>Justification: {receipt.cancellationReason}</div>
                </div>
              )}

              {/* Terms & Stamp */}
              <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 rounded-xl border border-slate-200 p-4">
                <div className="space-y-1.5">
                  <div className="inline-block rounded-md bg-[#0066FF] px-2.5 py-1 text-[11px] font-bold text-white">
                    Terms &amp; Conditions
                  </div>
                  <ol className="list-decimal pl-4 space-y-0.5 text-[11px] text-slate-500">
                    {termsList.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ol>
                </div>
                {showStamp && (
                  <img
                    src="/assets/aistudio/STAMP_d1ea7849.png"
                    alt="XeroTech Official Stamp"
                    className="h-20 w-20 object-contain shrink-0 self-end"
                    referrerPolicy="no-referrer"
                  />
                )}
              </div>

              <div className="border-t border-slate-100 pt-3 text-center text-[11px] text-slate-500">
                {settings?.address || COMPANY_INFO.address} · {settings?.website || COMPANY_INFO.website}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
