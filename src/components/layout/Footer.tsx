import {COMPANY_INFO, services} from '@/src/data/services';

interface FooterProps {
  onOpenEstimator: () => void;
  onOpenPortal: () => void;
}

export function Footer({onOpenEstimator, onOpenPortal}: FooterProps) {
  return (
    <footer className="glass-surface border-x-0 border-b-0 border-t border-white/65 text-[#1e293b]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-white/55">
          {/* Brand & Bilingual Identity */}
          <div className="md:col-span-5">
            <div className="inline-flex rounded-xl bg-white/85 border border-white/80 px-3 py-2 shadow-xs">
              <img
                src="/assets/aistudio/XeroTech_Logo_0d5bcad1.png"
                alt="XeroTech Technologies Official Logo"
                className="h-11 w-auto object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <p className="mt-4 text-sm text-[#1e293b] leading-relaxed max-w-md">
              {COMPANY_INFO.brandName} ({COMPANY_INFO.brandNameAr}) — {COMPANY_INFO.slogan}.
              Registered technology engineering studio operating under Commercial Registration{' '}
              <span className="font-mono font-semibold text-[#0f172a]">
                CR {COMPANY_INFO.crNumber}
              </span>{' '}
              ({COMPANY_INFO.crAuthority}).
            </p>
            <div className="mt-4 font-mono text-xs font-semibold text-[#0369a1]">
              <span dir="rtl">مملكة البحرين</span> · Kingdom of Bahrain
            </div>
          </div>

          {/* Core Services Quick Links */}
          <div className="md:col-span-3">
            <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-[#0f172a]">
              Engineering Lines
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {services.slice(0, 6).map((service) => (
                <li key={service.id}>
                  <a
                    href={`#service-card-${service.id}`}
                    className="text-[#1e293b] hover:text-[#0369a1] transition-colors"
                  >
                    {service.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Corporate Contact & Official Stamp */}
          <div className="md:col-span-4 flex flex-col justify-between">
            <div>
              <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-[#0f172a]">
                Corporate Office &amp; Governance
              </h3>
              <p className="mt-4 text-sm text-[#1e293b] leading-relaxed">{COMPANY_INFO.address}</p>
              <div className="mt-3 space-y-1 font-mono text-xs text-[#0f172a]">
                <div>
                  Tel: {COMPANY_INFO.phones[0]} | {COMPANY_INFO.phones[1]}
                </div>
                <div>
                  Email: {COMPANY_INFO.primaryEmail} | {COMPANY_INFO.emails[1]}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-4 text-xs font-semibold">
                <button
                  type="button"
                  onClick={onOpenEstimator}
                  className="text-[#0066FF] hover:underline cursor-pointer"
                >
                  Project Estimator
                </button>
                <button
                  type="button"
                  onClick={onOpenPortal}
                  className="text-[#334155] hover:text-[#0066FF] hover:underline cursor-pointer"
                >
                  XBMS Ledger &amp; API Specs
                </button>
                <a
                  href="/XeroTech_Phase1_Technical_Report.pdf"
                  download="XeroTech_Phase1_Technical_Report.pdf"
                  className="text-[#334155] hover:text-[#0066FF] hover:underline"
                >
                  Phase 1 Report (PDF)
                </a>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <div className="rounded-full bg-white border border-slate-200 p-1 shadow-xs shrink-0">
                <img
                  src="/assets/aistudio/STAMP_d1ea7849.png"
                  alt="XeroTech Technologies CR 201130-1 Official Stamp"
                  className="h-14 w-14 object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="text-xs text-slate-600">
                <div className="font-semibold text-[#0f172a]">Official Corporate Seal</div>
                <div className="font-mono text-[#0066FF]">CR NO: {COMPANY_INFO.crNumber}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
          <div>
            &copy; {new Date().getFullYear()} {COMPANY_INFO.brandName}. All rights reserved.
          </div>
          <div className="font-mono">
            BHD Financial Standard (0.000 BHD) · {COMPANY_INFO.socialHandle}
          </div>
        </div>
      </div>
    </footer>
  );
}
