import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { exportCSV, exportPDF } from '../utils/export';
import { FileText, Download, Printer, ChevronUp, ChevronDown, Trash2, AlertTriangle, CheckSquare } from 'lucide-react';

function formatTanggal(d) {
  if (!d) return '-';
  const s = String(d).slice(0, 10);
  const parts = s.split('-');
  if (parts.length !== 3) return s;
  const bulan = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  return `${parseInt(parts[2])} ${bulan[parseInt(parts[1]) - 1]} ${parts[0]}`;
}

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
  const [localFilters, setLocalFilters] = useState({ divisi: '', pupuk: '' });
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
    { label: 'Tanggal Rencana', key: r => formatTanggal(r.tanggal_rencana) },
    { label: 'Semester', key: r => `S${r.semester}` },
  ];

  useEffect(() => {
    if (['admin', 'area_controller', 'rceo'].includes(user.role)) {
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
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const handleDeleteSingle = (id, pupukNama, fieldNama) => {
    setDeleteConfirm({
      message: `Hapus rekomendasi "${pupukNama}" untuk field ${fieldNama}?`,
      onConfirm: async () => {
        setDeleteConfirm(null);
        try { await api(`/fertilization/rekomendasi/${id}`, { method: 'DELETE' }); loadData(); }
        catch (err) { alert('Gagal menghapus: ' + err.message); }
      }
    });
  };

  const handleBulkDelete = () => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    setDeleteConfirm({
      message: `Yakin ingin menghapus ${ids.length} data rekomendasi? Data yang dihapus tidak bisa dikembalikan.`,
      onConfirm: async () => {
        setDeleteConfirm(null);
        try { await api('/fertilization/rekomendasi/bulk-delete', { method: 'POST', body: JSON.stringify({ ids }) }); setSelectedIds(new Set()); loadData(); }
        catch (err) { alert('Gagal menghapus: ' + err.message); }
      }
    });
  };

  const toggleSelect = (id) => { const n = new Set(selectedIds); n.has(id) ? n.delete(id) : n.add(id); setSelectedIds(n); };

  // Extract unique divisi and pupuk names from data for local filters
  const divisiList = [...new Set(data.map(r => r.afdeling_nama).filter(Boolean))].sort();
  const pupukList = [...new Set(data.map(r => r.pupuk_nama).filter(Boolean))].sort();

  // Apply local filters + sort
  const filteredData = data.filter(r => {
    if (localFilters.divisi && r.afdeling_nama !== localFilters.divisi) return false;
    if (localFilters.pupuk && r.pupuk_nama !== localFilters.pupuk) return false;
    return true;
  });

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortField) return 0;
    let va = a[sortField], vb = b[sortField];
    if (sortField === 'field') { va = a.field_kode || a.field_nama; vb = b.field_kode || b.field_nama; }
    if (va == null) va = ''; if (vb == null) vb = '';
    const numA = Number(va), numB = Number(vb);
    if (!isNaN(numA) && !isNaN(numB)) return sortDir === 'asc' ? numA - numB : numB - numA;
    return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
  });

  const toggleSelectAll = () => {
    selectedIds.size === sortedData.length ? setSelectedIds(new Set()) : setSelectedIds(new Set(sortedData.map(r => r.id)));
  };

  return (
    <>
      <div className="page-header"><h2>📋 Rekomendasi Pupuk</h2><p>Data rekomendasi pemupukan per field</p></div>

      <div className="page-body">
        {/* Filters */}
        <div className="filters-bar mobile-compact-filters">
          {['admin', 'area_controller', 'rceo'].includes(user.role) && (
            <div className="filter-group">
              <label>Unit</label>
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
              <option value="1">S1</option>
              <option value="2">S2</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Kategori</label>
            <select className="form-control" value={filters.kategori} onChange={e => handleFilter('kategori', e.target.value)}>
              <option value="semua">Semua</option>
              <option value="TM">TM</option>
              <option value="TBM">TBM</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Divisi</label>
            <select className="form-control" value={localFilters.divisi} onChange={e => { setLocalFilters(p => ({ ...p, divisi: e.target.value })); setSelectedIds(new Set()); }}>
              <option value="">Semua Divisi</option>
              {divisiList.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label>Pupuk</label>
            <select className="form-control" value={localFilters.pupuk} onChange={e => { setLocalFilters(p => ({ ...p, pupuk: e.target.value })); setSelectedIds(new Set()); }}>
              <option value="">Semua Pupuk</option>
              {pupukList.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        {/* Bulk action bar */}
        {isAdmin && selectedIds.size > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', padding: '10px 16px', margin: '0 0 12px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckSquare size={16} /> {selectedIds.size} dipilih
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleBulkDelete} style={{ padding: '6px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 12, background: 'var(--accent-red)', color: '#fff', display: 'flex', alignItems: 'center', gap: 4 }}><Trash2 size={12} /> Hapus {selectedIds.size}</button>
              <button onClick={() => setSelectedIds(new Set())} style={{ padding: '6px 16px', borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer', background: 'transparent', color: 'var(--text-secondary)', fontSize: 12 }}>Batal</button>
            </div>
          </div>
        )}

        <div className="table-container">
          <div className="table-header">
            <h3><FileText size={16} style={{ display: 'inline', marginRight: 8 }} />Data Rekomendasi ({sortedData.length}{filteredData.length !== data.length ? ` / ${data.length}` : ''})</h3>
            {data.length > 0 && (
              <div className="export-bar">
                <button className="btn-export" onClick={() => exportCSV(sortedData, 'rekomendasi_pupuk', exportCols)}><Download size={12} /> CSV</button>
                <button className="btn-export" onClick={() => exportPDF(sortedData, 'Rekomendasi Pupuk', exportCols)}><Printer size={12} /> PDF</button>
              </div>
            )}
          </div>
          {loading ? (
            <div className="loading-spinner"><div className="spinner" /></div>
          ) : sortedData.length === 0 ? (
            <div className="empty-state">
              <FileText size={48} />
              <h3>{data.length > 0 ? 'Tidak ada data sesuai filter' : 'Belum ada data rekomendasi'}</h3>
              <p>{data.length > 0 ? 'Coba ubah filter divisi atau pupuk' : 'Admin bisa menambahkan via import Excel'}</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="desktop-table" style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      {isAdmin && <th style={{ width: 40 }}><input type="checkbox" checked={selectedIds.size === sortedData.length && sortedData.length > 0} onChange={toggleSelectAll} /></th>}
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
                        {isAdmin && <td><input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => toggleSelect(r.id)} /></td>}
                        <td>{r.unit_nama}</td>
                        <td>{r.afdeling_nama}</td>
                        <td><span className="badge badge-blue">{r.field_kode || r.field_nama}</span></td>
                        <td style={{ fontWeight: 600 }}>{r.pupuk_nama}</td>
                        <td>{r.dosis_per_pokok || '-'} kg</td>
                        <td>{r.tonase || '-'} kg</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{formatTanggal(r.tanggal_rencana)}</td>
                        <td><span className="badge badge-purple">S{r.semester}</span></td>
                        {isAdmin && <td><button className="btn-icon danger" onClick={() => handleDeleteSingle(r.id, r.pupuk_nama, r.field_kode || r.field_nama)} title="Hapus"><Trash2 size={14} /></button></td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile card layout */}
              <div className="mobile-cards">
                {isAdmin && (
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="checkbox" checked={selectedIds.size === sortedData.length && sortedData.length > 0} onChange={toggleSelectAll} />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Pilih semua</span>
                  </div>
                )}
                {sortedData.map(r => (
                  <div key={r.id} className="mobile-data-card" style={{ background: selectedIds.has(r.id) ? 'rgba(99,102,241,0.06)' : undefined }}>
                    <div className="mobile-card-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                        {isAdmin && <input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => toggleSelect(r.id)} style={{ flexShrink: 0 }} />}
                        <span className="badge badge-blue">{r.field_kode || r.field_nama}</span>
                        <span style={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.pupuk_nama}</span>
                      </div>
                      {isAdmin && <button className="btn-icon danger" onClick={() => handleDeleteSingle(r.id, r.pupuk_nama, r.field_kode || r.field_nama)} style={{ width: 28, height: 28, flexShrink: 0 }}><Trash2 size={12} /></button>}
                    </div>
                    <div className="mobile-card-body">
                      <div className="mobile-card-row"><span className="mc-label">Afdeling</span><span className="mc-value">{r.afdeling_nama}</span></div>
                      <div className="mobile-card-row"><span className="mc-label">Tonase</span><span className="mc-value" style={{ fontWeight: 700 }}>{r.tonase || '-'} kg</span></div>
                      <div className="mobile-card-row"><span className="mc-label">Dosis/Pokok</span><span className="mc-value">{r.dosis_per_pokok || '-'} kg</span></div>
                      <div className="mobile-card-row"><span className="mc-label">Tgl Rencana</span><span className="mc-value">{formatTanggal(r.tanggal_rencana)}</span></div>
                    </div>
                    <div className="mobile-card-footer">
                      <span className="badge badge-purple">S{r.semester}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.unit_nama}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      {deleteConfirm && <DeleteConfirmModal message={deleteConfirm.message} onConfirm={deleteConfirm.onConfirm} onCancel={() => setDeleteConfirm(null)} />}
    </>
  );
}
