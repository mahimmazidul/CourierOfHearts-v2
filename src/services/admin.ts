import type { AdminLetterInfoResponse, AdminLettersResponse, AdminStatsResponse } from '@/types/admin';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3847/api/v1';
const ADMIN_KEY_STORAGE = 'courier_of_hearts_admin_key';

export function getStoredAdminKey(): string {
  try {
    return sessionStorage.getItem(ADMIN_KEY_STORAGE) || '';
  } catch {
    return '';
  }
}

export function storeAdminKey(value: string) {
  try {
    sessionStorage.setItem(ADMIN_KEY_STORAGE, value);
  } catch {
  }
}

export function clearStoredAdminKey() {
  try {
    sessionStorage.removeItem(ADMIN_KEY_STORAGE);
  } catch {
  }
}

async function adminRequest<T>(path: string, adminKey: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'X-Admin-Key': adminKey,
    },
  });
  const body = await response.json().catch(() => ({ success: false, error: 'Invalid server response' }));
  return body as T;
}

export function getAdminStats(adminKey: string): Promise<AdminStatsResponse> {
  return adminRequest<AdminStatsResponse>('/admin/stats', adminKey);
}

export function listAdminLetters(adminKey: string): Promise<AdminLettersResponse> {
  return adminRequest<AdminLettersResponse>('/admin/letters', adminKey);
}

export function getAdminLetterInfo(slug: string, adminKey: string): Promise<AdminLetterInfoResponse> {
  return adminRequest<AdminLetterInfoResponse>(`/admin/letters/${encodeURIComponent(slug)}`, adminKey);
}
