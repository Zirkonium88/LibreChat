## Summary

Adds rich text (HTML) support to the clipboard copy button. When users copy a message and paste it into rich text editors like **Microsoft Word** or **Microsoft Teams**, the content now renders with proper formatting (headers, bold, lists, tables, code blocks) instead of raw markdown.

Closes #13973

## Changes

- **`client/src/utils/markdownToHtml.ts`** — Converts markdown to HTML using `marked` with GFM support
- **`client/src/utils/copyRichText.ts`** — Writes both `text/plain` and `text/html` to clipboard via `navigator.clipboard.write()`; falls back to plain text if the Clipboard API is unavailable
- **`client/src/hooks/Messages/useCopyToClipboard.ts`** — Replaced `copy-to-clipboard` calls with `copyRichText` for dual-format clipboard writes
- **`client/package.json`** — Added `marked@^14.0.0` dependency

## How it works

The existing copy button behavior is preserved — same button, same UX. The clipboard now contains two formats:

| Format | Used by |
|--------|---------|
| `text/plain` | Terminal, plain text editors, markdown-aware apps |
| `text/html` | Word, Teams, Outlook, Google Docs, Notion |

The target app picks whichever format it supports. Word/Teams automatically use the HTML version.

## Testing

### Local Docker build

```bash
docker compose up -d --build
```

This uses the `docker-compose.override.yaml` to build from source locally.

### Manual testing

1. Send a message with markdown content (headers, bold, code blocks, lists, tables)
2. Click the copy button on the assistant's response
3. Paste into Microsoft Word or Teams → content renders with proper formatting
4. Paste into a plain text editor → raw markdown is preserved
5. Test in a browser without Clipboard API permissions → falls back to plain text copy gracefully

### Edge cases

- Messages with citations/search results — verified citations are preserved in both formats
- Simple URL copies (share button, API keys) — still work as expected
- Browsers without `navigator.clipboard.write` support — graceful fallback to plain text
