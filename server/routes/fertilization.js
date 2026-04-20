const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

// Helper: get accessible unit IDs for user
async function getAccessibleUnits(user) {
  if (user.role === 'admin') {
    const rows = await db.all('SELECT id FROM unit_kebun');
    return rows.map(u => u.id);
  }
  if (user.role === 'area_controller' || user.role === 'rceo') {
    const rows = await db.all('SELECT unit_kebun_id as id FROM area_controller_unit WHERE user_id = ?', [user.id]);
    return rows.map(u => u.id);
  }
  return user.unit_kebun_id ? [user.unit_kebun_id] : [];
}

// ===== CHECK ANTAGONISME / SINERGISME =====
router.post('/check-antagonisme', authenticateToken, async (req, res) => {
  try {
    const { field_blok_id, pupuk_id, tanggal_rencana } = req.body;

    // Get last realisasi for this field
    const lastRealisasi = await db.get(`
      SELECT r.*, mp.nama as pupuk_nama
      FROM realisasi r
      JOIN master_pupuk mp ON r.pupuk_id = mp.id
      WHERE r.field_blok_id = ? AND r.tipe = 'realisasi'
      ORDER BY r.tanggal DESC LIMIT 1
    `, [field_blok_id]);

    if (!lastRealisasi) {
      return res.json({ status: 'aman', message: 'Belum ada data pemupukan sebelumnya di field ini.' });
    }

    const newPupuk = await db.get('SELECT nama FROM master_pupuk WHERE id = ?', [pupuk_id]);

    // Check antagonisme (both directions)
    const antagonis = await db.get(`
      SELECT * FROM sop_antagonisme
      WHERE (pupuk_a_id = ? AND pupuk_b_id = ?) OR (pupuk_a_id = ? AND pupuk_b_id = ?)
    `, [lastRealisasi.pupuk_id, pupuk_id, pupuk_id, lastRealisasi.pupuk_id]);

    if (antagonis) {
      const lastDate = new Date(lastRealisasi.tanggal);
      const safeDate = new Date(lastDate);
      safeDate.setDate(safeDate.getDate() + antagonis.interval_hari);
      const rencanaDate = new Date(tanggal_rencana);

      if (rencanaDate < safeDate) {
        return res.json({
          status: 'antagonis',
          message: `Pupuk ${newPupuk.nama} ANTAGONIS dengan ${lastRealisasi.pupuk_nama}`,
          detail: {
            pupuk_terakhir: lastRealisasi.pupuk_nama,
            tanggal_terakhir: lastRealisasi.tanggal,
            pupuk_baru: newPupuk.nama,
            interval_hari: antagonis.interval_hari,
            tanggal_aman: safeDate.toISOString().split('T')[0],
            keterangan: antagonis.keterangan
          }
        });
      } else {
        return res.json({
          status: 'aman',
          message: `Interval sudah terpenuhi. Pupuk terakhir: ${lastRealisasi.pupuk_nama} (${lastRealisasi.tanggal}).`
        });
      }
    }

    // Check sinergisme
    const sinergis = await db.get(`
      SELECT * FROM sop_sinergisme
      WHERE (pupuk_a_id = ? AND pupuk_b_id = ?) OR (pupuk_a_id = ? AND pupuk_b_id = ?)
    `, [lastRealisasi.pupuk_id, pupuk_id, pupuk_id, lastRealisasi.pupuk_id]);

    if (sinergis) {
      return res.json({
        status: 'sinergis',
        message: `Pupuk ${newPupuk.nama} SINERGIS dengan ${lastRealisasi.pupuk_nama}. Pemupukan bisa langsung dilakukan!`,
        detail: {
          pupuk_terakhir: lastRealisasi.pupuk_nama,
          tanggal_terakhir: lastRealisasi.tanggal,
          pupuk_baru: newPupuk.nama,
          keterangan: sinergis.keterangan
        }
      });
    }

    return res.json({
      status: 'netral',
      message: `Tidak ada interaksi khusus. Pupuk terakhir: ${lastRealisasi.pupuk_nama} (${lastRealisasi.tanggal}).`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== SUBMIT REALISASI / RENCANA =====
router.post('/submit', authenticateToken, async (req, res) => {
  try {
    const { unit_kebun_id, field_blok_id, pupuk_id, tanggal, dosis_aktual, tipe, catatan, pelaksana, is_override } = req.body;
    const result = await db.run(`
      INSERT INTO realisasi (unit_kebun_id, field_blok_id, pupuk_id, tanggal, dosis_aktual, tipe, catatan, pelaksana, user_input_id, is_override)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [unit_kebun_id, field_blok_id, pupuk_id, tanggal, dosis_aktual, tipe, catatan, pelaksana, req.user.id, is_override ? 1 : 0]);
    res.json({ id: result.id, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== DELETE REALISASI =====
router.delete('/realisasi/:id', authenticateToken, async (req, res) => {
  try {
    // Only admin, asisten, mandor can delete
    if (!['admin', 'asisten', 'mandor'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Tidak memiliki akses untuk menghapus data' });
    }
    const row = await db.get('SELECT * FROM realisasi WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Data tidak ditemukan' });
    // Non-admin can only delete their own entries
    if (req.user.role !== 'admin' && row.user_input_id !== req.user.id) {
      return res.status(403).json({ error: 'Hanya bisa menghapus data yang Anda input sendiri' });
    }
    await db.run('DELETE FROM realisasi WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== DELETE REKOMENDASI (admin only) =====
router.delete('/rekomendasi/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Hanya admin yang bisa menghapus rekomendasi' });
    }
    const row = await db.get('SELECT id FROM rekomendasi WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Data tidak ditemukan' });
    await db.run('DELETE FROM rekomendasi WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== BULK DELETE REKOMENDASI (admin only) =====
router.post('/rekomendasi/bulk-delete', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Hanya admin yang bisa menghapus rekomendasi' });
    }
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Pilih minimal 1 data untuk dihapus' });
    }
    for (const id of ids) {
      await db.run('DELETE FROM rekomendasi WHERE id = ?', [id]);
    }
    res.json({ success: true, deleted: ids.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/realisasi', authenticateToken, async (req, res) => {
  try {
    const unitIds = await getAccessibleUnits(req.user);
    if (!unitIds.length) return res.json([]);

    const { unit_kebun_id, field_blok_id, pupuk_id, start_date, end_date, kategori } = req.query;
    let q = `
      SELECT r.*, mp.nama as pupuk_nama, fb.nama as field_nama, fb.kode as field_kode,
             fb.kategori as field_kategori,
             a.nama as afdeling_nama, uk.nama as unit_nama,
             u.nama as user_nama
      FROM realisasi r
      JOIN master_pupuk mp ON r.pupuk_id = mp.id
      JOIN field_blok fb ON r.field_blok_id = fb.id
      JOIN afdeling a ON fb.afdeling_id = a.id
      JOIN unit_kebun uk ON r.unit_kebun_id = uk.id
      LEFT JOIN users u ON r.user_input_id = u.id
      WHERE r.unit_kebun_id IN (${unitIds.join(',')})
    `;
    if (unit_kebun_id) q += ` AND r.unit_kebun_id = ${parseInt(unit_kebun_id)}`;
    if (field_blok_id) q += ` AND r.field_blok_id = ${parseInt(field_blok_id)}`;
    if (pupuk_id) q += ` AND r.pupuk_id = ${parseInt(pupuk_id)}`;
    if (start_date) q += ` AND r.tanggal >= '${start_date}'`;
    if (end_date) q += ` AND r.tanggal <= '${end_date}'`;
    if (kategori && kategori !== 'semua') q += ` AND fb.kategori = '${kategori}'`;
    q += ' ORDER BY r.tanggal DESC';

    res.json(await db.all(q));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== GET REKOMENDASI =====
router.get('/rekomendasi', authenticateToken, async (req, res) => {
  try {
    const unitIds = await getAccessibleUnits(req.user);
    if (!unitIds.length) return res.json([]);

    const { unit_kebun_id, semester, tahun, kategori } = req.query;
    let q = `
      SELECT rk.*, mp.nama as pupuk_nama, fb.nama as field_nama, fb.kode as field_kode,
             fb.kategori as field_kategori,
             a.nama as afdeling_nama, uk.nama as unit_nama
      FROM rekomendasi rk
      JOIN master_pupuk mp ON rk.pupuk_id = mp.id
      JOIN field_blok fb ON rk.field_blok_id = fb.id
      JOIN afdeling a ON fb.afdeling_id = a.id
      JOIN unit_kebun uk ON rk.unit_kebun_id = uk.id
      WHERE rk.unit_kebun_id IN (${unitIds.join(',')})
    `;
    if (unit_kebun_id) q += ` AND rk.unit_kebun_id = ${parseInt(unit_kebun_id)}`;
    if (semester) q += ` AND rk.semester = ${parseInt(semester)}`;
    if (tahun) q += ` AND rk.tahun = ${parseInt(tahun)}`;
    if (kategori && kategori !== 'semua') q += ` AND fb.kategori = '${kategori}'`;
    q += ' ORDER BY rk.tanggal_rencana';

    res.json(await db.all(q));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== DASHBOARD STATS =====
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const unitIds = await getAccessibleUnits(req.user);
    if (!unitIds.length) return res.json({ total_fields: 0, total_realisasi: 0, total_rencana: 0, realisasi_bulan_ini: 0, antagonis_aktif: 0, monthly_stats: [] });

    const unitFilter = `unit_kebun_id IN (${unitIds.join(',')})`;
    const { unit_kebun_id, kategori } = req.query;
    const filter = unit_kebun_id ? `unit_kebun_id = ${parseInt(unit_kebun_id)}` : unitFilter;

    // Kategori join for field-based filtering
    const kategoriJoin = (kategori && kategori !== 'semua') ? ` AND fb.kategori = '${kategori}'` : '';

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const yearMonth = `${year}-${month}`;

    // Run all queries in parallel for speed
    const [total_fields_r, total_realisasi_r, total_rencana_r, realisasi_bulan_ini_r, monthly_realisasi, monthly_rencana] = await Promise.all([
      db.get(`SELECT COUNT(DISTINCT fb.id) as c FROM field_blok fb JOIN afdeling a ON fb.afdeling_id = a.id WHERE a.${filter}${kategoriJoin}`),
      db.get(`SELECT COUNT(*) as c FROM realisasi r JOIN field_blok fb ON r.field_blok_id = fb.id WHERE r.${filter} AND r.tipe='realisasi'${kategoriJoin}`),
      db.get(`SELECT COUNT(*) as c FROM rekomendasi rk JOIN field_blok fb ON rk.field_blok_id = fb.id WHERE rk.${filter} AND rk.tahun = ${year}${kategoriJoin}`),
      db.get(`SELECT COUNT(*) as c FROM realisasi r JOIN field_blok fb ON r.field_blok_id = fb.id WHERE r.${filter} AND r.tipe='realisasi' AND to_char(r.tanggal, 'YYYY-MM') = '${yearMonth}'${kategoriJoin}`),
      // Monthly realisasi counts
      db.all(`
        SELECT to_char(r.tanggal, 'MM') as bulan, COUNT(*) as jumlah
        FROM realisasi r JOIN field_blok fb ON r.field_blok_id = fb.id
        WHERE r.${filter} AND r.tipe = 'realisasi' AND to_char(r.tanggal, 'YYYY') = '${year}'${kategoriJoin}
        GROUP BY to_char(r.tanggal, 'MM') ORDER BY bulan
      `),
      // Monthly rencana counts from rekomendasi table using tanggal_rencana
      db.all(`
        SELECT to_char(rk.tanggal_rencana, 'MM') as bulan, COUNT(*) as jumlah
        FROM rekomendasi rk JOIN field_blok fb ON rk.field_blok_id = fb.id
        WHERE rk.${filter} AND rk.tahun = ${year}${kategoriJoin}
        GROUP BY to_char(rk.tanggal_rencana, 'MM') ORDER BY bulan
      `)
    ]);

    // Combine monthly stats into the format the frontend expects
    const monthly_stats = [
      ...monthly_realisasi.map(m => ({ bulan: m.bulan, tipe: 'realisasi', jumlah: parseInt(m.jumlah) })),
      ...monthly_rencana.map(m => ({ bulan: m.bulan, tipe: 'rencana', jumlah: parseInt(m.jumlah) }))
    ];

    res.json({
      total_fields: total_fields_r?.c || 0,
      total_realisasi: total_realisasi_r?.c || 0,
      total_rencana: total_rencana_r?.c || 0,
      realisasi_bulan_ini: realisasi_bulan_ini_r?.c || 0,
      monthly_stats, units: unitIds
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== PROGRESS STATS (Rekomendasi vs Realisasi) =====
router.get('/progress', authenticateToken, async (req, res) => {
  try {
    const unitIds = await getAccessibleUnits(req.user);
    if (!unitIds.length) return res.json({ total: { rekom: 0, real: 0, pct: 0 }, kategori: [], divisi: [], pupuk: [] });

    const unitFilter = unitIds.join(',');
    const { unit_kebun_id, kategori, start_date, end_date } = req.query;
    const tahun = req.query.tahun || new Date().getFullYear();
    const uFilter = unit_kebun_id ? `= ${parseInt(unit_kebun_id)}` : `IN (${unitFilter})`;

    // Kategori filter for field_blok join
    const katFilter = (kategori && kategori !== 'semua') ? ` AND fb2.kategori = '${kategori}'` : '';
    const katFilterFb = (kategori && kategori !== 'semua') ? ` AND fb.kategori = '${kategori}'` : '';

    // Date range filter for realisasi
    let dateFilter = ` AND to_char(r2.tanggal, 'YYYY') = '${tahun}'`;
    if (start_date) dateFilter = ` AND r2.tanggal >= '${start_date}'`;
    if (end_date) dateFilter += ` AND r2.tanggal <= '${end_date}'`;
    // For queries using 'r3' alias
    let dateFilterR3 = dateFilter.replace(/r2\./g, 'r3.');

    // Total: rekomendasi vs realisasi count
    const totalRekomQ = kategori && kategori !== 'semua'
      ? `SELECT COUNT(*) as c FROM rekomendasi rk JOIN field_blok fb2 ON rk.field_blok_id = fb2.id WHERE rk.unit_kebun_id ${uFilter} AND rk.tahun = ?${katFilter}`
      : `SELECT COUNT(*) as c FROM rekomendasi WHERE unit_kebun_id ${uFilter} AND tahun = ?`;
    const totalRekom = (await db.get(totalRekomQ, [tahun]))?.c || 0;

    const totalRealQ = kategori && kategori !== 'semua'
      ? `SELECT COUNT(*) as c FROM realisasi r2 JOIN field_blok fb2 ON r2.field_blok_id = fb2.id WHERE r2.unit_kebun_id ${uFilter} AND r2.tipe = 'realisasi'${dateFilter}${katFilter}`
      : `SELECT COUNT(*) as c FROM realisasi r2 WHERE r2.unit_kebun_id ${uFilter} AND r2.tipe = 'realisasi'${dateFilter}`;
    const totalReal = (await db.get(totalRealQ))?.c || 0;

    // Per Kategori (TM / TBM) - only show when no specific kategori filter
    let kategoriStats = [];
    if (!kategori || kategori === 'semua') {
      kategoriStats = await db.all(`
        SELECT fb.kategori,
          (SELECT COUNT(*) FROM rekomendasi rk2 JOIN field_blok fb2 ON rk2.field_blok_id = fb2.id WHERE rk2.unit_kebun_id ${uFilter} AND rk2.tahun = ? AND fb2.kategori = fb.kategori) as rekom,
          (SELECT COUNT(*) FROM realisasi r2 JOIN field_blok fb2 ON r2.field_blok_id = fb2.id WHERE r2.unit_kebun_id ${uFilter} AND r2.tipe = 'realisasi'${dateFilter} AND fb2.kategori = fb.kategori) as real
        FROM field_blok fb
        JOIN afdeling a ON fb.afdeling_id = a.id
        WHERE a.unit_kebun_id ${uFilter}
        GROUP BY fb.kategori
      `, [tahun]);
    }

    // Per Divisi (Afdeling) - use DISTINCT on nama to avoid duplicates from multiple imports
    const divisiStats = await db.all(`
      SELECT d.divisi, d.afdeling_id,
        (SELECT COUNT(*) FROM rekomendasi rk2 JOIN field_blok fb2 ON rk2.field_blok_id = fb2.id JOIN afdeling a2 ON fb2.afdeling_id = a2.id WHERE a2.nama = d.divisi AND a2.unit_kebun_id ${uFilter} AND rk2.tahun = ?${katFilter}) as rekom,
        (SELECT COUNT(*) FROM realisasi r2 JOIN field_blok fb2 ON r2.field_blok_id = fb2.id JOIN afdeling a2 ON fb2.afdeling_id = a2.id WHERE a2.nama = d.divisi AND a2.unit_kebun_id ${uFilter} AND r2.tipe = 'realisasi'${dateFilter}${katFilter}) as real
      FROM (SELECT DISTINCT ON (a.nama) a.nama as divisi, a.id as afdeling_id FROM afdeling a WHERE a.unit_kebun_id ${uFilter} ORDER BY a.nama, a.id) d
      ORDER BY d.divisi
    `, [tahun]);

    // Per Jenis Pupuk
    const pupukStats = await db.all(`
      SELECT mp.nama as pupuk,
        (SELECT COUNT(*) FROM rekomendasi rk2 JOIN field_blok fb2 ON rk2.field_blok_id = fb2.id WHERE rk2.pupuk_id = mp.id AND rk2.unit_kebun_id ${uFilter} AND rk2.tahun = ?${katFilter}) as rekom,
        (SELECT COUNT(*) FROM realisasi r2 JOIN field_blok fb2 ON r2.field_blok_id = fb2.id WHERE r2.pupuk_id = mp.id AND r2.unit_kebun_id ${uFilter} AND r2.tipe = 'realisasi'${dateFilter}${katFilter}) as real
      FROM master_pupuk mp
      WHERE EXISTS (SELECT 1 FROM rekomendasi rk3 JOIN field_blok fb2 ON rk3.field_blok_id = fb2.id WHERE rk3.pupuk_id = mp.id AND rk3.unit_kebun_id ${uFilter} AND rk3.tahun = ?${katFilter})
         OR EXISTS (SELECT 1 FROM realisasi r3 JOIN field_blok fb2 ON r3.field_blok_id = fb2.id WHERE r3.pupuk_id = mp.id AND r3.unit_kebun_id ${uFilter} AND r3.tipe = 'realisasi'${dateFilterR3}${katFilter})
      ORDER BY mp.nama
    `, [tahun, tahun]);

    res.json({
      total: { rekom: totalRekom, real: totalReal, pct: totalRekom > 0 ? Math.round((totalReal / totalRekom) * 100) : 0 },
      kategori: kategoriStats.map(k => ({ ...k, pct: k.rekom > 0 ? Math.round((k.real / k.rekom) * 100) : 0 })),
      divisi: divisiStats.map(d => ({ ...d, pct: d.rekom > 0 ? Math.round((d.real / d.rekom) * 100) : 0 })),
      pupuk: pupukStats.map(p => ({ ...p, pct: p.rekom > 0 ? Math.round((p.real / p.rekom) * 100) : 0 }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
