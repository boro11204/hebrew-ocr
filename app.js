import { MODELS, AUTO_CHAIN, QUALITY_CHAIN, API_BASE, buildRequest, endpoint, extractText, classifyError,
  pacificDay, applyOptions, allText, buildDocx, parseRange, pageTitle, fixFinals } from './core.js?v=4';
import { enginePage, pdfPageBytes, canvasFrom } from './engine.js?v=5';

const $ = s => document.querySelector(s);
const LS = { key: 'hocr.key', settings: 'hocr.settings', usage: 'hocr.usage' };
const MAX_SIDE = 3072;

// ---------------- settings ----------------
const settings = Object.assign({ model: 'auto', lines: 'keep', nikud: 'keep', font: 'David', mode: 'both', script: 'mixed', straighten: true, binarize: 'auto' }, safeJSON(localStorage.getItem(LS.settings)));
function safeJSON(s) { try { return JSON.parse(s) || {}; } catch { return {}; } }
function saveSettings() { localStorage.setItem(LS.settings, JSON.stringify(settings)); }
const modelSel = $('#modelSel');
modelSel.innerHTML = `<option value="auto">Auto — best free model, switches when one is used up (recommended)</option>
<option value="quality">Best quality — strongest models first (needs billing on in AI Studio)</option>` +
  MODELS.map(m => `<option value="${m.id}">${m.label} — ${m.note}</option>`).join('');
modelSel.value = settings.model;
for (const k of ['mode', 'script', 'binarize']) { const el = $('#' + k + 'Sel'); if (el) { el.value = settings[k]; el.onchange = () => { settings[k] = el.value; saveSettings(); showMode(); updateRunBtn(); }; } }
{ const st = $('#straightenChk'); if (st) { st.checked = settings.straighten !== false; st.onchange = () => { settings.straighten = st.checked; saveSettings(); }; } }
const needsKey = () => settings.mode !== 'engine';
function showMode() {
  const m = settings.mode; const hint = $('#modeHint');
  if (hint) hint.textContent = m === 'engine' ? 'Offline engine: real OCR code running in your browser (Tesseract with Hebrew + Rashi models). No key, no AI, no daily limit. Less accurate on worn or small print.'
    : m === 'ai' ? 'AI: Google Gemini reads the page with your own free key. Most accurate; about 20 pages a day per model on the free tier.'
    : 'Both: the offline engine reads the page first (you see its text at once), then the AI reads the image and corrects it. If the AI is used up for the day, you keep the engine text.';
  $('#keyCard').classList.toggle('optional', m === 'engine');
  $('#keyOptional').classList.toggle('hidden', m !== 'engine');
} $('#linesSel').value = settings.lines; $('#nikudSel').value = settings.nikud; $('#fontSel').value = settings.font;
modelSel.onchange = () => { settings.model = modelSel.value; saveSettings(); };
$('#fontSel').onchange = e => { settings.font = e.target.value; saveSettings(); };
for (const id of ['#linesSel', '#nikudSel']) $(id).onchange = () => {
  settings.lines = $('#linesSel').value; settings.nikud = $('#nikudSel').value; saveSettings(); refreshTexts();
};
$('#btnSettings').onclick = () => { const c = $('#settingsCard'); c.classList.toggle('hidden'); $('#btnSettings').setAttribute('aria-expanded', !c.classList.contains('hidden')); renderUsage(); if (!c.classList.contains('hidden')) c.scrollIntoView({ behavior: 'smooth' }); };

// ---------------- usage (per Pacific day) ----------------
function usage() {
  const u = safeJSON(localStorage.getItem(LS.usage)); const day = pacificDay();
  if (u.day !== day) return { day, counts: {}, exhausted: [] };
  u.counts = u.counts || {}; u.exhausted = u.exhausted || []; return u;
}
function saveUsage(u) { localStorage.setItem(LS.usage, JSON.stringify(u)); renderUsage(); }
function countUse(model) { const u = usage(); u.counts[model] = (u.counts[model] || 0) + 1; saveUsage(u); }
function markExhausted(model) { const u = usage(); if (!u.exhausted.includes(model)) u.exhausted.push(model); saveUsage(u); }
function renderUsage() {
  const u = usage(); const parts = Object.entries(u.counts).map(([m, n]) => {
    const def = MODELS.find(x => x.id === m); return `${def ? def.label : m}: ${n}${def && def.perDay ? ' of ' + def.perDay : ''}${u.exhausted.includes(m) ? ' (used up)' : ''}`; });
  $('#usageToday').textContent = parts.length ? parts.join(' · ') : 'none yet';
}
const sessionSkip = new Set(); // models that answered "not available" this session
function chain() {
  if (settings.model === 'auto') return AUTO_CHAIN;
  if (settings.model === 'quality') return QUALITY_CHAIN;
  return [settings.model];
}
function nextModel(skip = new Set()) { const u = usage(); return chain().find(m => !u.exhausted.includes(m) && !sessionSkip.has(m) && !skip.has(m)); }
const label = id => (MODELS.find(m => m.id === id) || { label: id }).label;

