import axios from 'axios';
import {CheckCircle2, Eye, EyeOff, KeyRound, Lock, ShieldAlert, X} from 'lucide-react';
import {useEffect, useState, type FormEvent} from 'react';
import {
  evaluatePasswordStrength,
  PasswordStrengthMeter,
} from '@/src/components/auth/PasswordStrengthMeter';
import {useAuth} from '@/src/context/AuthContext';
import {apiClient, ensureCsrfToken} from '@/src/lib/api';
import type {AuthUser} from '@/src/types/xbms';

interface ChangePasswordFormProps {
  isOpen?: boolean;
  mandatoryReset?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
}

export function ChangePasswordForm({
  isOpen = true,
  mandatoryReset = false,
  onClose,
  onSuccess,
}: ChangePasswordFormProps) {
  const {user, applyPasswordRotation, logout} = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [signOutOtherSessions, setSignOutOtherSessions] = useState(true);
  const [showPasswords, setShowPasswords] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setSignOutOtherSessions(true);
    setErrorMsg('');
    setSuccessMsg('');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || mandatoryReset || !onClose) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, mandatoryReset, onClose]);

  if (!isOpen) return null;

  const strength = evaluatePasswordStrength(newPassword);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!strength.isValid) {
      setErrorMsg(
        'New password must be at least 8 characters with letters, numbers, and special symbols.',
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('New password and confirmation do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setErrorMsg('New password must be different from your current password.');
      return;
    }

    setSubmitting(true);
    try {
      await ensureCsrfToken();
      const {data} = await apiClient.post<{
        ok: boolean;
        token: string;
        user: AuthUser;
        revokedOtherSessions: number;
      }>('/auth/change-password/', {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
        sign_out_other_sessions: signOutOtherSessions,
      });

      applyPasswordRotation(data.token, data.user);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccessMsg(
        `Password updated successfully.${
          signOutOtherSessions
            ? ` Revoked ${data.revokedOtherSessions} other active session(s).`
            : ''
        }`,
      );
      onSuccess?.();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setErrorMsg(
          (err.response?.data as {error?: string} | undefined)?.error ||
            'Unable to update account password.',
        );
      } else {
        setErrorMsg('Unexpected error updating password.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-password-title"
    >
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-[#0A192F] px-6 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0066FF]/20 text-[#00C2FF]">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-[#00C2FF]">
                {mandatoryReset ? 'Mandatory Security Action' : 'Profile Security'} ·{' '}
                {user?.role || 'XBMS'}
              </div>
              <h2 id="change-password-title" className="text-sm font-extrabold">
                {mandatoryReset ? 'Update Temporary Password' : 'Change Account Password'}
              </h2>
            </div>
          </div>

          {!mandatoryReset && onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close change password modal"
              className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {mandatoryReset && (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                An administrator requires you to replace your temporary password before accessing
                the XBMS workspace.
              </span>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs">
            <div className="font-bold text-[#0A192F]">{user?.name}</div>
            <div className="font-mono text-[11px] text-slate-500">{user?.email}</div>
          </div>

          {errorMsg && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="current-password"
                className="text-xs font-semibold text-[#0A192F]"
              >
                Current Password
              </label>
              <button
                type="button"
                onClick={() => setShowPasswords((prev) => !prev)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0066FF] hover:underline cursor-pointer"
              >
                {showPasswords ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                <span>{showPasswords ? 'Hide' : 'Show'}</span>
              </button>
            </div>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="current-password"
                type={showPasswords ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full rounded-xl border border-slate-200 pl-10 pr-3.5 py-2.5 text-sm text-[#0A192F] focus:border-[#0066FF] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="new-password" className="block text-xs font-semibold text-[#0A192F] mb-1.5">
              New Password
            </label>
            <input
              id="new-password"
              type={showPasswords ? 'text' : 'password'}
              required
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 8 chars (A-Z, 0-9, symbol)"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-[#0A192F] focus:border-[#0066FF] focus:outline-none"
            />
            <PasswordStrengthMeter password={newPassword} />
          </div>

          <div>
            <label
              htmlFor="confirm-new-password"
              className="block text-xs font-semibold text-[#0A192F] mb-1.5"
            >
              Confirm New Password
            </label>
            <input
              id="confirm-new-password"
              type={showPasswords ? 'text' : 'password'}
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-[#0A192F] focus:border-[#0066FF] focus:outline-none"
            />
          </div>

          <label className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={signOutOtherSessions}
              onChange={(e) => setSignOutOtherSessions(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-[#0066FF] focus:ring-[#0066FF]"
            />
            <span className="text-slate-700 leading-snug">
              <strong className="text-[#0A192F]">
                Sign out of all other active browser sessions
              </strong>
              <span className="block text-[11px] text-slate-500">
                Recommended. Immediately invalidates tokens on any other devices.
              </span>
            </span>
          </label>

          <div className="flex items-center justify-end gap-2.5 pt-1">
            {mandatoryReset ? (
              <button
                type="button"
                onClick={() => void logout()}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Sign Out
              </button>
            ) : (
              onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  {successMsg ? 'Done' : 'Cancel'}
                </button>
              )
            )}
            <button
              type="submit"
              disabled={submitting || !strength.isValid}
              className="rounded-xl bg-[#0066FF] px-5 py-2 text-xs font-semibold text-white hover:bg-[#0052CC] disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
