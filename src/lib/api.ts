import axios from 'axios';
import type {ReceiptRecord} from '@/src/types/xbms';
import {formatBHD} from '@/src/types/xbms';

let memoryAuthToken: string | null = null;
let memoryCsrfToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function setAuthToken(token: string | null): void {
  memoryAuthToken = token;
}

export function getAuthToken(): string | null {
  return memoryAuthToken;
}

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export const apiClient = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  xsrfCookieName: 'csrftoken',
  xsrfHeaderName: 'X-CSRFToken',
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function refreshCsrfToken(): Promise<string> {
  const {data} = await axios.get<{csrfToken: string}>('/api/v1/csrf/', {
    withCredentials: true,
  });
  memoryCsrfToken = data.csrfToken;
  return data.csrfToken;
}

export async function ensureCsrfToken(): Promise<string> {
  const cookieToken = readCookie('csrftoken');
  if (cookieToken) {
    memoryCsrfToken = cookieToken;
    return cookieToken;
  }
  if (memoryCsrfToken) {
    return memoryCsrfToken;
  }
  return refreshCsrfToken();
}

apiClient.interceptors.request.use(async (config) => {
  if (memoryAuthToken) {
    config.headers.Authorization = `Bearer ${memoryAuthToken}`;
  }

  const method = (config.method || 'get').toLowerCase();
  if (['post', 'put', 'patch', 'delete'].includes(method)) {
    const cookieToken = readCookie('csrftoken');
    const csrf = cookieToken || memoryCsrfToken || (await refreshCsrfToken());
    if (csrf) {
      config.headers['X-CSRFToken'] = csrf;
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error?.config as (typeof error.config & {_csrfRetried?: boolean}) | undefined;
    const status = error?.response?.status as number | undefined;
    const errMsg = String((error?.response?.data as {error?: string} | undefined)?.error || '');

    if (
      status === 403 &&
      config &&
      !config._csrfRetried &&
      errMsg.toLowerCase().includes('csrf')
    ) {
      config._csrfRetried = true;
      const freshToken = await refreshCsrfToken();
      config.headers = config.headers || {};
      config.headers['X-CSRFToken'] = freshToken;
      return apiClient.request(config);
    }

    const requestUrl = String(config?.url || '');
    const isCredentialChallenge =
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/staff/login') ||
      requestUrl.includes('/auth/signin') ||
      requestUrl.includes('/auth/change-password');

    if (status === 401 && memoryAuthToken && !isCredentialChallenge) {
      memoryAuthToken = null;
      unauthorizedHandler?.();
    }

    return Promise.reject(error);
  },
);

export async function downloadReceiptPdf(receipt: ReceiptRecord): Promise<void> {
  const response = await apiClient.get<Blob>(`/receipts/${receipt.id}/pdf/`, {
    responseType: 'blob',
  });
  const blobUrl = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = `${receipt.receiptNo}${receipt.status === 'CANCELLED' ? '-CANCELLED' : ''}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
}

export function buildReceiptWhatsAppUrl(receipt: ReceiptRecord): string {
  const digits = receipt.clientPhone.replace(/\D/g, '');
  const targetPhone = digits.length >= 8 ? digits : '97333578768';
  const statusLabel =
    receipt.status === 'CANCELLED'
      ? 'CANCELLED / VOIDED'
      : receipt.status === 'PAID'
        ? 'Paid in Full'
        : receipt.status === 'PARTIAL'
          ? 'Partially Paid'
          : 'Unpaid';

  const message = [
    `*XeroTech Technologies (CR 201130-1)*`,
    `Official Payment Receipt: *${receipt.receiptNo}*`,
    `Date: ${receipt.dateDisplay}`,
    `Client: ${receipt.clientName}`,
    `Service: ${receipt.serviceName}`,
    `Total Project Value: ${formatBHD(receipt.totalBHD)}`,
    `Amount Received: ${formatBHD(receipt.paidBHD)}`,
    `Remaining Balance: ${formatBHD(receipt.balanceBHD)}`,
    `Status: ${statusLabel}`,
  ].join('\n');

  return `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`;
}

export function buildTerminalDispatchWhatsAppUrl(receipt: ReceiptRecord): string {
  const statusLabel =
    receipt.status === 'PAID'
      ? 'PAID'
      : receipt.status === 'PARTIAL'
        ? 'PARTIALLY PAID'
        : receipt.status === 'CANCELLED'
          ? 'CANCELLED'
          : 'UNPAID';

  const lines = [
    `*XeroTech Technologies (CR 201130-1) — Counter Dispatch*`,
    `Receipt No.: *${receipt.receiptNo}*`,
    `Date: ${receipt.dateDisplay}`,
    `Client: ${receipt.clientName} (${receipt.clientPhone})`,
    `Service: ${receipt.serviceName}`,
    `Total Project Cost: ${formatBHD(receipt.totalBHD)}`,
    `Advance Received: ${formatBHD(receipt.paidBHD)}`,
    `Remaining Balance: ${formatBHD(receipt.balanceBHD)}`,
    `Channel: ${receipt.paymentMethod} | Status: ${statusLabel}`,
    `Issued By: ${receipt.issuedBy}`,
  ];

  return `https://wa.me/97333578768?text=${encodeURIComponent(lines.join('\n'))}`;
}
