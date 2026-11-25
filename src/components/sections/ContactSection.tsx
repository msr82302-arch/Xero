import {Calculator, Mail, MapPin, MessageSquare, Phone} from 'lucide-react';
import {COMPANY_INFO} from '@/src/data/services';

interface ContactSectionProps {
  onOpenEstimator: () => void;
}

export function ContactSection({onOpenEstimator}: ContactSectionProps) {
  return (
    <section id="contact" className="py-16 lg:py-24 bg-slate-50 border-b border-slate-200/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-200/90 bg-white p-8 sm:p-12 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7">
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[#0066FF]">
                Direct Bahrain Engineering Desk · Riffa HQ
              </p>
              <h2 className="mt-2.5 text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0A192F]">
                Ready to Scope Your Next System?
              </h2>
              <p className="mt-3 text-base text-slate-600 leading-relaxed max-w-2xl">
                Connect directly with our Riffa engineering office for an itemized 3-decimal BHD
                proposal, technical architecture review, or on-site infrastructure assessment.
              </p>

              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="flex items-start gap-3.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#0066FF] shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Corporate Address
                    </div>
                    <div className="mt-1 text-sm font-semibold text-[#0A192F]">
                      {COMPANY_INFO.address}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#0066FF] shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Bahrain Hotlines
                    </div>
                    <div className="mt-1 font-mono text-sm font-semibold text-[#0A192F] space-y-0.5">
                      {COMPANY_INFO.phones.map((phone) => (
                        <div key={phone}>
                          <a
                            href={`tel:${phone.replace(/\s+/g, '')}`}
                            className="hover:text-[#0066FF] transition-colors"
                          >
                            {phone}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 sm:col-span-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#0066FF] shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Official Emails
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 font-mono text-sm font-semibold text-[#0A192F]">
                      <a
                        href={`mailto:${COMPANY_INFO.primaryEmail}`}
                        className="hover:text-[#0066FF] transition-colors"
                      >
                        {COMPANY_INFO.primaryEmail}
                      </a>
                      <a
                        href="mailto:madeenaspc@gmail.com"
                        className="hover:text-[#0066FF] transition-colors"
                      >
                        madeenaspc@gmail.com
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-6 sm:p-7">
              <div className="font-mono text-xs font-semibold uppercase tracking-wider text-slate-500">
                Fast-Track Lead Intake
              </div>
              <h3 className="text-xl font-bold text-[#0A192F]">
                Instant Project Scope &amp; WhatsApp Dispatch
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Select required services from our 12-line matrix to calculate your live BHD
                benchmark and transmit directly to our senior engineering desk.
              </p>

              <button
                type="button"
                onClick={onOpenEstimator}
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-[#0066FF] px-5 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0052CC] transition-colors cursor-pointer"
              >
                <Calculator className="w-4 h-4" />
                <span>Launch Project Estimator</span>
              </button>

              <a
                href={`https://wa.me/${COMPANY_INFO.whatsappDigits}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-semibold text-[#0A192F] hover:border-blue-300 hover:text-[#0066FF] transition-colors"
              >
                <MessageSquare className="w-4 h-4 text-[#0066FF]" />
                <span>Chat on WhatsApp ({COMPANY_INFO.whatsappDisplay})</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
