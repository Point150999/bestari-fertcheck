import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Send, AlertTriangle, CheckCircle, Info, X, CalendarClock } from 'lucide-react';

export default function FormInputPage({ user }) {
  const [units, setUnits] = useState([]);
  const [afdelings, setAfdelings] = useState([]);
  const [fields, setFields] = useState([]);
  const [pupuks, setPupuks] = useState([]);
  const [popup, setPopup] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    tipe: 'realisasi',
    unit_kebun_id: user.unit_kebun_id || '',
    afdeling_id: '',
    field_blok_id: '',
    pupuk_id: '',
    dosis_aktual: '',
    tanggal: new Date().toISOString().split('T')[0],
    pelaksana: '',
    catatan: ''
  });

  useEffect(() => {
    api('/admin/pupuk').then(setPupuks).catch(() => {});
    if (user.role === 'admin') {
      api('/admin/units').then(setUnits).catch(() => {});
    } else if (user.unit_kebun_id) {
      api(`/admin/afdelings?unit_kebun_id=${user.unit_kebun_id}`).then(setAfdelings).catch(() => {});
    }
  }, []);

  const handleUnitChange = async (unitId) => {
    setForm({ ...form, unit_kebun_id: unitId, afdeling_id: '', field_blok_id: '' });
    if (unitId) {
      const a = await api(`/admin/afdelings?unit_kebun_id=${unitId}`);
      setAfdelings(a);
    } else {
      setAfdelings([]);
    }
    setFields([]);
  };

  const handleAfdelingChange = async (afdId) => {
    setForm({ ...form, afdeling_id: afdId, field_blok_id: '' });
    if (afdId) {
      const f = await api(`/admin/fields?afdeling_id=${afdId}`);
      setFields(f);
    } else {
      setFields([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.field_blok_id || !form.pupuk_id || !form.tanggal) return;

    setLoading(true);
    setSuccess('');
    try {
      // Check antagonism first
      const check = await api('/fertilization/check-antagonisme', {
        method: 'POST',
        body: JSON.stringify({
          field_blok_id: form.field_blok_id,
          pupuk_id: form.pupuk_id,
          tanggal_rencana: form.tanggal
        })
      });

      setPopup({ ...check, formData: form });
    } catch (err) {
      alert('Error: ' + err.message);
    }
    setLoading(false);
  };

  const handleSave = async (override = false, newDate = null) => {
    try {
      const saveData = {
        ...form,
        dosis_aktual: parseFloat(form.dosis_aktual) || 0,
        is_override: override,
      };
      if (newDate) saveData.tanggal = newDate;

      await api('/fertilization/submit', {
        method: 'POST',
        body: JSON.stringify(saveData)
      });

      setSuccess('✅ Data berhasil disimpan!');
      setPopup(null);
      setForm({
        ...form,
        field_blok_id: '',
        pupuk_id: '',
        dosis_aktual: '',
        tanggal: new Date().toISOString().split('T')[0],
        pelaksana: '',
        catatan: ''
      });
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <>
      <div className="page-header">
        <h2>📝 Form Input Pemupukan</h2>
        <p>Input data rencana atau realisasi pemupukan</p>
      </div>

      <div className="page-body">
        {success && (
          <div style={{ background: 'var(--accent-green-glow)', border: '1px solid var(--accent-green)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', marginBottom: 20, color: 'var(--accent-green)', fontSize: 14, fontWeight: 600 }}>
            {success}
          </div>
        )}

        <div className="card" style={{ maxWidth: 700 }}>
          <form onSubmit={handleSubmit}>
            {/* Tipe */}
            <div className="form-group">
              <label>Tipe</label>
              <div className="tabs">
                <button type="button" className={`tab ${form.tipe === 'rencana' ? 'active' : ''}`} onClick={() => setForm({ ...form, tipe: 'rencana' })}>📋 Rencana</button>
                <button type="button" className={`tab ${form.tipe === 'realisasi' ? 'active' : ''}`} onClick={() => setForm({ ...form, tipe: 'realisasi' })}>✅ Realisasi</button>
              </div>
            </div>

            {/* Unit Kebun (admin only) */}
            {user.role === 'admin' && (
              <div className="form-group">
                <label>Unit Kebun</label>
                <select className="form-control" value={form.unit_kebun_id} onChange={e => handleUnitChange(e.target.value)} required>
                  <option value="">-- Pilih Unit Kebun --</option>
                  {units.map(u => <option key={u.id} value={u.id}>{u.nama}</option>)}
                </select>
              </div>
            )}

            {/* Afdeling */}
            <div className="form-group">
              <label>Afdeling</label>
              <select className="form-control" value={form.afdeling_id} onChange={e => handleAfdelingChange(e.target.value)} required>
                <option value="">-- Pilih Afdeling --</option>
                {afdelings.map(a => <option key={a.id} value={a.id}>{a.nama} ({a.kode})</option>)}
              </select>
            </div>

            {/* Field */}
            <div className="form-group">
              <label>Field / Blok</label>
              <select className="form-control" value={form.field_blok_id} onChange={e => setForm({ ...form, field_blok_id: e.target.value })} required>
                <option value="">-- Pilih Field --</option>
                {fields.map(f => <option key={f.id} value={f.id}>{f.nama} ({f.kode})</option>)}
              </select>
            </div>

            {/* Pupuk */}
            <div className="form-group">
              <label>Jenis Pupuk</label>
              <select className="form-control" value={form.pupuk_id} onChange={e => setForm({ ...form, pupuk_id: e.target.value })} required>
                <option value="">-- Pilih Pupuk --</option>
                {pupuks.map(p => <option key={p.id} value={p.id}>{p.nama} {p.jenis ? `(${p.jenis})` : ''}</option>)}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Tonase (kg)</label>
                <input type="number" step="0.01" className="form-control" placeholder="0.00" value={form.dosis_aktual} onChange={e => setForm({ ...form, dosis_aktual: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Tanggal</label>
                <input type="date" className="form-control" value={form.tanggal} onChange={e => setForm({ ...form, tanggal: e.target.value })} required />
              </div>
            </div>

            <div className="form-group">
              <label>Pelaksana</label>
              <input type="text" className="form-control" placeholder="Nama pelaksana..." value={form.pelaksana} onChange={e => setForm({ ...form, pelaksana: e.target.value })} />
            </div>

            <div className="form-group">
              <label>Catatan (Opsional)</label>
              <textarea className="form-control" rows={3} placeholder="Catatan tambahan..." value={form.catatan} onChange={e => setForm({ ...form, catatan: e.target.value })} />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Send size={16} />
              {loading ? 'Memeriksa...' : '🔍 Cek & Submit'}
            </button>
          </form>
        </div>
      </div>

      {/* ===== POPUP ANTAGONISME / SINERGISME ===== */}
      {popup && (
        <div className="modal-overlay" onClick={() => setPopup(null)}>
          <div className={`modal ${popup.status === 'antagonis' ? 'popup-antagonis' : popup.status === 'sinergis' ? 'popup-sinergis' : 'popup-netral'}`} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {popup.status === 'antagonis' && '⚠️ Peringatan Antagonisme Pupuk'}
                {popup.status === 'sinergis' && '✅ Pupuk Sinergis'}
                {popup.status === 'netral' && 'ℹ️ Informasi'}
                {popup.status === 'aman' && '✅ Aman'}
              </h3>
              <button className="btn-icon" onClick={() => setPopup(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              {popup.status === 'antagonis' && (
                <>
                  <div className="popup-icon" style={{ background: 'var(--accent-red-glow)' }}>
                    <AlertTriangle size={32} color="var(--accent-red)" />
                  </div>
                  <p style={{ textAlign: 'center', fontSize: 15, fontWeight: 600, marginBottom: 16, color: 'var(--accent-red)' }}>
                    {popup.message}
                  </p>
                  <div className="popup-detail">
                    <div className="popup-detail-row">
                      <span className="label">Pupuk Terakhir</span>
                      <span className="value">{popup.detail.pupuk_terakhir}</span>
                    </div>
                    <div className="popup-detail-row">
                      <span className="label">Tanggal Aplikasi</span>
                      <span className="value">{popup.detail.tanggal_terakhir}</span>
                    </div>
                    <div className="popup-detail-row">
                      <span className="label">Pupuk Baru</span>
                      <span className="value">{popup.detail.pupuk_baru}</span>
                    </div>
                    <div className="popup-detail-row">
                      <span className="label">Interval Minimum</span>
                      <span className="value" style={{ color: 'var(--accent-red)' }}>{popup.detail.interval_hari} hari</span>
                    </div>
                    <div className="popup-detail-row" style={{ borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4 }}>
                      <span className="label" style={{ fontWeight: 600 }}>Baru Bisa Dipupuk</span>
                      <span className="value" style={{ color: 'var(--accent-yellow)', fontSize: 15 }}>{popup.detail.tanggal_aman}</span>
                    </div>
                  </div>
                </>
              )}

              {popup.status === 'sinergis' && (
                <>
                  <div className="popup-icon" style={{ background: 'var(--accent-green-glow)' }}>
                    <CheckCircle size={32} color="var(--accent-green)" />
                  </div>
                  <p style={{ textAlign: 'center', fontSize: 15, fontWeight: 600, marginBottom: 16, color: 'var(--accent-green)' }}>
                    {popup.message}
                  </p>
                  {popup.detail && (
                    <div className="popup-detail">
                      <div className="popup-detail-row">
                        <span className="label">Pupuk Terakhir</span>
                        <span className="value">{popup.detail.pupuk_terakhir}</span>
                      </div>
                      <div className="popup-detail-row">
                        <span className="label">Pupuk Baru</span>
                        <span className="value">{popup.detail.pupuk_baru}</span>
                      </div>
                    </div>
                  )}
                </>
              )}

              {(popup.status === 'netral' || popup.status === 'aman') && (
                <>
                  <div style={{ textAlign: 'center', marginBottom: 16 }}>
                    <Info size={48} color="var(--accent-blue)" style={{ marginBottom: 12 }} />
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{popup.message}</p>
                  </div>
                </>
              )}
            </div>

            <div className="modal-footer">
              {popup.status === 'antagonis' ? (
                <>
                  <button className="btn btn-secondary" onClick={() => setPopup(null)}>Batalkan</button>
                  <button className="btn btn-primary" onClick={() => handleSave(false, popup.detail.tanggal_aman)}>
                    <CalendarClock size={14} /> Reschedule ke {popup.detail.tanggal_aman}
                  </button>
                  {user.role === 'admin' && (
                    <button className="btn btn-danger" onClick={() => handleSave(true)}>Override</button>
                  )}
                </>
              ) : (
                <>
                  <button className="btn btn-secondary" onClick={() => setPopup(null)}>Batalkan</button>
                  <button className="btn btn-success" onClick={() => handleSave(false)}>
                    <CheckCircle size={14} /> Simpan
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
