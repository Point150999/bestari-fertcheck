require('dotenv').config();
const db = require('./database');

async function seedSOP() {
  console.log('🌱 Seeding Master Pupuk & SOP data ke Supabase...\n');

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

  for (const p of pupuks) {
    const exists = await db.get('SELECT id FROM master_pupuk WHERE nama = ?', [p.nama]);
    if (!exists) {
      await db.run('INSERT INTO master_pupuk (nama, jenis, kandungan) VALUES (?, ?, ?)', [p.nama, p.jenis, p.kandungan]);
      console.log(`  ✅ Pupuk: ${p.nama}`);
    } else {
      console.log(`  ⏭️ Pupuk sudah ada: ${p.nama}`);
    }
  }
  console.log('');

  // Helper: get pupuk ID by nama
  const getPupukId = async (nama) => {
    const row = await db.get('SELECT id FROM master_pupuk WHERE nama = ?', [nama]);
    return row?.id;
  };

  // 2. Seed SOP Antagonisme (14 pasangan)
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

  let antagCount = 0;
  for (const [a, b, interval, ket] of antagonisme) {
    const idA = await getPupukId(a);
    const idB = await getPupukId(b);
    if (idA && idB) {
      const exists = await db.get(
        'SELECT id FROM sop_antagonisme WHERE (pupuk_a_id = ? AND pupuk_b_id = ?) OR (pupuk_a_id = ? AND pupuk_b_id = ?)',
        [idA, idB, idB, idA]
      );
      if (!exists) {
        await db.run('INSERT INTO sop_antagonisme (pupuk_a_id, pupuk_b_id, interval_hari, keterangan) VALUES (?, ?, ?, ?)', [idA, idB, interval, ket]);
        console.log(`  🔴 ${a} ↔ ${b}: ${interval} hari`);
        antagCount++;
      } else {
        console.log(`  ⏭️ Antagonisme sudah ada: ${a} ↔ ${b}`);
      }
    }
  }
  console.log(`\n✅ SOP Antagonisme: ${antagCount} pasangan baru\n`);

  // 3. Seed SOP Sinergisme (7 pasangan)
  const sinergisme = [
    ['Urea', 'ZA (Ammonium Sulphate)', 'Sesama pupuk N - bisa bersamaan'],
    ['Urea', 'AC (Ammonium Chloride)', 'Sesama pupuk N - bisa bersamaan'],
    ['Urea', 'MOP', 'N + K sinergis - bisa bersamaan'],
    ['ZA (Ammonium Sulphate)', 'AC (Ammonium Chloride)', 'Sesama pupuk N - bisa bersamaan'],
    ['ZA (Ammonium Sulphate)', 'MOP', 'N/S + K sinergis - bisa bersamaan'],
    ['AC (Ammonium Chloride)', 'MOP', 'N + K sinergis - bisa bersamaan'],
    ['Kieserite', 'Dolomite', 'Mg + Ca/Mg sinergis - bisa bersamaan'],
  ];

  let sinerCount = 0;
  for (const [a, b, ket] of sinergisme) {
    const idA = await getPupukId(a);
    const idB = await getPupukId(b);
    if (idA && idB) {
      const exists = await db.get(
        'SELECT id FROM sop_sinergisme WHERE (pupuk_a_id = ? AND pupuk_b_id = ?) OR (pupuk_a_id = ? AND pupuk_b_id = ?)',
        [idA, idB, idB, idA]
      );
      if (!exists) {
        await db.run('INSERT INTO sop_sinergisme (pupuk_a_id, pupuk_b_id, keterangan) VALUES (?, ?, ?)', [idA, idB, ket]);
        console.log(`  🟢 ${a} ↔ ${b}: SINERGIS`);
        sinerCount++;
      } else {
        console.log(`  ⏭️ Sinergisme sudah ada: ${a} ↔ ${b}`);
      }
    }
  }
  console.log(`\n✅ SOP Sinergisme: ${sinerCount} pasangan baru`);
  console.log('\n🌿 Seeding selesai!');
  process.exit(0);
}

seedSOP().catch(err => { console.error('❌ Error:', err.message); process.exit(1); });
