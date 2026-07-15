import { useMemo } from 'react';
import type { SealType, SealColor, CrestType, FontChoice, SignatureFont, FlowerPlacement } from '@/types/letter';
import WaxSealIcon from '@/components/icons/WaxSealIcon';
import { OrnamentDivider, CornerOrnament } from '@/components/icons/SvgIcons';
import CrestDecoration from '@/components/letter/CrestDecoration';
import { ALL_FLOWERS } from '@/components/icons/FlowerSvgs';
import { getFontFamilyByChoice, getSigFontFamilyByChoice } from '@/components/pages/ComposePage';
import { decorateLetterHtml, decoratePlainLetterText, hasRichLetterHtml, sanitizeLetterHtml, splitPlainTextIntoPages, splitRichLetterHtmlIntoPages } from '@/utils/sanitizeHtml';
import { LETTER_UI } from '@/config/ui';
import { usePageMeta } from '@/hooks/usePageMeta';

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
  letterDate?: string;
  bodyFont?: FontChoice;
  salutationFont?: FontChoice;
  recipientFont?: FontChoice;
  closingFont?: FontChoice;
  signatureFont?: SignatureFont;
  flowers?: FlowerPlacement[];
  onBack: () => void;
  onSend?: () => void;
  sending?: boolean;
  readOnly?: boolean;
}

function isLightFlower(color: string) {
  return ['#d8cfbf', '#dcd6ca', '#e8e1d4', '#ddd6c8', '#e2dbcf'].includes(color.toLowerCase());
}

