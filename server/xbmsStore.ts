import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type {
  AuditLogEntry,
  AuthUser,
  BoqLineItem,
  ClientDirectoryEntry,
  ClientSummary,
  CompanySettings,
  DashboardSummary,
  PaymentChannel,
  PaymentTerms,
  PendingStaffRequest,
  QuotationRecord,
  ReactivationReason,
  ReceiptRecord,
  StaffDepartmentRole,
  SystemUserRecord,
  TrajectoryPoint,
} from '../src/types/xbms.ts';

const ALLOWED_STAFF_DEPARTMENTS = new Set<StaffDepartmentRole>([
  'Billing Clerk',
  'Shift Supervisor',
  'Audit Staff',
]);

const ALLOWED_REACTIVATION_REASONS = new Set<ReactivationReason>([
  'Expired Credentials',
  'Device Transfer',
  'Account Locked',
  'Other',
]);

interface StoredUser {
  id: string;
  email: string;
  name: string;
  title: string;
  staffId?: string;
  departmentRole?: StaffDepartmentRole;
  role: 'ADMINISTRATOR' | 'STAFF';
  status: 'ACTIVE' | 'LOCKED';
  salt: string;
  passwordHash: string;
  lastPasswordChangeAt: string;
  lastActiveAt: string;
  requirePasswordChange: boolean;
  userManagedPassword?: boolean;
}

interface StaffAuthorizationTokenEntry {
  id: string;
  type: 'INVITE' | 'OVERRIDE';
  salt: string;
  hash: string;
  expiresAt: number;
  issuedBy: string;
}

interface StoredPendingStaffRequest extends PendingStaffRequest {
  salt: string;
  passwordHash: string;
}

interface PasswordResetOtpEntry {
  userId: string;
  email: string;
  otpSalt: string;
  otpHash: string;
  expiresAt: number;
  attempts: number;
}

interface SessionEntry {
  token: string;
  user: AuthUser;
  expiresAt: number;
}

function toFils(bhd: number): number {
  return Math.round((Number.isFinite(bhd) ? bhd : 0) * 1000);
}

function fromFils(fils: number): number {
  return Math.round(fils) / 1000;
}

function formatBahrainTimestamp(date = new Date()): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bahrain',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

function hashPassword(password: string, salt?: string): {salt: string; hash: string} {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, actualSalt, 64).toString('hex');
  return {salt: actualSalt, hash: derived};
}

function hashSessionToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function digestEnvSecret(secret: string): string {
  return crypto.createHash('sha256').update(secret.trim()).digest('hex');
}

