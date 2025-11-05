import React, { useRef, useState, useEffect } from "react";
import { alertError } from '../../lib/alerts';

export default function FileDropzone({ accept = ".geojson,.json,.kml,.zip,.gpkg", onFile, dropText = "Drop a spatial file here or click to select", acceptedText = "Accepted: .geojson, .json, .kml, .zip (zipped Shapefile with .shp/.dbf/.prj; Polygon/MultiPolygon geometries), .gpkg (GeoPackage)", selectedFile: propSelectedFile }) {
  const inputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(propSelectedFile);

  useEffect(() => {
    setSelectedFile(propSelectedFile);
  }, [propSelectedFile]);

  const onDrop = async (e) => {
    e.preventDefault();
    const files = [...(e.dataTransfer?.files || [])];
    if (!files.length) return;
    const f = files[0];
    // Validate against accept list before updating UI/state
    if (!isAccepted(f)) {
      alertError('Invalid file', `File "${f.name}" is not an accepted type. ${acceptedText}`);
      return;
    }
    // Allow parent to further validate; if it returns false, don't set selected file
    if (onFile) {
      try {
        const res = await onFile(f);
        if (res === false) return;
      } catch (e) {
        // If parent throws, assume invalid and don't update UI
        return;
      }
    }
    setSelectedFile(f);
  };

  const onSelect = async (e) => {
    const f = e.target.files?.[0];
    if (f) {
      if (!isAccepted(f)) {
        alertError('Invalid file', `File "${f.name}" is not an accepted type. ${acceptedText}`);
        // reset the input so the invalid file isn't retained by the file picker
        e.target.value = '';
        return;
      }
      if (onFile) {
        try {
          const res = await onFile(f);
          if (res === false) { e.target.value = ''; return; }
        } catch (e2) {
          e.target.value = '';
          return;
        }
      }
      setSelectedFile(f);
    }
  };

  // Helper: check file against `accept` prop (handles extensions like .tif and mime types)
  const isAccepted = (file) => {
    if (!file) return false;
    const tokens = (accept || '').split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
    if (!tokens.length) return true; // no restriction
    const name = (file.name || '').toLowerCase();
    const type = (file.type || '').toLowerCase();

    // If any token is an extension (.ext) match by filename
    for (const tok of tokens) {
      if (tok.startsWith('.')) {
        if (name.endsWith(tok)) return true;
        continue;
      }
      // If token looks like a MIME type, check file.type
      if (tok.includes('/')) {
        if (type === tok || type.startsWith(tok.split('/')[0] + '/')) return true;
      }
      // fallback: direct comparison
      if (type === tok) return true;
    }
    return false;
  };

  return (
    <div
      className="dropzone"
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
    >
      {selectedFile ? (
        <p>Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</p>
      ) : (
        <p>{dropText}</p>
      )}
      <small>{acceptedText}</small>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: "none" }}
        onChange={onSelect}
      />
    </div>
  );
}
