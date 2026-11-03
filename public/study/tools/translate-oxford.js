import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const targetPath = path.join(__dirname, '..', 'data', 'vstep', 'vocabulary_oxford.js');
const targetUrl = pathToFileURL(targetPath).href;

async function translateBatch(words) {
  try {
    const text = words.join('\n');
    const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=' + encodeURIComponent(text);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    
    // Google translate returns array of segments in data[0]
    let translated = '';
    if (Array.isArray(data[0])) {
      translated = data[0].map(item => item[0]).join('');
    }
    
    const lines = translated.split('\n').map(l => l.trim());
    return lines;
  } catch (err) {
    console.error('Translation error:', err.message);
    return null;
  }
}

async function main() {
  console.log('🔄 Loading vocabulary_oxford.js...');
  const { VSTEP_VOCABULARY_OXFORD } = await import(targetUrl);
  console.log(`📊 Total entries: ${VSTEP_VOCABULARY_OXFORD.length}`);

  const missing = [];
  VSTEP_VOCABULARY_OXFORD.forEach((w, idx) => {
    if (!w.vi || !w.vi.trim()) {
      missing.push({ idx, word: w.word });
    }
  });

  console.log(`⚠️ Words needing translation: ${missing.length}`);
  if (missing.length === 0) {
    console.log('🎉 All words already have Vietnamese meanings!');
    return;
  }

  const BATCH_SIZE = 40;
  let translatedCount = 0;

  for (let i = 0; i < missing.length; i += BATCH_SIZE) {
    const batch = missing.slice(i, i + BATCH_SIZE);
    const words = batch.map(b => b.word);
    
    const results = await translateBatch(words);
    if (results && results.length > 0) {
      batch.forEach((b, bi) => {
        const trans = results[bi] || '';
        if (trans) {
          VSTEP_VOCABULARY_OXFORD[b.idx].vi = trans;
          VSTEP_VOCABULARY_OXFORD[b.idx].meaning = trans;
          translatedCount++;
        }
      });
    }

    if ((i / BATCH_SIZE) % 5 === 0 || i + BATCH_SIZE >= missing.length) {
      console.log(`⏳ Progress: ${Math.min(i + BATCH_SIZE, missing.length)} / ${missing.length} words translated (${translatedCount} successful)`);
    }

    // Delay 150ms between requests to avoid rate limits
    await new Promise(r => setTimeout(r, 150));
  }

  console.log(`\n💾 Writing updated data back to file (${translatedCount} new translations)...`);
  const content = `// VSTEP Vocabulary — Oxford 5000 (B1/B2/C1)
// Fully translated into Vietnamese for Flashcard & Vocab mastery
// Total: ${VSTEP_VOCABULARY_OXFORD.length} entries

export const VSTEP_VOCABULARY_OXFORD = ${JSON.stringify(VSTEP_VOCABULARY_OXFORD, null, 2)};

export default VSTEP_VOCABULARY_OXFORD;
`;

  fs.writeFileSync(targetPath, content, 'utf-8');
  console.log('✅ DONE! vocabulary_oxford.js is 100% translated into Vietnamese!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
