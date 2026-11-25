import {COMPANY_INFO, services} from '@/src/data/services';

interface FooterProps {
  onOpenEstimator: () => void;
  onOpenPortal: () => void;
}

export function Footer({onOpenEstimator, onOpenPortal}: FooterProps) {
  return (
    <footer className="bg-white text-slate-600">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-slate-200">
          {/* Brand & Bilingual Identity */}
          <div className="md:col-span-5">
            <img
              src="/assets/aistudio/XeroTech_Logo_0d5bcad1.png"
              alt="XeroTech Technologies Official Logo"
              className="h-12 w-auto object-contain"
              referrerPolicy="no-referrer"
            />
            <p className="mt-4 text-sm text-slate-600 leading-relaxed max-w-md">
              {COMPANY_INFO.brandName} ({COMPANY_INFO.brandNameAr}) — {COMPANY_INFO.slogan}.
              Registered technology engineering studio operating under Commercial Registration{' '}
              <span className="font-mono font-semibold text-[#0A192F]">
                CR {COMPANY_INFO.crNumber}
              </span>{' '}
              ({COMPANY_INFO.crAuthority}).
            </p>
            <div className="mt-4 font-mono text-xs font-semibold text-[#0A192F]">
              <span dir="rtl">مملكة البحرين</span> · Kingdom of Bahrain
            </div>
          </div>

          {/* Core Services Quick Links */}
          <div className="md:col-span-3">
            <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-[#0A192F]">
              Engineering Lines
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {services.slice(0, 6).map((service) => (
                <li key={service.id}>
                  <a
                    href={`#service-card-${service.id}`}
                    className="hover:text-[#0066FF] transition-colors"
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
              <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-[#0A192F]">
                Corporate Office &amp; Governance
              </h3>
              <p className="mt-4 text-sm text-slate-600 leading-relaxed">{COMPANY_INFO.address}</p>
              <div className="mt-3 space-y-1 font-mono text-xs text-[#0A192F]">
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
                  className="text-[#0A192F] hover:text-[#0066FF] hover:underline cursor-pointer"
                >
                  XBMS Ledger &amp; API Specs
                </button>
                <a
                  href="/XeroTech_Phase1_Technical_Report.pdf"
                  download="XeroTech_Phase1_Technical_Report.pdf"
                  className="text-[#0A192F] hover:text-[#0066FF] hover:underline"
                >
                  Phase 1 Report (PDF)
                </a>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <img
                src="/assets/aistudio/STAMP_d1ea7849.png"
                alt="XeroTech Technologies CR 201130-1 Official Stamp"
                className="h-16 w-16 object-contain"
                referrerPolicy="no-referrer"
              />
              <div className="text-xs text-slate-500">
                <div className="font-semibold text-[#0A192F]">Official Corporate Seal</div>
                <div className="font-mono">CR NO: {COMPANY_INFO.crNumber}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
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
