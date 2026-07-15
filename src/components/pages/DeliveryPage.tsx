import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Letter } from '@/types/letter';
import { getLetter, recordLetterView, unlockLetter } from '@/services/api';
import WaxSealIcon from '@/components/icons/WaxSealIcon';
import DustParticles from '@/components/effects/DustParticles';
import CandleGlow from '@/components/effects/CandleGlow';
import { HeartSigilIcon, OrnamentDivider, CornerOrnament } from '@/components/icons/SvgIcons';
import CrestDecoration from '@/components/letter/CrestDecoration';
import { ALL_FLOWERS } from '@/components/icons/FlowerSvgs';
import { getFontFamilyByChoice, getSigFontFamilyByChoice } from '@/components/pages/ComposePage';
import {
  decorateLetterHtml,
  escapeLetterHtml,
  hasRichLetterHtml,
  plainTextToLetterHtml,
  richHtmlTextLength,
  sanitizeLetterHtml,
  sliceRichLetterHtml,
  splitPlainTextIntoPages,
  splitRichLetterHtmlIntoPages,
} from '@/utils/sanitizeHtml';
import { LETTER_UI } from '@/config/ui';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useFontsReady } from '@/hooks/useFontsReady';

type Step = 'loading' | 'error' | 'password' | 'arriving' | 'envelope' | 'cracking' | 'opening' | 'rising' | 'reading';

function isLightFlower(color: string) {
  return ['#d8cfbf', '#dcd6ca', '#e8e1d4', '#ddd6c8', '#e2dbcf'].includes(color.toLowerCase());
}

function AnimatedLetterHtml({ html, fontFamily, onDone }: { html: string; fontFamily: string; onDone: () => void }) {
  const safeHtml = useMemo(() => sanitizeLetterHtml(html), [html]);
  const totalChars = useMemo(() => richHtmlTextLength(safeHtml), [safeHtml]);
  const [chars, setChars] = useState(0);
  const raf = useRef(0);
  const last = useRef(0);
  const elapsedRef = useRef(0);
  const count = useRef(0);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    count.current = 0;
    last.current = 0;
    elapsedRef.current = 0;
    setChars(0);

    const baseMs = Math.max(LETTER_UI.typewriterMinMs, Math.min(LETTER_UI.typewriterMaxMs, 2600 / Math.max(totalChars, 1)));
    const tick = (ts: number) => {
      if (!last.current) last.current = ts;
      const delta = ts - last.current;
      elapsedRef.current += delta;
      const msPerChar = elapsedRef.current > LETTER_UI.typewriterBoostAfterMs ? baseMs * LETTER_UI.typewriterBoostFactor : baseMs;
      if (delta >= msPerChar) {
        count.current = Math.min(count.current + Math.floor(delta / msPerChar), totalChars);
        setChars(count.current);
        last.current = ts;
      }
      if (count.current < totalChars) raf.current = requestAnimationFrame(tick);
      else done.current();
    };

    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [safeHtml, totalChars]);

  const partialHtml = useMemo(() => decorateLetterHtml(sliceRichLetterHtml(safeHtml, chars)), [safeHtml, chars]);

  return (
    <span className="rich-letter-content letter-flow ink-engraved" style={{ fontFamily, fontSize: 'inherit', lineHeight: 'inherit', letterSpacing: '0.01em', wordSpacing: '0.04em' }}>
      <span dangerouslySetInnerHTML={{ __html: partialHtml }} />
    </span>
  );
}