// ---------------- key ----------------
let apiKey = localStorage.getItem(LS.key) || '';
function showKeyState() {
  const has = !!apiKey;
  $('#keyForm').classList.toggle('hidden', has); $('#keySaved').classList.toggle('hidden', !has); $('#keyBadge').classList.toggle('hidden', !has);
  if (has) $('#keyMask').textContent = apiKey.slice(0, 6) + '…' + apiKey.slice(-4);
  updateRunBtn();
}
function keyMsg(t, cls = '') { const m = $('#keyMsg'); m.textContent = t; m.className = 'msg ' + cls; }
$('#btnShowKey').onclick = () => { const i = $('#keyInput'); i.type = i.type === 'password' ? 'text' : 'password'; };
$('#btnSaveKey').onclick = async () => {
  const k = $('#keyInput').value.trim().replace(/\s+/g, '');
  if (!k) return keyMsg('Paste your key first.', 'err');
  if (!/^[A-Za-z0-9_\-.]{20,}$/.test(k)) return keyMsg("That doesn't look like a Google API key (they start with AIza… or AQ.…).", 'err');
  keyMsg('Checking key with Google…');
  const r = await testKey(k);
  if (r === true || r === 'net') {
    apiKey = k; localStorage.setItem(LS.key, k); $('#keyInput').value = '';
    keyMsg(r === true ? 'Key works ✓' : 'Saved (could not reach Google to check it right now).', r === true ? 'ok' : 'warn'); showKeyState();
  } else keyMsg(r, 'err');
};
$('#keyInput').addEventListener('keydown', e => { if (e.key === 'Enter') $('#btnSaveKey').click(); });
$('#btnForget').onclick = () => { if (!confirm('Remove the saved key from this browser?')) return; localStorage.removeItem(LS.key); apiKey = ''; keyMsg('Key removed from this browser.', 'ok'); showKeyState(); };
$('#btnTestKey').onclick = async () => { const r = await testKey(apiKey); alert(r === true ? 'Your key works ✓' : r === 'net' ? 'Could not reach Google — check your internet.' : r); };
async function testKey(k) {
  try {
    const res = await fetch(`${API_BASE}/models?pageSize=1`, { headers: { 'x-goog-api-key': k } });
    if (res.ok) return true;
    const j = await res.json().catch(() => ({}));
    return 'Google did not accept this key: ' + ((j.error && j.error.message) || ('HTTP ' + res.status));
  } catch { return 'net'; }
}

// ---------------- pages ----------------
let pages = []; let seq = 0;
const thumbs = $('#thumbs');
function addPage(p) { p.id = ++seq; p.status = 'new'; pages.push(p); renderThumbs(); updateRunBtn(); }
function renderThumbs() {
  thumbs.innerHTML = '';
  pages.forEach((p, i) => {
    const d = document.createElement('div'); d.className = 'thumb';
    const st = { done: ['✓', 'done'], err: ['!', 'err'], run: ['…', 'run'] }[p.status];
    d.innerHTML = `<img alt="">${st ? `<span class="st ${st[1]}">${st[0]}</span>` : ''}<button class="x" title="Remove">×</button><div class="cap"></div>`;
    d.querySelector('.cap').textContent = `${i + 1}. ${p.label}`;
    if (p.thumbUrl) d.querySelector('img').src = p.thumbUrl;
    d.querySelector('.x').onclick = () => { pages = pages.filter(x => x !== p); renderThumbs(); renderResults(); updateRunBtn(); };
    thumbs.appendChild(d);
  });
}
function updateRunBtn() {
  const todo = pages.filter(p => p.status !== 'done').length;
  $('#btnRun').disabled = running || (needsKey() && !apiKey) || !todo;
  $('#btnRun').textContent = !todo && pages.length ? 'All pages read ✓' : todo && pages.some(p => p.status === 'done') ? `Read ${todo} remaining page${todo > 1 ? 's' : ''}` : `Start OCR${pages.length ? ` (${pages.length} page${pages.length > 1 ? 's' : ''})` : ''}`;
  $('#btnRetryFailed').classList.toggle('hidden', running || !pages.some(p => p.status === 'err'));
  if (!running) {
    if (needsKey() && !apiKey) status('Step 1: save your free Google key — or choose "Offline engine" in step 3 to read without a key.');
    else if (!pages.length) status('Step 2: add photos or a PDF.');
  }
}

