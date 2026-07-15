import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';
import { $patchStyleText } from '@lexical/selection';
import { $createParagraphNode, $getRoot, $getSelection, $isRangeSelection, type EditorState, type LexicalEditor } from 'lexical';
import { sanitizeLetterHtml } from '@/utils/sanitizeHtml';

export interface RichLetterEditorHandle {
  focus: () => void;
  applyFont: (fontFamily: string) => boolean;
  getHtml: () => string;
}

interface RichLetterEditorProps {
  initialHtml: string;
  placeholder: string;
  className: string;
  style?: React.CSSProperties;
  onChange: (html: string) => void;
  onFocus?: () => void;
}

function normalizeEditorHtml(html: string): string {
  const clean = sanitizeLetterHtml(html);
  return clean === '<p><br></p>' ? '' : clean;
}

function InitialContentPlugin({ initialHtml }: { initialHtml: string }) {
  const [editor] = useLexicalComposerContext();
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    editor.update(() => {
      const root = $getRoot();
      root.clear();

      const safeHtml = normalizeEditorHtml(initialHtml);
      if (!safeHtml) {
        root.append($createParagraphNode());
        return;
      }

      const parser = new DOMParser();
      const dom = parser.parseFromString(`<div>${safeHtml}</div>`, 'text/html');
      const nodes = $generateNodesFromDOM(editor, dom);
      if (nodes.length === 0) {
        root.append($createParagraphNode());
        return;
      }
      root.append(...nodes);
    });
  }, [editor, initialHtml]);

  return null;
}

function EditorBridge({ onReady }: { onReady: (editor: LexicalEditor) => void }) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => onReady(editor), [editor, onReady]);
  return null;
}

function serializeHtml(editorState: EditorState, editor: LexicalEditor) {
  let html = '';
  editorState.read(() => {
    html = normalizeEditorHtml($generateHtmlFromNodes(editor, null));
  });
  return html;
}

const RichLetterEditor = forwardRef<RichLetterEditorHandle, RichLetterEditorProps>(function RichLetterEditor(
  { initialHtml, placeholder, className, style, onChange, onFocus },
  ref,
) {
  const [editor, setEditor] = useState<LexicalEditor | null>(null);

  const initialConfig = useMemo(() => ({
    namespace: 'courier-of-hearts-editor',
    onError(error: Error) {
      throw error;
    },
    theme: {
      paragraph: '',
      text: {
        bold: 'font-semibold',
        italic: 'italic',
        underline: 'underline',
      },
    },
  }), []);

  useImperativeHandle(ref, () => ({
    focus() {
      editor?.focus();
    },
    applyFont(fontFamily: string) {
      if (!editor) return false;
      let applied = false;
      editor.focus(() => {
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            $patchStyleText(selection, { 'font-family': fontFamily });
            applied = true;
          }
        });
      });
      return applied;
    },
    getHtml() {
      if (!editor) return normalizeEditorHtml(initialHtml);
      return serializeHtml(editor.getEditorState(), editor);
    },
  }), [editor, initialHtml]);

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <EditorBridge onReady={setEditor} />
      <InitialContentPlugin initialHtml={initialHtml} />
      <RichTextPlugin
        contentEditable={<ContentEditable className={className} style={style} aria-label="Letter content" onFocus={onFocus} />}
        placeholder={
          <div className="pointer-events-none absolute left-0 top-0 whitespace-pre-wrap text-[inherit] italic text-ink/40" style={style}>
            {placeholder}
          </div>
        }
        ErrorBoundary={LexicalErrorBoundary}
      />
      <HistoryPlugin />
      <OnChangePlugin ignoreSelectionChange={false} onChange={(editorState, lexicalEditor) => {
        onChange(serializeHtml(editorState, lexicalEditor));
      }} />
    </LexicalComposer>
  );
});

export default RichLetterEditor;
