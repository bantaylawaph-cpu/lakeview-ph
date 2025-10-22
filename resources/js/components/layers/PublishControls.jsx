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
          <select
            value={isActive ? 'default' : 'not_default'}
            onChange={(e) => { if ((e.target.value === 'default') !== isActive) onToggleActive?.(); }}
          >
            <option value="not_default">Not Default</option>
            <option value="default">Default</option>
          </select>
        </div>
      )}

      <div className="form-group">
        <label>Downloadable</label>
        <select
          value={isDownloadable ? 'downloadable' : 'not_downloadable'}
          onChange={(e) => { if ((e.target.value === 'downloadable') !== isDownloadable) onToggleDownloadable?.(); }}
        >
          <option value="not_downloadable">Not Downloadable</option>
          <option value="downloadable">Downloadable</option>
        </select>
      </div>
    </div>
  );
}