function canvasToBlob(c, q = 0.9) { return new Promise(r => c.toBlob(r, 'image/jpeg', q)); }
async function imageToJpeg(blob) {
  let bmp;
  try { bmp = await createImageBitmap(blob, { imageOrientation: 'from-image' }); }
  catch { bmp = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = URL.createObjectURL(blob); }); }
  const w = bmp.width, h = bmp.height, s = Math.min(1, MAX_SIDE / Math.max(w, h));
  const c = document.createElement('canvas'); c.width = Math.round(w * s); c.height = Math.round(h * s);
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(bmp, 0, 0, c.width, c.height);
  return canvasToBlob(c);
}
let heicLoading;
function loadHeic() {
  return heicLoading ||= new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'vendor/heic2any-heic2any.min.js'; s.onload = () => res(window.heic2any); s.onerror = rej; document.head.appendChild(s); });
}
const isHeic = f => /\.(heic|heif)$/i.test(f.name) || /heic|heif/i.test(f.type);
const isPdf = f => /pdf/i.test(f.type) || /\.pdf$/i.test(f.name);

let pdfjs;
async function loadPdfjs() {
  if (!pdfjs) { pdfjs = await import('./vendor/pdfjs-dist-pdf.min.mjs'); pdfjs.GlobalWorkerOptions.workerSrc = new URL('./vendor/pdfjs-dist-pdf.worker.min.mjs', import.meta.url).href; }
  return pdfjs;
}
async function renderPdfPage(doc, n, target) {
  const page = await doc.getPage(n); const v1 = page.getViewport({ scale: 1 });
  const scale = Math.min(target / Math.max(v1.width, v1.height), 6);
  const v = page.getViewport({ scale }); const c = document.createElement('canvas');
  c.width = Math.round(v.width); c.height = Math.round(v.height);
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
  await page.render({ canvasContext: g, viewport: v }).promise; page.cleanup();
  return canvasToBlob(c, target > 1000 ? 0.9 : 0.7);
}

const fileQueue = []; let pdfPending = null; let busyAdding = false;
async function handleFiles(list) {
  fileQueue.push(...list); if (busyAdding) return; busyAdding = true;
  try {
    while (fileQueue.length) {
      const f = fileQueue.shift();
      try {
        if (isPdf(f)) { await askPdf(f); }
        else {
          status(`Loading ${f.name}…`);
          let blob = f;
          if (isHeic(f)) { const h = await loadHeic(); blob = await h({ blob: f, toType: 'image/jpeg', quality: 0.92 }); if (Array.isArray(blob)) blob = blob[0]; }
          const jpg = await imageToJpeg(blob); const url = URL.createObjectURL(jpg);
          addPage({ label: f.name, blob: jpg, url, thumbUrl: url });
        }
      } catch (e) { console.error(e); status(`Could not open ${f.name}: ${e.message || e}`, 'err'); }
    }
  } finally { busyAdding = false; updateRunBtn(); if (pages.length && (apiKey || !needsKey()) && !running) status(`${pages.length} page${pages.length > 1 ? 's' : ''} ready. Press Start OCR.`); }
}
async function askPdf(f) {
  status(`Opening PDF ${f.name}…`);
  const lib = await loadPdfjs(); const doc = await lib.getDocument({ data: await f.arrayBuffer() }).promise;
  if (doc.numPages === 1) return addPdfPages(f, doc, [1]);
  $('#pdfName').textContent = f.name; $('#pdfCount').textContent = doc.numPages; $('#pdfRange').value = 'all'; $('#pdfBox').classList.remove('hidden');
  status(`Choose which pages of ${f.name} to read (e.g. 1-20 or 3, 5, 9-12).`);
  await new Promise(res => { pdfPending = { f, doc, res }; });
}
$('#btnPdfAdd').onclick = async () => {
  if (!pdfPending) return; const { f, doc, res } = pdfPending; pdfPending = null; $('#pdfBox').classList.add('hidden');
  const nums = parseRange($('#pdfRange').value, doc.numPages);
  if (!nums.length) status('No valid pages in that range.', 'err'); else await addPdfPages(f, doc, nums);
  res();
};
$('#btnPdfCancel').onclick = () => { if (!pdfPending) return; const { res } = pdfPending; pdfPending = null; $('#pdfBox').classList.add('hidden'); res(); };
async function addPdfPages(f, doc, nums) {
  const base = f.name.replace(/\.pdf$/i, '');
  const added = nums.map(n => { const p = { label: `${base} p.${n}`, pdf: doc, pdfPage: n }; addPage(p); return p; });
  for (let i = 0; i < added.length; i++) { // thumbnails, small and quick
    status(`Preparing PDF pages… ${i + 1}/${added.length}`);
    try { const b = await renderPdfPage(doc, added[i].pdfPage, 260); added[i].thumbUrl = URL.createObjectURL(b); } catch (e) { console.warn(e); }
    if (i % 6 === 5 || i === added.length - 1) renderThumbs();
  }
}
async function pageJpeg(p) {
  if (!p.blob && p.pdf) { p.blob = await renderPdfPage(p.pdf, p.pdfPage, 2800); p.url = URL.createObjectURL(p.blob); }
  return p.blob;
}
function blobToB64(b) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(b); }); }

