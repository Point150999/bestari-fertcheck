import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { exportCSV, exportPDF } from '../utils/export';
import { History, Download, Printer, ChevronUp, ChevronDown, Trash2, AlertTriangle, X } from 'lucide-react';

function SortHeader({ label, field, sortField, sortDir, onSort }) {
  const active = sortField === field;
  return (
    <th onClick={() => onSort(field)} style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {label}
        <span style={{ display: 'inline-flex', flexDirection: 'column', lineHeight: 0, opacity: active ? 1 : 0.3 }}>
          <ChevronUp size={10} style={{ marginBottom: -2, color: active && sortDir === 'asc' ? 'var(--accent-blue)' : undefined }} />
          <ChevronDown size={10} style={{ marginTop: -2, color: active && sortDir === 'desc' ? 'var(--accent-blue)' : undefined }} />
        </span>
      </span>
    </th>
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

export default function RealisasiPage({ user }) {
  const [data, setData] = useState([]);
  const [units, setUnits] = useState([]);
  const [filters, setFilters] = useState({ unit_kebun_id: user.unit_kebun_id || '', start_date: '', end_date: '', kategori: 'semua' });
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState('');
  const [sortDir, setSortDir] = useState('asc');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const canDelete = ['admin', 'asisten', 'mandor'].includes(user.role);

  const exportCols = [
    { label: 'Tanggal', key: 'tanggal' },
    { label: 'Unit', key: 'unit_nama' },
    { label: 'Afdeling', key: 'afdeling_nama' },
    { label: 'Field', key: r => r.field_kode || r.field_nama },
    { label: 'Pupuk', key: 'pupuk_nama' },
    { label: 'Tonase', key: 'dosis_aktual' },
    { label: 'Tipe', key: 'tipe' },
    { label: 'Pelaksana', key: r => r.pelaksana || r.user_nama || '-' },
  ];

  useEffect(() => {
    if (user.role === 'admin' || user.role === 'area_controller' || user.role === 'rceo') {
      api('/admin/units').then(setUnits).catch(() => {});
    }
    loadData();
  }, []);

  const loadData = async (f) => {
    setLoading(true);
    try {
      const p = f || filters;
      const params = new URLSearchParams();
      Object.entries(p).forEach(([k, v]) => { if (v) params.set(k, v); });
      setData(await api(`/fertilization/realisasi?${params}`));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleFilter = (key, value) => {
    const f = { ...filters, [key]: value };
    setFilters(f);
    loadData(f);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const handleDelete = (id, pupukNama, tanggal) => {
    setDeleteConfirm({
      message: `Hapus data realisasi "${pupukNama}" tanggal ${tanggal}? Data yang dihapus tidak bisa dikembalikan.`,
      onConfirm: async () => {
        setDeleteConfirm(null);
        try {
          await api(`/fertilization/realisasi/${id}`, { method: 'DELETE' });
          loadData();
        } catch (err) { alert('Gagal menghapus: ' + err.message); }
      }
    });
  };

  const sortedData = [...data].sort((a, b) => {
    if (!sortField) return 0;
    let va = a[sortField], vb = b[sortField];
    if (sortField === 'field') { va = a.field_kode || a.field_nama; vb = b.field_kode || b.field_nama; }
    if (sortField === 'pelaksana') { va = a.pelaksana || a.user_nama || ''; vb = b.pelaksana || b.user_nama || ''; }
    if (va == null) va = '';
    if (vb == null) vb = '';
    const numA = Number(va), numB = Number(vb);
    if (!isNaN(numA) && !isNaN(numB)) return sortDir === 'asc' ? numA - numB : numB - numA;
    return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
  });

  return (
    <>
      <div className="page-header"><h2>📜 Realisasi / Historis Pemupukan</h2><p>Riwayat pemupukan yang sudah dilakukan</p></div>

      <div className="page-body">
        <div className="filters-bar">
          {(user.role === 'admin' || user.role === 'area_controller' || user.role === 'rceo') && (
            <div className="filter-group">
              <label>Unit Kebun</label>
              <select className="form-control" value={filters.unit_kebun_id} onChange={e => handleFilter('unit_kebun_id', e.target.value)}>
                <option value="">Semua Unit</option>
                {units.map(u => <option key={u.id} value={u.id}>{u.nama}</option>)}
              </select>
            </div>
          )}
          <div className="filter-group">
            <label>Dari Tanggal</label>
            <input type="date" className="form-control" value={filters.start_date} onChange={e => handleFilter('start_date', e.target.value)} />
          </div>
          <div className="filter-group">
            <label>Sampai Tanggal</label>
            <input type="date" className="form-control" value={filters.end_date} onChange={e => handleFilter('end_date', e.target.value)} />
          </div>
          <div className="filter-group">
            <label>Kategori</label>
            <select className="form-control" value={filters.kategori} onChange={e => handleFilter('kategori', e.target.value)}>
              <option value="semua">Semua (TM+TBM)</option>
              <option value="TM">Pupuk TM</option>
              <option value="TBM">Pupuk TBM</option>
            </select>
          </div>
        </div>

        <div className="table-container">
          <div className="table-header">
            <h3><History size={16} style={{ display: 'inline', marginRight: 8 }} />Historis Pemupukan ({data.length})</h3>
            {data.length > 0 && (
              <div className="export-bar">
                <button className="btn-export" onClick={() => exportCSV(data, 'realisasi_pemupukan', exportCols)}><Download size={12} /> CSV</button>
                <button className="btn-export" onClick={() => exportPDF(data, 'Realisasi Pemupukan', exportCols)}><Printer size={12} /> PDF</button>
              </div>
            )}
          </div>
          {loading ? (
            <div className="loading-spinner"><div className="spinner" /></div>
          ) : data.length === 0 ? (
            <div className="empty-state">
              <History size={48} />
              <h3>Belum ada data realisasi</h3>
              <p>Data akan muncul setelah ada input pemupukan</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <SortHeader label="Tanggal" field="tanggal" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader label="Unit" field="unit_nama" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader label="Afdeling" field="afdeling_nama" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader label="Field" field="field" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader label="Pupuk" field="pupuk_nama" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader label="Tonase" field="dosis_aktual" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader label="Tipe" field="tipe" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader label="Pelaksana" field="pelaksana" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                    <th>Status</th>
                    {canDelete && <th style={{ width: 50 }}>Aksi</th>}
                  </tr>
                </thead>
                <tbody>
                  {sortedData.map(r => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 500 }}>{r.tanggal}</td>
                      <td>{r.unit_nama}</td>
                      <td>{r.afdeling_nama}</td>
                      <td><span className="badge badge-blue">{r.field_kode || r.field_nama}</span></td>
                      <td style={{ fontWeight: 600 }}>{r.pupuk_nama}</td>
                      <td>{r.dosis_aktual} kg</td>
                      <td>
                        <span className={`badge ${r.tipe === 'realisasi' ? 'badge-green' : 'badge-yellow'}`}>
                          {r.tipe === 'realisasi' ? '✅ Realisasi' : '📋 Rencana'}
                        </span>
                      </td>
                      <td>{r.pelaksana || r.user_nama || '-'}</td>
                      <td>
                        {r.is_override ? <span className="badge badge-red">⚠️ Override</span> : <span className="badge badge-green">Normal</span>}
                      </td>
                      {canDelete && (
                        <td>
                          <button className="btn-icon danger" onClick={() => handleDelete(r.id, r.pupuk_nama, r.tanggal)} title="Hapus"><Trash2 size={14} /></button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {deleteConfirm && <DeleteConfirmModal message={deleteConfirm.message} onConfirm={deleteConfirm.onConfirm} onCancel={() => setDeleteConfirm(null)} />}
    </>
  );
}
