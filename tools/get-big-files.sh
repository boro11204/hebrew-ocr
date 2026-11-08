#!/bin/sh
# The site's large third-party files are not stored in this repo (GitHub upload size). Fetch them into place:
set -e
cd "$(dirname "$0")/.."
mkdir -p tessdata vendor/tess
curl -L -o tessdata/heb.traineddata https://github.com/tesseract-ocr/tessdata_best/raw/main/heb.traineddata
curl -L -o tessdata/heb_rashi.traineddata "https://gitlab.com/api/v4/projects/pninim.org%2Ftessdata_heb_rashi/repository/files/tesseract_4.1.1%2Fheb_rashi_fast.traineddata/raw?ref=main"
# word list: first 120000 plain-Hebrew words of pninim.org's heb.wordlist
curl -L "https://gitlab.com/api/v4/projects/pninim.org%2Ftessdata_heb_rashi/repository/files/tesseract_4.1.1%2Flangdata%2Fheb%2Fheb.wordlist/raw?ref=main" | grep -E '^[א-ת]{2,}$' | head -n 120000 > tessdata/words.txt
npm pack tesseract.js-core@5.1.1 && tar xzf tesseract.js-core-5.1.1.tgz && cp package/tesseract-core-simd-lstm.wasm.js package/tesseract-core-lstm.wasm.js vendor/tess/ && rm -rf package tesseract.js-core-5.1.1.tgz
npm pack pdfjs-dist@4 heic2any >/dev/null 2>&1 || true
echo "pdf.js worker / heic2any: see vendor/ on the live site https://hebrew-ocr.sites.tab.bot/vendor/"
