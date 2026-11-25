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
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#0066FF]">
              Executive Financial Overview
            </div>
            <h1 className="mt-1 text-xl sm:text-2xl font-extrabold text-[#0A192F] tracking-tight">
              XeroTech Corporate Billing Dashboard
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Real-time financial status, revenue collections, and active client balances in Bahrain Dinars (BHD).
            </p>
          </div>

          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0A192F] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#13294B] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Payment Receipt</span>
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
            {error}
          </div>
        )}

        {loading && !summary ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({length: 8}).map((_, idx) => (
              <div
                key={idx}
                className="h-28 rounded-2xl border border-slate-200 bg-white animate-pulse p-5"
              />
            ))}
          </div>
        ) : (
          summary && (
            <>
              {/* Primary 4 KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                    <span>Total Invoiced</span>
                    <TrendingUp className="w-4 h-4 text-[#0066FF]" />
                  </div>
                  <div className="mt-2 font-mono text-2xl font-extrabold text-[#0A192F] tabular-nums">
                    {formatBHD(summary.kpis.totalInvoicedBHD)}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">Active contracted value</div>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-white p-5">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                    <span>Total Collections</span>
                    <Wallet className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="mt-2 font-mono text-2xl font-extrabold text-emerald-700 tabular-nums">
                    {formatBHD(summary.kpis.totalCollectionsBHD)}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">Verified received capital</div>
                </div>

                <div className="rounded-2xl border border-amber-300 bg-amber-50/35 p-5">
                  <div className="flex items-center justify-between text-xs font-medium text-amber-900">
                    <span>Outstanding Receivables</span>
                    <Clock className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="mt-2 font-mono text-2xl font-extrabold text-amber-700 tabular-nums">
                    {formatBHD(summary.kpis.outstandingReceivablesBHD)}
                  </div>
                  <div className="mt-1 text-[11px] text-amber-700/80">Pending client balances</div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                    <span>Active Documents</span>
                    <FileText className="w-4 h-4 text-[#0066FF]" />
                  </div>
                  <div className="mt-2 font-mono text-2xl font-extrabold text-[#0A192F] tabular-nums">
                    {summary.kpis.activeDocuments}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    Sequential non-voided receipts
                  </div>
                </div>
              </div>

              {/* Secondary Status & Velocity Strip */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Fully Paid</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="mt-1.5 font-mono text-xl font-extrabold text-emerald-700 tabular-nums">
                    {summary.kpis.paidCount}
                  </div>
                  <div className="text-[11px] text-slate-400">Zero remaining balance</div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Partially Paid</span>
                    <Clock className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="mt-1.5 font-mono text-xl font-extrabold text-amber-600 tabular-nums">
                    {summary.kpis.partialCount}
                  </div>
                  <div className="text-[11px] text-slate-400">Advance settled, balance active</div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Unpaid Receipts</span>
                    <Clock className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="mt-1.5 font-mono text-xl font-extrabold text-[#0A192F] tabular-nums">
                    {summary.kpis.unpaidCount}
                  </div>
                  <div className="text-[11px] text-slate-400">Awaiting initial payment</div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Cancelled / Voided</span>
                    <XCircle className="w-4 h-4 text-red-600" />
                  </div>
                  <div className="mt-1.5 font-mono text-xl font-extrabold text-red-600 tabular-nums">
                    {summary.kpis.cancelledCount}
                  </div>
                  <div className="text-[11px] text-slate-400">Retained in audit ledger</div>
                </div>
              </div>

              {/* Charts Row: Dual-Bar Trajectory + Payment Status Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Trajectory Chart */}
                <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-6 flex flex-col justify-between">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-extrabold text-[#0A192F]">
                        Revenue &amp; Collections Trajectory
                      </h2>
                      <p className="text-xs text-slate-500">
                        Invoiced value vs actual collections received (BHD)
                      </p>
                    </div>

                    <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 text-[11px] font-bold">
                      {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((tab) => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setTrajectoryTab(tab)}
                          className={`rounded-lg px-2.5 py-1 uppercase transition-colors cursor-pointer ${
                            trajectoryTab === tab
                              ? 'bg-white text-[#0066FF] shadow-xs border border-slate-200/80'
                              : 'text-slate-500 hover:text-[#0A192F]'
                          }`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dual Bars Visualization */}
                  <div className="mt-8 h-56 flex items-end justify-around gap-3 sm:gap-6 px-2 border-b border-slate-100 pb-3 relative">
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
                            <div className="absolute -top-11 z-10 whitespace-nowrap rounded-lg bg-[#0A192F] px-2.5 py-1.5 text-[10px] font-mono text-white shadow-lg">
                              <div>Inv: {formatBHD(pt.invoicedBHD)}</div>
                              <div className="text-[#00C2FF]">Col: {formatBHD(pt.collectedBHD)}</div>
                            </div>
                          )}

                          <div className="w-full max-w-[56px] h-full flex items-end justify-center gap-1.5">
                            <div
                              style={{height: `${invPct}%`}}
                              className="w-4 sm:w-5 rounded-t-md bg-[#0A192F] transition-all duration-300 group-hover:opacity-90"
                              title={`Invoiced: ${formatBHD(pt.invoicedBHD)}`}
                            />
                            <div
                              style={{height: `${colPct}%`}}
                              className="w-4 sm:w-5 rounded-t-md bg-[#0066FF] transition-all duration-300 group-hover:bg-[#0052CC]"
                              title={`Collected: ${formatBHD(pt.collectedBHD)}`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-2 flex items-center justify-around text-xs font-semibold text-slate-500">
                    {trajectoryPoints.map((pt) => (
                      <span key={pt.label} className="font-mono text-[11px]">
                        {pt.label}
                      </span>
                    ))}
                  </div>

                  <div className="mt-5 flex items-center justify-center gap-6 text-xs text-slate-600">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#0A192F]" />
                      Total Invoiced (BHD)
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#0066FF]" />
                      Collections Received (BHD)
                    </span>
                  </div>
                </div>

                {/* Payment Status Distribution */}
                <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-6 flex flex-col justify-between space-y-5">
                  <div>
                    <h2 className="text-sm font-extrabold text-[#0A192F]">
                      Payment Status Distribution
                    </h2>
                    <p className="text-xs text-slate-500">
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
                            <span className="inline-flex items-center gap-2 font-medium text-slate-700">
                              <span className={`h-2 w-2 rounded-full ${row.dot}`} />
                              {row.label}
                            </span>
                            <span className="font-mono font-semibold text-[#0A192F] tabular-nums">
                              {row.count} receipts
                            </span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                              style={{width: `${pct}%`}}
                              className={`h-full rounded-full transition-all duration-300 ${row.bar}`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs">
                    <div className="font-bold text-[#0A192F]">Financial Integrity Guarantee</div>
                    <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                      Receipt numbers are strictly sequential with 3-decimal BHD accuracy. Voided
                      transactions remain permanently archived in the audit log.
                    </p>
                  </div>
                </div>
              </div>

              {/* Recent Billing Activity Table */}
              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div className="border-b border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-extrabold text-[#0A192F]">
                      Recent Billing Activity
                    </h2>
                    <p className="text-xs text-slate-500">
                      Latest finalized transaction receipts ({filteredReceipts.length})
                    </p>
                  </div>
                </div>

                {filteredReceipts.length === 0 ? (
                  <div className="p-10 text-center space-y-3">
                    <p className="text-sm font-semibold text-slate-600">
                      No billing activity matches your search query.
                    </p>
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-[#0066FF] hover:bg-slate-50 cursor-pointer"
                    >
                      Clear Search Filter
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-semibold">
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
                      <tbody className="divide-y divide-slate-100">
                        {filteredReceipts.slice(0, 8).map((rec) => {
                          const isCancelled = rec.status === 'CANCELLED';
                          return (
                            <tr
                              key={rec.id}
                              className={`hover:bg-slate-50/80 transition-colors ${
                                isCancelled ? 'opacity-65 bg-red-50/20' : ''
                              }`}
                            >
                              <td
                                className={`py-3 px-4 font-mono font-bold text-[#0066FF] whitespace-nowrap ${
                                  isCancelled ? 'line-through text-red-600' : ''
                                }`}
                              >
                                {rec.receiptNo}
                              </td>
                              <td
                                className={`py-3 px-4 font-semibold text-[#0A192F] ${
                                  isCancelled ? 'line-through' : ''
                                }`}
                              >
                                {rec.clientName}
                              </td>
                              <td className="py-3 px-4 text-slate-600 max-w-[200px] truncate">
                                {rec.serviceName}
                              </td>
                              <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                                {rec.dateDisplay}
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-semibold text-[#0A192F] tabular-nums">
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
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : rec.status === 'PARTIAL'
                                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                        : rec.status === 'CANCELLED'
                                          ? 'bg-red-50 text-red-700 border border-red-200'
                                          : 'bg-slate-100 text-slate-700 border border-slate-200'
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
                                    className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-[#0A192F] cursor-pointer"
                                  >
                                    <Download className="w-4 h-4" />
                                  </button>
                                  <a
                                    href={buildReceiptWhatsAppUrl(rec)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Dispatch via WhatsApp"
                                    aria-label={`WhatsApp ${rec.receiptNo}`}
                                    className="rounded-lg p-1.5 text-slate-500 hover:bg-blue-50 hover:text-[#0066FF]"
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
