const db = require('./database');

// Add kategori column
try {
  db.exec("ALTER TABLE field_blok ADD COLUMN kategori TEXT DEFAULT 'TM'");
  console.log('✅ Kolom kategori ditambahkan ke field_blok');
} catch (e) {
  console.log('ℹ️ Kolom kategori sudah ada');
}

// Also add kategori to rekomendasi table for separate TM/TBM recommendations
try {
  db.exec("ALTER TABLE rekomendasi ADD COLUMN kategori TEXT DEFAULT 'TM'");
  console.log('✅ Kolom kategori ditambahkan ke rekomendasi');
} catch (e) {
  console.log('ℹ️ Kolom kategori rekomendasi sudah ada');
}

// Also add kategori to realisasi
try {
  db.exec("ALTER TABLE realisasi ADD COLUMN kategori TEXT DEFAULT 'TM'");
  console.log('✅ Kolom kategori ditambahkan ke realisasi');
} catch (e) {
  console.log('ℹ️ Kolom kategori realisasi sudah ada');
}

// Set default: all existing fields as TM, then set some as TBM for demo
// For MGE 2 demo, Divisi 1 & some of Divisi 4 = TBM, rest = TM
const divTBM = db.prepare("SELECT id FROM afdeling WHERE kode IN ('DIV1')").all();
if (divTBM.length) {
  const ids = divTBM.map(d => d.id).join(',');
  db.exec(`UPDATE field_blok SET kategori = 'TBM' WHERE afdeling_id IN (${ids})`);
  console.log(`✅ Fields di Divisi 1 diset sebagai TBM`);
}

// Count
const tm = db.prepare("SELECT COUNT(*) as c FROM field_blok WHERE kategori = 'TM'").get();
const tbm = db.prepare("SELECT COUNT(*) as c FROM field_blok WHERE kategori = 'TBM'").get();
console.log(`\n📊 Hasil:`);
console.log(`   TM (Tanaman Menghasilkan): ${tm.c} field`);
console.log(`   TBM (Tanaman Belum Menghasilkan): ${tbm.c} field`);
console.log(`   Total: ${tm.c + tbm.c} field`);
