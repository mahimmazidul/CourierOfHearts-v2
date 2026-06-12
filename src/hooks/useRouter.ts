import { useState, useEffect, useCallback } from 'react';

export type Route =
  | { page: 'home' }
  | { page: 'compose' }
  | { page: 'preview'; slug: string }
  | { page: 'read'; slug: string }
  | { page: 'my-letters' }
  | { page: 'shared'; slug: string };

function parseRoute(hash: string): Route {
  const cleaned = hash.replace(/^#\/?/, '');
  if (!cleaned || cleaned === '/') return { page: 'home' };
  if (cleaned === 'compose') return { page: 'compose' };
  if (cleaned === 'my-letters') return { page: 'my-letters' };
  if (cleaned.startsWith('preview/')) return { page: 'preview', slug: cleaned.split('/')[1] };
  if (cleaned.startsWith('read/')) return { page: 'read', slug: cleaned.split('/')[1] };
  if (cleaned.startsWith('letter/')) return { page: 'shared', slug: cleaned.split('/')[1] };
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
