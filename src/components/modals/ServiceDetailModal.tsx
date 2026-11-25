import {ArrowRight, Check, CheckCircle2, Clock, Layers, Plus, X} from 'lucide-react';
import {useEffect} from 'react';
import {ServiceIcon} from '@/src/components/common/ServiceIcon';
import {COMPANY_INFO, type ServiceItem} from '@/src/data/services';

interface ServiceDetailModalProps {
  service: ServiceItem | null;
  isSelected: boolean;
  onClose: () => void;
  onToggleSelect: (serviceId: number) => void;
  onAssignScope: (serviceId: number) => void;
}

export function ServiceDetailModal({
  service,
  isSelected,
  onClose,
  onToggleSelect,
  onAssignScope,
}: ServiceDetailModalProps) {
  useEffect(() => {
    if (!service) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [service, onClose]);

  if (!service) return null;

  const milestones = [
    {
      phase: 'Milestone 1 · Discovery & Spec Sign-Off',
      detail: 'Technical architecture blueprint, CR-aligned BHD schedule & 50% kickoff gate.',
    },
    {
      phase: 'Milestone 2 · Core Engineering & QA',
      detail: `Production implementation of ${service.shortName} deliverables with staging review.`,
    },
    {
      phase: 'Milestone 3 · Production Handover',
      detail: 'Live deployment, team training, documentation & source/credential transfer.',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/45 backdrop-blur-md p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="service-detail-title"
    >
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl glass-modal">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white/85 px-5 sm:px-6 py-4">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 border border-sky-200 text-[#0066FF] shrink-0">
              <ServiceIcon name={service.iconName} className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#0066FF]">
                {service.code} · {service.categoryLabel} · CR {COMPANY_INFO.crNumber}
              </div>
              <h2
                id="service-detail-title"
                className="text-lg sm:text-xl font-extrabold text-[#0f172a] leading-snug"
              >
                {service.name}
              </h2>
              <p dir="rtl" className="text-xs font-medium text-[#475569] mt-0.5 text-left">
                {service.nameAr}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Scope and Deliverables"
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl text-[#64748b] hover:bg-slate-100 hover:text-[#0f172a] transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Commercial & Timeline Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-2xl glass-panel-subtle p-4 flex items-center justify-between">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-wider text-[#475569]">
                  BHD Benchmark Rate
                </div>
                <div className="mt-1 font-mono text-xl font-extrabold text-[#0369a1] tabular-nums">
                  {service.benchmarkPriceBHD} BHD
                </div>
              </div>
              <span className="rounded-full glass-price-badge px-2.5 py-1 font-mono text-[11px] font-bold">
                3-Decimal BHD
              </span>
            </div>

            <div className="rounded-2xl glass-panel-subtle p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/80 text-[#0066FF] border border-white/80 shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="font-mono text-[11px] uppercase tracking-wider text-[#475569]">
                  Estimated Turnaround
                </div>
                <div className="mt-0.5 text-sm font-bold text-[#0f172a]">
                  {service.timeline}
                </div>
              </div>
            </div>
          </div>

          {/* Scope Overview */}
          <div>
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#475569]">
              Scope Overview
            </h3>
            <p className="mt-2 text-sm text-[#1e293b] leading-relaxed">
              {service.description}
            </p>
          </div>

          {/* Included Deliverables */}
          <div className="rounded-2xl glass-panel-subtle p-4 sm:p-5">
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#0066FF] mb-3">
              Included Deliverables
            </h3>
            <ul className="space-y-2.5">
              {service.deliverables.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-[#0f172a]">
                  <CheckCircle2 className="w-4 h-4 text-[#0066FF] mt-0.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Delivery Milestones */}
          <div>
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#475569] mb-2.5">
              Included Milestones
            </h3>
            <div className="space-y-2.5">
              {milestones.map((m) => (
                <div
                  key={m.phase}
                  className="rounded-xl border border-slate-200/80 bg-white/70 px-4 py-3"
                >
                  <div className="text-xs font-bold text-[#0f172a]">{m.phase}</div>
                  <div className="mt-0.5 text-xs text-[#334155]">{m.detail}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Tech Stack */}
          <div>
            <div className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-[#475569] mb-2">
              <Layers className="w-3.5 h-3.5 text-[#0066FF]" />
              <span>Architecture &amp; Tech Stack</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {service.techStack.map((tech) => (
                <span
                  key={tech}
                  className="rounded-lg border border-slate-200 bg-white/85 px-2.5 py-1 font-mono text-xs font-semibold text-[#0f172a]"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 border-t border-slate-200 bg-white/85 px-5 sm:px-6 py-4">
          <button
            type="button"
            onClick={() => onToggleSelect(service.id)}
            className={`min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer ${
              isSelected
                ? 'border-sky-300 bg-sky-50 text-[#0066FF]'
                : 'border-slate-300 bg-white text-[#0f172a] hover:border-sky-400'
            }`}
          >
            {isSelected ? (
              <>
                <Check className="w-4 h-4" />
                <span>In Estimator (Click to Remove)</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Add to Estimate</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => onAssignScope(service.id)}
            className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#0066FF] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0052CC] transition-colors cursor-pointer"
          >
            <span>Assign This Scope</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
