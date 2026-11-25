import {Search, ShieldAlert} from 'lucide-react';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {AdminLayout} from '@/src/components/layout/AdminLayout';
import {apiClient} from '@/src/lib/api';
import type {AuditLogEntry} from '@/src/types/xbms';

const ACTION_BADGE_STYLES: Record<AuditLogEntry['actionType'], string> = {
  LOGIN_SUCCESS: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  LOGIN_FAILED: 'bg-red-50 text-red-700 border-red-200',
  PASSWORD_RESET_REQUESTED: 'bg-amber-50 text-amber-800 border-amber-300',
  PASSWORD_RESET_COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  USER_PASSWORD_UPDATED: 'bg-sky-50 text-[#0066FF] border-sky-200',
  ADMIN_FORCE_PASSWORD_RESET: 'bg-red-50 text-red-700 border-red-200',
  USER_PROVISIONED: 'bg-sky-50 text-[#0066FF] border-sky-200',
  USER_STATUS_CHANGED: 'bg-amber-50 text-amber-800 border-amber-300',
  STAFF_REGISTRATION_REQUESTED: 'bg-amber-50 text-amber-800 border-amber-300',
  STAFF_PROVISIONED_BY_CODE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  STAFF_ACCOUNT_REACTIVATED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  ADMIN_TOKEN_ISSUED: 'bg-sky-50 text-[#0066FF] border-sky-200',
  SYSTEM_BOOTSTRAP: 'bg-sky-50 text-[#0066FF] border-sky-200',
  ADMIN_SETUP: 'bg-sky-50 text-[#0066FF] border-sky-200',
  RECEIPT_ISSUED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  RECEIPT_VOIDED: 'bg-red-50 text-red-700 border-red-200',
  QUOTATION_APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  QUOTATION_REJECTED: 'bg-amber-50 text-amber-800 border-amber-300',
  LEAD_RECEIVED: 'bg-slate-100 text-[#334155] border-slate-200',
  SETTINGS_UPDATED: 'bg-sky-50 text-[#0066FF] border-sky-200',
  PDF_DOWNLOADED: 'bg-slate-100 text-[#475569] border-slate-200',
};

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const loadAuditLogs = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const {data} = await apiClient.get<{logs: AuditLogEntry[]}>('/audit/');
      setLogs(data.logs);
    } catch {
      setErrorMsg('Unable to load forensic security audit logs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAuditLogs();
  }, [loadAuditLogs]);

  const filteredLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter(
      (entry) =>
        entry.actionType.toLowerCase().includes(q) ||
        entry.userEmail.toLowerCase().includes(q) ||
        entry.details.toLowerCase().includes(q) ||
        entry.timestampBahrain.toLowerCase().includes(q),
    );
  }, [logs, searchQuery]);

  return (
    <AdminLayout
      title="Forensic Security Audit Logs"
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="rounded-2xl glass-surface px-6 py-5">
          <div className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#0066FF]">
            Security &amp; Compliance
          </div>
          <h1 className="mt-1 text-xl sm:text-2xl font-extrabold text-[#0f172a]">
            Immutable Audit Trail ({logs.length})
          </h1>
          <p className="mt-0.5 text-xs text-[#334155]">
            Chronological forensic security log of logins, receipts, voidings, quotation approvals,
            and administrative operations.
          </p>
        </div>

        {/* Search */}
        <div className="rounded-2xl glass-surface p-4">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search audit actions, user emails, transaction details..."
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
              {Array.from({length: 5}).map((_, idx) => (
                <div key={idx} className="h-11 rounded-xl bg-slate-200/70 animate-pulse" />
              ))}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <ShieldAlert className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="text-sm font-bold text-[#0f172a]">No matching audit entries</div>
              <p className="text-xs text-[#64748b]">
                Try clearing the search query to inspect the chronological audit ledger.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[#475569] font-semibold">
                    <th className="py-3.5 px-5">Timestamp (Bahrain)</th>
                    <th className="py-3.5 px-4">Action Type</th>
                    <th className="py-3.5 px-4">User Email</th>
                    <th className="py-3.5 px-5">Event Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredLogs.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-5 font-mono text-[11px] text-[#64748b] tabular-nums whitespace-nowrap">
                        {entry.timestampBahrain}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-block rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold ${
                            ACTION_BADGE_STYLES[entry.actionType]
                          }`}
                        >
                          {entry.actionType}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] font-semibold text-[#0f172a] whitespace-nowrap">
                        {entry.userEmail}
                      </td>
                      <td className="py-3 px-5 text-[#334155]">{entry.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
