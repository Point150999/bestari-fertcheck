import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Leaf, MapPin, Calendar, AlertTriangle, TrendingUp } from 'lucide-react';

function ProgressBar({ label, pct, rekom, real, color }) {
  const p = Math.min(pct, 100);
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
        <span style={{ fontWeight: 600 }}>{label}</span>
        <span style={{ color: 'var(--text-muted)' }}>{real}/{rekom} <span style={{ fontWeight: 700, color: p >= 80 ? 'var(--accent-green)' : p >= 50 ? 'var(--accent-yellow)' : 'var(--accent-red)' }}>{pct}%</span></span>
      </div>
      <div style={{ height: 8, background: 'var(--bg-primary)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${p}%`, background: color || (p >= 80 ? 'var(--accent-green)' : p >= 50 ? 'var(--accent-yellow)' : 'var(--accent-red)'), borderRadius: 4, transition: 'width 0.8s ease' }} />
      </div>
    </div>
  );
}

function BigProgress({ label, pct, rekom, real, active, onClick }) {
  const p = Math.min(pct, 100);
  const color = p >= 80 ? '#10b981' : p >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div onClick={onClick} style={{ textAlign: 'center', padding: 16, cursor: onClick ? 'pointer' : 'default', borderRadius: 12, border: active ? '2px solid var(--accent-blue)' : '2px solid transparent', background: active ? 'rgba(99,102,241,0.08)' : 'transparent', transition: 'all 0.2s' }}>
      <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 8px' }}>
        <svg viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)', width: 80, height: 80 }}>
          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--bg-primary)" strokeWidth="3" />
          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={color} strokeWidth="3" strokeDasharray={`${p}, 100`} strokeLinecap="round" style={{ transition: 'stroke-dasharray 1s ease' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 18, fontWeight: 800, color }}>{pct}%</span>
        </div>
      </div>
      <div style={{ fontWeight: 700, fontSize: 13 }}>{label}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{real}/{rekom}</div>
    </div>
  );
}

function FilterBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 14px', fontSize: 12, fontWeight: 600, borderRadius: 6, border: 'none', cursor: 'pointer',
      background: active ? 'var(--accent-blue)' : 'var(--bg-tertiary)',
      color: active ? '#fff' : 'var(--text-secondary)',
      transition: 'all 0.2s'
    }}>{children}</button>
  );
}

