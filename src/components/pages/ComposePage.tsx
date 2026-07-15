import { useState, useCallback, useRef, useEffect } from 'react';
import type { SealType, SealColor, CrestType, CreateLetterPayload, FontChoice, SignatureFont, FlowerPlacement } from '@/types/letter';
import { createLetter } from '@/services/api';
import WaxSealIcon from '@/components/icons/WaxSealIcon';
import { OrnamentDivider, QuillIcon, HeartSigilIcon } from '@/components/icons/SvgIcons';
import LetterPreview from '@/components/letter/LetterPreview';
import RichLetterEditor, { type RichLetterEditorHandle } from '@/components/editor/RichLetterEditor';
import { ALL_FLOWERS } from '@/components/icons/FlowerSvgs';
import { sanitizeLetterHtml, htmlToPlainText } from '@/utils/sanitizeHtml';
import { nanoid } from 'nanoid';
import { LETTER_UI } from '@/config/ui';
import { usePageMeta } from '@/hooks/usePageMeta';

interface ComposePageProps { onLetterCreated: (slug: string) => void; onBack: () => void; }

type DraftState = {
  salutation: string;
  recipient: string;
  content: string;
  closing: string;
  signature: string;
  sealType: SealType;
  sealColor: SealColor;
  crest: CrestType;
  customInitials: string;
  letterDate: string;
  bodyFont: FontChoice;
  salutationFont: FontChoice;
  recipientFont: FontChoice;
  closingFont: FontChoice;
  signatureFont: SignatureFont;
  flowers: FlowerPlacement[];
  isPrivate: boolean;
  updatedAt: number;
};

const DRAFT_STORAGE_KEY = 'courier_of_hearts_compose_draft_v2';

const SEAL_TYPES: { value: SealType; label: string }[] = [
  { value: 'rose', label: 'Rose' }, { value: 'heart', label: 'Heart' },
  { value: 'crown', label: 'Crown' }, { value: 'raven', label: 'Raven' },
  { value: 'initials', label: 'Initials' }, { value: 'monogram', label: 'Monogram' },
];
const SEAL_COLORS: { value: SealColor; label: string; hex: string }[] = [
  { value: 'burgundy', label: 'Burgundy', hex: '#6B1025' },
  { value: 'crimson', label: 'Crimson', hex: '#8A1538' },
  { value: 'emerald', label: 'Emerald', hex: '#264D3A' },
  { value: 'gold', label: 'Gold', hex: '#8b7340' },
  { value: 'black', label: 'Obsidian', hex: '#1a1208' },
];
const CREST_TYPES: { value: CrestType; label: string }[] = [
  { value: 'none', label: 'None' }, { value: 'royal', label: 'Royal' },
  { value: 'floral', label: 'Floral' }, { value: 'shield', label: 'Shield' },
  { value: 'wreath', label: 'Wreath' }, { value: 'wings', label: 'Wings' },
];
const ALL_FONTS: { value: FontChoice; label: string; family: string }[] = [
  { value: 'eb-garamond', label: 'EB Garamond', family: "'EB Garamond', 'Noto Serif Bengali', serif" },
  { value: 'cormorant', label: 'Cormorant', family: "'Cormorant Garamond', 'Noto Serif Bengali', serif" },
  { value: 'crimson', label: 'Crimson Pro', family: "'Crimson Pro', 'Noto Serif Bengali', serif" },
  { value: 'medieval', label: 'MedievalSharp', family: "'MedievalSharp', 'Noto Serif Bengali', cursive" },
  { value: 'uncial', label: 'Uncial Antiqua', family: "'Uncial Antiqua', 'Noto Serif Bengali', serif" },
  { value: 'almendra', label: 'Almendra', family: "'Almendra', 'Noto Serif Bengali', serif" },
  { value: 'great-vibes', label: 'Great Vibes', family: "'Great Vibes', 'Noto Serif Bengali', cursive" },
  { value: 'satisfy', label: 'Satisfy', family: "'Satisfy', 'Noto Serif Bengali', cursive" },
  { value: 'dancing', label: 'Dancing Script', family: "'Dancing Script', 'Noto Serif Bengali', cursive" },
  { value: 'marck', label: 'Marck Script', family: "'Marck Script', 'Noto Serif Bengali', cursive" },
  { value: 'parisienne', label: 'Parisienne', family: "'Parisienne', 'Noto Serif Bengali', cursive" },
  { value: 'noto-serif-bengali', label: 'Noto Serif Bengali', family: "'Noto Serif Bengali', serif" },
  { value: 'hind-siliguri', label: 'Hind Siliguri', family: "'Hind Siliguri', sans-serif" },
  { value: 'anek-bangla', label: 'Anek Bangla', family: "'Anek Bangla', sans-serif" },
];
const SALUTATIONS = ['My dearest', 'My beloved', 'My darling', 'To my love', 'My sweet', 'Dear', 'My heart'];
const CLOSINGS = ['Forever yours,', 'With all my love,', 'Yours always,', 'Eternally yours,', 'With devotion,', 'All my heart,', 'Until we meet again,'];

