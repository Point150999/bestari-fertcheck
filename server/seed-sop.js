const db = require('./database');

// 1. Seed Master Pupuk
const pupuks = [
  { nama: 'Urea', jenis: 'Anorganik', kandungan: 'N 46%' },
  { nama: 'ZA (Ammonium Sulphate)', jenis: 'Anorganik', kandungan: 'N 21%, S 24%' },
  { nama: 'AC (Ammonium Chloride)', jenis: 'Anorganik', kandungan: 'N 25%, Cl' },
  { nama: 'Rock Phosphate', jenis: 'Anorganik', kandungan: 'P2O5 28-30%' },
  { nama: 'MOP', jenis: 'Anorganik', kandungan: 'K2O 60%' },
  { nama: 'Kieserite', jenis: 'Anorganik', kandungan: 'MgO 27%, S 22%' },
  { nama: 'Dolomite', jenis: 'Anorganik', kandungan: 'CaO 30%, MgO 18%' },
  { nama: 'Pupuk Mikro', jenis: 'Mikro', kandungan: 'Boron, Cu, Zn, Mn' },
];

const insertPupuk = db.prepare('INSERT OR IGNORE INTO master_pupuk (nama, jenis, kandungan) VALUES (?, ?, ?)');
const insertMany = db.transaction(() => {
  for (const p of pupuks) insertPupuk.run(p.nama, p.jenis, p.kandungan);
});
insertMany();
console.log('✅ Master Pupuk seeded');

// Get pupuk IDs
const getPupukId = (nama) => db.prepare('SELECT id FROM master_pupuk WHERE nama = ?').get(nama)?.id;

// 2. Seed SOP Antagonisme (pairs with interval > 0)
const antagonisme = [
  ['Urea', 'Rock Phosphate', 14, 'N vs P - interval 14 hari'],
  ['Urea', 'Kieserite', 30, 'N vs Mg - interval 30 hari'],
  ['Urea', 'Dolomite', 45, 'N vs Ca/Mg - interval 45 hari'],
  ['ZA (Ammonium Sulphate)', 'Rock Phosphate', 14, 'N/S vs P - interval 14 hari'],
  ['ZA (Ammonium Sulphate)', 'Kieserite', 30, 'N/S vs Mg - interval 30 hari'],
  ['ZA (Ammonium Sulphate)', 'Dolomite', 45, 'N/S vs Ca/Mg - interval 45 hari'],
  ['AC (Ammonium Chloride)', 'Rock Phosphate', 14, 'N/Cl vs P - interval 14 hari'],
  ['AC (Ammonium Chloride)', 'Kieserite', 30, 'N/Cl vs Mg - interval 30 hari'],
  ['AC (Ammonium Chloride)', 'Dolomite', 45, 'N/Cl vs Ca/Mg - interval 45 hari'],
  ['Rock Phosphate', 'MOP', 30, 'P vs K - interval 30 hari'],
  ['Rock Phosphate', 'Kieserite', 14, 'P vs Mg - interval 14 hari'],
  ['Rock Phosphate', 'Dolomite', 14, 'P vs Ca/Mg - interval 14 hari'],
  ['MOP', 'Kieserite', 21, 'K vs Mg - interval 21 hari'],
  ['MOP', 'Dolomite', 14, 'K vs Ca/Mg - interval 14 hari'],
];

const insertAntag = db.prepare('INSERT INTO sop_antagonisme (pupuk_a_id, pupuk_b_id, interval_hari, keterangan) VALUES (?, ?, ?, ?)');
const insertAntags = db.transaction(() => {
  for (const [a, b, interval, ket] of antagonisme) {
    const idA = getPupukId(a);
    const idB = getPupukId(b);
    if (idA && idB) {
      insertAntag.run(idA, idB, interval, ket);
      console.log(`  🔴 ${a} ↔ ${b}: ${interval} hari`);
    }
  }
});
insertAntags();
console.log('✅ SOP Antagonisme seeded (14 pasangan)');

// 3. Seed SOP Sinergisme (pairs with "-" = bisa bersamaan)
const sinergisme = [
  ['Urea', 'ZA (Ammonium Sulphate)', 'Sesama pupuk N - bisa bersamaan'],
  ['Urea', 'AC (Ammonium Chloride)', 'Sesama pupuk N - bisa bersamaan'],
  ['Urea', 'MOP', 'N + K sinergis - bisa bersamaan'],
  ['ZA (Ammonium Sulphate)', 'AC (Ammonium Chloride)', 'Sesama pupuk N - bisa bersamaan'],
  ['ZA (Ammonium Sulphate)', 'MOP', 'N/S + K sinergis - bisa bersamaan'],
  ['AC (Ammonium Chloride)', 'MOP', 'N + K sinergis - bisa bersamaan'],
  ['Kieserite', 'Dolomite', 'Mg + Ca/Mg sinergis - bisa bersamaan'],
];

const insertSiner = db.prepare('INSERT INTO sop_sinergisme (pupuk_a_id, pupuk_b_id, keterangan) VALUES (?, ?, ?)');
const insertSiners = db.transaction(() => {
  for (const [a, b, ket] of sinergisme) {
    const idA = getPupukId(a);
    const idB = getPupukId(b);
    if (idA && idB) {
      insertSiner.run(idA, idB, ket);
      console.log(`  🟢 ${a} ↔ ${b}: SINERGIS`);
    }
  }
});
insertSiners();
console.log('✅ SOP Sinergisme seeded (7 pasangan)');
console.log('\n🌿 Semua data SOP berhasil diinput!');
