import { useState, useEffect, useCallback } from 'react';
import { FEATURE_FLAGS } from '@/config/features';

export type Route =
  | { page: 'home' }
  | { page: 'compose' }
  | { page: 'preview'; slug: string }
  | { page: 'read'; slug: string }
  | { page: 'my-letters' }
  | { page: 'shared'; slug: string }
  | { page: 'admin' }
  | { page: 'privacy' }
  | { page: 'cookies' }
  | { page: 'thanks' }
  | { page: 'letter-info'; slug: string };

function parseRoute(hash: string): Route {
  const cleaned = hash.replace(/^#\/?/, '');
  const parts = cleaned.split('/').filter(Boolean);

  if (!cleaned || cleaned === '/') return { page: 'home' };
  if (cleaned === 'compose') return { page: 'compose' };
  if (cleaned === 'my-letters') return { page: 'my-letters' };
  if (cleaned === 'privacy') return { page: 'privacy' };
  if (cleaned === 'cookies') return { page: 'cookies' };
  if (cleaned === 'thanks') return { page: 'thanks' };
  if (cleaned === FEATURE_FLAGS.adminRoute) return { page: 'admin' };
  if (cleaned.startsWith('preview/')) return { page: 'preview', slug: cleaned.split('/')[1] };
  if (cleaned.startsWith('read/')) return { page: 'read', slug: cleaned.split('/')[1] };
  if (cleaned.startsWith('letter/')) {
    if (parts.length >= 3 && parts[2] === 'info') return { page: 'letter-info', slug: parts[1] };
    return { page: 'shared', slug: cleaned.split('/')[1] };
  }
  return { page: 'home' };
}

export function useRouter() {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash));

  useEffect(() => {
    const handler = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  const navigate = useCallback((path: string) => {
    window.location.hash = path;
  }, []);

  return { route, navigate };
}