const drop = $('#drop');
$('#fileInput').onchange = e => { handleFiles([...e.target.files]); e.target.value = ''; };
$('#camInput').onchange = e => { handleFiles([...e.target.files]); e.target.value = ''; };
['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', e => handleFiles([...e.dataTransfer.files]));
window.addEventListener('dragover', e => e.preventDefault()); window.addEventListener('drop', e => e.preventDefault());
document.addEventListener('paste', e => { const fs = [...(e.clipboardData?.files || [])]; if (fs.length) handleFiles(fs); });

// ---------------- OCR ----------------
let running = false, stopFlag = false;
function status(t, cls = '') { const s = $('#status'); s.textContent = t; s.className = 'msg ' + cls; }
function setBar() { const n = pages.length || 1; $('#bar').style.width = (100 * pages.filter(p => p.status === 'done').length / n) + '%'; }
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function countdown(sec, why) {
  for (let s = Math.ceil(sec); s > 0 && !stopFlag; s--) { status(`${why} — continuing in ${s}s…`, 'warn'); await sleep(1000); }
}

async function callGemini(model, b64, opts = {}) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 240000);
  try {
    const res = await fetch(endpoint(model), { method: 'POST', signal: ctl.signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey }, body: JSON.stringify(buildRequest(b64, model, opts)) });
    const j = await res.json().catch(() => ({}));
    return { status: res.status, json: j };
  } catch (e) { return { status: 0, json: { error: { message: e.name === 'AbortError' ? 'timed out' : 'network error' } } }; }
  finally { clearTimeout(t); }
}

