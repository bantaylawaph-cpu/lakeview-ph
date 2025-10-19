import React from "react";
import { FiAlertTriangle } from "react-icons/fi";

export default function CRSSelector({ srid, onChange }) {
  return (
    <div className="org-form" style={{ marginTop: 10 }}>
      <div className="form-group">
        <label>Detected/Source SRID</label>
        <input
          type="number"
          value={srid}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder="e.g., 4326 or 32651"
        />
      </div>
      <div className="alert-note">
        <FiAlertTriangle /> If the file declares a CRS e.g., EPSG::32651 or CRS84, it’s auto-detected. Adjust only if detection was wrong.
      </div>
    </div>
  );
}
