const adminRoute = String(import.meta.env.VITE_ADMIN_ROUTE || 'sudo').replace(/^\/+|\/+$/g, '') || 'sudo';

export const FEATURE_FLAGS = {
  enableAdminPanel: import.meta.env.VITE_ENABLE_ADMIN_PANEL === 'true',
  adminRoute,
} as const;
