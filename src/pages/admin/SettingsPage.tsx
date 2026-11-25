import axios from 'axios';
import {Building2, CheckCircle2, FileText, Save} from 'lucide-react';
import {useCallback, useEffect, useState, type FormEvent} from 'react';
import {AdminLayout} from '@/src/components/layout/AdminLayout';
import {apiClient} from '@/src/lib/api';
import type {CompanySettings} from '@/src/types/xbms';

export function SettingsPage() {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [savedNotice, setSavedNotice] = useState('');

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const {data} = await apiClient.get<{settings: CompanySettings}>('/settings/');
      setSettings(data.settings);
    } catch {
      setErrorMsg('Unable to load corporate settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setErrorMsg('');
    setSavedNotice('');
    try {
      const {data} = await apiClient.put<{settings: CompanySettings}>('/settings/', settings);
      setSettings(data.settings);
      setSavedNotice('Corporate identity, numbering policy, and receipt terms saved.');
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setErrorMsg(
          (err.response?.data as {error?: string} | undefined)?.error ||
            'Failed to update settings.',
        );
      } else {
        setErrorMsg('Unexpected error while saving settings.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title="Company & Receipt Configurations">
      <div className="space-y-6 max-w-5xl">
        {/* Header */}
        <div className="rounded-2xl glass-surface px-6 py-5">
          <div className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#0066FF]">
            Configuration Panel
          </div>
          <h1 className="mt-1 text-xl sm:text-2xl font-extrabold text-[#0f172a]">
            Company &amp; Receipt Generator Settings
          </h1>
          <p className="mt-0.5 text-xs text-[#334155]">
            Official business profile, receipt numbering sequence, and legal terms configuration.
          </p>
        </div>

        {errorMsg && (
          <div className="rounded-xl border border-red-200 bg-red-50/90 px-4 py-3 text-xs font-medium text-red-700">
            {errorMsg}
          </div>
        )}

        {savedNotice && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{savedNotice}</span>
          </div>
        )}

        {loading || !settings ? (
          <div className="space-y-4">
            <div className="h-64 rounded-2xl glass-surface animate-pulse" />
            <div className="h-44 rounded-2xl glass-surface animate-pulse" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            {/* Official Corporate Identity */}
            <div className="rounded-2xl glass-surface p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                <Building2 className="w-4 h-4 text-[#0066FF]" />
                <h2 className="text-sm font-extrabold text-[#0f172a]">Official Corporate Identity</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-[#0f172a] mb-1.5">
                    Company Legal Name
                  </label>
                  <input
                    type="text"
                    required
                    value={settings.companyName}
                    onChange={(e) => setSettings({...settings, companyName: e.target.value})}
                    className="w-full rounded-xl border px-3.5 py-2.5 text-xs sm:text-sm glass-input focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#0f172a] mb-1.5">
                    Commercial Registration (CR)
                  </label>
                  <input
                    type="text"
                    required
                    value={settings.crNumber}
                    onChange={(e) => setSettings({...settings, crNumber: e.target.value})}
                    className="w-full rounded-xl border px-3.5 py-2.5 font-mono text-xs sm:text-sm font-bold glass-input focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#0f172a] mb-1.5">
                    Company Slogan / Tagline
                  </label>
                  <input
                    type="text"
                    value={settings.slogan}
                    onChange={(e) => setSettings({...settings, slogan: e.target.value})}
                    className="w-full rounded-xl border px-3.5 py-2.5 text-xs sm:text-sm glass-input focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#0f172a] mb-1.5">Primary Email</label>
                  <input
                    type="email"
                    required
                    value={settings.primaryEmail}
                    onChange={(e) => setSettings({...settings, primaryEmail: e.target.value})}
                    className="w-full rounded-xl border px-3.5 py-2.5 text-xs sm:text-sm glass-input focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#0f172a] mb-1.5">
                    Secondary Email
                  </label>
                  <input
                    type="email"
                    value={settings.secondaryEmail}
                    onChange={(e) => setSettings({...settings, secondaryEmail: e.target.value})}
                    className="w-full rounded-xl border px-3.5 py-2.5 text-xs sm:text-sm glass-input focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#0f172a] mb-1.5">
                    Official Website
                  </label>
                  <input
                    type="url"
                    value={settings.website}
                    onChange={(e) => setSettings({...settings, website: e.target.value})}
                    className="w-full rounded-xl border px-3.5 py-2.5 text-xs sm:text-sm glass-input focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#0f172a] mb-1.5">
                    Primary Phone / WhatsApp
                  </label>
                  <input
                    type="text"
                    required
                    value={settings.primaryPhone}
                    onChange={(e) => setSettings({...settings, primaryPhone: e.target.value})}
                    className="w-full rounded-xl border px-3.5 py-2.5 font-mono text-xs sm:text-sm glass-input focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#0f172a] mb-1.5">
                    Secondary Phone
                  </label>
                  <input
                    type="text"
                    value={settings.secondaryPhone}
                    onChange={(e) => setSettings({...settings, secondaryPhone: e.target.value})}
                    className="w-full rounded-xl border px-3.5 py-2.5 font-mono text-xs sm:text-sm glass-input focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#0f172a] mb-1.5">
                    Authorized Signatory Title
                  </label>
                  <input
                    type="text"
                    value={settings.signatoryTitle}
                    onChange={(e) => setSettings({...settings, signatoryTitle: e.target.value})}
                    className="w-full rounded-xl border px-3.5 py-2.5 text-xs sm:text-sm glass-input focus:outline-none"
                  />
                </div>
              </div>

              <div className="text-xs">
                <label className="block font-semibold text-[#0f172a] mb-1.5">
                  Physical Business Address
                </label>
                <input
                  type="text"
                  required
                  value={settings.address}
                  onChange={(e) => setSettings({...settings, address: e.target.value})}
                  className="w-full rounded-xl border px-3.5 py-2.5 text-xs sm:text-sm glass-input focus:outline-none"
                />
              </div>
            </div>

            {/* Receipt Numbering & Currency Policy */}
            <div className="rounded-2xl glass-surface p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                <FileText className="w-4 h-4 text-[#0066FF]" />
                <h2 className="text-sm font-extrabold text-[#0f172a]">
                  Receipt Numbering &amp; Currency Policy
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-[#0f172a] mb-1.5">
                    Receipt Prefix
                  </label>
                  <input
                    type="text"
                    required
                    value={settings.receiptPrefix}
                    onChange={(e) => setSettings({...settings, receiptPrefix: e.target.value})}
                    className="w-full rounded-xl border px-3.5 py-2.5 font-mono text-xs sm:text-sm glass-input focus:outline-none"
                  />
                  <div className="mt-1 text-[11px] text-[#64748b] font-mono">
                    Example: {settings.receiptPrefix}-2026-11-
                    {String(settings.receiptSequenceCounter + 1).padStart(3, '0')}
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-[#0f172a] mb-1.5">
                    Sequence Counter Tracker
                  </label>
                  <input
                    type="number"
                    min={settings.receiptSequenceCounter}
                    value={settings.receiptSequenceCounter}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        receiptSequenceCounter: Number.parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="w-full rounded-xl border px-3.5 py-2.5 font-mono text-xs sm:text-sm font-bold tabular-nums glass-input focus:outline-none"
                  />
                  <div className="mt-1 text-[11px] text-[#64748b]">
                    Increments atomically upon receipt finalization
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-[#0f172a] mb-1.5">
                    Default Currency &amp; Precision
                  </label>
                  <input
                    type="text"
                    readOnly
                    value="BHD (3 Decimal Places)"
                    className="w-full rounded-xl border px-3.5 py-2.5 text-xs sm:text-sm font-semibold glass-input opacity-80"
                  />
                  <div className="mt-1 text-[11px] text-[#64748b]">
                    Kingdom of Bahrain NUMERIC(12,3) standard
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-6 pt-2 text-xs">
                <label className="inline-flex items-center gap-2 font-medium text-[#334155] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.renderOfficialStamp}
                    onChange={(e) =>
                      setSettings({...settings, renderOfficialStamp: e.target.checked})
                    }
                    className="h-4 w-4 rounded border-slate-300 bg-white text-[#0066FF]"
                  />
                  <span>Render Official Company Stamp</span>
                </label>

                <label className="inline-flex items-center gap-2 font-medium text-[#334155] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.renderAuthorizedSignature}
                    onChange={(e) =>
                      setSettings({...settings, renderAuthorizedSignature: e.target.checked})
                    }
                    className="h-4 w-4 rounded border-slate-300 bg-white text-[#0066FF]"
                  />
                  <span>Render Authorized Signature Line</span>
                </label>

                <label className="inline-flex items-center gap-2 font-medium text-[#334155] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.displayServicesFooter}
                    onChange={(e) =>
                      setSettings({...settings, displayServicesFooter: e.target.checked})
                    }
                    className="h-4 w-4 rounded border-slate-300 bg-white text-[#0066FF]"
                  />
                  <span>Display Services Footer</span>
                </label>
              </div>
            </div>

            {/* Default Terms & Conditions */}
            <div className="rounded-2xl glass-surface p-6 space-y-3">
              <label className="block text-sm font-extrabold text-[#0f172a]">
                Default Receipt Terms &amp; Conditions (One Item per Line)
              </label>
              <p className="text-xs text-[#64748b]">
                These conditions automatically populate on newly issued receipts and digital PDFs.
              </p>
              <textarea
                rows={6}
                value={settings.defaultTerms}
                onChange={(e) => setSettings({...settings, defaultTerms: e.target.value})}
                className="w-full rounded-xl border px-3.5 py-2.5 font-mono text-xs leading-relaxed glass-input focus:outline-none"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0066FF] px-5 py-3 text-xs sm:text-sm font-bold text-white hover:bg-[#0052CC] shadow-lg shadow-blue-600/20 disabled:opacity-60 transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving Configuration...' : 'Save Settings & Update Numbering'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </AdminLayout>
  );
}
