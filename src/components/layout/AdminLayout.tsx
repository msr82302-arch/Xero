import {
  ChevronDown,
  FileCheck2,
  FileText,
  Globe,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  ShieldAlert,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import {useEffect, useRef, useState, type ReactNode} from 'react';
import {Link, NavLink, useNavigate} from 'react-router-dom';
import {ChangePasswordForm} from '@/src/components/auth/ChangePasswordForm';
import {useAuth} from '@/src/context/AuthContext';
import {COMPANY_INFO} from '@/src/data/services';

interface AdminLayoutProps {
  title: string;
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  onOpenNewReceipt?: () => void;
  children: ReactNode;
}

const ADMIN_NAV_LINKS = [
  {to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard},
  {to: '/admin/quotations', label: 'Quotations', icon: FileCheck2},
  {to: '/admin/receipts', label: 'Receipts Ledger', icon: FileText},
  {to: '/admin/clients', label: 'Client Directory', icon: Users},
  {to: '/admin/users', label: 'User Management', icon: UserCog},
  {to: '/admin/settings', label: 'Settings', icon: Settings},
  {to: '/admin/audit', label: 'Audit Trail', icon: ShieldAlert},
];

export function AdminLayout({
  title,
  searchQuery,
  onSearchChange,
  onOpenNewReceipt,
  children,
}: AdminLayoutProps) {
  const {user, logout} = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [changePwOpen, setChangePwOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!profileMenuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', handleOutside);
    return () => window.removeEventListener('mousedown', handleOutside);
  }, [profileMenuOpen]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const renderSidebarContent = () => (
    <div className="flex h-full flex-col bg-[#0A192F] text-white">
      {/* Brand Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
        <Link to="/admin/dashboard" className="flex items-center gap-2.5 min-w-0">
          <img
            src="/assets/aistudio/logo_e1b61aee.png"
            alt="XeroTech Emblem"
            className="h-9 w-9 rounded-lg bg-white/10 p-1 object-contain shrink-0"
            referrerPolicy="no-referrer"
          />
          <div className="min-w-0">
            <div className="text-xs font-extrabold tracking-wide uppercase truncate">
              XeroTech Technologies
            </div>
            <div className="font-mono text-[10px] text-[#00C2FF]">
              CR NO. {COMPANY_INFO.crNumber}
            </div>
          </div>
        </Link>

        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          aria-label="Close sidebar"
          className="lg:hidden rounded-lg p-1.5 text-slate-300 hover:bg-white/10"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Primary Sidebar Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="Admin Navigation">
        {ADMIN_NAV_LINKS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={({isActive}) =>
                `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-[#0066FF] text-white shadow-sm'
                    : 'text-slate-300 hover:bg-white/8 hover:text-white'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}

        {onOpenNewReceipt && (
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              onOpenNewReceipt();
            }}
            className="mt-3 w-full flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-xs font-semibold text-slate-200 hover:bg-white/12 hover:text-white transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#00C2FF] shrink-0" />
            <span>Create Payment Receipt</span>
          </button>
        )}

        <div className="pt-4 mt-4 border-t border-white/10">
          <Link
            to="/"
            className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-300 hover:bg-white/8 hover:text-white transition-colors"
          >
            <Globe className="w-4 h-4 shrink-0 text-slate-400" />
            <span>Public Agency Portfolio</span>
          </Link>
        </div>
      </nav>

      {/* Administrator Footer */}
      <div className="border-t border-white/10 p-3.5 space-y-2.5">
        <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-white truncate">
              {user?.name || 'Principal Administrator'}
            </span>
            <span className="rounded bg-[#0066FF] px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-white shrink-0">
              {user?.role || 'ADMINISTRATOR'}
            </span>
          </div>
          <div className="mt-0.5 font-mono text-[10px] text-slate-400 truncate">
            {user?.email || 'admin@xerotechtechnologies.com'}
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setMobileOpen(false);
            setChangePwOpen(true);
          }}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/12 hover:text-white transition-colors cursor-pointer"
        >
          <KeyRound className="w-3.5 h-3.5 text-[#00C2FF]" />
          <span>Security &amp; Password</span>
        </button>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-transparent px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Secure Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0A192F] flex">
      {/* Desktop Fixed Sidebar (240px) */}
      <aside className="hidden lg:block w-[240px] shrink-0 border-r border-slate-200">
        <div className="sticky top-0 h-screen">{renderSidebarContent()}</div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 w-[260px] max-w-[80vw] h-full shadow-2xl">
            {renderSidebarContent()}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar Contract: Breadcrumb on Left, Search + Max 1-2 Actions on Right */}
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md">
          <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation menu"
                className="lg:hidden rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <Menu className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 text-xs truncate">
                <span className="hidden sm:inline font-medium text-slate-500">
                  XeroTech Technologies
                </span>
                <span className="hidden sm:inline text-slate-300">/</span>
                <span className="font-bold text-[#0066FF] truncate">{title}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              {onSearchChange && (
                <div className="relative hidden md:block">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="search"
                    value={searchQuery || ''}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Quick search receipts, clients..."
                    className="w-56 lg:w-64 rounded-xl border border-slate-200 bg-slate-50/70 pl-8 pr-3 py-1.5 text-xs text-[#0A192F] focus:border-[#0066FF] focus:bg-white focus:outline-none"
                  />
                </div>
              )}

              {onOpenNewReceipt && (
                <button
                  type="button"
                  onClick={onOpenNewReceipt}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#0A192F] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#13294B] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Receipt</span>
                </button>
              )}

              <div className="relative" ref={profileMenuRef}>
                <button
                  type="button"
                  onClick={() => setProfileMenuOpen((prev) => !prev)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#0A192F] hover:border-blue-300 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <KeyRound className="w-3.5 h-3.5 text-[#0066FF]" />
                  <span className="hidden sm:inline">Account</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {profileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-60 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl z-40">
                    <div className="px-3 py-2 border-b border-slate-100">
                      <div className="text-xs font-bold text-[#0A192F] truncate">{user?.name}</div>
                      <div className="font-mono text-[10px] text-slate-500 truncate">
                        {user?.email}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        setChangePwOpen(true);
                      }}
                      className="mt-1 w-full flex items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-[#0A192F] hover:bg-slate-50 cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-[#0066FF]" />
                      <span>Security &amp; Password</span>
                    </button>
                    <Link
                      to="/admin/users"
                      onClick={() => setProfileMenuOpen(false)}
                      className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-[#0A192F] hover:bg-slate-50"
                    >
                      <UserCog className="w-3.5 h-3.5 text-[#0066FF]" />
                      <span>User Governance</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        void handleLogout();
                      }}
                      className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>

      <ChangePasswordForm isOpen={changePwOpen} onClose={() => setChangePwOpen(false)} />
    </div>
  );
}
