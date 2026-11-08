// Hebrew OCR — core logic (no DOM). Works in the browser and in Node (tests).
export const VERSION = '2026-11-08';

export const PROMPT = "You are an expert transcriber of printed Hebrew, Aramaic and Yiddish texts — modern books and newspapers, seforim, early prints (incunabula and 16th–19th century), Talmud and Mikraot Gedolot page layouts, and Rashi script (כתב רש״י).\n\nTranscribe ALL the text on this page image, exactly as printed.\n\nRULES\n1. Exact copy. Copy every word letter by letter as printed. Keep the original spelling (full or defective spelling exactly as printed), archaic forms, Aramaic, Yiddish spelling (ײ, װ, ױ, פֿ, אַ, אָ) and all abbreviations and acronyms exactly as printed (e.g. ר״ת, וכו׳, א״ר, הקב״ה, ע״ש). Never expand abbreviations, never modernize, never correct apparent errors, never translate, never summarize, never add or drop words.\n2. Rashi script and every other cursive or semi-cursive Hebrew typeface: write it with regular Hebrew (square) Unicode letters. In Rashi script take extra care with look-alike letters: ס/ם, ה/ח/ת, ב/כ, ג/נ, ד/ר, ו/ז/ן/י, ע/צ, ש/ט, א/ל, ף/ך.\n3. Abbreviation marks: write gershayim as ״ and geresh as ׳ wherever the print has them.\n4. Nikud and te'amim: if the print has vowel points or cantillation marks, reproduce them exactly as printed. If it has none, add none.\n5. Lines: one output line for each printed line, in order. Put one empty line between paragraphs. Do not re-flow, join or hyphenate lines.\n6. Layout and reading order: read right to left, top to bottom. If the page has more than one text block or column (e.g. a Talmud page with Gemara, Rashi and Tosafot; Mikraot Gedolot with verse, Targum, Rashi and other commentaries; a newspaper with several columns; marginal notes), transcribe each block completely and separately, following each block as it wraps around the others. Order: running header first, then the main text, then each commentary, then marginal notes and glosses, then footnotes. Start each block with a label line of the form [[name]] using its usual Hebrew name, e.g. [[כותרת]], [[גמרא]], [[משנה]], [[רש״י]], [[תוספות]], [[פסוקים]], [[תרגום אונקלוס]], [[הגהות]], [[טור 1]], [[טור 2]]. If the page is a single block of text, use no label.\n7. Large decorative initial words or letters belong to the text: put them where they are read, at the start of their passage.\n8. Uncertain text: if you cannot read a word with confidence, write your best reading followed by [?]. If nothing can be read, write [?]. For torn, cut-off or missing text write […]. Never guess silently and never fill gaps from memory of the known text — transcribe only what is visible on this page.\n9. Page numbers, folio numbers, signature marks and catchwords: include them inside the [[כותרת]] block (top) or a final [[שוליים]] block (bottom).\n10. Output only the transcription: no introduction, no notes, no markdown, no code fences, no translation. If there is no Hebrew-script text on the image, output exactly: [[אין טקסט]]";

