import React from "react";

export default function MetadataForm({ name, category, notes, onChange }) {
  const set = (patch) => onChange?.(patch);
  return (
    <div className="org-form">
      <div className="form-group">
        <label>Layer Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => set({ name: e.target.value })}
          placeholder="e.g., Official shoreline 2024"
        />
      </div>

      <div className="form-group">
        <label>Category</label>
        <select
          value={category}
          onChange={(e) => set({ category: e.target.value })}
        >
          <option value="" disabled>Select category…</option>
          <option value="Profile">Profile</option>
          <option value="Boundary">Boundary</option>
        </select>
      </div>

      <div className="form-group" style={{ flexBasis: "100%" }}>
        <label>Notes</label>
        <input
          type="text"
          value={notes}
          onChange={(e) => set({ notes: e.target.value })}
          placeholder="Short description / source credits"
        />
      </div>
    </div>
  );
}