export default function LetterPreview({
  salutation = '', recipient, content, closing = '',
  signature, sealType, sealColor, crest,
  customInitials, letterDate,
  bodyFont = 'eb-garamond', salutationFont = 'eb-garamond', recipientFont = 'eb-garamond', closingFont = 'eb-garamond', signatureFont = 'great-vibes',
  flowers = [], onBack, onSend, sending, readOnly,
}: LetterPreviewProps) {
  const isRichContent = hasRichLetterHtml(content);
  const safeContent = useMemo(() => sanitizeLetterHtml(content), [content]);
  const screenHtml = useMemo(
    () => isRichContent ? decorateLetterHtml(safeContent) : decoratePlainLetterText(content),
    [content, isRichContent, safeContent],
  );
  const printPages = useMemo(() => {
    const pages = isRichContent ? splitRichLetterHtmlIntoPages(safeContent) : splitPlainTextIntoPages(content);
    return pages.map((pageContent) => isRichContent ? decorateLetterHtml(pageContent) : decoratePlainLetterText(pageContent));
  }, [content, isRichContent, safeContent]);

  usePageMeta({
    title: readOnly
      ? `${recipient ? `A Letter for ${recipient}` : 'A Letter'} — Courier of Hearts`
      : 'Preview Your Letter — Courier of Hearts',
    description: readOnly
      ? `Open a letter${recipient ? ` for ${recipient}` : ''} on parchment with wax, flowers, and a quiet little ceremony.`
      : 'Preview your parchment letter before you seal and send it.',
    robots: readOnly ? 'index,follow' : 'noindex,nofollow',
  });

  const headerLine = (
    (salutation || recipient) ? (
      <p className="text-lg md:text-xl italic mb-3 md:mb-4 ink-fade-in-delayed relative z-10 ink-engraved">
        {salutation && <span style={{ fontFamily: getFontFamilyByChoice(salutationFont) }}>{salutation}</span>}
        {salutation && recipient ? ' ' : ''}
        {recipient && <span style={{ fontFamily: getFontFamilyByChoice(recipientFont) }}>{recipient}</span>}
        {recipient ? ',' : ''}
      </p>
    ) : null
  );

  const flowersLayer = (opacity: number) => flowers.map((f) => {
    const def = ALL_FLOWERS.find((fl) => fl.id === f.flowerId);
    if (!def) return null;
    const Comp = def.Component;
    return (
      <div
        key={f.id}
        className="absolute pointer-events-none z-[1]"
        style={{
          left: `${f.x}%`,
          top: `${f.y}%`,
          transform: `translate(-50%,-50%) rotate(${f.rotation}deg)`,
          opacity,
          mixBlendMode: 'multiply' as const,
          filter: isLightFlower(def.defaultColor) ? 'drop-shadow(0 0.5px 0 rgba(90,65,25,0.35))' : 'none',
        }}>
        <Comp size={f.size} color={def.defaultColor} />
      </div>
    );
  });

  return (
    <div className="min-h-screen parchment-bg">
      <nav className="no-print flex items-center justify-between px-4 py-3 md:px-8 relative z-20" style={{ borderBottom: '1px solid rgba(139,115,64,0.12)' }}>
        <button onClick={onBack} className="font-heading text-[11px] tracking-[0.12em] text-ink/70 uppercase hover:text-ink transition-colors duration-500">
          {readOnly ? '← Home' : '← Continue Editing'}
        </button>
        <span className="font-heading text-[10px] tracking-[0.2em] text-ink/40 uppercase">{readOnly ? '' : 'Preview'}</span>
        <button onClick={() => window.print()} className="font-heading text-[10px] tracking-[0.12em] text-ink/70 uppercase hover:text-ink transition-colors duration-500">Print</button>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-8 md:py-12 relative z-10">
        <article className="screen-only relative letter-paper rounded-sm mb-8"
          style={{ padding: 'clamp(32px, 6vw, 64px)', minHeight: '600px' }}>
          <div className="absolute top-0 left-0 pointer-events-none z-10"><CornerOrnament position="top-left" color="#8b7340" /></div>
          <div className="absolute top-0 right-0 pointer-events-none z-10"><CornerOrnament position="top-right" color="#8b7340" /></div>
          <div className="absolute bottom-0 left-0 pointer-events-none z-10"><CornerOrnament position="bottom-left" color="#8b7340" /></div>
          <div className="absolute bottom-0 right-0 pointer-events-none z-10"><CornerOrnament position="bottom-right" color="#8b7340" /></div>
          <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden rounded-sm"
            style={{ backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0px, transparent 1.85em, rgba(100,80,40,0.04) 1.85em, rgba(100,80,40,0.04) 1.86em)', backgroundSize: '100% 1.9em', backgroundPosition: '0 48px' }} />

          <div className="relative z-10">
            {letterDate && <p className="text-right font-display text-sm italic text-ink/45 mb-2 md:mb-3">{letterDate}</p>}
            {customInitials && <div className="text-center mb-1 md:mb-2 ink-fade-in"><span className="font-uncial text-4xl md:text-5xl tracking-[0.12em] text-burgundy/35 select-none">{customInitials}</span></div>}
            {crest !== 'none' && <div className="flex justify-center mb-2 md:mb-3 ink-fade-in"><CrestDecoration type={crest} /></div>}
            <div className="ink-fade-in"><OrnamentDivider className="w-24 md:w-32 mx-auto mb-3 md:mb-4" color="#8b7340" /></div>
            {headerLine}
          </div>

          <div className="rich-letter-content letter-flow relative z-10 ink-fade-in-delayed ink-engraved"
            style={{
              fontFamily: getFontFamilyByChoice(bodyFont),
              fontSize: `clamp(${LETTER_UI.bodyFontSize}px, 1.2vw + 13px, ${LETTER_UI.bodyFontSizeMd}px)`,
              lineHeight: LETTER_UI.lineHeight,
              letterSpacing: '0.01em',
              wordSpacing: '0.04em',
              whiteSpace: 'pre-wrap',
            }}
            dangerouslySetInnerHTML={{ __html: screenHtml }} />

          <div className="relative z-10 mt-8 ink-fade-in-delayed-2">
            <div className="text-right space-y-1">
              {closing ? <p className="text-base ink-engraved" style={{ fontFamily: getFontFamilyByChoice(closingFont) }}>{closing}</p> : null}
              <p className="text-2xl md:text-3xl ink-engraved" style={{ fontFamily: getSigFontFamilyByChoice(signatureFont) }}>{signature}</p>
            </div>
            <div className="print-hide-seal flex justify-center mt-6"><WaxSealIcon sealType={sealType} sealColor={sealColor} customInitials={customInitials} size={70} /></div>
          </div>

          {flowersLayer(LETTER_UI.previewFlowerOpacity)}
        </article>

        <div className="print-only">
          {printPages.map((pageContent, pi) => (
            <article key={pi} className="print-letter relative letter-paper rounded-sm mb-8 last:mb-0"
              style={{ padding: 'clamp(32px, 6vw, 64px)', minHeight: '600px', pageBreakAfter: pi < printPages.length - 1 ? 'always' : 'auto' }}>
              <div className="print-border hidden absolute inset-5 md:inset-7 pointer-events-none rounded-sm" />
              <div className="absolute top-0 left-0 pointer-events-none z-10"><CornerOrnament position="top-left" color="#8b7340" /></div>
              <div className="absolute top-0 right-0 pointer-events-none z-10"><CornerOrnament position="top-right" color="#8b7340" /></div>
              <div className="absolute bottom-0 left-0 pointer-events-none z-10"><CornerOrnament position="bottom-left" color="#8b7340" /></div>
              <div className="absolute bottom-0 right-0 pointer-events-none z-10"><CornerOrnament position="bottom-right" color="#8b7340" /></div>
              <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden rounded-sm"
                style={{ backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0px, transparent 1.85em, rgba(100,80,40,0.04) 1.85em, rgba(100,80,40,0.04) 1.86em)', backgroundSize: '100% 1.9em', backgroundPosition: '0 48px' }} />

              {pi === 0 && (
                <div className="relative z-10">
                  {letterDate && <p className="text-right font-display text-sm italic text-ink/45 mb-2 md:mb-3">{letterDate}</p>}
                  {customInitials && <div className="text-center mb-1 md:mb-2"><span className="font-uncial text-4xl md:text-5xl tracking-[0.12em] text-burgundy/35 select-none">{customInitials}</span></div>}
                  {crest !== 'none' && <div className="flex justify-center mb-2 md:mb-3"><CrestDecoration type={crest} /></div>}
                  <div><OrnamentDivider className="w-24 md:w-32 mx-auto mb-3 md:mb-4" color="#8b7340" /></div>
                  {headerLine}
                </div>
              )}

              <div className="rich-letter-content letter-flow relative z-10 ink-engraved"
                style={{
                  fontFamily: getFontFamilyByChoice(bodyFont),
                  fontSize: `clamp(${LETTER_UI.bodyFontSize}px, 1.2vw + 13px, ${LETTER_UI.bodyFontSizeMd}px)`,
                  lineHeight: LETTER_UI.lineHeight,
                  letterSpacing: '0.01em',
                  wordSpacing: '0.04em',
                  whiteSpace: 'pre-wrap',
                }}
                dangerouslySetInnerHTML={{ __html: pageContent }} />

              {pi === printPages.length - 1 && (
                <div className="relative z-10 mt-8">
                  <div className="text-right space-y-1">
                    {closing ? <p className="text-base ink-engraved" style={{ fontFamily: getFontFamilyByChoice(closingFont) }}>{closing}</p> : null}
                    <p className="text-2xl md:text-3xl ink-engraved" style={{ fontFamily: getSigFontFamilyByChoice(signatureFont) }}>{signature}</p>
                  </div>
                </div>
              )}

              {printPages.length > 1 && <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10"><span className="font-heading text-[9px] tracking-[0.2em] text-ink/35 uppercase">{pi + 1} of {printPages.length}</span></div>}
              {flowersLayer(LETTER_UI.previewFlowerOpacity)}
            </article>
          ))}
        </div>

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
