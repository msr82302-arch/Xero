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
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Clean single-line Brand Mark */}
        <a
          href="#top"
          className="flex items-center gap-2.5 shrink-0 whitespace-nowrap focus:outline-none"
        >
          <img
            src="/assets/aistudio/logo_e1b61aee.png"
            alt="XeroTech Technologies Logo"
            className="h-8 w-8 object-contain"
            referrerPolicy="no-referrer"
          />
          <span className="text-lg font-extrabold tracking-tight text-[#0A192F]">
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
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-[#0A192F] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>{item.label}</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${
                      servicesOpen ? 'rotate-180 text-[#0066FF]' : ''
                    }`}
                  />
                </button>

                {servicesOpen && (
                  <div className="absolute left-0 top-full mt-3 w-[620px] rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xl shadow-slate-900/10 z-50">
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
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
                          className="flex items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-slate-50 transition-colors cursor-pointer group"
                        >
                          <div className="min-w-0 pr-3">
                            <div className="text-xs font-semibold text-[#0A192F] group-hover:text-[#0066FF] truncate">
                              {service.name}
                            </div>
                            <div className="font-mono text-[11px] text-slate-400">
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
                className="text-sm font-medium text-slate-600 hover:text-[#0A192F] transition-colors whitespace-nowrap shrink-0"
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
            className="hidden sm:inline-flex items-center rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-[#0A192F] hover:border-slate-300 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            XBMS Portal
          </button>
          <button
            type="button"
            onClick={() => onOpenEstimator()}
            className="inline-flex items-center justify-center rounded-lg bg-[#0066FF] px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-[#0052CC] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Project Estimator
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="lg:hidden inline-flex items-center justify-center rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Compact Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-3">
          <div className="flex flex-col space-y-2">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {item.label}
              </a>
            ))}
          </div>
          <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenPortal();
              }}
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-[#0A192F] cursor-pointer"
            >
              XBMS Portal
            </button>
            <a
              href={`https://wa.me/${COMPANY_INFO.whatsappDigits}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-[#0066FF]"
            >
              WhatsApp {COMPANY_INFO.whatsappDisplay}
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
