/**
 * Data Converter Tools
 * Convert external data sources into app format
 * 
 * Usage: node converter.js
 */

// =====================================================
// CONVERTER 1: Anki CSV → App vocabulary format
// =====================================================
// Anki export format: Front \t Back \t Tags
// Usage: importAnkiCSV(csvText, 'thyroid', 'B2')

export function importAnkiCSV(csvText, moduleId, defaultDifficulty = 'B1') {
  const lines = csvText.trim().split('\n');
  return lines.map((line, i) => {
    const parts = line.split('\t');
    const term = (parts[0] || '').trim();
    const back = (parts[1] || '').trim();
    const tags = (parts[2] || '').trim().split(' ').filter(Boolean);

    // Try to split Vietnamese from definition (if separated by "|" or newline)
    const backParts = back.split(/\||<br>|\\n/).map(s => s.trim());
    const vietnamese = backParts[0] || back;
    const definition = backParts[1] || '';

    return {
      id: `${moduleId}_import_${String(i + 1).padStart(3, '0')}`,
      module: moduleId,
      category: tags[0] || 'general',
      term,
      abbreviation: null,
      vietnamese,
      pronunciation: '',
      definition,
      example: '',
      clinicalNote: '',
      difficulty: defaultDifficulty,
      tags,
    };
  }).filter(w => w.term);
}

// =====================================================
// CONVERTER 2: Simple word list (one per line) → vocabulary
// =====================================================
// Format: "term | vietnamese | difficulty"
// Example: "hyperthyroidism | cường giáp | B2"

export function importSimpleWordList(text, moduleId, category = 'general') {
  const lines = text.trim().split('\n');
  return lines.map((line, i) => {
    const parts = line.split('|').map(s => s.trim());
    return {
      id: `${moduleId}_wl_${String(i + 1).padStart(3, '0')}`,
      module: moduleId,
      category,
      term: parts[0] || '',
      abbreviation: null,
      vietnamese: parts[1] || '',
      pronunciation: parts[2] || '',
      definition: parts[3] || '',
      example: '',
      clinicalNote: '',
      difficulty: parts[4] || 'B1',
      tags: [category],
    };
  }).filter(w => w.term);
}

// =====================================================
// CONVERTER 3: MedlinePlus XML → vocabulary
// (For use with Node.js + xml2js package)
// =====================================================
// npm install xml2js node-fetch
// Fetch from: https://wsearch.nlm.nih.gov/ws/query?db=healthTopics&term=thyroid

export async function fetchMedlinePlusTerms(searchTerm) {
  const url = `https://wsearch.nlm.nih.gov/ws/query?db=healthTopics&term=${encodeURIComponent(searchTerm)}&retmax=20`;
  const response = await fetch(url);
  const xml = await response.text();
  // Parse XML and extract terms... (requires xml2js in Node env)
  console.log('MedlinePlus XML fetched, parse with xml2js');
  return xml;
}

// =====================================================
// CONVERTER 4: Generate terms using AI output
// Paste AI JSON output and validate/normalize
// =====================================================

export function normalizeAIOutput(rawTerms, moduleId) {
  return rawTerms.map((t, i) => ({
    id: t.id || `${moduleId}_ai_${String(i + 1).padStart(3, '0')}`,
    module: moduleId,
    category: t.category || 'general',
    term: (t.term || '').trim(),
    abbreviation: t.abbreviation || null,
    vietnamese: (t.vietnamese || t.vi || '').trim(),
    pronunciation: t.pronunciation || t.ipa || '',
    definition: (t.definition || '').trim(),
    example: t.example || '',
    clinicalNote: t.clinicalNote || t.note || '',
    difficulty: t.difficulty || 'B1',
    tags: Array.isArray(t.tags) ? t.tags : [t.category || 'general'],
  })).filter(t => t.term && t.vietnamese);
}

// =====================================================
// CONVERTER 5: Export existing terms to CSV for editing
// =====================================================

export function exportToCSV(vocabulary) {
  const header = 'id,module,category,term,abbreviation,vietnamese,pronunciation,definition,example,clinicalNote,difficulty,tags';
  const rows = vocabulary.map(w => [
    w.id, w.module, w.category, w.term, w.abbreviation || '',
    w.vietnamese, w.pronunciation || '', w.definition || '',
    w.example || '', w.clinicalNote || '', w.difficulty,
    (w.tags || []).join(';')
  ].map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','));
  return [header, ...rows].join('\n');
}

// =====================================================
// DEMO: How to use
// =====================================================

// Example word list for quick testing:
const DEMO_WORD_LIST = `
hyperthyroidism | cường giáp | /ˌhaɪpərˈθaɪrɔɪdɪzəm/ | Excess thyroid hormone production | B2
hypothyroidism | suy giáp | /ˌhaɪpəˈθaɪrɔɪdɪzəm/ | Deficient thyroid hormone production | B2
goiter | bướu cổ | /ˈɡɔɪtər/ | Enlargement of the thyroid gland | B1
thyrotoxicosis | nhiễm độc giáp | /ˌθaɪrəˌtɒksɪˈkəʊsɪs/ | Clinical syndrome from excess thyroid hormones | C1
`.trim();

// Parse it:
const parsed = importSimpleWordList(DEMO_WORD_LIST, 'thyroid', 'pathology');
console.log('Parsed words:', JSON.stringify(parsed, null, 2));
