const fs = require('fs');
const path = require('path');

const rawItems = JSON.parse(fs.readFileSync(path.join(__dirname, 'extracted_equipment.json'), 'utf-8'));
const lines = rawItems.map(item => {
  const purchaseDate = item.usageYear && item.usageYear !== '0' ? `${item.usageYear}-01-01` : '';
  const notes = `Model: ${item.model.trim()} | Hãng: ${item.manufacturer.trim()} (${item.origin.trim()}) | SL: ${item.quantity.trim()}`;
  const parts = [
    `id: uid('E')`,
    `name: ${JSON.stringify(item.name.trim())}`,
    `code: ${JSON.stringify(item.code.trim())}`,
    `inCharge: 'Tổ TTBYT Khoa Ngoại'`,
    purchaseDate ? `purchaseDate: ${JSON.stringify(purchaseDate)}` : null,
    `lastMaintenanceDate: '2026-01-15'`,
    `maintenanceCycle: 12`,
    `condition: 'Normal'`,
    `notes: ${JSON.stringify(notes)}`
  ].filter(Boolean);

  return `    { ${parts.join(', ')} },`;
});

fs.writeFileSync(path.join(__dirname, 'mock_may_moc.ts'), lines.join('\n'), 'utf8');
console.log('Successfully generated scripts/mock_may_moc.ts with', lines.length, 'items');
