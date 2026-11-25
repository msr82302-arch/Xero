import axios from 'axios';
import {ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, ShieldAlert} from 'lucide-react';
import {useState, type FormEvent} from 'react';
import {
  evaluatePasswordStrength,
  PasswordStrengthMeter,
} from '@/src/components/auth/PasswordStrengthMeter';
import {apiClient, ensureCsrfToken} from '@/src/lib/api';
import type {StaffDepartmentRole} from '@/src/types/xbms';

interface StaffRegistrationPanelProps {
  onBackToLogin: (banner?: {
    type: 'provisioned' | 'pending';
    message: string;
    email?: string;
  }) => void;
}

const DEPARTMENT_ROLES: StaffDepartmentRole[] = [
  'Billing Clerk',
  'Shift Supervisor',
  'Audit Staff',
];

export function StaffRegistrationPanel({onBackToLogin}: StaffRegistrationPanelProps) {
  const [fullName, setFullName] = useState('');
  const [staffId, setStaffId] = useState('');
  const [email, setEmail] = useState('');
  const [departmentRole, setDepartmentRole] = useState<StaffDepartmentRole>('Billing Clerk');
  const [authorizationCode, setAuthorizationCode] = useState('');
  const [requestSupervisorApproval, setRequestSupervisorApproval] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmation, setConfirmation] = useState<{
    outcome: 'PROVISIONED' | 'PENDING_APPROVAL';
    message: string;
  } | null>(null);

  const cleanEmail = email.trim().toLowerCase();
  const isValidCorpEmail =
    cleanEmail.length === 0 || /^[^\s@]+@xerotechtechnologies\.com$/.test(cleanEmail);
  const strength = evaluatePasswordStrength(passcode);
  const passcodesMatch = confirmPasscode.length === 0 || passcode === confirmPasscode;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!/^[^\s@]+@xerotechtechnologies\.com$/.test(cleanEmail)) {
      setErrorMsg('Work email must use the @xerotechtechnologies.com corporate domain.');
      return;
    }
    if (!/^[A-Za-z0-9-]{3,24}$/.test(staffId.trim())) {
      setErrorMsg('Staff ID must be 3–24 alphanumeric characters (e.g. XT-STF-004).');
      return;
    }
    if (!requestSupervisorApproval && !authorizationCode.trim()) {
      setErrorMsg(
        'Enter an Authorization / Invite Code or enable supervisor approval submission.',
      );
      return;
    }
    if (!strength.isValid) {
      setErrorMsg(
        'Staff passcode must be at least 8 characters with letters, numbers, and special symbols.',
      );
      return;
    }
    if (passcode !== confirmPasscode) {
      setErrorMsg('Staff passcodes do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await ensureCsrfToken();
      const {data} = await apiClient.post<{
        outcome: 'PROVISIONED' | 'PENDING_APPROVAL';
        message: string;
      }>('/auth/staff/register/', {
        fullName: fullName.trim(),
        staffId: staffId.trim().toUpperCase(),
        email: cleanEmail,
        departmentRole,
        authorizationCode: requestSupervisorApproval ? '' : authorizationCode.trim(),
        passcode,
        confirmPasscode,
        requestSupervisorApproval,
      });

      setConfirmation({
        outcome: data.outcome,
        message:
          data.outcome === 'PROVISIONED'
            ? 'Terminal credentials provisioned! Your Staff Billing Terminal account is now active.'
            : 'Account request submitted! An XBMS Administrator will review and activate your terminal credentials.',
      });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setErrorMsg(
          (err.response?.data as {error?: string} | undefined)?.error ||
            'Unable to complete Staff Terminal registration.',
        );
      } else {
        setErrorMsg('Unexpected error submitting Staff Terminal registration.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmation) {
    return (
      <div className="mt-4 space-y-4 transition-all duration-200">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-xs text-emerald-800 space-y-2">
          <div className="flex items-center gap-2 font-bold text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>
              {confirmation.outcome === 'PROVISIONED'
                ? 'Terminal Credentials Provisioned'
                : 'Account Request Submitted'}
            </span>
          </div>
          <p className="leading-relaxed text-emerald-800">{confirmation.message}</p>
          <div className="pt-1 font-mono text-[11px] text-emerald-700">
            {staffId.trim().toUpperCase()} · {cleanEmail} · {departmentRole}
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            onBackToLogin({
              type: confirmation.outcome === 'PROVISIONED' ? 'provisioned' : 'pending',
              message: confirmation.message,
              email: confirmation.outcome === 'PROVISIONED' ? cleanEmail : undefined,
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
      <div className="flex items-start gap-2.5 rounded-xl border border-sky-200 bg-sky-50/90 px-3.5 py-2.5 text-xs text-[#334155]">
        <ShieldAlert className="w-4 h-4 text-[#0066FF] shrink-0 mt-0.5" />
        <span>New staff accounts require valid authorization code or supervisor approval.</span>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-red-200 bg-red-50/90 px-3.5 py-2.5 text-xs font-medium text-red-700">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="reg-full-name"
              className="block text-xs font-semibold text-[#0f172a] mb-1"
            >
              Full Name *
            </label>
            <input
              id="reg-full-name"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Sara Al-Mannai"
              className="w-full rounded-xl border glass-input px-3 py-2 text-xs sm:text-sm focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="reg-staff-id"
              className="block text-xs font-semibold text-[#0f172a] mb-1"
            >
              Staff ID *
            </label>
            <input
              id="reg-staff-id"
              type="text"
              required
              value={staffId}
              onChange={(e) => setStaffId(e.target.value.toUpperCase())}
              placeholder="XT-STF-004"
              className="w-full rounded-xl border glass-input px-3 py-2 font-mono text-xs sm:text-sm uppercase focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="reg-work-email"
            className="block text-xs font-semibold text-[#0f172a] mb-1"
          >
            Work Email (@xerotechtechnologies.com) *
          </label>
          <input
            id="reg-work-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="operator@xerotechtechnologies.com"
            className={`w-full rounded-xl border glass-input px-3.5 py-2 text-xs sm:text-sm focus:outline-none ${
              isValidCorpEmail ? '' : '!border-red-400'
            }`}
          />
          {!isValidCorpEmail && (
            <p className="mt-1 text-[11px] font-medium text-red-700">
              Corporate domain required: @xerotechtechnologies.com
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="reg-dept-role"
              className="block text-xs font-semibold text-[#0f172a] mb-1"
            >
              Department / Terminal Role *
            </label>
            <select
              id="reg-dept-role"
              value={departmentRole}
              onChange={(e) => setDepartmentRole(e.target.value as StaffDepartmentRole)}
              className="w-full rounded-xl border glass-input px-3 py-2 text-xs font-semibold focus:outline-none"
            >
              {DEPARTMENT_ROLES.map((roleOpt) => (
                <option key={roleOpt} value={roleOpt}>
                  {roleOpt}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="reg-invite-code"
              className="block text-xs font-semibold text-[#0f172a] mb-1"
            >
              Authorization / Invite Code
            </label>
            <input
              id="reg-invite-code"
              type="text"
              disabled={requestSupervisorApproval}
              value={authorizationCode}
              onChange={(e) => setAuthorizationCode(e.target.value)}
              placeholder={requestSupervisorApproval ? 'Pending approval' : 'XT-INV-XXXXXX'}
              className="w-full rounded-xl border glass-input px-3 py-2 font-mono text-xs disabled:opacity-45 focus:outline-none"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 rounded-xl glass-panel-subtle px-3 py-2 text-[11px] text-[#334155] cursor-pointer">
          <input
            type="checkbox"
            checked={requestSupervisorApproval}
            onChange={(e) => setRequestSupervisorApproval(e.target.checked)}
            className="rounded border-slate-300 bg-white text-[#0066FF] focus:ring-[#0066FF]"
          />
          <span>
            No invite code yet — submit onboarding request for{' '}
            <strong className="text-[#0f172a]">Administrator Approval</strong>
          </span>
        </label>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label
              htmlFor="reg-passcode"
              className="block text-xs font-semibold text-[#0f172a]"
            >
              Create Staff Passcode *
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
            <KeyRound className="w-4 h-4 text-[#64748b] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="reg-passcode"
              type={showPasscode ? 'text' : 'password'}
              required
              autoComplete="new-password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Min 8 chars (A-Z, 0-9, symbol)"
              className="w-full rounded-xl border glass-input pl-9 pr-3 py-2 text-xs sm:text-sm focus:outline-none"
            />
          </div>
          <PasswordStrengthMeter password={passcode} />
        </div>

        <div>
          <label
            htmlFor="reg-confirm-passcode"
            className="block text-xs font-semibold text-[#0f172a] mb-1"
          >
            Confirm Passcode *
          </label>
          <input
            id="reg-confirm-passcode"
            type={showPasscode ? 'text' : 'password'}
            required
            autoComplete="new-password"
            value={confirmPasscode}
            onChange={(e) => setConfirmPasscode(e.target.value)}
            placeholder="Re-enter staff passcode"
            className={`w-full rounded-xl border glass-input px-3.5 py-2 text-xs sm:text-sm focus:outline-none ${
              passcodesMatch ? '' : '!border-red-400'
            }`}
          />
          {!passcodesMatch && (
            <p className="mt-1 text-[11px] font-medium text-red-700">Passcodes do not match.</p>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#0066FF] px-4 py-3 text-sm font-semibold text-white hover:bg-[#0052CC] disabled:opacity-60 transition-colors cursor-pointer"
        >
          <span className="font-mono font-bold">&gt;_</span>
          <span>{submitting ? 'Processing Registration...' : 'Provision Staff Account'}</span>
        </button>
      </form>

      <div className="pt-2 text-center">
        <button
          type="button"
          onClick={() => onBackToLogin()}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#334155] hover:text-[#0066FF] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Terminal Login</span>
        </button>
      </div>
    </div>
  );
}