async function pageCanvas(p) {
  const blob = await pageJpeg(p); let bmp;
  try { bmp = await createImageBitmap(blob); } catch { bmp = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = URL.createObjectURL(blob); }); }
  return canvasFrom(bmp, bmp.width, bmp.height);
}
// small images (a cropped column, a low-res scan) are enlarged before they go to the AI: small Rashi letters read better
async function aiJpegB64(p) {
  const blob = await pageJpeg(p); let bmp; try { bmp = await createImageBitmap(blob); } catch { return blobToB64(blob); }
  const long = Math.max(bmp.width, bmp.height); if (long >= 1600) return blobToB64(blob);
  const s = 2000 / long; const c = canvasFrom(bmp, Math.round(bmp.width * s), Math.round(bmp.height * s));
  return blobToB64(await canvasToBlob(c, 0.92));
}
async function ocrPage(p, idx) {
  p.status = 'run'; p.error = ''; p.notes = []; p.changes = []; renderThumbs();
  const mode = settings.mode, script = settings.script;
  let draft = '';
  if (mode === 'engine' || mode === 'both') {
    try {
      const r = await enginePage(await pageCanvas(p), { script, binarize: settings.binarize, straighten: settings.straighten,
        onStatus: t => status(`Page ${idx + 1} of ${pages.length}: ${t}`) });
      p.text = r.text; p.model = 'engine'; p.status = 'done'; p.edited = false; p.notes = r.steps; p.changes = r.changes.map(c => ({ ...c, why: 'word list' }));
      draft = r.raw; p.raw = r.raw; p.lead = r.lead; renderResults();
    } catch (e) { console.error(e); if (mode === 'engine') { p.status = 'err'; p.error = 'The offline engine could not read this page: ' + (e.message || e); return; } p.notes = ['offline engine failed: ' + (e.message || e)]; }
    if (mode === 'engine') return;
    p.status = 'run'; renderThumbs();
  }
  const engineResult = p.model === 'engine' ? { text: p.text, notes: p.notes, changes: p.changes } : null;
  if (!apiKey && engineResult) { p.status = 'done'; p.notes = [...p.notes, 'no AI key saved — offline engine only']; return; }
  let r = await aiPage(p, idx, script, draft);
  if (r === 'stop' && engineResult) r = undefined; // keep going with the engine when the AI is used up
  if (p.status !== 'done' && engineResult) { // AI unavailable: keep the engine's text
    p.text = engineResult.text; p.model = 'engine'; p.notes = [...engineResult.notes, 'AI could not read it (' + (p.error || 'unavailable') + ') — this is the offline engine text']; p.changes = engineResult.changes; p.status = 'done'; p.error = '';
  } else if (p.status === 'done' && p.model !== 'engine') {
    const f = fixFinals(p.text); p.text = f.text; p.changes = f.changes; p.notes = [mode === 'both' ? 'engine read first, then the AI corrected it' : 'read by AI', ...(f.changes.length ? [`${f.changes.length} final-letter fix${f.changes.length > 1 ? 'es' : ''}`] : [])];
  }
  return r;
}
async function aiPage(p, idx, script, draft) {
  let b64;
  try { b64 = await aiJpegB64(p); } catch (e) { p.status = 'err'; p.error = 'Could not prepare this page image.'; return; }
  let tries = 0; const pageSkip = new Set(); let partial = '';
  while (!stopFlag) {
    const model = nextModel(pageSkip);
    if (!model) {
      if (partial) { p.text = partial; p.status = 'done'; return; }
      if (pageSkip.size) { p.status = 'err'; p.error = p.lastWhy || 'No model could read this page.'; return; }
      p.status = 'err'; p.error = settings.model === 'auto' || settings.model === 'quality'
      ? "Today's free pages on all models are used up. It resets at 3 AM New York time (midnight Pacific)."
      : `Today's free pages on ${label(settings.model)} are used up. Switch to Auto in Settings, or wait until 3 AM New York time.`; return 'stop'; }
    status(`Reading page ${idx + 1} of ${pages.length} with ${label(model)}…`);
    const r = await callGemini(model, b64, { script, draft });
    let finish = null, text = '';
    if (r.status === 200) { const x = extractText(r.json); text = x.text; finish = (x.finish === 'STOP' && text) ? null : x.finish; countUse(model);
      if (!finish) { p.text = text; p.model = model; p.status = 'done'; p.edited = false; return; } }
    const c = classifyError(r.status, r.json, finish);
    tries++;
    if (c.kind === 'daily') { markExhausted(model); status(`${label(model)}: free pages for today used up — switching model…`, 'warn'); continue; }
    if (c.kind === 'minute') { await countdown(c.wait || 30, 'Google asks to slow down a little (free per-minute limit)'); continue; }
    if (c.kind === 'busy' && tries <= 4) { await countdown(c.wait || 15, 'Google is busy'); continue; }
    if (c.kind === 'key') { p.status = 'err'; p.error = 'Google did not accept your key: ' + (c.why || ''); return 'stop'; }
    if (c.kind === 'model') { sessionSkip.add(model); p.lastWhy = `${label(model)} is not available on your key: ${c.why}`; continue; }
    if (c.kind === 'blocked') { // try the next model for this page
      if (text && text.length > partial.length) { partial = text; p.model = model; }
      p.lastWhy = c.why === 'recitation'
        ? "Google stopped this page because it matches a well-known published text (its copyright filter). Try Read again, or crop the page into two halves."
        : 'Google refused this page (' + c.why + '). Try Read again or crop the page.';
      pageSkip.add(model); continue; }
    if (c.kind === 'bad' && c.why === 'too long' && text) { p.text = text + '\n[…]'; p.model = model; p.status = 'done'; return; }
    p.status = 'err'; p.error = c.why || 'Unknown error'; return;
  }
  p.status = 'new';
}

