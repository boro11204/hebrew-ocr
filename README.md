# Hebrew OCR

Source of the Hebrew OCR page (https://hebrew-ocr.sites.tab.bot). Backup made Nov 6, 2026 (same files as the live page).

- `site/` - the whole static page (index.html, app.js, core.js, style.css, vendor/ = pdf.js and heic2any with their licenses).
- `test/` - tests.

It runs in the browser only. The Google AI Studio API key is typed into the page by the user and kept in that browser;
no key is in this repo. Models: auto-switch between the free Gemini Flash tiers; "Best quality" uses a paid Pro model.
