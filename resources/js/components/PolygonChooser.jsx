import React, { useMemo, useRef, useEffect } from 'react';
import Modal from './Modal';
import { GeoJSON } from 'react-leaflet';
import AppMap from './AppMap';
import MapViewport from './MapViewport';
import { boundsFromGeom, detectEpsg, reprojectMultiPolygonTo4326, toMultiPolygon } from '../utils/geo';
import { FiInfo } from 'react-icons/fi';

export default function PolygonChooser({
  open,
  onClose,
  pendingFeatures,
  pendingCrs,
  featureSelectedIdx,
  setFeatureSelectedIdx,
  featureMapVersion,
  setFeatureMapVersion,
  chooseFeature,
  previewColor,
}) {
  const modalMapRef = useRef(null);

  const guessFeatureLabel = (feat, idx) => {
    const props = feat?.properties || {};
    const keys = ['name', 'NAME', 'Name', 'title', 'lake', 'lake_name', 'Lake', 'LName', 'id', 'ID'];
    for (const k of keys) {
      if (props[k]) return String(props[k]);
    }
    return `Feature ${idx + 1}`;
  };

  useEffect(() => {
    if (open && modalMapRef.current) {
      setTimeout(() => { try { modalMapRef.current.invalidateSize(); } catch (_) {} }, 50);
    }
  }, [open]);

  const previewGeometries = useMemo(() => {
    if (!pendingFeatures || !pendingFeatures.length) return [];
    return pendingFeatures.map((f) => {
      try {
        const mp = toMultiPolygon(f.geometry);
        let srid = null;
        if (pendingCrs) {
          try { srid = detectEpsg({ crs: pendingCrs }); } catch (_) { srid = null; }
        }
        return srid && srid !== 4326 ? reprojectMultiPolygonTo4326(mp, srid) : mp;
      } catch (_) { return null; }
    });
  }, [pendingFeatures, pendingCrs]);

  return (
    <Modal open={open} onClose={onClose} title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>Choose a Polygon</span>} width={960}>
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 12, minHeight: 420 }}>
        <div className="org-form" style={{ overflowY: 'auto' }}>
          <div className="form-group">
            <label>Polygon</label>
            <select value={featureSelectedIdx} onChange={(e) => { const val = e.target.value; setFeatureSelectedIdx(val === '' ? '' : Number(val)); setFeatureMapVersion((v) => v + 1); }}>
              <option value="">Choose a polygon</option>
              {pendingFeatures.map((f, idx) => (
                <option key={idx} value={idx}>{guessFeatureLabel(f, idx)}</option>
              ))}
            </select>
          </div>
          <div className="info-row"><FiInfo /> The map shows all polygons. The selected one is highlighted.</div>
          <div style={{ marginTop: 8 }}>
            <button type="button" className={`pill-btn ${featureSelectedIdx === '' ? 'ghost' : 'primary'}`} disabled={featureSelectedIdx === ''} onClick={() => featureSelectedIdx !== '' && chooseFeature(featureSelectedIdx)}>Use this polygon</button>
          </div>
        </div>
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
          <AppMap view="osm" style={{ height: '100%', width: '100%' }} whenCreated={(m) => { modalMapRef.current = m; setTimeout(() => { try { m.invalidateSize(); } catch (_) {} }, 50); }}>
            {featureSelectedIdx === '' && previewGeometries.map((g, idx) => {
              const raw = pendingFeatures[idx]?.geometry;
              const geom = g || raw || null;
              if (!geom) return null;
              return <GeoJSON key={`cand-${idx}-${featureMapVersion}`} data={{ type: 'Feature', geometry: geom }} style={{ color: '#3388ff', opacity: 0.8, weight: 1.5, fill: true, fillColor: '#3388ff', fillOpacity: 0.12 }} />;
            })}
            {typeof featureSelectedIdx === 'number' && (() => { const g = previewGeometries[featureSelectedIdx]; if (!g) return null; return <GeoJSON key={`sel-${featureSelectedIdx}-${featureMapVersion}`} data={{ type: 'Feature', geometry: g }} style={{ color: '#3388ff', opacity: 1, weight: 3, fill: true, fillColor: '#3388ff', fillOpacity: 0.35 }} />; })()}
            {featureSelectedIdx === '' ? (() => {
              try {
                let minLat = Infinity, minLng = Infinity, maxLat = -Infinity, maxLng = -Infinity;
                let any = false;
                previewGeometries.forEach((g, idx) => {
                  let geom = g;
                  if (!geom) geom = pendingFeatures[idx]?.geometry;
                  if (!geom) return;
                  const b = boundsFromGeom(geom);
                  if (!b) return;
                  const [[lat1, lng1], [lat2, lng2]] = b;
                  minLat = Math.min(minLat, lat1);
                  minLng = Math.min(minLng, lng1);
                  maxLat = Math.max(maxLat, lat2);
                  maxLng = Math.max(maxLng, lng2);
                  any = true;
                });
                if (!any) return null;
                return <MapViewport bounds={[[minLat, minLng], [maxLat, maxLng]]} version={featureMapVersion} />;
              } catch (_) { return null; }
            })() : (() => {
              const g = previewGeometries[featureSelectedIdx];
              if (!g) return null;
              const b = boundsFromGeom(g);
              if (!b) return null;
              return <MapViewport bounds={b} version={featureMapVersion} />;
            })()}
          </AppMap>
        </div>
      </div>
    </Modal>
  );
}
