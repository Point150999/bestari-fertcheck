const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');

// ===== UNIT KEBUN =====
router.get('/units', authenticateToken, async (req, res) => {
  try {
    const units = await db.all('SELECT * FROM unit_kebun ORDER BY nama');
    res.json(units);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/units', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { nama, kode, lokasi } = req.body;
    const result = await db.run('INSERT INTO unit_kebun (nama, kode, lokasi) VALUES (?, ?, ?)', [nama, kode, lokasi]);
    res.json({ id: result.id, nama, kode, lokasi });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/units/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { nama, kode, lokasi } = req.body;
    await db.run('UPDATE unit_kebun SET nama=?, kode=?, lokasi=? WHERE id=?', [nama, kode, lokasi, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/units/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await db.run('DELETE FROM unit_kebun WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ===== AFDELING =====
router.get('/afdelings', authenticateToken, async (req, res) => {
  try {
    const { unit_kebun_id } = req.query;
    let q = 'SELECT a.*, uk.nama as unit_nama FROM afdeling a JOIN unit_kebun uk ON a.unit_kebun_id = uk.id';
    if (unit_kebun_id) q += ` WHERE a.unit_kebun_id = ${parseInt(unit_kebun_id)}`;
    q += ' ORDER BY a.nama';
    res.json(await db.all(q));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/afdelings', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { unit_kebun_id, nama, kode } = req.body;
    const result = await db.run('INSERT INTO afdeling (unit_kebun_id, nama, kode) VALUES (?, ?, ?)', [unit_kebun_id, nama, kode]);
    res.json({ id: result.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/afdelings/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await db.run('DELETE FROM afdeling WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ===== FIELD / BLOK =====
router.get('/fields', authenticateToken, async (req, res) => {
  try {
    const { afdeling_id, unit_kebun_id } = req.query;
    let q = `SELECT fb.*, a.nama as afdeling_nama, a.kode as afdeling_kode, uk.nama as unit_nama, uk.id as unit_kebun_id
             FROM field_blok fb
             JOIN afdeling a ON fb.afdeling_id = a.id
             JOIN unit_kebun uk ON a.unit_kebun_id = uk.id`;
    const conditions = [];
    if (afdeling_id) conditions.push(`fb.afdeling_id = ${parseInt(afdeling_id)}`);
    if (unit_kebun_id) conditions.push(`uk.id = ${parseInt(unit_kebun_id)}`);
    if (conditions.length) q += ' WHERE ' + conditions.join(' AND ');
    q += ' ORDER BY fb.nama';
    res.json(await db.all(q));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/fields', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { afdeling_id, nama, kode, luas_ha, tahun_tanam } = req.body;
    const result = await db.run('INSERT INTO field_blok (afdeling_id, nama, kode, luas_ha, tahun_tanam) VALUES (?, ?, ?, ?, ?)', [afdeling_id, nama, kode, luas_ha || 0, tahun_tanam]);
    res.json({ id: result.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/fields/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await db.run('DELETE FROM field_blok WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Bulk delete fields
router.post('/fields/bulk-delete', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Pilih minimal 1 field untuk dihapus' });
    }
    await db.transaction(async (txDb) => {
      for (const id of ids) {
        await txDb.run('DELETE FROM field_blok WHERE id = ?', [id]);
      }
    });
    res.json({ success: true, deleted: ids.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/fields/:id/kategori', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { kategori } = req.body;
    if (!['TM', 'TBM'].includes(kategori)) return res.status(400).json({ error: 'Kategori harus TM atau TBM' });
    await db.run('UPDATE field_blok SET kategori = ? WHERE id = ?', [kategori, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ===== USERS =====
router.get('/users', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const users = await db.all(`
      SELECT u.id, u.nama, u.email, u.role, u.unit_kebun_id, u.is_active, u.created_at,
             uk.nama as unit_kebun_nama
      FROM users u LEFT JOIN unit_kebun uk ON u.unit_kebun_id = uk.id
      ORDER BY u.nama
    `);
    res.json(users);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/users', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { nama, email, password, role, unit_kebun_id } = req.body;
    const hash = bcrypt.hashSync(password, 10);
    const result = await db.run('INSERT INTO users (nama, email, password_hash, role, unit_kebun_id) VALUES (?, ?, ?, ?, ?)', [nama, email, hash, role, unit_kebun_id || null]);
    res.json({ id: result.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/users/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { nama, email, role, unit_kebun_id, is_active, password } = req.body;
    if (password) {
      const hash = bcrypt.hashSync(password, 10);
      await db.run('UPDATE users SET nama=?, email=?, role=?, unit_kebun_id=?, is_active=?, password_hash=? WHERE id=?', [nama, email, role, unit_kebun_id || null, is_active, hash, req.params.id]);
    } else {
      await db.run('UPDATE users SET nama=?, email=?, role=?, unit_kebun_id=?, is_active=? WHERE id=?', [nama, email, role, unit_kebun_id || null, is_active, req.params.id]);
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/users/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await db.run('DELETE FROM users WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ===== AREA CONTROLLER ASSIGNMENT =====
router.get('/area-controller/:userId/units', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const units = await db.all(`
      SELECT uk.* FROM area_controller_unit acu
      JOIN unit_kebun uk ON acu.unit_kebun_id = uk.id
      WHERE acu.user_id = ?
    `, [req.params.userId]);
    res.json(units);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/area-controller/:userId/units', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { unit_ids } = req.body;
    const userId = req.params.userId;
    await db.transaction(async (txDb) => {
      await txDb.run('DELETE FROM area_controller_unit WHERE user_id = ?', [userId]);
      for (const uid of (unit_ids || [])) {
        await txDb.run('INSERT INTO area_controller_unit (user_id, unit_kebun_id) VALUES (?, ?)', [userId, uid]);
      }
    });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ===== MASTER PUPUK =====
router.get('/pupuk', authenticateToken, async (req, res) => {
  try { res.json(await db.all('SELECT * FROM master_pupuk ORDER BY nama')); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/pupuk', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { nama, jenis, kandungan } = req.body;
    const result = await db.run('INSERT INTO master_pupuk (nama, jenis, kandungan) VALUES (?, ?, ?)', [nama, jenis, kandungan]);
    res.json({ id: result.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/pupuk/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { nama, jenis, kandungan } = req.body;
    await db.run('UPDATE master_pupuk SET nama=?, jenis=?, kandungan=? WHERE id=?', [nama, jenis, kandungan, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/pupuk/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await db.run('DELETE FROM master_pupuk WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ===== SOP ANTAGONISME =====
router.get('/sop/antagonisme', authenticateToken, async (req, res) => {
  try {
    res.json(await db.all(`
      SELECT s.*, pa.nama as pupuk_a_nama, pb.nama as pupuk_b_nama
      FROM sop_antagonisme s
      JOIN master_pupuk pa ON s.pupuk_a_id = pa.id
      JOIN master_pupuk pb ON s.pupuk_b_id = pb.id
      ORDER BY pa.nama
    `));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/sop/antagonisme', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { pupuk_a_id, pupuk_b_id, interval_hari, keterangan } = req.body;
    const result = await db.run('INSERT INTO sop_antagonisme (pupuk_a_id, pupuk_b_id, interval_hari, keterangan) VALUES (?, ?, ?, ?)', [pupuk_a_id, pupuk_b_id, interval_hari, keterangan]);
    res.json({ id: result.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/sop/antagonisme/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await db.run('DELETE FROM sop_antagonisme WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ===== SOP SINERGISME =====
router.get('/sop/sinergisme', authenticateToken, async (req, res) => {
  try {
    res.json(await db.all(`
      SELECT s.*, pa.nama as pupuk_a_nama, pb.nama as pupuk_b_nama
      FROM sop_sinergisme s
      JOIN master_pupuk pa ON s.pupuk_a_id = pa.id
      JOIN master_pupuk pb ON s.pupuk_b_id = pb.id
      ORDER BY pa.nama
    `));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/sop/sinergisme', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { pupuk_a_id, pupuk_b_id, keterangan } = req.body;
    const result = await db.run('INSERT INTO sop_sinergisme (pupuk_a_id, pupuk_b_id, keterangan) VALUES (?, ?, ?)', [pupuk_a_id, pupuk_b_id, keterangan]);
    res.json({ id: result.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/sop/sinergisme/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    await db.run('DELETE FROM sop_sinergisme WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
