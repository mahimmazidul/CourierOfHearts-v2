import { useMemo } from 'react';
import type { SealType, SealColor, CrestType, FontChoice, SignatureFont, FlowerPlacement } from '@/types/letter';
import WaxSealIcon from '@/components/icons/WaxSealIcon';
import { OrnamentDivider, CornerOrnament } from '@/components/icons/SvgIcons';
import CrestDecoration from '@/components/letter/CrestDecoration';
import { ALL_FLOWERS } from '@/components/icons/FlowerSvgs';
import { getFontFamilyByChoice, getSigFontFamilyByChoice } from '@/components/pages/ComposePage';
import { hasRichLetterHtml, sanitizeLetterHtml } from '@/utils/sanitizeHtml';

interface LetterPreviewProps {
  salutation?: string;
  recipient: string;
  content: string;
  closing?: string;
  signature: string;
  sealType: SealType;
  sealColor: SealColor;
  crest: CrestType;
  customInitials?: string;
  bodyFont?: FontChoice;
  signatureFont?: SignatureFont;
  flowers?: FlowerPlacement[];
  onBack: () => void;
  onSend?: () => void;
  sending?: boolean;
  readOnly?: boolean;
}

function splitIntoPages(text: string, charsPerPage = 900): string[] {
  if (!text || text.length <= charsPerPage) return [text || ''];
  const pages: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= charsPerPage) { pages.push(remaining); break; }
    let bp = remaining.lastIndexOf('\n\n', charsPerPage);
    if (bp < charsPerPage * 0.4) bp = remaining.lastIndexOf('\n', charsPerPage);
    if (bp < charsPerPage * 0.4) bp = remaining.lastIndexOf('. ', charsPerPage);
    if (bp < charsPerPage * 0.25) bp = remaining.lastIndexOf(' ', charsPerPage);
    if (bp <= 0) bp = charsPerPage;
    pages.push(remaining.slice(0, bp + 1));
    remaining = remaining.slice(bp + 1).trimStart();
    if (!remaining) break;
  }
  return pages.length ? pages : [''];
}

