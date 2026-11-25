import axios from 'axios';
import {ArrowLeft, KeyRound, Lock, ShieldCheck, Terminal} from 'lucide-react';
import {useState, type FormEvent} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {ForgotPasswordModal} from '@/src/components/auth/ForgotPasswordModal';
import {useAuth} from '@/src/context/AuthContext';
import {COMPANY_INFO} from '@/src/data/services';

export function LoginPage() {
  const {signin, setupRequired, staffSetupRequired} = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('admin@xerotechtechnologies.com');
  const [passcode, setPasscode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [forgotOpen, setForgotOpen] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);
    try {
      const signedInUser = await signin(email, passcode);
      if (signedInUser.role === 'ADMINISTRATOR') {
        navigate('/admin/dashboard');
      } else {
        navigate('/terminal');
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setErrorMsg(
          (err.response?.data as {error?: string} | undefined)?.error ||
            'Invalid credentials. Please verify your email and password.',
        );
      } else {
        setErrorMsg('Unexpected error while signing in.');
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
            CR {COMPANY_INFO.crNumber}
          </span>
        </div>

        <div className="rounded-3xl border border-white/15 bg-white p-7 sm:p-8 shadow-2xl">
          <div className="flex items-center gap-3 pb-5 border-b border-slate-100">
            <img
              src="/assets/aistudio/logo_e1b61aee.png"
              alt="XeroTech Emblem"
              className="h-10 w-10 object-contain rounded-lg bg-[#0A192F] p-1.5"
              referrerPolicy="no-referrer"
            />
            <div>
              <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#0066FF]">
                XeroTech Business Management System
              </div>
              <h1 className="text-lg font-extrabold text-[#0A192F]">
                Unified Portal Authentication
              </h1>
            </div>
          </div>

          <p className="mt-4 text-xs text-slate-600 leading-relaxed">
            Sign in with your assigned <strong>ADMINISTRATOR</strong> or <strong>STAFF</strong>{' '}
            credentials. Sessions are isolated and routed automatically based on your verified role.
          </p>

          {(setupRequired || staffSetupRequired) && (
            <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-xs text-[#0A192F]">
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

          {errorMsg && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label
                htmlFor="unified-login-email"
                className="block text-xs font-semibold text-[#0A192F] mb-1.5"
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
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-[#0A192F] focus:border-[#0066FF] focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="unified-login-passcode"
                  className="block text-xs font-semibold text-[#0A192F]"
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
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="unified-login-passcode"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter your XBMS password"
                  className="w-full rounded-xl border border-slate-200 pl-10 pr-3.5 py-2.5 text-sm text-[#0A192F] focus:border-[#0066FF] focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#0066FF] px-4 py-3 text-sm font-semibold text-white hover:bg-[#0052CC] disabled:opacity-60 transition-colors cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>{submitting ? 'Authenticating...' : 'Sign In to XBMS'}</span>
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px]">
            <Link
              to="/admin/dashboard"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 font-semibold text-[#0A192F] hover:border-blue-300 hover:text-[#0066FF]"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#0066FF]" />
              <span>Admin Console</span>
            </Link>
            <Link
              to="/terminal"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 font-semibold text-[#0A192F] hover:border-blue-300 hover:text-[#0066FF]"
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
