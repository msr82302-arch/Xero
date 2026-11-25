import {
  FileCheck2,
  Globe,
  KeyRound,
  LogOut,
  Monitor,
  ShieldAlert,
  Stamp,
  Terminal,
} from 'lucide-react';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {ChangePasswordForm} from '@/src/components/auth/ChangePasswordForm';
import {DraftQuotationsModal} from '@/src/components/modals/DraftQuotationsModal';
import {A4PaperPreview} from '@/src/components/terminal/A4PaperPreview';
import {QuickBillerForm} from '@/src/components/terminal/QuickBillerForm';
import {useAuth} from '@/src/context/AuthContext';
import {COMPANY_INFO, services} from '@/src/data/services';
import {apiClient} from '@/src/lib/api';
import type {
  BoqLineItem,
  CompanySettings,
  PaymentChannel,
  PaymentTerms,
  QuotationRecord,
  ReceiptRecord,
} from '@/src/types/xbms';
import {roundBHD} from '@/src/types/xbms';

type ViewMode = 'split' | 'form' | 'preview';

export function StaffTerminalPage() {
  const {user, logout} = useAuth();
  const navigate = useNavigate();

  const [terminalConfig, setTerminalConfig] = useState<
    (CompanySettings & {nextSequenceNo: string}) | null
  >(null);
  const [quotations, setQuotations] = useState<QuotationRecord[]>([]);
  const [loadingQuotations, setLoadingQuotations] = useState(false);
  const [draftsModalOpen, setDraftsModalOpen] = useState(false);
  const [changePwOpen, setChangePwOpen] = useState(false);

  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [stampOn, setStampOn] = useState(true);
  const [activeReceiptNo, setActiveReceiptNo] = useState('XT-REC-2026-11-005');

  // Form State synchronized with live ISO A4 Preview
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('+973 ');
  const [clientEmail, setClientEmail] = useState('');
  const [serviceName, setServiceName] = useState(services[0].name);
  const [projectTitle, setProjectTitle] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentChannel>('BenefitPay');
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>('Partial Payment (50%)');
  const [items, setItems] = useState<BoqLineItem[]>([
    {
      id: 'boq-initial-1',
      description: services[0].name,
      qty: 1,
      unitPriceBHD: services[0].numericPriceBHD,
      amountBHD: services[0].numericPriceBHD,
    },
  ]);
  const [advanceStr, setAdvanceStr] = useState('125.000');
  const [notes, setNotes] = useState('');

  const bahrainDateDisplay = useMemo(
    () =>
      new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Bahrain',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date()),
    [],
  );

  const loadConfigAndQuotations = useCallback(async () => {
    setLoadingQuotations(true);
    try {
      const [cfgRes, qotRes] = await Promise.all([
        apiClient.get<{config: CompanySettings & {nextSequenceNo: string}}>('/terminal/config/'),
        apiClient.get<{quotations: QuotationRecord[]}>('/quotations/'),
      ]);
      setTerminalConfig(cfgRes.data.config);
      setActiveReceiptNo(cfgRes.data.config.nextSequenceNo);
      setStampOn(cfgRes.data.config.renderOfficialStamp);
      setQuotations(qotRes.data.quotations);
    } catch {
      // Non-fatal fallback defaults remain
    } finally {
      setLoadingQuotations(false);
    }
  }, []);

  useEffect(() => {
    void loadConfigAndQuotations();
  }, [loadConfigAndQuotations]);

  const totalBHD = useMemo(() => {
    const filsSum = items.reduce((acc, row) => acc + Math.round(row.amountBHD * 1000), 0);
    return roundBHD(filsSum / 1000);
  }, [items]);

  const advancePaidBHD = useMemo(() => {
    const parsed = Number.parseFloat(advanceStr);
    const clamped =
      Number.isFinite(parsed) && parsed >= 0 ? Math.min(parsed, totalBHD) : 0;
    return roundBHD(clamped);
  }, [advanceStr, totalBHD]);

  const balanceBHD = useMemo(() => {
    const fils = Math.max(
      0,
      Math.round(totalBHD * 1000) - Math.round(advancePaidBHD * 1000),
    );
    return roundBHD(fils / 1000);
  }, [totalBHD, advancePaidBHD]);

  const derivedStatus: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID' = useMemo(() => {
    if (totalBHD > 0 && balanceBHD === 0) return 'PAID';
    if (advancePaidBHD > 0 && balanceBHD > 0) return 'PARTIALLY_PAID';
    return 'UNPAID';
  }, [totalBHD, advancePaidBHD, balanceBHD]);

  const handleLoadApprovedQuotation = (qot: QuotationRecord) => {
    setClientName(qot.clientName);
    setClientPhone(qot.clientPhone);
    setClientEmail(qot.clientEmail);
    const firstService =
      services.find((s) => qot.serviceNames.includes(s.name))?.name || services[0].name;
    setServiceName(firstService);
    setProjectTitle(`${qot.quotationNo || qot.referenceCode} — ${qot.serviceNames.join(', ')}`);

    if (qot.items && qot.items.length > 0) {
      setItems(qot.items);
    } else {
      setItems([
        {
          id: `boq-qot-${qot.id}`,
          description: qot.serviceNames.join(' + ') || firstService,
          qty: 1,
          unitPriceBHD: qot.estimatedTotalBHD,
          amountBHD: qot.estimatedTotalBHD,
        },
      ]);
    }
    setAdvanceStr(qot.advanceMilestoneBHD.toFixed(3));
    setPaymentTerms('Partial Payment (50%)');
    setNotes(qot.notes || '');
  };

  const handleResetForm = () => {
    setClientName('');
    setClientPhone('+973 ');
    setClientEmail('');
    setServiceName(services[0].name);
    setProjectTitle('');
    setPaymentMethod('BenefitPay');
    setPaymentTerms('Partial Payment (50%)');
    setItems([
      {
        id: `boq-reset-${Date.now()}`,
        description: services[0].name,
        qty: 1,
        unitPriceBHD: services[0].numericPriceBHD,
        amountBHD: services[0].numericPriceBHD,
      },
    ]);
    setAdvanceStr('125.000');
    setNotes('');
    if (terminalConfig) {
      setActiveReceiptNo(terminalConfig.nextSequenceNo);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-transparent text-[#0f172a]">
      {/* Mobile / Small Tablet Desktop-Only Workstation Guard */}
      <div className="lg:hidden min-h-screen bg-transparent flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-3xl glass-modal p-7 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 border border-amber-200 text-amber-600">
            <Monitor className="w-7 h-7" />
          </div>
          <div className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#0066FF]">
            Desktop Workstation Required
          </div>
          <h1 className="text-lg font-extrabold text-[#0f172a]">
            Staff Billing Terminal Is Restricted to Desktop Screens
          </h1>
          <p className="text-xs text-[#334155] leading-relaxed">
            For accurate multi-line BoQ entry and side-by-side ISO A4 receipt verification, please
            open <span className="font-mono font-semibold text-[#0f172a]">/terminal</span> on a desktop workstation
            (1024px+ width). Mobile administrative routes remain blocked for STAFF accounts.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <Link
              to="/"
              className="rounded-xl bg-[#0066FF] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#0052CC]"
            >
              Return to Public Portfolio
            </Link>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-[#334155] hover:bg-slate-50 cursor-pointer"
            >
              Secure Logout
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Staff Workstation (1024px+) */}
      <div className="hidden lg:flex min-h-screen flex-col">
        {/* Top Operational Workstation Bar */}
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl text-[#0f172a]">
          <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-4 px-6">
            <div className="flex items-center gap-3">
              <img
                src="/assets/aistudio/logo_e1b61aee.png"
                alt="XeroTech"
                className="h-9 w-9 rounded-lg bg-slate-100 border border-slate-200 p-1 object-contain"
                referrerPolicy="no-referrer"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold tracking-tight text-[#0f172a]">
                    XeroTech Staff Billing Terminal
                  </span>
                  <span className="rounded bg-[#0066FF] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white">
                    STAFF WORKSTATION
                  </span>
                </div>
                <div className="font-mono text-[10px] text-[#64748b]">
                  CR {COMPANY_INFO.crNumber} · Strict 3-Decimal BHD Counter Billing
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  void loadConfigAndQuotations();
                  setDraftsModalOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-[#0f172a] hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <FileCheck2 className="w-4 h-4 text-[#0066FF]" />
                <span>Draft Quotations ({quotations.length})</span>
              </button>

              <Link
                to="/admin/dashboard"
                title="Tests Two-Role RBAC Guard (Blocked for STAFF)"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-[#334155] hover:bg-slate-50 hover:text-[#0f172a] transition-colors whitespace-nowrap shrink-0"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                <span>Admin Guard</span>
              </Link>

              <Link
                to="/"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-[#334155] hover:bg-slate-50 hover:text-[#0f172a] transition-colors whitespace-nowrap shrink-0"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Portfolio</span>
              </Link>

              <div className="h-6 w-px bg-slate-200 mx-1" />

              <div className="text-right pr-1">
                <div className="text-xs font-bold leading-tight text-[#0f172a]">{user?.name}</div>
                <div className="font-mono text-[10px] text-[#64748b]">{user?.email}</div>
              </div>

              <button
                type="button"
                onClick={() => setChangePwOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-[#334155] hover:bg-slate-50 hover:text-[#0f172a] transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <KeyRound className="w-3.5 h-3.5 text-[#0066FF]" />
                <span>Security</span>
              </button>

              <button
                type="button"
                onClick={() => void handleLogout()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-[#334155] hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Sub-Toolbar Controls (Split View / Form Only / Full PDF Preview / Stamp ON-OFF) */}
        <div className="border-b border-slate-200/80 bg-white/75 backdrop-blur-md">
          <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-6 py-3">
            <div className="flex items-center gap-2.5">
              <Terminal className="w-4 h-4 text-[#0066FF]" />
              <span className="text-sm font-extrabold text-[#0f172a]">
                Counter Receipt &amp; Quotation Generator
              </span>
              <span className="rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-0.5 font-mono text-[11px] font-bold text-[#0066FF]">
                Next Sequence: {activeReceiptNo}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setStampOn((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                  stampOn
                    ? 'border-sky-200 bg-sky-50 text-[#0066FF]'
                    : 'border-slate-300 bg-white text-[#475569]'
                }`}
              >
                <Stamp className="w-3.5 h-3.5" />
                <span>Stamp: {stampOn ? 'ON' : 'OFF'}</span>
              </button>

              <div className="inline-flex rounded-xl glass-panel-subtle p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setViewMode('split')}
                  className={`rounded-lg px-3 py-1 cursor-pointer transition-colors ${
                    viewMode === 'split'
                      ? 'bg-[#0066FF] text-white'
                      : 'text-[#475569] hover:text-[#0f172a]'
                  }`}
                >
                  Split View
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('form')}
                  className={`rounded-lg px-3 py-1 cursor-pointer transition-colors ${
                    viewMode === 'form'
                      ? 'bg-[#0066FF] text-white'
                      : 'text-[#475569] hover:text-[#0f172a]'
                  }`}
                >
                  Form Only
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('preview')}
                  className={`rounded-lg px-3 py-1 cursor-pointer transition-colors ${
                    viewMode === 'preview'
                      ? 'bg-[#0066FF] text-white'
                      : 'text-[#475569] hover:text-[#0f172a]'
                  }`}
                >
                  Full PDF Preview
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Split-Screen Workspace */}
        <main className="mx-auto w-full max-w-[1600px] flex-1 p-6">
          <div
            className={`grid gap-6 items-start ${
              viewMode === 'split' ? 'grid-cols-12' : 'grid-cols-1 max-w-4xl mx-auto'
            }`}
          >
            {viewMode !== 'preview' && (
              <div className={viewMode === 'split' ? 'col-span-5' : ''}>
                <QuickBillerForm
                  clientName={clientName}
                  setClientName={setClientName}
                  clientPhone={clientPhone}
                  setClientPhone={setClientPhone}
                  clientEmail={clientEmail}
                  setClientEmail={setClientEmail}
                  serviceName={serviceName}
                  setServiceName={setServiceName}
                  projectTitle={projectTitle}
                  setProjectTitle={setProjectTitle}
                  paymentMethod={paymentMethod}
                  setPaymentMethod={setPaymentMethod}
                  paymentTerms={paymentTerms}
                  setPaymentTerms={setPaymentTerms}
                  items={items}
                  setItems={setItems}
                  advanceStr={advanceStr}
                  setAdvanceStr={setAdvanceStr}
                  notes={notes}
                  setNotes={setNotes}
                  totalBHD={totalBHD}
                  advancePaidBHD={advancePaidBHD}
                  balanceBHD={balanceBHD}
                  derivedStatus={derivedStatus}
                  onReceiptFinalized={(rec, nextSeq) => {
                    setActiveReceiptNo(rec.receiptNo);
                    setTerminalConfig((prev) =>
                      prev ? {...prev, nextSequenceNo: nextSeq} : prev,
                    );
                  }}
                  onQuotationSubmitted={(qot) => {
                    setQuotations((prev) => [qot, ...prev]);
                  }}
                  onResetForm={handleResetForm}
                />
              </div>
            )}

            {viewMode !== 'form' && (
              <div className={viewMode === 'split' ? 'col-span-7 sticky top-24' : ''}>
                <div className="mb-2.5 flex items-center justify-between px-3 py-1.5 rounded-xl glass-panel-subtle font-mono text-[11px] font-semibold text-[#334155]">
                  <span>Live ISO A4 Paper Render (210 × 297 mm · Asia/Bahrain)</span>
                  <span className="text-[#0066FF]">Sequence: {activeReceiptNo}</span>
                </div>
                <A4PaperPreview
                  receiptNo={activeReceiptNo}
                  dateDisplay={bahrainDateDisplay}
                  clientName={clientName}
                  clientPhone={clientPhone}
                  clientEmail={clientEmail}
                  serviceName={serviceName}
                  projectTitle={projectTitle}
                  paymentMethod={paymentMethod}
                  paymentTerms={paymentTerms}
                  items={items}
                  totalBHD={totalBHD}
                  advancePaidBHD={advancePaidBHD}
                  balanceBHD={balanceBHD}
                  status={derivedStatus}
                  stampOn={stampOn}
                  defaultTerms={terminalConfig?.defaultTerms}
                  signatoryTitle={terminalConfig?.signatoryTitle}
                  showServicesFooter={terminalConfig?.displayServicesFooter ?? true}
                />
              </div>
            )}
          </div>
        </main>
      </div>

      <DraftQuotationsModal
        isOpen={draftsModalOpen}
        onClose={() => setDraftsModalOpen(false)}
        quotations={quotations}
        loading={loadingQuotations}
        onSelectApprovedQuotation={handleLoadApprovedQuotation}
      />

      <ChangePasswordForm isOpen={changePwOpen} onClose={() => setChangePwOpen(false)} />
    </div>
  );
}
