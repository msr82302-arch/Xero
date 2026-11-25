import {ArrowRight, Calculator, MessageSquare, PhoneCall, Sparkles} from 'lucide-react';
import {lazy, Suspense, useState} from 'react';
import {COMPANY_INFO} from '@/src/data/services';

const HeroSpatialScene = lazy(() =>
  import('@/src/components/3d/HeroSpatialScene').then((m) => ({default: m.HeroSpatialScene})),
);

interface HeroSectionProps {
  onOpenEstimator: () => void;
  onOpenInquiry: () => void;
}

export function HeroSection({onOpenEstimator, onOpenInquiry}: HeroSectionProps) {
  const [skylineExpanded, setSkylineExpanded] = useState(false);

  return (
    <section
      id="top"
      className="relative overflow-hidden bg-transparent border-b border-slate-200/60"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5 sm:py-7 lg:py-8">
        <div className="w-full rounded-3xl glass-surface p-5 sm:p-7 lg:p-8">
          {/* Mobile: 3D XeroTech Shield centered above Headline; Desktop: Headline Left + Compact 230x230 Top-Right */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5 md:gap-8">
            <div className="order-2 md:order-1 flex-1 min-w-0 max-w-3xl">
              <p className="font-mono text-[11px] sm:text-xs font-semibold uppercase tracking-[0.14em] text-[#0066FF]">
                Enterprise Software Engineering &amp; AI · Bahrain CR {COMPANY_INFO.crNumber}
              </p>

              <h1 className="mt-2.5 sm:mt-3 text-2xl sm:text-4xl lg:text-[42px] font-extrabold tracking-tight text-[#0f172a] leading-[1.12]">
                Engineering Scalable Software, AI Systems &amp; Digital Infrastructure
              </h1>

              <p className="mt-3 sm:mt-4 max-w-2xl text-sm sm:text-base lg:text-[17px] text-[#1e293b] leading-relaxed">
                Bahrain&apos;s engineering studio delivering custom web portals, interactive 3D
                experiences, generative media workflows, and transparent 3-decimal BHD architecture
                from our Riffa headquarters.
              </p>

              <div className="mt-5 sm:mt-6 flex flex-wrap items-center gap-2.5 sm:gap-3">
                <button
                  type="button"
                  onClick={onOpenEstimator}
                  className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#0066FF] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-[#0052CC] transition-all whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Calculator className="w-4 h-4" />
                  <span>Launch Project Estimator</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenInquiry}
                  className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border border-white/80 bg-white/75 backdrop-blur-md px-5 py-2.5 text-sm font-semibold text-[#0f172a] hover:border-sky-400/60 hover:bg-white/90 hover:text-[#0369a1] transition-all whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <PhoneCall className="w-4 h-4 text-[#0066FF]" />
                  <span>Request Proposal / Call</span>
                </button>

                <a
                  href="#ai-studio"
                  className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border border-white/70 bg-white/60 backdrop-blur-md px-4 py-2.5 text-sm font-semibold text-[#0f172a] hover:border-sky-400/60 hover:bg-white/85 hover:text-[#0369a1] transition-all whitespace-nowrap shrink-0"
                >
                  <Sparkles className="w-4 h-4 text-[#0066FF]" />
                  <span>Open AI Studio</span>
                </a>

                <a
                  href="#services"
                  className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#1e293b] hover:text-[#0369a1] transition-colors whitespace-nowrap shrink-0"
                >
                  <span>12 Core Services</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Compact 3D XeroTech Logo Widget: 150x150 on mobile above headline, 230x230 top-right on desktop */}
            <div className="order-1 md:order-2 shrink-0 self-center md:self-start">
              <div className="relative w-[150px] h-[150px] md:w-[230px] md:h-[230px] rounded-2xl overflow-hidden border border-white/55 bg-[#0f172a]/25 backdrop-blur-md shadow-lg touch-pan-y md:touch-auto">
                <Suspense
                  fallback={
                    <div className="flex h-full w-full items-center justify-center p-4">
                      <img
                        src="/assets/aistudio/logo_e1b61aee.png"
                        alt="XeroTech Shield"
                        className="h-24 w-24 md:h-32 md:w-32 object-contain drop-shadow-md opacity-90"
                      />
                    </div>
                  }
                >
                  <HeroSpatialScene
                    compact
                    expanded={skylineExpanded}
                    onToggleExpand={() => setSkylineExpanded((prev) => !prev)}
                  />
                </Suspense>
              </div>
            </div>
          </div>

          {/* Bottom Architectural Trust Strip */}
          <div className="mt-6 pt-5 border-t border-white/55 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            <div>
              <div className="font-mono text-[11px] sm:text-xs uppercase tracking-wider text-[#475569]">
                MOIC Registered
              </div>
              <div className="mt-0.5 font-mono text-sm sm:text-base font-bold text-[#0f172a] tabular-nums">
                CR {COMPANY_INFO.crNumber}
              </div>
            </div>
            <div>
              <div className="font-mono text-[11px] sm:text-xs uppercase tracking-wider text-[#475569]">
                Service Catalog
              </div>
              <div className="mt-0.5 font-mono text-sm sm:text-base font-bold text-[#0f172a] tabular-nums">
                12 Core Lines
              </div>
            </div>
            <div>
              <div className="font-mono text-[11px] sm:text-xs uppercase tracking-wider text-[#475569]">
                Billing Precision
              </div>
              <div className="mt-0.5 inline-flex rounded-full glass-price-badge px-2.5 py-0.5 font-mono text-xs sm:text-sm font-bold tabular-nums">
                0.000 BHD
              </div>
            </div>
            <div>
              <div className="font-mono text-[11px] sm:text-xs uppercase tracking-wider text-[#475569]">
                Direct Hotline
              </div>
              <a
                href={`https://wa.me/${COMPANY_INFO.whatsappDigits}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-0.5 inline-flex items-center gap-1 font-mono text-xs font-bold text-[#0f172a] hover:text-[#0066FF]"
              >
                <MessageSquare className="w-3.5 h-3.5 text-[#0066FF]" />
                <span>{COMPANY_INFO.whatsappDisplay}</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
