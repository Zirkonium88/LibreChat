import copy from 'copy-to-clipboard';
import { markdownToHtml } from '~/utils/markdownToHtml';

/**
 * Copies text to clipboard in both plain text and rich text (HTML) formats.
 * Rich text allows proper rendering when pasting into Word, Teams, etc.
 * Falls back to plain text only if the Clipboard API is unavailable.
 */
export async function copyRichText(text: string): Promise<boolean> {
  const html = markdownToHtml(text);

  if (navigator.clipboard?.write) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/plain': new Blob([text], { type: 'text/plain' }),
          'text/html': new Blob([html], { type: 'text/html' }),
        }),
      ]);
      return true;
    } catch {
      // Fall through to legacy copy
    }
  }

  return copy(text, { format: 'text/plain' });
}
