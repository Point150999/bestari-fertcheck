const db = require('./database');
const bcrypt = require('bcryptjs');

const hash = (pw) => bcrypt.hashSync(pw, 10);

// Get unit MGE 2
const unit = db.prepare('SELECT id FROM unit_kebun WHERE kode = ?').get('MGE2');
if (!unit) { console.log('❌ Unit MGE2 tidak ditemukan. Jalankan seed-mge2.js dulu.'); process.exit(1); }

// Create sample users
const users = [
  { nama: 'Budi Mandor', email: 'mandor@mge2.com', password: 'mandor123', role: 'mandor', unit_kebun_id: unit.id },
  { nama: 'Sari Asisten', email: 'asisten@mge2.com', password: 'asisten123', role: 'asisten', unit_kebun_id: unit.id },
  { nama: 'Hendra Manager', email: 'manager@mge2.com', password: 'manager123', role: 'manager', unit_kebun_id: unit.id },
  { nama: 'Rizal Area Controller', email: 'ac@area1.com', password: 'ac123', role: 'area_controller', unit_kebun_id: null },
];

const insert = db.prepare('INSERT OR IGNORE INTO users (nama, email, password_hash, role, unit_kebun_id) VALUES (?, ?, ?, ?, ?)');
for (const u of users) {
  insert.run(u.nama, u.email, hash(u.password), u.role, u.unit_kebun_id);
  console.log(`✅ ${u.role}: ${u.email} / ${u.password}`);
}

// Assign Area Controller to MGE 2
const ac = db.prepare('SELECT id FROM users WHERE email = ?').get('ac@area1.com');
if (ac) {
  db.prepare('INSERT OR IGNORE INTO area_controller_unit (user_id, unit_kebun_id) VALUES (?, ?)').run(ac.id, unit.id);
  console.log(`✅ Area Controller assigned to MGE 2`);
}

// Seed sample realisasi historis
const fields = db.prepare(`SELECT fb.id, fb.kode FROM field_blok fb JOIN afdeling a ON fb.afdeling_id = a.id WHERE a.unit_kebun_id = ?`).all(unit.id);
const pupuks = db.prepare('SELECT id, nama FROM master_pupuk WHERE jenis = ?').all('Anorganik');

const insertReal = db.prepare(`INSERT OR IGNORE INTO realisasi (unit_kebun_id, field_blok_id, pupuk_id, tanggal, dosis_aktual, tipe, pelaksana, user_input_id) VALUES (?, ?, ?, ?, ?, 'realisasi', ?, ?)`);

const adminId = db.prepare('SELECT id FROM users WHERE role = ?').get('admin')?.id || 1;

// Generate 3 months of historical data
const realisasiData = [];
const months = ['2026-01', '2026-02', '2026-03'];

const insertAll = db.transaction(() => {
  for (const field of fields.slice(0, 20)) {
    for (const month of months) {
      const pupuk = pupuks[Math.floor(Math.random() * pupuks.length)];
      const day = String(Math.floor(Math.random() * 25) + 1).padStart(2, '0');
      const tanggal = `${month}-${day}`;
      const dosis = (Math.random() * 2 + 0.5).toFixed(2);
      try {
        insertReal.run(unit.id, field.id, pupuk.id, tanggal, parseFloat(dosis), 'Mandor Lapangan', adminId);
        realisasiData.push({ field: field.kode, pupuk: pupuk.nama, tanggal, dosis });
      } catch (e) {}
    }
  }
});
insertAll();

console.log(`\n✅ ${realisasiData.length} data realisasi historis (Jan-Mar 2026) ditambahkan`);
console.log('\n🌿 Semua data sample berhasil!');
console.log('\n📋 Akun yang tersedia:');
console.log('  admin@fertcheck.com / admin123 (Admin)');
console.log('  mandor@mge2.com / mandor123 (Mandor)');
console.log('  asisten@mge2.com / asisten123 (Asisten)');
console.log('  manager@mge2.com / manager123 (Manager)');
console.log('  ac@area1.com / ac123 (Area Controller)');