function getTodayLetterDate() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function loadDraft(): DraftState | null {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftState;
    if (!parsed?.updatedAt) return null;
    if (Date.now() - parsed.updatedAt > LETTER_UI.draftTtlMs) {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveDraft(draft: DraftState) {
  try {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
  }
}

function isLightFlower(color: string) {
  return ['#d8cfbf', '#dcd6ca', '#e8e1d4', '#ddd6c8', '#e2dbcf'].includes(color.toLowerCase());
}

export function getFontFamilyByChoice(f: FontChoice): string {
  return ALL_FONTS.find(b => b.value === f)?.family || "'EB Garamond', 'Noto Serif Bengali', serif";
}
export function getSigFontFamilyByChoice(f: SignatureFont): string {
  return getFontFamilyByChoice(f);
}

export default function ComposePage({ onLetterCreated, onBack }: ComposePageProps) {
  const savedDraft = loadDraft();

  const [salutation, setSalutation] = useState(savedDraft?.salutation || 'My dearest');
  const [recipient, setRecipient] = useState(savedDraft?.recipient || '');
  const [content, setContent] = useState(savedDraft?.content || '');
  const [closing, setClosing] = useState(savedDraft?.closing || 'Forever yours,');
  const [signature, setSignature] = useState(savedDraft?.signature || '');
  const [sealType, setSealType] = useState<SealType>(savedDraft?.sealType || 'rose');
  const [sealColor, setSealColor] = useState<SealColor>(savedDraft?.sealColor || 'burgundy');
  const [crest, setCrest] = useState<CrestType>(savedDraft?.crest || 'none');
  const [customInitials, setCustomInitials] = useState(savedDraft?.customInitials || '');
  const [letterDate, setLetterDate] = useState(savedDraft?.letterDate || getTodayLetterDate());
  const [bodyFont, setBodyFont] = useState<FontChoice>(savedDraft?.bodyFont || 'eb-garamond');
  const [salutationFont, setSalutationFont] = useState<FontChoice>(savedDraft?.salutationFont || 'eb-garamond');
  const [recipientFont, setRecipientFont] = useState<FontChoice>(savedDraft?.recipientFont || 'eb-garamond');
  const [closingFont, setClosingFont] = useState<FontChoice>(savedDraft?.closingFont || 'eb-garamond');
  const [signatureFont, setSignatureFont] = useState<SignatureFont>(savedDraft?.signatureFont || 'great-vibes');
  const [flowers, setFlowers] = useState<FlowerPlacement[]>(savedDraft?.flowers || []);
  const [isPrivate, setIsPrivate] = useState(savedDraft?.isPrivate || false);
  const [password, setPassword] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'write' | 'seal' | 'decor' | 'style'>('write');
  const [activeFontTarget, setActiveFontTarget] = useState<'editor' | 'salutation' | 'recipient' | 'closing' | 'signature'>('editor');
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(savedDraft?.updatedAt || null);
  const paperRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<RichLetterEditorHandle | null>(null);
  const contentRef = useRef(savedDraft?.content || '');
  const contentSyncTimerRef = useRef<number | null>(null);
  const dragRef = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const dragRafRef = useRef<number | null>(null);
  const pendingPointRef = useRef<{ x: number; y: number } | null>(null);

  usePageMeta({
    title: 'Compose Your Letter — Courier of Hearts',
    description: 'Write a letter on parchment, choose your seal, add flowers, and shape each line with the feeling you want to send.',
  });

  const handleEditorChange = useCallback((next: string) => {
    const clean = sanitizeLetterHtml(next);
    contentRef.current = clean;
    if (contentSyncTimerRef.current != null) window.clearTimeout(contentSyncTimerRef.current);
    contentSyncTimerRef.current = window.setTimeout(() => {
      setContent((prev) => prev === clean ? prev : clean);
    }, 320);
  }, []);

  useEffect(() => {
    return () => {
      if (contentSyncTimerRef.current != null) window.clearTimeout(contentSyncTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const latestContent = contentRef.current || content;
      const nextDraft: DraftState = {
        salutation,
        recipient,
        content: latestContent,
        closing,
        signature,
        sealType,
        sealColor,
        crest,
        customInitials,
        letterDate,
        bodyFont,
        salutationFont,
        recipientFont,
        closingFont,
        signatureFont,
        flowers,
        isPrivate,
        updatedAt: Date.now(),
      };
      saveDraft(nextDraft);
      setDraftSavedAt(nextDraft.updatedAt);
    }, Math.max(3000, LETTER_UI.draftSaveIntervalMs));

    return () => window.clearInterval(timer);
  }, [salutation, recipient, content, closing, signature, sealType, sealColor, crest, customInitials, letterDate, bodyFont, salutationFont, recipientFont, closingFont, signatureFont, flowers, isPrivate]);

  const applyChosenFont = useCallback((font: FontChoice) => {
    const family = getFontFamilyByChoice(font);
    if (activeFontTarget === 'editor') {
      editorRef.current?.focus();
      const applied = editorRef.current?.applyFont(family) || false;
      if (!applied) setBodyFont(font);
      return;
    }
    if (activeFontTarget === 'salutation') {
      setSalutationFont(font);
      return;
    }
    if (activeFontTarget === 'recipient') {
      setRecipientFont(font);
      return;
    }
    if (activeFontTarget === 'closing') {
      setClosingFont(font);
      return;
    }
    setSignatureFont(font);
  }, [activeFontTarget]);

  const addFlower = useCallback((flowerId: string) => {
    if (flowers.length >= LETTER_UI.maxFlowers) {
      setError(`To keep the parchment smooth, flowers are capped at ${LETTER_UI.maxFlowers}.`);
      return;
    }
    setError('');
    setFlowers(prev => [...prev, {
      id: nanoid(6),
      flowerId,
      x: 15 + Math.random() * 70,
      y: 15 + Math.random() * 70,
      size: 46,
      rotation: Math.random() * 40 - 20,
    }]);
  }, [flowers.length]);

  const removeFlower = useCallback((id: string) => {
    setFlowers(prev => prev.filter(f => f.id !== id));
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const f = flowers.find(fl => fl.id === id);
    if (!f) return;
    dragRef.current = { id, startX: e.clientX, startY: e.clientY, origX: f.x, origY: f.y };
    pendingPointRef.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [flowers]);

  const flushDrag = useCallback(() => {
    dragRafRef.current = null;
    if (!dragRef.current || !paperRef.current || !pendingPointRef.current) return;
    const rect = paperRef.current.getBoundingClientRect();
    const dx = ((pendingPointRef.current.x - dragRef.current.startX) / rect.width) * 100;
    const dy = ((pendingPointRef.current.y - dragRef.current.startY) / rect.height) * 100;
    setFlowers(prev => prev.map(f => f.id === dragRef.current!.id ? {
      ...f,
      x: Math.max(2, Math.min(98, dragRef.current!.origX + dx)),
      y: Math.max(3, Math.min(96, dragRef.current!.origY + dy)),
    } : f));
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    pendingPointRef.current = { x: e.clientX, y: e.clientY };
    if (dragRafRef.current == null) dragRafRef.current = window.requestAnimationFrame(flushDrag);
  }, [flushDrag]);

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
    pendingPointRef.current = null;
    if (dragRafRef.current != null) {
      window.cancelAnimationFrame(dragRafRef.current);
      dragRafRef.current = null;
    }
  }, []);

  const handleSend = useCallback(async () => {
    const currentHtml = sanitizeLetterHtml(editorRef.current?.getHtml() || contentRef.current || content);
    const plainText = htmlToPlainText(currentHtml).trim();
    if (!plainText) { setError('Your letter has no words yet.'); return; }
    if (!recipient.trim()) { setError('Who is this letter for?'); return; }
    setContent(currentHtml);
    setError('');
    setSending(true);
    try {
      const payload: CreateLetterPayload = {
        salutation,
        recipient: recipient.trim(),
        content: currentHtml,
        closing,
        signature: signature.trim() || 'With love',
        sealType,
        sealColor,
        crest,
        customInitials: customInitials.trim(),
        letterDate: letterDate.trim() || getTodayLetterDate(),
        bodyFont,
        salutationFont,
        recipientFont,
        closingFont,
        signatureFont,
        flowers,
        isPrivate,
        password: isPrivate ? password : undefined,
      };
      const result = await createLetter(payload);
      if (result.success && result.data) {
        clearDraft();
        onLetterCreated(result.data.slug);
      } else setError(result.error || 'Failed.');
    } catch {
      setError('An error occurred.');
    } finally {
      setSending(false);
    }
  }, [salutation, recipient, content, closing, signature, sealType, sealColor, crest, customInitials, letterDate, bodyFont, salutationFont, recipientFont, closingFont, signatureFont, flowers, isPrivate, password, onLetterCreated]);

  const handlePreview = useCallback(() => {
    const latest = sanitizeLetterHtml(editorRef.current?.getHtml() || contentRef.current || content);
    contentRef.current = latest;
    setContent(latest);
    setShowPreview(true);
  }, [content]);

  const draftLabel = draftSavedAt ? new Date(draftSavedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : null;
  const currentFontChoice = activeFontTarget === 'editor'
    ? bodyFont
    : activeFontTarget === 'salutation'
      ? salutationFont
      : activeFontTarget === 'recipient'
        ? recipientFont
        : activeFontTarget === 'closing'
          ? closingFont
          : signatureFont;

  const fontPanel = (
    <div className={`${activeTab !== 'style' ? 'hidden lg:block' : ''}`}>
      <h3 className="font-heading text-[11px] tracking-[0.18em] text-ink/70 uppercase mb-2">Font</h3>
      <p className="font-body text-[12px] text-ink/45 italic leading-relaxed mb-1">Tap into the body or one of the letter lines, then choose a font — like a small parchment word processor.</p>
      <p className="font-heading text-[9px] tracking-[0.14em] uppercase text-ink/40 mb-3">Applying to {activeFontTarget === 'editor' ? 'body text' : activeFontTarget}</p>
      <div className="space-y-1 mb-5">
        {ALL_FONTS.map(f => (
          <button key={f.value} onMouseDown={(e) => e.preventDefault()} onClick={() => applyChosenFont(f.value)}
            className={`w-full py-2 px-3 text-left text-[15px] rounded-sm transition-all duration-500 ${currentFontChoice === f.value ? 'bg-ink/8 text-ink/90' : 'text-ink/45 hover:text-ink/70 hover:bg-ink/3'}`}
            style={{ fontFamily: f.family }}>{f.label}</button>
        ))}
      </div>
      <h3 className="font-heading text-[11px] tracking-[0.18em] text-ink/70 uppercase mb-3">Salutation</h3>
      <div className="flex flex-wrap gap-1.5 mb-5">
        {SALUTATIONS.map(s => (
          <button key={s} onClick={() => setSalutation(s)}
            className={`py-1.5 px-3 text-[13px] font-body italic rounded-sm transition-all duration-500 ${salutation === s ? 'bg-ink/8 text-ink/90' : 'text-ink/40 hover:text-ink/65 hover:bg-ink/3'}`}>{s}</button>
        ))}
      </div>
      <h3 className="font-heading text-[11px] tracking-[0.18em] text-ink/70 uppercase mb-3">Closing</h3>
      <div className="flex flex-wrap gap-1.5">
        {CLOSINGS.map(c => (
          <button key={c} onClick={() => setClosing(c)}
            className={`py-1.5 px-3 text-[13px] font-body italic rounded-sm transition-all duration-500 ${closing === c ? 'bg-ink/8 text-ink/90' : 'text-ink/40 hover:text-ink/65 hover:bg-ink/3'}`}>{c}</button>
        ))}
      </div>
    </div>
  );

  const accessoryPanel = (
    <div className={`${activeTab !== 'seal' && activeTab !== 'decor' ? 'hidden lg:block' : ''}`}>
      <div className={`${activeTab !== 'decor' ? 'hidden lg:block' : ''} mb-6`}>
        <div className="flex items-center justify-between gap-3 mb-2">
          <h3 className="font-heading text-[11px] tracking-[0.18em] text-ink/70 uppercase">Flower Decorations</h3>
          <span className="font-heading text-[9px] tracking-[0.16em] text-ink/40 uppercase">{flowers.length}/{LETTER_UI.maxFlowers}</span>
        </div>
        <p className="font-body text-[13px] text-ink/55 mb-3 italic">Tap to place, drag to move on the letter.</p>
        <div className="grid grid-cols-4 gap-1.5">
          {ALL_FLOWERS.map(flower => {
            const Comp = flower.Component;
            return (
              <button key={flower.id} onClick={() => addFlower(flower.id)}
                className="flex flex-col items-center gap-0.5 p-2 rounded-sm hover:bg-ink/4 transition-all duration-500" title={flower.name}>
                <Comp size={26} color={flower.defaultColor} /><span className="text-[9px] text-ink/50 text-center leading-tight">{flower.name}</span>
              </button>
            );
          })}
        </div>
        {flowers.length > 0 && <button onClick={() => setFlowers([])} className="w-full mt-3 font-heading text-[10px] uppercase py-2 text-burgundy/60 hover:text-burgundy/90 transition-colors">Remove all</button>}
      </div>

      <div className={`${activeTab !== 'seal' ? 'hidden lg:block' : ''}`}>
        <div className="flex justify-center mb-5"><WaxSealIcon sealType={sealType} sealColor={sealColor} customInitials={customInitials} size={100} /></div>
        <h3 className="font-heading text-[11px] tracking-[0.18em] text-ink/70 uppercase mb-3">Seal Design</h3>
        <div className="grid grid-cols-3 gap-1.5 mb-5">
          {SEAL_TYPES.map(s => (
            <button key={s.value} onClick={() => setSealType(s.value)}
              className={`py-2 text-[13px] font-body rounded-sm transition-all duration-500 ${sealType === s.value ? 'bg-ink/8 text-ink/90 shadow-sm' : 'text-ink/45 hover:text-ink/70 hover:bg-ink/3'}`}>{s.label}</button>
          ))}
        </div>
        <h3 className="font-heading text-[11px] tracking-[0.18em] text-ink/70 uppercase mb-3">Wax Color</h3>
        <div className="flex gap-3 mb-5">
          {SEAL_COLORS.map(c => (
            <button key={c.value} onClick={() => setSealColor(c.value)}
              className={`w-8 h-8 rounded-full border-2 transition-all duration-500 ${sealColor === c.value ? 'border-gold-bright scale-110 shadow-md' : 'border-transparent hover:scale-105'}`}
              style={{ backgroundColor: c.hex }} title={c.label} />
          ))}
        </div>
        <h3 className="font-heading text-[11px] tracking-[0.18em] text-ink/70 uppercase mb-3">Crest</h3>
        <div className="grid grid-cols-3 gap-1.5 mb-5">
          {CREST_TYPES.map(c => (
            <button key={c.value} onClick={() => setCrest(c.value)}
              className={`py-2 text-[13px] font-body rounded-sm transition-all duration-500 ${crest === c.value ? 'bg-ink/8 text-ink/90 shadow-sm' : 'text-ink/45 hover:text-ink/70 hover:bg-ink/3'}`}>{c.label}</button>
          ))}
        </div>
        <h3 className="font-heading text-[11px] tracking-[0.18em] text-ink/70 uppercase mb-3">Custom Initials</h3>
        <input type="text" value={customInitials} onChange={(e) => setCustomInitials(e.target.value.toUpperCase().slice(0, 3))}
          placeholder="e.g. AC" className="parchment-input w-full text-center font-uncial text-xl py-2 mb-5" maxLength={3} />
        <label className="flex items-center gap-3 cursor-pointer mb-5">
          <div className="relative">
            <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} className="sr-only peer" />
            <div className="w-9 h-[18px] bg-ink/10 rounded-full peer-checked:bg-burgundy/50 transition-colors duration-500" />
            <div className="absolute left-0.5 top-[1px] w-4 h-4 bg-parchment-light rounded-full shadow peer-checked:translate-x-[18px] transition-transform duration-500" />
          </div>
          <span className="font-body text-[14px] text-ink/70">Password protect</span>
        </label>
        {isPrivate && <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Secret passphrase..." className="parchment-input w-full font-body text-sm py-2 mb-5" />}
      </div>
    </div>
  );

  if (showPreview) {
    return <LetterPreview salutation={salutation} recipient={recipient} content={content}
      closing={closing} signature={signature || 'With love'} sealType={sealType} sealColor={sealColor}
      crest={crest} customInitials={customInitials} letterDate={letterDate} bodyFont={bodyFont}
      salutationFont={salutationFont} recipientFont={recipientFont} closingFont={closingFont}
      signatureFont={signatureFont} flowers={flowers}
      onBack={() => setShowPreview(false)} onSend={handleSend} sending={sending} />;
  }

  return (
    <div className="min-h-screen parchment-bg">
      <nav className="no-print sticky top-0 z-50 flex items-center justify-between px-4 py-3 md:px-8"
        style={{ background: 'rgba(196,180,142,0.92)', backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(139,115,64,0.12)' }}>
        <button onClick={onBack} className="font-heading text-[11px] tracking-[0.12em] text-ink/60 uppercase hover:text-ink transition-colors duration-500">&larr; Return</button>
        <div className="flex items-center gap-2">
          <HeartSigilIcon size={16} color="#6B1025" />
          <span className="font-heading text-[10px] tracking-[0.2em] text-ink/60 uppercase hidden md:inline">Composing</span>
        </div>
        <button onClick={handlePreview} className="font-heading text-[11px] tracking-[0.12em] text-ink/60 uppercase hover:text-ink transition-colors duration-500">Preview &rarr;</button>
      </nav>

      <div className="max-w-7xl mx-auto px-3 py-6 md:py-10 relative z-10">
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="flex gap-1 lg:hidden overflow-x-auto pb-1">
            {(['write', 'style', 'decor', 'seal'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`font-heading text-[11px] tracking-[0.1em] uppercase py-2.5 px-5 rounded-sm whitespace-nowrap transition-all duration-500 ${activeTab === tab ? 'bg-ink/8 text-ink/90' : 'text-ink/40 hover:text-ink/60'}`}>
                {tab === 'write' ? 'Write' : tab === 'style' ? 'Fonts' : tab === 'decor' ? 'Flowers' : 'Seal'}
              </button>
            ))}
          </div>
          <div className="ml-auto text-right">
            <p className="font-heading text-[9px] tracking-[0.16em] uppercase text-ink/35">Local draft</p>
            <p className="font-body text-[12px] italic text-ink/45">{draftLabel ? `Saved at ${draftLabel}` : 'Saving gently...'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[250px_minmax(0,1fr)_270px] xl:grid-cols-[280px_minmax(620px,760px)_300px] gap-5 lg:gap-7 items-start">
          <aside className="relative z-20 order-2 lg:order-1 lg:sticky lg:top-20 max-h-[calc(100vh-6rem)] lg:overflow-y-auto pr-1 pb-3 lg:pb-0">
            {fontPanel}
          </aside>

          <main className={`order-1 lg:order-2 ${activeTab !== 'write' ? 'hidden lg:block' : ''}`}>
            <div ref={paperRef} className="relative letter-paper rounded-sm"
              style={{ padding: 'clamp(24px, 5vw, 56px)' }}
              onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp}>
              <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden rounded-sm"
                style={{ backgroundImage: `repeating-linear-gradient(to bottom, transparent 0px, transparent 1.85em, rgba(100,80,40,0.06) 1.85em, rgba(100,80,40,0.06) 1.86em)`, backgroundSize: '100% 1.9em', backgroundPosition: '0 56px' }} />
              <div className="absolute top-0 bottom-0 pointer-events-none z-0" style={{ left: 'clamp(20px, 4vw, 48px)', width: '1px', background: 'rgba(140,40,40,0.08)' }} />

              <div className="flex justify-end mb-4 relative z-10">
                <input type="text" value={letterDate} onChange={(e) => setLetterDate(e.target.value)}
                  className="parchment-input font-display text-sm italic py-1 text-right w-full max-w-[290px]"
                  style={{ borderBottomStyle: 'dashed', borderBottomColor: 'rgba(139,115,64,0.18)' }}
                  aria-label="Letter date" />
              </div>

              {customInitials && (
                <div className="text-center mb-2 relative z-10">
                  <span className="font-uncial text-4xl md:text-5xl text-burgundy/40 select-none leading-none tracking-[0.12em]">{customInitials}</span>
                </div>
              )}

              <div className="mb-4 relative z-10 flex flex-wrap items-baseline gap-1">
                <input type="text" value={salutation} onChange={(e) => setSalutation(e.target.value)} onFocus={() => setActiveFontTarget('salutation')}
                  className="parchment-input text-lg italic py-1 w-auto max-w-[160px]"
                  style={{ fontFamily: getFontFamilyByChoice(salutationFont), borderBottomStyle: 'dashed', borderBottomColor: 'rgba(139,115,64,0.2)' }}
                  aria-label="Salutation" />
                <input type="text" value={recipient} onChange={(e) => setRecipient(e.target.value)} onFocus={() => setActiveFontTarget('recipient')}
                  placeholder="their name"
                  className="parchment-input text-xl italic py-1 w-auto min-w-[100px] max-w-[260px]"
                  style={{ fontFamily: getFontFamilyByChoice(recipientFont), borderBottomStyle: 'dashed' }}
                  aria-label="Recipient" />
                <span className="font-display text-lg text-ink/80">,</span>
              </div>

              <OrnamentDivider className="w-24 mx-auto mb-4 opacity-55" color="#8b7340" />

              <div className="relative z-10 mb-6">
                <RichLetterEditor
                  ref={editorRef}
                  initialHtml={content}
                  placeholder={'Write from the depths of your heart...\n\nLet the ink carry what your voice cannot.'}
                  onFocus={() => setActiveFontTarget('editor')}
                  onChange={handleEditorChange}
                  className="rich-letter-editor parchment-input w-full ink-engraved"
                  style={{
                    fontFamily: getFontFamilyByChoice(bodyFont),
                    fontSize: `clamp(${LETTER_UI.bodyFontSize}px, 1.2vw + 13px, ${LETTER_UI.bodyFontSizeMd}px)`,
                    lineHeight: `${LETTER_UI.lineHeight}em`,
                    letterSpacing: '0.01em',
                    wordSpacing: '0.05em',
                    minHeight: 'min(56vh, 440px)',
                    paddingTop: '0.5rem',
                    paddingBottom: '0.5rem',
                  }}
                />
              </div>

              <OrnamentDivider className="w-16 mx-auto mb-4 opacity-35" color="#8b7340" />

              <div className="text-right relative z-10 space-y-2">
                <div>
                  <input type="text" value={closing} onChange={(e) => setClosing(e.target.value)} onFocus={() => setActiveFontTarget('closing')}
                    className="parchment-input text-base py-1 text-right w-auto max-w-[220px] inline-block"
                    style={{ fontFamily: getFontFamilyByChoice(closingFont), borderBottomStyle: 'dashed', borderBottomColor: 'rgba(139,115,64,0.2)' }}
                    aria-label="Closing" />
                </div>
                <div>
                  <input type="text" value={signature} onChange={(e) => setSignature(e.target.value)} onFocus={() => setActiveFontTarget('signature')}
                    placeholder="your name"
                    className="parchment-input text-2xl py-1 text-right w-auto min-w-[100px] max-w-[260px] inline-block"
                    style={{ fontFamily: getSigFontFamilyByChoice(signatureFont), borderBottomStyle: 'dashed' }}
                    aria-label="Signature" />
                </div>
              </div>

              {flowers.map(f => {
                const def = ALL_FLOWERS.find(fl => fl.id === f.flowerId); if (!def) return null;
                const Comp = def.Component;
                return (
                  <div key={f.id} className="absolute z-20 cursor-grab active:cursor-grabbing group touch-none select-none"
                    style={{ left: `${f.x}%`, top: `${f.y}%`, transform: `translate(-50%,-50%) rotate(${f.rotation}deg)`, willChange: 'transform' }}
                    onPointerDown={(e) => handlePointerDown(e, f.id)}>
                    <div className="transition-opacity duration-500"
                      style={{
                        opacity: LETTER_UI.composeFlowerOpacity,
                        filter: isLightFlower(def.defaultColor) ? 'drop-shadow(0 0.5px 0 rgba(90,65,25,0.45))' : 'none',
                      }}>
                      <Comp size={f.size} color={def.defaultColor} />
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); removeFlower(f.id); }}
                      className="absolute -top-2.5 -right-2.5 w-6 h-6 bg-burgundy/80 text-parchment-light rounded-full text-[11px] leading-none opacity-80 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center shadow-sm">&times;</button>
                  </div>
                );
              })}
            </div>
          </main>

          <aside className={`relative z-20 order-3 lg:sticky lg:top-20 max-h-[calc(100vh-6rem)] lg:overflow-y-auto pr-1 pb-5 lg:pb-0 ${activeTab === 'style' ? 'hidden lg:block' : ''}`}>
            {accessoryPanel}
            <div className="space-y-2 z-30 mt-6 pb-4 lg:pb-0">
              {error && <p className="font-body text-[14px] text-burgundy text-center italic">{error}</p>}
              <button onClick={handleSend} disabled={sending}
                className="w-full font-heading text-[11px] tracking-[0.18em] uppercase py-4 bg-ink text-parchment-light rounded-sm transition-all duration-500 hover:bg-ink-light disabled:opacity-40 flex items-center justify-center gap-2.5"
                style={{ boxShadow: '0 3px 15px rgba(0,0,0,0.25)' }}>
                <QuillIcon size={14} color="#d4c5a0" />{sending ? 'Sealing...' : 'Seal & Send'}
              </button>
              <button onClick={handlePreview}
                className="w-full font-heading text-[10px] tracking-[0.15em] uppercase py-3 text-ink/55 hover:text-ink/80 transition-colors duration-500">Preview Letter</button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
