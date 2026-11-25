import express, {type NextFunction, type Request, type Response} from 'express';
import {services as officialServices} from '../src/data/services.ts';
import type {
  AuthUser,
  BoqLineItem,
  PaymentChannel,
  PaymentTerms,
  ReactivationReason,
  StaffDepartmentRole,
} from '../src/types/xbms.ts';
import {generateReceiptPdfBuffer} from './xbmsPdf.ts';
import {xbmsStore} from './xbmsStore.ts';

const ALLOWED_CHANNELS = new Set<PaymentChannel>([
  'BenefitPay',
  'Bank Transfer',
  'Card Payment',
  'Cash',
]);

const ALLOWED_TERMS = new Set<PaymentTerms>([
  'Full Payment',
  'Partial Payment (50%)',
  'Milestone Payment',
  'Unpaid / Credit',
]);

function parseCookieValue(cookieHeader: string | undefined, key: string): string | undefined {
  if (!cookieHeader) return undefined;
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const [k, ...rest] = part.trim().split('=');
    if (k === key) {
      return decodeURIComponent(rest.join('='));
    }
  }
  return undefined;
}

function isHttpsRequest(req: Request): boolean {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '')
    .split(',')[0]
    .trim()
    .toLowerCase();
  return Boolean(req.secure || forwardedProto === 'https');
}

function isLocalLoopbackRequest(req: Request): boolean {
  const forwardedHost = req.headers['x-forwarded-host'];
  if (forwardedHost) {
    const firstHost = String(forwardedHost).split(',')[0].trim().toLowerCase();
    if (!firstHost.startsWith('localhost') && !firstHost.startsWith('127.0.0.1')) {
      return false;
    }
  }
  const host = String(req.headers.host || '').toLowerCase();
  const isLocalHost =
    host.startsWith('localhost') ||
    host.startsWith('127.0.0.1') ||
    host.startsWith('[::1]');
  const ip = String(req.ip || req.socket.remoteAddress || '');
  const isLoopbackIp =
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === '::ffff:127.0.0.1' ||
    ip === '';
  return isLocalHost && isLoopbackIp;
}

function appendSetCookie(res: Response, cookieValue: string): void {
  const existing = res.getHeader('Set-Cookie');
  if (!existing) {
    res.setHeader('Set-Cookie', cookieValue);
  } else if (Array.isArray(existing)) {
    res.setHeader('Set-Cookie', [...existing, cookieValue]);
  } else {
    res.setHeader('Set-Cookie', [String(existing), cookieValue]);
  }
}

function setSessionCookie(req: Request, res: Response, token: string): void {
  const isHttps = isHttpsRequest(req);
  const flags = isHttps
    ? `xbms_session=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=28800; SameSite=None; Secure; Partitioned`
    : `xbms_session=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=28800; SameSite=Lax`;
  appendSetCookie(res, flags);
}

function clearSessionCookie(req: Request, res: Response): void {
  const isHttps = isHttpsRequest(req);
  const flags = isHttps
    ? `xbms_session=; HttpOnly; Path=/; Max-Age=0; SameSite=None; Secure; Partitioned`
    : `xbms_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`;
  appendSetCookie(res, flags);
}

function extractBearerToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const bearer = authHeader.slice(7).trim();
    if (bearer) return bearer;
  }
  return parseCookieValue(req.headers.cookie, 'xbms_session');
}

function requireCsrf(req: Request, res: Response, next: NextFunction): void {
  const headerToken = req.headers['x-csrftoken'] as string | undefined;
  const cookieToken = parseCookieValue(req.headers.cookie, 'csrftoken');
  if (!xbmsStore.verifyCsrfToken(headerToken, cookieToken)) {
    res.status(403).json({
      error: 'Invalid or missing CSRF verification token. Reload the page or ensure cookies are enabled.',
    });
    return;
  }
  next();
}

interface AuthenticatedRequest extends Request {
  authUser?: AuthUser;
}

function requireAdministrator(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  const sessionCheck = xbmsStore.verifySessionDetailed(token);
  if (!sessionCheck.ok) {
    const message =
      sessionCheck.reason === 'MISSING'
        ? 'Session cookie missing or authorization header absent. Please sign in.'
        : sessionCheck.reason === 'EXPIRED'
          ? 'Session expired. Please sign in again.'
          : 'Executive authentication required. Please sign in again.';
    res.status(401).json({error: message});
    return;
  }
  if (sessionCheck.user.role !== 'ADMINISTRATOR') {
    res.status(403).json({
      error: 'HTTP 403 Forbidden: ADMINISTRATOR privileges are strictly required for this endpoint.',
    });
    return;
  }
  req.authUser = sessionCheck.user;
  next();
}

function requireOperational(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  const sessionCheck = xbmsStore.verifySessionDetailed(token);
  if (!sessionCheck.ok) {
    const message =
      sessionCheck.reason === 'MISSING'
        ? 'Session cookie missing or authorization header absent. Please sign in.'
        : sessionCheck.reason === 'EXPIRED'
          ? 'Session expired. Please sign in again.'
          : 'Operational terminal authentication required. Please sign in again.';
    res.status(401).json({error: message});
    return;
  }
  if (sessionCheck.user.role !== 'ADMINISTRATOR' && sessionCheck.user.role !== 'STAFF') {
    res.status(403).json({error: 'HTTP 403 Forbidden: Operational staff or admin role required.'});
    return;
  }
  req.authUser = sessionCheck.user;
  next();
}

