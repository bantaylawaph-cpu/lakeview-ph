import React, { useCallback, useEffect, useRef, useState } from "react";
import { FiDownload, FiFileText, FiGlobe } from "react-icons/fi";
import { alertError, alertSuccess, promptDownloadFormat } from "../../lib/alerts";
import { getToken } from "../../lib/api";
import LoadingSpinner from "../LoadingSpinner";
import { fetchPublicLayers } from "../../lib/layers";


const fmtText = (v) => (v && String(v).trim() ? String(v).trim() : "–");

/**
 * Props
 * - layers: array of public layers
 * - activeLayerId: id of the selected lake layer
 * - selectedLayerId: id currently selected in UI
 * - onChooseLayer: (id) => void
 * - onResetToActive: () => void
 */
function LayersTab({
  lake = null,
  layers = [],
  activeLayerId = null,
  selectedLayerId = null,
  onChooseLayer,
  onResetToActive,
  isAuthenticated = false, // external hint (e.g. from higher-level auth context)
}) {
  const [downloading, setDownloading] = useState(false);
  const [downloadingLayerId, setDownloadingLayerId] = useState(null);
  const [authed, setAuthed] = useState(!!isAuthenticated);
  const [initialLoading, setInitialLoading] = useState(true);
  const initialLoadedRef = useRef(false);
  // auth state derived from parent
  const [watershedLayers, setWatershedLayers] = useState([]);
  const [wsLoading, setWsLoading] = useState(false);

  const closePopover = () => {};

  // If parent doesn't pass isAuthenticated, attempt a lazy one-time probe when needed.
  const ensureAuthOrPrompt = useCallback(async () => {
    if (authed) return true;
    await alertError('Sign in required', 'You must be a registered user to download layers.');
    return false;
  }, [authed]);

  // Keep internal authed in sync if prop switches to true later.
  useEffect(() => { if (isAuthenticated && !authed) setAuthed(true); }, [isAuthenticated, authed]);

  // Consider the tab loaded once we've received the initial layers prop (including empty)
  useEffect(() => {
    if (!initialLoadedRef.current) {
      initialLoadedRef.current = true;
      setInitialLoading(false);
    }
  }, [layers]);

  // Fetch watershed layers connected to this lake (if any)
  useEffect(() => {
    const wsId = lake?.watershed_id ?? lake?.watershedId ?? null;
    if (!wsId) { setWatershedLayers([]); return; }
    let aborted = false;
    (async () => {
      setWsLoading(true);
      try {
        const rows = await fetchPublicLayers({ bodyType: 'watershed', bodyId: wsId });
        if (!aborted) setWatershedLayers(Array.isArray(rows) ? rows : []);
      } catch (_) {
        if (!aborted) setWatershedLayers([]);
      } finally {
        if (!aborted) setWsLoading(false);
      }
    })();
    return () => { aborted = true; };
  }, [lake?.watershed_id]);

  // PNG export intentionally omitted (use screenshot feature)

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
  setDownloadingLayerId(layer.id);
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
      setDownloadingLayerId(null);
      closePopover();
    }
  };

  // Use a column flex layout so the scrollable list can stretch to fill the
  // entire lake-info panel. `minHeight: 0` on the scroller is required for
  // overflow to work correctly inside a flex container.
  if (initialLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <LoadingSpinner label={"Loading layers…"} color="#fff" />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg);} }`}</style>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <h3 style={{ marginTop: 0, marginBottom: 8, fontWeight: 'bold' }}>Layers</h3>
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
            {/* Lake Layers Section */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <h4 style={{ margin: 0, fontWeight: 'bold' }}>Lake layer</h4>
            </div>
            {layers.map((layer) => {
              const isSelected = String(selectedLayerId) === String(layer.id);
              const isActive = String(activeLayerId) === String(layer.id);
              return (
                <div
                  key={layer.id}
                  className="insight-card"
                  style={{ display: "flex", flexDirection: "column", gap: 6 }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
<span style={{ fontWeight: 700 }}>{fmtText(layer.name)}</span>
                    {/* With one-layer-per-body, the selected layer is implicitly the lake layer */}
                  </div>

                  <div style={{ fontSize: 13, opacity: 0.9 }}>
                    <strong>Notes:</strong> {fmtText(layer.notes)}
                  </div>

                  <button
                    
                    type="button"
                    className="pill-btn liquid"
                    title={layer.is_downloadable ? (authed ? 'Download layer' : 'Sign in to download') : 'Downloads disabled'}
                    aria-label={`Download layer ${layer.name || layer.id}`}
                    disabled={!layer.is_downloadable || downloading}
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!layer.is_downloadable) { await alertError('Not Downloadable','This layer does not allow downloads.'); return; }
                      if (!authed) { const ok = await ensureAuthOrPrompt(); if (!ok) return; }
                      const choice = await promptDownloadFormat({ title: 'Download Lake Layer', text: 'Choose a format to download this layer.' });
                      if (!choice) return;
                      await doDownloadVector(layer, choice);
                    }}
                    style={{
                      alignSelf: "flex-end",
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
                    {downloading && downloadingLayerId === layer.id ? (
                      <FiDownload className="spin" style={{ width: 16, height: 16, opacity: 0.6 }} />
                    ) : (
                      <FiDownload style={{ width: 16, height: 16 }} />
                    )}
                  </button>
                </div>
              );
            })}

            {/* Watershed Layers Section */}
            {wsLoading ? (
              <div className="insight-card">
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <LoadingSpinner label={"Loading watershed layers…"} color="#fff" />
                </div>
              </div>
            ) : null}
            {(!wsLoading && watershedLayers && watershedLayers.length > 0) ? (
              <>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop: 6 }}>
                  <h4 style={{ margin: 0, fontWeight: 'bold' }}>Watershed layer</h4>
                </div>
                {watershedLayers.map((layer) => {
                  const isSelected = String(selectedLayerId) === String(layer.id);
                  return (
                    <div
                      key={`ws-${layer.id}`}
                      className="insight-card"
                      style={{ display: "flex", flexDirection: "column", gap: 6 }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                        <span style={{ fontWeight: 700 }}>{fmtText(layer.name)}</span>
                        {/* No default badge: one-layer-per-body */}
                      </div>

                      <div style={{ fontSize: 13, opacity: 0.9 }}>
                        <strong>Notes:</strong> {fmtText(layer.notes)}
                      </div>

                      <button
                        type="button"
                        className="pill-btn liquid"
                        title={layer.is_downloadable ? (authed ? 'Download layer' : 'Sign in to download') : 'Downloads disabled'}
                        aria-label={`Download watershed layer ${layer.name || layer.id}`}
                        disabled={!layer.is_downloadable || downloading}
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!layer.is_downloadable) { await alertError('Not Downloadable','This layer does not allow downloads.'); return; }
                          if (!authed) { const ok = await ensureAuthOrPrompt(); if (!ok) return; }
                          const choice = await promptDownloadFormat({ title: 'Download Watershed Layer', text: 'Choose a format to download this layer.' });
                          if (!choice) return;
                          await doDownloadVector(layer, choice);
                        }}
                        style={{
                          alignSelf: "flex-end",
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
                        {downloading && downloadingLayerId === layer.id ? (
                          <FiDownload className="spin" style={{ width: 16, height: 16, opacity: 0.6 }} />
                        ) : (
                          <FiDownload style={{ width: 16, height: 16 }} />
                        )}
                      </button>
                    </div>
                  );
                })}
              </>
            ) : null}
          </div>
        </div>
      )}

    </div>
  );
}

export default LayersTab;