function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const {hash} = hashPassword(password, salt);
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(expectedHash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function validatePasswordStrength(password: string): string | null {
  if (typeof password !== 'string' || password.length < 8) {
    return 'Password must be at least 8 characters long.';
  }
  if (!/[A-Za-z]/.test(password)) {
    return 'Password must include at least one letter.';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must include at least one numeric digit.';
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return 'Password must include at least one special symbol (e.g. !@#$%^&*).';
  }
  return null;
}

class XbmsStore {
  private usersById = new Map<string, StoredUser>();
  private passwordResetOtps = new Map<string, PasswordResetOtpEntry>();
  private staffAuthorizationTokens = new Map<string, StaffAuthorizationTokenEntry>();
  private pendingStaffRequests = new Map<string, StoredPendingStaffRequest>();
  private registeredClients: ClientDirectoryEntry[] = [
    {
      id: 'cli-bahrain-fintech-bay-solutions',
      name: 'Bahrain Fintech Bay Solutions',
      phone: '+973 3611 2233',
      email: 'accounts@bahrainfintech.bh',
    },
    {
      id: 'cli-al-fateh-contracting-co',
      name: 'Al-Fateh Contracting Co.',
      phone: '+973 3987 6543',
      email: 'finance@alfateh.bh',
    },
    {
      id: 'cli-riffa-gourmet-hospitality',
      name: 'Riffa Gourmet Hospitality',
      phone: '+973 3612 8899',
      email: 'operations@riffagourmet.com',
    },
    {
      id: 'cli-gulf-horizon-logistics',
      name: 'Gulf Horizon Logistics',
      phone: '+973 3311 2244',
      email: 'admin@gulfhorizon.com',
    },
  ];
  private sessions = new Map<string, SessionEntry>();
  private csrfSecret =
    process.env.SESSION_SECRET?.trim() ||
    process.env.HMAC_SECRET?.trim() ||
    crypto.randomBytes(32).toString('hex');
  private sessionSecret =
    process.env.SESSION_SECRET?.trim() ||
    process.env.HMAC_SECRET?.trim() ||
    crypto.randomBytes(32).toString('hex');
  private seededEnvDigests: {admin?: string; staff?: string} = {};
  private disableEnvSeed: {admin?: boolean; staff?: boolean} = {};
  private readonly storeDir = path.resolve(process.cwd(), '.xbms-data');
  private readonly storeFile = path.resolve(process.cwd(), '.xbms-data', 'xbms-store.json');
  private readonly authDir = path.resolve(process.cwd(), 'data');
  private readonly authFile = path.resolve(process.cwd(), 'data', 'auth-store.json');

  private settings: CompanySettings = {
    companyName: 'XeroTech Technologies',
    crNumber: '201130-1',
    slogan: 'Innovate • Automate • Grow',
    primaryEmail: 'info@xerotechtechnologies.com',
    secondaryEmail: 'xerotech.techno@gmail.com',
    website: 'https://www.xerotechtechnologies.com',
    primaryPhone: '+973 3357 8768',
    secondaryPhone: '+973 3694 7843',
    signatoryTitle: 'Director of Finance & Technology',
    address: 'Near IMC Hospital, Lulu Road, Riffa, Kingdom of Bahrain',
    receiptPrefix: 'XT-REC',
    quotationPrefix: 'XT-QOT',
    receiptSequenceCounter: 4,
    quotationSequenceCounter: 1,
    renderOfficialStamp: true,
    renderAuthorizedSignature: true,
    displayServicesFooter: true,
    defaultTerms: [
      'The receipt confirms the successful receipt of payment for the above-mentioned services.',
      'The remaining balance (if any) is payable upon completion of the project or as per agreement.',
      'This receipt is issued for the amount received and does not substitute for a final invoice.',
      'Any additional services will be billed separately.',
      'In case of any dispute, please contact us within 7 days of this receipt.',
      'Thank you for choosing XeroTech Technologies.',
    ].join('\n'),
  };

  private receipts: ReceiptRecord[] = [
    {
      id: 'rec-2026-11-004',
      receiptNo: 'XT-REC-2026-11-004',
      dateISO: '2026-11-04',
      dateDisplay: '4 November 2026',
      clientName: 'Bahrain Fintech Bay Solutions',
      clientPhone: '+973 3611 2233',
      clientEmail: 'accounts@bahrainfintech.bh',
      serviceName: 'Software & Web Development',
      projectTitle: 'Enterprise Client Portal & API Integration',
      paymentMethod: 'BenefitPay',
      paymentTerms: 'Partial Payment (50%)',
      totalBHD: 150.0,
      paidBHD: 100.0,
      balanceBHD: 50.0,
      status: 'PARTIAL',
      notes: 'Paid via BenefitPay Bahrain verified reference.',
      issuedBy: 'admin@xerotechtechnologies.com',
      createdAt: '2026-11-04T14:22:00+03:00',
    },
    {
      id: 'rec-2026-11-001',
      receiptNo: 'XT-REC-2026-11-001',
      dateISO: '2026-11-04',
      dateDisplay: '4 November 2026',
      clientName: 'Al-Fateh Contracting Co.',
      clientPhone: '+973 3987 6543',
      clientEmail: 'finance@alfateh.bh',
      serviceName: 'Software & Web Development',
      projectTitle: 'Corporate Tender & Vendor Operations Suite',
      paymentMethod: 'Bank Transfer',
      paymentTerms: 'Partial Payment (50%)',
      totalBHD: 450.0,
      paidBHD: 300.0,
      balanceBHD: 150.0,
      status: 'PARTIAL',
      notes: 'IBAN transfer verified; Phase 2 UAT delivery balance pending.',
      issuedBy: 'admin@xerotechtechnologies.com',
      createdAt: '2026-11-04T09:15:00+03:00',
    },
    {
      id: 'rec-2026-11-002',
      receiptNo: 'XT-REC-2026-11-002',
      dateISO: '2026-11-04',
      dateDisplay: '4 November 2026',
      clientName: 'Riffa Gourmet Hospitality',
      clientPhone: '+973 3612 8899',
      clientEmail: 'operations@riffagourmet.com',
      serviceName: 'NFC Digital Cards & Menu Solutions',
      projectTitle: 'Bilingual QR/NFC eMenu Rollout & Standees',
      paymentMethod: 'BenefitPay',
      paymentTerms: 'Full Payment',
      totalBHD: 120.0,
      paidBHD: 120.0,
      balanceBHD: 0.0,
      status: 'PAID',
      notes: 'Settled in full on deployment.',
      issuedBy: 'admin@xerotechtechnologies.com',
      createdAt: '2026-11-04T11:05:00+03:00',
    },
    {
      id: 'rec-2026-11-003',
      receiptNo: 'XT-REC-2026-11-003',
      dateISO: '2026-11-04',
      dateDisplay: '4 November 2026',
      clientName: 'Gulf Horizon Logistics',
      clientPhone: '+973 3311 2244',
      clientEmail: 'admin@gulfhorizon.com',
      serviceName: 'Cloud & Cybersecurity',
      projectTitle: 'Zero-Trust Firewall Hardening & Cloud Backup',
      paymentMethod: 'Card Payment',
      paymentTerms: 'Partial Payment (50%)',
      totalBHD: 280.0,
      paidBHD: 100.0,
      balanceBHD: 180.0,
      status: 'PARTIAL',
      notes: 'Initial security audit kickoff settlement.',
      issuedBy: 'admin@xerotechtechnologies.com',
      createdAt: '2026-11-04T12:40:00+03:00',
    },
  ];

  private quotations: QuotationRecord[] = [
    {
      id: 'qot-lead-401',
      referenceCode: 'XT-LEAD-2026-401',
      quotationNo: null,
      source: 'PUBLIC_ESTIMATOR',
      clientName: 'Easy Travels SPC',
      contactPerson: 'Tariq Al-Mansoor',
      clientPhone: '+973 3912 4480',
      clientEmail: 'ops@easytravels.bh',
      serviceNames: ['Custom Web Applications', 'AI & Automation'],
      estimatedTotalBHD: 600.0,
      advanceMilestoneBHD: 300.0,
      notes: 'Phase 2 automated GCC visa OCR extraction & AFS checkout.',
      status: 'PENDING_APPROVAL',
      submittedBy: 'Public Project Estimator',
      submittedAt: '2026-11-20T10:15:00+03:00',
    },
    {
      id: 'qot-lead-402',
      referenceCode: 'XT-LEAD-2026-402',
      quotationNo: null,
      source: 'STAFF_DRAFT',
      clientName: 'Al-Khair Restaurant',
      contactPerson: 'Hassan Yusuf',
      clientPhone: '+973 3645 9912',
      clientEmail: 'info@alkhair.bh',
      serviceNames: ['NFC Digital Cards & Menu Solutions', 'Digital Marketing & Meta Ads'],
      estimatedTotalBHD: 170.0,
      advanceMilestoneBHD: 85.0,
      notes: 'Branch #2 expansion — 25 tabletop NFC menus + quarterly Meta funnel.',
      status: 'DRAFT',
      submittedBy: 'staff.sales@xerotechtechnologies.com',
      submittedAt: '2026-11-21T13:45:00+03:00',
    },
    {
      id: 'qot-lead-403',
      referenceCode: 'XT-LEAD-2026-403',
      quotationNo: null,
      source: 'PUBLIC_ESTIMATOR',
      clientName: 'Seef Medical Diagnostics',
      contactPerson: 'Dr. Noora Al-Khalifa',
      clientPhone: '+973 3882 1104',
      clientEmail: 'it@seefmed.bh',
      serviceNames: ['Cloud & Cybersecurity', 'Networking Solutions'],
      estimatedTotalBHD: 350.0,
      advanceMilestoneBHD: 175.0,
      notes: 'VLAN patient-record isolation and off-site encrypted cloud backup.',
      status: 'PENDING_APPROVAL',
      submittedBy: 'Public Project Estimator',
      submittedAt: '2026-11-22T09:30:00+03:00',
    },
    {
      id: 'qot-approved-001',
      referenceCode: 'XT-LEAD-2026-389',
      quotationNo: 'XT-QOT-2026-11-001',
      source: 'STAFF_DRAFT',
      clientName: 'Manama Pearl Properties',
      contactPerson: 'Khalid Al-Doseri',
      clientPhone: '+973 3399 2010',
      clientEmail: 'finance@manamapearl.bh',
      serviceNames: ['Custom Web Applications'],
      estimatedTotalBHD: 400.0,
      advanceMilestoneBHD: 200.0,
      notes: 'Tenant billing & maintenance ticketing portal.',
      status: 'APPROVED',
      submittedBy: 'staff.sales@xerotechtechnologies.com',
      submittedAt: '2026-11-15T11:00:00+03:00',
      approvedBy: 'admin@xerotechtechnologies.com',
      approvedAt: '2026-11-16T15:10:00+03:00',
    },
  ];

  private auditLogs: AuditLogEntry[] = [
    {
      id: 'aud-10',
      timestampBahrain: '21 Nov, 15:10:12',
      createdAt: '2026-11-21T15:10:12+03:00',
      actionType: 'QUOTATION_APPROVED',
      userEmail: 'admin@xerotechtechnologies.com',
      details: 'Approved commercial quotation XT-QOT-2026-11-001 for Manama Pearl Properties (400.000 BHD).',
    },
    {
      id: 'aud-09',
      timestampBahrain: '21 Nov, 10:04:03',
      createdAt: '2026-11-21T10:04:03+03:00',
      actionType: 'LEAD_RECEIVED',
      userEmail: 'public.estimator@xerotechtechnologies.com',
      details: 'Captured estimator lead XT-LEAD-2026-402 (Al-Khair Restaurant · 170.000 BHD).',
    },
    {
      id: 'aud-08',
      timestampBahrain: '04 Nov, 14:22:00',
      createdAt: '2026-11-04T14:22:00+03:00',
      actionType: 'RECEIPT_ISSUED',
      userEmail: 'admin@xerotechtechnologies.com',
      details: 'Issued official receipt XT-REC-2026-11-004 for Bahrain Fintech Bay Solutions (150.000 BHD).',
    },
    {
      id: 'aud-07',
      timestampBahrain: '04 Nov, 12:40:00',
      createdAt: '2026-11-04T12:40:00+03:00',
      actionType: 'RECEIPT_ISSUED',
      userEmail: 'admin@xerotechtechnologies.com',
      details: 'Issued official receipt XT-REC-2026-11-003 for Gulf Horizon Logistics (280.000 BHD).',
    },
    {
      id: 'aud-06',
      timestampBahrain: '04 Nov, 11:05:00',
      createdAt: '2026-11-04T11:05:00+03:00',
      actionType: 'RECEIPT_ISSUED',
      userEmail: 'admin@xerotechtechnologies.com',
      details: 'Issued official receipt XT-REC-2026-11-002 for Riffa Gourmet Hospitality (120.000 BHD).',
    },
    {
      id: 'aud-05',
      timestampBahrain: '04 Nov, 09:15:00',
      createdAt: '2026-11-04T09:15:00+03:00',
      actionType: 'RECEIPT_ISSUED',
      userEmail: 'admin@xerotechtechnologies.com',
      details: 'Issued official receipt XT-REC-2026-11-001 for Al-Fateh Contracting Co. (450.000 BHD).',
    },
    {
      id: 'aud-01',
      timestampBahrain: '04 Nov, 03:46:07',
      createdAt: '2026-11-04T03:46:07+03:00',
      actionType: 'SYSTEM_BOOTSTRAP',
      userEmail: 'system@xerotechtechnologies.com',
      details: 'System initialized with XeroTech Technologies CR 201130-1 enterprise baseline and immutable audit log.',
    },
  ];

  constructor() {
    this.hydrateFromDisk();
    this.reconcileEnvSeeds();
  }

  private hydrateFromDisk(): void {
    try {
      if (fs.existsSync(this.storeFile)) {
        const raw = fs.readFileSync(this.storeFile, 'utf8');
        if (raw.trim()) {
          const parsed = JSON.parse(raw) as {
            csrfSecret?: string;
            sessionSecret?: string;
            seededEnvDigests?: {admin?: string; staff?: string};
            disableEnvSeed?: {admin?: boolean; staff?: boolean};
            users?: StoredUser[];
            passwordResetOtps?: Array<[string, PasswordResetOtpEntry]>;
            staffAuthorizationTokens?: Array<[string, StaffAuthorizationTokenEntry]>;
            pendingStaffRequests?: Array<[string, StoredPendingStaffRequest]>;
            registeredClients?: ClientDirectoryEntry[];
            sessions?: Array<[string, SessionEntry]>;
            settings?: CompanySettings;
            receipts?: ReceiptRecord[];
            quotations?: QuotationRecord[];
            auditLogs?: AuditLogEntry[];
          };

          if (typeof parsed.csrfSecret === 'string' && parsed.csrfSecret.length >= 32) {
            this.csrfSecret = parsed.csrfSecret;
          }
          if (typeof parsed.sessionSecret === 'string' && parsed.sessionSecret.length >= 32) {
            this.sessionSecret = parsed.sessionSecret;
          }
          if (parsed.seededEnvDigests && typeof parsed.seededEnvDigests === 'object') {
            this.seededEnvDigests = parsed.seededEnvDigests;
          }
          if (parsed.disableEnvSeed && typeof parsed.disableEnvSeed === 'object') {
            this.disableEnvSeed = parsed.disableEnvSeed;
          }
          if (Array.isArray(parsed.users)) {
            this.usersById.clear();
            for (const u of parsed.users) {
              if (u && typeof u.id === 'string' && typeof u.email === 'string') {
                this.usersById.set(u.id, u);
              }
            }
          }
          const now = Date.now();
          if (Array.isArray(parsed.passwordResetOtps)) {
            this.passwordResetOtps.clear();
            for (const [k, v] of parsed.passwordResetOtps) {
              if (v && v.expiresAt > now) {
                this.passwordResetOtps.set(k, v);
              }
            }
          }
          if (Array.isArray(parsed.staffAuthorizationTokens)) {
            this.staffAuthorizationTokens.clear();
            for (const [k, v] of parsed.staffAuthorizationTokens) {
              if (v && v.expiresAt > now) {
                this.staffAuthorizationTokens.set(k, v);
              }
            }
          }
          if (Array.isArray(parsed.pendingStaffRequests)) {
            this.pendingStaffRequests.clear();
            for (const [k, v] of parsed.pendingStaffRequests) {
              if (v && typeof v.id === 'string') {
                this.pendingStaffRequests.set(k, v);
              }
            }
          }
          if (Array.isArray(parsed.registeredClients)) {
            this.registeredClients = parsed.registeredClients;
          }
          if (Array.isArray(parsed.sessions)) {
            this.sessions.clear();
            for (const [k, v] of parsed.sessions) {
              if (v && v.expiresAt > now) {
                this.sessions.set(k, v);
              }
            }
          }
          if (parsed.settings && typeof parsed.settings === 'object') {
            this.settings = {...this.settings, ...parsed.settings};
          }
          if (Array.isArray(parsed.receipts)) {
            this.receipts = parsed.receipts;
          }
          if (Array.isArray(parsed.quotations)) {
            this.quotations = parsed.quotations;
          }
          if (Array.isArray(parsed.auditLogs)) {
            this.auditLogs = parsed.auditLogs;
          }
        }
      }

      if (fs.existsSync(this.authFile)) {
        const authRaw = fs.readFileSync(this.authFile, 'utf8');
        if (authRaw.trim()) {
          const authParsed = JSON.parse(authRaw) as {
            csrfSecret?: string;
            sessionSecret?: string;
            seededEnvDigests?: {admin?: string; staff?: string};
            disableEnvSeed?: {admin?: boolean; staff?: boolean};
            users?: StoredUser[];
            passwordResetOtps?: Array<[string, PasswordResetOtpEntry]>;
            staffAuthorizationTokens?: Array<[string, StaffAuthorizationTokenEntry]>;
            pendingStaffRequests?: Array<[string, StoredPendingStaffRequest]>;
            sessions?: Array<[string, SessionEntry]>;
          };

          if (typeof authParsed.csrfSecret === 'string' && authParsed.csrfSecret.length >= 32) {
            this.csrfSecret = authParsed.csrfSecret;
          }
          if (typeof authParsed.sessionSecret === 'string' && authParsed.sessionSecret.length >= 32) {
            this.sessionSecret = authParsed.sessionSecret;
          }
          if (authParsed.seededEnvDigests && typeof authParsed.seededEnvDigests === 'object') {
            this.seededEnvDigests = authParsed.seededEnvDigests;
          }
          if (authParsed.disableEnvSeed && typeof authParsed.disableEnvSeed === 'object') {
            this.disableEnvSeed = authParsed.disableEnvSeed;
          }
          if (Array.isArray(authParsed.users)) {
            this.usersById.clear();
            for (const u of authParsed.users) {
              if (u && typeof u.id === 'string' && typeof u.email === 'string') {
                this.usersById.set(u.id, u);
              }
            }
          }
          const now = Date.now();
          if (Array.isArray(authParsed.passwordResetOtps)) {
            this.passwordResetOtps.clear();
            for (const [k, v] of authParsed.passwordResetOtps) {
              if (v && v.expiresAt > now) {
                this.passwordResetOtps.set(k, v);
              }
            }
          }
          if (Array.isArray(authParsed.staffAuthorizationTokens)) {
            this.staffAuthorizationTokens.clear();
            for (const [k, v] of authParsed.staffAuthorizationTokens) {
              if (v && v.expiresAt > now) {
                this.staffAuthorizationTokens.set(k, v);
              }
            }
          }
          if (Array.isArray(authParsed.pendingStaffRequests)) {
            this.pendingStaffRequests.clear();
            for (const [k, v] of authParsed.pendingStaffRequests) {
              if (v && typeof v.id === 'string') {
                this.pendingStaffRequests.set(k, v);
              }
            }
          }
          if (Array.isArray(authParsed.sessions)) {
            this.sessions.clear();
            for (const [k, v] of authParsed.sessions) {
              if (v && v.expiresAt > now) {
                this.sessions.set(k, v);
              }
            }
          }
        }
      } else {
        this.persistAuthStore();
      }

      const envSecret = process.env.SESSION_SECRET?.trim() || process.env.HMAC_SECRET?.trim();
      if (envSecret && envSecret.length >= 16) {
        this.sessionSecret = envSecret;
        this.csrfSecret = envSecret;
      }
    } catch (err) {
      console.error('[XBMS Store] Failed to hydrate persisted state:', err);
    }
  }

  private persistAuthStore(): void {
    try {
      if (!fs.existsSync(this.authDir)) {
        fs.mkdirSync(this.authDir, {recursive: true});
      }
      const now = Date.now();
      const authPayload = {
        version: 1,
        updatedAt: new Date().toISOString(),
        csrfSecret: this.csrfSecret,
        sessionSecret: this.sessionSecret,
        seededEnvDigests: this.seededEnvDigests,
        disableEnvSeed: this.disableEnvSeed,
        users: Array.from(this.usersById.values()),
        passwordResetOtps: Array.from(this.passwordResetOtps.entries()).filter(
          ([, v]) => v.expiresAt > now,
        ),
        staffAuthorizationTokens: Array.from(this.staffAuthorizationTokens.entries()).filter(
          ([, v]) => v.expiresAt > now,
        ),
        pendingStaffRequests: Array.from(this.pendingStaffRequests.entries()),
        sessions: Array.from(this.sessions.entries()).filter(([, v]) => v.expiresAt > now),
      };
      const tmpAuthFile = `${this.authFile}.${process.pid}.tmp`;
      fs.writeFileSync(tmpAuthFile, JSON.stringify(authPayload, null, 2), {encoding: 'utf8'});
      fs.renameSync(tmpAuthFile, this.authFile);
    } catch (err) {
      console.error('[XBMS Auth Store] Failed to persist ./data/auth-store.json:', err);
    }
  }

  private persist(): void {
    this.persistAuthStore();
    try {
      if (!fs.existsSync(this.storeDir)) {
        fs.mkdirSync(this.storeDir, {recursive: true});
      }
      const now = Date.now();
      const payload = {
        version: 1,
        csrfSecret: this.csrfSecret,
        sessionSecret: this.sessionSecret,
        seededEnvDigests: this.seededEnvDigests,
        disableEnvSeed: this.disableEnvSeed,
        users: Array.from(this.usersById.values()),
        passwordResetOtps: Array.from(this.passwordResetOtps.entries()).filter(
          ([, v]) => v.expiresAt > now,
        ),
        staffAuthorizationTokens: Array.from(this.staffAuthorizationTokens.entries()).filter(
          ([, v]) => v.expiresAt > now,
        ),
        pendingStaffRequests: Array.from(this.pendingStaffRequests.entries()),
        registeredClients: this.registeredClients,
        sessions: Array.from(this.sessions.entries()).filter(([, v]) => v.expiresAt > now),
        settings: this.settings,
        receipts: this.receipts,
        quotations: this.quotations,
        auditLogs: this.auditLogs,
      };
      const tmpFile = `${this.storeFile}.${process.pid}.tmp`;
      fs.writeFileSync(tmpFile, JSON.stringify(payload, null, 2), {encoding: 'utf8'});
      fs.renameSync(tmpFile, this.storeFile);
    } catch (err) {
      console.error('[XBMS Store] Failed to persist state:', err);
    }
  }

  private reconcileEnvSeeds(): void {
    const nowIso = new Date().toISOString();
    let changed = !fs.existsSync(this.authFile) || !fs.existsSync(this.storeFile);

    const envPasscode = process.env.ADMIN_PASSCODE?.trim();
    if (envPasscode && envPasscode.length >= 6) {
      const envDigest = digestEnvSecret(envPasscode);
      const existingAdmin = this.usersById.get('admin-principal');
      if (!this.hasUserWithRole('ADMINISTRATOR')) {
        const {salt, hash} = hashPassword(envPasscode);
        this.usersById.set('admin-principal', {
          id: 'admin-principal',
          email: 'admin@xerotechtechnologies.com',
          name: 'Principal Administrator',
          title: 'Director of Finance & Technology',
          role: 'ADMINISTRATOR',
          status: 'ACTIVE',
          salt,
          passwordHash: hash,
          lastPasswordChangeAt: nowIso,
          lastActiveAt: nowIso,
          requirePasswordChange: false,
          userManagedPassword: false,
        });
        this.seededEnvDigests.admin = envDigest;
        this.disableEnvSeed.admin = false;
        changed = true;
      } else if (existingAdmin && this.seededEnvDigests.admin !== envDigest) {
        const {salt, hash} = hashPassword(envPasscode);
        existingAdmin.salt = salt;
        existingAdmin.passwordHash = hash;
        existingAdmin.status = 'ACTIVE';
        existingAdmin.lastPasswordChangeAt = nowIso;
        existingAdmin.userManagedPassword = false;
        this.seededEnvDigests.admin = envDigest;
        this.disableEnvSeed.admin = false;
        changed = true;
      }
    }

    const envStaffPasscode = process.env.STAFF_PASSCODE?.trim();
    if (envStaffPasscode && envStaffPasscode.length >= 6) {
      const envDigest = digestEnvSecret(envStaffPasscode);
      const existingStaff = this.usersById.get('staff-counter-01');
      if (!this.hasUserWithRole('STAFF')) {
        const {salt, hash} = hashPassword(envStaffPasscode);
        this.usersById.set('staff-counter-01', {
          id: 'staff-counter-01',
          email: 'staff@xerotechtechnologies.com',
          name: 'Senior Billing Officer',
          title: 'Counter & Operations Desk',
          staffId: 'XT-STF-001',
          departmentRole: 'Billing Clerk',
          role: 'STAFF',
          status: 'ACTIVE',
          salt,
          passwordHash: hash,
          lastPasswordChangeAt: nowIso,
          lastActiveAt: nowIso,
          requirePasswordChange: false,
          userManagedPassword: false,
        });
        this.seededEnvDigests.staff = envDigest;
        this.disableEnvSeed.staff = false;
        changed = true;
      } else if (existingStaff && this.seededEnvDigests.staff !== envDigest) {
        const {salt, hash} = hashPassword(envStaffPasscode);
        existingStaff.salt = salt;
        existingStaff.passwordHash = hash;
        existingStaff.status = 'ACTIVE';
        existingStaff.lastPasswordChangeAt = nowIso;
        existingStaff.userManagedPassword = false;
        this.seededEnvDigests.staff = envDigest;
        this.disableEnvSeed.staff = false;
        changed = true;
      }
    }

    if (changed) {
      this.persist();
    }
  }

  private toAuthUser(user: StoredUser): AuthUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      title: user.title,
      ...(user.staffId ? {staffId: user.staffId} : {}),
      ...(user.departmentRole ? {departmentRole: user.departmentRole} : {}),
      requirePasswordChange: user.requirePasswordChange,
      lastPasswordChangeAt: user.lastPasswordChangeAt,
    };
  }

  private toSystemUserRecord(user: StoredUser): SystemUserRecord {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      title: user.title,
      ...(user.staffId ? {staffId: user.staffId} : {}),
      ...(user.departmentRole ? {departmentRole: user.departmentRole} : {}),
      role: user.role,
      status: user.status,
      lastPasswordChangeAt: user.lastPasswordChangeAt,
      lastActiveAt: user.lastActiveAt,
      requirePasswordChange: user.requirePasswordChange,
    };
  }

  private findUserByEmail(email: string): StoredUser | undefined {
    const clean = email.trim().toLowerCase();
    for (const user of this.usersById.values()) {
      if (user.email === clean) {
        return user;
      }
    }
    return undefined;
  }

  private findUserByEmailOrStaffId(identifier: string): StoredUser | undefined {
    const cleanLower = identifier.trim().toLowerCase();
    const cleanUpper = identifier.trim().toUpperCase();
    for (const user of this.usersById.values()) {
      if (
        user.email === cleanLower ||
        (user.staffId && user.staffId.toUpperCase() === cleanUpper)
      ) {
        return user;
      }
    }
    return undefined;
  }

  private timingSafeSecretMatch(input: string, expected: string): boolean {
    const a = crypto.createHash('sha256').update(input.trim()).digest();
    const b = crypto.createHash('sha256').update(expected.trim()).digest();
    return crypto.timingSafeEqual(a, b);
  }

  private consumeStaffAuthorizationToken(
    code: string,
    expectedType: 'INVITE' | 'OVERRIDE',
  ): boolean {
    const clean = code.trim();
    if (!clean) return false;

    const envSecret =
      expectedType === 'INVITE'
        ? process.env.STAFF_INVITE_CODE?.trim()
        : process.env.ADMIN_OVERRIDE_PIN?.trim();

    if (envSecret && envSecret.length >= 4 && this.timingSafeSecretMatch(clean, envSecret)) {
      return true;
    }

    const now = Date.now();
    for (const [id, entry] of this.staffAuthorizationTokens.entries()) {
      if (now > entry.expiresAt) {
        this.staffAuthorizationTokens.delete(id);
        continue;
      }
      if (entry.type === expectedType && verifyPassword(clean, entry.salt, entry.hash)) {
        this.staffAuthorizationTokens.delete(id);
        return true;
      }
    }
    return false;
  }

  private hasUserWithRole(role: 'ADMINISTRATOR' | 'STAFF'): boolean {
    for (const user of this.usersById.values()) {
      if (user.role === role) return true;
    }
    return false;
  }

  private revokeUserSessions(userId: string, exceptRawToken?: string): number {
    const exceptKey = exceptRawToken ? hashSessionToken(exceptRawToken) : undefined;
    let revoked = 0;
    for (const [tokenKey, entry] of this.sessions.entries()) {
      if (entry.user.id === userId && tokenKey !== exceptKey) {
        this.sessions.delete(tokenKey);
        revoked += 1;
      }
    }
    return revoked;
  }

  private syncActiveSessionsForUser(user: StoredUser): void {
    const updatedAuthUser = this.toAuthUser(user);
    for (const [token, entry] of this.sessions.entries()) {
      if (entry.user.id === user.id) {
        this.sessions.set(token, {
          ...entry,
          user: updatedAuthUser,
        });
      }
    }
  }

  private pushAudit(
    actionType: AuditLogEntry['actionType'],
    userEmail: string,
    details: string,
  ): void {
    const now = new Date();
    this.auditLogs.unshift({
      id: `aud-${crypto.randomUUID().slice(0, 8)}`,
      timestampBahrain: formatBahrainTimestamp(now),
      createdAt: now.toISOString(),
      actionType,
      userEmail,
      details,
    });
  }

  issueCsrfToken(): string {
    const nonce = crypto.randomBytes(16).toString('hex');
    const sig = crypto.createHmac('sha256', this.csrfSecret).update(nonce).digest('hex');
    return `${nonce}.${sig}`;
  }

  verifyCsrfToken(headerToken: string | undefined, cookieToken: string | undefined): boolean {
    if (!headerToken || !/^[0-9a-f]{32}\.[0-9a-f]{64}$/.test(headerToken)) {
      return false;
    }
    const [nonce, sig] = headerToken.split('.');
    const expectedSig = crypto.createHmac('sha256', this.csrfSecret).update(nonce).digest('hex');
    const sigOk = crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expectedSig, 'hex'));
    if (!sigOk) {
      return false;
    }
    if (cookieToken) {
      const a = Buffer.from(headerToken);
      const b = Buffer.from(cookieToken);
      return a.length === b.length && crypto.timingSafeEqual(a, b);
    }
    return true;
  }

  isSetupRequired(): boolean {
    return !this.hasUserWithRole('ADMINISTRATOR');
  }

  isStaffSetupRequired(): boolean {
    return !this.hasUserWithRole('STAFF');
  }

  setupInitialAdmin(input: {
    email: string;
    name: string;
    passcode: string;
  }): {token: string; user: AuthUser} {
    if (this.hasUserWithRole('ADMINISTRATOR')) {
      throw new Error('Administrator account has already been configured.');
    }
    const cleanEmail = input.email.trim().toLowerCase();
    if (this.findUserByEmail(cleanEmail)) {
      throw new Error('This email address is already assigned to another XBMS account.');
    }
    const cleanName = input.name.trim() || 'Principal Administrator';
    const {salt, hash} = hashPassword(input.passcode);
    const nowIso = new Date().toISOString();

    const stored: StoredUser = {
      id: 'admin-principal',
      email: cleanEmail,
      name: cleanName,
      title: this.settings.signatoryTitle,
      role: 'ADMINISTRATOR',
      status: 'ACTIVE',
      salt,
      passwordHash: hash,
      lastPasswordChangeAt: nowIso,
      lastActiveAt: nowIso,
      requirePasswordChange: false,
      userManagedPassword: true,
    };
    this.usersById.set(stored.id, stored);

    const user = this.toAuthUser(stored);
    const token = crypto.randomBytes(32).toString('hex');
    const tokenKey = hashSessionToken(token);
    this.sessions.set(tokenKey, {
      token: tokenKey,
      user,
      expiresAt: Date.now() + 8 * 60 * 60 * 1000,
    });

    this.pushAudit(
      'ADMIN_SETUP',
      cleanEmail,
      `First-run XBMS Administrator account initialized for ${cleanName} (${cleanEmail}).`,
    );
    this.persist();

    return {token, user};
  }

  setupInitialStaff(input: {
    email: string;
    name: string;
    passcode: string;
  }): {token: string; user: AuthUser} {
    if (this.hasUserWithRole('STAFF')) {
      throw new Error('Staff terminal account has already been configured.');
    }
    const cleanEmail = input.email.trim().toLowerCase();
    if (this.findUserByEmail(cleanEmail)) {
      throw new Error('This email address is already assigned to another XBMS account.');
    }
    const cleanName = input.name.trim() || 'Senior Billing Officer';
    const {salt, hash} = hashPassword(input.passcode);
    const nowIso = new Date().toISOString();

    const stored: StoredUser = {
      id: 'staff-counter-01',
      email: cleanEmail,
      name: cleanName,
      title: 'Staff Billing Counter',
      staffId: 'XT-STF-001',
      departmentRole: 'Billing Clerk',
      role: 'STAFF',
      status: 'ACTIVE',
      salt,
      passwordHash: hash,
      lastPasswordChangeAt: nowIso,
      lastActiveAt: nowIso,
      requirePasswordChange: false,
      userManagedPassword: true,
    };
    this.usersById.set(stored.id, stored);

    const user = this.toAuthUser(stored);
    const token = crypto.randomBytes(32).toString('hex');
    const tokenKey = hashSessionToken(token);
    this.sessions.set(tokenKey, {
      token: tokenKey,
      user,
      expiresAt: Date.now() + 8 * 60 * 60 * 1000,
    });

    this.pushAudit(
      'ADMIN_SETUP',
      cleanEmail,
      `First-run XBMS Staff Billing Terminal credential initialized for ${cleanName} (${cleanEmail}).`,
    );
    this.persist();

    return {token, user};
  }

  authenticateUser(
    emailOrStaffId: string,
    passcode: string,
    requiredRole?: 'ADMINISTRATOR' | 'STAFF',
  ):
    | {ok: true; token: string; user: AuthUser}
    | {
        ok: false;
        reason: 'NOT_INITIALIZED' | 'USER_NOT_FOUND' | 'WRONG_ROLE' | 'LOCKED' | 'INVALID_PASSWORD';
      } {
    if (requiredRole && !this.hasUserWithRole(requiredRole)) {
      return {ok: false, reason: 'NOT_INITIALIZED'};
    }
    if (!requiredRole && this.usersById.size === 0) {
      return {ok: false, reason: 'NOT_INITIALIZED'};
    }

    const cleanIdentifier = emailOrStaffId.trim().toLowerCase();
    const account =
      requiredRole === 'STAFF'
        ? this.findUserByEmailOrStaffId(emailOrStaffId)
        : this.findUserByEmail(cleanIdentifier);

    if (!account) {
      this.pushAudit(
        'LOGIN_FAILED',
        cleanIdentifier || 'unknown@anonymous',
        `Rejected ${requiredRole ? requiredRole.toLowerCase() : 'XBMS'} authentication attempt: no account found for ${cleanIdentifier || 'empty identifier'}.`,
      );
      this.persist();
      return {ok: false, reason: 'USER_NOT_FOUND'};
    }

    if (requiredRole && account.role !== requiredRole) {
      this.pushAudit(
        'LOGIN_FAILED',
        account.email,
        `Rejected ${requiredRole.toLowerCase()} portal sign-in for ${account.email} (${account.role} account).`,
      );
      this.persist();
      return {ok: false, reason: 'WRONG_ROLE'};
    }

    if (account.status === 'LOCKED') {
      this.pushAudit(
        'LOGIN_FAILED',
        account.email,
        `Blocked authentication attempt on LOCKED ${account.role} account (${account.email}).`,
      );
      this.persist();
      return {ok: false, reason: 'LOCKED'};
    }

    if (!verifyPassword(passcode, account.salt, account.passwordHash)) {
      this.pushAudit(
        'LOGIN_FAILED',
        account.email,
        `Rejected invalid password attempt for ${account.email} (${account.role}).`,
      );
      this.persist();
      return {ok: false, reason: 'INVALID_PASSWORD'};
    }

    account.lastActiveAt = new Date().toISOString();
    const user = this.toAuthUser(account);
    const token = crypto.randomBytes(32).toString('hex');
    const tokenKey = hashSessionToken(token);
    this.sessions.set(tokenKey, {
      token: tokenKey,
      user,
      expiresAt: Date.now() + 8 * 60 * 60 * 1000,
    });

    this.pushAudit(
      'LOGIN_SUCCESS',
      user.email,
      `Successful ${user.role === 'STAFF' ? 'counter ' : ''}login by ${user.name} (${user.role}).`,
    );
    this.persist();

    return {ok: true, token, user};
  }

  loginAdmin(email: string, passcode: string): {token: string; user: AuthUser} | null {
    const res = this.authenticateUser(email, passcode, 'ADMINISTRATOR');
    return res.ok ? {token: res.token, user: res.user} : null;
  }

  loginStaff(email: string, passcode: string): {token: string; user: AuthUser} | null {
    const res = this.authenticateUser(email, passcode, 'STAFF');
    return res.ok ? {token: res.token, user: res.user} : null;
  }

  requestPasswordReset(email: string): {expiresInMinutes: number; email: string} {
    const cleanEmail = email.trim().toLowerCase();
    const user = this.findUserByEmail(cleanEmail);
    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }
    if (user.status === 'LOCKED') {
      throw new Error('ACCOUNT_LOCKED');
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    const {salt: otpSalt, hash: otpHash} = hashPassword(otp);

    this.passwordResetOtps.set(cleanEmail, {
      userId: user.id,
      email: cleanEmail,
      otpSalt,
      otpHash,
      expiresAt: Date.now() + 15 * 60 * 1000,
      attempts: 0,
    });

    // Dispatch recovery token to server log for local/staging verification (never returned in HTTP body)
    console.info(
      `[XBMS Auth Recovery] 6-digit OTP for ${user.email} (${user.role}): ${otp} — expires in 15 minutes`,
    );

    this.pushAudit(
      'PASSWORD_RESET_REQUESTED',
      user.email,
      `Generated 15-minute 6-digit recovery OTP for ${user.name} (${user.role}).`,
    );
    this.persist();

    return {expiresInMinutes: 15, email: user.email};
  }

  verifyResetOtp(email: string, otpOrToken: string): boolean {
    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otpOrToken.trim();
    const entry = this.passwordResetOtps.get(cleanEmail);
    if (!entry) {
      throw new Error('OTP_NOT_FOUND');
    }
    if (Date.now() > entry.expiresAt) {
      this.passwordResetOtps.delete(cleanEmail);
      this.persist();
      throw new Error('OTP_EXPIRED');
    }
    if (entry.attempts >= 5) {
      this.passwordResetOtps.delete(cleanEmail);
      this.persist();
      throw new Error('OTP_MAX_ATTEMPTS');
    }

    const valid = verifyPassword(cleanOtp, entry.otpSalt, entry.otpHash);
    if (!valid) {
      entry.attempts += 1;
      if (entry.attempts >= 5) {
        this.passwordResetOtps.delete(cleanEmail);
        this.persist();
        throw new Error('OTP_MAX_ATTEMPTS');
      }
      this.persist();
      throw new Error('OTP_INVALID');
    }
    return true;
  }

  confirmPasswordReset(input: {
    email: string;
    otpOrToken: string;
    newPassword: string;
  }): {role: 'ADMINISTRATOR' | 'STAFF'} {
    const cleanEmail = input.email.trim().toLowerCase();
    this.verifyResetOtp(cleanEmail, input.otpOrToken);

    const strengthError = validatePasswordStrength(input.newPassword);
    if (strengthError) {
      throw new Error(`WEAK_PASSWORD:${strengthError}`);
    }

    const user = this.findUserByEmail(cleanEmail);
    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }
    if (user.status === 'LOCKED') {
      throw new Error('ACCOUNT_LOCKED');
    }

    const {salt, hash} = hashPassword(input.newPassword);
    const nowIso = new Date().toISOString();
    user.salt = salt;
    user.passwordHash = hash;
    user.lastPasswordChangeAt = nowIso;
    user.requirePasswordChange = false;
    user.userManagedPassword = true;

    this.passwordResetOtps.delete(cleanEmail);
    const revokedCount = this.revokeUserSessions(user.id);

    this.pushAudit(
      'PASSWORD_RESET_COMPLETED',
      user.email,
      `Self-service password recovery completed for ${user.name} (${user.role}). Revoked ${revokedCount} active session(s).`,
    );
    this.persist();

    return {role: user.role};
  }

  changeOwnPassword(input: {
    userId: string;
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
    currentToken?: string;
    signOutOtherSessions?: boolean;
  }): {token: string; user: AuthUser; revokedOtherSessions: number} {
    const user = this.usersById.get(input.userId);
    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }
    if (user.status === 'LOCKED') {
      throw new Error('ACCOUNT_LOCKED');
    }
    if (!verifyPassword(input.currentPassword, user.salt, user.passwordHash)) {
      throw new Error('INVALID_CURRENT_PASSWORD');
    }
    if (input.newPassword !== input.confirmPassword) {
      throw new Error('PASSWORD_MISMATCH');
    }
    if (input.newPassword === input.currentPassword) {
      throw new Error('PASSWORD_UNCHANGED');
    }

    const strengthError = validatePasswordStrength(input.newPassword);
    if (strengthError) {
      throw new Error(`WEAK_PASSWORD:${strengthError}`);
    }

    const {salt, hash} = hashPassword(input.newPassword);
    const nowIso = new Date().toISOString();
    user.salt = salt;
    user.passwordHash = hash;
    user.lastPasswordChangeAt = nowIso;
    user.requirePasswordChange = false;
    user.lastActiveAt = nowIso;
    user.userManagedPassword = true;

    if (input.currentToken) {
      this.sessions.delete(hashSessionToken(input.currentToken));
    }

    const authUser = this.toAuthUser(user);
    const newToken = crypto.randomBytes(32).toString('hex');
    const newTokenKey = hashSessionToken(newToken);
    this.sessions.set(newTokenKey, {
      token: newTokenKey,
      user: authUser,
      expiresAt: Date.now() + 8 * 60 * 60 * 1000,
    });

    let revokedOtherSessions = 0;
    if (input.signOutOtherSessions) {
      revokedOtherSessions = this.revokeUserSessions(user.id, newToken);
    } else {
      this.syncActiveSessionsForUser(user);
    }

    this.pushAudit(
      'USER_PASSWORD_UPDATED',
      user.email,
      `User ${user.email} (${user.role}) updated account password.${
        input.signOutOtherSessions
          ? ` Terminated ${revokedOtherSessions} other active session(s).`
          : ''
      }`,
    );
    this.persist();

    return {token: newToken, user: authUser, revokedOtherSessions};
  }

  listUsers(): SystemUserRecord[] {
    return Array.from(this.usersById.values())
      .sort((a, b) => {
        if (a.role !== b.role) return a.role === 'ADMINISTRATOR' ? -1 : 1;
        return a.email.localeCompare(b.email);
      })
      .map((u) => this.toSystemUserRecord(u));
  }

  provisionUser(
    input: {
      name: string;
      email: string;
      title?: string;
      role: 'ADMINISTRATOR' | 'STAFF';
      temporaryPassword: string;
      forceChangeOnNextLogin?: boolean;
    },
    actorEmail: string,
  ): SystemUserRecord {
    const cleanEmail = input.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      throw new Error('INVALID_EMAIL');
    }
    if (this.findUserByEmail(cleanEmail)) {
      throw new Error('DUPLICATE_EMAIL');
    }
    if (input.role !== 'ADMINISTRATOR' && input.role !== 'STAFF') {
      throw new Error('INVALID_ROLE');
    }
    const strengthError = validatePasswordStrength(input.temporaryPassword);
    if (strengthError) {
      throw new Error(`WEAK_PASSWORD:${strengthError}`);
    }

    const {salt, hash} = hashPassword(input.temporaryPassword);
    const nowIso = new Date().toISOString();
    const id = `${input.role === 'ADMINISTRATOR' ? 'admin' : 'staff'}-${crypto.randomUUID().slice(0, 8)}`;

    const created: StoredUser = {
      id,
      email: cleanEmail,
      name: input.name.trim(),
      title:
        (input.title || '').trim() ||
        (input.role === 'ADMINISTRATOR' ? 'System Administrator' : 'Staff Billing Officer'),
      role: input.role,
      status: 'ACTIVE',
      salt,
      passwordHash: hash,
      lastPasswordChangeAt: nowIso,
      lastActiveAt: 'Never',
      requirePasswordChange: Boolean(input.forceChangeOnNextLogin ?? true),
      userManagedPassword: true,
    };
    this.usersById.set(created.id, created);

    this.pushAudit(
      'USER_PROVISIONED',
      actorEmail,
      `Provisioned new ${created.role} account for ${created.name} (${created.email})${
        created.requirePasswordChange ? ' with mandatory first-login password change' : ''
      }.`,
    );
    this.persist();

    return this.toSystemUserRecord(created);
  }

  setUserStatus(
    userId: string,
    status: 'ACTIVE' | 'LOCKED',
    actorId: string,
    actorEmail: string,
  ): SystemUserRecord {
    const target = this.usersById.get(userId);
    if (!target) {
      throw new Error('USER_NOT_FOUND');
    }
    if (target.id === actorId && status === 'LOCKED') {
      throw new Error('CANNOT_LOCK_SELF');
    }
    if (target.role === 'ADMINISTRATOR' && status === 'LOCKED') {
      const otherActiveAdmins = Array.from(this.usersById.values()).filter(
        (u) => u.role === 'ADMINISTRATOR' && u.status === 'ACTIVE' && u.id !== target.id,
      );
      if (otherActiveAdmins.length === 0) {
        throw new Error('LAST_ACTIVE_ADMIN');
      }
    }

    target.status = status;
    let revokedCount = 0;
    if (status === 'LOCKED') {
      revokedCount = this.revokeUserSessions(target.id);
    }

    this.pushAudit(
      'USER_STATUS_CHANGED',
      actorEmail,
      `Changed account status for ${target.email} (${target.role}) to ${status}.${
        revokedCount > 0 ? ` Revoked ${revokedCount} active session(s).` : ''
      }`,
    );
    this.persist();

    return this.toSystemUserRecord(target);
  }

  adminResetUserPassword(
    userId: string,
    input: {
      temporaryPassword: string;
      forceChangeOnNextLogin?: boolean;
    },
    actorEmail: string,
    actorId?: string,
    actorCurrentToken?: string,
  ): SystemUserRecord {
    const target = this.usersById.get(userId);
    if (!target) {
      throw new Error('USER_NOT_FOUND');
    }
    const strengthError = validatePasswordStrength(input.temporaryPassword);
    if (strengthError) {
      throw new Error(`WEAK_PASSWORD:${strengthError}`);
    }

    const {salt, hash} = hashPassword(input.temporaryPassword);
    const nowIso = new Date().toISOString();
    target.salt = salt;
    target.passwordHash = hash;
    target.lastPasswordChangeAt = nowIso;
    target.requirePasswordChange = Boolean(input.forceChangeOnNextLogin ?? true);
    target.userManagedPassword = true;

    const isSelfReset = Boolean(actorId && target.id === actorId);
    const revokedCount = this.revokeUserSessions(
      target.id,
      isSelfReset && !target.requirePasswordChange ? actorCurrentToken : undefined,
    );

    this.pushAudit(
      'ADMIN_FORCE_PASSWORD_RESET',
      actorEmail,
      `Administrator ${actorEmail} forced password reset for ${target.email} (${target.role}). Require change on next login: ${
        target.requirePasswordChange ? 'YES' : 'NO'
      }. Revoked ${revokedCount} active session(s).`,
    );
    this.persist();

    return this.toSystemUserRecord(target);
  }

  issueStaffAuthorizationToken(
    type: 'INVITE' | 'OVERRIDE',
    actorEmail: string,
  ): {token: string; type: 'INVITE' | 'OVERRIDE'; expiresInMinutes: number} {
    const raw =
      type === 'INVITE'
        ? `XT-INV-${crypto.randomBytes(3).toString('hex').toUpperCase()}`
        : `OVR-${crypto.randomInt(100000, 1000000)}`;
    const ttlMinutes = type === 'INVITE' ? 24 * 60 : 30;
    const {salt, hash} = hashPassword(raw);
    const id = `tok-${crypto.randomUUID().slice(0, 8)}`;

    this.staffAuthorizationTokens.set(id, {
      id,
      type,
      salt,
      hash,
      expiresAt: Date.now() + ttlMinutes * 60 * 1000,
      issuedBy: actorEmail,
    });

    this.pushAudit(
      'ADMIN_TOKEN_ISSUED',
      actorEmail,
      `Issued single-use ${type === 'INVITE' ? 'Staff Invite Authorization Code' : 'Admin Override PIN'} (valid ${ttlMinutes}m).`,
    );
    this.persist();

    return {token: raw, type, expiresInMinutes: ttlMinutes};
  }

  registerStaffAccount(input: {
    fullName: string;
    staffId: string;
    email: string;
    departmentRole: StaffDepartmentRole;
    authorizationCode?: string;
    passcode: string;
    requestSupervisorApproval?: boolean;
  }):
    | {outcome: 'PROVISIONED'; user: SystemUserRecord}
    | {outcome: 'PENDING_APPROVAL'; request: PendingStaffRequest} {
    const cleanName = input.fullName.trim();
    const cleanStaffId = input.staffId.trim().toUpperCase();
    const cleanEmail = input.email.trim().toLowerCase();

    if (cleanName.length < 2) {
      throw new Error('INVALID_NAME');
    }
    if (!/^[A-Z0-9-]{3,24}$/.test(cleanStaffId)) {
      throw new Error('INVALID_STAFF_ID');
    }
    if (!cleanEmail.endsWith('@xerotechtechnologies.com')) {
      throw new Error('INVALID_CORPORATE_DOMAIN');
    }
    if (!/^[^\s@]+@xerotechtechnologies\.com$/.test(cleanEmail)) {
      throw new Error('INVALID_EMAIL');
    }
    if (!ALLOWED_STAFF_DEPARTMENTS.has(input.departmentRole)) {
      throw new Error('INVALID_DEPARTMENT_ROLE');
    }
    const strengthError = validatePasswordStrength(input.passcode);
    if (strengthError) {
      throw new Error(`WEAK_PASSWORD:${strengthError}`);
    }

    if (this.findUserByEmail(cleanEmail) || this.findUserByEmailOrStaffId(cleanStaffId)) {
      throw new Error('DUPLICATE_ACCOUNT');
    }
    for (const pending of this.pendingStaffRequests.values()) {
      if (
        pending.status === 'PENDING' &&
        (pending.email === cleanEmail || pending.staffId === cleanStaffId)
      ) {
        throw new Error('DUPLICATE_PENDING_REQUEST');
      }
    }

    const cleanCode = (input.authorizationCode || '').trim();
    const {salt, hash} = hashPassword(input.passcode);
    const nowIso = new Date().toISOString();

    if (cleanCode) {
      const valid = this.consumeStaffAuthorizationToken(cleanCode, 'INVITE');
      if (!valid) {
        throw new Error('INVALID_INVITE_CODE');
      }

      const id = `staff-${crypto.randomUUID().slice(0, 8)}`;
      const created: StoredUser = {
        id,
        email: cleanEmail,
        name: cleanName,
        title: input.departmentRole,
        staffId: cleanStaffId,
        departmentRole: input.departmentRole,
        role: 'STAFF',
        status: 'ACTIVE',
        salt,
        passwordHash: hash,
        lastPasswordChangeAt: nowIso,
        lastActiveAt: 'Never',
        requirePasswordChange: false,
        userManagedPassword: true,
      };
      this.usersById.set(created.id, created);

      this.pushAudit(
        'STAFF_PROVISIONED_BY_CODE',
        cleanEmail,
        `Provisioned Staff Billing Terminal account for ${cleanName} (${cleanStaffId} · ${input.departmentRole}) using verified Authorization Code.`,
      );
      this.persist();

      return {outcome: 'PROVISIONED', user: this.toSystemUserRecord(created)};
    }

    if (!input.requestSupervisorApproval) {
      throw new Error('INVITE_OR_APPROVAL_REQUIRED');
    }

    const reqId = `sreq-${crypto.randomUUID().slice(0, 8)}`;
    const storedRequest: StoredPendingStaffRequest = {
      id: reqId,
      staffId: cleanStaffId,
      name: cleanName,
      email: cleanEmail,
      departmentRole: input.departmentRole,
      status: 'PENDING',
      requestedAt: nowIso,
      salt,
      passwordHash: hash,
    };
    this.pendingStaffRequests.set(reqId, storedRequest);

    this.pushAudit(
      'STAFF_REGISTRATION_REQUESTED',
      cleanEmail,
      `Submitted Staff Terminal onboarding request for ${cleanName} (${cleanStaffId} · ${input.departmentRole}) awaiting supervisor approval.`,
    );
    this.persist();

    return {
      outcome: 'PENDING_APPROVAL',
      request: {
        id: storedRequest.id,
        staffId: storedRequest.staffId,
        name: storedRequest.name,
        email: storedRequest.email,
        departmentRole: storedRequest.departmentRole,
        status: storedRequest.status,
        requestedAt: storedRequest.requestedAt,
      },
    };
  }

  listPendingStaffRequests(): PendingStaffRequest[] {
    return Array.from(this.pendingStaffRequests.values())
      .filter((r) => r.status === 'PENDING')
      .map((r) => ({
        id: r.id,
        staffId: r.staffId,
        name: r.name,
        email: r.email,
        departmentRole: r.departmentRole,
        status: r.status,
        requestedAt: r.requestedAt,
      }));
  }

  reviewStaffRequest(
    requestId: string,
    decision: 'APPROVE' | 'REJECT',
    actorEmail: string,
  ): {request: PendingStaffRequest; createdUser?: SystemUserRecord} {
    const req = this.pendingStaffRequests.get(requestId);
    if (!req) {
      throw new Error('REQUEST_NOT_FOUND');
    }
    if (req.status !== 'PENDING') {
      throw new Error('REQUEST_ALREADY_REVIEWED');
    }

    if (decision === 'REJECT') {
      req.status = 'REJECTED';
      this.pushAudit(
        'USER_STATUS_CHANGED',
        actorEmail,
        `Rejected Staff Terminal registration request for ${req.name} (${req.email} · ${req.staffId}).`,
      );
      this.persist();
      return {
        request: {
          id: req.id,
          staffId: req.staffId,
          name: req.name,
          email: req.email,
          departmentRole: req.departmentRole,
          status: req.status,
          requestedAt: req.requestedAt,
        },
      };
    }

    if (this.findUserByEmail(req.email) || this.findUserByEmailOrStaffId(req.staffId)) {
      throw new Error('DUPLICATE_ACCOUNT');
    }

    const nowIso = new Date().toISOString();
    const created: StoredUser = {
      id: `staff-${crypto.randomUUID().slice(0, 8)}`,
      email: req.email,
      name: req.name,
      title: req.departmentRole,
      staffId: req.staffId,
      departmentRole: req.departmentRole,
      role: 'STAFF',
      status: 'ACTIVE',
      salt: req.salt,
      passwordHash: req.passwordHash,
      lastPasswordChangeAt: nowIso,
      lastActiveAt: 'Never',
      requirePasswordChange: false,
      userManagedPassword: true,
    };
    this.usersById.set(created.id, created);
    req.status = 'APPROVED';

    this.pushAudit(
      'USER_PROVISIONED',
      actorEmail,
      `Administrator ${actorEmail} approved Staff Terminal registration for ${created.name} (${created.staffId} · ${created.email}).`,
    );
    this.persist();

    return {
      request: {
        id: req.id,
        staffId: req.staffId,
        name: req.name,
        email: req.email,
        departmentRole: req.departmentRole,
        status: req.status,
        requestedAt: req.requestedAt,
      },
      createdUser: this.toSystemUserRecord(created),
    };
  }

  reactivateStaffAccount(input: {
    identifier: string;
    reason: ReactivationReason;
    overridePin: string;
    newPasscode: string;
  }): SystemUserRecord {
    const cleanIdentifier = input.identifier.trim();
    if (!cleanIdentifier) {
      throw new Error('IDENTIFIER_REQUIRED');
    }
    if (!ALLOWED_REACTIVATION_REASONS.has(input.reason)) {
      throw new Error('INVALID_REASON');
    }

    const account = this.findUserByEmailOrStaffId(cleanIdentifier);
    if (!account) {
      throw new Error('STAFF_NOT_FOUND');
    }
    if (account.role !== 'STAFF') {
      throw new Error('STAFF_ONLY_REACTIVATION');
    }

    const strengthError = validatePasswordStrength(input.newPasscode);
    if (strengthError) {
      throw new Error(`WEAK_PASSWORD:${strengthError}`);
    }

    let authorized = this.consumeStaffAuthorizationToken(input.overridePin, 'OVERRIDE');
    if (!authorized) {
      try {
        authorized = this.verifyResetOtp(account.email, input.overridePin);
        if (authorized) {
          this.passwordResetOtps.delete(account.email);
        }
      } catch {
        authorized = false;
      }
    }

    if (!authorized) {
      this.pushAudit(
        'LOGIN_FAILED',
        account.email,
        `Rejected Staff Terminal reactivation attempt for ${account.email} (${account.staffId || account.id}): invalid Admin Override PIN.`,
      );
      this.persist();
      throw new Error('INVALID_OVERRIDE_PIN');
    }

    const {salt, hash} = hashPassword(input.newPasscode);
    const nowIso = new Date().toISOString();
    account.salt = salt;
    account.passwordHash = hash;
    account.status = 'ACTIVE';
    account.requirePasswordChange = false;
    account.lastPasswordChangeAt = nowIso;
    account.userManagedPassword = true;

    const revokedCount = this.revokeUserSessions(account.id);

    this.pushAudit(
      'STAFF_ACCOUNT_REACTIVATED',
      account.email,
      `Re-initialized Staff Billing Terminal account for ${account.name} (${account.staffId || account.email}). Reason: ${input.reason}. Revoked ${revokedCount} prior session(s).`,
    );
    this.persist();

    return this.toSystemUserRecord(account);
  }

  verifySessionDetailed(token: string | undefined):
    | {ok: true; user: AuthUser}
    | {ok: false; reason: 'MISSING' | 'EXPIRED' | 'LOCKED' | 'INVALID'} {
    if (!token || !token.trim()) {
      return {ok: false, reason: 'MISSING'};
    }
    const tokenKey = hashSessionToken(token.trim());
    const entry = this.sessions.get(tokenKey);
    if (!entry) {
      return {ok: false, reason: 'INVALID'};
    }
    if (Date.now() > entry.expiresAt) {
      this.sessions.delete(tokenKey);
      this.persist();
      return {ok: false, reason: 'EXPIRED'};
    }
    const account = this.usersById.get(entry.user.id);
    if (!account) {
      this.sessions.delete(tokenKey);
      this.persist();
      return {ok: false, reason: 'INVALID'};
    }
    if (account.status === 'LOCKED') {
      this.sessions.delete(tokenKey);
      this.persist();
      return {ok: false, reason: 'LOCKED'};
    }
    return {ok: true, user: this.toAuthUser(account)};
  }

  verifySession(token: string | undefined): AuthUser | null {
    const res = this.verifySessionDetailed(token);
    return res.ok ? res.user : null;
  }

  logoutSession(token: string | undefined): void {
    if (token) {
      this.sessions.delete(hashSessionToken(token.trim()));
      this.persist();
    }
  }

  resetPortalCredentials(actorNote: string): {
    setupRequired: boolean;
    staffSetupRequired: boolean;
  } {
    this.usersById.clear();
    this.sessions.clear();
    this.passwordResetOtps.clear();
    this.staffAuthorizationTokens.clear();
    this.pendingStaffRequests.clear();
    this.seededEnvDigests = {};
    this.disableEnvSeed = {};

    this.reconcileEnvSeeds();

    this.pushAudit(
      'ADMIN_FORCE_PASSWORD_RESET',
      'system@xerotechtechnologies.com',
      `Portal credentials store (./data/auth-store.json) reset cleanly (${actorNote}).`,
    );
    this.persist();

    return {
      setupRequired: this.isSetupRequired(),
      staffSetupRequired: this.isStaffSetupRequired(),
    };
  }

  getDashboardSummary(): DashboardSummary {
    let totalInvoicedFils = 0;
    let totalCollectionsFils = 0;
    let outstandingFils = 0;
    let paidCount = 0;
    let partialCount = 0;
    let unpaidCount = 0;
    let cancelledCount = 0;

    const todayISO = new Date().toISOString().slice(0, 10);
    let todaysCollectionsFils = 0;
    let todaysReceiptsCount = 0;

    for (const rec of this.receipts) {
      if (rec.status === 'CANCELLED') {
        cancelledCount += 1;
        continue;
      }
      totalInvoicedFils += toFils(rec.totalBHD);
      totalCollectionsFils += toFils(rec.paidBHD);
      outstandingFils += toFils(rec.balanceBHD);

      if (rec.status === 'PAID') paidCount += 1;
      else if (rec.status === 'PARTIAL') partialCount += 1;
      else if (rec.status === 'UNPAID') unpaidCount += 1;

      if (rec.dateISO === todayISO) {
        todaysCollectionsFils += toFils(rec.paidBHD);
        todaysReceiptsCount += 1;
      }
    }

    const activeDocuments = paidCount + partialCount + unpaidCount;
    const activeTotalBHD = fromFils(totalInvoicedFils);
    const activeCollectionsBHD = fromFils(totalCollectionsFils);

    const monthly: TrajectoryPoint[] = [
      {label: 'Jul', invoicedBHD: 520.0, collectedBHD: 460.0},
      {label: 'Aug', invoicedBHD: 690.0, collectedBHD: 580.0},
      {label: 'Sep', invoicedBHD: 810.0, collectedBHD: 720.0},
      {label: 'Oct', invoicedBHD: 920.0, collectedBHD: 840.0},
      {label: 'Nov', invoicedBHD: activeTotalBHD, collectedBHD: activeCollectionsBHD},
    ];

    const weekly: TrajectoryPoint[] = [
      {label: 'Wk 1', invoicedBHD: activeTotalBHD, collectedBHD: activeCollectionsBHD},
      {label: 'Wk 2', invoicedBHD: 220.0, collectedBHD: 180.0},
      {label: 'Wk 3', invoicedBHD: 310.0, collectedBHD: 250.0},
      {label: 'Wk 4', invoicedBHD: 180.0, collectedBHD: 140.0},
    ];

    const daily: TrajectoryPoint[] = [
      {label: 'Mon', invoicedBHD: 150.0, collectedBHD: 100.0},
      {label: 'Tue', invoicedBHD: 450.0, collectedBHD: 300.0},
      {label: 'Wed', invoicedBHD: 120.0, collectedBHD: 120.0},
      {label: 'Thu', invoicedBHD: 280.0, collectedBHD: 100.0},
      {label: 'Today', invoicedBHD: fromFils(todaysCollectionsFils), collectedBHD: fromFils(todaysCollectionsFils)},
    ];

    const yearly: TrajectoryPoint[] = [
      {label: '2024', invoicedBHD: 4850.0, collectedBHD: 4410.0},
      {label: '2025', invoicedBHD: 7620.0, collectedBHD: 7090.0},
      {
        label: '2026',
        invoicedBHD: fromFils(toFils(2940.0) + totalInvoicedFils),
        collectedBHD: fromFils(toFils(2600.0) + totalCollectionsFils),
      },
    ];

    return {
      kpis: {
        totalInvoicedBHD: activeTotalBHD,
        totalCollectionsBHD: activeCollectionsBHD,
        outstandingReceivablesBHD: fromFils(outstandingFils),
        activeDocuments,
        todaysCollectionsBHD: fromFils(todaysCollectionsFils),
        todaysReceiptsCount,
        weekCollectionsBHD: activeCollectionsBHD,
        monthTotalBHD: activeTotalBHD,
        paidCount,
        partialCount,
        unpaidCount,
        cancelledCount,
      },
      trajectory: {daily, weekly, monthly, yearly},
      recentReceipts: [...this.receipts],
    };
  }

  getReceipts(): ReceiptRecord[] {
    return [...this.receipts];
  }

  getReceiptById(id: string): ReceiptRecord | undefined {
    return this.receipts.find((r) => r.id === id);
  }

  createReceipt(
    input: {
      clientName: string;
      clientPhone: string;
      clientEmail?: string;
      serviceName: string;
      projectTitle?: string;
      paymentMethod: PaymentChannel;
      paymentTerms: PaymentTerms;
      totalBHD: number;
      balanceBHD: number;
      notes?: string;
      items?: BoqLineItem[];
    },
    actorEmail: string,
  ): ReceiptRecord {
    const cleanItems: BoqLineItem[] | undefined = Array.isArray(input.items) && input.items.length > 0
      ? input.items.map((item, idx) => {
          const qty = Math.max(1, Math.round(Number(item.qty) || 1));
          const unitFils = Math.max(0, toFils(Number(item.unitPriceBHD) || 0));
          const amtFils = qty * unitFils;
          return {
            id: item.id || `boq-${idx + 1}`,
            description: String(item.description || input.serviceName).trim(),
            qty,
            unitPriceBHD: fromFils(unitFils),
            amountBHD: fromFils(amtFils),
          };
        })
      : undefined;

    const totalFils = cleanItems
      ? cleanItems.reduce((acc, it) => acc + toFils(it.amountBHD), 0)
      : Math.max(0, toFils(input.totalBHD));
    const balanceFils = Math.min(totalFils, Math.max(0, toFils(input.balanceBHD)));
    const paidFils = Math.max(0, totalFils - balanceFils);

    this.settings.receiptSequenceCounter += 1;
    const seq = String(this.settings.receiptSequenceCounter).padStart(3, '0');
    const now = new Date();
    const yyyy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    const receiptNo = `${this.settings.receiptPrefix}-${yyyy}-${mm}-${seq}`;

    const status: ReceiptRecord['status'] =
      balanceFils === 0 ? 'PAID' : paidFils === 0 ? 'UNPAID' : 'PARTIAL';

    const dateISO = now.toISOString().slice(0, 10);
    const dateDisplay = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Bahrain',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(now);

    const record: ReceiptRecord = {
      id: `rec-${crypto.randomUUID().slice(0, 8)}`,
      receiptNo,
      dateISO,
      dateDisplay,
      clientName: input.clientName.trim(),
      clientPhone: input.clientPhone.trim(),
      clientEmail: (input.clientEmail || '').trim(),
      serviceName: input.serviceName.trim(),
      projectTitle: (input.projectTitle || input.serviceName).trim(),
      paymentMethod: input.paymentMethod,
      paymentTerms: input.paymentTerms,
      totalBHD: fromFils(totalFils),
      paidBHD: fromFils(paidFils),
      balanceBHD: fromFils(balanceFils),
      status,
      notes: (input.notes || '').trim(),
      ...(cleanItems ? {items: cleanItems} : {}),
      issuedBy: actorEmail,
      createdAt: now.toISOString(),
    };

    // Ensure client also exists in registered directory
    const cleanPhoneNorm = record.clientPhone.replace(/\D/g, '');
    const clientExists = this.registeredClients.some(
      (c) =>
        c.name.toLowerCase() === record.clientName.toLowerCase() ||
        c.phone.replace(/\D/g, '') === cleanPhoneNorm,
    );
    if (!clientExists) {
      this.registeredClients.unshift({
        id: `cli-${crypto.randomUUID().slice(0, 8)}`,
        name: record.clientName,
        phone: record.clientPhone,
        email: record.clientEmail,
      });
    }

    this.receipts.unshift(record);
    this.pushAudit(
      'RECEIPT_ISSUED',
      actorEmail,
      `Issued official receipt ${record.receiptNo} for ${record.clientName} (${fromFils(totalFils).toFixed(3)} BHD total, ${fromFils(paidFils).toFixed(3)} BHD paid).`,
    );
    this.persist();

    return record;
  }

  cancelReceipt(id: string, reason: string, actorEmail: string): ReceiptRecord {
    const receipt = this.receipts.find((r) => r.id === id);
    if (!receipt) {
      throw new Error('NOT_FOUND');
    }
    if (receipt.status === 'CANCELLED') {
      throw new Error('ALREADY_CANCELLED');
    }

    const now = new Date().toISOString();
    receipt.status = 'CANCELLED';
    receipt.cancelledBy = actorEmail;
    receipt.cancelledAt = now;
    receipt.cancellationReason = reason.trim();

    this.pushAudit(
      'RECEIPT_VOIDED',
      actorEmail,
      `Voided receipt ${receipt.receiptNo} (${receipt.clientName} · ${receipt.totalBHD.toFixed(3)} BHD). Justification: ${receipt.cancellationReason}`,
    );
    this.persist();

    return {...receipt};
  }

  createClient(
    input: {name: string; phone: string; email?: string; address?: string},
    actorEmail: string,
  ): ClientSummary {
    const cleanName = input.name.trim();
    const cleanPhone = input.phone.trim();
    const phoneDigits = cleanPhone.replace(/\D/g, '');
    const duplicate = this.registeredClients.find(
      (c) => c.phone.replace(/\D/g, '') === phoneDigits,
    );
    if (duplicate) {
      throw new Error('DUPLICATE_PHONE');
    }

    const entry: ClientDirectoryEntry = {
      id: `cli-${crypto.randomUUID().slice(0, 8)}`,
      name: cleanName,
      phone: cleanPhone,
      email: (input.email || '').trim(),
      address: (input.address || '').trim(),
    };
    this.registeredClients.unshift(entry);
    this.pushAudit(
      'LEAD_RECEIVED',
      actorEmail,
      `Registered commercial client ${entry.name} (${entry.phone}).`,
    );
    this.persist();

    return {
      id: entry.id,
      name: entry.name,
      phone: entry.phone,
      email: entry.email,
      projectsCount: 0,
      activeReceiptsCount: 0,
      voidedReceiptsCount: 0,
      totalInvoicedBHD: 0,
      totalPaidBHD: 0,
      outstandingBalanceBHD: 0,
      lastActivityDate: 'New Account',
    };
  }

  getClients(search?: string): ClientSummary[] {
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        phone: string;
        email: string;
        projectsCount: number;
        activeReceiptsCount: number;
        voidedReceiptsCount: number;
        invoicedFils: number;
        paidFils: number;
        balanceFils: number;
        lastActivityDate: string;
      }
    >();

    for (const cli of this.registeredClients) {
      const key = cli.name.trim().toLowerCase();
      map.set(key, {
        id: cli.id,
        name: cli.name,
        phone: cli.phone,
        email: cli.email,
        projectsCount: 0,
        activeReceiptsCount: 0,
        voidedReceiptsCount: 0,
        invoicedFils: 0,
        paidFils: 0,
        balanceFils: 0,
        lastActivityDate: 'Active Account',
      });
    }

    for (const rec of this.receipts) {
      const key = rec.clientName.trim().toLowerCase();
      const existing = map.get(key) || {
        id: `cli-${key.replace(/[^a-z0-9]+/g, '-')}`,
        name: rec.clientName,
        phone: rec.clientPhone,
        email: rec.clientEmail,
        projectsCount: 0,
        activeReceiptsCount: 0,
        voidedReceiptsCount: 0,
        invoicedFils: 0,
        paidFils: 0,
        balanceFils: 0,
        lastActivityDate: rec.dateDisplay,
      };

      if (!existing.email && rec.clientEmail) existing.email = rec.clientEmail;
      if (!existing.phone && rec.clientPhone) existing.phone = rec.clientPhone;
      existing.lastActivityDate = rec.dateDisplay;

      if (rec.status === 'CANCELLED') {
        existing.voidedReceiptsCount += 1;
      } else {
        existing.projectsCount += 1;
        existing.activeReceiptsCount += 1;
        existing.invoicedFils += toFils(rec.totalBHD);
        existing.paidFils += toFils(rec.paidBHD);
        existing.balanceFils += toFils(rec.balanceBHD);
      }

      map.set(key, existing);
    }

    const q = (search || '').trim().toLowerCase();
    return Array.from(map.values())
      .filter((item) => {
        if (!q) return true;
        return (
          item.name.toLowerCase().includes(q) ||
          item.phone.toLowerCase().includes(q) ||
          item.email.toLowerCase().includes(q)
        );
      })
      .map((item) => ({
        id: item.id,
        name: item.name,
        phone: item.phone,
        email: item.email,
        projectsCount: item.projectsCount,
        activeReceiptsCount: item.activeReceiptsCount,
        voidedReceiptsCount: item.voidedReceiptsCount,
        totalInvoicedBHD: fromFils(item.invoicedFils),
        totalPaidBHD: fromFils(item.paidFils),
        outstandingBalanceBHD: fromFils(item.balanceFils),
        lastActivityDate: item.lastActivityDate,
      }));
  }

  getQuotations(): QuotationRecord[] {
    return [...this.quotations];
  }

  createStaffQuotation(
    input: {
      clientName: string;
      contactPerson?: string;
      clientPhone: string;
      clientEmail?: string;
      serviceName: string;
      projectTitle?: string;
      items: BoqLineItem[];
      advancePaidBHD?: number;
      notes?: string;
    },
    actorEmail: string,
  ): QuotationRecord {
    const cleanItems: BoqLineItem[] = input.items.map((item, idx) => {
      const qty = Math.max(1, Math.round(Number(item.qty) || 1));
      const unitFils = Math.max(0, toFils(Number(item.unitPriceBHD) || 0));
      const amtFils = qty * unitFils;
      return {
        id: item.id || `boq-${idx + 1}`,
        description: String(item.description || input.serviceName).trim(),
        qty,
        unitPriceBHD: fromFils(unitFils),
        amountBHD: fromFils(amtFils),
      };
    });

    const totalFils = cleanItems.reduce((acc, it) => acc + toFils(it.amountBHD), 0);
    const advanceFils =
      typeof input.advancePaidBHD === 'number' && input.advancePaidBHD >= 0
        ? Math.min(totalFils, toFils(input.advancePaidBHD))
        : Math.round(totalFils * 0.5);

    const refNum = Math.floor(500 + Math.random() * 499);
    const referenceCode = `XT-DRF-2026-${refNum}`;

    const qot: QuotationRecord = {
      id: `qot-${crypto.randomUUID().slice(0, 8)}`,
      referenceCode,
      quotationNo: null,
      source: 'STAFF_DRAFT',
      clientName: input.clientName.trim(),
      contactPerson: (input.contactPerson || input.clientName).trim(),
      clientPhone: input.clientPhone.trim(),
      clientEmail: (input.clientEmail || '').trim(),
      serviceNames: Array.from(
        new Set([input.serviceName.trim(), ...cleanItems.map((i) => i.description)]),
      ).slice(0, 8),
      items: cleanItems,
      estimatedTotalBHD: fromFils(totalFils),
      advanceMilestoneBHD: fromFils(advanceFils),
      notes: (input.notes || input.projectTitle || '').trim(),
      status: 'PENDING_APPROVAL',
      submittedBy: actorEmail,
      submittedAt: new Date().toISOString(),
    };

    this.quotations.unshift(qot);
    this.pushAudit(
      'LEAD_RECEIVED',
      actorEmail,
      `Staff submitted draft quotation ${qot.referenceCode} for ${qot.clientName} (${fromFils(totalFils).toFixed(3)} BHD).`,
    );
    this.persist();

    return qot;
  }

  getTerminalConfig(): CompanySettings & {nextSequenceNo: string} {
    const seq = String(this.settings.receiptSequenceCounter + 1).padStart(3, '0');
    const now = new Date();
    const yyyy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    return {
      ...this.settings,
      nextSequenceNo: `${this.settings.receiptPrefix}-${yyyy}-${mm}-${seq}`,
    };
  }

  createPublicLead(input: {
    referenceCode: string;
    companyName: string;
    contactPerson: string;
    phone: string;
    email?: string;
    serviceNames: string[];
    estimatedTotalBHD: number;
    notes?: string;
  }): QuotationRecord {
    const totalFils = Math.max(0, toFils(input.estimatedTotalBHD));
    const advanceFils = Math.round(totalFils * 0.5);
    const clientName = input.companyName.trim() || input.contactPerson.trim();

    const existing = this.quotations.find((q) => q.referenceCode === input.referenceCode);
    if (existing) {
      return existing;
    }

    const qot: QuotationRecord = {
      id: `qot-${crypto.randomUUID().slice(0, 8)}`,
      referenceCode: input.referenceCode.trim(),
      quotationNo: null,
      source: 'PUBLIC_ESTIMATOR',
      clientName,
      contactPerson: input.contactPerson.trim(),
      clientPhone: input.phone.trim(),
      clientEmail: (input.email || '').trim(),
      serviceNames: input.serviceNames,
      estimatedTotalBHD: fromFils(totalFils),
      advanceMilestoneBHD: fromFils(advanceFils),
      notes: (input.notes || '').trim(),
      status: 'PENDING_APPROVAL',
      submittedBy: 'Public Project Estimator',
      submittedAt: new Date().toISOString(),
    };

    this.quotations.unshift(qot);
    this.pushAudit(
      'LEAD_RECEIVED',
      input.email?.trim() || 'public.estimator@xerotechtechnologies.com',
      `Captured estimator lead ${qot.referenceCode} for ${qot.clientName} (${fromFils(totalFils).toFixed(3)} BHD).`,
    );
    this.persist();

    return qot;
  }

  approveQuotation(id: string, actorEmail: string): QuotationRecord {
    const qot = this.quotations.find((q) => q.id === id);
    if (!qot) throw new Error('NOT_FOUND');
    if (qot.status === 'APPROVED') throw new Error('ALREADY_APPROVED');

    this.settings.quotationSequenceCounter += 1;
    const seq = String(this.settings.quotationSequenceCounter).padStart(3, '0');
    const now = new Date();
    const yyyy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');

    qot.quotationNo = `${this.settings.quotationPrefix}-${yyyy}-${mm}-${seq}`;
    qot.status = 'APPROVED';
    qot.approvedBy = actorEmail;
    qot.approvedAt = now.toISOString();
    delete qot.rejectionReason;
    delete qot.rejectedBy;
    delete qot.rejectedAt;

    this.pushAudit(
      'QUOTATION_APPROVED',
      actorEmail,
      `Approved quotation ${qot.quotationNo} (from ${qot.referenceCode}) for ${qot.clientName} (${qot.estimatedTotalBHD.toFixed(3)} BHD).`,
    );
    this.persist();

    return {...qot};
  }

  rejectQuotation(id: string, reason: string, actorEmail: string): QuotationRecord {
    const qot = this.quotations.find((q) => q.id === id);
    if (!qot) throw new Error('NOT_FOUND');
    if (qot.status === 'APPROVED') throw new Error('ALREADY_APPROVED');

    qot.status = 'REJECTED';
    qot.rejectionReason = reason.trim();
    qot.rejectedBy = actorEmail;
    qot.rejectedAt = new Date().toISOString();

    this.pushAudit(
      'QUOTATION_REJECTED',
      actorEmail,
      `Rejected ${qot.referenceCode} (${qot.clientName}). Feedback: ${qot.rejectionReason}`,
    );
    this.persist();

    return {...qot};
  }

  getSettings(): CompanySettings {
    return {...this.settings};
  }

  updateSettings(patch: Partial<CompanySettings>, actorEmail: string): CompanySettings {
    const safePrefix =
      typeof patch.receiptPrefix === 'string' && patch.receiptPrefix.trim()
        ? patch.receiptPrefix.trim().toUpperCase().slice(0, 12)
        : this.settings.receiptPrefix;

    this.settings = {
      ...this.settings,
      companyName:
        typeof patch.companyName === 'string' && patch.companyName.trim()
          ? patch.companyName.trim()
          : this.settings.companyName,
      crNumber:
        typeof patch.crNumber === 'string' && patch.crNumber.trim()
          ? patch.crNumber.trim()
          : this.settings.crNumber,
      slogan:
        typeof patch.slogan === 'string' && patch.slogan.trim()
          ? patch.slogan.trim()
          : this.settings.slogan,
      primaryEmail:
        typeof patch.primaryEmail === 'string' && patch.primaryEmail.trim()
          ? patch.primaryEmail.trim()
          : this.settings.primaryEmail,
      secondaryEmail:
        typeof patch.secondaryEmail === 'string' && patch.secondaryEmail.trim()
          ? patch.secondaryEmail.trim()
          : this.settings.secondaryEmail,
      website:
        typeof patch.website === 'string' && patch.website.trim()
          ? patch.website.trim()
          : this.settings.website,
      primaryPhone:
        typeof patch.primaryPhone === 'string' && patch.primaryPhone.trim()
          ? patch.primaryPhone.trim()
          : this.settings.primaryPhone,
      secondaryPhone:
        typeof patch.secondaryPhone === 'string' && patch.secondaryPhone.trim()
          ? patch.secondaryPhone.trim()
          : this.settings.secondaryPhone,
      signatoryTitle:
        typeof patch.signatoryTitle === 'string' && patch.signatoryTitle.trim()
          ? patch.signatoryTitle.trim()
          : this.settings.signatoryTitle,
      address:
        typeof patch.address === 'string' && patch.address.trim()
          ? patch.address.trim()
          : this.settings.address,
      receiptPrefix: safePrefix,
      receiptSequenceCounter:
        typeof patch.receiptSequenceCounter === 'number' &&
        Number.isInteger(patch.receiptSequenceCounter) &&
        patch.receiptSequenceCounter >= this.settings.receiptSequenceCounter
          ? patch.receiptSequenceCounter
          : this.settings.receiptSequenceCounter,
      renderOfficialStamp:
        typeof patch.renderOfficialStamp === 'boolean'
          ? patch.renderOfficialStamp
          : this.settings.renderOfficialStamp,
      renderAuthorizedSignature:
        typeof patch.renderAuthorizedSignature === 'boolean'
          ? patch.renderAuthorizedSignature
          : this.settings.renderAuthorizedSignature,
      displayServicesFooter:
        typeof patch.displayServicesFooter === 'boolean'
          ? patch.displayServicesFooter
          : this.settings.displayServicesFooter,
      defaultTerms:
        typeof patch.defaultTerms === 'string'
          ? patch.defaultTerms.trim()
          : this.settings.defaultTerms,
    };

    this.pushAudit(
      'SETTINGS_UPDATED',
      actorEmail,
      `Updated XeroTech CR ${this.settings.crNumber} billing & document configuration (prefix ${this.settings.receiptPrefix}).`,
    );
    this.persist();

    return {...this.settings};
  }

  getAuditLogs(): AuditLogEntry[] {
    return [...this.auditLogs];
  }

  logPdfDownload(receiptNo: string, actorEmail: string): void {
    this.pushAudit(
      'PDF_DOWNLOADED',
      actorEmail,
      `Generated & downloaded official A4 PDF receipt for ${receiptNo}.`,
    );
    this.persist();
  }
}

export const xbmsStore = new XbmsStore();
