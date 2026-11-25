import {Ban, Download, Eye, FileText, MessageSquare, Plus, Search} from 'lucide-react';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {CreateReceiptModal} from '@/src/components/admin/CreateReceiptModal';
import {ReceiptPreviewModal} from '@/src/components/admin/ReceiptPreviewModal';
import {VoidReceiptModal} from '@/src/components/admin/VoidReceiptModal';
import {AdminLayout} from '@/src/components/layout/AdminLayout';
import {apiClient, buildReceiptWhatsAppUrl, downloadReceiptPdf} from '@/src/lib/api';
import type {CompanySettings, PaymentChannel, ReceiptRecord, ReceiptStatus} from '@/src/types/xbms';
import {formatBHDNumber} from '@/src/types/xbms';

type StatusFilter = 'ALL' | ReceiptStatus;
type MethodFilter = 'ALL' | PaymentChannel;
type SortOrder = 'newest' | 'oldest' | 'highest';

export function ReceiptsLedgerPage() {
  const [receipts, setReceipts] = useState<ReceiptRecord[]>([]);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [nextSequence, setNextSequence] = useState(5);
  const [receiptPrefix, setReceiptPrefix] = useState('XT-REC');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [methodFilter, setMethodFilter] = useState<MethodFilter>('ALL');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');

  const [previewReceipt, setPreviewReceipt] = useState<ReceiptRecord | null>(null);
  const [voidTarget, setVoidTarget] = useState<ReceiptRecord | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const loadLedger = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [recRes, setRes] = await Promise.all([
        apiClient.get<{
          receipts: ReceiptRecord[];
          nextSequence: number;
          receiptPrefix: string;
        }>('/receipts/'),
        apiClient.get<{settings: CompanySettings}>('/settings/'),
      ]);
      setReceipts(recRes.data.receipts);
      setNextSequence(recRes.data.nextSequence);
      setReceiptPrefix(recRes.data.receiptPrefix);
      setSettings(setRes.data.settings);
    } catch {
      setErrorMsg('Unable to load master receipts ledger.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLedger();
  }, [loadLedger]);

  const filteredReceipts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = receipts.filter((rec) => {
      if (statusFilter !== 'ALL' && rec.status !== statusFilter) return false;
      if (methodFilter !== 'ALL' && rec.paymentMethod !== methodFilter) return false;
      if (!q) return true;
      return (
        rec.receiptNo.toLowerCase().includes(q) ||
        rec.clientName.toLowerCase().includes(q) ||
        rec.clientPhone.toLowerCase().includes(q) ||
        rec.serviceName.toLowerCase().includes(q)
      );
    });

    if (sortOrder === 'oldest') {
      return [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    }
    if (sortOrder === 'highest') {
      return [...list].sort((a, b) => b.totalBHD - a.totalBHD);
    }
    return list;
  }, [receipts, searchQuery, statusFilter, methodFilter, sortOrder]);

  const handleExportCsv = () => {
    const header = [
      'Receipt No',
      'Date',
      'Client Name',
      'Phone',
      'Service',
      'Method',
      'Total (BHD)',
      'Received (BHD)',
      'Balance (BHD)',
      'Status',
    ];
    const rows = filteredReceipts.map((r) => [
      `"${r.receiptNo}"`,
      `"${r.dateDisplay}"`,
      `"${r.clientName.replace(/"/g, '""')}"`,
      `"${r.clientPhone}"`,
      `"${r.serviceName.replace(/"/g, '""')}"`,
      `"${r.paymentMethod}"`,
      r.totalBHD.toFixed(3),
      r.paidBHD.toFixed(3),
      r.balanceBHD.toFixed(3),
      `"${r.status}"`,
    ]);
    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'xerotech-receipts-ledger.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const nextSeqLabel = `${receiptPrefix}-2026-11-${String(nextSequence).padStart(3, '0')}`;

  return (
    <AdminLayout
      title="Official Receipts Ledger"
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      onOpenNewReceipt={() => setCreateOpen(true)}
    >
      <div className="space-y-6">
        {/* Header Card */}
        <div className="rounded-2xl glass-surface px-6 py-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#0066FF]">
              Ledger Management
            </div>
            <h1 className="mt-1 text-xl sm:text-2xl font-extrabold text-[#0f172a]">
              All Issued Payment Receipts ({receipts.length})
            </h1>
            <p className="mt-0.5 text-xs text-[#334155]">
              Permanent transactional sequence records for XeroTech Technologies. Voiding a receipt
              reverses client CRM rollups and stamps PDF exports as CANCELLED.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-[#334155] hover:bg-slate-50 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Download className="w-4 h-4 text-[#0066FF]" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0066FF] px-4 py-2 text-xs font-bold text-white hover:bg-[#0052CC] shadow-lg shadow-blue-600/20 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>New Receipt</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="rounded-2xl glass-surface p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search receipt #, client, phone, service..."
              className="w-full rounded-xl border pl-10 pr-3.5 py-2 text-xs glass-input focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-[#475569] font-medium">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="rounded-xl border px-3 py-1.5 font-semibold glass-input focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="PAID">PAID</option>
                <option value="PARTIAL">PARTIAL</option>
                <option value="UNPAID">UNPAID</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[#475569] font-medium">Method:</span>
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value as MethodFilter)}
                className="rounded-xl border px-3 py-1.5 font-semibold glass-input focus:outline-none"
              >
                <option value="ALL">All Methods</option>
                <option value="BenefitPay">BenefitPay</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Card Payment">Card Payment</option>
                <option value="Cash">Cash</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[#475569] font-medium">Sort:</span>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                className="rounded-xl border px-3 py-1.5 font-semibold glass-input focus:outline-none"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="highest">Highest Value (BHD)</option>
              </select>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="rounded-xl border border-red-200 bg-red-50/90 px-4 py-3 text-xs font-medium text-red-700">
            {errorMsg}
          </div>
        )}

        {/* Ledger Table */}
        <div className="rounded-2xl glass-surface overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({length: 4}).map((_, idx) => (
                <div key={idx} className="h-12 rounded-xl bg-slate-200/70 animate-pulse" />
              ))}
            </div>
          ) : filteredReceipts.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <FileText className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="text-sm font-bold text-[#0f172a]">No receipts match current filters</div>
              <p className="text-xs text-[#64748b]">
                Adjust status/method filters or issue a new official payment receipt.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[#475569] font-semibold">
                    <th className="py-3.5 px-4">Receipt No.</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Client Name</th>
                    <th className="py-3.5 px-4">Service</th>
                    <th className="py-3.5 px-4">Method</th>
                    <th className="py-3.5 px-4 text-right">Total (BHD)</th>
                    <th className="py-3.5 px-4 text-right">Received (BHD)</th>
                    <th className="py-3.5 px-4 text-right">Balance (BHD)</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredReceipts.map((rec) => {
                    const isCancelled = rec.status === 'CANCELLED';
                    return (
                      <tr
                        key={rec.id}
                        className={`transition-colors ${
                          isCancelled
                            ? 'bg-red-50/75 hover:bg-red-50/95 text-slate-500'
                            : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <td
                          className={`py-3.5 px-4 font-mono font-bold whitespace-nowrap ${
                            isCancelled ? 'line-through text-red-700' : 'text-[#0066FF]'
                          }`}
                        >
                          {rec.receiptNo}
                        </td>
                        <td className="py-3.5 px-4 text-[#475569] whitespace-nowrap">
                          {rec.dateDisplay}
                        </td>
                        <td className="py-3.5 px-4">
                          <div
                            className={`font-bold ${
                              isCancelled ? 'line-through text-slate-500' : 'text-[#0f172a]'
                            }`}
                          >
                            {rec.clientName}
                          </div>
                          <div className="font-mono text-[10px] text-[#64748b]">
                            {rec.clientPhone}
                          </div>
                          {isCancelled && rec.cancelledBy && (
                            <div className="mt-1 font-mono text-[10px] text-red-700">
                              Voided by {rec.cancelledBy} · {rec.cancelledAt?.slice(0, 10)}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-[#334155] max-w-[190px] truncate">
                          {rec.serviceName}
                        </td>
                        <td className="py-3.5 px-4 text-[#334155] whitespace-nowrap">
                          {rec.paymentMethod}
                        </td>
                        <td
                          className={`py-3.5 px-4 text-right font-mono font-bold tabular-nums ${
                            isCancelled ? 'line-through text-slate-400' : 'text-[#0f172a]'
                          }`}
                        >
                          {formatBHDNumber(rec.totalBHD)}
                        </td>
                        <td
                          className={`py-3.5 px-4 text-right font-mono font-bold tabular-nums ${
                            isCancelled ? 'line-through text-slate-400' : 'text-emerald-700'
                          }`}
                        >
                          {formatBHDNumber(rec.paidBHD)}
                        </td>
                        <td
                          className={`py-3.5 px-4 text-right font-mono font-bold tabular-nums ${
                            isCancelled ? 'line-through text-slate-400' : 'text-amber-700'
                          }`}
                        >
                          {formatBHDNumber(rec.balanceBHD)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-block rounded-md px-2 py-0.5 font-mono text-[10px] font-bold ${
                              rec.status === 'PAID'
                                ? 'bg-emerald-50/90 text-emerald-700 border border-emerald-200'
                                : rec.status === 'PARTIAL'
                                  ? 'bg-amber-50/90 text-amber-800 border border-amber-300'
                                  : rec.status === 'CANCELLED'
                                    ? 'bg-red-50/90 text-red-700 border border-red-200'
                                    : 'bg-slate-100 text-[#334155] border border-slate-200'
                            }`}
                          >
                            {rec.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setPreviewReceipt(rec)}
                              title="Preview A4 Receipt"
                              aria-label={`Preview ${rec.receiptNo}`}
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-[#0066FF] cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <a
                              href={buildReceiptWhatsAppUrl(rec)}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="WhatsApp Dispatch"
                              aria-label={`Share ${rec.receiptNo} on WhatsApp`}
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-sky-50 hover:text-[#0066FF]"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </a>
                            <button
                              type="button"
                              onClick={() => void downloadReceiptPdf(rec)}
                              title="Download Official PDF"
                              aria-label={`Download PDF ${rec.receiptNo}`}
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-[#0f172a] cursor-pointer"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            {!isCancelled && (
                              <button
                                type="button"
                                onClick={() => setVoidTarget(rec)}
                                title="Cancel / Void Receipt"
                                aria-label={`Cancel or void ${rec.receiptNo}`}
                                className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700 cursor-pointer"
                              >
                                <Ban className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ReceiptPreviewModal
        receipt={previewReceipt}
        settings={settings}
        onClose={() => setPreviewReceipt(null)}
      />

      <VoidReceiptModal
        receipt={voidTarget}
        onClose={() => setVoidTarget(null)}
        onVoided={() => void loadLedger()}
      />

      <CreateReceiptModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        nextSequenceNo={nextSeqLabel}
        onCreated={() => void loadLedger()}
      />
    </AdminLayout>
  );
}
