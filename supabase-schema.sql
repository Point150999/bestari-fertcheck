-- =============================================
-- Bestari FertCheck - Supabase PostgreSQL Schema
-- =============================================

CREATE TABLE IF NOT EXISTS unit_kebun (
  id SERIAL PRIMARY KEY,
  nama TEXT NOT NULL,
  kode TEXT UNIQUE NOT NULL,
  lokasi TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS afdeling (
  id SERIAL PRIMARY KEY,
  unit_kebun_id INTEGER NOT NULL REFERENCES unit_kebun(id) ON DELETE CASCADE,
  nama TEXT NOT NULL,
  kode TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS field_blok (
  id SERIAL PRIMARY KEY,
  afdeling_id INTEGER NOT NULL REFERENCES afdeling(id) ON DELETE CASCADE,
  nama TEXT NOT NULL,
  kode TEXT NOT NULL,
  luas_ha REAL DEFAULT 0,
  tahun_tanam INTEGER,
  kategori TEXT DEFAULT 'TM'
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  nama TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin','area_controller','rceo','manager','asisten','mandor')),
  unit_kebun_id INTEGER REFERENCES unit_kebun(id) ON DELETE SET NULL,
  is_active INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS area_controller_unit (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  unit_kebun_id INTEGER NOT NULL REFERENCES unit_kebun(id) ON DELETE CASCADE,
  UNIQUE(user_id, unit_kebun_id)
);

CREATE TABLE IF NOT EXISTS otorisasi_khusus (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  unit_kebun_id INTEGER NOT NULL REFERENCES unit_kebun(id) ON DELETE CASCADE,
  fitur TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS master_pupuk (
  id SERIAL PRIMARY KEY,
  nama TEXT NOT NULL UNIQUE,
  jenis TEXT,
  kandungan TEXT
);

CREATE TABLE IF NOT EXISTS sop_antagonisme (
  id SERIAL PRIMARY KEY,
  pupuk_a_id INTEGER NOT NULL REFERENCES master_pupuk(id) ON DELETE CASCADE,
  pupuk_b_id INTEGER NOT NULL REFERENCES master_pupuk(id) ON DELETE CASCADE,
  interval_hari INTEGER NOT NULL,
  keterangan TEXT
);

CREATE TABLE IF NOT EXISTS sop_sinergisme (
  id SERIAL PRIMARY KEY,
  pupuk_a_id INTEGER NOT NULL REFERENCES master_pupuk(id) ON DELETE CASCADE,
  pupuk_b_id INTEGER NOT NULL REFERENCES master_pupuk(id) ON DELETE CASCADE,
  keterangan TEXT
);

CREATE TABLE IF NOT EXISTS rekomendasi (
  id SERIAL PRIMARY KEY,
  unit_kebun_id INTEGER NOT NULL REFERENCES unit_kebun(id) ON DELETE CASCADE,
  field_blok_id INTEGER NOT NULL REFERENCES field_blok(id) ON DELETE CASCADE,
  pupuk_id INTEGER NOT NULL REFERENCES master_pupuk(id) ON DELETE CASCADE,
  semester INTEGER NOT NULL,
  tahun INTEGER NOT NULL,
  dosis_per_pokok REAL,
  dosis_per_ha REAL,
  tonase REAL DEFAULT 0,
  tanggal_rencana DATE,
  keterangan TEXT
);

CREATE TABLE IF NOT EXISTS realisasi (
  id SERIAL PRIMARY KEY,
  unit_kebun_id INTEGER NOT NULL REFERENCES unit_kebun(id) ON DELETE CASCADE,
  field_blok_id INTEGER NOT NULL REFERENCES field_blok(id) ON DELETE CASCADE,
  pupuk_id INTEGER NOT NULL REFERENCES master_pupuk(id) ON DELETE CASCADE,
  tanggal DATE NOT NULL,
  dosis_aktual REAL,
  tipe TEXT NOT NULL CHECK(tipe IN ('rencana','realisasi')),
  is_override INTEGER DEFAULT 0,
  override_by INTEGER,
  catatan TEXT,
  pelaksana TEXT,
  user_input_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_realisasi_unit ON realisasi(unit_kebun_id);
CREATE INDEX IF NOT EXISTS idx_realisasi_field ON realisasi(field_blok_id);
CREATE INDEX IF NOT EXISTS idx_realisasi_tanggal ON realisasi(tanggal);
CREATE INDEX IF NOT EXISTS idx_rekomendasi_unit ON rekomendasi(unit_kebun_id);
CREATE INDEX IF NOT EXISTS idx_rekomendasi_field ON rekomendasi(field_blok_id);
CREATE INDEX IF NOT EXISTS idx_field_blok_afdeling ON field_blok(afdeling_id);
CREATE INDEX IF NOT EXISTS idx_afdeling_unit ON afdeling(unit_kebun_id);
