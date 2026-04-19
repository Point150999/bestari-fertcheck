import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { exportCSV, exportPDF } from '../utils/export';
import { FileText, Download, Printer } from 'lucide-react';

export default function RekomendasiPage({ user }) {
  const [data, setData] = useState([]);
  const [units, setUnits] = useState([]);
  const [filters, setFilters] = useState({ unit_kebun_id: user.unit_kebun_id || '', semester: '', tahun: new Date().getFullYear(), kategori: 'semua' });
  const [loading, setLoading] = useState(true);

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
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleFilter = (key, value) => {
    const f = { ...filters, [key]: value };
    setFilters(f);
    loadData(f);
  };

  return (
    <>
      <div className="page-header">
        <h2>📋 Rekomendasi Pupuk</h2>
        <p>Data rekomendasi pemupukan per field</p>
      </div>

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
                    <th>Unit</th>
                    <th>Afdeling</th>
                    <th>Field</th>
                    <th>Pupuk</th>
                    <th>Dosis/Pokok</th>
                    <th>Tonase</th>
                    <th>Tanggal Rencana</th>
                    <th>Semester</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map(r => (
                    <tr key={r.id}>
                      <td>{r.unit_nama}</td>
                      <td>{r.afdeling_nama}</td>
                      <td><span className="badge badge-blue">{r.field_kode || r.field_nama}</span></td>
                      <td style={{ fontWeight: 600 }}>{r.pupuk_nama}</td>
                      <td>{r.dosis_per_pokok || '-'} kg</td>
                      <td>{r.tonase || r.dosis_per_ha || '-'} kg</td>
                      <td>{r.tanggal_rencana || '-'}</td>
                      <td><span className="badge badge-purple">S{r.semester}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
