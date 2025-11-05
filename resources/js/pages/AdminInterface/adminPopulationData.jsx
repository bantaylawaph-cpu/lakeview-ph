import React, { useEffect, useState, useRef, useCallback } from 'react';
// Use shared authenticated API client (adds Bearer token automatically)
import api from '../../lib/api';
import { cachedGet, invalidateHttpCache } from '../../lib/httpCache';
import LoadingSpinner from '../../components/LoadingSpinner';
import { FiDatabase, FiUploadCloud, FiPlayCircle, FiStar, FiTrash2 } from 'react-icons/fi';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import FileDropzone from '../../components/layers/FileDropzone';

// Superadmin page: manage uploaded population raster source files (GeoTIFF). 
// Ingestion into PostGIS + registration with population functions is out-of-scope here.
export default function AdminPopulationData() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [citation, setCitation] = useState('');
  const [link, setLink] = useState('');
  const [file, setFile] = useState(null);
  const [yearFilter, setYearFilter] = useState('');
  const [actingIds, setActingIds] = useState({}); // { [id]: 'processing' | 'makingDefault' }
  const pollRef = useRef(null);

  // showError: whether errors should be surfaced to the UI (we avoid showing on initial auto-load)
  const load = useCallback(async (showError = false, fresh = false) => {
    setLoading(true);
    if (showError) setError('');
    try {
      const params = {};
      if (yearFilter) params.year = yearFilter;
      const resp = fresh
        ? await api.get('/admin/population-rasters', { params })
        : await cachedGet('/admin/population-rasters', { params, ttlMs: 5 * 60 * 1000 });
      // resp is the parsed JSON body: { data: [...] }
      const list = Array.isArray(resp?.data) ? resp.data : [];
      setRows(list.filter(Boolean));
    } catch (e) {
      if (showError) setError('Failed to load population data');
    } finally {
      setLoading(false);
    }
  }, [yearFilter]);

  // Initial load so the table reflects the database on first render
  useEffect(() => {
    load(true);
  }, [load]);

  // Lightweight polling while any row is ingesting
  useEffect(() => {
    const anyIngesting = rows.some(r => r.status === 'ingesting');
    if (anyIngesting && !pollRef.current) {
      pollRef.current = setInterval(() => load(false, true), 5000);
    } else if (!anyIngesting && pollRef.current) {
      clearInterval(pollRef.current); pollRef.current = null;
    }
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [rows, load]);

  const resetMessages = () => { setError(''); setNotice(''); };

  const onUpload = async (e) => {
    e.preventDefault();
    resetMessages();
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('year', String(year));
      form.append('raster', file);
      if (citation) form.append('notes', citation);
  if (link) form.append('link', link);
      const resp = await api.upload('/admin/population-rasters', form);
      const created = resp?.data || null;
      setRows(r => [created, ...r].filter(Boolean));
      // Also refresh from server to ensure we reflect canonical DB state
      try { invalidateHttpCache('/admin/population-rasters'); } catch {}
      await load(true, true);
      // show a success toast
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Upload complete',
        text: 'File stored and awaiting ingestion.',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      });
      setFile(null);
      setCitation('');
  setLink('');
    } catch (e) {
      const msg = e?.response?.data?.message || 'Upload failed';
      Swal.fire({ icon: 'error', title: 'Upload failed', text: msg });
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  const statusPill = (r) => {
    const base = {
      fontSize: 11,
      padding: '3px 8px',
      borderRadius: 999,
      fontWeight: 600,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      letterSpacing: 0.2,
    };
    const map = {
      uploaded: { background: '#f1f5f9', color: '#475569' },
      ingesting: { background: '#dbeafe', color: '#1d4ed8' },
      ready: { background: '#dcfce7', color: '#166534' },
      error: { background: '#fee2e2', color: '#991b1b' },
    };
    const style = { ...base, ...(map[r.status] || map.uploaded) };
    const label = r.status.charAt(0).toUpperCase() + r.status.slice(1);
    return <span style={style}>{label}{r.is_default ? ' • Default' : ''}{r.ingestion_step && r.status==='ingesting' ? ` • ${r.ingestion_step}` : ''}</span>;
  };

  const processRaster = async (id, makeDefault = false) => {
    setActingIds(a => ({ ...a, [id]: 'processing' }));
    try {
  await api.post(`/admin/population-rasters/${id}/process${makeDefault ? '?make_default=1' : ''}`);
      // optimistic state change
      setRows(rs => rs.map(r => r.id === id ? { ...r, status: 'ingesting' } : r));
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Queued for ingestion', showConfirmButton: false, timer: 2200 });
    } catch (e) {
      const msg = e?.response?.data?.message || 'Failed to queue ingestion';
      Swal.fire({ icon: 'error', title: 'Failed to queue ingestion', text: msg });
      setError(msg);
    } finally {
      setActingIds(a => { const c = { ...a }; delete c[id]; return c; });
    }
  };

  const makeDefault = async (id) => {
    setActingIds(a => ({ ...a, [id]: 'makingDefault' }));
    try {
  await api.post(`/admin/population-rasters/${id}/make-default`);
      try { invalidateHttpCache('/admin/population-rasters'); } catch {}
      // Force a refresh to pick up catalog changes (and possibly ready status)
      await load(true, true);
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Set as default', showConfirmButton: false, timer: 2000 });
    } catch (e) {
      const msg = e?.response?.data?.message || 'Failed to make default';
      Swal.fire({ icon: 'error', title: 'Failed to make default', text: msg });
      setError(msg);
    } finally {
      setActingIds(a => { const c = { ...a }; delete c[id]; return c; });
    }
  };

  const deleteRaster = async (id) => {
    const result = await Swal.fire({
      title: 'Delete raster?',
      text: 'Delete this raster and (if registered) its dataset? This cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;
    setActingIds(a => ({ ...a, [id]: 'deleting' }));
    try {
  await api.delete(`/admin/population-rasters/${id}`);
      setRows(rs => rs.filter(r => r.id !== id));
      try { invalidateHttpCache('/admin/population-rasters'); } catch {}
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Deleted', showConfirmButton: false, timer: 1800 });
    } catch (e) {
      const msg = e?.response?.data?.message || 'Failed to delete raster';
      Swal.fire({ icon: 'error', title: 'Delete failed', text: msg });
      setError(msg);
    } finally {
      setActingIds(a => { const c = { ...a }; delete c[id]; return c; });
    }
  };

  return (
    <div style={{ padding: 24, display: 'grid', gap: 24 }}>
      <div className="dashboard-card" style={{ marginBottom: 4 }}>
        <div className="dashboard-card-header">
          <div className="dashboard-card-title">
            <FiDatabase />
            <span>Population Data</span>
          </div>
        </div>
        <div style={{ fontSize: 13, color: '#475569', maxWidth: 760, marginTop: -12 }}>
            Manage uploaded source raster files (GeoTIFF) for population density & counts. After upload, a separate ingestion step should register
            the dataset in PostGIS so it becomes available to heatmap and estimation functions.
        </div>
      </div>
      {/* Upload Panel */}
      <div className="lv-settings-panel" style={{ gap: 16 }}>
        <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Upload New Raster</h2>
        <form onSubmit={onUpload} style={{ display: 'grid', gap: 14 }}>
          <div className="lv-field-row" style={{ display: 'grid', gap: 6 }}>
            <label htmlFor="pop-year" style={{ fontSize: 12, fontWeight: 600 }}>Dataset Year</label>
            <input
              id="pop-year"
              type="number"
              min={1990}
              max={2100}
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value, 10) || year)}
              required
              style={inputStyle}
            />
          </div>
          <div className="lv-field-row" style={{ display: 'grid', gap: 6 }}>
            <FileDropzone accept=".tif,.tiff" onFile={setFile} selectedFile={file} dropText="Drop a raster file here or click to select" acceptedText="Accepted: .tif, .tiff" />
            <div style={{ fontSize: 11, color: '#64748b' }}>Large files may take a moment to finish transferring; keep this tab open.</div>
          </div>
          <div className="lv-field-row" style={{ display: 'grid', gap: 6 }}>
            <label htmlFor="pop-citation" style={{ fontSize: 12, fontWeight: 600 }}>Citation</label>
            <textarea
              id="pop-citation"
              rows={3}
              value={citation}
              onChange={(e) => setCitation(e.target.value)}
              placeholder="e.g. WorldPop 2020, 1km resolution, CC BY 4.0"
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.35 }}
              maxLength={1000}
              required
            />
          </div>
          <div className="lv-field-row" style={{ display: 'grid', gap: 6 }}>
            <label htmlFor="pop-link" style={{ fontSize: 12, fontWeight: 600 }}>Link to source</label>
            <input
              id="pop-link"
              type="url"
              placeholder="https://example.com/dataset/page"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              style={inputStyle}
              maxLength={2048}
            />
            <div style={{ fontSize: 11, color: '#64748b' }}>Provide a URL to the dataset page or original source.</div>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="submit"
              disabled={uploading}
              className="btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <FiUploadCloud /> {uploading ? 'Uploading…' : 'Upload Raster'}
            </button>
            {uploading && <LoadingSpinner size={20} />}
            {error && <span style={{ color: '#b91c1c', fontSize: 13 }}>{error}</span>}
            {notice && !error && <span style={{ color: '#15803d', fontSize: 13 }}>{notice}</span>}
          </div>
        </form>
      </div>

      {/* Listing Panel */}
      <div className="lv-settings-panel" style={{ gap: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Uploaded Files</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="number"
              placeholder="Filter year"
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value.replace(/[^0-9]/g,'').slice(0,4))}
              style={{ ...inputStyle, width: 120 }}
              aria-label="Filter by year"
            />
            {yearFilter && <button type="button" className="pill-btn ghost" style={{ fontSize: 12 }} onClick={() => { setYearFilter(''); }}>Clear</button>}
          </div>
        </div>
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <LoadingSpinner size={20} /> <span style={{ fontSize: 13 }}>Loading…</span>
          </div>
        )}
        {!loading && rows.length === 0 && (
          <div style={{ fontSize: 13, color: '#64748b' }}>No rasters uploaded yet.</div>
        )}
        {!loading && rows.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table className="lv-table" style={{ borderCollapse: 'collapse', minWidth: 880, width: '100%', tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th style={{ ...th, width: '4%', textAlign: 'center' }}>ID</th>
                  <th style={{ ...th, width: '6%', textAlign: 'center' }}>Year</th>
                  <th style={{ ...th, width: '18%' }}>Original Filename</th>
                  <th style={{ ...th, width: '20%' }}>Stored Path</th>
                  <th style={{ ...th, width: '10%', textAlign: 'center' }}>Status</th>
                  <th style={{ ...th, width: '12%', textAlign: 'center' }}>Actions</th>
                  <th style={{ ...th, width: '12%' }}>Uploaded</th>
                  <th style={{ ...th, width: '18%' }}>Citation</th>
                  <th style={{ ...th, width: '4%', textAlign: 'center' }}>Link</th>
                </tr>
              </thead>
              <tbody>
                {rows.filter(Boolean).map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ ...td, textAlign: 'center' }}>{r.id}</td>
                    <td style={{ ...td, textAlign: 'center' }}>{r.year}</td>
                    <td style={{ ...td, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.filename}</td>
                    <td style={{ ...td, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.path}</td>
                    <td style={{ ...td, textAlign: 'center' }}>{statusPill(r)}</td>
                    <td style={{ ...td, whiteSpace: 'nowrap', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        {['uploaded','error'].includes(r.status) && (
                          <button
                            type="button"
                            className="pill-btn ghost"
                            onClick={() => processRaster(r.id, false)}
                            disabled={!!actingIds[r.id]}
                            style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          >
                            <FiPlayCircle /> {actingIds[r.id] === 'processing' ? 'Queuing…' : 'Process'}
                          </button>
                        )}
                        {r.status === 'ready' && !r.is_default && (
                          <button
                            type="button"
                            className="pill-btn ghost"
                            onClick={() => makeDefault(r.id)}
                            disabled={!!actingIds[r.id]}
                            style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          >
                            <FiStar /> {actingIds[r.id] === 'makingDefault' ? 'Setting…' : 'Make Default'}
                          </button>
                        )}
                        {r.status !== 'ingesting' && (
                          <button
                            type="button"
                            className="pill-btn ghost"
                            onClick={() => deleteRaster(r.id)}
                            disabled={!!actingIds[r.id]}
                            style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4, color: '#b91c1c' }}
                          >
                            <FiTrash2 /> {actingIds[r.id] === 'deleting' ? 'Deleting…' : 'Delete'}
                          </button>
                        )}
                      </div>
                    </td>
                    <td style={{ ...td }}>{new Date(r.created_at).toLocaleString()}</td>
                    <td style={{ ...td, maxWidth: 1200, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{r.notes}</td>
                    <td style={{ ...td, textAlign: 'center' }}>
                      {r.link ? (
                        <a href={r.link} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>Open</a>
                      ) : (
                        <span style={{ color: '#64748b' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle = {
  border: '1px solid #d1d5db',
  background: '#fff',
  borderRadius: 6,
  padding: '6px 10px',
  fontSize: 14,
};

const th = { textAlign: 'left', padding: '6px 10px', fontSize: 12, fontWeight: 600, color: '#475569', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' };
const td = { padding: '6px 10px', fontSize: 13, verticalAlign: 'middle' };
