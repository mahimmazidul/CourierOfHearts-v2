import { useEffect } from 'react';

interface PageMetaOptions {
  title: string;
  description?: string;
  robots?: string;
}

const DEFAULT_DESCRIPTION = 'Write a beautiful digital letter on parchment, seal it with wax, and let it arrive with a quiet little ceremony.';

function ensureMeta(selector: string, attrs: Record<string, string>) {
  let meta = document.head.querySelector<HTMLMetaElement>(selector);
  if (!meta) {
    meta = document.createElement('meta');
    Object.entries(attrs).forEach(([key, value]) => meta!.setAttribute(key, value));
    document.head.appendChild(meta);
  }
  return meta;
}

function ensureCanonical() {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  return link;
}

export function usePageMeta({ title, description = DEFAULT_DESCRIPTION, robots = 'index,follow' }: PageMetaOptions) {
  useEffect(() => {
    document.title = title;

    ensureMeta('meta[name="description"]', { name: 'description' }).setAttribute('content', description);
    ensureMeta('meta[property="og:title"]', { property: 'og:title' }).setAttribute('content', title);
    ensureMeta('meta[property="og:description"]', { property: 'og:description' }).setAttribute('content', description);
    ensureMeta('meta[property="og:type"]', { property: 'og:type' }).setAttribute('content', 'website');
    ensureMeta('meta[name="twitter:card"]', { name: 'twitter:card' }).setAttribute('content', 'summary_large_image');
    ensureMeta('meta[name="twitter:title"]', { name: 'twitter:title' }).setAttribute('content', title);
    ensureMeta('meta[name="twitter:description"]', { name: 'twitter:description' }).setAttribute('content', description);
    ensureMeta('meta[name="robots"]', { name: 'robots' }).setAttribute('content', robots);

    const canonical = ensureCanonical();
    canonical.href = window.location.href;
  }, [description, robots, title]);
}
