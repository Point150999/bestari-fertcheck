import { useState, useEffect } from 'react';
import { api, ROLE_LABELS } from '../utils/api';
import { Plus, Trash2, Upload, Users, MapPin, Leaf, Shield, X, Building, CheckSquare, AlertTriangle } from 'lucide-react';

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function DeleteConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div style={{ padding: 24, textAlign: 'center' }}>
          <AlertTriangle size={48} style={{ color: 'var(--accent-red)', marginBottom: 16 }} />
          <h3 style={{ marginBottom: 8, color: 'var(--text-primary)' }}>Konfirmasi Hapus</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>{message}</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={onCancel} style={{ padding: '10px 24px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 500 }}>Batal</button>
            <button onClick={onConfirm} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: 'var(--accent-red)', color: '#fff', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><Trash2 size={14} /> Ya, Hapus</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [tab, setTab] = useState('units');
  const [units, setUnits] = useState([]);
  const [users, setUsers] = useState([]);
  const [pupuks, setPupuks] = useState([]);
  const [antag, setAntag] = useState([]);
  const [siner, setSiner] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [importResult, setImportResult] = useState(null);
  const [fields, setFields] = useState([]);
  const [fieldFilter, setFieldFilter] = useState({ unit_kebun_id: '' });
  const [selectedFields, setSelectedFields] = useState(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { message, onConfirm }
  const [importLoading, setImportLoading] = useState(null); // null | { type, status }

  useEffect(() => { loadAll(); }, []);

  const loadAll = () => {
    api('/admin/units').then(setUnits).catch(() => {});
    api('/admin/users').then(setUsers).catch(() => {});
    api('/admin/pupuk').then(setPupuks).catch(() => {});
    api('/admin/sop/antagonisme').then(setAntag).catch(() => {});
    api('/admin/sop/sinergisme').then(setSiner).catch(() => {});
    api('/admin/fields').then(setFields).catch(() => {});
  };

  const handleSave = async (endpoint, method, body) => {
    try {
      await api(endpoint, { method, body: JSON.stringify(body) });
      setModal(null); setForm({});
      loadAll();
    } catch (err) { alert(err.message); }
  };

  const handleDelete = async (endpoint) => {
    setDeleteConfirm({
      message: 'Data yang dihapus tidak bisa dikembalikan. Lanjutkan?',
      onConfirm: async () => {
        setDeleteConfirm(null);
        try { await api(endpoint, { method: 'DELETE' }); loadAll(); } catch (err) { alert('Gagal menghapus: ' + err.message); }
      }
    });
  };

  const handleImport = async (type) => {
    const file = document.getElementById('import-file')?.files?.[0];
    if (!file || !form.unit_kebun_id) return alert('Pilih unit dan file');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('unit_kebun_id', form.unit_kebun_id);
    if (type === 'rekomendasi') { fd.append('semester', form.semester || 1); fd.append('tahun', form.tahun || 2026); }
    if (type === 'rekomendasi') fd.append('kategori', form.importKategori || 'semua');
    setImportLoading({ type, status: 'uploading' });
    try {
      const res = await api(`/import/${type}`, { method: 'POST', body: fd });
      setImportLoading(null);
      setImportResult(res);
      loadAll();
    } catch (err) { setImportLoading(null); alert('Import gagal: ' + err.message); }
  };

  const handleSaveAC = async () => {
    try {
      await api(`/admin/area-controller/${form.user_id}/units`, {
        method: 'POST', body: JSON.stringify({ unit_ids: form.unit_ids || [] })
      });
      setModal(null); alert('Berhasil disimpan!');
    } catch (err) { alert(err.message); }
  };

  const tabs = [
    { id: 'units', label: 'Unit Kebun', icon: <Building size={14} /> },
    { id: 'fields', label: 'Field / Blok', icon: <MapPin size={14} /> },
    { id: 'users', label: 'Akun', icon: <Users size={14} /> },
    { id: 'pupuk', label: 'Master Pupuk', icon: <Leaf size={14} /> },
    { id: 'sop', label: 'SOP', icon: <Shield size={14} /> },
    { id: 'import', label: 'Import Data', icon: <Upload size={14} /> },
  ];

  return (
    <>
      <div className="page-header"><h2>⚙️ Admin Panel</h2><p>Kelola data master aplikasi</p></div>
      <div className="page-body">
        <div className="tabs" style={{ flexWrap: 'wrap' }}>
          {tabs.map(t => (
            <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ===== UNIT KEBUN ===== */}
        {tab === 'units' && (
          <div className="table-container">
            <div className="table-header">
              <h3>Unit Kebun ({units.length})</h3>
              <button className="btn btn-primary btn-sm" onClick={() => { setForm({}); setModal('add-unit'); }}>
                <Plus size={14} /> Tambah Unit
              </button>
            </div>
            <table>
              <thead><tr><th>Nama</th><th>Kode</th><th>Lokasi</th><th>Aksi</th></tr></thead>
              <tbody>
                {units.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>{u.nama}</td>
                    <td><span className="badge badge-blue">{u.kode}</span></td>
                    <td>{u.lokasi || '-'}</td>
                    <td><button className="btn-icon danger" onClick={() => handleDelete(`/admin/units/${u.id}`)}><Trash2 size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {units.length === 0 && <div className="empty-state"><p>Belum ada unit kebun</p></div>}
          </div>
        )}

        {/* ===== FIELDS / BLOK ===== */}
        {tab === 'fields' && (() => {
          const filteredFields = fields.filter(f => !fieldFilter.unit_kebun_id || String(f.unit_kebun_id) === fieldFilter.unit_kebun_id);
          const allFilteredSelected = filteredFields.length > 0 && filteredFields.every(f => selectedFields.has(f.id));
          const toggleAll = () => {
            if (allFilteredSelected) {
              const next = new Set(selectedFields);
              filteredFields.forEach(f => next.delete(f.id));
              setSelectedFields(next);
            } else {
              const next = new Set(selectedFields);
              filteredFields.forEach(f => next.add(f.id));
              setSelectedFields(next);
            }
          };
          const toggleOne = (id) => {
            const next = new Set(selectedFields);
            next.has(id) ? next.delete(id) : next.add(id);
            setSelectedFields(next);
          };
          const handleBulkDelete = async () => {
            const ids = [...selectedFields];
            if (ids.length === 0) return;
            setDeleteConfirm({
              message: `Yakin ingin menghapus ${ids.length} field yang dipilih? Data rekomendasi & realisasi terkait juga akan terhapus.`,
              onConfirm: async () => {
                setDeleteConfirm(null);
                try {
                  const res = await api('/admin/fields/bulk-delete', { method: 'POST', body: JSON.stringify({ ids }) });
                  setSelectedFields(new Set());
                  loadAll();
                } catch (err) { alert('Gagal menghapus: ' + err.message); }
              }
            });
          };
          return (
          <div className="table-container">
            <div className="table-header">
              <h3>Field / Blok ({filteredFields.length}{fieldFilter.unit_kebun_id ? ` / ${fields.length} total` : ''})</h3>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <select className="form-control" style={{ width: 160 }} value={fieldFilter.unit_kebun_id} onChange={e => { setFieldFilter({ unit_kebun_id: e.target.value }); setSelectedFields(new Set()); }}>
                  <option value="">Semua Unit</option>
                  {units.map(u => <option key={u.id} value={u.id}>{u.nama}</option>)}
                </select>
              </div>
            </div>

            {/* Bulk action bar */}
            {selectedFields.size > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
                background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05))',
                border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, marginBottom: 12
              }}>
                <CheckSquare size={16} style={{ color: 'var(--accent-red)' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-red)' }}>{selectedFields.size} field dipilih</span>
                <button className="btn btn-sm" style={{ marginLeft: 'auto', background: 'var(--accent-red)', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }} onClick={handleBulkDelete}>
                  <Trash2 size={14} /> Hapus {selectedFields.size} Field
                </button>
                <button className="btn btn-sm" style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }} onClick={() => setSelectedFields(new Set())}>
                  Batal Pilih
                </button>
              </div>
            )}

            <table>
              <thead><tr>
                <th style={{ width: 40, textAlign: 'center' }}>
                  <input type="checkbox" checked={allFilteredSelected} onChange={toggleAll} style={{ cursor: 'pointer', width: 16, height: 16 }} title="Pilih semua" />
                </th>
                <th>Unit</th><th>Afdeling</th><th>Field</th><th>Ha</th><th>Kategori</th><th>Aksi</th>
              </tr></thead>
              <tbody>
                {filteredFields.map(f => (
                  <tr key={f.id} style={{ background: selectedFields.has(f.id) ? 'rgba(99,102,241,0.08)' : undefined }}>
                    <td style={{ textAlign: 'center' }}>
                      <input type="checkbox" checked={selectedFields.has(f.id)} onChange={() => toggleOne(f.id)} style={{ cursor: 'pointer', width: 16, height: 16 }} />
                    </td>
                    <td>{f.unit_nama}</td>
                    <td>{f.afdeling_nama}</td>
                    <td><span className="badge badge-blue">{f.kode || f.nama}</span></td>
                    <td>{f.luas_ha || '-'}</td>
                    <td>
                      <select className="form-control" style={{ width: 90, padding: '4px 8px', fontSize: 12 }} value={f.kategori || 'TM'} onChange={async (e) => {
                        try {
                          await api(`/admin/fields/${f.id}/kategori`, { method: 'PUT', body: JSON.stringify({ kategori: e.target.value }) });
                          setFields(fields.map(x => x.id === f.id ? { ...x, kategori: e.target.value } : x));
                        } catch (err) { alert(err.message); }
                      }}>
                        <option value="TM">TM</option>
                        <option value="TBM">TBM</option>
                      </select>
                    </td>
                    <td><button className="btn-icon danger" onClick={() => handleDelete(`/admin/fields/${f.id}`)}><Trash2 size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredFields.length === 0 && <div className="empty-state"><p>Belum ada field</p></div>}
          </div>
          );
        })()}

        {/* ===== USERS ===== */}
        {tab === 'users' && (
          <div className="table-container">
            <div className="table-header">
              <h3>Akun Pengguna ({users.length})</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => { setForm({}); setModal('assign-ac'); }}>
                  <MapPin size={14} /> Assign Area Controller
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => { setForm({ role: 'mandor', is_active: 1 }); setModal('add-user'); }}>
                  <Plus size={14} /> Tambah Akun
                </button>
              </div>
            </div>
            <table>
              <thead><tr><th>Nama</th><th>Email</th><th>Role</th><th>Unit Kebun</th><th>Status</th><th>Aksi</th></tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>{u.nama}</td>
                    <td>{u.email}</td>
                    <td><span className={`badge ${u.role === 'admin' ? 'badge-red' : u.role === 'rceo' ? 'badge-purple' : u.role === 'area_controller' ? 'badge-blue' : 'badge-green'}`}>{ROLE_LABELS[u.role]}</span></td>
                    <td>{u.unit_kebun_nama || '-'}</td>
                    <td>{u.is_active ? <span className="badge badge-green">Aktif</span> : <span className="badge badge-red">Nonaktif</span>}</td>
                    <td><button className="btn-icon danger" onClick={() => handleDelete(`/admin/users/${u.id}`)}><Trash2 size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ===== MASTER PUPUK ===== */}
        {tab === 'pupuk' && (
          <div className="table-container">
            <div className="table-header">
              <h3>Master Pupuk ({pupuks.length})</h3>
              <button className="btn btn-primary btn-sm" onClick={() => { setForm({}); setModal('add-pupuk'); }}><Plus size={14} /> Tambah Pupuk</button>
            </div>
            <table>
              <thead><tr><th>Nama</th><th>Jenis</th><th>Kandungan</th><th>Aksi</th></tr></thead>
              <tbody>
                {pupuks.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.nama}</td>
                    <td>{p.jenis || '-'}</td>
                    <td>{p.kandungan || '-'}</td>
                    <td><button className="btn-icon danger" onClick={() => handleDelete(`/admin/pupuk/${p.id}`)}><Trash2 size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pupuks.length === 0 && <div className="empty-state"><p>Belum ada data pupuk</p></div>}
          </div>
        )}

        {/* ===== SOP ===== */}
        {tab === 'sop' && (
          <>
            <div className="table-container" style={{ marginBottom: 20 }}>
              <div className="table-header">
                <h3>🔴 SOP Antagonisme ({antag.length})</h3>
                <button className="btn btn-primary btn-sm" onClick={() => { setForm({}); setModal('add-antag'); }}><Plus size={14} /> Tambah</button>
              </div>
              <table>
                <thead><tr><th>Pupuk A</th><th>Pupuk B</th><th>Interval (Hari)</th><th>Keterangan</th><th>Aksi</th></tr></thead>
                <tbody>
                  {antag.map(a => (
                    <tr key={a.id}>
                      <td style={{ fontWeight: 600 }}>{a.pupuk_a_nama}</td>
                      <td style={{ fontWeight: 600 }}>{a.pupuk_b_nama}</td>
                      <td><span className="badge badge-red">{a.interval_hari} hari</span></td>
                      <td>{a.keterangan || '-'}</td>
                      <td><button className="btn-icon danger" onClick={() => handleDelete(`/admin/sop/antagonisme/${a.id}`)}><Trash2 size={14} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="table-container">
              <div className="table-header">
                <h3>🟢 SOP Sinergisme ({siner.length})</h3>
                <button className="btn btn-primary btn-sm" onClick={() => { setForm({}); setModal('add-siner'); }}><Plus size={14} /> Tambah</button>
              </div>
              <table>
                <thead><tr><th>Pupuk A</th><th>Pupuk B</th><th>Keterangan</th><th>Aksi</th></tr></thead>
                <tbody>
                  {siner.map(s => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 600 }}>{s.pupuk_a_nama}</td>
                      <td style={{ fontWeight: 600 }}>{s.pupuk_b_nama}</td>
                      <td>{s.keterangan || '-'}</td>
                      <td><button className="btn-icon danger" onClick={() => handleDelete(`/admin/sop/sinergisme/${s.id}`)}><Trash2 size={14} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ===== IMPORT ===== */}
        {tab === 'import' && (
          <div style={{ display: 'grid', gap: 20, maxWidth: 600 }}>
            <div className="card">
              <h3 style={{ marginBottom: 16 }}>🏗️ Import Struktur Kebun (Divisi + Field)</h3>
              <div className="form-group">
                <label>Unit Kebun</label>
                <select className="form-control" value={form.unit_kebun_id || ''} onChange={e => setForm({ ...form, unit_kebun_id: e.target.value })}>
                  <option value="">-- Pilih --</option>
                  {units.map(u => <option key={u.id} value={u.id}>{u.nama}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>File Excel/CSV</label>
                <input type="file" id="import-file-kebun" accept=".xlsx,.xls,.csv" className="form-control" />
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>Kolom: Divisi, Field, Ha, Jumlah_pokok, Kategori (TM/TBM, opsional)</p>
              <button className="btn btn-secondary" onClick={async () => {
                const file = document.getElementById('import-file-kebun')?.files?.[0];
                if (!file || !form.unit_kebun_id) return alert('Pilih unit dan file');
                const fd = new FormData(); fd.append('file', file); fd.append('unit_kebun_id', form.unit_kebun_id);
                setImportLoading({ type: 'struktur', status: 'uploading' });
                try { setImportResult(await api('/import/struktur-kebun', { method: 'POST', body: fd })); loadAll(); } catch (err) { alert(err.message); }
                setImportLoading(null);
              }}><Upload size={14} /> Import Struktur Kebun</button>
            </div>

            <div className="card">
              <h3 style={{ marginBottom: 16 }}>📥 Import Rekomendasi Pupuk</h3>
              <div className="form-group">
                <label>Unit Kebun</label>
                <select className="form-control" value={form.unit_kebun_id || ''} onChange={e => setForm({ ...form, unit_kebun_id: e.target.value })}>
                  <option value="">-- Pilih --</option>
                  {units.map(u => <option key={u.id} value={u.id}>{u.nama}</option>)}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Semester</label>
                  <select className="form-control" value={form.semester || '1'} onChange={e => setForm({ ...form, semester: e.target.value })}>
                    <option value="1">Semester 1</option><option value="2">Semester 2</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Tahun</label>
                  <input type="number" className="form-control" value={form.tahun || 2026} onChange={e => setForm({ ...form, tahun: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Kategori</label>
                  <select className="form-control" value={form.import_kategori || 'semua'} onChange={e => setForm({ ...form, import_kategori: e.target.value })}>
                    <option value="semua">Semua (TM+TBM)</option>
                    <option value="TM">Pupuk TM</option>
                    <option value="TBM">Pupuk TBM</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>File Excel</label>
                <input type="file" id="import-file-rekom" accept=".xlsx,.xls" className="form-control" />
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>Kolom: Field, Pupuk, Dosis/Pokok, Tonase, Tanggal Rencana, Keterangan (opsional)</p>
              <button className="btn btn-primary" onClick={async () => {
                const file = document.getElementById('import-file-rekom')?.files?.[0];
                if (!file || !form.unit_kebun_id) return alert('Pilih unit dan file');
                const fd = new FormData(); fd.append('file', file); fd.append('unit_kebun_id', form.unit_kebun_id);
                fd.append('semester', form.semester || 1); fd.append('tahun', form.tahun || 2026);
                if (form.import_kategori && form.import_kategori !== 'semua') fd.append('kategori', form.import_kategori);
                try { setImportResult(await api('/import/rekomendasi', { method: 'POST', body: fd })); } catch (err) { alert(err.message); }
              }}><Upload size={14} /> Import Rekomendasi</button>
            </div>

            <div className="card">
              <h3 style={{ marginBottom: 16 }}>📥 Import Realisasi Historis</h3>
              <div className="form-group">
                <label>Unit Kebun</label>
                <select className="form-control" value={form.unit_kebun_id || ''} onChange={e => setForm({ ...form, unit_kebun_id: e.target.value })}>
                  <option value="">-- Pilih --</option>
                  {units.map(u => <option key={u.id} value={u.id}>{u.nama}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Kategori</label>
                <select className="form-control" value={form.import_kategori_real || 'semua'} onChange={e => setForm({ ...form, import_kategori_real: e.target.value })}>
                  <option value="semua">Semua (TM+TBM)</option>
                  <option value="TM">Pupuk TM</option>
                  <option value="TBM">Pupuk TBM</option>
                </select>
              </div>
              <div className="form-group">
                <label>File Excel</label>
                <input type="file" id="import-file-real" accept=".xlsx,.xls" className="form-control" />
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>Kolom: Tanggal, Field, Pupuk, Tonase, Pelaksana (opsional), Catatan (opsional)</p>
              <button className="btn btn-success" onClick={async () => {
                const file = document.getElementById('import-file-real')?.files?.[0];
                if (!file || !form.unit_kebun_id) return alert('Pilih unit dan file');
                const fd = new FormData(); fd.append('file', file); fd.append('unit_kebun_id', form.unit_kebun_id);
                if (form.import_kategori_real && form.import_kategori_real !== 'semua') fd.append('kategori', form.import_kategori_real);
                try { setImportResult(await api('/import/realisasi', { method: 'POST', body: fd })); } catch (err) { alert(err.message); }
              }}><Upload size={14} /> Import Realisasi</button>
            </div>

            {importResult && (
              <div className="card" style={{ borderColor: importResult.errors?.length ? 'var(--accent-yellow)' : 'var(--accent-green)' }}>
                <h3 style={{ marginBottom: 12 }}>Hasil Import</h3>
                <p style={{ color: 'var(--accent-green)', fontWeight: 600 }}>✅ Berhasil: {importResult.success} baris</p>
                {importResult.afdelings_created > 0 && <p style={{ fontSize: 12, color: 'var(--accent-blue)' }}>📁 Divisi baru: {importResult.afdelings_created}</p>}
                {importResult.fields_created > 0 && <p style={{ fontSize: 12, color: 'var(--accent-blue)' }}>📍 Field baru: {importResult.fields_created}</p>}
                {importResult.errors?.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <p style={{ color: 'var(--accent-red)', fontWeight: 600 }}>❌ Error: {importResult.errors.length} baris</p>
                    {importResult.errors.slice(0, 5).map((e, i) => (
                      <p key={i} style={{ fontSize: 12, color: 'var(--text-muted)' }}>Baris {e.row}: {e.error}</p>
                    ))}
                  </div>
                )}
                {importResult.warnings?.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <p style={{ color: 'var(--accent-yellow)', fontWeight: 600 }}>⚠️ Warning: {importResult.warnings.length}</p>
                    {importResult.warnings.slice(0, 5).map((w, i) => (
                      <p key={i} style={{ fontSize: 12, color: 'var(--text-muted)' }}>Baris {w.row}: {w.warning}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===== MODALS ===== */}
      {modal === 'add-unit' && (
        <Modal title="Tambah Unit Kebun" onClose={() => setModal(null)}>
          <div className="modal-body">
            <div className="form-group"><label>Nama</label><input className="form-control" value={form.nama || ''} onChange={e => setForm({ ...form, nama: e.target.value })} /></div>
            <div className="form-group"><label>Kode</label><input className="form-control" value={form.kode || ''} onChange={e => setForm({ ...form, kode: e.target.value })} /></div>
            <div className="form-group"><label>Lokasi</label><input className="form-control" value={form.lokasi || ''} onChange={e => setForm({ ...form, lokasi: e.target.value })} /></div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={() => setModal(null)}>Batal</button>
            <button className="btn btn-primary" onClick={() => handleSave('/admin/units', 'POST', form)}>Simpan</button>
          </div>
        </Modal>
      )}

      {modal === 'add-user' && (
        <Modal title="Tambah Akun" onClose={() => setModal(null)}>
          <div className="modal-body">
            <div className="form-group"><label>Nama</label><input className="form-control" value={form.nama || ''} onChange={e => setForm({ ...form, nama: e.target.value })} /></div>
            <div className="form-group"><label>Email</label><input type="email" className="form-control" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div className="form-group"><label>Password</label><input type="password" className="form-control" value={form.password || ''} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
            <div className="form-group">
              <label>Role</label>
              <select className="form-control" value={form.role || 'mandor'} onChange={e => setForm({ ...form, role: e.target.value, unit_kebun_id: '', ac_unit_ids: [] })}>
                {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>

            {/* AC / RCEO: multi-unit selection */}
            {(form.role === 'area_controller' || form.role === 'rceo') ? (
              <div className="form-group">
                <label>Unit Kebun yang Dibawahi</label>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Pilih satu atau lebih unit kebun</p>
                {units.map(u => (
                  <label key={u.id} style={{ display: 'flex', gap: 8, padding: '6px 0', fontSize: 13, cursor: 'pointer', alignItems: 'center' }}>
                    <input type="checkbox" checked={(form.ac_unit_ids || []).includes(u.id)} onChange={e => {
                      const ids = form.ac_unit_ids || [];
                      setForm({ ...form, ac_unit_ids: e.target.checked ? [...ids, u.id] : ids.filter(x => x !== u.id) });
                    }} />
                    {u.nama} ({u.kode})
                  </label>
                ))}
              </div>
            ) : (
              /* Other roles: single unit selection */
              <div className="form-group">
                <label>Unit Kebun</label>
                <select className="form-control" value={form.unit_kebun_id || ''} onChange={e => setForm({ ...form, unit_kebun_id: e.target.value })}>
                  <option value="">-- Tidak ada (Admin) --</option>
                  {units.map(u => <option key={u.id} value={u.id}>{u.nama}</option>)}
                </select>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={() => setModal(null)}>Batal</button>
            <button className="btn btn-primary" onClick={async () => {
              try {
                const userData = { ...form };
                delete userData.ac_unit_ids;
                const result = await api('/admin/users', { method: 'POST', body: JSON.stringify(userData) });
                // If AC, assign units
                if ((form.role === 'area_controller' || form.role === 'rceo') && form.ac_unit_ids?.length > 0) {
                  const userId = result.id || result.user?.id;
                  if (userId) {
                    await api(`/admin/area-controller/${userId}/units`, {
                      method: 'POST', body: JSON.stringify({ unit_ids: form.ac_unit_ids })
                    });
                  }
                }
                setModal(null); setForm({});
                loadAll();
              } catch (err) { alert(err.message); }
            }}>Simpan</button>
          </div>
        </Modal>
      )}

      {modal === 'add-pupuk' && (
        <Modal title="Tambah Pupuk" onClose={() => setModal(null)}>
          <div className="modal-body">
            <div className="form-group"><label>Nama Pupuk</label><input className="form-control" value={form.nama || ''} onChange={e => setForm({ ...form, nama: e.target.value })} /></div>
            <div className="form-group"><label>Jenis</label><input className="form-control" placeholder="Organik, Anorganik, dll" value={form.jenis || ''} onChange={e => setForm({ ...form, jenis: e.target.value })} /></div>
            <div className="form-group"><label>Kandungan</label><input className="form-control" placeholder="N, P, K, dll" value={form.kandungan || ''} onChange={e => setForm({ ...form, kandungan: e.target.value })} /></div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={() => setModal(null)}>Batal</button>
            <button className="btn btn-primary" onClick={() => handleSave('/admin/pupuk', 'POST', form)}>Simpan</button>
          </div>
        </Modal>
      )}

      {modal === 'add-antag' && (
        <Modal title="Tambah SOP Antagonisme" onClose={() => setModal(null)}>
          <div className="modal-body">
            <div className="form-group">
              <label>Pupuk A</label>
              <select className="form-control" value={form.pupuk_a_id || ''} onChange={e => setForm({ ...form, pupuk_a_id: e.target.value })}>
                <option value="">-- Pilih --</option>
                {pupuks.map(p => <option key={p.id} value={p.id}>{p.nama}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Pupuk B</label>
              <select className="form-control" value={form.pupuk_b_id || ''} onChange={e => setForm({ ...form, pupuk_b_id: e.target.value })}>
                <option value="">-- Pilih --</option>
                {pupuks.map(p => <option key={p.id} value={p.id}>{p.nama}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Interval Minimum (Hari)</label><input type="number" className="form-control" value={form.interval_hari || ''} onChange={e => setForm({ ...form, interval_hari: e.target.value })} /></div>
            <div className="form-group"><label>Keterangan</label><input className="form-control" value={form.keterangan || ''} onChange={e => setForm({ ...form, keterangan: e.target.value })} /></div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={() => setModal(null)}>Batal</button>
            <button className="btn btn-primary" onClick={() => handleSave('/admin/sop/antagonisme', 'POST', form)}>Simpan</button>
          </div>
        </Modal>
      )}

      {modal === 'add-siner' && (
        <Modal title="Tambah SOP Sinergisme" onClose={() => setModal(null)}>
          <div className="modal-body">
            <div className="form-group">
              <label>Pupuk A</label>
              <select className="form-control" value={form.pupuk_a_id || ''} onChange={e => setForm({ ...form, pupuk_a_id: e.target.value })}>
                <option value="">-- Pilih --</option>
                {pupuks.map(p => <option key={p.id} value={p.id}>{p.nama}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Pupuk B</label>
              <select className="form-control" value={form.pupuk_b_id || ''} onChange={e => setForm({ ...form, pupuk_b_id: e.target.value })}>
                <option value="">-- Pilih --</option>
                {pupuks.map(p => <option key={p.id} value={p.id}>{p.nama}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Keterangan</label><input className="form-control" value={form.keterangan || ''} onChange={e => setForm({ ...form, keterangan: e.target.value })} /></div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={() => setModal(null)}>Batal</button>
            <button className="btn btn-primary" onClick={() => handleSave('/admin/sop/sinergisme', 'POST', form)}>Simpan</button>
          </div>
        </Modal>
      )}

      {modal === 'assign-ac' && (
        <Modal title="Assign Unit ke Area Controller" onClose={() => setModal(null)}>
          <div className="modal-body">
            <div className="form-group">
              <label>Area Controller</label>
              <select className="form-control" value={form.user_id || ''} onChange={async e => {
                const uid = e.target.value;
                setForm({ ...form, user_id: uid, unit_ids: [] });
                if (uid) {
                  const u = await api(`/admin/area-controller/${uid}/units`);
                  setForm(f => ({ ...f, unit_ids: u.map(x => x.id) }));
                }
              }}>
                <option value="">-- Pilih --</option>
                {users.filter(u => u.role === 'area_controller' || u.role === 'rceo').map(u => <option key={u.id} value={u.id}>{u.nama} ({ROLE_LABELS[u.role]})</option>)}
              </select>
            </div>
            {form.user_id && (
              <div className="form-group">
                <label>Unit Kebun yang Dibawahi</label>
                {units.map(u => (
                  <label key={u.id} style={{ display: 'flex', gap: 8, padding: '6px 0', fontSize: 13, cursor: 'pointer', alignItems: 'center' }}>
                    <input type="checkbox" checked={(form.unit_ids || []).includes(u.id)} onChange={e => {
                      const ids = form.unit_ids || [];
                      setForm({ ...form, unit_ids: e.target.checked ? [...ids, u.id] : ids.filter(x => x !== u.id) });
                    }} />
                    {u.nama} ({u.kode})
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={() => setModal(null)}>Batal</button>
            <button className="btn btn-primary" onClick={handleSaveAC}>Simpan</button>
          </div>
        </Modal>
      )}
      {deleteConfirm && <DeleteConfirmModal message={deleteConfirm.message} onConfirm={deleteConfirm.onConfirm} onCancel={() => setDeleteConfirm(null)} />}
      {importLoading && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 380, textAlign: 'center', padding: 32 }}>
            <div className="spinner" style={{ width: 48, height: 48, margin: '0 auto 20px', borderWidth: 4 }} />
            <h3 style={{ marginBottom: 8, color: 'var(--text-primary)' }}>
              {importLoading.type === 'struktur' ? '📁 Import Struktur Kebun' :
               importLoading.type === 'rekomendasi' ? '📋 Import Rekomendasi' : '📜 Import Realisasi'}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              Sedang memproses file Excel... Mohon tunggu.
            </p>
            <div style={{ marginTop: 16, padding: '8px 16px', background: 'rgba(99,102,241,0.1)', borderRadius: 8, fontSize: 12, color: 'var(--accent-blue)' }}>
              ⏳ Proses upload dan validasi data sedang berjalan
            </div>
          </div>
        </div>
      )}
    </>
  );
}
