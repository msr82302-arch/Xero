import {Download, Plus, Search, Users} from 'lucide-react';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {CreateReceiptModal, type ReceiptPrefillData} from '@/src/components/admin/CreateReceiptModal';
import {AdminLayout} from '@/src/components/layout/AdminLayout';
import {apiClient} from '@/src/lib/api';
import type {ClientSummary} from '@/src/types/xbms';
import {formatBHDNumber} from '@/src/types/xbms';

export function ClientsPage() {
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [prefill, setPrefill] = useState<ReceiptPrefillData | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const loadClients = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const {data} = await apiClient.get<{clients: ClientSummary[]}>('/clients/');
      setClients(data.clients);
    } catch {
      setErrorMsg('Unable to load client directory.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  const filteredClients = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q),
    );
  }, [clients, searchQuery]);

  const handleExportCsv = () => {
    const header = ['Client Name', 'Phone', 'Email', 'Projects', 'Invoiced (BHD)', 'Paid (BHD)', 'Balance (BHD)'];
    const rows = filteredClients.map((c) => [
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.phone}"`,
      `"${c.email}"`,
      String(c.projectsCount),
      c.totalInvoicedBHD.toFixed(3),
      c.totalPaidBHD.toFixed(3),
      c.outstandingBalanceBHD.toFixed(3),
    ]);
    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'xerotech-clients-ledger.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleOpenReceiptForClient = (client: ClientSummary) => {
    setPrefill({
      clientName: client.name,
      clientPhone: client.phone,
      clientEmail: client.email,
    });
    setCreateOpen(true);
  };

  return (
    <AdminLayout
      title="Client Directory & Receivables"
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      onOpenNewReceipt={() => {
        setPrefill(null);
        setCreateOpen(true);
      }}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="rounded-2xl glass-surface px-6 py-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#0066FF]">
              Customer Accounts
            </div>
            <h1 className="mt-1 text-xl sm:text-2xl font-extrabold text-[#0f172a]">
              Client Directory &amp; Receivables ({clients.length})
            </h1>
            <p className="mt-0.5 text-xs text-[#334155]">
              Auto-synchronized transaction profiles for XeroTech commercial partners. Voided receipts
              automatically reverse client receivables.
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-[#334155] hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download className="w-4 h-4 text-[#0066FF]" />
            <span>Export Clients CSV</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="rounded-2xl glass-surface p-4">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by client name, phone number, email..."
              className="w-full rounded-xl border pl-10 pr-3.5 py-2 text-xs sm:text-sm glass-input focus:outline-none"
            />
          </div>
        </div>

        {errorMsg && (
          <div className="rounded-xl border border-red-200 bg-red-50/90 px-4 py-3 text-xs font-medium text-red-700">
            {errorMsg}
          </div>
        )}

        {/* Table */}
        <div className="rounded-2xl glass-surface overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({length: 4}).map((_, idx) => (
                <div key={idx} className="h-12 rounded-xl bg-slate-200/70 animate-pulse" />
              ))}
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <Users className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="text-sm font-bold text-[#0f172a]">No matching clients found</div>
              <p className="text-xs text-[#64748b]">
                Issue a receipt or clear your search filter to view commercial partner rollups.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[#475569] font-semibold">
                    <th className="py-3.5 px-5">Client</th>
                    <th className="py-3.5 px-4">Contact</th>
                    <th className="py-3.5 px-4 text-center">Projects</th>
                    <th className="py-3.5 px-4 text-right">Invoiced (BHD)</th>
                    <th className="py-3.5 px-4 text-right">Paid (BHD)</th>
                    <th className="py-3.5 px-4 text-right">Balance (BHD)</th>
                    <th className="py-3.5 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredClients.map((client) => (
                    <tr key={client.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="font-bold text-[#0f172a]">{client.name}</div>
                        {client.email && (
                          <div className="text-[11px] text-[#64748b]">{client.email}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[#334155] whitespace-nowrap">
                        {client.phone}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-semibold text-[#0f172a] tabular-nums">
                        {client.projectsCount}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-[#0f172a] tabular-nums">
                        {formatBHDNumber(client.totalInvoicedBHD)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700 tabular-nums">
                        {formatBHDNumber(client.totalPaidBHD)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-700 tabular-nums">
                        {formatBHDNumber(client.outstandingBalanceBHD)}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenReceiptForClient(client)}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#0066FF] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[#0052CC] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Receipt</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <CreateReceiptModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        prefill={prefill}
        onCreated={() => void loadClients()}
      />
    </AdminLayout>
  );
}
