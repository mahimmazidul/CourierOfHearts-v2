import { nanoid } from 'nanoid';
import type {
  Letter,
  CreateLetterPayload,
  UpdateLetterPayload,
  LetterResponse,
  LettersListResponse,
} from '@/types/letter';
import { collectClientContext } from '@/utils/clientContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3847/api/v1';
const TOKEN_STORAGE_KEY = 'courier_of_hearts_management_tokens';
const LOCAL_LETTERS_STORAGE_KEY = 'courier_of_hearts_local_letters_v2';

const LOCAL_TOKEN_PREFIX = 'local_';

type TokenStore = Record<string, string>;
type ApiLetterResponse = LetterResponse & { token?: string };

type LocalStoredLetter = Letter & {
  managementToken: string;
  localOnly: true;
  requiresPassword?: boolean;
  passwordPlain?: string;
};

function getTokenStore(): TokenStore {
  try {
    const raw = localStorage.getItem(TOKEN_STORAGE_KEY);
    return raw ? JSON.parse(raw) as TokenStore : {};
  } catch {
    return {};
  }
}

function saveTokenStore(tokens: TokenStore): void {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
  } catch {
  }
}

function rememberToken(slug: string, token?: string): void {
  if (!token) return;
  const tokens = getTokenStore();
  tokens[slug] = token;
  saveTokenStore(tokens);
}

function forgetToken(slug: string): void {
  const tokens = getTokenStore();
  delete tokens[slug];
  saveTokenStore(tokens);
}

function getToken(slug: string): string | undefined {
  return getTokenStore()[slug];
}

function isLocalToken(token?: string): boolean {
  return Boolean(token?.startsWith(LOCAL_TOKEN_PREFIX));
}

function getLocalLetters(): LocalStoredLetter[] {
  try {
    const raw = localStorage.getItem(LOCAL_LETTERS_STORAGE_KEY);
    const letters = raw ? JSON.parse(raw) as LocalStoredLetter[] : [];
    return Array.isArray(letters) ? letters : [];
  } catch {
    return [];
  }
}

function saveLocalLetters(letters: LocalStoredLetter[]) {
  try {
    localStorage.setItem(LOCAL_LETTERS_STORAGE_KEY, JSON.stringify(letters));
  } catch {
  }
}

function sanitizeLocalLetter(letter: LocalStoredLetter, unlocked = false): Letter {
  if (!letter.isPrivate || unlocked) {
    const { managementToken: _managementToken, passwordPlain: _passwordPlain, localOnly: _localOnly, ...safe } = letter;
    return { ...safe, requiresPassword: false };
  }

  return {
    id: letter.id,
    slug: letter.slug,
    recipient: letter.recipient,
    sealType: letter.sealType,
    sealColor: letter.sealColor,
    crest: letter.crest,
    borderStyle: letter.borderStyle,
    customInitials: letter.customInitials,
    letterDate: letter.letterDate,
    bodyFont: letter.bodyFont,
    salutationFont: letter.salutationFont,
    recipientFont: letter.recipientFont,
    closingFont: letter.closingFont,
    signatureFont: letter.signatureFont,
    isPrivate: true,
    requiresPassword: true,
    views: letter.views,
    expiresAt: letter.expiresAt,
    createdAt: letter.createdAt,
    updatedAt: letter.updatedAt,
    salutation: '',
    content: '',
    closing: '',
    signature: '',
    flowers: [],
  };
}

function createLocalLetter(payload: CreateLetterPayload): LetterResponse {
  const now = new Date().toISOString();
  const slug = nanoid(10);
  const managementToken = `${LOCAL_TOKEN_PREFIX}${nanoid(24)}`;
  const letter: LocalStoredLetter = {
    id: nanoid(),
    slug,
    salutation: payload.salutation ?? 'My dearest',
    recipient: payload.recipient.trim(),
    content: payload.content.trim(),
    closing: payload.closing ?? 'Forever yours,',
    signature: payload.signature || 'With love',
    sealType: payload.sealType,
    sealColor: payload.sealColor,
    crest: payload.crest || 'none',
    borderStyle: payload.borderStyle || 'none',
    customInitials: payload.customInitials || '',
    letterDate: payload.letterDate || '',
    bodyFont: payload.bodyFont || 'eb-garamond',
    salutationFont: payload.salutationFont || payload.bodyFont || 'eb-garamond',
    recipientFont: payload.recipientFont || payload.bodyFont || 'eb-garamond',
    closingFont: payload.closingFont || payload.bodyFont || 'eb-garamond',
    signatureFont: payload.signatureFont || 'great-vibes',
    flowers: payload.flowers || [],
    isPrivate: Boolean(payload.isPrivate),
    requiresPassword: false,
    views: 0,
    expiresAt: payload.expiresAt,
    createdAt: now,
    updatedAt: now,
    managementToken,
    localOnly: true,
    passwordPlain: payload.isPrivate ? payload.password || '' : undefined,
  };

  const letters = getLocalLetters();
  letters.push(letter);
  saveLocalLetters(letters);
  rememberToken(slug, managementToken);
  return { success: true, data: sanitizeLocalLetter(letter, true) };
}

function getLocalLetter(slug: string, unlocked = false): LetterResponse {
  const letter = getLocalLetters().find((item) => item.slug === slug);
  if (!letter) return { success: false, error: 'Letter not found' };
  return { success: true, data: sanitizeLocalLetter(letter, unlocked) };
}

