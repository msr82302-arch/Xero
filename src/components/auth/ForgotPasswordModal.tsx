import axios from 'axios';
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  ShieldCheck,
  X,
} from 'lucide-react';
import {useEffect, useState, type FormEvent} from 'react';
import {apiClient, ensureCsrfToken} from '@/src/lib/api';
import {
  evaluatePasswordStrength,
  PasswordStrengthMeter,
} from '@/src/components/auth/PasswordStrengthMeter';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  initialEmail?: string;
  onClose: () => void;
  onResetSuccess?: (email: string) => void;
}

type RecoveryStep = 1 | 2 | 3 | 4;

export function ForgotPasswordModal({
  isOpen,
  initialEmail = '',
  onClose,
  onResetSuccess,
}: ForgotPasswordModalProps) {
  const [step, setStep] = useState<RecoveryStep>(1);
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setEmail(initialEmail);
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setErrorMsg('');
    setInfoMsg('');
  }, [isOpen, initialEmail]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const strength = evaluatePasswordStrength(newPassword);

  const handleRequestOtp = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');
    setSubmitting(true);
    try {
      await ensureCsrfToken();
      const {data} = await apiClient.post<{
        ok: boolean;
        expiresInMinutes: number;
        message: string;
      }>('/auth/forgot-password/', {email: email.trim()});
      setInfoMsg(data.message);
      setStep(2);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setErrorMsg(
          (err.response?.data as {error?: string} | undefined)?.error ||
            'Unable to send recovery OTP.',
        );
      } else {
        setErrorMsg('Unexpected error while requesting recovery code.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const cleanOtp = otp.trim();
    if (!/^\d{6}$/.test(cleanOtp)) {
      setErrorMsg('Enter the exact 6-digit numeric recovery code.');
      return;
    }
    setSubmitting(true);
    try {
      await ensureCsrfToken();
      await apiClient.post('/auth/verify-reset-otp/', {
        email: email.trim(),
        otp_or_token: cleanOtp,
      });
      setStep(3);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setErrorMsg(
          (err.response?.data as {error?: string} | undefined)?.error ||
            'Invalid or expired recovery code.',
        );
      } else {
        setErrorMsg('Unable to verify recovery code.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmReset = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!strength.isValid) {
      setErrorMsg(
        'Password must be at least 8 characters with letters, numbers, and special symbols.',
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('New password and confirmation do not match.');
      return;
    }
    setSubmitting(true);
    try {
      await ensureCsrfToken();
      await apiClient.post('/auth/reset-password-confirm/', {
        email: email.trim(),
        otp_or_token: otp.trim(),
        new_password: newPassword,
      });
      setStep(4);
      onResetSuccess?.(email.trim());
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setErrorMsg(
          (err.response?.data as {error?: string} | undefined)?.error ||
            'Unable to reset password.',
        );
      } else {
        setErrorMsg('Unexpected error while resetting password.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-md p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="forgot-password-title"
    >
      <div className="w-full max-w-md overflow-hidden rounded-3xl glass-modal">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-white/85 px-6 py-4 text-[#0f172a]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 border border-sky-200 text-[#0066FF]">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-[#0066FF]">
                XBMS Identity Recovery · Step {Math.min(step, 3)} of 3
              </div>
              <h2 id="forgot-password-title" className="text-sm font-extrabold text-[#0f172a]">
                Reset Account Password
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close password recovery modal"
            className="rounded-lg p-1.5 text-[#64748b] hover:bg-slate-100 hover:text-[#0f172a] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Indicator */}
        {step < 4 && (
          <div className="grid grid-cols-3 gap-1 bg-slate-50/90 px-6 py-2.5 border-b border-slate-200">
            {[
              {n: 1, label: 'Verify Email'},
              {n: 2, label: '6-Digit OTP'},
              {n: 3, label: 'New Password'},
            ].map((item) => (
              <div key={item.n} className="flex items-center gap-1.5 text-[11px]">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full font-mono text-[10px] font-bold ${
                    step === item.n
                      ? 'bg-[#0066FF] text-white'
                      : step > item.n
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-[#64748b]'
                  }`}
                >
                  {item.n}
                </span>
                <span
                  className={`font-semibold truncate ${
                    step >= item.n ? 'text-[#0f172a]' : 'text-[#64748b]'
                  }`}
                >
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="p-6 space-y-4">
          {errorMsg && (
            <div className="rounded-xl border border-red-200 bg-red-50/90 px-3.5 py-2.5 text-xs font-medium text-red-700">
              {errorMsg}
            </div>
          )}

          {infoMsg && step === 2 && (
            <div className="rounded-xl border border-sky-200 bg-sky-50/90 px-3.5 py-2.5 text-xs font-medium text-[#0f172a]">
              {infoMsg}
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <p className="text-xs text-[#334155] leading-relaxed">
                Enter your registered XeroTech corporate email (STAFF or ADMINISTRATOR). A
                cryptographic 6-digit OTP valid for 15 minutes will be generated.
              </p>

              <div>
                <label
                  htmlFor="forgot-email"
                  className="block text-xs font-semibold text-[#0f172a] mb-1.5"
                >
                  Corporate Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#64748b] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="forgot-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@xerotechtechnologies.com"
                    className="w-full rounded-xl border glass-input pl-10 pr-3.5 py-2.5 text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-[#334155] hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-[#0066FF] px-5 py-2 text-xs font-semibold text-white hover:bg-[#0052CC] disabled:opacity-60 cursor-pointer"
                >
                  {submitting ? 'Generating OTP...' : 'Send 6-Digit OTP'}
                </button>
              </div>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <p className="text-xs text-[#334155] leading-relaxed">
                Enter the 6-digit recovery code issued for{' '}
                <span className="font-mono font-semibold text-[#0066FF]">{email}</span>. Local
                environments output the OTP to the Express server console.
              </p>

              <div>
                <label
                  htmlFor="forgot-otp"
                  className="block text-xs font-semibold text-[#0f172a] mb-1.5"
                >
                  6-Digit Verification OTP
                </label>
                <input
                  id="forgot-otp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full rounded-xl border glass-input px-4 py-3 text-center font-mono text-xl font-extrabold tracking-[0.4em] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg('');
                    setStep(1);
                  }}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-[#334155] hover:bg-slate-50 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Change Email</span>
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-[#0066FF] px-5 py-2 text-xs font-semibold text-white hover:bg-[#0052CC] disabled:opacity-60 cursor-pointer"
                >
                  {submitting ? 'Verifying Code...' : 'Verify OTP & Continue'}
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleConfirmReset} className="space-y-4">
              <p className="text-xs text-[#334155] leading-relaxed">
                Define a new strong password. Completing this reset immediately revokes all active
                sessions for <span className="font-mono font-semibold text-[#0f172a]">{email}</span>.
              </p>

              <div>
                <label
                  htmlFor="forgot-new-pw"
                  className="block text-xs font-semibold text-[#0f172a] mb-1.5"
                >
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="forgot-new-pw"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 8 chars (A-Z, 0-9, symbol)"
                    className="w-full rounded-xl border glass-input pl-3.5 pr-10 py-2.5 text-sm focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-[#0f172a] cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <PasswordStrengthMeter password={newPassword} />
              </div>

              <div>
                <label
                  htmlFor="forgot-confirm-pw"
                  className="block text-xs font-semibold text-[#0f172a] mb-1.5"
                >
                  Confirm New Password
                </label>
                <input
                  id="forgot-confirm-pw"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full rounded-xl border glass-input px-3.5 py-2.5 text-sm focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-[#334155] hover:bg-slate-50 cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting || !strength.isValid}
                  className="rounded-xl bg-[#0066FF] px-5 py-2 text-xs font-semibold text-white hover:bg-[#0052CC] disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Updating Password...' : 'Confirm Password Reset'}
                </button>
              </div>
            </form>
          )}

          {step === 4 && (
            <div className="py-3 text-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#0f172a]">
                  Password Updated &amp; Sessions Revoked
                </h3>
                <p className="mt-1 text-xs text-[#334155] leading-relaxed">
                  Your password for <span className="font-mono font-semibold text-[#0066FF]">{email}</span> has
                  been rotated and logged to the immutable security audit trail.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#0066FF] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#0052CC] cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-white" />
                <span>Return to Sign In</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
