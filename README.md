# Hebrew OCR (v3, Nov 8 2026; engine v14 Nov 11 2026)

Free Hebrew OCR in the browser for seforim, Rashi script, old prints and Yiddish. Live at https://hebrew-ocr.sites.tab.bot

## Three ways to read
- **Offline engine (no AI, no key, no limit)**: real OCR code running in the browser.
  - Tesseract.js 5 (Apache-2.0) with two models, fine-tuned in v4 (Nov 2026) on real printed lines: `heb4` (from Google's tessdata_best `heb`, square script) and `heb_rashi4` (from `heb_rashi` by Zeev Pekar / pninim.org, Rashi script), both Apache-2.0. Measured on the Vilna Rosh Hashana 2a test crops in this site's Engine mode: Rashi 32.1% → 16.4% wrong letters, square 5.8% → 4.1%. Training code: https://github.com/boro11204/hebrew-ocr-offline
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
`index.html`, `style.css`, `app.js` (UI, AI calls), `compare.js` (compare two texts), `core.js` (prompts, models, docx writer), `engine.js` (offline engine), `vendor/` (tesseract.js, pdf.js, pdf-lib, heic2any), `tessdata/` (models, word list, NOTICE).

No server. No key is stored anywhere but the user's own browser.

Large third-party files (Tesseract cores, models, word list, pdf.js worker, heic2any) are served on the live site but not stored in this repo; `tools/get-big-files.sh` fetches them.


## v14: Blurry / faint scans read better (Nov 11, 2026)
- The engine now measures how crisp the letter edges are (after enlarging to the standard line height). A blurry or faint scan (soft edges) is sharpened (unsharp mask) before it is turned black & white and read, in Auto and Square modes. The page is also read without sharpening, and whichever reading gives more real words is kept. Clean prints never trigger it, so their results are unchanged. Not used in Rashi mode, because it made the faint Rashi test worse.
- Measured on synthetic faint test pages (Prague holdout pages 15/35/105, degraded): Auto mode 16.9% → 14.5% letters wrong. Square sample 2.8% → 1.5%. Old Rashi crop, Auto mode 11.1% → 10.8%. 10-page holdout, Rashi mode crop and dirty pages: unchanged.
- Files load as `?v=14`.

## v12: Compare two texts (Nov 11, 2026)
- New "Compare two texts" section (button "⇄ Compare texts" at the top, and "⇄ Compare with another text" above the OCR result). Text A can be the current OCR result ("Use OCR result"), Text B is pasted or loaded from a .txt file (UTF-8 or Windows-1255). Both boxes are editable.
- Word-by-word diff, with the exact differing letters marked darker inside each changed word. Removed (only in A) in red, added (in B) in green. Summary: % of letters that differ (edit distance over Text B's letters), words changed / added in B / missing from B.
- Options: ignore nikud & te'amim (on by default), ignore punctuation, ignore spacing & line breaks (on: a word split or joined differently is not counted), ignore page / section labels like [[רש״י]] (on).
- Previous / Next difference buttons, a clickable list of every difference, and downloadable reports (.html with the colored diff and a table, or .txt).
- The compare tool only reads; it never changes the OCR text. Everything runs in the browser (compare.js), no AI.
- The script choice (Auto / Rashi / Square) is now three big buttons at the top of step 3. They set the same setting as before; OCR results are unchanged (checked byte for byte against v11).
- Files load as `?v=12`.

## v9 engine (Nov 10, 2026)
- New Rashi model `heb_rashi7` (used by Rashi and Auto mode): `heb_rashi6` fine-tuned on 24,013 new real Rashi and Tosafot lines from 310 pages of the Vilna Romm Shas (1882 and 1925 printings, archive.org scans, 31 tractates). Labels come from Sefaria's Rashi (Vilna edition), Tosafot and Rashbam texts, matched to each printed line. A line was kept only when the match was exact apart from look-alike letters, or when the lines above and below it pinned the text. Training: 3 stages (7,000 iterations at learning rate 2e-5, then 5,000 at 1e-5, then 5,000 at 1e-5 with more worn copies). Each stage mixed 9,000 Vilna lines (40–65% artificially worn), 6,000 earlier Prague lines and 1,500 lines heavy in look-alike letters. Pages near the test pages were left out.
- 10-page Prague test (never trained on): Rashi mode 2.15% → 2.00% wrong letters, Auto mode 2.12% → 2.05% (8 of 10 pages better in each mode). Old Rosh Hashana 2a crop: Rashi 10.56% → 9.65%, Auto unchanged at 11.11%. Square unchanged at 2.79%. Held-out Vilna lines: 1.74% → 1.58%. Gold test lines: 1.52% → 1.30%.
- `heb_rashi6` stays in `tessdata/`. Files load as `?v=11`.

## v8 engine (Nov 10, 2026)
- Column fix for Auto mode (`layout.js`): the engine's first column guess could put a false cut beside the margin, which hid the real gutter, so a two-column page was read straight across. Now the letter-based column finder in page cleanup wins when it finds at least as many columns, and a cut with letters running through it is dropped.
- 10-page Prague test (about 39,000 letters, never trained on), Auto mode: 9.32% → 2.12% wrong letters (page 25: 71.0% → 2.1%). Rashi mode unchanged at 2.15%. No page got worse. Old Rosh Hashana 2a crop unchanged (Rashi 10.56%, Auto 11.11%); square unchanged at 2.79%.
- Models unchanged (`heb_rashi6` and the Sefaria word model).
- Dirty and faint pages: when a stain, fold or show-through makes the reader skip or garble a run of lines, page cleanup already knows where those lines are, so they are read again on their own (and kept only when that gives more letters). When few words come out right on a page (a faint, blurry, low-contrast scan), it is also read from the black & white image and the version with more real words is kept. Test on synthetic dirt (pages 15, 35, 105, Rashi mode): stains/specks/foxing/show-through/fold 10.8% -> 6.0% wrong letters; faint blurry low-contrast JPEG 45.6% -> 19.6%. Clean pages, old crop and square are unchanged.
- Files load as `?v=10`.

## v7 engine (Nov 10, 2026)
- Page cleanup before reading (`layout.js`, on by default, checkbox "Page cleanup" to turn it off): finds the main text block and its columns and drops running headers, page numbers, catchwords, margin notes, specks and borders. Runs in the browser, offline. It never looks up the source text.
- Models unchanged: Rashi and Auto mode still use `heb_rashi6`; the Sefaria word model is unchanged.
- New bigger test: 10 full pages of the Prague 1815 print (pages 15, 25 … 105, never used in training), about 39,000 letters. Rashi mode: 52.4% → 2.2% wrong letters (the old engine read straight across both columns on most of these pages). Auto mode: 59.4% → 9.3%. Square test crop unchanged at 2.8%. Old Rosh Hashana 2a Rashi crop: 11.1% → 10.6%.
- Checked that cleanup keeps all real text: on every test page the letters and lines kept match the true text (within 0.5%).

## v6 engine (Nov 10, 2026)
- Rashi model `heb_rashi6` (now used by Rashi and Auto mode): `heb_rashi5` fine-tuned on the look-alike Rashi letters (ב/כ, ת/ש/ט, ן/ך, כ/נ, ג/נ and others): real Prague 1815 lines weighted toward those letters, synthetic minimal-pair words in Rashi fonts with wear aimed at the strokes that tell them apart, then a low-rate pass on 2,496 extra real Vilna lines so the rest of the alphabet holds. `heb_rashi5` stays in `tessdata/`.
- The Sefaria word model is unchanged.
- Same Rosh Hashana 2a test crops, Engine mode with the word model: Rashi 14.6% → 11.1% wrong letters (Auto mode 14.6% → 11.8%), square unchanged at 2.8%. On held-out real lines: 2.74% → 2.69%.

## v5 engine (Nov 9, 2026)
- Rashi model `heb_rashi5`: `heb_rashi4`'s base (hr3) fine-tuned for 35,000 more iterations on ~16.7k real Prague 1815 and Vilna Rashi lines, each also in 2 artificially worn copies (about 20 kinds of wear: ink bleed, broken strokes, erosion, blur, noise, uneven light, foxing, stains, bleed-through, skew, warp and more).
- A Sefaria word model (`tessdata/lm_words.txt`, `tessdata/lm_bigrams.txt`: 243k words and 318k word pairs counted from public Sefaria texts, the test tractates left out) re-scores look-alike letters after OCR. It never looks up the source text.
- Same Rosh Hashana 2a test crops, Engine mode: Rashi 16.4% → 14.6% wrong letters, square 4.1% → 2.8%.
