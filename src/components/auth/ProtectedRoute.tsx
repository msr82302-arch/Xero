import axios from 'axios';
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  RefreshCw,
  ShieldCheck,
  Terminal,
  UserPlus,
} from 'lucide-react';
import {useEffect, useState, type FormEvent, type ReactNode} from 'react';
import {Link} from 'react-router-dom';
import {ChangePasswordForm} from '@/src/components/auth/ChangePasswordForm';
import {ForgotPasswordModal} from '@/src/components/auth/ForgotPasswordModal';
import {StaffReactivatePanel} from '@/src/components/auth/StaffReactivatePanel';
import {StaffRegistrationPanel} from '@/src/components/auth/StaffRegistrationPanel';
import {useAuth} from '@/src/context/AuthContext';
import type {UserRole} from '@/src/types/xbms';

type StaffAuthViewMode = 'login' | 'register' | 'reactivate';

interface ProtectedRouteProps {
  requiredRole: UserRole;
  children: ReactNode;
}

export function ProtectedRoute({requiredRole, children}: ProtectedRouteProps) {
  const {
    user,
    loading,
    setupRequired,
    staffSetupRequired,
    login,
    setupAdmin,
    loginStaff,
    setupStaff,
    logout,
  } = useAuth();

  const isStaffPortal = requiredRole === 'STAFF';
  const activeSetupRequired = isStaffPortal ? staffSetupRequired : setupRequired;

  const [email, setEmail] = useState(
    isStaffPortal ? 'staff@xerotechtechnologies.com' : 'admin@xerotechtechnologies.com',
  );
  const [name, setName] = useState(
    isStaffPortal ? 'Senior Billing Officer' : 'Principal Administrator',
  );
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [forgotOpen, setForgotOpen] = useState(false);
  const [staffViewMode, setStaffViewMode] = useState<StaffAuthViewMode>('login');
  const [staffBanner, setStaffBanner] = useState<{
    type: 'provisioned' | 'pending';
    message: string;
  } | null>(null);

  useEffect(() => {
    setEmail(
      isStaffPortal ? 'staff@xerotechtechnologies.com' : 'admin@xerotechtechnologies.com',
    );
    setName(isStaffPortal ? 'Senior Billing Officer' : 'Principal Administrator');
    setErrorMsg('');
    setPasscode('');
    setConfirmPasscode('');
    setShowPasscode(false);
    setStaffViewMode('login');
    setStaffBanner(null);
  }, [isStaffPortal]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 h-10 w-10 rounded-xl bg-[#0A192F]/5 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-[#0066FF]" />
          </div>
          <p className="text-sm font-semibold text-[#0A192F]">
            Verifying XBMS {isStaffPortal ? 'Staff Counter' : 'Executive'} Session...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    const handleSubmit = async (e: FormEvent) => {
      e.preventDefault();
      setErrorMsg('');
      if (activeSetupRequired && passcode !== confirmPasscode) {
        setErrorMsg('Passcodes do not match.');
        return;
      }
      setSubmitting(true);
      try {
        if (isStaffPortal) {
          if (staffSetupRequired) {
            await setupStaff(email, name, passcode);
          } else {
            await loginStaff(email, passcode);
          }
        } else if (setupRequired) {
          await setupAdmin(email, name, passcode);
        } else {
          await login(email, passcode);
        }
        setPasscode('');
        setConfirmPasscode('');
      } catch (err) {
        if (axios.isAxiosError(err)) {
          setErrorMsg(
            (err.response?.data as {error?: string} | undefined)?.error ||
              'Authentication failed. Verify your credentials.',
          );
        } else {
          setErrorMsg('Unexpected error while authenticating.');
        }
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <div className="min-h-screen bg-[#0A192F] architectural-grid flex flex-col justify-center items-center p-4 sm:p-6">
        <div className="w-full max-w-md">
          <div className="mb-5 flex items-center justify-between">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Public Portfolio</span>
            </Link>
            <span className="font-mono text-[11px] uppercase tracking-wider text-[#00C2FF]">
              CR 201130-1
            </span>
          </div>

          <div className="rounded-3xl border border-white/15 bg-white p-7 sm:p-8 shadow-2xl transition-all duration-200">
            <div className="flex items-center gap-3 pb-5 border-b border-slate-100">
              <img
                src="/assets/aistudio/logo_e1b61aee.png"
                alt="XeroTech Emblem"
                className="h-10 w-10 object-contain rounded-lg bg-[#0A192F] p-1.5"
                referrerPolicy="no-referrer"
              />
              <div>
                <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#0066FF]">
                  {isStaffPortal
                    ? staffViewMode === 'register'
                      ? 'XBMS Phase 3 · Staff Onboarding'
                      : staffViewMode === 'reactivate'
                        ? 'XBMS Phase 3 · Credential Recovery'
                        : 'XBMS Phase 3 · Staff Terminal Gate'
                    : 'XBMS Phase 2 · Executive Gate'}
                </div>
                <h1 className="text-lg font-extrabold text-[#0A192F]">
                  {isStaffPortal
                    ? activeSetupRequired
                      ? 'Initialize Staff Billing Terminal'
                      : staffViewMode === 'register'
                        ? 'Staff Terminal Registration'
                        : staffViewMode === 'reactivate'
                          ? 'Re-create / Restore Staff Credentials'
                          : 'Staff Billing Terminal Login'
                    : activeSetupRequired
                      ? 'Initialize Administrator Access'
                      : 'Executive Command Center Login'}
                </h1>
              </div>
            </div>

            {isStaffPortal && !activeSetupRequired && staffViewMode === 'register' ? (
              <StaffRegistrationPanel
                onBackToLogin={(banner) => {
                  setStaffViewMode('login');
                  setErrorMsg('');
                  setPasscode('');
                  setConfirmPasscode('');
                  if (banner) {
                    setStaffBanner({type: banner.type, message: banner.message});
                    if (banner.email) setEmail(banner.email);
                  }
                }}
              />
            ) : isStaffPortal && !activeSetupRequired && staffViewMode === 'reactivate' ? (
              <StaffReactivatePanel
                initialIdentifier={email}
                onBackToLogin={(banner) => {
                  setStaffViewMode('login');
                  setErrorMsg('');
                  setPasscode('');
                  setConfirmPasscode('');
                  if (banner) {
                    setStaffBanner({type: banner.type, message: banner.message});
                    if (banner.email) setEmail(banner.email);
                  }
                }}
              />
            ) : (
              <>
                <p className="mt-4 text-xs text-slate-600 leading-relaxed">
                  {isStaffPortal
                    ? activeSetupRequired
                      ? 'First-run terminal provisioning: set your Staff Counter operator email and passcode (min. 8 characters) for rapid counter receipt issuance.'
                      : 'Restricted Desktop Billing Workstation. Sign in with your STAFF operational credentials. Administrative endpoints remain strictly blocked.'
                    : activeSetupRequired
                      ? 'First-run security setup: define your Principal Administrator email and passcode (min. 8 characters) to unlock the CR 201130-1 executive ledger.'
                      : 'Strict Two-Role Governance active. Sign in with your verified ADMINISTRATOR credentials to manage receipts, quotations, and audit records.'}
                </p>

                {staffBanner && (
                  <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{staffBanner.message}</span>
                  </div>
                )}

                {errorMsg && (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700">
                    {errorMsg}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                  {activeSetupRequired && (
                    <div>
                      <label
                        htmlFor="auth-operator-name"
                        className="block text-xs font-semibold text-[#0A192F] mb-1.5"
                      >
                        {isStaffPortal ? 'Staff Operator Name' : 'Administrator Name'}
                      </label>
                      <input
                        id="auth-operator-name"
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-[#0A192F] focus:border-[#0066FF] focus:outline-none"
                      />
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="auth-operator-email"
                      className="block text-xs font-semibold text-[#0A192F] mb-1.5"
                    >
                      {isStaffPortal
                        ? activeSetupRequired
                          ? 'Staff Terminal Email'
                          : 'Staff Terminal Email or Staff ID'
                        : 'Corporate Administrator Email'}
                    </label>
                    <input
                      id="auth-operator-email"
                      type={isStaffPortal && !activeSetupRequired ? 'text' : 'email'}
                      required
                      autoComplete="username"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-[#0A192F] focus:border-[#0066FF] focus:outline-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="auth-operator-passcode"
                        className="block text-xs font-semibold text-[#0A192F]"
                      >
                        {activeSetupRequired
                          ? 'Create Passcode (min 8 chars)'
                          : isStaffPortal
                            ? 'Staff Passcode'
                            : 'Administrator Passcode'}
                      </label>
                      {!activeSetupRequired && (
                        <button
                          type="button"
                          onClick={() => setForgotOpen(true)}
                          className="text-[11px] font-semibold text-[#0066FF] hover:underline cursor-pointer"
                        >
                          Forgot Password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="auth-operator-passcode"
                        type={showPasscode ? 'text' : 'password'}
                        required
                        minLength={activeSetupRequired ? 8 : 1}
                        autoComplete={activeSetupRequired ? 'new-password' : 'current-password'}
                        value={passcode}
                        onChange={(e) => setPasscode(e.target.value)}
                        placeholder="Enter secure passcode"
                        className="w-full rounded-xl border border-slate-200 pl-10 pr-10 py-2.5 text-sm text-[#0A192F] focus:border-[#0066FF] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasscode((prev) => !prev)}
                        aria-label={showPasscode ? 'Hide passcode' : 'Show passcode'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {activeSetupRequired && (
                    <div>
                      <label
                        htmlFor="auth-confirm-passcode"
                        className="block text-xs font-semibold text-[#0A192F] mb-1.5"
                      >
                        Confirm Passcode
                      </label>
                      <input
                        id="auth-confirm-passcode"
                        type={showPasscode ? 'text' : 'password'}
                        required
                        minLength={8}
                        autoComplete="new-password"
                        value={confirmPasscode}
                        onChange={(e) => setConfirmPasscode(e.target.value)}
                        placeholder="Re-enter passcode"
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-[#0A192F] focus:border-[#0066FF] focus:outline-none"
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#0066FF] px-4 py-3 text-sm font-semibold text-white hover:bg-[#0052CC] disabled:opacity-60 transition-colors cursor-pointer"
                  >
                    {isStaffPortal ? <Terminal className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    <span>
                      {submitting
                        ? 'Verifying Credentials...'
                        : activeSetupRequired
                          ? isStaffPortal
                            ? 'Initialize & Open Staff Terminal'
                            : 'Initialize & Enter Command Center'
                          : isStaffPortal
                            ? 'Sign In to Staff Terminal'
                            : 'Sign In to Executive Console'}
                    </span>
                  </button>
                </form>

                {isStaffPortal && !activeSetupRequired && (
                  <div className="mt-4 pt-3.5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMsg('');
                        setStaffBanner(null);
                        setPasscode('');
                        setConfirmPasscode('');
                        setStaffViewMode('register');
                      }}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-[11px] font-semibold text-[#0A192F] hover:border-blue-300 hover:text-[#0066FF] transition-colors cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5 text-[#0066FF]" />
                      <span>Request / Create Staff Account</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setErrorMsg('');
                        setStaffBanner(null);
                        setPasscode('');
                        setConfirmPasscode('');
                        setStaffViewMode('reactivate');
                      }}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-[11px] font-semibold text-[#0A192F] hover:border-blue-300 hover:text-[#0066FF] transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-[#0066FF]" />
                      <span>Re-activate / Reset Staff Account</span>
                    </button>
                  </div>
                )}
              </>
            )}

            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-400 font-mono">Two-Role Isolation</span>
              <Link
                to={isStaffPortal ? '/admin/dashboard' : '/terminal'}
                className="font-semibold text-[#0066FF] hover:underline"
              >
                {isStaffPortal ? 'Switch to Admin Portal' : 'Open Staff Billing Terminal'}
              </Link>
            </div>
          </div>
        </div>

        <ForgotPasswordModal
          isOpen={forgotOpen}
          initialEmail={email}
          onClose={() => setForgotOpen(false)}
          onResetSuccess={(resetEmail) => {
            setEmail(resetEmail);
            setPasscode('');
            setErrorMsg('');
          }}
        />
      </div>
    );
  }

  if (user.role !== requiredRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-6">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 h-12 w-12 rounded-2xl bg-red-50 flex items-center justify-center">
            <Lock className="w-6 h-6 text-red-600" />
          </div>
          <div className="font-mono text-[11px] font-bold uppercase tracking-wider text-red-600">
            HTTP 403 · Route Guard Blocked
          </div>
          <h2 className="mt-1 text-lg font-extrabold text-[#0A192F]">
            {requiredRole === 'ADMINISTRATOR'
              ? 'Administrator Privileges Required'
              : 'Staff Operational Terminal Only'}
          </h2>
          <p className="mt-2 text-xs text-slate-600 leading-relaxed">
            Your active session role (<strong>{user.role}</strong>) is strictly restricted from
            accessing <strong>{requiredRole === 'ADMINISTRATOR' ? '/admin/*' : '/terminal'}</strong>{' '}
            under XeroTech Two-Role Governance.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
            {user.role === 'STAFF' && (
              <Link
                to="/terminal"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#0066FF] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#0052CC]"
              >
                <Terminal className="w-4 h-4" />
                <span>Return to Staff Terminal</span>
              </Link>
            )}
            {user.role === 'ADMINISTRATOR' && (
              <Link
                to="/admin/dashboard"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#0A192F] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#13294B]"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Return to Admin Console</span>
              </Link>
            )}
            <button
              type="button"
              onClick={() => void logout()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (user.requirePasswordChange) {
    return (
      <div className="min-h-screen bg-[#0A192F] architectural-grid">
        <ChangePasswordForm isOpen mandatoryReset />
      </div>
    );
  }

  return <>{children}</>;
}
