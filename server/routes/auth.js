const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');
const { JWT_SECRET } = require('../middleware/auth');

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email dan password wajib diisi' });

    const user = await db.get(`
      SELECT u.*, uk.nama as unit_kebun_nama, uk.kode as unit_kebun_kode
      FROM users u
      LEFT JOIN unit_kebun uk ON u.unit_kebun_id = uk.id
      WHERE u.email = ? AND u.is_active = 1
    `, [email]);

    if (!user) return res.status(401).json({ error: 'Email atau password salah' });
    if (!bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: 'Email atau password salah' });

    // Get accessible units for area controller
    let accessible_units = [];
    if (user.role === 'area_controller' || user.role === 'rceo') {
      accessible_units = await db.all(`
        SELECT uk.id, uk.nama, uk.kode FROM area_controller_unit acu
        JOIN unit_kebun uk ON acu.unit_kebun_id = uk.id
        WHERE acu.user_id = ?
      `, [user.id]);
    }

    const token = jwt.sign({
      id: user.id,
      nama: user.nama,
      email: user.email,
      role: user.role,
      unit_kebun_id: user.unit_kebun_id,
      unit_kebun_nama: user.unit_kebun_nama,
      unit_kebun_kode: user.unit_kebun_kode,
      accessible_units
    }, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      token,
      user: {
        id: user.id,
        nama: user.nama,
        email: user.email,
        role: user.role,
        unit_kebun_id: user.unit_kebun_id,
        unit_kebun_nama: user.unit_kebun_nama,
        unit_kebun_kode: user.unit_kebun_kode,
        accessible_units
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', require('../middleware/auth').authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
