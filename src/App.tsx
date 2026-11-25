/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {ArrowUpRight} from 'lucide-react';
import {lazy, Suspense, useCallback, useMemo, useState} from 'react';
import {BrowserRouter, Navigate, Route, Routes} from 'react-router-dom';
import {ProtectedRoute} from '@/src/components/auth/ProtectedRoute';
import {Footer} from '@/src/components/layout/Footer';
import {Navbar} from '@/src/components/layout/Navbar';
import {B2bInquiryModal} from '@/src/components/modals/B2bInquiryModal';
import {EstimatorModal} from '@/src/components/modals/EstimatorModal';
import {ServiceDetailModal} from '@/src/components/modals/ServiceDetailModal';
import {XbmsPortalModal} from '@/src/components/modals/XbmsPortalModal';
import {AiStudioSection} from '@/src/components/sections/AiStudioSection';
import {CaseStudiesSection} from '@/src/components/sections/CaseStudiesSection';
import {ContactSection} from '@/src/components/sections/ContactSection';
import {HeroSection} from '@/src/components/sections/HeroSection';
import {ServicesGrid} from '@/src/components/sections/ServicesGrid';
import {AuthProvider} from '@/src/context/AuthContext';
import {formatBHD, type ServiceItem, services} from '@/src/data/services';

const LoginPage = lazy(() =>
  import('@/src/pages/auth/LoginPage').then((m) => ({default: m.LoginPage})),
);
const StaffTerminalPage = lazy(() =>
  import('@/src/pages/terminal/StaffTerminalPage').then((m) => ({default: m.StaffTerminalPage})),
);
const DashboardPage = lazy(() =>
  import('@/src/pages/admin/DashboardPage').then((m) => ({default: m.DashboardPage})),
);
const QuotationsPage = lazy(() =>
  import('@/src/pages/admin/QuotationsPage').then((m) => ({default: m.QuotationsPage})),
);
const ClientsPage = lazy(() =>
  import('@/src/pages/admin/ClientsPage').then((m) => ({default: m.ClientsPage})),
);
const ReceiptsLedgerPage = lazy(() =>
  import('@/src/pages/admin/ReceiptsLedgerPage').then((m) => ({default: m.ReceiptsLedgerPage})),
);
const SettingsPage = lazy(() =>
  import('@/src/pages/admin/SettingsPage').then((m) => ({default: m.SettingsPage})),
);
const AuditLogsPage = lazy(() =>
  import('@/src/pages/admin/AuditLogsPage').then((m) => ({default: m.AuditLogsPage})),
);
const UsersPage = lazy(() =>
  import('@/src/pages/admin/UsersPage').then((m) => ({default: m.UsersPage})),
);

function RouteLoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="glass-surface rounded-2xl px-6 py-4 text-sm font-mono font-semibold text-[#0f172a]">
        Loading XeroTech workspace...
      </div>
    </div>
  );
}

