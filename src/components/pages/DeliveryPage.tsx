import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Letter } from '@/types/letter';
import { getLetter, unlockLetter } from '@/services/api';
import WaxSealIcon from '@/components/icons/WaxSealIcon';
import DustParticles from '@/components/effects/DustParticles';
import CandleGlow from '@/components/effects/CandleGlow';
import { HeartSigilIcon, OrnamentDivider, CornerOrnament } from '@/components/icons/SvgIcons';
import CrestDecoration from '@/components/letter/CrestDecoration';
import { ALL_FLOWERS } from '@/components/icons/FlowerSvgs';
import { getFontFamilyByChoice, getSigFontFamilyByChoice } from '@/components/pages/ComposePage';
import { escapeLetterHtml, hasRichLetterHtml, richHtmlTextLength, sanitizeLetterHtml, sliceRichLetterHtml } from '@/utils/sanitizeHtml';

type Step = 'loading' | 'error' | 'password' | 'arriving' | 'envelope' | 'cracking' | 'opening' | 'rising' | 'reading';

// Typewriter — rAF-based
function TypewriterText({ text, fontFamily, onDone }: { text: string; fontFamily: string; onDone: () => void }) {
  const [chars, setChars] = useState(0);
  const raf = useRef(0); const last = useRef(0); const count = useRef(0);
  const done = useRef(onDone); done.current = onDone;

  useEffect(() => {
    count.current = 0; last.current = 0; setChars(0);
    const ms = Math.max(35, Math.min(60, 2500 / Math.max(text.length, 1)));
    const tick = (ts: number) => {
      if (!last.current) last.current = ts;
      const d = ts - last.current;
      if (d >= ms) { count.current = Math.min(count.current + Math.floor(d / ms), text.length); setChars(count.current); last.current = ts; }
      if (count.current < text.length) raf.current = requestAnimationFrame(tick); else done.current();
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [text]);

  return (
    <span className="ink-engraved" style={{ fontFamily, letterSpacing: '0.01em', wordSpacing: '0.04em' }}>
      {text.slice(0, chars)}
    </span>
  );
}

function RichTypewriterText({ html, fontFamily, onDone }: { html: string; fontFamily: string; onDone: () => void }) {
  const safeHtml = useMemo(() => sanitizeLetterHtml(html), [html]);
  const totalChars = useMemo(() => richHtmlTextLength(safeHtml), [safeHtml]);
  const [chars, setChars] = useState(0);
  const raf = useRef(0); const last = useRef(0); const count = useRef(0);
  const done = useRef(onDone); done.current = onDone;

  useEffect(() => {
    count.current = 0; last.current = 0; setChars(0);
    const ms = Math.max(35, Math.min(60, 2500 / Math.max(totalChars, 1)));
    const tick = (ts: number) => {
      if (!last.current) last.current = ts;
      const d = ts - last.current;
      if (d >= ms) { count.current = Math.min(count.current + Math.floor(d / ms), totalChars); setChars(count.current); last.current = ts; }
      if (count.current < totalChars) raf.current = requestAnimationFrame(tick); else done.current();
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [totalChars, safeHtml]);

  const partialHtml = useMemo(() => sliceRichLetterHtml(safeHtml, chars), [safeHtml, chars]);

  return (
    <span className="rich-letter-content ink-engraved" style={{ fontFamily, letterSpacing: '0.01em', wordSpacing: '0.04em' }}>
      <span dangerouslySetInnerHTML={{ __html: partialHtml }} />
    </span>
  );
}

function splitPages(text: string): string[] {
  if (!text || text.length <= 900) return [text || ''];
  const p: string[] = []; let rem = text;
  while (rem.length > 0) {
    if (rem.length <= 900) { p.push(rem); break; }
    let bp = rem.lastIndexOf('\n\n', 900);
    if (bp < 360) bp = rem.lastIndexOf('\n', 900);
    if (bp < 360) bp = rem.lastIndexOf('. ', 900);
    if (bp < 225) bp = rem.lastIndexOf(' ', 900);
    if (bp <= 0) bp = 900;
    p.push(rem.slice(0, bp + 1)); rem = rem.slice(bp + 1).trimStart();
    if (!rem) break;
  }
  return p.length ? p : [''];
}

// The reading view — typewriter starts from salutation
function ReadingView({ letter, onBack }: { letter: Letter; onBack: () => void }) {
  const isRichContent = hasRichLetterHtml(letter.content);
  const [typingDone, setTypingDone] = useState(false);
  const safeContent = useMemo(() => sanitizeLetterHtml(letter.content), [letter.content]);
  const pages = useMemo(() => isRichContent ? [safeContent] : splitPages(letter.content), [letter.content, isRichContent, safeContent]);
  const total = pages.length;
  const sal = letter.salutation || 'My dearest';
  const cls = letter.closing || 'Forever yours,';

  useEffect(() => { setTypingDone(false); }, [letter.content]);

  // Build the full text for page 1: salutation + body
  const fullFirstPage = `${sal} ${letter.recipient},\n\n${pages[0]}`;
  const fullRichFirstPage = `${escapeLetterHtml(sal)} ${escapeLetterHtml(letter.recipient)},<br><br>${pages[0]}`;

  return (
    <div className="min-h-screen parchment-bg fade-slide-up">
      <nav className="no-print flex items-center justify-between px-4 py-3 md:px-8 relative z-20" style={{ borderBottom: '1px solid rgba(139,115,64,0.12)' }}>
        <button onClick={onBack} className="font-heading text-[11px] tracking-[0.12em] text-ink/70 uppercase hover:text-ink transition-colors duration-500">&larr; Home</button>
        <span className="font-heading text-[10px] tracking-[0.25em] text-ink/40 uppercase">A letter for {letter.recipient}</span>
        <button onClick={() => window.print()} className="font-heading text-[11px] tracking-[0.12em] text-ink/70 uppercase hover:text-ink transition-colors duration-500">Print</button>
      </nav>
      <div className="max-w-3xl mx-auto px-4 py-8 md:py-12 relative z-10">
        {pages.map((pc, pi) => (
          <article key={pi} className="print-letter relative letter-paper rounded-sm mb-8 last:mb-0"
            style={{ padding: 'clamp(32px, 6vw, 64px)', minHeight: '500px', pageBreakAfter: pi < total - 1 ? 'always' : 'auto' }}>
            <div className="print-border hidden absolute inset-5 md:inset-7 pointer-events-none rounded-sm" />
            <div className="absolute top-0 left-0 pointer-events-none z-10"><CornerOrnament position="top-left" color="#8b7340" /></div>
            <div className="absolute top-0 right-0 pointer-events-none z-10"><CornerOrnament position="top-right" color="#8b7340" /></div>
            <div className="absolute bottom-0 left-0 pointer-events-none z-10"><CornerOrnament position="bottom-left" color="#8b7340" /></div>
            <div className="absolute bottom-0 right-0 pointer-events-none z-10"><CornerOrnament position="bottom-right" color="#8b7340" /></div>
            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden rounded-sm" style={{ backgroundImage: `repeating-linear-gradient(to bottom, transparent 0px, transparent 1.85em, rgba(100,80,40,0.035) 1.85em, rgba(100,80,40,0.035) 1.86em)`, backgroundSize: '100% 1.9em', backgroundPosition: '0 48px' }} />

            {/* Page 1: crest + initials + typewriter from salutation */}
            {pi === 0 && (
              <div className="relative z-10">
                {letter.customInitials && <div className="text-center mb-2 ink-fade-in"><span className="font-uncial text-5xl md:text-6xl text-burgundy/30 select-none">{letter.customInitials.charAt(0)}</span></div>}
                {letter.crest !== 'none' && <div className="flex justify-center mb-3 ink-fade-in"><CrestDecoration type={letter.crest} /></div>}
                <div className="ink-fade-in"><OrnamentDivider className="w-28 md:w-36 mx-auto mb-5" color="#8b7340" /></div>
              </div>
            )}

            {/* Text — typewriter for plain letters, preserved rich fonts for styled letters */}
            <div className="relative z-10 text-[17px] md:text-[18px] leading-[1.95] whitespace-pre-wrap">
              {isRichContent ? (
                <RichTypewriterText html={pi === 0 ? fullRichFirstPage : pc} fontFamily={getFontFamilyByChoice(letter.bodyFont)} onDone={() => setTypingDone(true)} />
              ) : pi === 0 ? (
                <TypewriterText text={fullFirstPage} fontFamily={getFontFamilyByChoice(letter.bodyFont)} onDone={() => setTypingDone(true)} />
              ) : (
                <div className="ink-fade-in ink-engraved" style={{ fontFamily: getFontFamilyByChoice(letter.bodyFont), letterSpacing: '0.01em' }}>{pc}</div>
              )}
            </div>

            {/* Last page: closing + signature */}
            {pi === total - 1 && (typingDone || pi > 0) && (
              <div className="relative z-10 ink-fade-in mt-8">
                <div className="text-right space-y-1">
                  <p className="font-display text-base italic ink-engraved">{cls}</p>
                  <p className="text-2xl md:text-3xl ink-engraved" style={{ fontFamily: getSigFontFamilyByChoice(letter.signatureFont) }}>{letter.signature}</p>
                </div>
                <div className="flex justify-center mt-6"><WaxSealIcon sealType={letter.sealType} sealColor={letter.sealColor} size={60} /></div>
              </div>
            )}

            {total > 1 && <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10"><span className="font-heading text-[9px] tracking-[0.2em] text-ink/30 uppercase">{pi + 1} of {total}</span></div>}

            {(letter.flowers || []).map(f => {
              const def = ALL_FLOWERS.find(fl => fl.id === f.flowerId); if (!def) return null;
              const Comp = def.Component;
              return <div key={f.id} className="absolute pointer-events-none z-[1]" style={{ left: `${f.x}%`, top: `${f.y}%`, transform: `rotate(${f.rotation}deg) translate(-50%,-50%)`, opacity: 0.15, mixBlendMode: 'multiply' as const }}><Comp size={f.size} color={def.defaultColor} /></div>;
            })}
          </article>
        ))}
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

  useEffect(() => {
    (async () => {
      const r = await getLetter(slug);
      if (r.success && r.data) { setLetter(r.data); if (r.data.requiresPassword) setStep('password'); else { setStep('arriving'); setTimeout(() => setStep('envelope'), 3000); } }
      else { setError(r.error || 'Letter not found'); setStep('error'); }
    })();
  }, [slug]);

  const handleUnlock = useCallback(async () => {
    if (!pw.trim()) { setPwErr('Enter the passphrase.'); return; }
    const r = await unlockLetter(slug, pw);
    if (r.success && r.data) { setLetter(r.data); setPwErr(''); setStep('arriving'); setTimeout(() => setStep('envelope'), 3000); }
    else setPwErr('Incorrect passphrase.');
  }, [slug, pw]);

  // Ceremony: click seal → crack → flap opens → letter rises → reading
  const handleSeal = useCallback(() => {
    setStep('cracking');
    setTimeout(() => setStep('opening'), 1300);
    setTimeout(() => setStep('rising'), 2800);
    setTimeout(() => setStep('reading'), 4800);
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
        <WaxSealIcon sealType={letter?.sealType || 'heart'} sealColor={letter?.sealColor || 'burgundy'} size={70} className="mx-auto mb-6" />
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
        <div className="ink-fade-in mb-4"><p className="font-display text-base md:text-lg italic" style={{ color: 'rgba(180,160,110,0.6)' }}>A letter has arrived</p></div>
        <div className="ink-fade-in-delayed"><p className="font-display text-3xl md:text-4xl" style={{ color: 'rgba(220,210,180,0.8)' }}>for {letter?.recipient}</p></div>
      </div>
    </div>
  );

  if (step === 'reading' && letter) return <ReadingView letter={letter} onBack={onBack} />;

  // ==================== THE CEREMONY ====================
  const isOpen = step === 'opening' || step === 'rising';
  const isRising = step === 'rising';

  return (
    <div className="min-h-screen desk-bg flex items-center justify-center px-6 overflow-hidden">
      <DustParticles /><CandleGlow />
      <div className="relative z-20 flex flex-col items-center ink-fade-in">

        {/* Envelope container */}
        <div className={`relative ${isRising ? 'envelope-shrink' : ''}`}
          style={{ width: '290px', height: '200px', perspective: '800px' }}>

          {/* Envelope back */}
          <div className="absolute inset-0 rounded-[3px] overflow-hidden"
            style={{ background: 'linear-gradient(170deg, #c4ad78 0%, #ccba85 30%, #c0aa72 60%, #b8a068 100%)', boxShadow: '0 2px 15px rgba(0,0,0,0.35)' }}>
            {/* Stains */}
            <div className="absolute inset-0" style={{ backgroundImage: `
              radial-gradient(ellipse 60px 40px at 15% 70%, rgba(90,65,25,0.12) 0%, transparent 70%),
              radial-gradient(ellipse 40px 30px at 80% 25%, rgba(100,75,30,0.08) 0%, transparent 60%),
              radial-gradient(ellipse 50px 35px at 55% 85%, rgba(75,55,18,0.07) 0%, transparent 55%)
            ` }} />
            {/* Fold */}
            <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[1px]" style={{ background: 'linear-gradient(to bottom, transparent 8%, rgba(0,0,0,0.05) 50%, transparent 92%)' }} />
            {/* Name */}
            {(step === 'envelope' || step === 'cracking') && letter && (
              <div className="absolute inset-x-0 bottom-8 flex justify-center px-6 pointer-events-none">
                <p className="font-script text-xl select-none ink-engraved truncate max-w-full" style={{ opacity: 0.35 }}>{letter.recipient}</p>
              </div>
            )}
          </div>

          {/* Flap */}
          <div className={`absolute left-0 right-0 top-0 z-[5] ${isOpen ? 'envelope-flap-lift' : ''}`}
            style={{ transformOrigin: 'top center', height: '100px' }}>
            <div style={{
              width: 0, height: 0,
              borderLeft: '145px solid transparent', borderRight: '145px solid transparent',
              borderTop: '100px solid #b09858',
              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.06))',
            }} />
          </div>

          {/* Letter peeking out / rising */}
          {isRising && (
            <div className="absolute left-[8%] right-[8%] bottom-[10%] z-[4] letter-rise">
              <div className="letter-paper rounded-[2px] p-4 text-center" style={{ minHeight: '60px' }}>
                <p className="font-display text-sm text-ink/50 italic">{letter?.salutation || 'My dearest'} {letter?.recipient}...</p>
              </div>
            </div>
          )}
        </div>

        {/* Wax seal — floating over envelope */}
        {step === 'envelope' && (
          <div className="absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-30">
            <div className="gentle-pulse cursor-pointer" style={{ filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.4))' }}>
              <WaxSealIcon sealType={letter?.sealType || 'heart'} sealColor={letter?.sealColor || 'burgundy'} size={76} animated onClick={handleSeal} />
            </div>
            <p className="font-heading text-[11px] tracking-[0.2em] uppercase text-center mt-4 select-none" style={{ color: 'rgba(220,210,180,0.55)' }}>Tap to break the seal</p>
          </div>
        )}

        {/* Seal cracking */}
        {step === 'cracking' && (
          <div className="absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 seal-crack pointer-events-none" style={{ filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.4))' }}>
            <WaxSealIcon sealType={letter?.sealType || 'heart'} sealColor={letter?.sealColor || 'burgundy'} size={76} />
          </div>
        )}
      </div>
    </div>
  );
}
