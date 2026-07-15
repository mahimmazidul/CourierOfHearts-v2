import type { Letter } from '@/types/letter';

export interface LetterEvent {
  id: string;
  eventType: 'create' | 'view' | 'unlock';
  createdAt: string;
  ipHash: string;
  userAgent?: string;
  acceptLanguage?: string;
  doNotTrack?: string;
  referer?: string;
  clientContext?: Record<string, unknown>;
}

export interface AdminStats {
  app: {
    version: string;
    environment: string;
    uptimeSeconds: number;
    nodeVersion: string;
    pid: number;
    host: string;
    port: number;
    adminEnabled: boolean;
  };
  letters: {
    total: number;
    public: number;
    private: number;
    createdToday: number;
    createdLast7Days: number;
    expiringSoon: number;
    totalViews: number;
    averageFlowers: number;
    averageContentLength: number;
  };
  storage: {
    dbFile: string;
    dbSizeBytes: number;
    cacheDir: string;
    cacheFiles: number;
    cacheSizeBytes: number;
  };
  system: {
    platform: string;
    arch: string;
    hostname: string;
    cpus: number;
    loadAverage: number[];
    totalMemBytes: number;
    freeMemBytes: number;
  };
  recentLetters: Array<{
    id: string;
    slug: string;
    recipient: string;
    isPrivate: boolean;
    createdAt: string;
    views: number;
  }>;
  topViewedLetters: Array<{
    id: string;
    slug: string;
    recipient: string;
    views: number;
  }>;
}

export interface AdminLetterInfo {
  letter: Letter;
  events: LetterEvent[];
}

export interface AdminLettersResponse {
  success: boolean;
  data?: Letter[];
  error?: string;
}

export interface AdminStatsResponse {
  success: boolean;
  data?: AdminStats;
  error?: string;
}

export interface AdminLetterInfoResponse {
  success: boolean;
  data?: AdminLetterInfo;
  error?: string;
}
