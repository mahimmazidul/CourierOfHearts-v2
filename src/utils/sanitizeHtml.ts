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
  if (!isBrowser()) return content.replace(/<[^>]+>/g, ' ');
  const el = document.createElement('div');
  el.innerHTML = sanitizeLetterHtml(content);
  return el.textContent || '';
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
  if (element.tagName === 'BR') return 1;
  return Array.from(element.childNodes).reduce((sum, child) => sum + htmlLengthFromNode(child), 0);
}

export function richHtmlTextLength(html: string): number {
  if (!html) return 0;
  if (!isBrowser()) return html.replace(/<[^>]+>/g, '').length;
  const el = document.createElement('div');
  el.innerHTML = sanitizeLetterHtml(html);
  return Array.from(el.childNodes).reduce((sum, child) => sum + htmlLengthFromNode(child), 0);
}

function sliceNode(node: Node, state: { skip: number; remaining: number }): string {
  if (state.remaining <= 0) return '';

  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || '';
    if (state.skip >= text.length) {
      state.skip -= text.length;
      return '';
    }
    const start = state.skip;
    const available = text.slice(start, start + state.remaining);
    state.skip = 0;
    state.remaining -= available.length;
    return escapeHtml(available);
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return '';

  const element = node as HTMLElement;
  const tag = element.tagName.toLowerCase();

  if (tag === 'br') {
    if (state.skip > 0) {
      state.skip -= 1;
      return '';
    }
    if (state.remaining <= 0) return '';
    state.remaining -= 1;
    return '<br>';
  }

  let children = '';
  for (const child of Array.from(element.childNodes)) {
    if (state.remaining <= 0) break;
    children += sliceNode(child, state);
  }

  if (!children) return '';

  const style = element.getAttribute('style');
  const styleAttr = style ? ` style="${escapeHtml(style)}"` : '';
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

function findPageBreakOffset(text: string, charsPerPage: number): number {
  let bp = text.lastIndexOf('\n\n', charsPerPage);
  if (bp < charsPerPage * 0.4) bp = text.lastIndexOf('\n', charsPerPage);
  if (bp < charsPerPage * 0.4) bp = text.lastIndexOf('. ', charsPerPage);
  if (bp < charsPerPage * 0.35) bp = text.lastIndexOf('! ', charsPerPage);
  if (bp < charsPerPage * 0.35) bp = text.lastIndexOf('? ', charsPerPage);
  if (bp < charsPerPage * 0.25) bp = text.lastIndexOf(' ', charsPerPage);
  if (bp <= 0) bp = charsPerPage;
  return bp + 1;
}

export function splitPlainTextIntoPages(text: string, charsPerPage = 900): string[] {
  if (!text || text.length <= charsPerPage) return [text || ''];
  const pages: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= charsPerPage) {
      pages.push(remaining);
      break;
    }
    const nextOffset = findPageBreakOffset(remaining, charsPerPage);
    pages.push(remaining.slice(0, nextOffset));
    remaining = remaining.slice(nextOffset).trimStart();
    if (!remaining) break;
  }

  return pages.length ? pages : [''];
}

export function splitRichLetterHtmlIntoPages(html: string, charsPerPage = 900): string[] {
  const safeHtml = sanitizeLetterHtml(html);
  const plain = htmlToPlainText(safeHtml);
  const totalChars = plain.length;
  if (!safeHtml || totalChars <= charsPerPage) return [safeHtml || ''];

  const ranges: Array<[number, number]> = [];
  let working = plain;
  let offset = 0;

  while (working.length > 0) {
    if (working.length <= charsPerPage) {
      ranges.push([offset, offset + working.length]);
      break;
    }
    const localEnd = findPageBreakOffset(working, charsPerPage);
    ranges.push([offset, offset + localEnd]);
    offset += localEnd;
    working = working.slice(localEnd).trimStart();
    while (plain[offset] === ' ' || plain[offset] === '\n') offset += 1;
  }

  const pages = ranges.map(([start, end]) => sliceRichLetterHtmlRange(safeHtml, start, end)).filter(Boolean);
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
