import React, { useRef, useState, useEffect } from "react";

export default function FileDropzone({ accept = ".geojson,.json,.kml,.zip,.gpkg", onFile, dropText = "Drop a spatial file here or click to select", acceptedText = "Accepted: .geojson, .json, .kml, .zip (zipped Shapefile with .shp/.dbf/.prj; Polygon/MultiPolygon geometries), .gpkg (GeoPackage)", selectedFile: propSelectedFile }) {
  const inputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(propSelectedFile);

  useEffect(() => {
    setSelectedFile(propSelectedFile);
  }, [propSelectedFile]);

  const onDrop = (e) => {
    e.preventDefault();
    const files = [...(e.dataTransfer?.files || [])];
    if (!files.length) return;
    const f = files[0];
    setSelectedFile(f);
    if (onFile) onFile(f);
  };

  const onSelect = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setSelectedFile(f);
      if (onFile) onFile(f);
    }
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
