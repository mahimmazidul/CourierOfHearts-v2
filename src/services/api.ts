import { nanoid } from 'nanoid';
import type {
  Letter,
  CreateLetterPayload,
  UpdateLetterPayload,
  LetterResponse,
  LettersListResponse,
} from '@/types/letter';

const STORAGE_KEY = 'courier_of_hearts_letters';

function generateSlug(): string {
  return nanoid(10);
}

function getAllLetters(): Letter[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Letter[];
  } catch {
    return [];
  }
}

function saveAllLetters(letters: Letter[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(letters));
}

function delay(ms = 80): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function createLetter(payload: CreateLetterPayload): Promise<LetterResponse> {
  await delay();
  const now = new Date().toISOString();
  const letter: Letter = {
    id: nanoid(),
    slug: generateSlug(),
    salutation: payload.salutation || 'My dearest',
    recipient: payload.recipient,
    content: payload.content,
    closing: payload.closing || 'Forever yours,',
    signature: payload.signature,
    sealType: payload.sealType,
    sealColor: payload.sealColor,
    crest: payload.crest,
    customInitials: payload.customInitials || '',
    bodyFont: payload.bodyFont || 'eb-garamond',
    signatureFont: payload.signatureFont || 'great-vibes',
    flowers: payload.flowers || [],
    isPrivate: payload.isPrivate,
    password: payload.password,
    expiresAt: payload.expiresAt,
    createdAt: now,
    updatedAt: now,
  };
  const letters = getAllLetters();
  letters.push(letter);
  saveAllLetters(letters);
  return { success: true, data: letter };
}

export async function getLetter(slug: string): Promise<LetterResponse> {
  await delay();
  const letters = getAllLetters();
  const letter = letters.find((l) => l.slug === slug);
  if (!letter) return { success: false, error: 'Letter not found' };
  if (letter.expiresAt && new Date(letter.expiresAt) < new Date())
    return { success: false, error: 'This letter has faded with time' };
  return { success: true, data: letter };
}

export async function updateLetter(slug: string, payload: UpdateLetterPayload): Promise<LetterResponse> {
  await delay();
  const letters = getAllLetters();
  const index = letters.findIndex((l) => l.slug === slug);
  if (index === -1) return { success: false, error: 'Letter not found' };
  letters[index] = { ...letters[index], ...payload, updatedAt: new Date().toISOString() };
  saveAllLetters(letters);
  return { success: true, data: letters[index] };
}

export async function deleteLetter(slug: string): Promise<LetterResponse> {
  await delay();
  const letters = getAllLetters();
  const index = letters.findIndex((l) => l.slug === slug);
  if (index === -1) return { success: false, error: 'Letter not found' };
  const deleted = letters.splice(index, 1)[0];
  saveAllLetters(letters);
  return { success: true, data: deleted };
}

export async function listLetters(): Promise<LettersListResponse> {
  await delay();
  return { success: true, data: getAllLetters() };
}

export async function unlockLetter(slug: string, password: string): Promise<LetterResponse> {
  await delay();
  const letters = getAllLetters();
  const letter = letters.find((l) => l.slug === slug);
  if (!letter) return { success: false, error: 'Letter not found' };
  if (letter.password && letter.password !== password)
    return { success: false, error: 'Incorrect passphrase' };
  return { success: true, data: letter };
}
