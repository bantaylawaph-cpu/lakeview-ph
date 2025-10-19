import React from "react";

export default function PublishControls({ visibilityOptions, value, onChange, allowSetActive, isActive, onToggleActive, isDownloadable, onToggleDownloadable }) {
  return (
    <div className="org-form">
      <div className="form-group">
        <label>Visibility</label>
        <select
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
        >
          {visibilityOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {allowSetActive && (
        <div className="form-group">
          <label>Default Layer</label>
          <div>
            <button
              type="button"
              className={`pill-btn ${isActive ? 'primary' : 'ghost'}`}
              onClick={onToggleActive}
              title="Toggle default layer"
            >
              {isActive ? 'Default Enabled' : 'Set as Default'}
            </button>
          </div>
        </div>
      )}

      <div className="form-group">
        <label>Downloadable</label>
        <div>
          <button
            type="button"
            className={`pill-btn ${isDownloadable ? 'primary' : 'ghost'}`}
            onClick={onToggleDownloadable}
            title="Toggle whether this layer can be downloaded"
          >
            {isDownloadable ? 'Download Enabled' : 'Allow Download'}
          </button>
        </div>
      </div>
    </div>
  );
}
