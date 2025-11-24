import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import { api } from '../lib/api';
import CoordinatePicker from './CoordinatePicker';
import { useWindowSize } from "../hooks/useWindowSize";

const EMPTY = { id:null, lake_id:'', flow_type:'inflow', name:'', alt_name:'', source:'', is_primary:false, notes:'', lat:'', lon:'' };

export default function LakeFlowForm({ open, mode='create', initialValue=EMPTY, lakes=[], lakesLoading=false, loading=false, onSubmit, onCancel }) {
  const [form, setForm] = useState(EMPTY);
  const { width: windowW } = useWindowSize();

  useEffect(()=>{ 
    const mapped = { ...EMPTY, ...initialValue, flow_type: initialValue.flow_type || 'inflow' };
    // Map latitude/longitude to lat/lon for form
    if (initialValue.latitude != null) mapped.lat = initialValue.latitude;
    if (initialValue.longitude != null) mapped.lon = initialValue.longitude;
    setForm(mapped);
  }, [initialValue, open]);

  const submit = (e) => {
    e?.preventDefault?.();
    if (!form.lake_id) return;
    const payload = { ...form };
    if (payload.lat === '') payload.lat = undefined;
    if (payload.lon === '') payload.lon = undefined;
    onSubmit?.(payload);
  };

  const computeModalWidth = (w) => {
    if (!w) return 720;
    if (w >= 2561) return 1400; // 4k
    if (w >= 1441) return 1080; // Laptop L
    if (w >= 1025) return 860;  // Laptop
    if (w >= 769) return 720;   // Tablet
    // mobile: keep it responsive to viewport rather than fixed pixels
    if (w <= 420) return '92vw';
    return '94vw';
  };

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={mode==='create'?'Add Tributary':'Edit Tributary'}
      ariaLabel="Lake Tributary Form"
      width={computeModalWidth(windowW)}
      footer={<div className="lv-modal-actions" style={{ padding: '12px 16px' }}>
        <button type="button" className="pill-btn ghost" onClick={onCancel} disabled={loading}>Cancel</button>
        <button type="submit" className="pill-btn primary" form="lv-flow-form" disabled={loading}>{loading?'Saving...':(mode==='create'?'Create':'Save')}</button>
      </div>}
    >
      <form
        id="lv-flow-form"
        onSubmit={submit}
        className="lv-grid"
        style={{
          display: 'grid',
          gap: 16,
          gridTemplateColumns: windowW <= 768 ? '1fr' : 'repeat(2, 1fr)',
          gridAutoRows: 'minmax(48px, auto)',
          maxWidth: '100%',
          padding: windowW <= 768 ? '8px' : '16px',
        }}
      >
        <label className="lv-field" style={{ width: '100%' }}>
          <span>Lake*</span>
          <select value={form.lake_id} required onChange={e=>setForm(f=>({...f,lake_id:e.target.value}))} disabled={lakesLoading} style={{ width: '100%' }}>
            <option value="">{lakesLoading ? 'Loading lakes...' : 'Select lake'}</option>
            {!lakesLoading && lakes.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </label>
        <label className="lv-field" style={{ width: '100%' }}>
          <span>Type*</span>
          <select value={form.flow_type} onChange={e=>setForm(f=>({...f,flow_type:e.target.value}))} style={{ width: '100%' }}>
            <option value="inflow">Inlet</option>
            <option value="outflow">Outlet</option>
          </select>
        </label>
        <label className="lv-field" style={{ width: '100%' }}>
          <span>Name*</span>
          <input value={form.name} required onChange={e=>setForm(f=>({...f,name:e.target.value}))} style={{ width: '100%' }} />
        </label>
        <label className="lv-field" style={{ width: '100%' }}>
          <span>Alt Name</span>
          <input value={form.alt_name} onChange={e=>setForm(f=>({...f,alt_name:e.target.value}))} style={{ width: '100%' }} />
        </label>
        <label className="lv-field" style={{ width: '100%' }}>
          <span>Source*</span>
          <input value={form.source} required onChange={e=>setForm(f=>({...f,source:e.target.value}))} placeholder="e.g. Agos River" style={{ width: '100%' }} />
        </label>
        <label className="lv-field" style={{ width: '100%' }}>
          <span>Primary?</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              className={`pill-btn ${form.is_primary ? 'primary' : 'ghost'}`}
              aria-pressed={!!form.is_primary}
              onClick={() => setForm(f => ({ ...f, is_primary: !f.is_primary }))}
              style={{ padding: '6px 10px', width: '100%' }}
            >
              {form.is_primary ? 'Primary' : 'Mark primary'}
            </button>
          </div>
        </label>
        <label className="lv-field" style={{ gridColumn: windowW <= 768 ? '1 / span 1' : '1 / span 2', width: '100%' }}>
          <span>Notes</span>
          <textarea rows={3} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} style={{ width: '100%' }} />
        </label>
        <div className="lv-field" style={{ gridColumn: windowW <= 768 ? '1 / span 1' : '1 / span 2', width: '100%' }}>
          <strong style={{fontSize:14}}>Coordinates</strong>
          <div style={{display:'flex',gap:16,flexWrap:'wrap', marginTop:8}}>
            <label className="lv-field" style={{flex:'1 1 160px', width: '100%' }}>
              <span>Latitude*</span>
              <input type="number" step="0.000001" placeholder="14.1702" value={form.lat} onChange={e=>setForm(f=>({...f,lat:e.target.value}))} style={{ width: '100%' }} />
            </label>
            <label className="lv-field" style={{flex:'1 1 160px', width: '100%' }}>
              <span>Longitude*</span>
              <input type="number" step="0.000001" placeholder="121.2245" value={form.lon} onChange={e=>setForm(f=>({...f,lon:e.target.value}))} style={{ width: '100%' }} />
            </label>
            <CoordinatePicker form={form} setForm={setForm} showLakeLayer={true} lakeId={form.lake_id || null} />
          </div>
        </div>
      </form>
    </Modal>
  );
}