// Extra rules per script (v3, Nov 8 2026). Rashi mode adds a letter-by-letter guide for the look-alike Rashi letters.
export const RASHI_ADDON = "\n\nRASHI-SCRIPT MODE (this page is printed in Rashi script, כתב רש״י, or mostly so)\nA. Read every letter by its Rashi shape, then write the regular square letter. The Rashi letters most often misread, and how to tell them apart:\n   - ש vs ס vs ם vs ט: decide by the word; in Rashi script these round shapes are easily swapped. ס and ם are different letters — ם only at the end of a word, ס anywhere.\n   - ה vs ח vs ת: ה has a gap at the top left; ח is closed at the top; ת has a foot at the bottom left. Check the word.\n   - ב vs כ, ג vs נ, ד vs ר: Rashi ב and ד have a small corner; כ and ר are round. Check the word.\n   - ו vs ז vs י vs ן: by length and head; ן goes below the line and only ends a word; י is short.\n   - ע vs צ vs ט, א vs ל vs ע, פ vs ש, ף vs ך vs ן: check the word.\nB. Final letters: ך ם ן ף ץ appear ONLY at the end of a word (also before ׳ or ״ of an abbreviation only if printed so). Never write a final letter inside a word, and never write כ מ נ פ צ as the last letter of a full word.\nC. Each decision between look-alike letters must give a real Hebrew or Aramaic word that fits the sentence. Rashi, Tosafot and other commentaries are written in rabbinic Hebrew with Aramaic: prefer the reading that is a real word in that language. Use your knowledge of the language and of the commentary ONLY to decide between letter shapes that are really on the page — never add, drop, complete or reorder words from memory.\nD. Common abbreviations in these commentaries — copy them exactly as printed, with ׳ or ״: פי׳, פירש״י, וכו׳, כו׳, וגו׳, ד״ה, ד״א, א״כ, ה״נ, ה״ק, מ״מ, כ״ש, ע״כ, ע״ש, וכ״ת, ת״ל, ר״ל, ק״ו, כדאמרינן, מתני׳, גמ׳, בגמ׳, שנא׳, דכתיב, כלומר.\nE. A commentary is a series of short entries: each begins with the quoted words (דיבור המתחיל), then the explanation, and usually ends with a colon (:) or a period. Keep each entry's words in order; a new printed line does not mean a new entry.\nF. Rashi text is small: zoom in mentally on every word. If after checking a word is still unclear, give the best reading followed by [?].";
export const SQUARE_ADDON = "\n\nEXTRA CARE\n- Final letters ך ם ן ף ץ only at the end of a word; never inside a word.\n- When two letters look alike in the print (ב/כ, ד/ר, ה/ח/ת, ו/ז/י/ן, ס/ם, ע/צ, ג/נ), choose the one that makes a real Hebrew, Aramaic or Yiddish word that fits the sentence. Use language knowledge only to decide between shapes that are on the page — never add or drop words from memory.";
export const DRAFT_ADDON = "\n\nA machine OCR engine (Tesseract) already read this page. Its draft is below. It often confuses look-alike letters and breaks words, but its word positions and order are usually right. Use the IMAGE as the authority: read the page yourself, and use the draft only as a hint for the order of lines and for words you are unsure of.\n\nENGINE DRAFT:\n__DRAFT__";
export function promptFor(script = 'mixed', draft = '') {
  let p = PROMPT + (script === 'square' ? SQUARE_ADDON : RASHI_ADDON);
  if (draft) p += DRAFT_ADDON.replace('__DRAFT__', draft.slice(0, 12000));
  return p;
}