function updateLocalLetter(slug: string, payload: UpdateLetterPayload): LetterResponse {
  const token = getToken(slug);
  if (!isLocalToken(token)) return { success: false, error: 'Unauthorized' };
  const letters = getLocalLetters();
  const index = letters.findIndex((item) => item.slug === slug && item.managementToken === token);
  if (index === -1) return { success: false, error: 'Letter not found' };

  const current = letters[index];
  const next: LocalStoredLetter = {
    ...current,
    ...payload,
    borderStyle: payload.borderStyle ?? current.borderStyle,
    letterDate: payload.letterDate ?? current.letterDate,
    updatedAt: new Date().toISOString(),
    passwordPlain: payload.isPrivate === false ? undefined : (payload.password ?? current.passwordPlain),
  };
  letters[index] = next;
  saveLocalLetters(letters);
  return { success: true, data: sanitizeLocalLetter(next, true) };
}

function deleteLocalLetter(slug: string): LetterResponse {
  const token = getToken(slug);
  if (!isLocalToken(token)) return { success: false, error: 'Unauthorized' };
  const letters = getLocalLetters();
  const next = letters.filter((item) => !(item.slug === slug && item.managementToken === token));
  if (next.length === letters.length) return { success: false, error: 'Letter not found' };
  saveLocalLetters(next);
  forgetToken(slug);
  return { success: true, data: { slug } as unknown as Letter };
}

function listLocalLettersByTokens(): Letter[] {
  const tokens = getTokenStore();
  return getLocalLetters()
    .filter((letter) => tokens[letter.slug] === letter.managementToken)
    .map((letter) => sanitizeLocalLetter(letter, true));
}

function unlockLocalLetter(slug: string, password: string): LetterResponse {
  const letter = getLocalLetters().find((item) => item.slug === slug);
  if (!letter) return { success: false, error: 'Letter not found' };
  if (!letter.isPrivate || (letter.passwordPlain || '') === password) {
    return { success: true, data: sanitizeLocalLetter(letter, true) };
  }
  return { success: false, error: 'Incorrect passphrase' };
}

function recordLocalLetterView(slug: string): { success: boolean; views?: number; error?: string } {
  const letters = getLocalLetters();
  const index = letters.findIndex((item) => item.slug === slug);
  if (index === -1) return { success: false, error: 'Letter not found' };
  letters[index] = { ...letters[index], views: (letters[index].views || 0) + 1 };
  saveLocalLetters(letters);
  return { success: true, views: letters[index].views };
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T | null> {
  try {
    const headers = new Headers(options.headers);
    if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

    const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
    const contentType = response.headers.get('content-type') || '';
    const body = contentType.includes('application/json')
      ? await response.json().catch(() => null)
      : null;

    if (!response.ok && !body) return null;
    if (!body) return null;
    return body as T;
  } catch {
    return null;
  }
}

export async function createLetter(payload: CreateLetterPayload): Promise<LetterResponse> {
  const result = await request<ApiLetterResponse>('/letters', {
    method: 'POST',
    body: JSON.stringify({ ...payload, clientContext: collectClientContext() }),
  });

  if (!result) return createLocalLetter(payload);
  if (result.success && result.data) rememberToken(result.data.slug, result.token);
  return { success: result.success, data: result.data, error: result.error };
}

export async function getLetter(slug: string): Promise<LetterResponse> {
  const result = await request<LetterResponse>(`/letters/${encodeURIComponent(slug)}`);
  return result || getLocalLetter(slug);
}

export async function updateLetter(slug: string, payload: UpdateLetterPayload): Promise<LetterResponse> {
  const token = getToken(slug);
  if (isLocalToken(token)) return updateLocalLetter(slug, payload);

  const result = await request<LetterResponse>(`/letters/${encodeURIComponent(slug)}`, {
    method: 'PUT',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: JSON.stringify(payload),
  });

  return result || updateLocalLetter(slug, payload);
}

export async function deleteLetter(slug: string): Promise<LetterResponse> {
  const token = getToken(slug);
  if (isLocalToken(token)) return deleteLocalLetter(slug);

  const result = await request<LetterResponse>(`/letters/${encodeURIComponent(slug)}`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!result) return deleteLocalLetter(slug);
  if (result.success) forgetToken(slug);
  return result;
}

export async function listLetters(): Promise<LettersListResponse> {
  const slugs = Object.keys(getTokenStore());
  const localLetters = listLocalLettersByTokens();
  const remoteSlugs = slugs.filter((slug) => !isLocalToken(getToken(slug)));

  if (remoteSlugs.length === 0) return { success: true, data: localLetters };

  const result = await request<LettersListResponse>(`/letters?slugs=${encodeURIComponent(remoteSlugs.join(','))}`);
  if (!result) return { success: true, data: localLetters };

  if (result.success && result.data) {
    const liveSlugs = new Set(result.data.map((letter: Letter) => letter.slug));
    const tokens = getTokenStore();
    let changed = false;
    for (const slug of Object.keys(tokens)) {
      if (!isLocalToken(tokens[slug]) && !liveSlugs.has(slug)) {
        delete tokens[slug];
        changed = true;
      }
    }
    if (changed) saveTokenStore(tokens);
    return { success: true, data: [...localLetters, ...result.data] };
  }

  return { success: true, data: localLetters, error: result.error };
}

export async function unlockLetter(slug: string, password: string): Promise<LetterResponse> {
  const result = await request<LetterResponse>(`/letters/${encodeURIComponent(slug)}/unlock`, {
    method: 'POST',
    body: JSON.stringify({ password, clientContext: collectClientContext() }),
  });

  return result || unlockLocalLetter(slug, password);
}

export async function recordLetterView(slug: string): Promise<{ success: boolean; views?: number; error?: string }> {
  const result = await request<{ success: boolean; views?: number; error?: string }>(`/letters/${encodeURIComponent(slug)}/view`, {
    method: 'POST',
    body: JSON.stringify({ clientContext: collectClientContext() }),
  });

  return result || recordLocalLetterView(slug);
}
