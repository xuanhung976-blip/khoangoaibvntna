const fs = require('fs');
const content = fs.readFileSync('C:/Users/DrHung/.gemini/antigravity-ide/brain/8cf21387-c369-4e25-8a81-3174f89fcbe7/.system_generated/steps/299/content.md', 'utf8');
const lines = content.split(/\r?\n/);
const items = [];

for (const line of lines) {
  if (!line.includes('Khoa Ngoại Tổng Hợp')) continue;
  const matches = [...line.matchAll(/"([^"]*)"/g)].map(m => m[1]);
  if (matches.length >= 10) {
    items.push({
      stt: matches[0],
      dept: matches[1],
      code: matches[2],
      name: matches[3],
      model: matches[4],
      manufacturer: matches[5],
      origin: matches[6],
      manufYear: matches[7],
      usageYear: matches[8],
      quantity: matches[9]
    });
  }
}

console.log('Total items found:', items.length);
fs.writeFileSync('scripts/extracted_equipment.json', JSON.stringify(items, null, 2), 'utf8');
console.log('Written to scripts/extracted_equipment.json');
