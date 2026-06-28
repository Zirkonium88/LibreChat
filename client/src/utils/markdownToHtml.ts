import { marked } from 'marked';

/**
 * Converts markdown text to HTML suitable for pasting into rich text editors
 * like Microsoft Word and Teams.
 */
export function markdownToHtml(markdown: string): string {
  return marked.parse(markdown, { async: false, gfm: true }) as string;
}
