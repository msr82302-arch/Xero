import {ChevronDown, Menu, X} from 'lucide-react';
import {useEffect, useRef, useState} from 'react';
import {NAV_ITEMS} from '@/src/data/navigation';
import {COMPANY_INFO, services} from '@/src/data/services';

interface NavbarProps {
  onOpenEstimator: (preselectedIds?: number[]) => void;
  onOpenPortal: () => void;
}

export function Navbar({onOpenEstimator, onOpenPortal}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setServicesOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSelectServiceFromNav = (serviceId: number) => {
    setServicesOpen(false);
    setMobileMenuOpen(false);
    const targetEl = document.getElementById(`service-card-${serviceId}`);
    if (targetEl) {
      targetEl.scrollIntoView({behavior: 'smooth', block: 'center'});
    } else {
      document.getElementById('services')?.scrollIntoView({behavior: 'smooth'});
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/55 bg-white/55 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Clean single-line Brand Mark */}
        <a
          href="#top"
          className="flex items-center gap-2.5 shrink-0 whitespace-nowrap focus:outline-none"
        >
          <img
            src="/assets/aistudio/logo_e1b61aee.png"
            alt="XeroTech Technologies Logo"
            className="h-9 w-9 object-contain drop-shadow-sm shrink-0"
            decoding="sync"
            referrerPolicy="no-referrer"
          />
          <span className="text-lg font-extrabold tracking-tight text-[#0f172a]">
            XeroTech<span className="text-[#0066FF]">.</span>
          </span>
        </a>

        {/* Zone 2: Concise Single-Line Navigation */}
        <nav className="hidden lg:flex items-center gap-7" aria-label="Main navigation">
          {NAV_ITEMS.map((item) =>
            item.hasDropdown ? (
              <div key={item.label} ref={dropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => setServicesOpen((prev) => !prev)}
                  aria-expanded={servicesOpen}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1e293b] hover:text-[#0f172a] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>{item.label}</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${
                      servicesOpen ? 'rotate-180 text-[#0066FF]' : ''
                    }`}
                  />
                </button>

                {servicesOpen && (
                  <div className="absolute left-0 top-full mt-3 w-[620px] rounded-2xl glass-modal p-5 z-50">
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        12 Official Bahrain IT Capabilities
                      </span>
                      <a
                        href="#services"
                        onClick={() => setServicesOpen(false)}
                        className="text-xs font-semibold text-[#0066FF] hover:underline"
                      >
                        View Full Catalog
                      </a>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {services.map((service) => (
                        <button
                          key={service.id}
                          type="button"
                          onClick={() => handleSelectServiceFromNav(service.id)}
                          className="flex items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-sky-50/80 transition-colors cursor-pointer group"
                        >
                          <div className="min-w-0 pr-3">
                            <div className="text-xs font-semibold text-[#0f172a] group-hover:text-[#0066FF] truncate">
                              {service.name}
                            </div>
                            <div className="font-mono text-[11px] text-slate-500">
                              {service.code}
                            </div>
                          </div>
                          <span className="font-mono text-xs font-semibold text-[#0066FF] tabular-nums shrink-0">
                            {service.benchmarkPriceBHD} BHD
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <a
                key={item.label}
                href={item.href}
                className="text-sm font-medium text-[#1e293b] hover:text-[#0f172a] transition-colors whitespace-nowrap shrink-0"
              >
                {item.label}
              </a>
            ),
          )}
        </nav>

        {/* Zone 3: Single Primary Action Area */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenPortal}
            className="hidden sm:inline-flex items-center rounded-lg border border-white/75 bg-white/65 px-3.5 py-2 text-xs font-semibold text-[#0f172a] hover:border-sky-400/60 hover:bg-white/85 hover:text-[#0369a1] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            XBMS Portal
          </button>
          <button
            type="button"
            onClick={() => onOpenEstimator()}
            className="inline-flex items-center justify-center rounded-lg bg-[#0066FF] px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm shadow-blue-600/20 hover:bg-[#0052CC] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Project Estimator
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="lg:hidden min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg border border-white/75 bg-white/75 p-2 text-[#0f172a] hover:bg-white cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Compact Frosted-Glass Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-white/60 bg-white/88 backdrop-blur-xl px-4 py-4 space-y-2 shadow-lg">
          <div className="flex flex-col space-y-1.5">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenEstimator();
              }}
              className="w-full min-h-[44px] flex items-center justify-between rounded-xl bg-[#0066FF] px-4 py-2.5 text-sm font-semibold text-white shadow-sm cursor-pointer"
            >
              <span>Project Estimator</span>
              <span className="font-mono text-[11px] opacity-90">BHD Matrix</span>
            </button>

            <a
              href="#services"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full min-h-[44px] flex items-center rounded-xl px-4 py-2.5 text-sm font-semibold text-[#0f172a] hover:bg-white/80"
            >
              Services
            </a>

            <a
              href="#ai-studio"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full min-h-[44px] flex items-center rounded-xl px-4 py-2.5 text-sm font-semibold text-[#0f172a] hover:bg-white/80"
            >
              AI Studio
            </a>

            <a
              href="#case-studies"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full min-h-[44px] flex items-center rounded-xl px-4 py-2.5 text-sm font-semibold text-[#0f172a] hover:bg-white/80"
            >
              Case Studies
            </a>

            <a
              href="#contact"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full min-h-[44px] flex items-center rounded-xl px-4 py-2.5 text-sm font-semibold text-[#0f172a] hover:bg-white/80"
            >
              Contact
            </a>

            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenPortal();
              }}
              className="w-full min-h-[44px] flex items-center justify-between rounded-xl border border-slate-200/80 bg-white/75 px-4 py-2.5 text-sm font-semibold text-[#0f172a] hover:bg-white cursor-pointer"
            >
              <span>Staff/Admin Portal</span>
              <span className="font-mono text-[11px] text-[#0066FF]">XBMS</span>
            </button>
          </div>

          <div className="pt-2 border-t border-slate-200/80">
            <a
              href={`https://wa.me/${COMPANY_INFO.whatsappDigits}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full min-h-[44px] flex items-center justify-center rounded-xl border border-sky-200 bg-sky-50/90 px-4 py-2.5 text-xs font-semibold text-[#0066FF]"
            >
              WhatsApp {COMPANY_INFO.whatsappDisplay}
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