async function run(onlyFailed = false) {
  if (running || (needsKey() && !apiKey)) return; running = true; stopFlag = false;
  $('#btnStop').classList.remove('hidden'); updateRunBtn();
  $('#resultsCard').classList.remove('hidden');
  const todo = pages.filter(p => onlyFailed ? p.status === 'err' : p.status !== 'done');
  let stopped = false;
  for (const p of todo) {
    if (stopFlag) break;
    const res = await ocrPage(p, pages.indexOf(p)); renderThumbs(); renderResults(); setBar();
    if (res === 'stop') { stopped = true; break; }
  }
  running = false; $('#btnStop').classList.add('hidden');
  const done = pages.filter(p => p.status === 'done').length, err = pages.filter(p => p.status === 'err');
  if (stopped && err.length) status(err[err.length - 1].error, 'err');
  else if (stopFlag) status(`Paused. ${done} of ${pages.length} pages done.`, 'warn');
  else status(`Done: ${done} of ${pages.length} pages read${err.length ? `, ${err.length} failed (press Retry failed pages)` : ''}.`, err.length ? 'warn' : 'ok');
  updateRunBtn(); setBar();
}
$('#btnRun').onclick = () => run(false);
$('#btnRetryFailed').onclick = () => run(true);
$('#btnStop').onclick = () => { stopFlag = true; status('Pausing after this page…', 'warn'); };
$('#btnClear').onclick = () => { if (running) return; if (pages.length && !confirm('Remove all pages and text?')) return; pages = []; renderThumbs(); renderResults(); setBar(); updateRunBtn(); $('#resultsCard').classList.add('hidden'); };
window.addEventListener('beforeunload', e => { if (pages.some(p => p.status === 'done')) { e.preventDefault(); e.returnValue = ''; } });

