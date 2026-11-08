# Hebrew OCR (v3, Nov 8 2026)

Free Hebrew OCR in the browser for seforim, Rashi script, old prints and Yiddish. Live at https://hebrew-ocr.sites.tab.bot

## Three ways to read
- **Offline engine (no AI, no key, no limit)**: real OCR code running in the browser.
  - Tesseract.js 5 (Apache-2.0) with two models: Google's tessdata_best `heb` (square script) and `heb_rashi` (Rashi script) by Zeev Pekar / pninim.org (Apache-2.0).
  - Image clean-up before reading: line-pitch-based Lanczos enlargement, contrast stretch, 3x3 median de-speckle, projection-profile deskew (±5°), gentle line straightening for curved book photos, Otsu or Sauvola (adaptive) binarization, and gutter-based column detection (columns read right to left).
  - Both models read the page. The one with more real words leads, and single lines can be taken from the other.
  - Then a word-list post-correction for look-alike letters (ב/ש, ה/כ, ס/ם, ה/ח/ת, ד/ר, ו/ז/י/ן, ע/צ/ט …) and final letters. It uses the 120k most frequent words of pninim.org's rabbinic word list, built from Sefaria texts (Apache-2.0).
- **AI**: Google Gemini with the user's own free AI Studio key. The prompt has a Rashi-script mode: a letter-by-letter look-alike guide, final-letter rules, the commentary abbreviations, and the דיבור המתחיל structure. Small images are enlarged before sending, and final letters are cleaned up afterwards.
- **Both** (default): the engine reads first and its text shows at once. Then the AI reads the image, with the engine draft as a hint, and corrects it. If the AI's free pages are used up, the engine text stays.

## Output
Text per page, with a "What was done" list of every clean-up step and every word that was fixed automatically. Export as TXT, Word (.docx), or searchable PDF (page image plus hidden text layer, made by Tesseract's PDF writer). Batch: many photos, or PDF page ranges.

## Credits
The idea of listing each automatic fix comes from the free OCR page that ivelt.com member "שטאלץ צו זיין א איד" posted on Mar 10, 2026 ("if anyone wants to take it and update it — with honor").

## Files
`index.html`, `style.css`, `app.js` (UI, AI calls), `core.js` (prompts, models, docx writer), `engine.js` (offline engine), `vendor/` (tesseract.js, pdf.js, pdf-lib, heic2any), `tessdata/` (models, word list, NOTICE).

No server. No key is stored anywhere but the user's own browser.

Large third-party files (Tesseract cores, models, word list, pdf.js worker, heic2any) are served on the live site but not stored in this repo; `tools/get-big-files.sh` fetches them.