function validateBoqItems(rawItems: unknown): BoqLineItem[] {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new Error('At least one Bill of Quantities (BoQ) line item is required.');
  }
  return rawItems.slice(0, 20).map((item, idx) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`Invalid BoQ row at index ${idx + 1}.`);
    }
    const row = item as Record<string, unknown>;
    const desc = typeof row.description === 'string' ? row.description.trim() : '';
    if (!desc) {
      throw new Error(`Line item #${idx + 1} requires a description.`);
    }
    const qty = Number(row.qty);
    const unitPrice = Number(row.unitPriceBHD);
    if (!Number.isFinite(qty) || qty < 1 || qty > 10000) {
      throw new Error(`Line item #${idx + 1} quantity must be between 1 and 10,000.`);
    }
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw new Error(`Line item #${idx + 1} unit price must be a valid non-negative BHD value.`);
    }
    const roundedQty = Math.round(qty);
    const roundedUnit = Math.round(unitPrice * 1000) / 1000;
    const amountBHD = Math.round(roundedQty * Math.round(roundedUnit * 1000)) / 1000;
    return {
      id: typeof row.id === 'string' && row.id ? row.id : `boq-${idx + 1}`,
      description: desc.slice(0, 200),
      qty: roundedQty,
      unitPriceBHD: roundedUnit,
      amountBHD,
    };
  });
}

function isValidBahrainPhone(phone: string): boolean {
  const cleaned = phone.trim();
  const digits = cleaned.replace(/\D/g, '');
  return cleaned.startsWith('+973') && digits.length >= 11 && digits.length <= 12;
}

