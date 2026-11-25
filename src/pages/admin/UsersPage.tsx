import axios from 'axios';
import {
  CheckCircle2,
  Copy,
  KeyRound,
  ShieldCheck,
  Terminal,
  UserPlus,
  X,
} from 'lucide-react';
import {useCallback, useEffect, useMemo, useState, type FormEvent} from 'react';
import {UserManagementTable} from '@/src/components/admin/UserManagementTable';
import {
  evaluatePasswordStrength,
  PasswordStrengthMeter,
} from '@/src/components/auth/PasswordStrengthMeter';
import {AdminLayout} from '@/src/components/layout/AdminLayout';
import {apiClient, ensureCsrfToken} from '@/src/lib/api';
import type {PendingStaffRequest, SystemUserRecord} from '@/src/types/xbms';

export function UsersPage() {
  const [users, setUsers] = useState<SystemUserRecord[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingStaffRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [issuedToken, setIssuedToken] = useState<{
    token: string;
    type: 'INVITE' | 'OVERRIDE';
    expiresInMinutes: number;
  } | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);

  // Provision Modal State
  const [provisionOpen, setProvisionOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [role, setRole] = useState<'ADMINISTRATOR' | 'STAFF'>('STAFF');
  const [tempPassword, setTempPassword] = useState('');
  const [forceChangeOnNextLogin, setForceChangeOnNextLogin] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [usersRes, reqRes] = await Promise.all([
        apiClient.get<{users: SystemUserRecord[]}>('/admin/users/'),
        apiClient.get<{requests: PendingStaffRequest[]}>('/admin/staff-requests/'),
      ]);
      setUsers(usersRes.data.users);
      setPendingRequests(reqRes.data.requests);
    } catch {
      setErrorMsg('Unable to load registered XBMS accounts.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleIssueAuthToken = async (type: 'INVITE' | 'OVERRIDE') => {
    try {
      await ensureCsrfToken();
      const {data} = await apiClient.post<{
        token: string;
        type: 'INVITE' | 'OVERRIDE';
        expiresInMinutes: number;
      }>('/admin/users/authorization-tokens/', {type});
      setIssuedToken(data);
      setCopiedToken(false);
    } catch {
      setErrorMsg('Unable to generate authorization token.');
    }
  };

  const handleReviewRequest = async (requestId: string, decision: 'APPROVE' | 'REJECT') => {
    try {
      await ensureCsrfToken();
      const {data} = await apiClient.post<{
        request: PendingStaffRequest;
        createdUser?: SystemUserRecord;
      }>(`/admin/staff-requests/${requestId}/review/`, {decision});
      setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
      if (data.createdUser) {
        setUsers((prev) => [data.createdUser!, ...prev]);
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setErrorMsg(
          (err.response?.data as {error?: string} | undefined)?.error ||
            'Unable to process staff onboarding request.',
        );
      }
    }
  };

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        u.title.toLowerCase().includes(q),
    );
  }, [users, searchQuery]);

  const adminCount = useMemo(
    () => users.filter((u) => u.role === 'ADMINISTRATOR').length,
    [users],
  );
  const staffCount = useMemo(() => users.filter((u) => u.role === 'STAFF').length, [users]);
  const strength = evaluatePasswordStrength(tempPassword);

  const handleProvisionSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setCreateError('');
    if (!strength.isValid) {
      setCreateError(
        'Temporary password must be at least 8 characters with letters, numbers, and special symbols.',
      );
      return;
    }

    setCreating(true);
    try {
      await ensureCsrfToken();
      const {data} = await apiClient.post<{user: SystemUserRecord}>('/admin/users/', {
        name,
        email,
        title,
        role,
        temporary_password: tempPassword,
        force_change_on_next_login: forceChangeOnNextLogin,
      });
      setUsers((prev) => [data.user, ...prev]);
      setProvisionOpen(false);
      setName('');
      setEmail('');
      setTitle('');
      setRole('STAFF');
      setTempPassword('');
      setForceChangeOnNextLogin(true);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setCreateError(
          (err.response?.data as {error?: string} | undefined)?.error ||
            'Unable to provision system user.',
        );
      } else {
        setCreateError('Unexpected error provisioning user.');
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <AdminLayout
      title="User Governance & RBAC"
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
    >
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-5">
          <div>
            <div className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#0066FF]">
              Identity &amp; Two-Role Governance
            </div>
            <h1 className="mt-1 text-xl sm:text-2xl font-extrabold text-[#0A192F]">
              User Governance &amp; Password Control
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Manage ADMINISTRATOR and STAFF accounts, issue forced password resets, and enforce
              session revocation across XeroTech CR 201130-1.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setCreateError('');
              setProvisionOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0A192F] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#13294B] transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-[#00C2FF]" />
            <span>+ Provision New User</span>
          </button>
        </div>

        {/* Strict Two-Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-blue-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[#0066FF]">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#0066FF]">
                    ADMINISTRATOR ({adminCount})
                  </span>
                  <h2 className="text-sm font-extrabold text-[#0A192F]">
                    Executive Command Center Role
                  </h2>
                </div>
              </div>
              <span className="rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 font-mono text-[10px] font-bold text-[#0066FF]">
                FULL RBAC
              </span>
            </div>
            <p className="mt-3 text-xs text-slate-600 leading-relaxed">
              Full governance across Executive Dashboard KPIs, Quotation Approvals, Receipt
              Voiding, Client Directory, CR Settings, User Passwords, and Forensic Audit Logs.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-[#0A192F]">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    STAFF ({staffCount})
                  </span>
                  <h2 className="text-sm font-extrabold text-[#0A192F]">
                    Counter Billing Terminal Role
                  </h2>
                </div>
              </div>
              <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-[#0A192F]">
                RESTRICTED
              </span>
            </div>
            <p className="mt-3 text-xs text-slate-600 leading-relaxed">
              Restricted to the desktop Split-Screen Billing Terminal (`/terminal`) for rapid BoQ
              receipt issuance and draft quotation intake. Administrative APIs return HTTP 403.
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
            {errorMsg}
          </div>
        )}

        {/* Staff Terminal Authorization Token Bar */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#0066FF]">
              Staff Terminal Access Control
            </div>
            <h2 className="text-sm font-extrabold text-[#0A192F]">
              Single-Use Invite Codes &amp; Override PINs
            </h2>
            <p className="text-xs text-slate-500">
              Generate one-time authorization tokens for Staff Terminal self-registration or
              locked/expired credential restoration.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => void handleIssueAuthToken('INVITE')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-[#0066FF] hover:bg-blue-100 transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Issue Staff Invite Code</span>
            </button>
            <button
              type="button"
              onClick={() => void handleIssueAuthToken('OVERRIDE')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-[#0A192F] hover:border-blue-300 transition-colors cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5 text-[#0066FF]" />
              <span>Issue Admin Override PIN</span>
            </button>
          </div>

          {issuedToken && (
            <div className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Single-use{' '}
                  <strong>
                    {issuedToken.type === 'INVITE' ? 'Staff Invite Code' : 'Admin Override PIN'}
                  </strong>{' '}
                  (expires in {issuedToken.expiresInMinutes}m):
                </span>
                <code className="rounded-lg bg-white border border-emerald-200 px-2.5 py-1 font-mono text-sm font-extrabold text-[#0A192F]">
                  {issuedToken.token}
                </code>
              </div>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(issuedToken.token);
                  setCopiedToken(true);
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                <span>{copiedToken ? 'Copied' : 'Copy Code'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Pending Staff Onboarding Queue */}
        {pendingRequests.length > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between border-b border-amber-200 bg-amber-50/70 px-6 py-3.5">
              <div>
                <h2 className="text-sm font-extrabold text-[#0A192F]">
                  Pending Staff Registration Requests ({pendingRequests.length})
                </h2>
                <p className="text-xs text-slate-600">
                  Submitted via Staff Terminal Registration awaiting supervisor approval.
                </p>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {pendingRequests.map((req) => (
                <div
                  key={req.id}
                  className="px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#0A192F]">{req.name}</span>
                      <span className="rounded bg-slate-100 border border-slate-200 px-1.5 py-0.5 font-mono text-[10px] font-bold">
                        {req.staffId}
                      </span>
                      <span className="rounded bg-blue-50 border border-blue-200 px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#0066FF]">
                        {req.departmentRole}
                      </span>
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] text-slate-500">{req.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleReviewRequest(req.id, 'APPROVE')}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700 cursor-pointer"
                    >
                      Approve &amp; Provision
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleReviewRequest(req.id, 'REJECT')}
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-semibold text-red-700 hover:bg-red-100 cursor-pointer"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <UserManagementTable
          users={filteredUsers}
          loading={loading}
          onUserUpdated={(updated) =>
            setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))
          }
        />
      </div>

      {/* Provision New User Modal */}
      {provisionOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="provision-user-title"
        >
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 bg-[#0A192F] px-6 py-4 text-white">
              <div className="flex items-center gap-2.5">
                <UserPlus className="w-4 h-4 text-[#00C2FF]" />
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-[#00C2FF]">
                    Two-Role Provisioning
                  </div>
                  <h3 id="provision-user-title" className="text-sm font-extrabold">
                    Provision New XBMS Account
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setProvisionOpen(false)}
                className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleProvisionSubmit} className="p-6 space-y-4">
              {createError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700">
                  {createError}
                </div>
              )}

              <div>
                <label htmlFor="prov-name" className="block text-xs font-semibold text-[#0A192F] mb-1">
                  Full Name *
                </label>
                <input
                  id="prov-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sara Al-Mannai"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-[#0A192F] focus:border-[#0066FF] focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="prov-email" className="block text-xs font-semibold text-[#0A192F] mb-1">
                  Corporate Email *
                </label>
                <input
                  id="prov-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operator@xerotechtechnologies.com"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-[#0A192F] focus:border-[#0066FF] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="prov-role" className="block text-xs font-semibold text-[#0A192F] mb-1">
                    Access Role *
                  </label>
                  <select
                    id="prov-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as 'ADMINISTRATOR' | 'STAFF')}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#0A192F] focus:border-[#0066FF] focus:outline-none"
                  >
                    <option value="STAFF">STAFF</option>
                    <option value="ADMINISTRATOR">ADMINISTRATOR</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="prov-title" className="block text-xs font-semibold text-[#0A192F] mb-1">
                    Job Title
                  </label>
                  <input
                    id="prov-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={role === 'STAFF' ? 'Counter Officer' : 'Finance Director'}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-[#0A192F] focus:border-[#0066FF] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="prov-password"
                  className="block text-xs font-semibold text-[#0A192F] mb-1"
                >
                  Temporary Password *
                </label>
                <input
                  id="prov-password"
                  type="password"
                  required
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  placeholder="Minimum 8 chars (A-Z, 0-9, symbol)"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-[#0A192F] focus:border-[#0066FF] focus:outline-none"
                />
                <PasswordStrengthMeter password={tempPassword} />
              </div>

              <label className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={forceChangeOnNextLogin}
                  onChange={(e) => setForceChangeOnNextLogin(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-[#0066FF] focus:ring-[#0066FF]"
                />
                <span className="text-slate-700 leading-snug">
                  <strong className="text-[#0A192F]">Require password update on first login</strong>
                </span>
              </label>

              <div className="flex items-center justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setProvisionOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !strength.isValid}
                  className="rounded-xl bg-[#0066FF] px-5 py-2 text-xs font-semibold text-white hover:bg-[#0052CC] disabled:opacity-50 cursor-pointer"
                >
                  {creating ? 'Provisioning...' : 'Create User Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
