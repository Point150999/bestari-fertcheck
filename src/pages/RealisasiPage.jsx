import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { exportCSV, exportPDF } from '../utils/export';
import { History, Download, Printer, ChevronUp, ChevronDown, Trash2, AlertTriangle, CheckSquare } from 'lucide-react';

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

export default function RealisasiPage({ user }) {
  const [data, setData] = useState([]);
  const [units, setUnits] = useState([]);
  const [filters, setFilters] = useState({ unit_kebun_id: user.unit_kebun_id || '', start_date: '', end_date: '', kategori: 'semua' });
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState('');
  const [sortDir, setSortDir] = useState('asc');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const canDelete = ['admin', 'asisten', 'mandor'].includes(user.role);

  const exportCols = [
    { label: 'Tanggal', key: r => formatTanggal(r.tanggal) },
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

  const handleDeleteSingle = (id, pupukNama, tanggal) => {
    setDeleteConfirm({
      message: `Hapus data realisasi "${pupukNama}" tanggal ${formatTanggal(tanggal)}?`,
      onConfirm: async () => {
        setDeleteConfirm(null);
        try {
          await api(`/fertilization/realisasi/${id}`, { method: 'DELETE' });
          loadData();
        } catch (err) { alert('Gagal menghapus: ' + err.message); }
      }
    });
  };

  const handleBulkDelete = () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setDeleteConfirm({
      message: `Yakin ingin menghapus ${ids.length} data realisasi yang dipilih? Data yang dihapus tidak bisa dikembalikan.`,
      onConfirm: async () => {
        setDeleteConfirm(null);
        try {
          // Delete one by one since there's no bulk endpoint yet
          for (const id of ids) {
            await api(`/fertilization/realisasi/${id}`, { method: 'DELETE' });
          }
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
        {/* Compact filter bar for mobile */}
        <div className="filters-bar mobile-compact-filters">
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
            <label>Dari</label>
            <input type="date" className="form-control" value={filters.start_date} onChange={e => handleFilter('start_date', e.target.value)} />
          </div>
          <div className="filter-group">
            <label>Sampai</label>
            <input type="date" className="form-control" value={filters.end_date} onChange={e => handleFilter('end_date', e.target.value)} />
          </div>
          <div className="filter-group">
            <label>Kategori</label>
            <select className="form-control" value={filters.kategori} onChange={e => handleFilter('kategori', e.target.value)}>
              <option value="semua">Semua</option>
              <option value="TM">TM</option>
              <option value="TBM">TBM</option>
            </select>
          </div>
        </div>

        {/* Bulk action bar */}
        {canDelete && selectedIds.size > 0 && (
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
            <>
              {/* Desktop table */}
              <div className="desktop-table" style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      {canDelete && (
                        <th style={{ width: 40 }}>
                          <input type="checkbox" checked={selectedIds.size === sortedData.length && sortedData.length > 0} onChange={toggleSelectAll} />
                        </th>
                      )}
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
                      <tr key={r.id} style={{ background: selectedIds.has(r.id) ? 'rgba(99,102,241,0.06)' : undefined }}>
                        {canDelete && (
                          <td><input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => toggleSelect(r.id)} /></td>
                        )}
                        <td style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{formatTanggal(r.tanggal)}</td>
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
                            <button className="btn-icon danger" onClick={() => handleDeleteSingle(r.id, r.pupuk_nama, r.tanggal)} title="Hapus"><Trash2 size={14} /></button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile card layout */}
              <div className="mobile-cards">
                {canDelete && (
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="checkbox" checked={selectedIds.size === sortedData.length && sortedData.length > 0} onChange={toggleSelectAll} />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Pilih semua</span>
                  </div>
                )}
                {sortedData.map(r => (
                  <div key={r.id} className="mobile-data-card" style={{ background: selectedIds.has(r.id) ? 'rgba(99,102,241,0.06)' : undefined }}>
                    <div className="mobile-card-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                        {canDelete && <input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => toggleSelect(r.id)} />}
                        <span className="badge badge-blue">{r.field_kode || r.field_nama}</span>
                        <span style={{ fontWeight: 700, fontSize: 13 }}>{r.pupuk_nama}</span>
                      </div>
                      {canDelete && (
                        <button className="btn-icon danger" onClick={() => handleDeleteSingle(r.id, r.pupuk_nama, r.tanggal)} style={{ width: 28, height: 28 }}><Trash2 size={12} /></button>
                      )}
                    </div>
                    <div className="mobile-card-body">
                      <div className="mobile-card-row">
                        <span className="mc-label">Tanggal</span>
                        <span className="mc-value">{formatTanggal(r.tanggal)}</span>
                      </div>
                      <div className="mobile-card-row">
                        <span className="mc-label">Unit</span>
                        <span className="mc-value">{r.unit_nama}</span>
                      </div>
                      <div className="mobile-card-row">
                        <span className="mc-label">Afdeling</span>
                        <span className="mc-value">{r.afdeling_nama}</span>
                      </div>
                      <div className="mobile-card-row">
                        <span className="mc-label">Tonase</span>
                        <span className="mc-value" style={{ fontWeight: 700 }}>{r.dosis_aktual} kg</span>
                      </div>
                      <div className="mobile-card-row">
                        <span className="mc-label">Pelaksana</span>
                        <span className="mc-value">{r.pelaksana || r.user_nama || '-'}</span>
                      </div>
                    </div>
                    <div className="mobile-card-footer">
                      <span className={`badge ${r.tipe === 'realisasi' ? 'badge-green' : 'badge-yellow'}`}>
                        {r.tipe === 'realisasi' ? '✅ Realisasi' : '📋 Rencana'}
                      </span>
                      {r.is_override ? <span className="badge badge-red">⚠️ Override</span> : <span className="badge badge-green">Normal</span>}
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
