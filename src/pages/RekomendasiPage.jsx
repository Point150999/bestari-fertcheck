import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { exportCSV, exportPDF } from '../utils/export';
import { FileText, Download, Printer, ChevronUp, ChevronDown, Trash2, AlertTriangle, CheckSquare } from 'lucide-react';

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

export default function RekomendasiPage({ user }) {
  const [data, setData] = useState([]);
  const [units, setUnits] = useState([]);
  const [filters, setFilters] = useState({ unit_kebun_id: user.unit_kebun_id || '', semester: '', tahun: new Date().getFullYear(), kategori: 'semua' });
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState('');
  const [sortDir, setSortDir] = useState('asc');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const isAdmin = user.role === 'admin';

  const exportCols = [
    { label: 'Unit', key: 'unit_nama' },
    { label: 'Afdeling', key: 'afdeling_nama' },
    { label: 'Field', key: r => r.field_kode || r.field_nama },
    { label: 'Pupuk', key: 'pupuk_nama' },
    { label: 'Dosis/Pokok', key: 'dosis_per_pokok' },
    { label: 'Tonase', key: 'tonase' },
    { label: 'Tanggal Rencana', key: 'tanggal_rencana' },
    { label: 'Semester', key: r => `S${r.semester}` },
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
      if (p.unit_kebun_id) params.set('unit_kebun_id', p.unit_kebun_id);
      if (p.semester) params.set('semester', p.semester);
      if (p.tahun) params.set('tahun', p.tahun);
      if (p.kategori && p.kategori !== 'semua') params.set('kategori', p.kategori);
      setData(await api(`/fertilization/rekomendasi?${params}`));
      setSelectedIds(new Set());
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

  const handleDeleteSingle = (id, pupukNama, fieldNama) => {
    setDeleteConfirm({
      message: `Hapus rekomendasi "${pupukNama}" untuk field ${fieldNama}?`,
      onConfirm: async () => {
        setDeleteConfirm(null);
        try {
          await api(`/fertilization/rekomendasi/${id}`, { method: 'DELETE' });
          loadData();
        } catch (err) { alert('Gagal menghapus: ' + err.message); }
      }
    });
  };

  const handleBulkDelete = () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setDeleteConfirm({
      message: `Yakin ingin menghapus ${ids.length} data rekomendasi yang dipilih? Data yang dihapus tidak bisa dikembalikan.`,
      onConfirm: async () => {
        setDeleteConfirm(null);
        try {
          await api('/fertilization/rekomendasi/bulk-delete', { method: 'POST', body: JSON.stringify({ ids }) });
          setSelectedIds(new Set());
          loadData();
        } catch (err) { alert('Gagal menghapus: ' + err.message); }
      }
    });
  };

  const toggleSelect = (id) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === sortedData.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedData.map(r => r.id)));
    }
  };

  const sortedData = [...data].sort((a, b) => {
    if (!sortField) return 0;
    let va = a[sortField], vb = b[sortField];
    if (sortField === 'field') { va = a.field_kode || a.field_nama; vb = b.field_kode || b.field_nama; }
    if (va == null) va = '';
    if (vb == null) vb = '';
    const numA = Number(va), numB = Number(vb);
    if (!isNaN(numA) && !isNaN(numB)) return sortDir === 'asc' ? numA - numB : numB - numA;
    return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
  });

  return (
    <>
      <div className="page-header"><h2>📋 Rekomendasi Pupuk</h2><p>Data rekomendasi pemupukan per field</p></div>

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
            <label>Tahun</label>
            <select className="form-control" value={filters.tahun} onChange={e => handleFilter('tahun', e.target.value)}>
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label>Semester</label>
            <select className="form-control" value={filters.semester} onChange={e => handleFilter('semester', e.target.value)}>
              <option value="">Semua</option>
              <option value="1">Semester 1</option>
              <option value="2">Semester 2</option>
            </select>
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

        {/* Bulk action bar */}
        {isAdmin && selectedIds.size > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 16px', margin: '0 0 12px', borderRadius: 8,
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)'
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckSquare size={16} /> {selectedIds.size} data dipilih
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleBulkDelete} style={{
                padding: '6px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 12,
                background: 'var(--accent-red)', color: '#fff', display: 'flex', alignItems: 'center', gap: 4
              }}><Trash2 size={12} /> Hapus {selectedIds.size} Data</button>
              <button onClick={() => setSelectedIds(new Set())} style={{
                padding: '6px 16px', borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer',
                background: 'transparent', color: 'var(--text-secondary)', fontSize: 12
              }}>Batal Pilih</button>
            </div>
          </div>
        )}

        <div className="table-container">
          <div className="table-header">
            <h3><FileText size={16} style={{ display: 'inline', marginRight: 8 }} />Data Rekomendasi ({data.length})</h3>
            {data.length > 0 && (
              <div className="export-bar">
                <button className="btn-export" onClick={() => exportCSV(data, 'rekomendasi_pupuk', exportCols)}><Download size={12} /> CSV</button>
                <button className="btn-export" onClick={() => exportPDF(data, 'Rekomendasi Pupuk', exportCols)}><Printer size={12} /> PDF</button>
              </div>
            )}
          </div>
          {loading ? (
            <div className="loading-spinner"><div className="spinner" /></div>
          ) : data.length === 0 ? (
            <div className="empty-state">
              <FileText size={48} />
              <h3>Belum ada data rekomendasi</h3>
              <p>Admin bisa menambahkan rekomendasi melalui import Excel</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    {isAdmin && (
                      <th style={{ width: 40 }}>
                        <input type="checkbox" checked={selectedIds.size === sortedData.length && sortedData.length > 0} onChange={toggleSelectAll} />
                      </th>
                    )}
                    <SortHeader label="Unit" field="unit_nama" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader label="Afdeling" field="afdeling_nama" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader label="Field" field="field" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader label="Pupuk" field="pupuk_nama" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader label="Dosis/Pokok" field="dosis_per_pokok" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader label="Tonase" field="tonase" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader label="Tgl Rencana" field="tanggal_rencana" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                    <SortHeader label="Semester" field="semester" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                    {isAdmin && <th style={{ width: 50 }}>Aksi</th>}
                  </tr>
                </thead>
                <tbody>
                  {sortedData.map(r => (
                    <tr key={r.id} style={{ background: selectedIds.has(r.id) ? 'rgba(99,102,241,0.06)' : undefined }}>
                      {isAdmin && (
                        <td><input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => toggleSelect(r.id)} /></td>
                      )}
                      <td>{r.unit_nama}</td>
                      <td>{r.afdeling_nama}</td>
                      <td><span className="badge badge-blue">{r.field_kode || r.field_nama}</span></td>
                      <td style={{ fontWeight: 600 }}>{r.pupuk_nama}</td>
                      <td>{r.dosis_per_pokok || '-'} kg</td>
                      <td>{r.tonase || r.dosis_per_ha || '-'} kg</td>
                      <td>{r.tanggal_rencana || '-'}</td>
                      <td><span className="badge badge-purple">S{r.semester}</span></td>
                      {isAdmin && (
                        <td>
                          <button className="btn-icon danger" onClick={() => handleDeleteSingle(r.id, r.pupuk_nama, r.field_kode || r.field_nama)} title="Hapus"><Trash2 size={14} /></button>
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
