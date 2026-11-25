/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {useCallback, useState} from 'react';
import {BrowserRouter, Navigate, Route, Routes} from 'react-router-dom';
import {ProtectedRoute} from '@/src/components/auth/ProtectedRoute';
import {Footer} from '@/src/components/layout/Footer';
import {Navbar} from '@/src/components/layout/Navbar';
import {EstimatorModal} from '@/src/components/modals/EstimatorModal';
import {XbmsPortalModal} from '@/src/components/modals/XbmsPortalModal';
import {AiStudioSection} from '@/src/components/sections/AiStudioSection';
import {CaseStudiesSection} from '@/src/components/sections/CaseStudiesSection';
import {ContactSection} from '@/src/components/sections/ContactSection';
import {HeroSection} from '@/src/components/sections/HeroSection';
import {ServicesGrid} from '@/src/components/sections/ServicesGrid';
import {AuthProvider} from '@/src/context/AuthContext';
import {AuditLogsPage} from '@/src/pages/admin/AuditLogsPage';
import {ClientsPage} from '@/src/pages/admin/ClientsPage';
import {DashboardPage} from '@/src/pages/admin/DashboardPage';
import {QuotationsPage} from '@/src/pages/admin/QuotationsPage';
import {ReceiptsLedgerPage} from '@/src/pages/admin/ReceiptsLedgerPage';
import {SettingsPage} from '@/src/pages/admin/SettingsPage';
import {UsersPage} from '@/src/pages/admin/UsersPage';
import {LoginPage} from '@/src/pages/auth/LoginPage';
import {StaffTerminalPage} from '@/src/pages/terminal/StaffTerminalPage';

function PublicPortfolioPage() {
  const [estimatorOpen, setEstimatorOpen] = useState(false);
  const [portalOpen, setPortalOpen] = useState(false);
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([1]);

  const handleOpenEstimator = useCallback((preselectedIds?: number[]) => {
    if (preselectedIds && preselectedIds.length > 0) {
      setSelectedServiceIds(preselectedIds);
    }
    setEstimatorOpen(true);
  }, []);

  const handleSelectServiceForEstimate = useCallback((serviceId: number) => {
    setSelectedServiceIds((prev) =>
      prev.includes(serviceId) ? prev : [...prev, serviceId],
    );
    setEstimatorOpen(true);
  }, []);

  const handleToggleService = useCallback((serviceId: number) => {
    setSelectedServiceIds((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId],
    );
  }, []);

  const handleClearServices = useCallback(() => {
    setSelectedServiceIds([]);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-[#0A192F]">
      <Navbar
        onOpenEstimator={handleOpenEstimator}
        onOpenPortal={() => setPortalOpen(true)}
      />

      <main className="flex-1">
        <HeroSection onOpenEstimator={() => handleOpenEstimator()} />

        <ServicesGrid
          selectedServiceIds={selectedServiceIds}
          onSelectServiceForEstimate={handleSelectServiceForEstimate}
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
      </AuthProvider>
    </BrowserRouter>
  );
}
