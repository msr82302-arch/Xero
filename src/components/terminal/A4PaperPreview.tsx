import {Check, Globe, Mail, MapPin, Phone} from 'lucide-react';
import {COMPANY_INFO, services} from '@/src/data/services';
import type {BoqLineItem, PaymentChannel, PaymentTerms} from '@/src/types/xbms';
import {formatBHD, formatBHDNumber} from '@/src/types/xbms';

export interface A4PaperPreviewProps {
  receiptNo: string;
  dateDisplay: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  serviceName: string;
  projectTitle: string;
  paymentMethod: PaymentChannel;
  paymentTerms: PaymentTerms;
  items: BoqLineItem[];
  totalBHD: number;
  advancePaidBHD: number;
  balanceBHD: number;
  status: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID';
  stampOn: boolean;
  defaultTerms?: string;
  signatoryTitle?: string;
  showServicesFooter?: boolean;
}

export function A4PaperPreview({
  receiptNo,
  dateDisplay,
  clientName,
  clientPhone,
  clientEmail,
  serviceName,
  projectTitle,
  paymentMethod,
  paymentTerms,
  items,
  totalBHD,
  advancePaidBHD,
  balanceBHD,
  status,
  stampOn,
  defaultTerms,
  signatoryTitle = 'Director of Finance & Technology',
  showServicesFooter = true,
}: A4PaperPreviewProps) {
  const termsList = (
    defaultTerms ||
    [
      'The receipt confirms the successful receipt of payment for the above-mentioned services.',
      'The remaining balance (if any) is payable upon completion of the project or as per agreement.',
      'This receipt is issued for the amount received and does not substitute for a final invoice.',
      'Any additional services will be billed separately.',
      'In case of any dispute, please contact us within 7 days of this receipt.',
      'Thank you for choosing XeroTech Technologies.',
    ].join('\n')
  )
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 6);

  const statusMeta =
    status === 'PAID'
      ? {
          label: 'Paid in Full',
          badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        }
      : status === 'PARTIALLY_PAID'
        ? {
            label: 'Partially Paid',
            badgeClass: 'border-amber-200 bg-amber-50 text-amber-700',
          }
        : {
            label: 'Unpaid / Payment Due',
            badgeClass: 'border-red-200 bg-red-50 text-red-700',
          };

  return (
    <div className="mx-auto w-full max-w-[740px] overflow-hidden rounded-xl border border-slate-300 bg-white shadow-md">
      {/* 1. Corporate Header Band */}
      <div className="bg-[#0A192F] px-6 py-4 text-white flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img
            src="/assets/aistudio/logo_e1b61aee.png"
            alt="XeroTech Technologies Logo"
            className="h-12 w-12 object-contain shrink-0"
            referrerPolicy="no-referrer"
          />
          <div>
            <div className="text-lg font-extrabold tracking-tight leading-tight">
              XeroTech <span className="text-[#00C2FF]">TECHNOLOGIES</span>
            </div>
            <div className="mt-0.5 font-mono text-[10px] tracking-wider text-slate-300">
              {COMPANY_INFO.slogan} · CR NO: {COMPANY_INFO.crNumber}
            </div>
          </div>
        </div>

        <div className="text-right font-mono text-[10px] text-slate-200 space-y-1">
          <div className="flex items-center justify-end gap-1.5">
            <Mail className="w-3 h-3 text-[#00C2FF]" />
            <span>{COMPANY_INFO.primaryEmail}</span>
          </div>
          <div className="flex items-center justify-end gap-1.5">
            <Phone className="w-3 h-3 text-[#00C2FF]" />
            <span>
              {COMPANY_INFO.phones[0]} / {COMPANY_INFO.phones[1]}
            </span>
          </div>
          <div className="flex items-center justify-end gap-1.5">
            <Globe className="w-3 h-3 text-[#00C2FF]" />
            <span>{COMPANY_INFO.socialHandle}</span>
          </div>
        </div>
      </div>

      {/* HQ & CR Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-6 py-2 text-[10px] text-slate-600">
        <span className="inline-flex items-center gap-1.5 font-mono font-bold text-[#0A192F]">
          CR No: {COMPANY_INFO.crNumber}
        </span>
        <span className="inline-flex items-center gap-1">
          <MapPin className="w-3 h-3 text-[#0066FF]" />
          {COMPANY_INFO.address}
        </span>
      </div>

      {/* Document Body */}
      <div className="p-6 space-y-5">
        {/* 2. Document Metadata Strip */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-extrabold tracking-tight text-[#0A192F]">
              Payment <span className="text-[#0066FF]">Receipt</span>
            </h3>
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              XEROTECH TECHNOLOGIES · OFFICIAL RECEIPT
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs space-y-1 min-w-[235px]">
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">Receipt No.:</span>
              <span className="font-mono font-extrabold text-[#0066FF]">{receiptNo}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">Date (Bahrain):</span>
              <span className="font-semibold text-[#0A192F]">{dateDisplay}</span>
            </div>
          </div>
        </div>

        {/* 3. Dual-Column Client & Project Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="bg-[#0066FF] px-3.5 py-2 font-bold text-white">Client Details</div>
            <div className="p-3.5 space-y-1.5">
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Client Name:</span>
                <span className="font-bold text-[#0A192F] text-right">
                  {clientName.trim() || 'Select or Enter Client'}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Contact No.:</span>
                <span className="font-mono text-[#0A192F]">{clientPhone || '+973 3XXXXXXX'}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Email:</span>
                <span className="text-slate-700 truncate">{clientEmail || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="bg-[#0A192F] px-3.5 py-2 font-bold text-white">Project Details</div>
            <div className="p-3.5 space-y-1.5">
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Category:</span>
                <span className="font-bold text-[#0A192F] text-right truncate">{serviceName}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Project Title:</span>
                <span className="text-slate-700 text-right truncate">
                  {projectTitle.trim() || serviceName}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Channel / Terms:</span>
                <span className="font-medium text-[#0A192F] text-right">
                  {paymentMethod} · {paymentTerms}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Itemized BoQ Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#0A192F] text-white">
                <th className="py-2.5 px-3 font-semibold w-10">#</th>
                <th className="py-2.5 px-3 font-semibold">Description</th>
                <th className="py-2.5 px-3 font-semibold text-center w-14">Qty</th>
                <th className="py-2.5 px-3 font-semibold text-right w-28">Unit Price (BHD)</th>
                <th className="py-2.5 px-3 font-semibold text-right w-28">Amount (BHD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, idx) => (
                <tr key={item.id}>
                  <td className="py-2.5 px-3 font-mono text-slate-500">{idx + 1}</td>
                  <td className="py-2.5 px-3 font-semibold text-[#0A192F]">
                    {item.description.trim() || serviceName}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono tabular-nums">{item.qty}</td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                    {formatBHDNumber(item.unitPriceBHD)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums text-[#0A192F]">
                    {formatBHDNumber(item.amountBHD)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 5. 3-Element Financial Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 flex flex-col justify-center">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#0066FF]">
              Total Project Cost
            </div>
            <div className="mt-1 font-mono text-2xl font-extrabold text-[#0A192F] tabular-nums">
              {formatBHD(totalBHD)}
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/70 px-3.5 py-2.5">
              <span className="font-semibold text-emerald-800">Advance Received</span>
              <span className="font-mono font-extrabold text-emerald-700 tabular-nums">
                {formatBHD(advancePaidBHD)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-[#0A192F] px-3.5 py-2.5 text-white">
              <span className="font-semibold text-slate-200">Remaining Balance</span>
              <span className="font-mono font-extrabold tabular-nums">
                {formatBHD(balanceBHD)}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Date & Status Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-xs">
          <div>
            <span className="text-slate-500">Payment Date: </span>
            <span className="font-bold text-[#0A192F]">{dateDisplay}</span>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 font-mono text-xs font-extrabold ${statusMeta.badgeClass}`}
          >
            {statusMeta.label}
          </span>
        </div>

        {/* 6. Legal Terms, Signature & Official Circular Stamp */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 rounded-xl border border-slate-200 p-4 items-end">
          <div className="sm:col-span-8 space-y-2">
            <div className="inline-block rounded-md bg-[#0066FF] px-2.5 py-1 text-[11px] font-bold text-white">
              Terms &amp; Conditions
            </div>
            <ol className="list-decimal pl-4 space-y-0.5 text-[10.5px] text-slate-500 leading-snug">
              {termsList.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ol>
          </div>

          <div className="sm:col-span-4 flex flex-col items-center sm:items-end justify-end gap-2">
            {stampOn && (
              <img
                src="/assets/aistudio/STAMP_d1ea7849.png"
                alt="XeroTech CR 201130-1 Circular Stamp"
                className="h-20 w-20 object-contain"
                referrerPolicy="no-referrer"
              />
            )}
            <div className="w-full max-w-[175px] border-t border-slate-300 pt-1 text-center sm:text-right">
              <div className="text-[10px] font-bold text-[#0A192F]">Authorized Signature</div>
              <div className="text-[9px] text-slate-500">{signatoryTitle}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 7. 12-Service Footer Banner */}
      {showServicesFooter && (
        <div className="bg-[#0A192F] px-6 py-4 text-white">
          <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#00C2FF] mb-2">
            Our Services · CR {COMPANY_INFO.crNumber}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-[10px] text-slate-300">
            {services.map((s) => (
              <div key={s.id} className="flex items-center gap-1.5 truncate">
                <Check className="w-3 h-3 text-[#00C2FF] shrink-0" />
                <span className="truncate">{s.name}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400">
            <span>{COMPANY_INFO.address}</span>
            <span>{COMPANY_INFO.website}</span>
          </div>
        </div>
      )}
    </div>
  );
}
