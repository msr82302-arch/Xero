import {ArrowRight, Calculator, MessageSquare, Sparkles} from 'lucide-react';
import {useState} from 'react';
import {HeroSpatialScene} from '@/src/components/3d/HeroSpatialScene';
import {COMPANY_INFO} from '@/src/data/services';

interface HeroSectionProps {
  onOpenEstimator: () => void;
}

export function HeroSection({onOpenEstimator}: HeroSectionProps) {
  const [skylineExpanded, setSkylineExpanded] = useState(false);

  return (
    <section
      id="top"
      className="relative overflow-hidden bg-gradient-to-b from-white via-slate-50/70 to-slate-50 border-b border-slate-200/80"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
          {/* Left Narrative Column */}
          <div className="lg:col-span-6 flex flex-col justify-center">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[#0066FF]">
              Enterprise Software Engineering & AI · Bahrain CR {COMPANY_INFO.crNumber}
            </p>

            <h1 className="mt-4 text-3xl sm:text-4xl lg:text-[44px] font-extrabold tracking-tight text-[#0A192F] leading-[1.12]">
              Engineering Scalable Software, AI Systems &amp; Digital Infrastructure
            </h1>

            <p className="mt-5 max-w-2xl text-base sm:text-lg text-slate-600 leading-relaxed">
              Bahrain&apos;s engineering studio delivering custom web portals, interactive 3D
              experiences, generative media workflows, and transparent 3-decimal BHD architecture
              from our Riffa headquarters.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onOpenEstimator}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0066FF] px-5 py-3.5 text-sm font-semibold text-white shadow-md shadow-blue-600/15 hover:bg-[#0052CC] transition-all whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Calculator className="w-4 h-4" />
                <span>Launch Project Estimator</span>
              </button>

              <a
                href="#ai-studio"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-semibold text-[#0A192F] hover:border-blue-300 hover:text-[#0066FF] transition-all whitespace-nowrap shrink-0"
              >
                <Sparkles className="w-4 h-4 text-[#0066FF]" />
                <span>Open AI Studio</span>
              </a>

              <a
                href="#services"
                className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-3.5 text-sm font-semibold text-slate-600 hover:text-[#0066FF] transition-colors whitespace-nowrap shrink-0"
              >
                <span>12 Core Services</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>

            {/* Clean Architectural Trust Strip */}
            <div className="mt-10 pt-7 border-t border-slate-200/90 grid grid-cols-2 sm:grid-cols-4 gap-6">
              <div>
                <div className="font-mono text-xs uppercase tracking-wider text-slate-500">
                  MOIC Registered
                </div>
                <div className="mt-1 font-mono text-base font-bold text-[#0A192F] tabular-nums">
                  CR {COMPANY_INFO.crNumber}
                </div>
              </div>
              <div>
                <div className="font-mono text-xs uppercase tracking-wider text-slate-500">
                  Service Catalog
                </div>
                <div className="mt-1 font-mono text-base font-bold text-[#0A192F] tabular-nums">
                  12 Core Lines
                </div>
              </div>
              <div>
                <div className="font-mono text-xs uppercase tracking-wider text-slate-500">
                  Billing Precision
                </div>
                <div className="mt-1 font-mono text-base font-bold text-[#0066FF] tabular-nums">
                  0.000 BHD
                </div>
              </div>
              <div>
                <div className="font-mono text-xs uppercase tracking-wider text-slate-500">
                  Direct Hotline
                </div>
                <a
                  href={`https://wa.me/${COMPANY_INFO.whatsappDigits}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 font-mono text-xs font-bold text-[#0A192F] hover:text-[#0066FF]"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-[#0066FF]" />
                  <span>{COMPANY_INFO.whatsappDisplay}</span>
                </a>
              </div>
            </div>
          </div>

          {/* Right Procedural 3D Manama Skyline Viewport */}
          <div className="lg:col-span-6 flex">
            <div className="w-full rounded-3xl border border-slate-200/90 bg-[#071326] shadow-xl shadow-slate-900/10 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-[#0A192F]">
                <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-blue-200">
                  XeroTech Spatial Core · Manama Glass Refraction
                </span>
                <span className="font-mono text-[11px] text-slate-400">
                  Move Cursor to Interact
                </span>
              </div>
              <div className="flex-1 min-h-[380px] lg:min-h-[460px]">
                <HeroSpatialScene
                  expanded={skylineExpanded}
                  onToggleExpand={() => setSkylineExpanded((prev) => !prev)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
