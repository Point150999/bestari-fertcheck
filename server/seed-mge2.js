const db = require('./database');

// 1. Add jumlah_pokok column if not exists
try {
  db.exec('ALTER TABLE field_blok ADD COLUMN jumlah_pokok INTEGER DEFAULT 0');
  console.log('✅ Kolom jumlah_pokok ditambahkan');
} catch (e) {
  console.log('ℹ️ Kolom jumlah_pokok sudah ada');
}

// 2. Add pupuk mikro
const insertPupuk = db.prepare('INSERT OR IGNORE INTO master_pupuk (nama, jenis, kandungan) VALUES (?, ?, ?)');
insertPupuk.run('HGFB', 'Mikro', 'Humic & Fulvic Acid');
insertPupuk.run('Fe Lignosulfonat', 'Mikro', 'Fe (Besi)');
insertPupuk.run('Zincopbor', 'Mikro', 'Zn, Cu, B');
console.log('✅ 3 Pupuk Mikro ditambahkan (HGFB, Fe Lignosulfonat, Zincopbor)');

// 3. Create Unit Kebun MGE 2
let unit = db.prepare('SELECT id FROM unit_kebun WHERE kode = ?').get('MGE2');
if (!unit) {
  const r = db.prepare('INSERT INTO unit_kebun (nama, kode, lokasi) VALUES (?, ?, ?)').run('MGE 2', 'MGE2', 'Kalimantan');
  unit = { id: r.lastInsertRowid };
}
const unitId = unit.id;
console.log(`✅ Unit Kebun MGE 2 (ID: ${unitId})`);

// 4. Create Afdeling (Divisi)
const insertAfd = db.prepare('INSERT INTO afdeling (unit_kebun_id, nama, kode) VALUES (?, ?, ?)');
const getAfd = db.prepare('SELECT id FROM afdeling WHERE unit_kebun_id = ? AND kode = ?');

function getOrCreateAfd(nama, kode) {
  let afd = getAfd.get(unitId, kode);
  if (!afd) {
    const r = insertAfd.run(unitId, nama, kode);
    afd = { id: r.lastInsertRowid };
  }
  return afd.id;
}

const div1 = getOrCreateAfd('Divisi 1', 'DIV1');
const div2 = getOrCreateAfd('Divisi 2', 'DIV2');
const div3 = getOrCreateAfd('Divisi 3', 'DIV3');
const div4 = getOrCreateAfd('Divisi 4', 'DIV4');
console.log('✅ 4 Divisi/Afdeling dibuat');

// 5. Create Field/Blok
const insertField = db.prepare('INSERT INTO field_blok (afdeling_id, nama, kode, luas_ha, jumlah_pokok) VALUES (?, ?, ?, ?, ?)');

const fields = [
  // Divisi 1
  [div1, 'Field F005', 'F005', 71.56, 11464],
  [div1, 'Field G005', 'G005', 61.42, 9826],
  // Divisi 2
  [div2, 'Field F001', 'F001', 56.33, 9388],
  [div2, 'Field F002', 'F002', 69.38, 12223],
  [div2, 'Field F003', 'F003', 59.59, 9445],
  [div2, 'Field F004', 'F004', 56.24, 8808],
  [div2, 'Field G001', 'G001', 35.75, 6437],
  [div2, 'Field G002', 'G002', 79.32, 13597],
  [div2, 'Field G003', 'G003', 59.23, 9856],
  [div2, 'Field G004', 'G004', 82.83, 14938],
  [div2, 'Field H001', 'H001', 71.81, 12817],
  [div2, 'Field H002', 'H002', 62.22, 10961],
  [div2, 'Field I001', 'I001', 59.96, 10707],
  [div2, 'Field I002', 'I002', 52.33, 9742],
  [div2, 'Field I003', 'I003', 87.73, 14971],
  [div2, 'Field J001', 'J001', 75.57, 13484],
  [div2, 'Field J002', 'J002', 34.87, 6213],
  [div2, 'Field J003', 'J003', 64.15, 11260],
  // Divisi 3
  [div3, 'Field B005', 'B005', 56.48, 9920],
  [div3, 'Field C005', 'C005', 60.92, 11003],
  [div3, 'Field C006', 'C006', 82.55, 14644],
  [div3, 'Field D003', 'D003', 60.88, 9543],
  [div3, 'Field D004', 'D004', 60.96, 9662],
  [div3, 'Field E003', 'E003', 62.41, 9681],
  [div3, 'Field E004', 'E004', 62.63, 9984],
  [div3, 'Field E005', 'E005', 60.08, 9471],
  // Divisi 4
  [div4, 'Field B003', 'B003', 26.10, 4706],
  [div4, 'Field C002', 'C002', 67.36, 9934],
  [div4, 'Field C003', 'C003', 67.69, 12153],
  [div4, 'Field C004', 'C004', 64.25, 10026],
  [div4, 'Field D001', 'D001', 59.47, 9396],
  [div4, 'Field D002', 'D002', 62.58, 10032],
  [div4, 'Field E001', 'E001', 80.63, 13223],
];

const insertAll = db.transaction(() => {
  for (const [afdId, nama, kode, ha, pokok] of fields) {
    insertField.run(afdId, nama, kode, ha, pokok);
  }
});
insertAll();

console.log(`✅ ${fields.length} Field/Blok dibuat:`);
console.log(`   Divisi 1: 2 field`);
console.log(`   Divisi 2: 18 field`);
console.log(`   Divisi 3: 8 field`);
console.log(`   Divisi 4: 7 field`);
console.log(`   TOTAL: ${fields.length} field`);
console.log('\n🌿 Data kebun MGE 2 berhasil diinput!');
