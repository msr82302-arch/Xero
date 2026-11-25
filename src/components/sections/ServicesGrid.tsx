import {ArrowUpRight, Check, FileText, Plus} from 'lucide-react';
import {useMemo, useState} from 'react';
import {ServiceIcon} from '@/src/components/common/ServiceIcon';
import {type ServiceCategory, type ServiceItem, services} from '@/src/data/services';

interface ServicesGridProps {
  selectedServiceIds: number[];
  onToggleService: (serviceId: number) => void;
  onInspectService: (service: ServiceItem) => void;
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

const DELIVERY_STEPS = [
  {
    step: '01',
    title: 'Discovery & Architecture',
    detail: 'Technical scoping, 3-decimal BHD benchmark schedule & milestone sign-off.',
  },
  {
    step: '02',
    title: 'Agile Milestone Build',
    detail: 'Sprint-based engineering, staging previews & Bahrain payment/API verification.',
  },
  {
    step: '03',
    title: 'Production Deployment & Handover',
    detail: 'Hardened cloud launch, operator training, documentation & ongoing SLA support.',
  },
] as const;

export function ServicesGrid({
  selectedServiceIds,
  onToggleService,
  onInspectService,
  onOpenEstimator,
}: ServicesGridProps) {
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('ALL');

  const filteredServices: ServiceItem[] = useMemo(() => {
    if (activeCategory === 'ALL') return services;
    return services.filter((item) => item.category === activeCategory);
  }, [activeCategory]);

  return (
    <section id="services" className="pt-8 pb-12 lg:pt-10 lg:pb-16 bg-transparent border-b border-slate-200/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="rounded-2xl glass-surface p-5 sm:p-6 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[#0066FF]">
              Official Bahrain Service Matrix · 12 Core Capabilities
            </p>
            <h2 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[#0f172a]">
              Enterprise Engineering &amp; Digital Solutions
            </h2>
            <p className="mt-2 text-sm sm:text-base text-[#1e293b] leading-relaxed">
              Every service line carries transparent Bahraini Dinar benchmark pricing to three
              decimal places, clear production timelines, and verifiable deliverables.
            </p>
          </div>

          {selectedServiceIds.length > 0 && (
            <button
              type="button"
              onClick={onOpenEstimator}
              className="min-h-[44px] inline-flex items-center gap-2 self-start lg:self-auto rounded-xl bg-[#0066FF] px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-[#0052CC] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Review Estimate ({selectedServiceIds.length} Selected)</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Horizontal Swipeable Category Filter Tabs on Mobile */}
        <div
          role="tablist"
          aria-label="Filter IT services by category"
          className="mt-5 flex flex-nowrap overflow-x-auto no-scrollbar gap-2 pb-1 md:flex-wrap md:overflow-visible"
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
                className={`min-h-[44px] inline-flex items-center rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-[#0066FF] text-white shadow-md shadow-blue-600/25 border border-[#0066FF]'
                    : 'bg-white/72 backdrop-blur-md border border-white/80 text-[#0f172a] shadow-sm hover:bg-white/88 hover:border-sky-400/60'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* 12-Service Glassmorphism Grid (Single-Column Stack on Mobile) */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {filteredServices.map((service) => {
            const isQueued = selectedServiceIds.includes(service.id);
            return (
              <article
                id={`service-card-${service.id}`}
                key={service.id}
                className={`group flex flex-col justify-between rounded-2xl glass-surface glass-interactive p-5 sm:p-6 ${
                  isQueued
                    ? '!bg-white/68 !border-sky-500/65 ring-1 ring-sky-500/35'
                    : ''
                }`}
              >
                <div>
                  {/* Card Top Metadata & Icon */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/75 text-[#0369a1] border border-white/80 shrink-0 group-hover:bg-[#0066FF] group-hover:text-white group-hover:border-[#0066FF] transition-colors">
                      <ServiceIcon name={service.iconName} className="w-5 h-5" />
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#475569]">
                        {service.code} · {service.categoryLabel}
                      </div>
                      <div className="mt-1 inline-flex items-baseline gap-1 rounded-full glass-price-badge px-2.5 py-0.5 font-mono text-base font-bold tabular-nums">
                        <span>{service.benchmarkPriceBHD}</span>
                        <span className="text-[11px] font-semibold">BHD</span>
                      </div>
                    </div>
                  </div>

                  {/* Title & Arabic Subtitle */}
                  <div className="mt-4">
                    <h3 className="text-lg font-bold text-[#0f172a] leading-snug">
                      {service.name}
                    </h3>
                    <div className="mt-1 flex items-center justify-between text-xs text-[#475569]">
                      <span dir="rtl" className="font-medium text-[#1e293b]">
                        {service.nameAr}
                      </span>
                      <span className="font-mono text-[11px] text-[#475569]">
                        {service.timeline}
                      </span>
                    </div>
                  </div>

                  <p className="mt-3 text-sm text-[#1e293b] leading-relaxed">
                    {service.description}
                  </p>

                  {/* Key Deliverables */}
                  <ul className="mt-4 space-y-2 border-t border-white/55 pt-3.5">
                    {service.deliverables.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-xs text-[#1e293b]">
                        <Check className="w-3.5 h-3.5 text-[#0369a1] mt-0.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Card Footer: Tech Stack + Dual Action (Scope & Deliverables + Toggle Selection) */}
                <div className="mt-5 pt-4 border-t border-white/55 space-y-3">
                  <p className="font-mono text-[11px] text-[#475569] truncate">
                    {service.techStack.slice(0, 3).join(' · ')}
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onInspectService(service)}
                      className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/80 bg-white/70 px-3 py-2 text-xs font-semibold text-[#0f172a] hover:border-sky-400/60 hover:bg-white/90 hover:text-[#0369a1] transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#0369a1]" />
                      <span>Scope &amp; Deliverables</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onToggleService(service.id)}
                      className={`min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        isQueued
                          ? 'bg-sky-50 text-[#0066FF] border border-sky-300'
                          : 'bg-[#0066FF] text-white hover:bg-[#0052CC]'
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
                </div>
              </article>
            );
          })}
        </div>

        {/* Enterprise Delivery Strip: Engagement Process */}
        <div className="mt-8 rounded-2xl glass-surface p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-white/55">
            <div>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0066FF]">
                Engagement Process
              </p>
              <h3 className="text-base sm:text-lg font-bold text-[#0f172a]">
                Structured 3-Phase Enterprise Delivery
              </h3>
            </div>
            <span className="font-mono text-xs font-semibold text-[#475569]">
              Scope → Milestone Build → Production Handover
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            {DELIVERY_STEPS.map((item, idx) => (
              <div
                key={item.step}
                className="relative rounded-xl glass-panel-subtle p-4 flex items-start gap-3"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0066FF] font-mono text-xs font-bold text-white shrink-0">
                  {item.step}
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-[#0f172a] leading-snug">
                    {idx + 1}. {item.title}
                  </div>
                  <p className="mt-1 text-xs text-[#334155] leading-relaxed">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
