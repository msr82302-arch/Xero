import {
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  MessageSquare,
  Plus,
  TrendingUp,
  Wallet,
  XCircle,
} from 'lucide-react';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {CreateReceiptModal} from '@/src/components/admin/CreateReceiptModal';
import {ReceiptPreviewModal} from '@/src/components/admin/ReceiptPreviewModal';
import {AdminLayout} from '@/src/components/layout/AdminLayout';
import {apiClient, buildReceiptWhatsAppUrl, downloadReceiptPdf} from '@/src/lib/api';
import type {CompanySettings, DashboardSummary, ReceiptRecord} from '@/src/types/xbms';
import {formatBHD, formatBHDNumber} from '@/src/types/xbms';

type TrajectoryTab = 'daily' | 'weekly' | 'monthly' | 'yearly';

export function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [trajectoryTab, setTrajectoryTab] = useState<TrajectoryTab>('monthly');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewReceipt, setPreviewReceipt] = useState<ReceiptRecord | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [hoveredBarIdx, setHoveredBarIdx] = useState<number | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [dashRes, settingsRes] = await Promise.all([
        apiClient.get<DashboardSummary>('/dashboard/'),
        apiClient.get<{settings: CompanySettings}>('/settings/'),
      ]);
      setSummary(dashRes.data);
      setSettings(settingsRes.data.settings);
    } catch {
      setError('Unable to load executive billing dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDashboard();
  }, [fetchDashboard]);

  const trajectoryPoints = useMemo(() => {
    if (!summary) return [];
    return summary.trajectory[trajectoryTab] || [];
  }, [summary, trajectoryTab]);

  const maxChartBHD = useMemo(() => {
    const highest = trajectoryPoints.reduce(
      (acc, p) => Math.max(acc, p.invoicedBHD, p.collectedBHD),
      100,
    );
    return Math.ceil(highest / 100) * 100;
  }, [trajectoryPoints]);

  const filteredReceipts = useMemo(() => {
    if (!summary) return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return summary.recentReceipts;
    return summary.recentReceipts.filter(
      (r) =>
        r.receiptNo.toLowerCase().includes(q) ||
        r.clientName.toLowerCase().includes(q) ||
        r.serviceName.toLowerCase().includes(q),
    );
  }, [summary, searchQuery]);

  const totalDocsForBars = useMemo(() => {
    if (!summary) return 1;
    const {paidCount, partialCount, unpaidCount, cancelledCount} = summary.kpis;
    return Math.max(1, paidCount + partialCount + unpaidCount + cancelledCount);
  }, [summary]);

  const nextSeqNo = useMemo(() => {
    if (!settings) return 'XT-REC-2026-11-005';
    const seq = String(settings.receiptSequenceCounter + 1).padStart(3, '0');
    return `${settings.receiptPrefix}-2026-11-${seq}`;
  }, [settings]);

  return (
    <AdminLayout
      title="Executive Financial Dashboard"
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      onOpenNewReceipt={() => setCreateOpen(true)}
    >
      <div className="space-y-6">
        {/* Top Executive Banner */}
        <div className="rounded-2xl glass-surface px-6 py-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#0066FF]">
              Executive Financial Overview
            </div>
            <h1 className="mt-1 text-xl sm:text-2xl font-extrabold text-[#0f172a] tracking-tight">
              XeroTech Corporate Billing Dashboard
            </h1>
            <p className="mt-0.5 text-xs text-[#334155]">
              Real-time financial status, revenue collections, and active client balances in Bahrain Dinars (BHD).
            </p>
          </div>

          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0066FF] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#0052CC] shadow-lg shadow-blue-600/20 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Payment Receipt</span>
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50/90 px-4 py-3 text-xs font-medium text-red-700">
            {error}
          </div>
        )}

        {loading && !summary ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({length: 8}).map((_, idx) => (
              <div
                key={idx}
                className="h-28 rounded-2xl glass-surface animate-pulse p-5"
              />
            ))}
          </div>
        ) : (
          summary && (
            <>
              {/* Primary 4 KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-2xl glass-surface p-5">
                  <div className="flex items-center justify-between text-xs font-medium text-[#475569]">
                    <span>Total Invoiced</span>
                    <TrendingUp className="w-4 h-4 text-[#0066FF]" />
                  </div>
                  <div className="mt-2 font-mono text-2xl font-extrabold text-[#0f172a] tabular-nums">
                    {formatBHD(summary.kpis.totalInvoicedBHD)}
                  </div>
                  <div className="mt-1 text-[11px] text-[#64748b]">Active contracted value</div>
                </div>

                <div className="rounded-2xl glass-surface !border-emerald-200 !bg-emerald-50/75 p-5">
                  <div className="flex items-center justify-between text-xs font-medium text-emerald-800">
                    <span>Total Collections</span>
                    <Wallet className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="mt-2 font-mono text-2xl font-extrabold text-emerald-700 tabular-nums">
                    {formatBHD(summary.kpis.totalCollectionsBHD)}
                  </div>
                  <div className="mt-1 text-[11px] text-emerald-700/80">Verified received capital</div>
                </div>

                <div className="rounded-2xl glass-surface !border-amber-300 !bg-amber-50/80 p-5">
                  <div className="flex items-center justify-between text-xs font-medium text-amber-800">
                    <span>Outstanding Receivables</span>
                    <Clock className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="mt-2 font-mono text-2xl font-extrabold text-amber-800 tabular-nums">
                    {formatBHD(summary.kpis.outstandingReceivablesBHD)}
                  </div>
                  <div className="mt-1 text-[11px] text-amber-700">Pending client balances</div>
                </div>

                <div className="rounded-2xl glass-surface p-5">
                  <div className="flex items-center justify-between text-xs font-medium text-[#475569]">
                    <span>Active Documents</span>
                    <FileText className="w-4 h-4 text-[#0066FF]" />
                  </div>
                  <div className="mt-2 font-mono text-2xl font-extrabold text-[#0f172a] tabular-nums">
                    {summary.kpis.activeDocuments}
                  </div>
                  <div className="mt-1 text-[11px] text-[#64748b]">
                    Sequential non-voided receipts
                  </div>
                </div>
              </div>

              {/* Secondary Status & Velocity Strip */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-2xl glass-surface p-4">
                  <div className="flex items-center justify-between text-xs text-[#475569]">
                    <span>Fully Paid</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="mt-1.5 font-mono text-xl font-extrabold text-emerald-700 tabular-nums">
                    {summary.kpis.paidCount}
                  </div>
                  <div className="text-[11px] text-[#64748b]">Zero remaining balance</div>
                </div>

                <div className="rounded-2xl glass-surface p-4">
                  <div className="flex items-center justify-between text-xs text-[#475569]">
                    <span>Partially Paid</span>
                    <Clock className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="mt-1.5 font-mono text-xl font-extrabold text-amber-700 tabular-nums">
                    {summary.kpis.partialCount}
                  </div>
                  <div className="text-[11px] text-[#64748b]">Advance settled, balance active</div>
                </div>

                <div className="rounded-2xl glass-surface p-4">
                  <div className="flex items-center justify-between text-xs text-[#475569]">
                    <span>Unpaid Receipts</span>
                    <Clock className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="mt-1.5 font-mono text-xl font-extrabold text-[#0f172a] tabular-nums">
                    {summary.kpis.unpaidCount}
                  </div>
                  <div className="text-[11px] text-[#64748b]">Awaiting initial payment</div>
                </div>

                <div className="rounded-2xl glass-surface !border-red-200 p-4">
                  <div className="flex items-center justify-between text-xs text-[#475569]">
                    <span>Cancelled / Voided</span>
                    <XCircle className="w-4 h-4 text-red-600" />
                  </div>
                  <div className="mt-1.5 font-mono text-xl font-extrabold text-red-700 tabular-nums">
                    {summary.kpis.cancelledCount}
                  </div>
                  <div className="text-[11px] text-[#64748b]">Retained in audit ledger</div>
                </div>
              </div>

              {/* Charts Row: Dual-Bar Trajectory + Payment Status Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Trajectory Chart */}
                <div className="lg:col-span-7 rounded-2xl glass-surface p-6 flex flex-col justify-between">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-extrabold text-[#0f172a]">
                        Revenue &amp; Collections Trajectory
                      </h2>
                      <p className="text-xs text-[#64748b]">
                        Invoiced value vs actual collections received (BHD)
                      </p>
                    </div>

                    <div className="inline-flex rounded-xl glass-panel-subtle p-1 text-[11px] font-bold">
                      {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((tab) => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setTrajectoryTab(tab)}
                          className={`rounded-lg px-2.5 py-1 uppercase transition-colors cursor-pointer ${
                            trajectoryTab === tab
                              ? 'bg-[#0066FF] text-white shadow-xs'
                              : 'text-[#475569] hover:text-[#0f172a]'
                          }`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dual Bars Visualization */}
                  <div className="mt-8 h-56 flex items-end justify-around gap-3 sm:gap-6 px-2 border-b border-slate-200 pb-3 relative">
                    {trajectoryPoints.map((pt, idx) => {
                      const invPct = Math.max(4, Math.round((pt.invoicedBHD / maxChartBHD) * 100));
                      const colPct = Math.max(4, Math.round((pt.collectedBHD / maxChartBHD) * 100));
                      const isHovered = hoveredBarIdx === idx;
                      return (
                        <div
                          key={pt.label}
                          onMouseEnter={() => setHoveredBarIdx(idx)}
                          onMouseLeave={() => setHoveredBarIdx(null)}
                          className="relative flex-1 flex flex-col items-center h-full justify-end group"
                        >
                          {isHovered && (
                            <div className="absolute -top-11 z-10 whitespace-nowrap rounded-lg glass-modal px-2.5 py-1.5 text-[10px] font-mono text-[#0f172a] shadow-lg">
                              <div>Inv: {formatBHD(pt.invoicedBHD)}</div>
                              <div className="text-[#0066FF] font-bold">Col: {formatBHD(pt.collectedBHD)}</div>
                            </div>
                          )}

                          <div className="w-full max-w-[56px] h-full flex items-end justify-center gap-1.5">
                            <div
                              style={{height: `${invPct}%`}}
                              className="w-4 sm:w-5 rounded-t-md bg-[#0f172a] transition-all duration-300 group-hover:opacity-85"
                              title={`Invoiced: ${formatBHD(pt.invoicedBHD)}`}
                            />
                            <div
                              style={{height: `${colPct}%`}}
                              className="w-4 sm:w-5 rounded-t-md bg-[#0066FF] transition-all duration-300 group-hover:bg-[#3385FF]"
                              title={`Collected: ${formatBHD(pt.collectedBHD)}`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-2 flex items-center justify-around text-xs font-semibold text-[#64748b]">
                    {trajectoryPoints.map((pt) => (
                      <span key={pt.label} className="font-mono text-[11px]">
                        {pt.label}
                      </span>
                    ))}
                  </div>

                  <div className="mt-5 flex items-center justify-center gap-6 text-xs text-[#334155] font-medium">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#0f172a]" />
                      Total Invoiced (BHD)
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#0066FF]" />
                      Collections Received (BHD)
                    </span>
                  </div>
                </div>

                {/* Payment Status Distribution */}
                <div className="lg:col-span-5 rounded-2xl glass-surface p-6 flex flex-col justify-between space-y-5">
                  <div>
                    <h2 className="text-sm font-extrabold text-[#0f172a]">
                      Payment Status Distribution
                    </h2>
                    <p className="text-xs text-[#64748b]">
                      Breakdown of issued receipt accounts
                    </p>
                  </div>

                  <div className="space-y-4">
                    {[
                      {
                        label: 'Fully Paid',
                        count: summary.kpis.paidCount,
                        dot: 'bg-emerald-500',
                        bar: 'bg-emerald-500',
                      },
                      {
                        label: 'Partially Paid',
                        count: summary.kpis.partialCount,
                        dot: 'bg-amber-500',
                        bar: 'bg-amber-500',
                      },
                      {
                        label: 'Payment Due (Unpaid)',
                        count: summary.kpis.unpaidCount,
                        dot: 'bg-slate-400',
                        bar: 'bg-slate-400',
                      },
                      {
                        label: 'Cancelled',
                        count: summary.kpis.cancelledCount,
                        dot: 'bg-red-500',
                        bar: 'bg-red-500',
                      },
                    ].map((row) => {
                      const pct = Math.round((row.count / totalDocsForBars) * 100);
                      return (
                        <div key={row.label} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="inline-flex items-center gap-2 font-medium text-[#334155]">
                              <span className={`h-2 w-2 rounded-full ${row.dot}`} />
                              {row.label}
                            </span>
                            <span className="font-mono font-semibold text-[#0f172a] tabular-nums">
                              {row.count} receipts
                            </span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/80">
                            <div
                              style={{width: `${pct}%`}}
                              className={`h-full rounded-full transition-all duration-300 ${row.bar}`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="rounded-xl glass-panel-subtle p-3.5 text-xs">
                    <div className="font-bold text-[#0f172a]">Financial Integrity Guarantee</div>
                    <p className="mt-1 text-[11px] text-[#475569] leading-relaxed">
                      Receipt numbers are strictly sequential with 3-decimal BHD accuracy. Voided
                      transactions remain permanently archived in the audit log.
                    </p>
                  </div>
                </div>
              </div>

              {/* Recent Billing Activity Table */}
              <div className="rounded-2xl glass-surface overflow-hidden">
                <div className="border-b border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-extrabold text-[#0f172a]">
                      Recent Billing Activity
                    </h2>
                    <p className="text-xs text-[#64748b]">
                      Latest finalized transaction receipts ({filteredReceipts.length})
                    </p>
                  </div>
                </div>

                {filteredReceipts.length === 0 ? (
                  <div className="p-10 text-center space-y-3">
                    <p className="text-sm font-semibold text-[#334155]">
                      No billing activity matches your search query.
                    </p>
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-[#0066FF] hover:bg-slate-50 cursor-pointer"
                    >
                      Clear Search Filter
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/80 text-[#475569] font-semibold">
                          <th className="py-3 px-4">Receipt Number</th>
                          <th className="py-3 px-4">Client Name</th>
                          <th className="py-3 px-4">Service</th>
                          <th className="py-3 px-4">Date</th>
                          <th className="py-3 px-4 text-right">Total (BHD)</th>
                          <th className="py-3 px-4 text-right">Received (BHD)</th>
                          <th className="py-3 px-4 text-right">Balance (BHD)</th>
                          <th className="py-3 px-4 text-center">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {filteredReceipts.slice(0, 8).map((rec) => {
                          const isCancelled = rec.status === 'CANCELLED';
                          return (
                            <tr
                              key={rec.id}
                              className={`hover:bg-slate-50/80 transition-colors ${
                                isCancelled ? 'opacity-75 bg-red-50/75' : ''
                              }`}
                            >
                              <td
                                className={`py-3 px-4 font-mono font-bold whitespace-nowrap ${
                                  isCancelled ? 'line-through text-red-700' : 'text-[#0066FF]'
                                }`}
                              >
                                {rec.receiptNo}
                              </td>
                              <td
                                className={`py-3 px-4 font-semibold text-[#0f172a] ${
                                  isCancelled ? 'line-through text-slate-500' : ''
                                }`}
                              >
                                {rec.clientName}
                              </td>
                              <td className="py-3 px-4 text-[#334155] max-w-[200px] truncate">
                                {rec.serviceName}
                              </td>
                              <td className="py-3 px-4 text-[#64748b] whitespace-nowrap">
                                {rec.dateDisplay}
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-semibold text-[#0f172a] tabular-nums">
                                {formatBHDNumber(rec.totalBHD)}
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-700 tabular-nums">
                                {formatBHDNumber(rec.paidBHD)}
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-semibold text-amber-700 tabular-nums">
                                {formatBHDNumber(rec.balanceBHD)}
                              </td>
                              <td className="py-3 px-4 text-center">
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
                              <td className="py-3 px-4">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setPreviewReceipt(rec)}
                                    title="Quick View Receipt"
                                    aria-label={`View ${rec.receiptNo}`}
                                    className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-[#0066FF] cursor-pointer"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void downloadReceiptPdf(rec)}
                                    title="Download PDF Receipt"
                                    aria-label={`Download PDF ${rec.receiptNo}`}
                                    className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-[#0f172a] cursor-pointer"
                                  >
                                    <Download className="w-4 h-4" />
                                  </button>
                                  <a
                                    href={buildReceiptWhatsAppUrl(rec)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Dispatch via WhatsApp"
                                    aria-label={`WhatsApp ${rec.receiptNo}`}
                                    className="rounded-lg p-1.5 text-slate-500 hover:bg-sky-50 hover:text-[#0066FF]"
                                  >
                                    <MessageSquare className="w-4 h-4" />
                                  </a>
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
            </>
          )
        )}
      </div>

      <ReceiptPreviewModal
        receipt={previewReceipt}
        settings={settings}
        onClose={() => setPreviewReceipt(null)}
      />

      <CreateReceiptModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        nextSequenceNo={nextSeqNo}
        onCreated={() => void fetchDashboard()}
      />
    </AdminLayout>
  );
}
