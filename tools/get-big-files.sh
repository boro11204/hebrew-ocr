#!/bin/sh
# The site's large third-party files are not stored in this repo (GitHub upload size). Fetch them into place:
set -e
cd "$(dirname "$0")/.."
mkdir -p tessdata vendor/tess
# v4 fine-tuned models (see https://github.com/boro11204/hebrew-ocr-offline)
curl -L -o tessdata/heb4.traineddata https://hebrew-ocr.sites.tab.bot/tessdata/heb4.traineddata
curl -L -o tessdata/heb_rashi4.traineddata https://hebrew-ocr.sites.tab.bot/tessdata/heb_rashi4.traineddata
# v5, v6 and v7 Rashi models and Sefaria word model
for f in heb_rashi5.traineddata heb_rashi6.traineddata heb_rashi7.traineddata lm_words.txt lm_bigrams.txt; do curl -L -o tessdata/$f https://hebrew-ocr.sites.tab.bot/tessdata/$f; done
# word list: first 120000 plain-Hebrew words of pninim.org's heb.wordlist
curl -L "https://gitlab.com/api/v4/projects/pninim.org%2Ftessdata_heb_rashi/repository/files/tesseract_4.1.1%2Flangdata%2Fheb%2Fheb.wordlist/raw?ref=main" | grep -E '^[א-ת]{2,}$' | head -n 120000 > tessdata/words.txt
npm pack tesseract.js-core@5.1.1 && tar xzf tesseract.js-core-5.1.1.tgz && cp package/tesseract-core-simd-lstm.wasm.js package/tesseract-core-lstm.wasm.js vendor/tess/ && rm -rf package tesseract.js-core-5.1.1.tgz
npm pack pdfjs-dist@4 heic2any >/dev/null 2>&1 || true
echo "pdf.js worker / heic2any: see vendor/ on the live site https://hebrew-ocr.sites.tab.bot/vendor/"