function PublicPortfolioPage() {
  const [estimatorOpen, setEstimatorOpen] = useState(false);
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [portalOpen, setPortalOpen] = useState(false);
  const [inspectedService, setInspectedService] = useState<ServiceItem | null>(null);
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([1]);

  const handleOpenEstimator = useCallback((preselectedIds?: number[]) => {
    if (preselectedIds && preselectedIds.length > 0) {
      setSelectedServiceIds(preselectedIds);
    }
    setEstimatorOpen(true);
  }, []);

  const handleToggleService = useCallback((serviceId: number) => {
    setSelectedServiceIds((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId],
    );
  }, []);

  const handleAssignScope = useCallback((serviceId: number) => {
    setSelectedServiceIds((prev) =>
      prev.includes(serviceId) ? prev : [...prev, serviceId],
    );
    setInspectedService(null);
    setInquiryOpen(true);
  }, []);

  const handleClearServices = useCallback(() => {
    setSelectedServiceIds([]);
  }, []);

  const selectedTotalBHD = useMemo(
    () =>
      services
        .filter((s) => selectedServiceIds.includes(s.id))
        .reduce((acc, item) => acc + item.numericPriceBHD, 0),
    [selectedServiceIds],
  );

  return (
    <div
      className={`min-h-screen flex flex-col bg-transparent text-[#0f172a] ${
        selectedServiceIds.length > 0 ? 'pb-20 md:pb-0' : ''
      }`}
    >
      <Navbar
        onOpenEstimator={handleOpenEstimator}
        onOpenPortal={() => setPortalOpen(true)}
      />

      <main className="flex-1">
        <HeroSection
          onOpenEstimator={() => handleOpenEstimator()}
          onOpenInquiry={() => setInquiryOpen(true)}
        />

        <ServicesGrid
          selectedServiceIds={selectedServiceIds}
          onToggleService={handleToggleService}
          onInspectService={setInspectedService}
          onOpenEstimator={() => handleOpenEstimator()}
        />

        <AiStudioSection />

        <CaseStudiesSection
          onOpenEstimator={() => handleOpenEstimator()}
          onOpenPortal={() => setPortalOpen(true)}
        />

        <ContactSection onOpenEstimator={() => handleOpenEstimator()} />
      </main>

      <Footer
        onOpenEstimator={() => handleOpenEstimator()}
        onOpenPortal={() => setPortalOpen(true)}
      />

      {/* Compact Sticky Bottom Mobile Estimator Bar */}
      {selectedServiceIds.length > 0 && (
        <div className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-white/75 bg-white/88 backdrop-blur-xl px-4 py-2.5 shadow-[0_-8px_28px_rgba(15,23,42,0.12)]">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#475569]">
                {selectedServiceIds.length}{' '}
                {selectedServiceIds.length === 1 ? 'Service' : 'Services'} Selected
              </div>
              <div className="font-mono text-base font-extrabold text-[#0369a1] tabular-nums truncate">
                {formatBHD(selectedTotalBHD)}
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleOpenEstimator()}
              className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl bg-[#0066FF] px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-600/25 hover:bg-[#0052CC] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Review Estimate</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <ServiceDetailModal
        service={inspectedService}
        isSelected={inspectedService ? selectedServiceIds.includes(inspectedService.id) : false}
        onClose={() => setInspectedService(null)}
        onToggleSelect={handleToggleService}
        onAssignScope={handleAssignScope}
      />

      <B2bInquiryModal
        isOpen={inquiryOpen}
        onClose={() => setInquiryOpen(false)}
        selectedServiceIds={selectedServiceIds}
        onToggleService={handleToggleService}
      />

      <EstimatorModal
        isOpen={estimatorOpen}
        onClose={() => setEstimatorOpen(false)}
        selectedServiceIds={selectedServiceIds}
        onToggleService={handleToggleService}
        onClearServices={handleClearServices}
      />

      <XbmsPortalModal
        isOpen={portalOpen}
        onClose={() => setPortalOpen(false)}
        onOpenEstimator={() => handleOpenEstimator()}
      />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="relative min-h-screen text-[#0f172a]">
          {/* Fixed Real-Life Daytime Manama Skyline Background */}
          <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 z-0 xerotech-global-canvas"
          />

          <div className="relative z-10 min-h-screen">
            <Suspense fallback={<RouteLoadingFallback />}>
              <Routes>
                <Route path="/" element={<PublicPortfolioPage />} />
                <Route path="/login" element={<LoginPage />} />

                <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
                <Route
                  path="/admin/dashboard"
                  element={
                    <ProtectedRoute requiredRole="ADMINISTRATOR">
                      <DashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/quotations"
                  element={
                    <ProtectedRoute requiredRole="ADMINISTRATOR">
                      <QuotationsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/clients"
                  element={
                    <ProtectedRoute requiredRole="ADMINISTRATOR">
                      <ClientsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/receipts"
                  element={
                    <ProtectedRoute requiredRole="ADMINISTRATOR">
                      <ReceiptsLedgerPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/settings"
                  element={
                    <ProtectedRoute requiredRole="ADMINISTRATOR">
                      <SettingsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/audit"
                  element={
                    <ProtectedRoute requiredRole="ADMINISTRATOR">
                      <AuditLogsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/users"
                  element={
                    <ProtectedRoute requiredRole="ADMINISTRATOR">
                      <UsersPage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/terminal"
                  element={
                    <ProtectedRoute requiredRole="STAFF">
                      <StaffTerminalPage />
                    </ProtectedRoute>
                  }
                />

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </div>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
