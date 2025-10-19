import React, { useRef } from "react";

export default function FileDropzone({ accept = ".geojson,.json,.kml,.zip,.gpkg", onFile }) {
  const inputRef = useRef(null);

  const onDrop = (e) => {
    e.preventDefault();
    const files = [...(e.dataTransfer?.files || [])];
    if (!files.length) return;
    const f = files[0];
    if (onFile) onFile(f);
  };

  const onSelect = (e) => {
    const f = e.target.files?.[0];
    if (f && onFile) onFile(f);
  };

  return (
    <div
      className="dropzone"
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
    >
      <p>Drop a spatial file here or click to select</p>
      <small>Accepted: .geojson, .json, .kml, .zip (zipped Shapefile with .shp/.dbf/.prj; Polygon/MultiPolygon geometries), .gpkg (GeoPackage)</small>
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
