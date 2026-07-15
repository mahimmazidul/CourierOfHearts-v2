export type SealType = 'rose' | 'heart' | 'crown' | 'raven' | 'initials' | 'monogram';
export type SealColor = 'burgundy' | 'crimson' | 'emerald' | 'gold' | 'black';
export type CrestType = 'royal' | 'floral' | 'shield' | 'wreath' | 'wings' | 'none';
export type BorderStyle = 'none' | 'vine' | 'filigree' | 'royal';
export type FontChoice =
  | 'eb-garamond'
  | 'cormorant'
  | 'crimson'
  | 'medieval'
  | 'uncial'
  | 'almendra'
  | 'marck'
  | 'parisienne'
  | 'great-vibes'
  | 'satisfy'
  | 'dancing'
  | 'noto-serif-bengali'
  | 'hind-siliguri'
  | 'anek-bangla';
export type SignatureFont = FontChoice;

export interface FlowerPlacement {
  id: string;
  flowerId: string;
  x: number;
  y: number;
  size: number;
  rotation: number;
}

export interface ClientContext {
  browserId?: string;
  timezone?: string;
  language?: string;
  languages?: string[];
  platform?: string;
  userAgent?: string;
  screenWidth?: number;
  screenHeight?: number;
  viewportWidth?: number;
  viewportHeight?: number;
  pixelRatio?: number;
  colorScheme?: 'light' | 'dark' | 'no-preference';
  reducedMotion?: boolean;
  touchPoints?: number;
  hardwareConcurrency?: number;
  deviceMemory?: number;
  cookieEnabled?: boolean;
  localStorageAvailable?: boolean;
  sessionRef?: string;
}

export interface Letter {
  id: string;
  slug: string;
  salutation: string;
  recipient: string;
  content: string;
  closing: string;
  signature: string;
  sealType: SealType;
  sealColor: SealColor;
  crest: CrestType;
  borderStyle?: BorderStyle;
  customInitials: string;
  letterDate?: string;
  bodyFont: FontChoice;
  salutationFont?: FontChoice;
  recipientFont?: FontChoice;
  closingFont?: FontChoice;
  signatureFont: SignatureFont;
  flowers: FlowerPlacement[];
  isPrivate: boolean;
  requiresPassword?: boolean;
  views?: number;
  password?: string;
  expiresAt?: string;
  clientContext?: ClientContext;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLetterPayload {
  salutation: string;
  recipient: string;
  content: string;
  closing: string;
  signature: string;
  sealType: SealType;
  sealColor: SealColor;
  crest: CrestType;
  borderStyle?: BorderStyle;
  customInitials: string;
  letterDate?: string;
  bodyFont: FontChoice;
  salutationFont?: FontChoice;
  recipientFont?: FontChoice;
  closingFont?: FontChoice;
  signatureFont: SignatureFont;
  flowers: FlowerPlacement[];
  isPrivate: boolean;
  password?: string;
  expiresAt?: string;
  clientContext?: ClientContext;
}

export interface UpdateLetterPayload extends Partial<CreateLetterPayload> {}

export interface LetterResponse {
  success: boolean;
  data?: Letter;
  error?: string;
}

export interface LettersListResponse {
  success: boolean;
  data?: Letter[];
  error?: string;
}
