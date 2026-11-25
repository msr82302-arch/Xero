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
      <section id="case-studies" className="py-16 lg:py-24 bg-transparent border-b border-slate-200/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl rounded-2xl glass-surface p-6 sm:p-7">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[#0066FF]">
              Verified Commercial Deployments · Kingdom of Bahrain
            </p>
            <h2 className="mt-2.5 text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0f172a]">
              Production Case Studies
            </h2>
            <p className="mt-3 text-base text-[#1e293b] leading-relaxed">
              Audited contracts delivered by XeroTech Technologies across travel processing portals
              and hospitality digital transformation.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-8">
            {XEROTECH_CASE_STUDIES.map((study) => (
              <article
                key={study.id}
                className="flex flex-col justify-between rounded-3xl glass-surface glass-interactive p-7 sm:p-8"
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-white/55">
                    <span className="font-mono text-xs font-semibold text-[#0369a1]">
                      Ref: {study.referenceCode} · {study.sector}
                    </span>
                    <span className="font-mono text-xs font-semibold text-emerald-800">
                      {study.status}
                    </span>
                  </div>

                  <div className="mt-5 flex flex-wrap items-baseline justify-between gap-4">
                    <div>
                      <h3 className="text-2xl font-extrabold text-[#0f172a]">{study.client}</h3>
                      <p dir="rtl" className="text-sm text-[#475569] mt-0.5">
                        {study.clientAr}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-xs uppercase tracking-wider text-[#475569]">
                        Contract Value
                      </div>
                      <div className="mt-1 inline-flex rounded-full glass-price-badge px-3 py-1 font-mono text-xl font-extrabold tabular-nums">
                        {study.contractValueBHD}
                      </div>
                    </div>
                  </div>

                  <h4 className="mt-4 text-base font-bold text-[#0f172a]">{study.title}</h4>
                  <p className="mt-2 text-sm text-[#1e293b] leading-relaxed">{study.summary}</p>

                  <div className="mt-4 font-mono text-xs text-[#1e293b] glass-panel-subtle rounded-xl px-4 py-3">
                    {study.financialNote} · {study.timeline}
                  </div>

                  <ul className="mt-5 space-y-2.5">
                    {study.deliverables.map((deliverable) => (
                      <li key={deliverable} className="flex items-start gap-2.5 text-sm text-[#1e293b]">
                        <CheckCircle2 className="w-4 h-4 text-[#0369a1] mt-0.5 shrink-0" />
                        <span>{deliverable}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-7 pt-5 border-t border-white/55 flex flex-wrap items-center justify-between gap-4">
                  <p className="font-mono text-xs text-[#475569]">
                    {study.architecture.join(' · ')}
                  </p>
                  <button
                    type="button"
                    onClick={onOpenEstimator}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0369a1] hover:text-[#0052CC] transition-colors cursor-pointer"
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
        className="py-16 lg:py-24 bg-transparent text-[#0f172a] border-b border-slate-200/60"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 rounded-3xl glass-surface p-7 sm:p-8">
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[#0066FF]">
                Corporate Accountability · {COMPANY_INFO.brandNameAr}
              </p>
              <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0f172a]">
                Built on Regulated Bahrain Compliance &amp; Auditable Execution
              </h2>
              <p className="mt-4 text-base text-[#1e293b] leading-relaxed">
                Operating under Commercial Registration {COMPANY_INFO.crNumber} in Riffa, XeroTech
                Technologies pairs full-stack software engineering with milestone-gated BHD billing
                and unified XBMS financial receipts.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <button
                  type="button"
                  onClick={onOpenPortal}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0066FF] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-[#0052CC] transition-colors cursor-pointer"
                >
                  <span>Inspect XBMS Ledger Preview</span>
                  <ArrowUpRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onOpenEstimator}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/75 bg-white/68 backdrop-blur-md px-5 py-3 text-sm font-semibold text-[#0f172a] hover:border-sky-400/60 hover:bg-white/85 hover:text-[#0369a1] transition-colors cursor-pointer"
                >
                  <span>Request Official Quotation</span>
                </button>
              </div>
            </div>

            <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="rounded-2xl glass-surface glass-interactive p-6">
                <Building2 className="w-6 h-6 text-[#0369a1]" />
                <h3 className="mt-4 text-base font-bold text-[#0f172a]">MOIC CR {COMPANY_INFO.crNumber}</h3>
                <p className="mt-2 text-sm text-[#1e293b] leading-relaxed">
                  Legally incorporated IT engineering firm with physical offices near IMC Hospital,
                  Lulu Road, Riffa.
                </p>
              </div>

              <div className="rounded-2xl glass-surface glass-interactive p-6">
                <FileCheck2 className="w-6 h-6 text-[#0369a1]" />
                <h3 className="mt-4 text-base font-bold text-[#0f172a]">3-Decimal BHD Integrity</h3>
                <p className="mt-2 text-sm text-[#1e293b] leading-relaxed">
                  All proposals, advance payments, and balance statements reconcile cleanly to
                  0.000 BHD precision.
                </p>
              </div>

              <div className="rounded-2xl glass-surface glass-interactive p-6">
                <ShieldCheck className="w-6 h-6 text-[#0369a1]" />
                <h3 className="mt-4 text-base font-bold text-[#0f172a]">50/50 Milestone Gates</h3>
                <p className="mt-2 text-sm text-[#1e293b] leading-relaxed">
                  Projects launch with clear scope sign-off, 50% advance verification, and verified
                  staging acceptance.
                </p>
              </div>

              <div className="rounded-2xl glass-surface glass-interactive p-6">
                <CheckCircle2 className="w-6 h-6 text-[#0369a1]" />
                <h3 className="mt-4 text-base font-bold text-[#0f172a]">End-to-End Ownership</h3>
                <p className="mt-2 text-sm text-[#1e293b] leading-relaxed">
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