export default function DashboardPage({ user }) {
  const [stats, setStats] = useState(null);
  const [progress, setProgress] = useState(null);
  const [units, setUnits] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState('');
  const [kategori, setKategori] = useState('semua');
  const [loading, setLoading] = useState(true);
  // Progress filters
  const [pKat, setPKat] = useState('semua');
  const [pUnit, setPUnit] = useState('');
  const [pStartDate, setPStartDate] = useState('');
  const [pEndDate, setPEndDate] = useState('');

  const isMultiUnit = user.role === 'admin' || user.role === 'area_controller' || user.role === 'rceo';

  useEffect(() => {
    if (isMultiUnit) {
      api('/admin/units').then(setUnits).catch(() => {});
    }
    loadStats();
    loadProgress();
  }, []);

  const loadStats = async (unitId, kat) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (unitId) params.set('unit_kebun_id', unitId);
      if (kat && kat !== 'semua') params.set('kategori', kat);
      const q = params.toString() ? `?${params}` : '';
      setStats(await api(`/fertilization/dashboard${q}`));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const loadProgress = async (opts) => {
    try {
      const o = opts || {};
      const params = new URLSearchParams();
      const unit = o.unit !== undefined ? o.unit : pUnit;
      const kat = o.kat !== undefined ? o.kat : pKat;
      const sd = o.start_date !== undefined ? o.start_date : pStartDate;
      const ed = o.end_date !== undefined ? o.end_date : pEndDate;
      if (unit) params.set('unit_kebun_id', unit);
      if (kat && kat !== 'semua') params.set('kategori', kat);
      if (sd) params.set('start_date', sd);
      if (ed) params.set('end_date', ed);
      params.set('tahun', new Date().getFullYear());
      setProgress(await api(`/fertilization/progress?${params}`));
    } catch (err) { console.error(err); }
  };

  const handleUnitChange = (e) => {
    setSelectedUnit(e.target.value);
    loadStats(e.target.value, kategori);
  };

  const handleKategoriChange = (e) => {
    setKategori(e.target.value);
    loadStats(selectedUnit, e.target.value);
  };

  const handlePKat = (v) => { setPKat(v); loadProgress({ kat: v }); };
  const handlePUnit = (v) => { setPUnit(v); loadProgress({ unit: v }); };
  const handlePDate = (field, v) => {
    if (field === 'start') { setPStartDate(v); loadProgress({ start_date: v }); }
    else { setPEndDate(v); loadProgress({ end_date: v }); }
  };

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const chartData = monthNames.map((name, i) => {
    const m = String(i + 1).padStart(2, '0');
    const rencana = stats?.monthly_stats?.find(s => s.bulan === m && s.tipe === 'rencana')?.jumlah || 0;
    const realisasi = stats?.monthly_stats?.find(s => s.bulan === m && s.tipe === 'realisasi')?.jumlah || 0;
    return { bulan: name, Rencana: rencana, Realisasi: realisasi };
  });

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  const kategoriLabel = kategori === 'TM' ? ' (TM)' : kategori === 'TBM' ? ' (TBM)' : '';
  const year = new Date().getFullYear();

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2>Dashboard</h2>
            <p>Overview status pemupukan {user.unit_kebun_nama || 'semua unit'}{kategoriLabel}</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select className="form-control" style={{ width: 130 }} value={kategori} onChange={handleKategoriChange}>
              <option value="semua">Semua (TM+TBM)</option>
              <option value="TM">Pupuk TM</option>
              <option value="TBM">Pupuk TBM</option>
            </select>
            {isMultiUnit && units.length > 0 && (
              <select className="form-control" style={{ width: 180 }} value={selectedUnit} onChange={handleUnitChange}>
                <option value="">Semua Unit</option>
                {units.map(u => <option key={u.id} value={u.id}>{u.nama}</option>)}
              </select>
            )}
          </div>
        </div>
      </div>

      <div className="page-body">
        {/* Stat Cards */}
        <div className="stat-cards">
          <div className="stat-card">
            <div className="stat-icon blue"><MapPin size={24} /></div>
            <div><div className="stat-value">{stats?.total_fields || 0}</div><div className="stat-label">Total Field</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green"><Leaf size={24} /></div>
            <div><div className="stat-value">{stats?.total_realisasi || 0}</div><div className="stat-label">Total Realisasi</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon yellow"><Calendar size={24} /></div>
            <div><div className="stat-value">{stats?.realisasi_bulan_ini || 0}</div><div className="stat-label">Realisasi Bulan Ini</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon red"><AlertTriangle size={24} /></div>
            <div><div className="stat-value">{stats?.total_rencana || 0}</div><div className="stat-label">Total Rencana</div></div>
          </div>
        </div>

        {/* Progress Section */}
        {progress && (
          <div className="chart-container" style={{ marginBottom: 20 }}>
            <h3><TrendingUp size={16} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />Progres Aplikasi Pupuk {year}</h3>

            {/* Filter Bar */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', margin: '12px 0 16px', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              {/* Kategori Buttons */}
              <FilterBtn active={pKat === 'semua'} onClick={() => handlePKat('semua')}>Total</FilterBtn>
              <FilterBtn active={pKat === 'TM'} onClick={() => handlePKat('TM')}>TM</FilterBtn>
              <FilterBtn active={pKat === 'TBM'} onClick={() => handlePKat('TBM')}>TBM</FilterBtn>

              <span style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 4px' }} />

              {/* Date Range */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input type="date" className="form-control" style={{ width: 130, padding: '5px 8px', fontSize: 11 }} value={pStartDate} onChange={e => handlePDate('start', e.target.value)} placeholder="Dari" />
                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>
                <input type="date" className="form-control" style={{ width: 130, padding: '5px 8px', fontSize: 11 }} value={pEndDate} onChange={e => handlePDate('end', e.target.value)} placeholder="Sampai" />
              </div>

              {/* Unit filter for AC/RCEO/Admin */}
              {isMultiUnit && units.length > 0 && (
                <>
                  <span style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 4px' }} />
                  <select className="form-control" style={{ width: 150, padding: '5px 8px', fontSize: 11 }} value={pUnit} onChange={e => handlePUnit(e.target.value)}>
                    <option value="">Semua Unit</option>
                    {units.map(u => <option key={u.id} value={u.id}>{u.nama}</option>)}
                  </select>
                </>
              )}

              {/* Reset */}
              {(pKat !== 'semua' || pUnit || pStartDate || pEndDate) && (
                <button onClick={() => { setPKat('semua'); setPUnit(''); setPStartDate(''); setPEndDate(''); loadProgress({ kat: 'semua', unit: '', start_date: '', end_date: '' }); }}
                  style={{ padding: '5px 10px', fontSize: 11, borderRadius: 6, border: '1px solid var(--accent-red)', background: 'transparent', color: 'var(--accent-red)', cursor: 'pointer' }}>
                  ✕ Reset
                </button>
              )}
            </div>

            {/* Big circular progress */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap', margin: '0 0 20px', paddingBottom: 20, borderBottom: '1px solid var(--border)' }}>
              <BigProgress label="Total" pct={progress.total.pct} rekom={progress.total.rekom} real={progress.total.real} active={pKat === 'semua'} onClick={() => handlePKat('semua')} />
              {progress.kategori.map(k => (
                <BigProgress key={k.kategori} label={k.kategori} pct={k.pct} rekom={k.rekom} real={k.real} active={pKat === k.kategori} onClick={() => handlePKat(k.kategori)} />
              ))}
            </div>

            {/* Per Divisi */}
            {progress.divisi.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: 'var(--text-secondary)' }}>📊 Progres per Divisi {pKat !== 'semua' ? `(${pKat})` : ''}</h4>
                {progress.divisi.map(d => (
                  <ProgressBar key={d.afdeling_id} label={d.divisi} pct={d.pct} rekom={d.rekom} real={d.real} color="#6366f1" />
                ))}
              </div>
            )}

            {/* Per Jenis Pupuk */}
            {progress.pupuk.length > 0 && (
              <div>
                <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: 'var(--text-secondary)' }}>🧪 Progres per Jenis Pupuk {pKat !== 'semua' ? `(${pKat})` : ''}</h4>
                {progress.pupuk.map(p => (
                  <ProgressBar key={p.pupuk} label={p.pupuk} pct={p.pct} rekom={p.rekom} real={p.real} color="#06b6d4" />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Monthly Chart */}
        <div className="chart-container">
          <h3>📊 Rencana vs Realisasi Pemupukan{kategoriLabel} {year}</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a3550" />
              <XAxis dataKey="bulan" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip contentStyle={{ background: '#1a2234', border: '1px solid #2a3550', borderRadius: 8, color: '#f1f5f9' }} />
              <Legend />
              <Bar dataKey="Rencana" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Realisasi" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}
