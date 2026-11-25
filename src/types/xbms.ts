export type UserRole = 'ADMINISTRATOR' | 'STAFF' | 'CLIENT';

export type StaffDepartmentRole = 'Billing Clerk' | 'Shift Supervisor' | 'Audit Staff';

export type ReactivationReason =
  | 'Expired Credentials'
  | 'Device Transfer'
  | 'Account Locked'
  | 'Other';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  title: string;
  staffId?: string;
  departmentRole?: StaffDepartmentRole;
  requirePasswordChange?: boolean;
  lastPasswordChangeAt?: string;
}

export interface SystemUserRecord {
  id: string;
  name: string;
  email: string;
  title: string;
  staffId?: string;
  departmentRole?: StaffDepartmentRole;
  role: 'ADMINISTRATOR' | 'STAFF';
  status: 'ACTIVE' | 'LOCKED';
  lastPasswordChangeAt: string;
  lastActiveAt: string;
  requirePasswordChange: boolean;
}

export interface PendingStaffRequest {
  id: string;
  staffId: string;
  name: string;
  email: string;
  departmentRole: StaffDepartmentRole;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedAt: string;
}

export type ReceiptStatus = 'PAID' | 'PARTIAL' | 'UNPAID' | 'CANCELLED';

export type PaymentChannel = 'BenefitPay' | 'Bank Transfer' | 'Card Payment' | 'Cash';

export type PaymentTerms = 'Full Payment' | 'Partial Payment (50%)' | 'Milestone Payment' | 'Unpaid / Credit';

export interface BoqLineItem {
  id: string;
  description: string;
  qty: number;
  unitPriceBHD: number;
  amountBHD: number;
}

export interface ClientDirectoryEntry {
  id: string;
  name: string;
  phone: string;
  email: string;
  address?: string;
}

export interface ReceiptRecord {
  id: string;
  receiptNo: string;
  dateISO: string;
  dateDisplay: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  serviceName: string;
  projectTitle: string;
  paymentMethod: PaymentChannel;
  paymentTerms: PaymentTerms;
  totalBHD: number;
  paidBHD: number;
  balanceBHD: number;
  status: ReceiptStatus;
  notes: string;
  items?: BoqLineItem[];
  issuedBy: string;
  createdAt: string;
  cancelledBy?: string;
  cancelledAt?: string;
  cancellationReason?: string;
}

export type QuotationStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';

export interface QuotationRecord {
  id: string;
  referenceCode: string;
  quotationNo: string | null;
  source: 'PUBLIC_ESTIMATOR' | 'STAFF_DRAFT';
  clientName: string;
  contactPerson: string;
  clientPhone: string;
  clientEmail: string;
  serviceNames: string[];
  items?: BoqLineItem[];
  estimatedTotalBHD: number;
  advanceMilestoneBHD: number;
  notes: string;
  status: QuotationStatus;
  submittedBy: string;
  submittedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
}

export interface ClientSummary {
  id: string;
  name: string;
  phone: string;
  email: string;
  projectsCount: number;
  activeReceiptsCount: number;
  voidedReceiptsCount: number;
  totalInvoicedBHD: number;
  totalPaidBHD: number;
  outstandingBalanceBHD: number;
  lastActivityDate: string;
}

export interface CompanySettings {
  companyName: string;
  crNumber: string;
  slogan: string;
  primaryEmail: string;
  secondaryEmail: string;
  website: string;
  primaryPhone: string;
  secondaryPhone: string;
  signatoryTitle: string;
  address: string;
  receiptPrefix: string;
  quotationPrefix: string;
  receiptSequenceCounter: number;
  quotationSequenceCounter: number;
  renderOfficialStamp: boolean;
  renderAuthorizedSignature: boolean;
  displayServicesFooter: boolean;
  defaultTerms: string;
}

export interface AuditLogEntry {
  id: string;
  timestampBahrain: string;
  createdAt: string;
  actionType:
    | 'SYSTEM_BOOTSTRAP'
    | 'ADMIN_SETUP'
    | 'LOGIN_SUCCESS'
    | 'LOGIN_FAILED'
    | 'PASSWORD_RESET_REQUESTED'
    | 'PASSWORD_RESET_COMPLETED'
    | 'USER_PASSWORD_UPDATED'
    | 'ADMIN_FORCE_PASSWORD_RESET'
    | 'USER_PROVISIONED'
    | 'USER_STATUS_CHANGED'
    | 'STAFF_REGISTRATION_REQUESTED'
    | 'STAFF_PROVISIONED_BY_CODE'
    | 'STAFF_ACCOUNT_REACTIVATED'
    | 'ADMIN_TOKEN_ISSUED'
    | 'RECEIPT_ISSUED'
    | 'RECEIPT_VOIDED'
    | 'QUOTATION_APPROVED'
    | 'QUOTATION_REJECTED'
    | 'LEAD_RECEIVED'
    | 'SETTINGS_UPDATED'
    | 'PDF_DOWNLOADED';
  userEmail: string;
  details: string;
}

export interface TrajectoryPoint {
  label: string;
  invoicedBHD: number;
  collectedBHD: number;
}

export interface DashboardSummary {
  kpis: {
    totalInvoicedBHD: number;
    totalCollectionsBHD: number;
    outstandingReceivablesBHD: number;
    activeDocuments: number;
    todaysCollectionsBHD: number;
    todaysReceiptsCount: number;
    weekCollectionsBHD: number;
    monthTotalBHD: number;
    paidCount: number;
    partialCount: number;
    unpaidCount: number;
    cancelledCount: number;
  };
  trajectory: {
    daily: TrajectoryPoint[];
    weekly: TrajectoryPoint[];
    monthly: TrajectoryPoint[];
    yearly: TrajectoryPoint[];
  };
  recentReceipts: ReceiptRecord[];
}

export function roundBHD(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 1000) / 1000;
}

export function formatBHDNumber(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return safe.toLocaleString('en-US', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
}

export function formatBHD(value: number): string {
  return `${formatBHDNumber(value)} BHD`;
}
