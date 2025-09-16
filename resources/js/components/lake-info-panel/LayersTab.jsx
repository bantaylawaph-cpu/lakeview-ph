import React from "react";

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
}) {
  return (
    <>
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

      <p style={{ marginTop: 0, marginBottom: 8, fontSize: 12, opacity: 0.75 }}>
        Showing <strong>public</strong> layers only.
      </p>

      {layers.length === 0 ? (
        <div className="insight-card">
          <p style={{ margin: 0 }}>
            <em>No layers available for this lake yet.</em>
          </p>
        </div>
      ) : (
        <div style={{ maxHeight: 280, overflowY: "auto", paddingRight: 4 }}>
          <div style={{ display: "grid", gap: 10 }}>
            {layers.map((layer) => {
              const isSelected = String(selectedLayerId) === String(layer.id);
              const isActive = String(activeLayerId) === String(layer.id);
              return (
                <div key={layer.id} className="insight-card" style={{ display: "grid", gap: 6 }}>
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
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p style={{ fontSize: 12, opacity: 0.75, marginTop: 8 }}>
        Selecting a layer here only changes the current view. Saving or publishing an “active” layer will be added later.
      </p>
    </>
  );
}

export default LayersTab;
