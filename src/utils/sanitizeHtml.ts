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
  'serif',
  'cursive',
];

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

function sliceNode(node: Node, state: { remaining: number }): string {
  if (state.remaining <= 0) return '';

  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || '';
    const part = text.slice(0, state.remaining);
    state.remaining -= part.length;
    return escapeHtml(part);
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return '';

  const element = node as HTMLElement;
  const tag = element.tagName.toLowerCase();

  if (tag === 'br') {
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

export function sliceRichLetterHtml(html: string, characterCount: number): string {
  if (!html || characterCount <= 0) return '';
  if (!isBrowser()) return escapeHtml(html.replace(/<[^>]+>/g, '').slice(0, characterCount));

  const el = document.createElement('div');
  el.innerHTML = sanitizeLetterHtml(html);
  const state = { remaining: characterCount };
  let out = '';

  for (const child of Array.from(el.childNodes)) {
    if (state.remaining <= 0) break;
    out += sliceNode(child, state);
  }

  return out;
}