export default function LetterPreview({
  salutation = 'My dearest', recipient, content, closing = 'Forever yours,',
  signature, sealType, sealColor, crest,
  customInitials, bodyFont = 'eb-garamond', signatureFont = 'great-vibes',
  flowers = [], onBack, onSend, sending, readOnly,
}: LetterPreviewProps) {
  const isRichContent = hasRichLetterHtml(content);
  const safeContent = useMemo(() => sanitizeLetterHtml(content), [content]);
  const pages = useMemo(() => isRichContent ? [safeContent] : splitIntoPages(content), [content, isRichContent, safeContent]);
  const totalPages = pages.length;

  return (
    <div className="min-h-screen parchment-bg">
      <nav className="no-print flex items-center justify-between px-4 py-3 md:px-8 relative z-20"
        style={{ borderBottom: '1px solid rgba(139,115,64,0.12)' }}>
        <button onClick={onBack} className="font-heading text-[11px] tracking-[0.12em] text-ink/70 uppercase hover:text-ink transition-colors duration-500">
          {readOnly ? '\u2190 Home' : '\u2190 Continue Editing'}
        </button>
        <span className="font-heading text-[10px] tracking-[0.2em] text-ink/40 uppercase">{readOnly ? '' : 'Preview'}</span>
        <button onClick={() => window.print()} className="font-heading text-[10px] tracking-[0.12em] text-ink/70 uppercase hover:text-ink transition-colors duration-500">Print</button>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-8 md:py-12 relative z-10">
        {pages.map((pageContent, pi) => (
          <article key={pi} className="print-letter relative letter-paper rounded-sm mb-8 last:mb-0"
            style={{ padding: 'clamp(32px, 6vw, 64px)', minHeight: '600px', pageBreakAfter: pi < totalPages - 1 ? 'always' : 'auto' }}>

            <div className="print-border hidden absolute inset-5 md:inset-7 pointer-events-none rounded-sm" />
            <div className="absolute top-0 left-0 pointer-events-none z-10"><CornerOrnament position="top-left" color="#8b7340" /></div>
            <div className="absolute top-0 right-0 pointer-events-none z-10"><CornerOrnament position="top-right" color="#8b7340" /></div>
            <div className="absolute bottom-0 left-0 pointer-events-none z-10"><CornerOrnament position="bottom-left" color="#8b7340" /></div>
            <div className="absolute bottom-0 right-0 pointer-events-none z-10"><CornerOrnament position="bottom-right" color="#8b7340" /></div>

            {/* Faint ruled lines */}
            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden rounded-sm"
              style={{ backgroundImage: `repeating-linear-gradient(to bottom, transparent 0px, transparent 1.85em, rgba(100,80,40,0.04) 1.85em, rgba(100,80,40,0.04) 1.86em)`, backgroundSize: '100% 1.9em', backgroundPosition: '0 48px' }} />

            {/* Page 1 header */}
            {pi === 0 && (
              <div className="relative z-10">
                {customInitials && <div className="text-center mb-2 ink-fade-in"><span className="font-uncial text-5xl md:text-6xl text-burgundy/30 select-none">{customInitials.charAt(0)}</span></div>}
                {crest !== 'none' && <div className="flex justify-center mb-3 ink-fade-in"><CrestDecoration type={crest} /></div>}
                <div className="ink-fade-in"><OrnamentDivider className="w-28 md:w-36 mx-auto mb-5" color="#8b7340" /></div>
                {recipient && <p className="font-display text-lg md:text-xl italic mb-5 ink-fade-in-delayed relative z-10 ink-engraved">{salutation} {recipient},</p>}
              </div>
            )}

            {/* Body — deep engraved */}
            {isRichContent ? (
              <div className="rich-letter-content text-[17px] md:text-[18px] leading-[1.95] whitespace-pre-wrap relative z-10 ink-fade-in-delayed ink-engraved"
                style={{ fontFamily: getFontFamilyByChoice(bodyFont), letterSpacing: '0.01em', wordSpacing: '0.04em' }}
                dangerouslySetInnerHTML={{ __html: pageContent }} />
            ) : (
              <div className="text-[17px] md:text-[18px] leading-[1.95] whitespace-pre-wrap relative z-10 ink-fade-in-delayed ink-engraved"
                style={{ fontFamily: getFontFamilyByChoice(bodyFont), letterSpacing: '0.01em', wordSpacing: '0.04em' }}>
                {pageContent}
              </div>
            )}

            {/* Last page: closing + signature */}
            {pi === totalPages - 1 && (
              <div className="relative z-10 mt-8 ink-fade-in-delayed-2">
                <div className="text-right space-y-1">
                  <p className="font-display text-base italic ink-engraved">{closing}</p>
                  <p className="text-2xl md:text-3xl ink-engraved" style={{ fontFamily: getSigFontFamilyByChoice(signatureFont) }}>{signature}</p>
                </div>
                <div className="flex justify-center mt-6"><WaxSealIcon sealType={sealType} sealColor={sealColor} size={70} /></div>
              </div>
            )}

            {totalPages > 1 && <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10"><span className="font-heading text-[9px] tracking-[0.2em] text-ink/35 uppercase">{pi + 1} of {totalPages}</span></div>}

            {flowers.map(f => {
              const def = ALL_FLOWERS.find(fl => fl.id === f.flowerId); if (!def) return null;
              const Comp = def.Component;
              return <div key={f.id} className="absolute pointer-events-none z-[1]" style={{ left: `${f.x}%`, top: `${f.y}%`, transform: `rotate(${f.rotation}deg) translate(-50%,-50%)`, opacity: 0.18, mixBlendMode: 'multiply' as const }}><Comp size={f.size} color={def.defaultColor} /></div>;
            })}
          </article>
        ))}

        {!readOnly && onSend && (
          <div className="no-print flex flex-col items-center gap-3 mt-6">
            <button onClick={onSend} disabled={sending} className="font-heading text-[11px] tracking-[0.18em] uppercase py-4 px-14 bg-ink text-parchment-light rounded-sm transition-all duration-500 hover:bg-ink-light disabled:opacity-40" style={{ boxShadow: '0 3px 15px rgba(0,0,0,0.2)' }}>{sending ? 'Sealing...' : 'Seal & Send'}</button>
            <button onClick={onBack} className="font-heading text-[10px] uppercase py-2 px-6 text-ink/45 hover:text-ink/70 transition-colors duration-500">Continue editing</button>
          </div>
        )}
      </div>
    </div>
  );
}
