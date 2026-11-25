import {ArrowLeft, KeyRound, Lock, RefreshCw, ShieldCheck, Terminal} from 'lucide-react';
import {useState, type FormEvent} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {ForgotPasswordModal} from '@/src/components/auth/ForgotPasswordModal';
import {useAuth} from '@/src/context/AuthContext';
import {COMPANY_INFO} from '@/src/data/services';
import {extractApiError} from '@/src/lib/api';

export function LoginPage() {
  const {
    signin,
    backendOffline,
    setupRequired,
    staffSetupRequired,
    localResetAllowed,
    resetPortalCredentials,
  } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('admin@xerotechtechnologies.com');
  const [passcode, setPasscode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');
    setSubmitting(true);
    try {
      const signedInUser = await signin(email, passcode);
      if (signedInUser.role === 'ADMINISTRATOR') {
        navigate('/admin/dashboard');
      } else {
        navigate('/terminal');
      }
    } catch (err) {
      setErrorMsg(
        extractApiError(err, 'Invalid credentials. Please verify your email and password.'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPortal = async () => {
    setErrorMsg('');
    setInfoMsg('');
    setResetting(true);
    try {
      const msg = await resetPortalCredentials();
      setPasscode('');
      setConfirmReset(false);
      setInfoMsg(msg);
    } catch (err) {
      setErrorMsg(extractApiError(err, 'Unable to reset portal credentials.'));
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        <div className="mb-4 rounded-xl glass-panel-subtle px-4 py-2.5 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#334155] hover:text-[#0066FF] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Public Portfolio</span>
          </Link>
          <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#0066FF]">
            CR {COMPANY_INFO.crNumber}
          </span>
        </div>

        <div className="rounded-3xl glass-modal p-7 sm:p-8">
          <div className="flex items-center gap-3 pb-5 border-b border-slate-200">
            <img
              src="/assets/aistudio/logo_e1b61aee.png"
              alt="XeroTech Emblem"
              className="h-10 w-10 object-contain rounded-lg bg-white border border-slate-200 p-1.5"
              referrerPolicy="no-referrer"
            />
            <div>
              <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#0066FF]">
                XeroTech Business Management System
              </div>
              <h1 className="text-lg font-extrabold text-[#0f172a]">
                Unified Portal Authentication
              </h1>
            </div>
          </div>

          {backendOffline && (
            <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50/90 px-3.5 py-2.5 text-xs text-amber-800 leading-relaxed">
              XBMS backend server is unreachable on <span className="font-mono">/api/v1/</span>.
              Start the full-stack server with <span className="font-mono font-bold">npm run dev</span>{' '}
              and open <span className="font-mono">http://localhost:3000</span>.
            </div>
          )}

          <p className="mt-4 text-xs text-[#334155] leading-relaxed">
            Sign in with your assigned <strong className="text-[#0f172a]">ADMINISTRATOR</strong> or <strong className="text-[#0f172a]">STAFF</strong>{' '}
            credentials. Sessions are isolated and routed automatically based on your verified role.
          </p>

          {(setupRequired || staffSetupRequired) && (
            <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50/90 px-3.5 py-2.5 text-xs text-[#334155]">
              First-run setup available:{' '}
              {setupRequired && (
                <Link to="/admin/dashboard" className="font-bold text-[#0066FF] hover:underline">
                  Initialize Admin
                </Link>
              )}
              {setupRequired && staffSetupRequired && ' · '}
              {staffSetupRequired && (
                <Link to="/terminal" className="font-bold text-[#0066FF] hover:underline">
                  Initialize Staff Counter
                </Link>
              )}
            </div>
          )}

          {infoMsg && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/90 px-3.5 py-2.5 text-xs font-medium text-emerald-700">
              {infoMsg}
            </div>
          )}

          {errorMsg && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50/90 px-3.5 py-2.5 text-xs font-medium text-red-700">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label
                htmlFor="unified-login-email"
                className="block text-xs font-semibold text-[#0f172a] mb-1.5"
              >
                Corporate Email Address
              </label>
              <input
                id="unified-login-email"
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border glass-input px-3.5 py-2.5 text-sm focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="unified-login-passcode"
                  className="block text-xs font-semibold text-[#0f172a]"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setForgotOpen(true)}
                  className="text-[11px] font-semibold text-[#0066FF] hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-[#64748b] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="unified-login-passcode"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter your XBMS password"
                  className="w-full rounded-xl border glass-input pl-10 pr-3.5 py-2.5 text-sm focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#0066FF] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-[#0052CC] disabled:opacity-60 transition-colors cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>{submitting ? 'Authenticating...' : 'Sign In to XBMS'}</span>
            </button>
          </form>

          {localResetAllowed && (
            <div className="mt-4 pt-3.5 border-t border-slate-200/80">
              {!confirmReset ? (
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-[#475569]">Localhost Credential Recovery</span>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(true)}
                    className="inline-flex items-center gap-1 font-semibold text-[#0066FF] hover:underline cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Reset Portal Credentials</span>
                  </button>
                </div>
              ) : (
                <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-3 text-xs text-amber-900 space-y-2">
                  <p className="font-medium leading-relaxed">
                    Clear saved local Admin &amp; Staff credentials in{' '}
                    <span className="font-mono font-semibold">./data/auth-store.json</span> and
                    re-open First-Run Setup?
                  </p>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmReset(false)}
                      disabled={resetting}
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-[#334155] hover:bg-slate-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleResetPortal()}
                      disabled={resetting}
                      className="rounded-lg bg-amber-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-amber-700 disabled:opacity-60 cursor-pointer"
                    >
                      {resetting ? 'Resetting...' : 'Confirm Reset'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-5 pt-4 border-t border-slate-200 grid grid-cols-2 gap-2 text-[11px]">
            <Link
              to="/admin/dashboard"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white/85 px-3 py-2 font-semibold text-[#334155] hover:border-[#0066FF] hover:text-[#0066FF]"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#0066FF]" />
              <span>Admin Console</span>
            </Link>
            <Link
              to="/terminal"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white/85 px-3 py-2 font-semibold text-[#334155] hover:border-[#0066FF] hover:text-[#0066FF]"
            >
              <Terminal className="w-3.5 h-3.5 text-[#0066FF]" />
              <span>Staff Terminal</span>
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
