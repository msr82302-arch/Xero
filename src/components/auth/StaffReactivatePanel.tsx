import axios from 'axios';
import {ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, RefreshCw} from 'lucide-react';
import {useState, type FormEvent} from 'react';
import {
  evaluatePasswordStrength,
  PasswordStrengthMeter,
} from '@/src/components/auth/PasswordStrengthMeter';
import {apiClient, ensureCsrfToken} from '@/src/lib/api';
import type {ReactivationReason} from '@/src/types/xbms';

interface StaffReactivatePanelProps {
  initialIdentifier?: string;
  onBackToLogin: (banner?: {
    type: 'provisioned' | 'pending';
    message: string;
    email?: string;
  }) => void;
}

const REACTIVATION_REASONS: ReactivationReason[] = [
  'Expired Credentials',
  'Device Transfer',
  'Account Locked',
  'Other',
];

export function StaffReactivatePanel({
  initialIdentifier = '',
  onBackToLogin,
}: StaffReactivatePanelProps) {
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [reason, setReason] = useState<ReactivationReason>('Expired Credentials');
  const [overridePin, setOverridePin] = useState('');
  const [newPasscode, setNewPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [reactivatedEmail, setReactivatedEmail] = useState<string | null>(null);

  const strength = evaluatePasswordStrength(newPasscode);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!identifier.trim()) {
      setErrorMsg('Enter your existing Staff Email or Staff ID.');
      return;
    }
    if (!overridePin.trim()) {
      setErrorMsg('Admin Override Token / Verification PIN is required.');
      return;
    }
    if (!strength.isValid) {
      setErrorMsg(
        'New staff passcode must be at least 8 characters with letters, numbers, and special symbols.',
      );
      return;
    }

    setSubmitting(true);
    try {
      await ensureCsrfToken();
      const {data} = await apiClient.post<{
        ok: boolean;
        user: {email: string; staffId?: string};
        message: string;
      }>('/auth/staff/reactivate/', {
        identifier: identifier.trim(),
        reason,
        overridePin: overridePin.trim(),
        newPasscode,
      });

      setReactivatedEmail(data.user.email);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setErrorMsg(
          (err.response?.data as {error?: string} | undefined)?.error ||
            'Unable to re-initialize staff account.',
        );
      } else {
        setErrorMsg('Unexpected error during staff credential restoration.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (reactivatedEmail) {
    return (
      <div className="mt-4 space-y-4 transition-all duration-200">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900 space-y-2">
          <div className="flex items-center gap-2 font-bold text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Terminal Credentials Provisioned</span>
          </div>
          <p className="leading-relaxed text-emerald-800">
            Staff account <span className="font-mono font-semibold">{reactivatedEmail}</span> has
            been re-initialized ({reason}) and all previous terminal sessions were revoked.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            onBackToLogin({
              type: 'provisioned',
              message:
                'Terminal credentials provisioned. Sign in below with your new Staff Passcode.',
              email: reactivatedEmail,
            })
          }
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#0066FF] px-4 py-3 text-sm font-semibold text-white hover:bg-[#0052CC] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Terminal Login</span>
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4 transition-all duration-200">
      <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-700">
        <RefreshCw className="w-4 h-4 text-[#0066FF] shrink-0 mt-0.5" />
        <span>
          Restore locked, expired, or wiped Staff Billing Terminal credentials using a valid
          Administrator Override PIN or recovery OTP.
        </span>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label
            htmlFor="reactivate-identifier"
            className="block text-xs font-semibold text-[#0A192F] mb-1"
          >
            Existing Staff Email or Staff ID *
          </label>
          <input
            id="reactivate-identifier"
            type="text"
            required
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="staff@xerotechtechnologies.com or XT-STF-001"
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs sm:text-sm text-[#0A192F] focus:border-[#0066FF] focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="reactivate-reason"
              className="block text-xs font-semibold text-[#0A192F] mb-1"
            >
              Reason for Re-creation *
            </label>
            <select
              id="reactivate-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value as ReactivationReason)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#0A192F] focus:border-[#0066FF] focus:outline-none"
            >
              {REACTIVATION_REASONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="reactivate-pin"
              className="block text-xs font-semibold text-[#0A192F] mb-1"
            >
              Admin Override Token / PIN *
            </label>
            <input
              id="reactivate-pin"
              type="text"
              required
              value={overridePin}
              onChange={(e) => setOverridePin(e.target.value)}
              placeholder="OVR-XXXXXX or OTP"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs text-[#0A192F] focus:border-[#0066FF] focus:outline-none"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label
              htmlFor="reactivate-passcode"
              className="block text-xs font-semibold text-[#0A192F]"
            >
              New Staff Passcode *
            </label>
            <button
              type="button"
              onClick={() => setShowPasscode((prev) => !prev)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0066FF] hover:underline cursor-pointer"
            >
              {showPasscode ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              <span>{showPasscode ? 'Hide' : 'Show'}</span>
            </button>
          </div>
          <div className="relative">
            <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="reactivate-passcode"
              type={showPasscode ? 'text' : 'password'}
              required
              autoComplete="new-password"
              value={newPasscode}
              onChange={(e) => setNewPasscode(e.target.value)}
              placeholder="Min 8 chars (A-Z, 0-9, symbol)"
              className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs sm:text-sm text-[#0A192F] focus:border-[#0066FF] focus:outline-none"
            />
          </div>
          <PasswordStrengthMeter password={newPasscode} />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#0066FF] px-4 py-3 text-sm font-semibold text-white hover:bg-[#0052CC] disabled:opacity-60 transition-colors cursor-pointer"
        >
          <span className="font-mono font-bold">&gt;_</span>
          <span>{submitting ? 'Re-initializing Account...' : 'Re-initialize Staff Account'}</span>
        </button>
      </form>

      <div className="pt-2 text-center">
        <button
          type="button"
          onClick={() => onBackToLogin()}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#0066FF] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Terminal Login</span>
        </button>
      </div>
    </div>
  );
}