export function createXbmsRouter() {
  const router = express.Router();

  // CSRF Token Bootstrap
  router.get('/csrf/', (req: Request, res: Response) => {
    const token = xbmsStore.issueCsrfToken();
    const isHttps = isHttpsRequest(req);

    const cookieFlags = isHttps
      ? `csrftoken=${encodeURIComponent(token)}; Path=/; SameSite=None; Secure; Partitioned`
      : `csrftoken=${encodeURIComponent(token)}; Path=/; SameSite=Lax`;

    appendSetCookie(res, cookieFlags);
    res.json({csrfToken: token});
  });

  // Auth Status & Session (Two Roles: ADMINISTRATOR & STAFF)
  router.get('/auth/status/', (req: Request, res: Response) => {
    res.json({
      setupRequired: xbmsStore.isSetupRequired(),
      staffSetupRequired: xbmsStore.isStaffSetupRequired(),
      localResetAllowed: isLocalLoopbackRequest(req),
    });
  });

  router.post('/auth/setup/', requireCsrf, (req: Request, res: Response) => {
    try {
      const {email, name, passcode} = req.body ?? {};
      if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        res.status(400).json({error: 'Please enter a valid corporate administrator email.'});
        return;
      }
      if (typeof passcode !== 'string' || passcode.length < 8) {
        res.status(400).json({error: 'Administrator passcode must be at least 8 characters.'});
        return;
      }
      const cleanName = typeof name === 'string' && name.trim() ? name.trim() : 'Principal Administrator';
      const result = xbmsStore.setupInitialAdmin({email, name: cleanName, passcode});
      setSessionCookie(req, res, result.token);
      res.status(201).json(result);
    } catch (err) {
      res.status(409).json({
        error: err instanceof Error ? err.message : 'Unable to complete administrator setup.',
      });
    }
  });

  router.post('/auth/staff/setup/', requireCsrf, (req: Request, res: Response) => {
    try {
      const {email, name, passcode} = req.body ?? {};
      if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        res.status(400).json({error: 'Please enter a valid staff operator email.'});
        return;
      }
      if (typeof passcode !== 'string' || passcode.length < 8) {
        res.status(400).json({error: 'Staff passcode must be at least 8 characters.'});
        return;
      }
      const cleanName = typeof name === 'string' && name.trim() ? name.trim() : 'Senior Billing Officer';
      const result = xbmsStore.setupInitialStaff({email, name: cleanName, passcode});
      setSessionCookie(req, res, result.token);
      res.status(201).json(result);
    } catch (err) {
      res.status(409).json({
        error: err instanceof Error ? err.message : 'Unable to complete staff terminal setup.',
      });
    }
  });

  router.post('/auth/login/', requireCsrf, (req: Request, res: Response) => {
    if (xbmsStore.isSetupRequired()) {
      res.status(409).json({
        error: 'Account not initialized yet. Complete first-run Administrator setup before signing in.',
      });
      return;
    }
    const {email, passcode} = req.body ?? {};
    if (typeof email !== 'string' || typeof passcode !== 'string') {
      res.status(400).json({error: 'Email and passcode are required.'});
      return;
    }
    const result = xbmsStore.authenticateUser(email, passcode, 'ADMINISTRATOR');
    if (!result.ok) {
      if (result.reason === 'NOT_INITIALIZED') {
        res.status(409).json({error: 'Administrator account not initialized yet.'});
        return;
      }
      if (result.reason === 'LOCKED') {
        res.status(403).json({
          error: 'This administrator account has been locked. Contact another Principal Administrator.',
        });
        return;
      }
      if (result.reason === 'WRONG_ROLE') {
        res.status(403).json({
          error: 'This email belongs to a Staff Terminal account. Sign in via /terminal instead.',
        });
        return;
      }
      if (result.reason === 'USER_NOT_FOUND') {
        res.status(401).json({
          error: 'Administrator account not found for that email. Check the address or reset local portal credentials.',
        });
        return;
      }
      res.status(401).json({error: 'Invalid password for administrator account.'});
      return;
    }
    setSessionCookie(req, res, result.token);
    res.json({token: result.token, user: result.user});
  });

  router.post('/auth/staff/login/', requireCsrf, (req: Request, res: Response) => {
    if (xbmsStore.isStaffSetupRequired()) {
      res.status(409).json({
        error: 'Account not initialized yet. Complete first-run Staff Terminal setup before signing in.',
      });
      return;
    }
    const {email, passcode} = req.body ?? {};
    if (typeof email !== 'string' || typeof passcode !== 'string') {
      res.status(400).json({error: 'Email or Staff ID and passcode are required.'});
      return;
    }
    const result = xbmsStore.authenticateUser(email, passcode, 'STAFF');
    if (!result.ok) {
      if (result.reason === 'NOT_INITIALIZED') {
        res.status(409).json({error: 'Staff Terminal account not initialized yet.'});
        return;
      }
      if (result.reason === 'LOCKED') {
        res.status(403).json({
          error: 'This staff account is currently locked. Use Re-activate / Reset Staff Account with an Admin Override PIN.',
        });
        return;
      }
      if (result.reason === 'WRONG_ROLE') {
        res.status(403).json({
          error: 'This email belongs to an Administrator account. Sign in via /admin/dashboard instead.',
        });
        return;
      }
      if (result.reason === 'USER_NOT_FOUND') {
        res.status(401).json({
          error: 'Staff operator account not found for that email or Staff ID. Register or reset local portal credentials.',
        });
        return;
      }
      res.status(401).json({error: 'Invalid password for staff operator account.'});
      return;
    }
    setSessionCookie(req, res, result.token);
    res.json({token: result.token, user: result.user});
  });

  // Staff Terminal Registration (with Authorization Code OR Supervisor Approval Request)
  router.post('/auth/staff/register/', requireCsrf, (req: Request, res: Response) => {
    const {
      fullName,
      staffId,
      email,
      departmentRole,
      authorizationCode = '',
      passcode,
      confirmPasscode,
      requestSupervisorApproval = false,
    } = req.body ?? {};

    if (
      typeof fullName !== 'string' ||
      typeof staffId !== 'string' ||
      typeof email !== 'string' ||
      typeof departmentRole !== 'string' ||
      typeof passcode !== 'string'
    ) {
      res.status(400).json({
        error: 'Full Name, Staff ID, Work Email, Department Role, and Passcode are required.',
      });
      return;
    }

    if (typeof confirmPasscode === 'string' && passcode !== confirmPasscode) {
      res.status(400).json({error: 'Staff passcodes do not match.'});
      return;
    }

    try {
      const result = xbmsStore.registerStaffAccount({
        fullName,
        staffId,
        email,
        departmentRole: departmentRole as StaffDepartmentRole,
        authorizationCode: typeof authorizationCode === 'string' ? authorizationCode : '',
        passcode,
        requestSupervisorApproval: Boolean(requestSupervisorApproval),
      });

      if (result.outcome === 'PROVISIONED') {
        res.status(201).json({
          outcome: 'PROVISIONED',
          user: result.user,
          message: 'Terminal credentials provisioned. You may now sign in to the Staff Billing Terminal.',
        });
        return;
      }

      res.status(202).json({
        outcome: 'PENDING_APPROVAL',
        request: result.request,
        message: 'Account request submitted for supervisor approval.',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'INVALID_NAME') {
        res.status(400).json({error: 'Full name must be at least 2 characters.'});
        return;
      }
      if (msg === 'INVALID_STAFF_ID') {
        res.status(400).json({error: 'Staff ID must be 3-24 alphanumeric/hyphen characters (e.g. XT-STF-004).'});
        return;
      }
      if (msg === 'INVALID_CORPORATE_DOMAIN' || msg === 'INVALID_EMAIL') {
        res.status(400).json({error: 'Work email must be a valid @xerotechtechnologies.com address.'});
        return;
      }
      if (msg === 'INVALID_DEPARTMENT_ROLE') {
        res.status(400).json({error: 'Select Billing Clerk, Shift Supervisor, or Audit Staff.'});
        return;
      }
      if (msg.startsWith('WEAK_PASSWORD:')) {
        res.status(400).json({error: msg.replace('WEAK_PASSWORD:', '')});
        return;
      }
      if (msg === 'DUPLICATE_ACCOUNT' || msg === 'DUPLICATE_PENDING_REQUEST') {
        res.status(409).json({
          error: 'A staff account or pending onboarding request already exists for this email or Staff ID.',
        });
        return;
      }
      if (msg === 'INVALID_INVITE_CODE') {
        res.status(403).json({
          error: 'Invalid or expired Authorization / Invite Code. Verify with your Administrator or submit for supervisor approval.',
        });
        return;
      }
      if (msg === 'INVITE_OR_APPROVAL_REQUIRED') {
        res.status(400).json({
          error: 'Enter a valid Authorization / Invite Code or select supervisor approval request.',
        });
        return;
      }
      res.status(400).json({error: 'Unable to process Staff Terminal registration.'});
    }
  });

  // Staff Terminal Re-create / Re-activate Account (Admin Override PIN or OTP required)
  router.post('/auth/staff/reactivate/', requireCsrf, (req: Request, res: Response) => {
    const {identifier, reason, overridePin, newPasscode} = req.body ?? {};
    if (
      typeof identifier !== 'string' ||
      typeof reason !== 'string' ||
      typeof overridePin !== 'string' ||
      typeof newPasscode !== 'string'
    ) {
      res.status(400).json({
        error: 'Staff Email/ID, reason, Admin Override Token/PIN, and new passcode are required.',
      });
      return;
    }

    try {
      const user = xbmsStore.reactivateStaffAccount({
        identifier,
        reason: reason as ReactivationReason,
        overridePin,
        newPasscode,
      });
      res.json({
        ok: true,
        user,
        message: 'Terminal credentials provisioned. Staff account re-initialized and ready for login.',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'STAFF_NOT_FOUND') {
        res.status(404).json({error: 'No registered Staff Terminal account found for that Email or Staff ID.'});
        return;
      }
      if (msg === 'STAFF_ONLY_REACTIVATION') {
        res.status(403).json({
          error: 'Administrator credentials cannot be modified from the Staff Terminal gate.',
        });
        return;
      }
      if (msg === 'INVALID_REASON') {
        res.status(400).json({error: 'Please choose a valid reactivation reason.'});
        return;
      }
      if (msg.startsWith('WEAK_PASSWORD:')) {
        res.status(400).json({error: msg.replace('WEAK_PASSWORD:', '')});
        return;
      }
      if (msg === 'INVALID_OVERRIDE_PIN') {
        res.status(403).json({
          error: 'Invalid or expired Admin Override Token / Verification PIN.',
        });
        return;
      }
      res.status(400).json({error: 'Unable to re-initialize staff account.'});
    }
  });

  router.post('/auth/signin/', requireCsrf, (req: Request, res: Response) => {
    const {email, passcode} = req.body ?? {};
    if (typeof email !== 'string' || typeof passcode !== 'string') {
      res.status(400).json({error: 'Corporate email and password are required.'});
      return;
    }
    const result = xbmsStore.authenticateUser(email, passcode);
    if (!result.ok) {
      if (result.reason === 'NOT_INITIALIZED') {
        res.status(409).json({
          error: 'Account not initialized yet. Complete first-run setup for Admin or Staff first.',
        });
        return;
      }
      if (result.reason === 'LOCKED') {
        res.status(403).json({
          error: 'This XBMS account is currently locked by an administrator.',
        });
        return;
      }
      if (result.reason === 'USER_NOT_FOUND') {
        res.status(401).json({
          error: 'No XBMS account found for that email address.',
        });
        return;
      }
      res.status(401).json({error: 'Invalid password for this XBMS account.'});
      return;
    }
    setSessionCookie(req, res, result.token);
    res.json({token: result.token, user: result.user});
  });

  // Workflow A: Self-Service Password Recovery ("Forgot Password?")
  router.post('/auth/forgot-password/', requireCsrf, (req: Request, res: Response) => {
    const {email} = req.body ?? {};
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      res.status(400).json({error: 'Please enter a valid corporate email address.'});
      return;
    }
    try {
      const info = xbmsStore.requestPasswordReset(email);
      res.json({
        ok: true,
        expiresInMinutes: info.expiresInMinutes,
        message:
          'A 6-digit recovery code valid for 15 minutes has been generated and logged for verification.',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'USER_NOT_FOUND') {
        res.status(404).json({error: 'No registered XBMS account matches this email address.'});
        return;
      }
      if (msg === 'ACCOUNT_LOCKED') {
        res.status(403).json({
          error: 'Account is locked. Contact a Principal Administrator for clearance.',
        });
        return;
      }
      res.status(400).json({error: 'Unable to initiate password recovery.'});
    }
  });

  router.post('/auth/verify-reset-otp/', requireCsrf, (req: Request, res: Response) => {
    const {email, otp_or_token} = req.body ?? {};
    if (typeof email !== 'string' || typeof otp_or_token !== 'string' || otp_or_token.trim().length < 6) {
      res.status(400).json({error: 'Email and 6-digit recovery OTP are required.'});
      return;
    }
    try {
      xbmsStore.verifyResetOtp(email, otp_or_token);
      res.json({ok: true});
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'OTP_EXPIRED') {
        res.status(410).json({error: 'Recovery OTP has expired. Request a new 6-digit code.'});
        return;
      }
      if (msg === 'OTP_MAX_ATTEMPTS') {
        res.status(429).json({
          error: 'Maximum verification attempts exceeded. Request a new recovery OTP.',
        });
        return;
      }
      res.status(400).json({error: 'Invalid 6-digit recovery code. Please verify and try again.'});
    }
  });

  router.post('/auth/reset-password-confirm/', requireCsrf, (req: Request, res: Response) => {
    const {email, otp_or_token, new_password} = req.body ?? {};
    if (typeof email !== 'string' || typeof otp_or_token !== 'string' || typeof new_password !== 'string') {
      res.status(400).json({error: 'Email, recovery OTP, and new password are required.'});
      return;
    }
    try {
      const result = xbmsStore.confirmPasswordReset({
        email,
        otpOrToken: otp_or_token,
        newPassword: new_password,
      });
      res.json({
        ok: true,
        role: result.role,
        message: 'Password updated and all active sessions revoked. You may now sign in.',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.startsWith('WEAK_PASSWORD:')) {
        res.status(400).json({error: msg.replace('WEAK_PASSWORD:', '')});
        return;
      }
      if (msg === 'OTP_EXPIRED') {
        res.status(410).json({error: 'Recovery OTP has expired. Request a new 6-digit code.'});
        return;
      }
      if (msg === 'OTP_MAX_ATTEMPTS') {
        res.status(429).json({error: 'Maximum OTP attempts exceeded. Request a fresh code.'});
        return;
      }
      if (msg === 'OTP_INVALID' || msg === 'OTP_NOT_FOUND') {
        res.status(400).json({error: 'Invalid or expired recovery code.'});
        return;
      }
      if (msg === 'ACCOUNT_LOCKED') {
        res.status(403).json({error: 'Account is locked by an administrator.'});
        return;
      }
      res.status(400).json({error: 'Unable to complete password reset.'});
    }
  });

  // Workflow B: Self-Service Password Update (STAFF & ADMINISTRATOR)
  router.post(
    '/auth/change-password/',
    requireOperational,
    requireCsrf,
    (req: AuthenticatedRequest, res: Response) => {
      const {
        current_password,
        new_password,
        confirm_password,
        sign_out_other_sessions = true,
      } = req.body ?? {};

      if (
        typeof current_password !== 'string' ||
        typeof new_password !== 'string' ||
        typeof confirm_password !== 'string'
      ) {
        res.status(400).json({
          error: 'Current password, new password, and confirmation password are required.',
        });
        return;
      }

      try {
        const result = xbmsStore.changeOwnPassword({
          userId: req.authUser!.id,
          currentPassword: current_password,
          newPassword: new_password,
          confirmPassword: confirm_password,
          currentToken: extractBearerToken(req),
          signOutOtherSessions: Boolean(sign_out_other_sessions),
        });
        setSessionCookie(req, res, result.token);
        res.json({
          ok: true,
          token: result.token,
          user: result.user,
          revokedOtherSessions: result.revokedOtherSessions,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        if (msg === 'INVALID_CURRENT_PASSWORD') {
          res.status(401).json({error: 'Current password does not match your account.'});
          return;
        }
        if (msg === 'PASSWORD_MISMATCH') {
          res.status(400).json({error: 'New password and confirmation do not match.'});
          return;
        }
        if (msg === 'PASSWORD_UNCHANGED') {
          res.status(400).json({error: 'New password must differ from your current password.'});
          return;
        }
        if (msg.startsWith('WEAK_PASSWORD:')) {
          res.status(400).json({error: msg.replace('WEAK_PASSWORD:', '')});
          return;
        }
        res.status(400).json({error: 'Unable to update password.'});
      }
    },
  );

  router.get('/auth/me/', requireOperational, (req: AuthenticatedRequest, res: Response) => {
    res.json({user: req.authUser});
  });

  router.post('/auth/logout/', requireCsrf, (req: Request, res: Response) => {
    xbmsStore.logoutSession(extractBearerToken(req));
    clearSessionCookie(req, res);
    res.json({ok: true});
  });

  // Portal Credential Recovery / Reset (Local loopback dev OR authenticated Admin OR Override PIN)
  router.post('/auth/reset-portal/', requireCsrf, (req: Request, res: Response) => {
    const isLocal = isLocalLoopbackRequest(req);
    const activeToken = extractBearerToken(req);
    const session = xbmsStore.verifySessionDetailed(activeToken);
    const isAuthenticatedAdmin = session.ok && session.user.role === 'ADMINISTRATOR';

    const overridePin =
      typeof req.body?.overridePin === 'string' ? req.body.overridePin.trim() : '';
    const envOverride =
      process.env.ADMIN_OVERRIDE_PIN?.trim() || process.env.ADMIN_PASSCODE?.trim() || '';
    const hasEnvOverride =
      Boolean(envOverride) && Boolean(overridePin) && overridePin === envOverride;

    if (!isLocal && !isAuthenticatedAdmin && !hasEnvOverride) {
      res.status(403).json({
        error:
          'Portal credential reset requires localhost access, an active Administrator session, or a valid server Override PIN.',
      });
      return;
    }

    const actorNote = isLocal
      ? 'local VS Code / localhost recovery'
      : isAuthenticatedAdmin
        ? `admin ${session.user.email}`
        : 'server override PIN';

    const status = xbmsStore.resetPortalCredentials(actorNote);
    clearSessionCookie(req, res);
    res.json({
      ok: true,
      ...status,
      message:
        status.setupRequired || status.staffSetupRequired
          ? 'Local portal credentials cleared. Complete first-run setup below to set new Admin and Staff passwords.'
          : 'Portal credentials were re-seeded from your .env ADMIN_PASSCODE / STAFF_PASSCODE settings.',
    });
  });

  // Public Lead Intake (EstimatorModal -> Admin Quotations Pipeline)
  router.post('/leads/', requireCsrf, (req: Request, res: Response) => {
    const {
      referenceCode,
      companyName = '',
      contactPerson,
      phone,
      email = '',
      serviceNames,
      estimatedTotalBHD,
      notes = '',
    } = req.body ?? {};

    if (typeof referenceCode !== 'string' || !referenceCode.trim()) {
      res.status(400).json({error: 'Lead reference code is required.'});
      return;
    }
    if (typeof contactPerson !== 'string' || !contactPerson.trim()) {
      res.status(400).json({error: 'Contact person is required.'});
      return;
    }
    if (typeof phone !== 'string' || phone.replace(/\D/g, '').length < 8) {
      res.status(400).json({error: 'Valid Bahrain phone number is required.'});
      return;
    }
    if (!Array.isArray(serviceNames) || serviceNames.length === 0) {
      res.status(400).json({error: 'Select at least one service.'});
      return;
    }

    const total = Number(estimatedTotalBHD);
    if (!Number.isFinite(total) || total < 0) {
      res.status(400).json({error: 'Estimated BHD amount must be valid.'});
      return;
    }

    const quotation = xbmsStore.createPublicLead({
      referenceCode,
      companyName: String(companyName),
      contactPerson,
      phone,
      email: String(email),
      serviceNames: serviceNames.map((s) => String(s)).slice(0, 12),
      estimatedTotalBHD: total,
      notes: String(notes),
    });

    res.status(201).json({quotation});
  });

  // Operational Catalog & Terminal Configuration (ADMINISTRATOR or STAFF)
  router.get('/services/', requireOperational, (_req: AuthenticatedRequest, res: Response) => {
    res.json({services: officialServices});
  });

  router.get('/terminal/config/', requireOperational, (_req: AuthenticatedRequest, res: Response) => {
    res.json({config: xbmsStore.getTerminalConfig()});
  });

  // Module 1: Executive Dashboard (STRICTLY ADMINISTRATOR)
  router.get('/dashboard/', requireAdministrator, (_req: AuthenticatedRequest, res: Response) => {
    res.json(xbmsStore.getDashboardSummary());
  });

  // Module 2: Commercial Quotations Pipeline
  router.get('/quotations/', requireOperational, (_req: AuthenticatedRequest, res: Response) => {
    res.json({quotations: xbmsStore.getQuotations()});
  });

  router.post(
    '/quotations/',
    requireOperational,
    requireCsrf,
    (req: AuthenticatedRequest, res: Response) => {
      try {
        const {
          clientName,
          contactPerson = '',
          clientPhone,
          clientEmail = '',
          serviceName,
          projectTitle = '',
          items,
          advancePaidBHD,
          notes = '',
        } = req.body ?? {};

        if (typeof clientName !== 'string' || clientName.trim().length < 2) {
          res.status(400).json({error: 'Client or company name is required.'});
          return;
        }
        if (typeof clientPhone !== 'string' || !isValidBahrainPhone(clientPhone)) {
          res.status(400).json({
            error: 'Valid Bahrain phone number in +973 XXXXXXXX format is required.',
          });
          return;
        }
        if (typeof serviceName !== 'string' || !serviceName.trim()) {
          res.status(400).json({error: 'Service category is required.'});
          return;
        }

        const cleanItems = validateBoqItems(items);
        const quotation = xbmsStore.createStaffQuotation(
          {
            clientName,
            contactPerson: String(contactPerson),
            clientPhone,
            clientEmail: String(clientEmail),
            serviceName,
            projectTitle: String(projectTitle),
            items: cleanItems,
            advancePaidBHD:
              typeof advancePaidBHD === 'number' && Number.isFinite(advancePaidBHD)
                ? advancePaidBHD
                : undefined,
            notes: String(notes),
          },
          req.authUser!.email,
        );

        res.status(201).json({quotation});
      } catch (err) {
        res.status(400).json({
          error: err instanceof Error ? err.message : 'Unable to submit draft quotation.',
        });
      }
    },
  );

  router.post(
    '/quotations/:id/approve/',
    requireAdministrator,
    requireCsrf,
    (req: AuthenticatedRequest, res: Response) => {
      try {
        const quotation = xbmsStore.approveQuotation(req.params.id, req.authUser!.email);
        res.json({quotation});
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        if (msg === 'NOT_FOUND') {
          res.status(404).json({error: 'Quotation record not found.'});
          return;
        }
        if (msg === 'ALREADY_APPROVED') {
          res.status(409).json({error: 'Quotation is already approved.'});
          return;
        }
        res.status(400).json({error: 'Unable to approve quotation.'});
      }
    },
  );

  router.post(
    '/quotations/:id/reject/',
    requireAdministrator,
    requireCsrf,
    (req: AuthenticatedRequest, res: Response) => {
      const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
      if (reason.length < 5) {
        res.status(400).json({error: 'Rejection feedback must be at least 5 characters.'});
        return;
      }
      try {
        const quotation = xbmsStore.rejectQuotation(req.params.id, reason, req.authUser!.email);
        res.json({quotation});
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        if (msg === 'NOT_FOUND') {
          res.status(404).json({error: 'Quotation record not found.'});
          return;
        }
        if (msg === 'ALREADY_APPROVED') {
          res.status(409).json({error: 'Approved quotations cannot be rejected.'});
          return;
        }
        res.status(400).json({error: 'Unable to reject quotation.'});
      }
    },
  );

  // Module 3: Client Directory CRM (Operational Read/Create for Staff + Admin)
  router.get('/clients/', requireOperational, (req: AuthenticatedRequest, res: Response) => {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    res.json({clients: xbmsStore.getClients(search)});
  });

  router.post(
    '/clients/',
    requireOperational,
    requireCsrf,
    (req: AuthenticatedRequest, res: Response) => {
      const {name, phone, email = '', address = ''} = req.body ?? {};
      if (typeof name !== 'string' || name.trim().length < 2) {
        res.status(400).json({error: 'Client / company name must be at least 2 characters.'});
        return;
      }
      if (typeof phone !== 'string' || !isValidBahrainPhone(phone)) {
        res.status(400).json({
          error: 'Phone must follow Bahrain +973 format (e.g. +973 3311 2244).',
        });
        return;
      }
      if (typeof email === 'string' && email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        res.status(400).json({error: 'Please enter a valid email address.'});
        return;
      }

      try {
        const client = xbmsStore.createClient(
          {name, phone, email: String(email), address: String(address)},
          req.authUser!.email,
        );
        res.status(201).json({client});
      } catch (err) {
        if (err instanceof Error && err.message === 'DUPLICATE_PHONE') {
          res.status(409).json({error: 'A commercial client with this +973 phone already exists.'});
          return;
        }
        res.status(400).json({error: 'Unable to register commercial client.'});
      }
    },
  );

  // Module 4: Receipts Ledger & Staff Finalization
  router.get('/receipts/', requireOperational, (_req: AuthenticatedRequest, res: Response) => {
    const cfg = xbmsStore.getTerminalConfig();
    res.json({
      receipts: xbmsStore.getReceipts(),
      nextSequence: cfg.receiptSequenceCounter + 1,
      receiptPrefix: cfg.receiptPrefix,
    });
  });

  const handleFinalizeReceipt = (req: AuthenticatedRequest, res: Response) => {
    const {
      clientName,
      clientPhone,
      clientEmail = '',
      serviceName,
      projectTitle = '',
      paymentMethod,
      paymentTerms,
      totalBHD,
      balanceBHD,
      advancePaidBHD,
      notes = '',
      items,
    } = req.body ?? {};

    if (typeof clientName !== 'string' || clientName.trim().length < 2) {
      res.status(400).json({error: 'Client name is required.'});
      return;
    }
    if (typeof clientPhone !== 'string' || clientPhone.replace(/\D/g, '').length < 8) {
      res.status(400).json({error: 'Valid client phone/WhatsApp number is required.'});
      return;
    }
    if (typeof serviceName !== 'string' || !serviceName.trim()) {
      res.status(400).json({error: 'Official service category is required.'});
      return;
    }
    if (!ALLOWED_CHANNELS.has(paymentMethod)) {
      res.status(400).json({error: 'Unsupported payment channel.'});
      return;
    }
    if (!ALLOWED_TERMS.has(paymentTerms)) {
      res.status(400).json({error: 'Unsupported payment terms.'});
      return;
    }

    let cleanItems: BoqLineItem[] | undefined;
    if (Array.isArray(items) && items.length > 0) {
      try {
        cleanItems = validateBoqItems(items);
      } catch (err) {
        res.status(400).json({
          error: err instanceof Error ? err.message : 'Invalid BoQ line items.',
        });
        return;
      }
    }

    const totalNum = cleanItems
      ? cleanItems.reduce((acc, row) => acc + Math.round(row.amountBHD * 1000), 0) / 1000
      : Number(totalBHD);

    if (!Number.isFinite(totalNum) || totalNum <= 0) {
      res.status(400).json({error: 'Total project cost must be greater than 0.000 BHD.'});
      return;
    }

    let resolvedBalance: number;
    if (typeof advancePaidBHD === 'number' && Number.isFinite(advancePaidBHD)) {
      if (advancePaidBHD < 0 || advancePaidBHD > totalNum) {
        res.status(400).json({error: 'Advance received must be between 0.000 and Total Cost.'});
        return;
      }
      resolvedBalance =
        (Math.round(totalNum * 1000) - Math.round(advancePaidBHD * 1000)) / 1000;
    } else {
      resolvedBalance = Number(balanceBHD);
    }

    if (!Number.isFinite(resolvedBalance) || resolvedBalance < 0 || resolvedBalance > totalNum) {
      res.status(400).json({error: 'Remaining balance must be between 0.000 and Total Cost.'});
      return;
    }

    const receipt = xbmsStore.createReceipt(
      {
        clientName,
        clientPhone,
        clientEmail: String(clientEmail),
        serviceName,
        projectTitle: String(projectTitle),
        paymentMethod,
        paymentTerms,
        totalBHD: totalNum,
        balanceBHD: resolvedBalance,
        notes: String(notes),
        items: cleanItems,
      },
      req.authUser!.email,
    );

    res.status(201).json({
      receipt,
      nextSequenceNo: xbmsStore.getTerminalConfig().nextSequenceNo,
    });
  };

  router.post('/receipts/', requireOperational, requireCsrf, handleFinalizeReceipt);
  router.post('/receipts/finalize/', requireOperational, requireCsrf, handleFinalizeReceipt);

  router.post(
    '/receipts/:id/cancel/',
    requireAdministrator,
    requireCsrf,
    (req: AuthenticatedRequest, res: Response) => {
      const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
      if (reason.length < 15) {
        res.status(400).json({
          error: 'Mandatory voiding justification must be at least 15 characters.',
        });
        return;
      }

      try {
        const receipt = xbmsStore.cancelReceipt(req.params.id, reason, req.authUser!.email);
        res.json({receipt});
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        if (msg === 'NOT_FOUND') {
          res.status(404).json({error: 'Receipt record not found.'});
          return;
        }
        if (msg === 'ALREADY_CANCELLED') {
          res.status(409).json({error: 'Receipt is already voided.'});
          return;
        }
        res.status(400).json({error: 'Unable to void receipt.'});
      }
    },
  );

  router.get(
    '/receipts/:id/pdf/',
    requireOperational,
    async (req: AuthenticatedRequest, res: Response) => {
      const receipt = xbmsStore.getReceiptById(req.params.id);
      if (!receipt) {
        res.status(404).json({error: 'Receipt not found.'});
        return;
      }
      try {
        const settings = xbmsStore.getSettings();
        const pdfBuffer = await generateReceiptPdfBuffer(receipt, settings);
        xbmsStore.logPdfDownload(receipt.receiptNo, req.authUser!.email);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${receipt.receiptNo}${receipt.status === 'CANCELLED' ? '-CANCELLED' : ''}.pdf"`,
        );
        res.send(pdfBuffer);
      } catch {
        res.status(500).json({error: 'Failed to render receipt PDF.'});
      }
    },
  );

  // Module 5: Settings & Audit Trail (STRICTLY ADMINISTRATOR)
  router.get('/settings/', requireAdministrator, (_req: AuthenticatedRequest, res: Response) => {
    res.json({settings: xbmsStore.getSettings()});
  });

  router.put(
    '/settings/',
    requireAdministrator,
    requireCsrf,
    (req: AuthenticatedRequest, res: Response) => {
      const updated = xbmsStore.updateSettings(req.body ?? {}, req.authUser!.email);
      res.json({settings: updated});
    },
  );

  router.get('/audit/', requireAdministrator, (_req: AuthenticatedRequest, res: Response) => {
    res.json({logs: xbmsStore.getAuditLogs()});
  });

  // Workflow C: Admin User Governance & Force Password Reset (STRICTLY ADMINISTRATOR)
  const handleListUsers = (_req: AuthenticatedRequest, res: Response) => {
    res.json({users: xbmsStore.listUsers()});
  };

  const handleProvisionUser = (req: AuthenticatedRequest, res: Response) => {
    const {
      name,
      email,
      title = '',
      role,
      temporary_password,
      force_change_on_next_login = true,
    } = req.body ?? {};

    if (typeof name !== 'string' || name.trim().length < 2) {
      res.status(400).json({error: 'Full name (min 2 characters) is required.'});
      return;
    }
    if (typeof email !== 'string') {
      res.status(400).json({error: 'Corporate email is required.'});
      return;
    }
    if (role !== 'ADMINISTRATOR' && role !== 'STAFF') {
      res.status(400).json({error: 'Role must be strictly ADMINISTRATOR or STAFF.'});
      return;
    }
    if (typeof temporary_password !== 'string') {
      res.status(400).json({error: 'Temporary password is required.'});
      return;
    }

    try {
      const user = xbmsStore.provisionUser(
        {
          name,
          email,
          title: String(title),
          role,
          temporaryPassword: temporary_password,
          forceChangeOnNextLogin: Boolean(force_change_on_next_login),
        },
        req.authUser!.email,
      );
      res.status(201).json({user});
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'INVALID_EMAIL') {
        res.status(400).json({error: 'Please enter a valid email address.'});
        return;
      }
      if (msg === 'DUPLICATE_EMAIL') {
        res.status(409).json({error: 'An XBMS account with this email already exists.'});
        return;
      }
      if (msg.startsWith('WEAK_PASSWORD:')) {
        res.status(400).json({error: msg.replace('WEAK_PASSWORD:', '')});
        return;
      }
      res.status(400).json({error: 'Unable to provision user account.'});
    }
  };

  const handleToggleUserStatus = (req: AuthenticatedRequest, res: Response) => {
    const status = req.body?.status;
    if (status !== 'ACTIVE' && status !== 'LOCKED') {
      res.status(400).json({error: 'Status must be ACTIVE or LOCKED.'});
      return;
    }
    try {
      const user = xbmsStore.setUserStatus(
        req.params.userId,
        status,
        req.authUser!.id,
        req.authUser!.email,
      );
      res.json({user});
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'USER_NOT_FOUND') {
        res.status(404).json({error: 'System user record not found.'});
        return;
      }
      if (msg === 'CANNOT_LOCK_SELF') {
        res.status(409).json({error: 'Administrators cannot lock their own active account.'});
        return;
      }
      if (msg === 'LAST_ACTIVE_ADMIN') {
        res.status(409).json({error: 'Cannot lock the last remaining active ADMINISTRATOR account.'});
        return;
      }
      res.status(400).json({error: 'Unable to update user account status.'});
    }
  };

  const handleAdminResetPassword = (req: AuthenticatedRequest, res: Response) => {
    const {temporary_password, force_change_on_next_login = true} = req.body ?? {};
    if (typeof temporary_password !== 'string') {
      res.status(400).json({error: 'A temporary password meeting complexity rules is required.'});
      return;
    }
    try {
      const user = xbmsStore.adminResetUserPassword(
        req.params.userId,
        {
          temporaryPassword: temporary_password,
          forceChangeOnNextLogin: Boolean(force_change_on_next_login),
        },
        req.authUser!.email,
        req.authUser!.id,
        extractBearerToken(req),
      );
      res.json({user});
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'USER_NOT_FOUND') {
        res.status(404).json({error: 'System user record not found.'});
        return;
      }
      if (msg.startsWith('WEAK_PASSWORD:')) {
        res.status(400).json({error: msg.replace('WEAK_PASSWORD:', '')});
        return;
      }
      res.status(400).json({error: 'Unable to force password reset.'});
    }
  };

  router.get('/admin/users/', requireAdministrator, handleListUsers);
  router.post('/admin/users/', requireAdministrator, requireCsrf, handleProvisionUser);
  router.patch('/admin/users/:userId/status/', requireAdministrator, requireCsrf, handleToggleUserStatus);
  router.post(
    '/admin/users/:userId/reset-password/',
    requireAdministrator,
    requireCsrf,
    handleAdminResetPassword,
  );

  // Clean aliases under /api/v1/users/* (strictly ADMINISTRATOR guarded)
  router.get('/users/', requireAdministrator, handleListUsers);
  router.post('/users/', requireAdministrator, requireCsrf, handleProvisionUser);
  router.patch('/users/:userId/status/', requireAdministrator, requireCsrf, handleToggleUserStatus);
  router.post(
    '/users/:userId/reset-password/',
    requireAdministrator,
    requireCsrf,
    handleAdminResetPassword,
  );

  // Admin Authorization Token & Pending Staff Onboarding Queue (STRICTLY ADMINISTRATOR)
  router.post(
    '/admin/users/authorization-tokens/',
    requireAdministrator,
    requireCsrf,
    (req: AuthenticatedRequest, res: Response) => {
      const type = req.body?.type;
      if (type !== 'INVITE' && type !== 'OVERRIDE') {
        res.status(400).json({error: 'Token type must be INVITE or OVERRIDE.'});
        return;
      }
      const issued = xbmsStore.issueStaffAuthorizationToken(type, req.authUser!.email);
      res.status(201).json(issued);
    },
  );

  router.get(
    '/admin/staff-requests/',
    requireAdministrator,
    (_req: AuthenticatedRequest, res: Response) => {
      res.json({requests: xbmsStore.listPendingStaffRequests()});
    },
  );

  router.post(
    '/admin/staff-requests/:requestId/review/',
    requireAdministrator,
    requireCsrf,
    (req: AuthenticatedRequest, res: Response) => {
      const decision = req.body?.decision;
      if (decision !== 'APPROVE' && decision !== 'REJECT') {
        res.status(400).json({error: 'Decision must be APPROVE or REJECT.'});
        return;
      }
      try {
        const result = xbmsStore.reviewStaffRequest(
          req.params.requestId,
          decision,
          req.authUser!.email,
        );
        res.json(result);
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        if (msg === 'REQUEST_NOT_FOUND') {
          res.status(404).json({error: 'Staff registration request not found.'});
          return;
        }
        if (msg === 'REQUEST_ALREADY_REVIEWED') {
          res.status(409).json({error: 'This registration request has already been processed.'});
          return;
        }
        if (msg === 'DUPLICATE_ACCOUNT') {
          res.status(409).json({error: 'A user with this email or Staff ID already exists.'});
          return;
        }
        res.status(400).json({error: 'Unable to review staff request.'});
      }
    },
  );

  return router;
}