function ReadingView({ letter, onBack }: { letter: Letter; onBack: () => void }) {
  const fontsReady = useFontsReady();
  const isRichContent = hasRichLetterHtml(letter.content);
  const [typingDone, setTypingDone] = useState(false);
  const [activePage, setActivePage] = useState(0);
  const [showAllPages, setShowAllPages] = useState(false);
  const donePagesRef = useRef<Set<number>>(new Set());
  const safeContent = useMemo(() => sanitizeLetterHtml(letter.content), [letter.content]);
  const pages = useMemo(() => isRichContent ? splitRichLetterHtmlIntoPages(safeContent) : splitPlainTextIntoPages(letter.content), [letter.content, isRichContent, safeContent]);
  const normalizedPages = useMemo(() => pages.map((page) => isRichContent ? page : plainTextToLetterHtml(page)), [isRichContent, pages]);
  const total = normalizedPages.length;
  const sal = letter.salutation || '';
  const cls = letter.closing || '';
  const pageRefs = useRef<Array<HTMLElement | null>>([]);
  const contentRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    setTypingDone(false);
    setActivePage(0);
    setShowAllPages(false);
    donePagesRef.current.clear();
  }, [letter.content]);

  useEffect(() => {
    const beforePrint = () => setShowAllPages(true);
    const afterPrint = () => setShowAllPages(false);
    const media = window.matchMedia('print');
    const mediaHandler = (event: MediaQueryListEvent) => setShowAllPages(event.matches);
    window.addEventListener('beforeprint', beforePrint);
    window.addEventListener('afterprint', afterPrint);
    media.addEventListener?.('change', mediaHandler);
    return () => {
      window.removeEventListener('beforeprint', beforePrint);
      window.removeEventListener('afterprint', afterPrint);
      media.removeEventListener?.('change', mediaHandler);
    };
  }, []);

  useEffect(() => {
    pageRefs.current[activePage]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [activePage]);

  useEffect(() => {
    if (typingDone) return;
    const interval = window.setInterval(() => {
      const target = contentRefs.current[activePage];
      if (!target) return;
      const rect = target.getBoundingClientRect();
      if (rect.bottom > window.innerHeight - 120) window.scrollBy({ top: 36, behavior: 'smooth' });
    }, 220);
    return () => window.clearInterval(interval);
  }, [activePage, typingDone]);

  const firstPageHtml = useMemo(() => {
    const salutationHtml = (sal || letter.recipient)
      ? `<p><em>${sal ? `<span style="font-family: ${getFontFamilyByChoice(letter.salutationFont || letter.bodyFont)};">${escapeLetterHtml(sal)}</span>` : ''}${sal && letter.recipient ? ' ' : ''}${letter.recipient ? `<span style="font-family: ${getFontFamilyByChoice(letter.recipientFont || letter.bodyFont)};">${escapeLetterHtml(letter.recipient)}</span>` : ''}${letter.recipient ? ',' : ''}</em></p><br>`
      : '';
    return `${salutationHtml}${normalizedPages[0] || ''}`;
  }, [letter.bodyFont, letter.recipient, letter.recipientFont, letter.salutationFont, normalizedPages, sal]);

  const handlePrint = useCallback(() => {
    setShowAllPages(true);
    window.setTimeout(() => window.print(), 120);
  }, []);

  usePageMeta({
    title: `${letter.recipient ? `A Letter for ${letter.recipient}` : 'A Letter'} — Courier of Hearts`,
    description: 'Open a parchment letter and let it unfold with wax, paper, and a small ceremonial reveal.',
  });

  if (!fontsReady) {
    return (
      <div className="min-h-screen parchment-bg flex items-center justify-center px-6">
        <div className="text-center">
          <HeartSigilIcon size={32} color="#8b7340" className="mx-auto mb-4 opacity-50" />
          <p className="font-body italic text-ink/45">Preparing the parchment…</p>
        </div>
      </div>
    );
  }

  const visiblePageCount = typingDone || showAllPages ? total : Math.min(activePage + 1, total);
  const visiblePages = normalizedPages.slice(0, visiblePageCount);

  return (
    <div className="min-h-screen parchment-bg fade-slide-up">
      <nav className="no-print flex items-center justify-between px-4 py-3 md:px-8 relative z-20" style={{ borderBottom: '1px solid rgba(139,115,64,0.12)' }}>
        <button onClick={onBack} className="font-heading text-[11px] tracking-[0.12em] text-ink/70 uppercase hover:text-ink transition-colors duration-500">&larr; Home</button>
        <span className="font-heading text-[10px] tracking-[0.25em] text-ink/40 uppercase">A letter for {letter.recipient}</span>
        <button onClick={handlePrint} className="font-heading text-[11px] tracking-[0.12em] text-ink/70 uppercase hover:text-ink transition-colors duration-500">Print</button>
      </nav>
      <div className="max-w-3xl mx-auto px-4 py-8 md:py-12 relative z-10">
        {visiblePages.map((pageHtml, pi) => {
          const isPastPage = pi < activePage;
          const isCurrentPage = pi === activePage;
          const animatedHtml = pi === 0 ? firstPageHtml : pageHtml;
          const shouldShowClosing = pi === total - 1 && typingDone;

          return (
          <article key={pi} ref={(node) => { pageRefs.current[pi] = node; }} className="print-letter relative letter-paper rounded-sm mb-8 last:mb-0"
            style={{ padding: 'clamp(28px, 6vw, 56px)', minHeight: '500px', pageBreakAfter: pi < total - 1 ? 'always' : 'auto' }}>
            <div className="print-border hidden absolute inset-5 md:inset-7 pointer-events-none rounded-sm" />
            <div className="absolute top-0 left-0 pointer-events-none z-10"><CornerOrnament position="top-left" color="#8b7340" /></div>
            <div className="absolute top-0 right-0 pointer-events-none z-10"><CornerOrnament position="top-right" color="#8b7340" /></div>
            <div className="absolute bottom-0 left-0 pointer-events-none z-10"><CornerOrnament position="bottom-left" color="#8b7340" /></div>
            <div className="absolute bottom-0 right-0 pointer-events-none z-10"><CornerOrnament position="bottom-right" color="#8b7340" /></div>
            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden rounded-sm" style={{ backgroundImage: `repeating-linear-gradient(to bottom, transparent 0px, transparent 1.85em, rgba(100,80,40,0.04) 1.85em, rgba(100,80,40,0.04) 1.86em)`, backgroundSize: '100% 1.9em', backgroundPosition: '0 48px' }} />

            {pi === 0 && (
              <div className="relative z-10">
                {letter.letterDate && <p className="text-right font-display text-sm italic text-ink/45 mb-2 md:mb-3">{letter.letterDate}</p>}
                {letter.customInitials && <div className="text-center mb-1 md:mb-2 ink-fade-in"><span className="font-uncial text-4xl md:text-5xl tracking-[0.12em] text-burgundy/35 select-none">{letter.customInitials}</span></div>}
                {letter.crest !== 'none' && <div className="flex justify-center mb-2 md:mb-3 ink-fade-in"><CrestDecoration type={letter.crest} /></div>}
                <div className="ink-fade-in"><OrnamentDivider className="w-24 md:w-32 mx-auto mb-2 md:mb-3" color="#8b7340" /></div>
              </div>
            )}

            <div ref={(node) => { contentRefs.current[pi] = node; }} className="relative z-10 letter-flow"
              style={{
                fontFamily: getFontFamilyByChoice(letter.bodyFont),
                fontSize: `clamp(${LETTER_UI.bodyFontSize}px, 1.2vw + 13px, ${LETTER_UI.bodyFontSizeMd}px)`,
                lineHeight: LETTER_UI.lineHeight,
                whiteSpace: 'pre-wrap',
              }}>
              {isPastPage ? (
                <div className="rich-letter-content letter-flow ink-fade-in ink-engraved" style={{ fontFamily: getFontFamilyByChoice(letter.bodyFont), letterSpacing: '0.01em' }} dangerouslySetInnerHTML={{ __html: decorateLetterHtml(animatedHtml) }} />
              ) : isCurrentPage ? (
                <AnimatedLetterHtml
                  html={animatedHtml}
                  fontFamily={getFontFamilyByChoice(letter.bodyFont)}
                  onDone={() => {
                    if (donePagesRef.current.has(pi)) return;
                    donePagesRef.current.add(pi);
                    if (pi < total - 1) setActivePage(pi + 1);
                    else setTypingDone(true);
                  }}
                />
              ) : (
                <div className="opacity-0 select-none">.</div>
              )}
            </div>

            {shouldShowClosing && (
              <div className="relative z-10 ink-fade-in mt-8">
                <div className="text-right space-y-1">
                  {cls ? <p className="text-base ink-engraved" style={{ fontFamily: getFontFamilyByChoice(letter.closingFont || letter.bodyFont) }}>{cls}</p> : null}
                  <p className="text-2xl md:text-3xl ink-engraved" style={{ fontFamily: getSigFontFamilyByChoice(letter.signatureFont) }}>{letter.signature}</p>
                </div>
                <div className="print-hide-seal flex justify-center mt-6"><WaxSealIcon sealType={letter.sealType} sealColor={letter.sealColor} customInitials={letter.customInitials} size={60} /></div>
              </div>
            )}

            {total > 1 && <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10"><span className="font-heading text-[9px] tracking-[0.2em] text-ink/30 uppercase">{pi + 1} of {total}</span></div>}

            {(letter.flowers || []).map(f => {
              const def = ALL_FLOWERS.find(fl => fl.id === f.flowerId); if (!def) return null;
              const Comp = def.Component;
              return (
                <div key={f.id} className="absolute pointer-events-none z-[1]"
                  style={{
                    left: `${f.x}%`,
                    top: `${f.y}%`,
                    transform: `translate(-50%,-50%) rotate(${f.rotation}deg)`,
                    opacity: LETTER_UI.readingFlowerOpacity,
                    mixBlendMode: 'multiply' as const,
                    filter: isLightFlower(def.defaultColor) ? 'drop-shadow(0 0.5px 0 rgba(90,65,25,0.35))' : 'none',
                  }}><Comp size={f.size} color={def.defaultColor} /></div>
              );
            })}
          </article>
        );})}
      </div>
    </div>
  );
}

export default function DeliveryPage({ slug, onBack }: { slug: string; onBack: () => void }) {
  const [step, setStep] = useState<Step>('loading');
  const [letter, setLetter] = useState<Letter | null>(null);
  const [error, setError] = useState('');
  const [pw, setPw] = useState('');
  const [pwErr, setPwErr] = useState('');

  usePageMeta({
    title: step === 'error'
      ? 'Letter Not Found — Courier of Hearts'
      : letter?.recipient
        ? `A Letter for ${letter.recipient} — Courier of Hearts`
        : 'Opening a Letter — Courier of Hearts',
    description: step === 'error'
      ? 'This letter could not be found, or it may have already faded with time.'
      : step === 'password'
        ? 'This letter is sealed and waiting for its passphrase.'
        : step === 'arriving' || step === 'envelope' || step === 'cracking' || step === 'opening' || step === 'rising'
          ? 'A sealed parchment letter is arriving with a quiet ceremonial reveal.'
          : 'Open a digital letter on parchment with wax, flowers, and a quiet little ceremony.',
    robots: step === 'error' ? 'noindex,nofollow' : 'index,follow',
  });

  useEffect(() => {
    (async () => {
      const r = await getLetter(slug);
      if (r.success && r.data) {
        setLetter(r.data);
        if (!r.data.requiresPassword) void recordLetterView(slug).catch(() => undefined);
        if (r.data.requiresPassword) setStep('password');
        else {
          setStep('arriving');
          setTimeout(() => setStep('envelope'), 3000);
        }
      } else {
        setError(r.error || 'Letter not found');
        setStep('error');
      }
    })();
  }, [slug]);

  const handleUnlock = useCallback(async () => {
    if (!pw.trim()) { setPwErr('Enter the passphrase.'); return; }
    const r = await unlockLetter(slug, pw);
    if (r.success && r.data) {
      setLetter(r.data);
      setPwErr('');
      void recordLetterView(slug).catch(() => undefined);
      setStep('arriving');
      setTimeout(() => setStep('envelope'), 3000);
    } else setPwErr('Incorrect passphrase.');
  }, [slug, pw]);

  const handleSeal = useCallback(() => {
    setStep('cracking');
    setTimeout(() => setStep('opening'), 1650);
    setTimeout(() => setStep('rising'), 3600);
    setTimeout(() => setStep('reading'), 6500);
  }, []);

  if (step === 'loading') return <div className="min-h-screen desk-bg flex items-center justify-center"><div className="animate-float"><HeartSigilIcon size={32} color="#8b7340" /></div></div>;

  if (step === 'error') return (
    <div className="min-h-screen parchment-bg flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <HeartSigilIcon size={40} color="#6B1025" className="mx-auto mb-6 opacity-40" />
        <h1 className="font-display text-2xl text-ink/90 mb-3">{error}</h1>
        <p className="font-body text-[15px] text-ink/55 mb-8">This letter may have been lost to time.</p>
        <button onClick={onBack} className="font-heading text-[11px] tracking-[0.15em] uppercase py-3 px-8 bg-ink text-parchment-light rounded-sm hover:bg-ink-light transition-all duration-500">Return Home</button>
      </div>
    </div>
  );

  if (step === 'password') return (
    <div className="min-h-screen desk-bg flex items-center justify-center px-6"><DustParticles /><CandleGlow />
      <div className="relative z-20 letter-paper rounded-sm p-10 md:p-14 max-w-md w-full text-center">
        <WaxSealIcon sealType={letter?.sealType || 'heart'} sealColor={letter?.sealColor || 'burgundy'} customInitials={letter?.customInitials} size={70} className="mx-auto mb-6" />
        <h2 className="font-display text-xl text-ink/90 mb-2">This letter is sealed</h2>
        <p className="font-body text-[15px] text-ink/60 mb-6">A passphrase is required.</p>
        <input type="password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleUnlock()} placeholder="Enter the passphrase..." className="parchment-input w-full text-center font-body text-base py-3 mb-4" autoFocus />
        {pwErr && <p className="font-body text-[14px] text-burgundy mb-4 italic">{pwErr}</p>}
        <button onClick={handleUnlock} className="font-heading text-[11px] tracking-[0.18em] uppercase py-3 px-8 bg-ink text-parchment-light rounded-sm hover:bg-ink-light transition-all duration-500">Break the Seal</button>
      </div>
    </div>
  );

  if (step === 'arriving') return (
    <div className="min-h-screen desk-bg flex items-center justify-center px-6"><DustParticles /><CandleGlow />
      <div className="relative z-20 text-center">
        <div className="ink-fade-in mb-4"><p className="font-display text-base md:text-lg italic" style={{ color: 'rgba(180,160,110,0.68)' }}>A letter has arrived</p></div>
        <div className="ink-fade-in-delayed"><p className="font-display text-3xl md:text-4xl" style={{ color: 'rgba(220,210,180,0.86)' }}>for {letter?.recipient}</p></div>
      </div>
    </div>
  );

  if (step === 'reading' && letter) return <ReadingView letter={letter} onBack={onBack} />;

  const isOpen = step === 'opening' || step === 'rising';
  const isRising = step === 'rising';

  return (
    <div className="min-h-screen desk-bg flex items-center justify-center px-6 overflow-hidden">
      <DustParticles /><CandleGlow />
      <div className="relative z-20 flex flex-col items-center ink-fade-in">
        <div className={`relative ${isRising ? 'envelope-shrink' : ''}`}
          style={{ width: '290px', height: '200px', perspective: '800px' }}>

          <div className="absolute inset-0 rounded-[3px] overflow-hidden"
            style={{ background: 'linear-gradient(170deg, #c4ad78 0%, #ccba85 30%, #c0aa72 60%, #b8a068 100%)', boxShadow: '0 2px 15px rgba(0,0,0,0.35)' }}>
            <div className="absolute inset-0" style={{ backgroundImage: `
              radial-gradient(ellipse 60px 40px at 15% 70%, rgba(90,65,25,0.12) 0%, transparent 70%),
              radial-gradient(ellipse 40px 30px at 80% 25%, rgba(100,75,30,0.08) 0%, transparent 60%),
              radial-gradient(ellipse 50px 35px at 55% 85%, rgba(75,55,18,0.07) 0%, transparent 55%)
            ` }} />
            <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[1px]" style={{ background: 'linear-gradient(to bottom, transparent 8%, rgba(0,0,0,0.05) 50%, transparent 92%)' }} />
            {(step === 'envelope' || step === 'cracking') && letter && (
              <div className="absolute inset-x-0 bottom-8 flex justify-center px-6 pointer-events-none">
                <p className="font-script text-xl select-none ink-engraved truncate max-w-full" style={{ opacity: 0.46 }}>{letter.recipient}</p>
              </div>
            )}
          </div>

          <div className={`absolute left-0 right-0 top-0 z-[5] ${isOpen ? 'envelope-flap-lift' : ''}`}
            style={{ transformOrigin: 'top center', height: '100px' }}>
            <div style={{
              width: 0, height: 0,
              borderLeft: '145px solid transparent', borderRight: '145px solid transparent',
              borderTop: '100px solid #b09858',
              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.06))',
            }} />
          </div>

          {isRising && (
            <div className="absolute left-[8%] right-[8%] bottom-[10%] z-[4] letter-rise">
              <div className="letter-paper rounded-[2px] p-4 text-center" style={{ minHeight: '60px' }}>
                <p className="font-display text-sm text-ink/58 italic">{letter?.salutation || 'My dearest'} {letter?.recipient}...</p>
              </div>
            </div>
          )}
        </div>

        {step === 'envelope' && (
          <div className="absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-30">
            <div className="gentle-pulse cursor-pointer" style={{ filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.4))' }}>
              <WaxSealIcon sealType={letter?.sealType || 'heart'} sealColor={letter?.sealColor || 'burgundy'} customInitials={letter?.customInitials} size={76} animated onClick={handleSeal} />
            </div>
            <p className="font-heading text-[11px] tracking-[0.22em] uppercase text-center mt-4 select-none font-semibold"
              style={{ color: 'rgba(236,228,206,0.88)', textShadow: '0 1px 8px rgba(0,0,0,0.52), 0 0 14px rgba(139,115,64,0.18)' }}>
              Tap to break the seal
            </p>
          </div>
        )}

        {step === 'cracking' && (
          <div className="absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none" style={{ width: '76px', height: '76px' }}>
            <div className="relative w-full h-full">
              <div className="absolute inset-0 seal-shard-left" style={{ clipPath: 'polygon(0 0, 58% 0, 50% 20%, 56% 40%, 47% 68%, 53% 100%, 0 100%)', filter: 'drop-shadow(-2px 4px 6px rgba(0,0,0,0.34))' }}>
                <WaxSealIcon sealType={letter?.sealType || 'heart'} sealColor={letter?.sealColor || 'burgundy'} customInitials={letter?.customInitials} size={76} />
              </div>
              <div className="absolute inset-0 seal-shard-right" style={{ clipPath: 'polygon(58% 0, 100% 0, 100% 100%, 53% 100%, 47% 68%, 56% 40%, 50% 20%)', filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.34))' }}>
                <WaxSealIcon sealType={letter?.sealType || 'heart'} sealColor={letter?.sealColor || 'burgundy'} customInitials={letter?.customInitials} size={76} />
              </div>
              <svg width="76" height="76" viewBox="0 0 76 76" className="absolute inset-0 crack-lines" aria-hidden="true">
                <path d="M38 15 L34 28 L40 36 L33 58" stroke="rgba(255,238,212,0.92)" strokeWidth="1.4" strokeLinecap="round" fill="none" />
                <path d="M21 33 L32 35 L38 42" stroke="rgba(255,238,212,0.65)" strokeWidth="1" strokeLinecap="round" fill="none" />
                <path d="M54 30 L45 35 L40 44" stroke="rgba(255,238,212,0.65)" strokeWidth="1" strokeLinecap="round" fill="none" />
              </svg>
              <span className="seal-crumb seal-crumb-1" />
              <span className="seal-crumb seal-crumb-2" />
              <span className="seal-crumb seal-crumb-3" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
