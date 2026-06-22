# [Bug]: .eml file upload fails - unsupported file type

## Have you provided all of the information needed to evaluate this bug report?

- [x] Yes

## Confirm this is not a question or a feature request

- [x] This is a bug report

## What happened?

Uploading `.eml` (email message) files fails with either "Unsupported file type" or "Unable to determine file type" error, depending on the browser.

**Root cause analysis:**

1. The `.eml` extension is **not present** in `codeTypeMapping` in `packages/data-provider/src/file-config.ts`, so `inferMimeType` cannot resolve the MIME type when the browser reports an empty type string.
2. The standard MIME type for `.eml` files (`message/rfc822`) is **not matched** by any regex in `supportedMimeTypes`.
3. Even configuring `message/rfc822` in `librechat.yaml` under `fileConfig.endpoints.*.supportedMimeTypes` only **partially** fixes the issue — it still fails on browsers that don't report the MIME type for `.eml` files (since the extension-based fallback doesn't know about `.eml` either).

## Expected behavior

`.eml` files should be uploadable like other text-based file formats. The file type should be inferred from the extension when the browser does not provide a MIME type, and `message/rfc822` should be recognized as a supported type.

## Steps to reproduce

1. Open LibreChat
2. Start a new chat with any endpoint that supports file uploads
3. Try to upload a `.eml` file
4. Observe error: "Unable to determine file type" or "Unsupported file type: message/rfc822"

## Browsers

Chrome, Firefox, Safari, Microsoft Edge

## Relevant logs/screenshots

**Server-side error log:**
```
Unsupported file type: message/rfc822
```

**Client-side validation error:**
```
Unable to determine file type for: email.eml
```

## Which provider are you using?

All providers — this is a file upload validation issue independent of the AI endpoint.

## Which language are you using LibreChat in?

English and German

## Code of Conduct

- [x] I agree to follow this project's [Code of Conduct](https://github.com/danny-avila/LibreChat/blob/main/.github/CODE_OF_CONDUCT.md)