// Models. "free" = Google's pricing page lists a free tier for it (checked Nov 3, 2026).
// perDay = the free-tier daily request limit Google's own 429 answer named for that model on Nov 3, 2026 (null = not seen).
export const MODELS = [
  { id: 'gemini-3.8-flash',      label: 'Gemini 3.8 Flash',        note: 'best free model', free: true, perDay: 20 },
  { id: 'gemini-3.6-flash',      label: 'Gemini 3.6 Flash',        note: 'free',            free: true, perDay: 20 },
  { id: 'gemini-3-flash-preview',label: 'Gemini 3 Flash (preview)',note: 'free',            free: true, perDay: null },
  { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite',   note: 'free, many pages, less accurate', free: true, perDay: 500 },
  { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash-Lite',   note: 'free, many pages, less accurate', free: true, perDay: null },
  { id: 'gemini-2.5-pro',        label: 'Gemini 2.5 Pro',          note: 'free tier very small', free: true, perDay: null },
  { id: 'gemini-3.1-pro-preview',label: 'Gemini 3.1 Pro (preview)',note: 'best quality, needs billing on', free: false, perDay: null },
  { id: 'gemini-4-argon',        label: 'Gemini 4 Argon',          note: 'top model, needs billing on', free: false, perDay: null },
];

// "Auto": best free model first; when one is used up for the day, move to the next.
// (gemini-2.5-flash/-pro answer "no longer available to new users" since autumn 2026, so they are left out.)
export const AUTO_CHAIN = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3-flash-preview',
  'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'];
// "Best quality" (billing on): strongest first, then fall back to the free chain.
export const QUALITY_CHAIN = ['gemini-4-argon', 'gemini-3.1-pro-preview', ...AUTO_CHAIN];

export const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export function supportsPartResolution(model) {
  return /^gemini-(3|4)/.test(model);
}

export function buildRequest(b64jpeg, model, opts = {}) {
  const mime = opts.mime || 'image/jpeg';
  const img = { inlineData: { mimeType: mime, data: b64jpeg } };
  const body = { contents: [{ role: 'user', parts: [{ text: promptFor(opts.script, opts.draft) }, img] }],
    generationConfig: { maxOutputTokens: 32768 } };
  if (supportsPartResolution(model)) img.mediaResolution = { level: 'MEDIA_RESOLUTION_ULTRA_HIGH' };
  else body.generationConfig.mediaResolution = 'MEDIA_RESOLUTION_HIGH';
  return body;
}

export function endpoint(model) {
  return `${API_BASE}/models/${encodeURIComponent(model)}:generateContent`;
}

// Pull the transcription out of a generateContent answer.
export function extractText(json) {
  const c = json && json.candidates && json.candidates[0];
  if (!c) {
    const br = json && json.promptFeedback && json.promptFeedback.blockReason;
    return { text: '', finish: br ? 'BLOCKED:' + br : 'EMPTY' };
  }
  const parts = (c.content && c.content.parts) || [];
  let text = parts.filter(p => p.text && !p.thought).map(p => p.text).join('');
  text = text.replace(/^\s*```[a-zA-Z]*\s*\n/, '').replace(/\n```\s*$/, '');
  text = text.replace(/\r\n/g, '\n').replace(/[ \t]+\n/g, '\n').trim();
  return { text, finish: c.finishReason || 'STOP' };
}

function parseDelay(s) {
  if (!s) return null;
  let t = 0, m;
  const re = /(\d+(?:\.\d+)?)\s*(h|m(?!s)|s)/g;
  while ((m = re.exec(s))) t += parseFloat(m[1]) * (m[2] === 'h' ? 3600 : m[2] === 'm' ? 60 : 1);
  return t || null;
}

// Classify an API failure. kind: daily | minute | busy | key | model | blocked | bad | net
export function classifyError(status, json, finish) {
  if (finish) {
    if (/RECITATION/.test(finish)) return { kind: 'blocked', why: 'recitation' };
    if (/SAFETY|BLOCKED|PROHIBITED|OTHER/.test(finish)) return { kind: 'blocked', why: finish };
    if (/MAX_TOKENS/.test(finish)) return { kind: 'bad', why: 'too long' };
    if (/EMPTY/.test(finish)) return { kind: 'busy', why: 'empty answer', wait: 5 };
  }
  const err = (json && json.error) || {};
  const msg = err.message || '';
  const details = err.details || [];
  let retry = null, quotaId = '';
  for (const d of details) {
    if (d.retryDelay) retry = parseDelay(d.retryDelay);
    for (const v of (d.violations || [])) quotaId += ' ' + (v.quotaId || '') + ' ' + (v.quotaMetric || '');
  }
  if (retry == null) { const m = /retry in ([0-9hms.]+)/i.exec(msg); if (m) retry = parseDelay(m[1]); }
  if (status === 429) {
    if (/PerDay|per day/i.test(quotaId + ' ' + msg)) return { kind: 'daily', wait: retry };
    if (/spend|billing tier cap/i.test(msg) && !/free/i.test(msg)) return { kind: 'minute', wait: Math.max(retry || 60, 30) };
    return { kind: 'minute', wait: Math.min(Math.max(retry || 30, 5), 120) };
  }
  if (status === 400 && /API_KEY_INVALID|API key not valid|api key/i.test(msg + JSON.stringify(details))) return { kind: 'key', why: msg };
  if (status === 401 || status === 403) {
    if (/billing|free tier|not available|FAILED_PRECONDITION/i.test(msg)) return { kind: 'model', why: msg };
    return { kind: 'key', why: msg };
  }
  if (status === 404) return { kind: 'model', why: msg || 'model not found' };
  if (status === 400 && /FAILED_PRECONDITION|billing|free tier|not supported|location/i.test(msg + (err.status || ''))) return { kind: 'model', why: msg };
  if (status === 400) return { kind: 'bad', why: msg };
  if (status >= 500 || status === 0) return { kind: 'busy', wait: status === 0 ? 10 : 20, why: msg || 'server busy' };
  return { kind: 'bad', why: msg || ('HTTP ' + status) };
}

// The Gemini free-tier day resets at midnight Pacific time.
export function pacificDay(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(d);
}

// ---------- text options ----------
const TEAMIM = /[\u0591-\u05AF\u05BD]/g;               // cantillation + meteg
const NIKUD  = /[\u05B0-\u05BC\u05C1\u05C2\u05C4\u05C5\u05C7]/g; // vowels, dagesh, shin/sin dots
export function stripNikud(s) { return s.replace(TEAMIM, '').replace(NIKUD, ''); }
export function stripTeamim(s) { return s.replace(TEAMIM, ''); }

export const isLabel = l => /^\s*\[\[.*\]\]\s*$/.test(l);

// lines: 'keep' | 'join'
export function joinLines(s) {
  const out = [];
  for (const block of s.split(/\n\s*\n/)) {
    const lines = block.split('\n');
    let buf = [];
    const flush = () => { if (buf.length) { out.push(buf.join(' ').replace(/\s+/g, ' ').trim()); buf = []; } };
    for (const l of lines) {
      if (isLabel(l)) { flush(); out.push(l.trim()); } else if (l.trim()) buf.push(l.trim());
    }
    flush();
    out.push('');
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function applyOptions(text, opts = {}) {
  let t = text || '';
  if (opts.nikud === 'none') t = stripNikud(t);
  else if (opts.nikud === 'noteamim') t = stripTeamim(t);
  if (opts.lines === 'join') t = joinLines(t);
  return t;
}

export function pageTitle(p, i) { return `עמוד ${i + 1}` + (p.label ? ` — ${p.label}` : ''); }

export function allText(pages, opts) {
  return pages.map((p, i) => `=== ${pageTitle(p, i)} ===\n\n` + (p.text ? applyOptions(p.text, opts) : '[לא נקרא]')).join('\n\n\n') + '\n';
}

// ---------- tiny .docx writer (zip "store", no compression) ----------
const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
export function crc32(bytes) { let c = 0xFFFFFFFF; for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }

export function zipStore(files) { // files: [{name, data: Uint8Array}]
  const enc = new TextEncoder(); const chunks = []; const central = []; let offset = 0;
  const u16 = n => [n & 255, (n >>> 8) & 255]; const u32 = n => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];
  for (const f of files) {
    const name = enc.encode(f.name); const crc = crc32(f.data); const size = f.data.length;
    const local = new Uint8Array([...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21),
      ...u32(crc), ...u32(size), ...u32(size), ...u16(name.length), ...u16(0), ...name]);
    chunks.push(local, f.data);
    central.push(new Uint8Array([...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21),
      ...u32(crc), ...u32(size), ...u32(size), ...u16(name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset), ...name]));
    offset += local.length + size;
  }
  const cdSize = central.reduce((a, c) => a + c.length, 0);
  const end = new Uint8Array([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(cdSize), ...u32(offset), ...u16(0)]);
  const all = [...chunks, ...central, end]; const total = all.reduce((a, c) => a + c.length, 0);
  const out = new Uint8Array(total); let p = 0; for (const c of all) { out.set(c, p); p += c.length; } return out;
}

