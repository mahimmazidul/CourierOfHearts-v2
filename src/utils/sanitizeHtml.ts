const ALLOWED_TAGS = new Set(['B', 'I', 'EM', 'STRONG', 'U', 'BR', 'DIV', 'P', 'SPAN', 'FONT']);
const ALLOWED_FONTS = [
  'EB Garamond',
  'Cormorant Garamond',
  'Crimson Pro',
  'MedievalSharp',
  'Uncial Antiqua',
  'Almendra',
  'Great Vibes',
  'Satisfy',
  'Dancing Script',
  'Marck Script',
  'Parisienne',
  'Noto Serif Bengali',
  'Hind Siliguri',
  'Anek Bangla',
  'serif',
  'cursive',
  'sans-serif',
];

const SVG_ICON_MAP: Record<string, { tone: 'heart' | 'ivory' | 'gold' | 'ink'; svg: string }> = {
  '❤️': { tone: 'heart', svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.3c-4.8-3.5-8.4-6.6-8.4-11A4.7 4.7 0 0 1 8.4 4.6c1.5 0 2.8.7 3.6 1.9.8-1.2 2.1-1.9 3.6-1.9a4.7 4.7 0 0 1 4.8 4.7c0 4.4-3.6 7.5-8.4 11Z" fill="currentColor"/></svg>' },
  '❤': { tone: 'heart', svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.3c-4.8-3.5-8.4-6.6-8.4-11A4.7 4.7 0 0 1 8.4 4.6c1.5 0 2.8.7 3.6 1.9.8-1.2 2.1-1.9 3.6-1.9a4.7 4.7 0 0 1 4.8 4.7c0 4.4-3.6 7.5-8.4 11Z" fill="currentColor"/></svg>' },
  '♥️': { tone: 'heart', svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.3c-4.8-3.5-8.4-6.6-8.4-11A4.7 4.7 0 0 1 8.4 4.6c1.5 0 2.8.7 3.6 1.9.8-1.2 2.1-1.9 3.6-1.9a4.7 4.7 0 0 1 4.8 4.7c0 4.4-3.6 7.5-8.4 11Z" fill="currentColor"/></svg>' },
  '🤍': { tone: 'ivory', svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.3c-4.8-3.5-8.4-6.6-8.4-11A4.7 4.7 0 0 1 8.4 4.6c1.5 0 2.8.7 3.6 1.9.8-1.2 2.1-1.9 3.6-1.9a4.7 4.7 0 0 1 4.8 4.7c0 4.4-3.6 7.5-8.4 11Z" fill="currentColor" stroke="rgba(88,60,20,0.3)" stroke-width="0.8"/></svg>' },
  '💌': { tone: 'gold', svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.8 7.4 12 12.9l8.2-5.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><rect x="3.4" y="6.2" width="17.2" height="11.7" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M9.4 5.3c0-1.2.9-2.1 2-2.1.8 0 1.4.4 1.8 1 .4-.6 1-1 1.8-1 1.1 0 2 .9 2 2.1 0 1.7-1.5 2.9-3.8 4.6-2.3-1.7-3.8-2.9-3.8-4.6Z" fill="currentColor" opacity="0.85"/></svg>' },
  '🌹': { tone: 'heart', svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6.2c.9-1.5 2.8-2 4.1-1.1.5 1.5.1 3.1-1 4.1.8 1 1 2.4.4 3.6-.8 1.8-3.2 2.7-5 1.8-1.7-.8-2.5-2.8-1.8-4.5-.9-.7-1.4-1.9-1.2-3.1.3-1.9 2.2-3.1 4.5-2.7Z" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M12 13.3v6.1" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><path d="M12 17.1c-1 .1-1.7.4-2.4 1" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"/></svg>' },
  '🌷': { tone: 'heart', svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4.8c-1.8 1-3.4 3.2-3.4 5.3 0 2 1.4 3.5 3.4 3.5s3.4-1.5 3.4-3.5c0-2.1-1.6-4.3-3.4-5.3Z" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M12 13.6v6.2" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><path d="M12 16.3c1.1-.4 1.8-.3 2.6.2" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"/></svg>' },
  '🌸': { tone: 'ivory', svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5c1.2-1.3 3.1-1.5 4.3-.4 1.1 1 .9 2.5.1 3.9 1.5-.4 2.9 0 3.5 1.3.8 1.5 0 3.2-1.8 3.8-1.4.5-2.7.2-3.8-.6.3 1.5-.1 2.9-1.4 3.5-1.6.8-3.2-.1-3.8-1.8-.4-1.1-.2-2.4.5-3.4-1.3.2-2.5 0-3.3-.9-1.2-1.2-1-3 .3-4 1-.8 2.4-.9 3.8-.2-.5-1.5-.2-2.9.8-3.7 1.3-1.1 3.1-.8 4 .5Z" fill="none" stroke="currentColor" stroke-width="1.2"/><circle cx="12" cy="12" r="1.8" fill="currentColor" opacity="0.75"/></svg>' },
  '✨': { tone: 'gold', svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.6 14.2 9 20 11.2 14.2 13.4 12 18.8 9.8 13.4 4 11.2 9.8 9Z" fill="currentColor" opacity="0.95"/><path d="M18.4 4.2 19.2 6l1.8.8-1.8.8-.8 1.8-.8-1.8-1.8-.8 1.8-.8Z" fill="currentColor" opacity="0.78"/></svg>' },
  '⭐': { tone: 'gold', svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3.8 2.3 4.7 5.2.8-3.7 3.6.9 5.1L12 15.5 7.3 18l.9-5.1-3.7-3.6 5.2-.8Z" fill="currentColor"/></svg>' },
  '🌙': { tone: 'ink', svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16.7 4.7a7.8 7.8 0 1 0 2.6 14.9 8.8 8.8 0 1 1-2.6-14.9Z" fill="currentColor"/></svg>' },
};

const TEXT_EMOJI_MAP: Record<string, string> = {
  '🙂': ':)',
  '😊': '✿',
  '☺️': '✿',
  '😍': '♡',
  '😘': '❦',
  '🥺': '…',
  '😢': ":'(",
  '😭': ":'((",
  '☹️': ':((',
  '🙁': ':(',
  '💖': '♡',
  '💕': '♡',
  '💗': '♡',
  '💘': '♡',
  '💝': '♡',
  '💞': '♡',
  '💐': '❀',
  '🌼': '❀',
  '🌻': '✺',
};

const EMOJI_KEYS = [...Object.keys(SVG_ICON_MAP), ...Object.keys(TEXT_EMOJI_MAP)].sort((a, b) => b.length - a.length);
const EMOJI_REGEX = new RegExp(EMOJI_KEYS.map(escapeRegExp).join('|'), 'gu');

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof DOMParser !== 'undefined';
}

function cleanFontFamily(value: string): string {
  const parts = value
    .split(',')
    .map((part) => part.replace(/["']/g, '').trim())
    .filter((part) => ALLOWED_FONTS.includes(part));
  return parts.length ? parts.map((part) => part.includes(' ') ? `'${part}'` : part).join(', ') : '';
}

function cleanNode(node: Node, doc: Document): Node | null {
  if (node.nodeType === Node.TEXT_NODE) return doc.createTextNode(node.textContent || '');
  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const element = node as HTMLElement;
  if (!ALLOWED_TAGS.has(element.tagName)) {
    const fragment = doc.createDocumentFragment();
    element.childNodes.forEach((child) => {
      const cleaned = cleanNode(child, doc);
      if (cleaned) fragment.appendChild(cleaned);
    });
    return fragment;
  }

  const safe = doc.createElement(element.tagName.toLowerCase());

  const fontFamily = cleanFontFamily(
    element.style.fontFamily || element.getAttribute('face') || ''
  );
  if (fontFamily) safe.setAttribute('style', `font-family: ${fontFamily};`);

  element.childNodes.forEach((child) => {
    const cleaned = cleanNode(child, doc);
    if (cleaned) safe.appendChild(cleaned);
  });

  return safe;
}

export function sanitizeLetterHtml(html: string): string {
  if (!html) return '';
  if (!isBrowser()) return html;

  const parser = new DOMParser();
  const parsed = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  const output = document.implementation.createHTMLDocument('safe-letter');
  const container = output.createElement('div');

  parsed.body.firstElementChild?.childNodes.forEach((child) => {
    const cleaned = cleanNode(child, output);
    if (cleaned) container.appendChild(cleaned);
  });

  return container.innerHTML;
}

export function hasRichLetterHtml(content: string): boolean {
  return /<\/?(?:span|font|div|p|br|b|i|em|strong|u)\b/i.test(content);
}

export function htmlToPlainText(content: string): string {
  if (!content) return '';
  if (!isBrowser()) return content.replace(/<[^>]+>/g, ' ').trim();
  const el = document.createElement('div');
  el.innerHTML = sanitizeLetterHtml(content);

  // Improved plain text conversion to include spaces between block elements
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let text = '';
  let current = walker.nextNode();
  while (current) {
    if (current.nodeType === Node.TEXT_NODE) {
      text += current.textContent || '';
    } else {
      const tag = (current as HTMLElement).tagName;
      if (tag === 'BR' || tag === 'P' || tag === 'DIV') {
        if (text && !text.endsWith('\n')) text += '\n';
      }
    }
    current = walker.nextNode();
  }
  return text.trim();
}

export function escapeLetterHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeHtml(text: string): string {
  return escapeLetterHtml(text);
}

export function plainTextToLetterHtml(text: string): string {
  return escapeLetterHtml(text).replace(/\n/g, '<br>');
}

function htmlLengthFromNode(node: Node): number {
  if (node.nodeType === Node.TEXT_NODE) return (node.textContent || '').length;
  if (node.nodeType !== Node.ELEMENT_NODE) return 0;
  const element = node as HTMLElement;
  const tag = element.tagName;
  if (tag === 'BR' || tag === 'P' || tag === 'DIV') {
    // Treat block elements and BR as 1 character (like a newline)
    return 1 + Array.from(element.childNodes).reduce((sum, child) => sum + htmlLengthFromNode(child), 0);
  }
  return Array.from(element.childNodes).reduce((sum, child) => sum + htmlLengthFromNode(child), 0);
}

export function richHtmlTextLength(html: string): number {
  if (!html) return 0;
  if (!isBrowser()) return Array.from(html.replace(/<[^>]+>/g, '')).length;
  const el = document.createElement('div');
  el.innerHTML = sanitizeLetterHtml(html);
  return Array.from(htmlToPlainText(el.innerHTML)).length;
}

function sliceNode(node: Node, state: { skip: number; remaining: number }): string {
  if (state.remaining <= 0) return '';

  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || '';
    const units = Array.from(text);
    if (state.skip >= units.length) {
      state.skip -= units.length;
      return '';
    }
    const start = state.skip;
    const available = units.slice(start, start + state.remaining);
    state.skip = 0;
    state.remaining -= available.length;
    return escapeHtml(available.join(''));
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return '';

  const element = node as HTMLElement;
  const tag = element.tagName.toLowerCase();

  if (tag === 'br' || tag === 'p' || tag === 'div') {
    if (state.skip > 0) {
      state.skip -= 1;
    } else {
      if (state.remaining <= 0) return '';
      state.remaining -= 1;
      if (tag === 'br') return '<br>';
    }
  }

  let children = '';
  for (const child of Array.from(element.childNodes)) {
    if (state.remaining <= 0) break;
    children += sliceNode(child, state);
  }

  if (!children && tag !== 'br') return '';

  const style = element.getAttribute('style');
  const styleAttr = style ? ` style="${escapeHtml(style)}"` : '';
  if (tag === 'br') return '<br>';
  return `<${tag}${styleAttr}>${children}</${tag}>`;
}

export function sliceRichLetterHtmlRange(html: string, start: number, end: number): string {
  if (!html || end <= start) return '';
  if (!isBrowser()) return escapeHtml(html.replace(/<[^>]+>/g, '').slice(start, end));

  const el = document.createElement('div');
  el.innerHTML = sanitizeLetterHtml(html);
  const state = { skip: Math.max(0, start), remaining: Math.max(0, end - start) };
  let out = '';

  for (const child of Array.from(el.childNodes)) {
    if (state.remaining <= 0) break;
    out += sliceNode(child, state);
  }

  return out;
}

export function sliceRichLetterHtml(html: string, characterCount: number): string {
  return sliceRichLetterHtmlRange(html, 0, characterCount);
}

function safeSlice(text: string, start: number, end: number): string {
  if (typeof Intl !== 'undefined' && (Intl as any).Segmenter) {
    const segmenter = new (Intl as any).Segmenter();
    const segments = Array.from(segmenter.segment(text));
    return segments.slice(start, end).map((s: any) => s.segment).join('');
  }
  // Fallback for environments without Segmenter
  return Array.from(text).slice(start, end).join('');
}

export function splitPlainTextIntoPages(text: string, charsPerPage = 650): string[] {
  if (!text) return [''];
  
  // Use Array.from to correctly handle multi-code-unit characters as single units
  const units = Array.from(text);
  if (units.length <= charsPerPage) return [text];

  const pages: string[] = [];
  let remaining = units;

  while (remaining.length > 0) {
    if (remaining.length <= charsPerPage) {
      pages.push(remaining.join(''));
      break;
    }

    const chunk = remaining.slice(0, charsPerPage).join('');
    const nextOffset = findPageBreakOffset(chunk, remaining.slice(charsPerPage).join(''), charsPerPage);
    
    // nextOffset is relative to the start of remaining
    const cut = remaining.slice(0, nextOffset);
    pages.push(cut.join(''));
    
    remaining = remaining.slice(nextOffset);
    // Trim leading whitespace for the next page, but be careful not to remove meaning
    while (remaining.length > 0 && (remaining[0] === ' ' || remaining[0] === '\n')) {
      remaining = remaining.slice(1);
    }
    
    if (pages.length > 20) break; // Safety break
  }

  return pages.length ? pages : [''];
}

function findPageBreakOffset(chunk: string, after: string, charsPerPage: number): number {
  const units = Array.from(chunk);
  const len = units.length;
  const searchRange = Math.floor(len * 0.5);
  const startSearch = len - searchRange;

  const points = [
    { p: '\n\n', w: 100 },
    { p: '\n', w: 80 },
    // Bangla punctuation (highest priority for Bangla text)
    { p: '। ', w: 95 },
    { p: '।', w: 90 },
    { p: '॥ ', w: 95 },
    { p: '॥', w: 90 },
    { p: '၊ ', w: 85 },
    { p: '၊', w: 80 },
    { p: '؛ ', w: 85 },
    { p: '؛', w: 80 },
    { p: 'ঃ ', w: 80 },
    { p: 'ঃ', w: 75 },
    // Latin punctuation
    { p: '. ', w: 75 },
    { p: '.', w: 65 },
    { p: '! ', w: 65 },
    { p: '? ', w: 65 },
    { p: ': ', w: 60 },
    { p: '; ', w: 60 },
    { p: ', ', w: 50 },
    { p: ' ', w: 40 },
  ];

  let bestIndex = -1;
  let highestWeight = -1;

  for (const { p, w } of points) {
    const idx = chunk.lastIndexOf(p);
    if (idx !== -1) {
      // Find the character index (not byte index)
      const charIndex = Array.from(chunk.slice(0, idx)).length;
      if (charIndex >= startSearch) {
        const posWeight = ((charIndex - startSearch) / searchRange) * 30;
        const totalWeight = w + posWeight;
        if (totalWeight > highestWeight) {
          highestWeight = totalWeight;
          bestIndex = charIndex + Array.from(p).length;
        }
      }
    }
  }

  if (bestIndex !== -1) return bestIndex;

  // Fallback 1: Last space anywhere in the chunk
  const lastSpaceIdx = chunk.lastIndexOf(' ');
  if (lastSpaceIdx > 0) {
    return Array.from(chunk.slice(0, lastSpaceIdx)).length + 1;
  }

  // Fallback 2: Look forward to the next space (avoid breaking word)
  const firstSpaceAfter = after.indexOf(' ');
  if (firstSpaceAfter !== -1) {
    if (firstSpaceAfter < 150) {
       return len + Array.from(after.slice(0, firstSpaceAfter)).length + 1;
    }
  } else if (after.length > 0 && after.length < 150) {
    // No more spaces, but the remaining text is short, so just take it all
    return len + Array.from(after).length;
  }

  // Fallback 3: Hard cut
  return len;
}

export function splitRichLetterHtmlIntoPages(html: string, charsPerPage = 650): string[] {
  const safeHtml = sanitizeLetterHtml(html);
  const plain = htmlToPlainText(safeHtml);
  if (!safeHtml || Array.from(plain).length <= charsPerPage) return [safeHtml || ''];

  const plainPages = splitPlainTextIntoPages(plain, charsPerPage);
  const pages: string[] = [];
  let currentPlainOffset = 0;

  for (const pageText of plainPages) {
    const len = Array.from(pageText).length;
    const sliced = sliceRichLetterHtmlRange(safeHtml, currentPlainOffset, currentPlainOffset + len);
    if (sliced) pages.push(sliced);
    currentPlainOffset += len;
    
    // Skip spaces/newlines in the rich HTML to match splitPlainTextIntoPages' trimStart
    const plainUnits = Array.from(plain);
    while (currentPlainOffset < plainUnits.length && (plainUnits[currentPlainOffset] === ' ' || plainUnits[currentPlainOffset] === '\n')) {
      currentPlainOffset++;
    }
  }

  return pages.length ? pages : [safeHtml || ''];
}

function createEmojiNode(doc: Document, token: string): Node[] {
  const svg = SVG_ICON_MAP[token];
  if (svg) {
    const span = doc.createElement('span');
    span.className = 'emoji-sigil';
    span.setAttribute('data-tone', svg.tone);
    span.setAttribute('aria-hidden', 'true');
    span.innerHTML = svg.svg;
    return [span];
  }

  const textValue = TEXT_EMOJI_MAP[token];
  if (!textValue) return [doc.createTextNode(token)];
  const span = doc.createElement('span');
  span.className = 'emoji-aside';
  span.textContent = textValue;
  return [span];
}

function replaceEmojiInTextNode(node: Text, doc: Document): Node[] {
  const value = node.textContent || '';
  EMOJI_REGEX.lastIndex = 0;
  if (!EMOJI_REGEX.test(value)) return [doc.createTextNode(value)];
  EMOJI_REGEX.lastIndex = 0;

  const nodes: Node[] = [];
  let lastIndex = 0;

  for (const match of value.matchAll(EMOJI_REGEX)) {
    const index = match.index ?? 0;
    const token = match[0];
    if (index > lastIndex) nodes.push(doc.createTextNode(value.slice(lastIndex, index)));
    nodes.push(...createEmojiNode(doc, token));
    lastIndex = index + token.length;
  }

  if (lastIndex < value.length) nodes.push(doc.createTextNode(value.slice(lastIndex)));
  return nodes;
}

export function decorateLetterHtml(html: string): string {
  if (!html) return '';
  if (!isBrowser()) return html;

  const parser = new DOMParser();
  const parsed = parser.parseFromString(`<div>${sanitizeLetterHtml(html)}</div>`, 'text/html');
  const root = parsed.body.firstElementChild as HTMLElement | null;
  if (!root) return '';

  const textNodes: Text[] = [];
  const walker = parsed.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    if ((current.textContent || '').trim()) textNodes.push(current as Text);
    current = walker.nextNode();
  }

  textNodes.forEach((textNode) => {
    const replacements = replaceEmojiInTextNode(textNode, parsed);
    if (replacements.length === 1 && replacements[0].nodeType === Node.TEXT_NODE && replacements[0].textContent === (textNode.textContent || '')) return;
    const fragment = parsed.createDocumentFragment();
    replacements.forEach((node) => fragment.appendChild(node));
    textNode.parentNode?.replaceChild(fragment, textNode);
  });

  return root.innerHTML;
}

export function decoratePlainLetterText(text: string): string {
  return decorateLetterHtml(plainTextToLetterHtml(text));
}