// ---------------- results ----------------
const opts = () => ({ lines: settings.lines, nikud: settings.nikud });
function renderResults() {
  const box = $('#pages'); box.innerHTML = '';
  const shown = pages.filter(p => p.status === 'done' || p.status === 'err');
  $('#resultsCard').classList.toggle('hidden', !shown.length && !running);
  pages.forEach((p, i) => {
    if (p.status !== 'done' && p.status !== 'err' && !(p.status === 'run' && p.text)) return;
    const d = document.createElement('div'); d.className = 'page';
    d.innerHTML = `<div class="page-h"><b></b><span class="row wrap-row"><span class="tag"></span>
      <button class="ghost small cp">Copy</button><button class="ghost small rt">Read again</button></span></div>
      <div class="imgbox"><img alt="Page image" loading="lazy"></div><div class="tx"></div>`;
    d.querySelector('b').textContent = `Page ${i + 1} — ${p.label}`;
    d.querySelector('.tag').textContent = p.status === 'done' ? (p.model === 'engine' ? 'read by the offline engine' : p.model ? 'read by ' + label(p.model) + (settings.mode === 'both' ? ' + engine' : '') : '') : p.status === 'run' ? 'AI is checking…' : 'failed';
    const img = d.querySelector('img'); img.src = p.url || p.thumbUrl || ''; img.onclick = () => { $('#zoomImg').src = p.url || p.thumbUrl; $('#zoom').showModal(); };
    const tx = d.querySelector('.tx');
    if (p.status === 'done' || p.status === 'run') {
      const ta = document.createElement('textarea'); ta.className = 'out'; ta.dir = 'rtl'; ta.lang = 'he'; ta.spellcheck = false;
      ta.value = p.shown = p.edited ? p.shown : applyOptions(p.text, opts());
      ta.oninput = () => { p.shown = ta.value; p.edited = true; };
      tx.appendChild(ta);
      d.querySelector('.cp').onclick = e => copy(ta.value, e.target);
      if ((p.notes && p.notes.length) || (p.changes && p.changes.length)) {
        const det = document.createElement('details'); det.className = 'fixes';
        const ch = p.changes || [];
        det.innerHTML = `<summary>What was done${ch.length ? ` · ${ch.length} word${ch.length > 1 ? 's' : ''} fixed` : ''}</summary><ul></ul>`;
        const ul = det.querySelector('ul');
        (p.notes || []).forEach(n => { const li = document.createElement('li'); li.textContent = n; ul.appendChild(li); });
        ch.slice(0, 200).forEach(c => { const li = document.createElement('li'); li.className = 'chg'; li.innerHTML = '<bdi dir="rtl"></bdi> → <bdi dir="rtl"></bdi> <span class="muted"></span>'; const b = li.querySelectorAll('bdi'); b[0].textContent = c.from; b[1].textContent = c.to; li.querySelector('span').textContent = '(' + (c.why || '') + ')'; ul.appendChild(li); });
        tx.appendChild(det);
      }
    } else {
      tx.innerHTML = '<div class="err-box"></div>'; tx.firstChild.textContent = '⚠ ' + (p.error || 'Failed');
      d.querySelector('.cp').classList.add('hidden');
    }
    d.querySelector('.rt').onclick = async () => { if (running) return; p.status = 'new'; p.edited = false; running = true; stopFlag = false; const r = await ocrPage(p, i); running = false; renderThumbs(); renderResults(); setBar(); updateRunBtn(); if (p.status === 'done') status(`Page ${i + 1} read again.`, 'ok'); else status(p.error, 'err'); };
    box.appendChild(d);
  });
}
function refreshTexts() {
  if (pages.some(p => p.edited) && !confirm('Changing this will replace your manual corrections with the original text. Continue?')) {
    $('#linesSel').value = settings.lines; return; }
  pages.forEach(p => { p.edited = false; }); renderResults();
}
function exportPages() { return pages.filter(p => p.status === 'done').map(p => ({ label: p.label, text: p.edited ? p.shown : applyOptions(p.text, opts()) })); }
async function copy(t, btn) {
  try { await navigator.clipboard.writeText(t); } catch { const a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select(); document.execCommand('copy'); a.remove(); }
  if (btn) { const o = btn.textContent; btn.textContent = 'Copied ✓'; setTimeout(() => btn.textContent = o, 1500); }
}
function download(data, name, type) { const b = new Blob([data], { type }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); }
const stamp = () => new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
$('#btnCopyAll').onclick = e => copy(allText(exportPages(), {}), e.target);
$('#btnTxt').onclick = () => download('\ufeff' + allText(exportPages(), {}), `hebrew-ocr-${stamp()}.txt`, 'text/plain;charset=utf-8');
$('#btnDocx').onclick = () => download(buildDocx(exportPages(), {}, settings.font), `hebrew-ocr-${stamp()}.docx`, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
$('#zoomClose').onclick = () => $('#zoom').close();
let pdfLibLoading;
function loadPdfLib() { return pdfLibLoading ||= new Promise((res, rej) => { if (window.PDFLib) return res(window.PDFLib); const s = document.createElement('script'); s.src = 'vendor/pdf-lib.min.js'; s.onload = () => res(window.PDFLib); s.onerror = rej; document.head.appendChild(s); }); }
$('#btnPdf').onclick = async e => {
  const done = pages.filter(p => p.status === 'done'); if (!done.length || running) return;
  const btn = e.target; btn.disabled = true; running = true;
  try {
    const { PDFDocument } = await loadPdfLib(); const out = await PDFDocument.create();
    for (let i = 0; i < done.length; i++) {
      status(`Making the searchable PDF: page ${i + 1} of ${done.length}…`);
      const bytes = await pdfPageBytes(await pageCanvas(done[i]), settings.script, t => status(t));
      const one = await PDFDocument.load(bytes); const cp = await out.copyPages(one, one.getPageIndices()); cp.forEach(pg => out.addPage(pg));
    }
    download(await out.save(), `hebrew-ocr-${stamp()}.pdf`, 'application/pdf');
    status(`Searchable PDF ready (${done.length} page${done.length > 1 ? 's' : ''}). Its hidden text layer comes from the offline engine.`, 'ok');
  } catch (err) { console.error(err); status('Could not make the PDF: ' + (err.message || err), 'err'); }
  finally { btn.disabled = false; running = false; updateRunBtn(); }
};

// test hook (used by the automated checks; harmless)
window.__hocr = { pages: () => pages, handleFiles, settings };
showMode(); showKeyState(); renderUsage(); updateRunBtn();
if (!apiKey && needsKey()) $('#howto').open = true;
