import React, { useCallback, useEffect, useRef, useState } from "react";
import { FiDownload, FiFileText, FiGlobe } from "react-icons/fi";
import Popover from "../common/Popover";
import { alertError, alertSuccess } from "../../lib/alerts";
import { getToken } from "../../lib/api";

const fmtText = (v) => (v && String(v).trim() ? String(v).trim() : "–");
const getOrgName = (layer) => {
  const org = (layer?.uploaded_by_org ?? "").trim();
  return org ? org : "LakeView";
};

/**
 * Props
 * - layers: array of public layers
 * - activeLayerId: id of the active public layer (default layer)
 * - selectedLayerId: id currently selected in UI
 * - onChooseLayer: (id) => void
 * - onResetToActive: () => void
 */
function LayersTab({
  layers = [],
  activeLayerId = null,
  selectedLayerId = null,
  onChooseLayer,
  onResetToActive,
  isAuthenticated = false, // external hint (e.g. from higher-level auth context)
}) {
  const [downloadLayer, setDownloadLayer] = useState(null);
  const downloadAnchorRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [authed, setAuthed] = useState(!!isAuthenticated);
  // authChecking / spinner removed

  const closePopover = () => setDownloadLayer(null);

  // If parent doesn't pass isAuthenticated, attempt a lazy one-time probe when needed.
  const ensureAuthOrPrompt = useCallback(async () => {
    if (authed) return true;
    await alertError('Sign in required', 'You must be a registered user to download layers.');
    return false;
  }, [authed]);

  // Keep internal authed in sync if prop switches to true later.
  useEffect(() => { if (isAuthenticated && !authed) setAuthed(true); }, [isAuthenticated, authed]);

  // PNG export removed (redundant with existing screenshot feature)

  const doDownloadVector = async (layer, format) => {
    if (!layer?.is_downloadable) {
      await alertError('Not Downloadable', 'This layer does not allow downloads.');
      return;
    }
    const token = getToken();
    if (!token) { if (!(await ensureAuthOrPrompt())) return; }
    const effectiveToken = getToken();
    if (!effectiveToken) return; // user cancelled
    setDownloading(true);
    try {
      const resp = await fetch(`/api/layers/${layer.id}/download?format=${format}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${effectiveToken}`,
          'Accept': format === 'kml' ? 'application/vnd.google-earth.kml+xml' : 'application/json'
        }
      });
      if (resp.status === 401 || resp.status === 403) {
        setDownloading(false);
        await ensureAuthOrPrompt();
        return;
      }
      if (!resp.ok) throw new Error(`Server responded ${resp.status}`);
      const ct = resp.headers.get('content-type') || '';
      if (ct.includes('text/html')) {
        throw new Error('Unexpected HTML response (likely auth/session issue).');
      }
      const blob = await resp.blob();
      const ext = format === 'geojson' ? 'geojson' : (format === 'kml' ? 'kml' : 'dat');
      const nameBase = (layer.name || `layer-${layer.id}`).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g,'');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${nameBase || 'layer'}.${ext}`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      await alertSuccess('Download started');
    } catch (e) {
      console.error('[LayersTab] vector download failed', e);
      await alertError('Download failed', e?.message || 'Unknown error');
    } finally {
      setDownloading(false);
      closePopover();
    }
  };

  // PNG export logic removed.
  // Use a column flex layout so the scrollable list can stretch to fill the
  // entire lake-info panel. `minHeight: 0` on the scroller is required for
  // overflow to work correctly inside a flex container.
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg);} }`}</style>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <h3 style={{ marginTop: 0, marginBottom: 8 }}>Layers</h3>
        <button
          type="button"
          onClick={onResetToActive}
          className="btn btn-reset-default"
          style={{
            fontSize: 12,
            padding: "6px 10px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.35)",
            background: "rgba(255,255,255,0.15)",
            color: "#fff",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
          title="Reset to the default (active) public layer"
        >
          Reset to Default Layer
        </button>
      </div>

      {layers.length === 0 ? (
        <div className="insight-card">
          <p style={{ margin: 0 }}>
            <em>No layers available for this lake yet.</em>
          </p>
        </div>
      ) : (
        // Make the list area stretch and scroll to fill the parent panel
        <div style={{ flex: 1, overflowY: "auto", paddingRight: 4, minHeight: 0 }}>
          <div style={{ display: "grid", gap: 10 }}>
            {layers.map((layer) => {
              const isSelected = String(selectedLayerId) === String(layer.id);
              const isActive = String(activeLayerId) === String(layer.id);
              return (
                <div
                  key={layer.id}
                  className="insight-card"
                  style={{ display: "grid", gap: 6, position: "relative" }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="activeLayer"
                        checked={isSelected}
                        onChange={() => onChooseLayer?.(layer.id)}
                        style={{ transform: "scale(1.1)" }}
                      />
                      <span style={{ fontWeight: 700 }}>{fmtText(layer.name)}</span>
                    </label>
                    {isActive ? (
                      <span
                        style={{
                          fontSize: 12,
                          padding: "2px 8px",
                          borderRadius: 999,
                          background: "rgba(255,255,255,0.25)",
                          border: "1px solid rgba(255,255,255,0.4)",
                          color: "#fff",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Active
                      </span>
                    ) : null}
                  </div>

                  <div style={{ fontSize: 13, opacity: 0.9 }}>
                    <strong>Organization:</strong> {fmtText(getOrgName(layer))}
                  </div>

                  <div style={{ fontSize: 13, opacity: 0.9 }}>
                    <strong>Notes:</strong> {fmtText(layer.notes)}
                  </div>

                  <button
                    ref={downloadLayer?.id === layer.id ? downloadAnchorRef : undefined}
                    type="button"
                    className="pill-btn liquid"
                    title={layer.is_downloadable ? (authed ? 'Download layer' : 'Sign in to download') : 'Downloads disabled'}
                    aria-label={`Download layer ${layer.name || layer.id}`}
                    disabled={!layer.is_downloadable || downloading}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!layer.is_downloadable) { alertError('Not Downloadable','This layer does not allow downloads.'); return; }
                      if (!authed) { ensureAuthOrPrompt(); return; }
                      downloadAnchorRef.current = e.currentTarget;
                      setDownloadLayer(layer);
                    }}
                    style={{
                      position: "absolute",
                      right: 8,
                      bottom: 8,
                      width: 34,
                      height: 34,
                      padding: 6,
                      borderRadius: 999,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: (!layer.is_downloadable || downloading) ? 'not-allowed' : 'pointer',
                      opacity: layer.is_downloadable ? 1 : 0.5,
                    }}
                  >
                    {downloading && downloadLayer?.id === layer.id ? (
                      <FiDownload className="spin" style={{ width: 16, height: 16, opacity: 0.6 }} />
                    ) : (
                      <FiDownload style={{ width: 16, height: 16 }} />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Popover
        anchorRef={downloadAnchorRef}
        open={!!downloadLayer}
        onClose={closePopover}
        minWidth={200}
      >
        {!downloadLayer ? null : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 12, opacity: 0.85, padding: '2px 4px' }}>
              <strong>{downloadLayer.name || `Layer ${downloadLayer.id}`}</strong>
            </div>
            {/* Spinner removed */}
            <button
              type="button"
              className="pill-btn primary"
              disabled={downloading}
              onClick={() => doDownloadVector(downloadLayer, 'geojson')}
              style={{ display: 'flex', alignItems:'center', gap:6, justifyContent:'center' }}
            >
              <FiFileText /> GeoJSON
            </button>
            <button
              type="button"
              className="pill-btn primary"
              disabled={downloading}
              onClick={() => doDownloadVector(downloadLayer, 'kml')}
              style={{ display: 'flex', alignItems:'center', gap:6, justifyContent:'center' }}
            >
              <FiGlobe /> KML
            </button>
            <button
              type="button"
              className="pill-btn ghost"
              onClick={closePopover}
              disabled={downloading}
            >
              Close
            </button>
          </div>
        )}
      </Popover>
    </div>
  );
}

export default LayersTab;