export function xmlEsc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ''); }

export function buildDocx(pages, opts = {}, font = 'David') {
  const enc = new TextEncoder();
  const run = (t, { bold = false, size = 28, color = null } = {}) =>
    `<w:r><w:rPr><w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:cs="${font}"/>${bold ? '<w:b/><w:bCs/>' : ''}${color ? `<w:color w:val="${color}"/>` : ''}<w:rtl/><w:sz w:val="${size}"/><w:szCs w:val="${size}"/><w:lang w:bidi="he-IL"/></w:rPr><w:t xml:space="preserve">${xmlEsc(t)}</w:t></w:r>`;
  const para = (inner, { center = false, pageBreakBefore = false, after = 0 } = {}) =>
    `<w:p><w:pPr>${pageBreakBefore ? '<w:pageBreakBefore/>' : ''}<w:bidi/><w:spacing w:after="${after}" w:line="276" w:lineRule="auto"/>${center ? '<w:jc w:val="center"/>' : ''}</w:pPr>${inner}</w:p>`;
  let body = '';
  pages.forEach((p, i) => {
    body += para(run(pageTitle(p, i), { bold: true, size: 24, color: '7A5C2E' }), { center: true, pageBreakBefore: i > 0, after: 200 });
    const text = p.text ? applyOptions(p.text, opts) : '[לא נקרא]';
    for (const line of text.split('\n')) {
      if (isLabel(line)) body += para(run(line.trim().replace(/^\[\[|\]\]$/g, ''), { bold: true, size: 26 }), { after: 60 });
      else body += para(line ? run(line) : '', { after: line ? 0 : 120 });
    }
  });
  const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/><w:bidi/></w:sectPr></w:body></w:document>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:cs="${font}"/><w:rtl/><w:sz w:val="28"/><w:szCs w:val="28"/><w:lang w:val="he-IL" w:bidi="he-IL"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:bidi/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:pPr><w:bidi/><w:jc w:val="both"/></w:pPr></w:style></w:styles>`;
  const types = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
  const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
  return zipStore([
    { name: '[Content_Types].xml', data: enc.encode(types) },
    { name: '_rels/.rels', data: enc.encode(rels) },
    { name: 'word/document.xml', data: enc.encode(doc) },
    { name: 'word/_rels/document.xml.rels', data: enc.encode(docRels) },
    { name: 'word/styles.xml', data: enc.encode(styles) },
  ]);
}

// "1-3, 5, 8-" -> [1,2,3,5,8..max]
export function parseRange(s, max) {
  s = (s || '').trim(); if (!s || /^all$/i.test(s)) return Array.from({ length: max }, (_, i) => i + 1);
  const set = new Set();
  for (const part of s.split(/[,\s]+/).filter(Boolean)) {
    const m = /^(\d*)\s*[-–]\s*(\d*)$/.exec(part);
    if (m) { let a = m[1] ? +m[1] : 1, b = m[2] ? +m[2] : max; if (a > b) [a, b] = [b, a]; for (let i = Math.max(1, a); i <= Math.min(max, b); i++) set.add(i); }
    else if (/^\d+$/.test(part)) { const n = +part; if (n >= 1 && n <= max) set.add(n); }
  }
  return [...set].sort((a, b) => a - b);
}

// ---------- v3: light, deterministic clean-up of AI text (final letters), with a list of what changed ----------
const FIN_ = { 'כ': 'ך', 'מ': 'ם', 'נ': 'ן', 'פ': 'ף', 'צ': 'ץ' }; const UNFIN_ = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
export function fixFinals(text) {
  const changes = [];
  const out = text.replace(/(^|[^\u05D0-\u05EA\u0591-\u05C7])([\u05D0-\u05EA\u0591-\u05C7]{2,})(?![\u05D0-\u05EA\u0591-\u05C7׳״'"])/g, (m, pre, w) => {
    const letters = [...w]; let lastIdx = -1; letters.forEach((ch, i) => { if (/[\u05D0-\u05EA]/.test(ch)) lastIdx = i; });
    const fixed = letters.map((ch, i) => i < lastIdx ? (UNFIN_[ch] || ch) : i === lastIdx ? (FIN_[ch] || ch) : ch).join('');
    if (fixed !== w) changes.push({ from: w, to: fixed, why: 'final letter' });
    return pre + fixed; });
  return { text: out, changes };
}
