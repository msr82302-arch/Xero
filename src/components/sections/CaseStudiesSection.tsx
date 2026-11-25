import {ArrowUpRight, Building2, CheckCircle2, FileCheck2, ShieldCheck} from 'lucide-react';
import {COMPANY_INFO, XEROTECH_CASE_STUDIES} from '@/src/data/services';

interface CaseStudiesSectionProps {
  onOpenEstimator: () => void;
  onOpenPortal: () => void;
}

export function CaseStudiesSection({onOpenEstimator, onOpenPortal}: CaseStudiesSectionProps) {
  return (
    <>
      {/* Verified Bahrain Case Studies */}
      <section id="case-studies" className="py-16 lg:py-24 bg-white border-b border-slate-200/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[#0066FF]">
              Verified Commercial Deployments · Kingdom of Bahrain
            </p>
            <h2 className="mt-2.5 text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0A192F]">
              Production Case Studies
            </h2>
            <p className="mt-3 text-base text-slate-600 leading-relaxed">
              Audited contracts delivered by XeroTech Technologies across travel processing portals
              and hospitality digital transformation.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-8">
            {XEROTECH_CASE_STUDIES.map((study) => (
              <article
                key={study.id}
                className="flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-slate-50/60 p-7 sm:p-8 shadow-sm hover:border-blue-300 transition-colors"
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-200/80">
                    <span className="font-mono text-xs font-semibold text-[#0066FF]">
                      Ref: {study.referenceCode} · {study.sector}
                    </span>
                    <span className="font-mono text-xs font-medium text-emerald-700">
                      {study.status}
                    </span>
                  </div>

                  <div className="mt-5 flex flex-wrap items-baseline justify-between gap-4">
                    <div>
                      <h3 className="text-2xl font-extrabold text-[#0A192F]">{study.client}</h3>
                      <p dir="rtl" className="text-sm text-slate-500 mt-0.5">
                        {study.clientAr}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-xs uppercase tracking-wider text-slate-500">
                        Contract Value
                      </div>
                      <div className="font-mono text-2xl font-extrabold text-[#0A192F] tabular-nums">
                        {study.contractValueBHD}
                      </div>
                    </div>
                  </div>

                  <h4 className="mt-4 text-base font-bold text-[#0A192F]">{study.title}</h4>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">{study.summary}</p>

                  <div className="mt-4 font-mono text-xs text-slate-600 bg-white rounded-xl border border-slate-200/80 px-4 py-3">
                    {study.financialNote} · {study.timeline}
                  </div>

                  <ul className="mt-5 space-y-2.5">
                    {study.deliverables.map((deliverable) => (
                      <li key={deliverable} className="flex items-start gap-2.5 text-sm text-slate-700">
                        <CheckCircle2 className="w-4 h-4 text-[#0066FF] mt-0.5 shrink-0" />
                        <span>{deliverable}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-7 pt-5 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
                  <p className="font-mono text-xs text-slate-500">
                    {study.architecture.join(' · ')}
                  </p>
                  <button
                    type="button"
                    onClick={onOpenEstimator}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0066FF] hover:text-[#0A192F] transition-colors cursor-pointer"
                  >
                    <span>Estimate Similar Build</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Why XeroTech & Corporate Governance Section */}
      <section
        id="why-xerotech"
        className="py-16 lg:py-24 bg-[#0A192F] text-white border-b border-slate-800"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6">
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[#00C2FF]">
                Corporate Accountability · {COMPANY_INFO.brandNameAr}
              </p>
              <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                Built on Regulated Bahrain Compliance &amp; Auditable Execution
              </h2>
              <p className="mt-4 text-base text-slate-300 leading-relaxed">
                Operating under Commercial Registration {COMPANY_INFO.crNumber} in Riffa, XeroTech
                Technologies pairs full-stack software engineering with milestone-gated BHD billing
                and unified XBMS financial receipts.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <button
                  type="button"
                  onClick={onOpenPortal}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0066FF] px-5 py-3 text-sm font-semibold text-white hover:bg-[#0052CC] transition-colors cursor-pointer"
                >
                  <span>Inspect XBMS Ledger Preview</span>
                  <ArrowUpRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onOpenEstimator}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-5 py-3 text-sm font-semibold text-white hover:border-slate-500 transition-colors cursor-pointer"
                >
                  <span>Request Official Quotation</span>
                </button>
              </div>
            </div>

            <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <Building2 className="w-6 h-6 text-[#00C2FF]" />
                <h3 className="mt-4 text-base font-bold text-white">MOIC CR {COMPANY_INFO.crNumber}</h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                  Legally incorporated IT engineering firm with physical offices near IMC Hospital,
                  Lulu Road, Riffa.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <FileCheck2 className="w-6 h-6 text-[#00C2FF]" />
                <h3 className="mt-4 text-base font-bold text-white">3-Decimal BHD Integrity</h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                  All proposals, advance payments, and balance statements reconcile cleanly to
                  0.000 BHD precision.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <ShieldCheck className="w-6 h-6 text-[#00C2FF]" />
                <h3 className="mt-4 text-base font-bold text-white">50/50 Milestone Gates</h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                  Projects launch with clear scope sign-off, 50% advance verification, and verified
                  staging acceptance.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <CheckCircle2 className="w-6 h-6 text-[#00C2FF]" />
                <h3 className="mt-4 text-base font-bold text-white">End-to-End Ownership</h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                  From fiber office networking and cloud firewalls to custom AI workflows, one
                  accountable engineering team.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
