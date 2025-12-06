import React from "react";

export default function BodySelector({ allowedBodyTypes, bodyType, onBodyTypeChange, bodyId, onBodyIdChange, lakeOptions = [], watershedOptions = [] }) {
  return (
    <div className="org-form">
      {allowedBodyTypes.length > 1 && (
        <div className="form-group">
          <label>Body Type</label>
          <select
            value={bodyType}
            onChange={(e) => onBodyTypeChange?.(e.target.value)}
          >
            {allowedBodyTypes.includes("lake") && (<option value="lake">Lake</option>)}
            {allowedBodyTypes.includes("watershed") && (<option value="watershed">Watershed</option>)}
          </select>
        </div>
      )}

      {bodyType === "lake" ? (
        <div className="form-group" style={{ minWidth: 260 }}>
          <label>Select Lake</label>
          <select
            value={bodyId}
            onChange={(e) => onBodyIdChange?.(e.target.value)}
            required
          >
            <option value="" disabled>Choose a lake</option>
            {lakeOptions.map((o) => (
              <option key={`lake-${o.id}`} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>
      ) : (
        <div className="form-group" style={{ minWidth: 260 }}>
          <label>Select Watershed</label>
          <select
            value={bodyId}
            onChange={(e) => onBodyIdChange?.(e.target.value)}
            required
          >
            <option value="" disabled>Choose a watershed</option>
            {watershedOptions.map((o) => (
              <option key={`ws-${o.id}`} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
