import { useEffect, useState } from 'react';

export function useFontsReady() {
  const [ready, setReady] = useState(() => {
    if (typeof document === 'undefined' || !('fonts' in document)) return true;
    return false;
  });

  useEffect(() => {
    if (typeof document === 'undefined' || !('fonts' in document)) return;
    let cancelled = false;

    const finish = () => {
      window.setTimeout(() => {
        if (!cancelled) setReady(true);
      }, 220);
    };

    const waitForFonts = () => {
      Promise.allSettled([
        document.fonts.ready,
        document.fonts.load(`16px "EB Garamond"`),
        document.fonts.load(`16px "Cormorant Garamond"`),
        document.fonts.load(`16px "Noto Serif Bengali"`),
      ]).then(finish);
    };

    if (document.readyState === 'complete') waitForFonts();
    else window.addEventListener('load', waitForFonts, { once: true });

    return () => {
      cancelled = true;
      window.removeEventListener('load', waitForFonts);
    };
  }, []);

  return ready;
}
