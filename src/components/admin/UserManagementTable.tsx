import axios from 'axios';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
  Unlock,
  X,
} from 'lucide-react';
import {useState, type FormEvent} from 'react';
import {
  evaluatePasswordStrength,
  PasswordStrengthMeter,
} from '@/src/components/auth/PasswordStrengthMeter';
import {useAuth} from '@/src/context/AuthContext';
import {apiClient, ensureCsrfToken} from '@/src/lib/api';
import type {SystemUserRecord} from '@/src/types/xbms';

interface UserManagementTableProps {
  users: SystemUserRecord[];
  loading: boolean;
  onUserUpdated: (updated: SystemUserRecord) => void;
}

function formatBahrainShortDate(isoOrLabel: string): string {
  if (!isoOrLabel || isoOrLabel === 'Never') return 'Never';
  const parsed = new Date(isoOrLabel);
  if (Number.isNaN(parsed.getTime())) return isoOrLabel;
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bahrain',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(parsed);
}

export function UserManagementTable({
  users,
  loading,
  onUserUpdated,
}: UserManagementTableProps) {
  const {user: currentUser, logout} = useAuth();
  const [resetTarget, setResetTarget] = useState<SystemUserRecord | null>(null);
  const [resetMode, setResetMode] = useState<'temp_password' | 'otp'>('temp_password');
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [showTempPassword, setShowTempPassword] = useState(false);
  const [forceChangeOnNextLogin, setForceChangeOnNextLogin] = useState(true);
  const [submittingReset, setSubmittingReset] = useState(false);
  const [statusBusyId, setStatusBusyId] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState('');
  const [feedbackSuccess, setFeedbackSuccess] = useState('');

  const strength = evaluatePasswordStrength(temporaryPassword);

  const openResetModal = (target: SystemUserRecord) => {
    setResetTarget(target);
    setResetMode('temp_password');
    setTemporaryPassword('');
    setShowTempPassword(false);
    setForceChangeOnNextLogin(true);
    setFeedbackError('');
    setFeedbackSuccess('');
  };

  const handleResetSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    setFeedbackError('');
    setFeedbackSuccess('');

    if (resetMode === 'temp_password' && !strength.isValid) {
      setFeedbackError(
        'Temporary password must be at least 8 characters with letters, numbers, and special symbols.',
      );
      return;
    }

    setSubmittingReset(true);
    try {
      await ensureCsrfToken();
      if (resetMode === 'temp_password') {
        const isSelfReset = currentUser?.id === resetTarget.id;
        const {data} = await apiClient.post<{user: SystemUserRecord}>(
          `/admin/users/${resetTarget.id}/reset-password/`,
          {
            temporary_password: temporaryPassword,
            force_change_on_next_login: forceChangeOnNextLogin,
          },
        );
        onUserUpdated(data.user);
        setTemporaryPassword('');
        if (isSelfReset && forceChangeOnNextLogin) {
          setResetTarget(null);
          await logout();
          return;
        }
        setFeedbackSuccess(
          isSelfReset
            ? `Password updated for ${data.user.email}. All other browser sessions were revoked.`
            : `Forced password reset completed for ${data.user.email}. All active sessions revoked.`,
        );
      } else {
        await apiClient.post('/auth/forgot-password/', {email: resetTarget.email});
        setFeedbackSuccess(
          `6-digit recovery OTP dispatched for ${resetTarget.email} (valid 15 minutes).`,
        );
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setFeedbackError(
          (err.response?.data as {error?: string} | undefined)?.error ||
            'Unable to execute password reset.',
        );
      } else {
        setFeedbackError('Unexpected error executing password reset.');
      }
    } finally {
      setSubmittingReset(false);
    }
  };

  const handleToggleStatus = async (target: SystemUserRecord) => {
    const nextStatus = target.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';
    setStatusBusyId(target.id);
    try {
      await ensureCsrfToken();
      const {data} = await apiClient.patch<{user: SystemUserRecord}>(
        `/admin/users/${target.id}/status/`,
        {status: nextStatus},
      );
      onUserUpdated(data.user);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setFeedbackError(
          (err.response?.data as {error?: string} | undefined)?.error ||
            'Unable to change account status.',
        );
      }
    } finally {
      setStatusBusyId(null);
    }
  };

  return (
    <>
      <div className="rounded-2xl glass-surface overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 px-6 py-4">
          <div>
            <h2 className="text-sm font-extrabold text-[#0f172a]">
              Registered System Accounts ({users.length})
            </h2>
            <p className="text-xs text-[#334155]">
              Strict Two-Role Governance · Password updates and forced resets are logged to the
              immutable audit trail.
            </p>
          </div>
          <span className="rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-[#0066FF]">
            ADMINISTRATOR · STAFF ONLY
          </span>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({length: 3}).map((_, idx) => (
              <div key={idx} className="h-12 rounded-xl bg-slate-200/70 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[#475569] font-semibold">
                  <th className="py-3.5 px-6">Account Name</th>
                  <th className="py-3.5 px-4">Login Email</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Account Status</th>
                  <th className="py-3.5 px-4">Last Password Change</th>
                  <th className="py-3.5 px-6 text-right">Security Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {users.map((item) => {
                  const isSelf = currentUser?.id === item.id;
                  const isLocked = item.status === 'LOCKED';
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#0f172a]">{item.name}</span>
                          {item.staffId && (
                            <span className="rounded bg-slate-100 border border-slate-200 px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#334155]">
                              {item.staffId}
                            </span>
                          )}
                          {isSelf && (
                            <span className="rounded bg-sky-50 border border-sky-200 px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#0066FF]">
                              YOU
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#64748b]">
                          {item.departmentRole ? `${item.departmentRole} · ` : ''}
                          {item.title}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#334155] whitespace-nowrap">
                        {item.email}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold ${
                            item.role === 'ADMINISTRATOR'
                              ? 'border-sky-200 bg-sky-50 text-[#0066FF]'
                              : 'border-slate-200 bg-slate-100 text-[#334155]'
                          }`}
                        >
                          <ShieldCheck className="w-3 h-3" />
                          <span>{item.role}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-block rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold ${
                              isLocked
                                ? 'border-red-200 bg-red-50 text-red-700'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {item.status}
                          </span>
                          {item.requirePasswordChange && (
                            <span
                              title="Must change password on next sign-in"
                              className="rounded-md border border-amber-300 bg-amber-50 px-1.5 py-0.5 font-mono text-[9px] font-bold text-amber-800"
                            >
                              PW CHANGE REQ
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#64748b] tabular-nums whitespace-nowrap">
                        {formatBahrainShortDate(item.lastPasswordChangeAt)}
                      </td>

                      <td className="py-3.5 px-6 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openResetModal(item)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-[11px] font-semibold text-[#0066FF] hover:bg-[#0066FF] hover:text-white transition-colors cursor-pointer"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>Reset Password</span>
                          </button>

                          {!isSelf && (
                            <button
                              type="button"
                              disabled={statusBusyId === item.id}
                              onClick={() => void handleToggleStatus(item)}
                              title={isLocked ? 'Unlock account' : 'Lock account'}
                              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50 ${
                                isLocked
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                  : 'border-slate-300 bg-white text-[#334155] hover:bg-red-50 hover:text-red-700 hover:border-red-200'
                              }`}
                            >
                              {isLocked ? (
                                <>
                                  <Unlock className="w-3.5 h-3.5" />
                                  <span>Unlock</span>
                                </>
                              ) : (
                                <>
                                  <Lock className="w-3.5 h-3.5" />
                                  <span>Lock</span>
                                </>
                              )}
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

      {/* Admin Master Password Reset Modal */}
      {resetTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-reset-modal-title"
        >
          <div className="w-full max-w-md overflow-hidden rounded-3xl glass-modal">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white/95 px-6 py-4 text-[#0f172a]">
              <div className="flex items-center gap-2.5">
                <KeyRound className="w-4 h-4 text-[#0066FF]" />
                <div>
                  <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#0066FF]">
                    Administrator Override · {resetTarget.role}
                  </div>
                  <h3 id="admin-reset-modal-title" className="text-sm font-extrabold text-[#0f172a]">
                    Reset Password for {resetTarget.name}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResetTarget(null)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-[#0f172a] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResetSubmit} className="p-6 space-y-4">
              <div className="rounded-xl glass-panel-subtle px-3.5 py-2.5 text-xs">
                <div className="font-mono text-[11px] font-semibold text-[#0f172a]">
                  {resetTarget.email}
                </div>
                <div className="text-[11px] text-[#64748b] mt-0.5">
                  Executing an override revokes all existing browser sessions for this account.
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 rounded-xl glass-panel-subtle p-1">
                <button
                  type="button"
                  onClick={() => {
                    setResetMode('temp_password');
                    setFeedbackError('');
                    setFeedbackSuccess('');
                  }}
                  className={`rounded-lg py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                    resetMode === 'temp_password'
                      ? 'bg-[#0066FF] text-white'
                      : 'text-[#475569] hover:text-[#0f172a]'
                  }`}
                >
                  Set Temporary Password
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setResetMode('otp');
                    setFeedbackError('');
                    setFeedbackSuccess('');
                  }}
                  className={`rounded-lg py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                    resetMode === 'otp'
                      ? 'bg-[#0066FF] text-white'
                      : 'text-[#475569] hover:text-[#0f172a]'
                  }`}
                >
                  Dispatch Reset OTP
                </button>
              </div>

              {feedbackError && (
                <div className="rounded-xl border border-red-200 bg-red-50/90 px-3.5 py-2.5 text-xs font-medium text-red-700">
                  {feedbackError}
                </div>
              )}

              {feedbackSuccess && (
                <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50/90 px-3.5 py-2.5 text-xs font-medium text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{feedbackSuccess}</span>
                </div>
              )}

              {resetMode === 'temp_password' ? (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="admin-temp-pw"
                        className="text-xs font-semibold text-[#0f172a]"
                      >
                        Temporary Password
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowTempPassword((prev) => !prev)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0066FF] hover:underline cursor-pointer"
                      >
                        {showTempPassword ? (
                          <EyeOff className="w-3 h-3" />
                        ) : (
                          <Eye className="w-3 h-3" />
                        )}
                        <span>{showTempPassword ? 'Hide' : 'Show'}</span>
                      </button>
                    </div>
                    <input
                      id="admin-temp-pw"
                      type={showTempPassword ? 'text' : 'password'}
                      required
                      value={temporaryPassword}
                      onChange={(e) => setTemporaryPassword(e.target.value)}
                      placeholder="Minimum 8 chars (A-Z, 0-9, symbol)"
                      className="w-full rounded-xl border px-3.5 py-2.5 text-sm glass-input focus:outline-none"
                    />
                    <PasswordStrengthMeter password={temporaryPassword} />
                  </div>

                  <label className="flex items-start gap-2.5 rounded-xl glass-panel-subtle p-3 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={forceChangeOnNextLogin}
                      onChange={(e) => setForceChangeOnNextLogin(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 bg-white text-[#0066FF] focus:ring-[#0066FF]"
                    />
                    <span className="text-[#334155] leading-snug">
                      <strong className="text-[#0f172a]">
                        Force password change on next login
                      </strong>
                      <span className="block text-[11px] text-[#64748b]">
                        User must choose a private password immediately after signing in.
                      </span>
                    </span>
                  </label>
                </>
              ) : (
                <div className="flex items-start gap-2.5 rounded-xl border border-sky-200 bg-sky-50/90 p-3.5 text-xs text-[#334155]">
                  <Mail className="w-4 h-4 text-[#0066FF] shrink-0 mt-0.5" />
                  <span>
                    Generates a time-limited 6-digit OTP (15 minutes) for{' '}
                    <span className="font-mono font-semibold text-[#0f172a]">{resetTarget.email}</span> so the
                    user can recover access independently via the Forgot Password flow.
                  </span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setResetTarget(null)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-[#334155] hover:bg-slate-50 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={
                    submittingReset || (resetMode === 'temp_password' && !strength.isValid)
                  }
                  className="rounded-xl bg-[#0066FF] px-5 py-2 text-xs font-semibold text-white hover:bg-[#0052CC] disabled:opacity-50 cursor-pointer"
                >
                  {submittingReset
                    ? 'Applying...'
                    : resetMode === 'temp_password'
                      ? 'Force Reset Password'
                      : 'Send Recovery OTP'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
