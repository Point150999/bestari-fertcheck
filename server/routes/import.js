const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const fs = require('fs');
const db = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const os = require('os');
const uploadDir = process.env.VERCEL ? os.tmpdir() : './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: uploadDir });

// Helper: Convert Excel serial date number to YYYY-MM-DD string
function parseExcelDate(val) {
  if (!val) return null;
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val);
    if (d) return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  // If it's already a string, try to normalize it
  const s = String(val).trim();
  // Handle dd/mm/yyyy or dd-mm-yyyy
  const parts = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (parts) return `${parts[3]}-${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
  // Handle yyyy-mm-dd (already correct)
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return s || null;
}

// ===== IMPORT REKOMENDASI =====
router.post('/rekomendasi', authenticateToken, requireRole('admin'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'File wajib diupload' });
    const { unit_kebun_id, semester, tahun, kategori } = req.body;
    if (!unit_kebun_id || !semester || !tahun) return res.status(400).json({ error: 'Unit kebun, semester, dan tahun wajib diisi' });

    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    const results = { success: 0, errors: [] };

    // Process each row independently (no single transaction to avoid cascade failures)
    for (let idx = 0; idx < rows.length; idx++) {
      const row = rows[idx];
      try {
        const fieldKey = String(row['Field'] || row['Kode Field'] || '').trim();
        const fieldName = String(row['Field'] || row['Nama Field'] || '').trim();
        const fieldQuery = kategori && kategori !== 'semua'
          ? `SELECT fb.id FROM field_blok fb JOIN afdeling a ON fb.afdeling_id = a.id WHERE (fb.kode = ? OR fb.nama = ?) AND a.unit_kebun_id = ? AND fb.kategori = ?`
          : `SELECT fb.id FROM field_blok fb JOIN afdeling a ON fb.afdeling_id = a.id WHERE (fb.kode = ? OR fb.nama = ?) AND a.unit_kebun_id = ?`;
        const fieldParams = kategori && kategori !== 'semua'
          ? [fieldKey, fieldName, parseInt(unit_kebun_id), kategori]
          : [fieldKey, fieldName, parseInt(unit_kebun_id)];
        const field = await db.get(fieldQuery, fieldParams);

        const pupukNama = String(row['Pupuk'] || row['Jenis Pupuk'] || '').trim();
        const pupuk = await db.get('SELECT id FROM master_pupuk WHERE nama = ?', [pupukNama]);

        if (!field) { results.errors.push({ row: idx + 2, error: `Field "${fieldKey || fieldName}" tidak ditemukan` }); continue; }
        if (!pupuk) { results.errors.push({ row: idx + 2, error: `Pupuk "${pupukNama}" tidak ditemukan di master` }); continue; }

        // Parse tanggal (handle Excel serial numbers)
        const tanggal = parseExcelDate(row['Tanggal Rencana'] || row['Tanggal']);

        await db.run(
          'INSERT INTO rekomendasi (unit_kebun_id, field_blok_id, pupuk_id, semester, tahun, dosis_per_pokok, tonase, tanggal_rencana, keterangan) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [parseInt(unit_kebun_id), field.id, pupuk.id, parseInt(semester), parseInt(tahun),
            parseFloat(row['Dosis/Pokok'] || row['Dosis per Pokok'] || row['DosisPokok'] || 0),
            parseFloat(row['Tonase'] || row['Dosis/Ha'] || row['Dosis per Ha'] || row['DosisHa'] || 0),
            tanggal,
            row['Keterangan'] || null]
        );
        results.success++;
      } catch (e) { results.errors.push({ row: idx + 2, error: e.message }); }
    }

    fs.unlinkSync(req.file.path);
    res.json(results);
  } catch (err) {
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: err.message });
  }
});

// ===== IMPORT REALISASI HISTORIS =====
router.post('/realisasi', authenticateToken, requireRole('admin'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'File wajib diupload' });
    const { unit_kebun_id, kategori } = req.body;
    if (!unit_kebun_id) return res.status(400).json({ error: 'Unit kebun wajib diisi' });

    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    const results = { success: 0, errors: [], warnings: [] };

    // Process each row independently
    for (let idx = 0; idx < rows.length; idx++) {
      const row = rows[idx];
      try {
        const fieldKey = String(row['Field'] || row['Kode Field'] || '').trim();
        const fieldName = String(row['Field'] || row['Nama Field'] || '').trim();
        const fieldQuery = kategori && kategori !== 'semua'
          ? `SELECT fb.id FROM field_blok fb JOIN afdeling a ON fb.afdeling_id = a.id WHERE (fb.kode = ? OR fb.nama = ?) AND a.unit_kebun_id = ? AND fb.kategori = ?`
          : `SELECT fb.id FROM field_blok fb JOIN afdeling a ON fb.afdeling_id = a.id WHERE (fb.kode = ? OR fb.nama = ?) AND a.unit_kebun_id = ?`;
        const fieldParams = kategori && kategori !== 'semua'
          ? [fieldKey, fieldName, parseInt(unit_kebun_id), kategori]
          : [fieldKey, fieldName, parseInt(unit_kebun_id)];
        const field = await db.get(fieldQuery, fieldParams);

        const pupukNama = String(row['Pupuk'] || row['Jenis Pupuk'] || '').trim();
        const pupuk = await db.get('SELECT id FROM master_pupuk WHERE nama = ?', [pupukNama]);

        if (!field) { results.errors.push({ row: idx + 2, error: `Field "${fieldKey || fieldName}" tidak ditemukan` }); continue; }
        if (!pupuk) { results.errors.push({ row: idx + 2, error: `Pupuk "${pupukNama}" tidak ditemukan di master` }); continue; }

        // Parse tanggal (handle Excel serial numbers)
        const tanggal = parseExcelDate(row['Tanggal']);

        // Check duplicates
        const dup = await db.get('SELECT id FROM realisasi WHERE field_blok_id=? AND pupuk_id=? AND tanggal=?', [field.id, pupuk.id, tanggal]);
        if (dup) { results.warnings.push({ row: idx + 2, warning: `Duplikat: ${fieldKey} + ${pupukNama} pada ${tanggal}` }); continue; }

        await db.run(
          "INSERT INTO realisasi (unit_kebun_id, field_blok_id, pupuk_id, tanggal, dosis_aktual, tipe, catatan, pelaksana, user_input_id) VALUES (?, ?, ?, ?, ?, 'realisasi', ?, ?, ?)",
          [parseInt(unit_kebun_id), field.id, pupuk.id, tanggal,
            parseFloat(row['Tonase'] || row['Dosis'] || row['Dosis Aktual'] || 0),
            row['Catatan'] || null,
            row['Pelaksana'] || null,
            req.user.id]
        );
        results.success++;
      } catch (e) { results.errors.push({ row: idx + 2, error: e.message }); }
    }

    fs.unlinkSync(req.file.path);
    res.json(results);
  } catch (err) {
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: err.message });
  }
});

// ===== IMPORT STRUKTUR KEBUN (Divisi + Field) =====
router.post('/struktur-kebun', authenticateToken, requireRole('admin'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'File wajib diupload' });
    const { unit_kebun_id } = req.body;
    if (!unit_kebun_id) return res.status(400).json({ error: 'Unit kebun wajib diisi' });

    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    const results = { success: 0, errors: [], divisi_created: 0 };

    await db.transaction(async (txDb) => {
      for (let idx = 0; idx < rows.length; idx++) {
        const row = rows[idx];
        try {
          const divisiNama = String(row['Divisi'] || row['Afdeling'] || '').trim();
          const fieldKode = String(row['Field'] || row['Kode'] || '').trim();
          if (!divisiNama || !fieldKode) { results.errors.push({ row: idx + 2, error: 'Divisi dan Field wajib diisi' }); continue; }

          // Find or create afdeling
          let afd = await txDb.get('SELECT id FROM afdeling WHERE nama = ? AND unit_kebun_id = ?', [divisiNama, parseInt(unit_kebun_id)]);
          if (!afd) {
            const afdResult = await txDb.run('INSERT INTO afdeling (unit_kebun_id, nama, kode) VALUES (?, ?, ?)', [parseInt(unit_kebun_id), divisiNama, divisiNama.replace(/\s+/g, '')]);
            afd = { id: afdResult.id };
            results.divisi_created++;
          }

          // Check if field already exists
          const existing = await txDb.get('SELECT id FROM field_blok WHERE kode = ? AND afdeling_id = ?', [fieldKode, afd.id]);
          if (existing) { results.errors.push({ row: idx + 2, error: `Field ${fieldKode} sudah ada di ${divisiNama}` }); continue; }

          const kategori = row['Kategori'] || 'TM';
          await txDb.run('INSERT INTO field_blok (afdeling_id, nama, kode, luas_ha, kategori) VALUES (?, ?, ?, ?, ?)',
            [afd.id, fieldKode, fieldKode, parseFloat(row['Ha'] || row['Luas'] || 0), kategori]);
          results.success++;
        } catch (e) { results.errors.push({ row: idx + 2, error: e.message }); }
      }
    });

    fs.unlinkSync(req.file.path);
    res.json(results);
  } catch (err) {
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
