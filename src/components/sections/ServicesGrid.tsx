import {ArrowUpRight, Check, Plus} from 'lucide-react';
import {useMemo, useState} from 'react';
import {ServiceIcon} from '@/src/components/common/ServiceIcon';
import {type ServiceCategory, type ServiceItem, services} from '@/src/data/services';

interface ServicesGridProps {
  selectedServiceIds: number[];
  onSelectServiceForEstimate: (serviceId: number) => void;
  onOpenEstimator: () => void;
}

type CategoryFilter = 'ALL' | ServiceCategory;

const CATEGORY_TABS: {value: CategoryFilter; label: string}[] = [
  {value: 'ALL', label: 'All Services (12)'},
  {value: 'DEVELOPMENT', label: 'Development'},
  {value: 'INTELLIGENCE', label: 'AI & Automation'},
  {value: 'SOLUTIONS', label: 'Business & NFC'},
  {value: 'INFRASTRUCTURE', label: 'Infrastructure & Cloud'},
  {value: 'CREATIVE', label: 'Design & Meta Ads'},
];

export function ServicesGrid({
  selectedServiceIds,
  onSelectServiceForEstimate,
  onOpenEstimator,
}: ServicesGridProps) {
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('ALL');

  const filteredServices: ServiceItem[] = useMemo(() => {
    if (activeCategory === 'ALL') return services;
    return services.filter((item) => item.category === activeCategory);
  }, [activeCategory]);

  return (
    <section id="services" className="py-16 lg:py-24 bg-slate-50 border-b border-slate-200/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[#0066FF]">
              Official Bahrain Service Matrix · 12 Core Capabilities
            </p>
            <h2 className="mt-2.5 text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0A192F]">
              Enterprise Engineering &amp; Digital Solutions
            </h2>
            <p className="mt-3 text-base text-slate-600 leading-relaxed">
              Every service line carries transparent Bahraini Dinar benchmark pricing to three
              decimal places, clear production timelines, and verifiable deliverables.
            </p>
          </div>

          {selectedServiceIds.length > 0 && (
            <button
              type="button"
              onClick={onOpenEstimator}
              className="inline-flex items-center gap-2 self-start lg:self-auto rounded-xl bg-[#0A192F] px-5 py-3 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-[#0066FF] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Review Estimate ({selectedServiceIds.length} Selected)</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Filter Tabs */}
        <div
          role="tablist"
          aria-label="Filter IT services by category"
          className="mt-8 flex flex-wrap gap-2"
        >
          {CATEGORY_TABS.map((tab) => {
            const isActive = activeCategory === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveCategory(tab.value)}
                className={`rounded-lg px-4 py-2 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-[#0A192F] text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300 hover:text-[#0A192F]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* 12-Service Glassmorphism 2.0 Grid */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((service) => {
            const isQueued = selectedServiceIds.includes(service.id);
            return (
              <article
                id={`service-card-${service.id}`}
                key={service.id}
                className={`group flex flex-col justify-between rounded-2xl bg-white/95 border p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/[0.06] ${
                  isQueued
                    ? 'border-[#0066FF] ring-1 ring-[#0066FF]/20'
                    : 'border-slate-200/90 hover:border-blue-400/60'
                }`}
              >
                <div>
                  {/* Card Top Metadata & Icon */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#0066FF] border border-blue-100 shrink-0 group-hover:bg-[#0066FF] group-hover:text-white transition-colors">
                      <ServiceIcon name={service.iconName} className="w-5 h-5" />
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        {service.code} · {service.categoryLabel}
                      </div>
                      <div className="mt-0.5 font-mono text-lg font-bold text-[#0A192F] tabular-nums">
                        {service.benchmarkPriceBHD}{' '}
                        <span className="text-xs font-semibold text-[#0066FF]">BHD</span>
                      </div>
                    </div>
                  </div>

                  {/* Title & Arabic Subtitle */}
                  <div className="mt-5">
                    <h3 className="text-lg font-bold text-[#0A192F] leading-snug">
                      {service.name}
                    </h3>
                    <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                      <span dir="rtl" className="font-medium text-slate-500">
                        {service.nameAr}
                      </span>
                      <span className="font-mono text-[11px] text-slate-400">
                        {service.timeline}
                      </span>
                    </div>
                  </div>

                  <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                    {service.description}
                  </p>

                  {/* Key Deliverables */}
                  <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                    {service.deliverables.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-xs text-slate-600">
                        <Check className="w-3.5 h-3.5 text-[#0066FF] mt-0.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Card Footer: Tech Stack & Action */}
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                  <p className="font-mono text-[11px] text-slate-400 truncate">
                    {service.techStack.slice(0, 3).join(' · ')}
                  </p>
                  <button
                    type="button"
                    onClick={() => onSelectServiceForEstimate(service.id)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isQueued
                        ? 'bg-blue-50 text-[#0066FF] border border-blue-200'
                        : 'bg-[#0A192F] text-white hover:bg-[#0066FF]'
                    }`}
                  >
                    {isQueued ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>In Estimate</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Select Scope</span>
                      </>
                    )}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
