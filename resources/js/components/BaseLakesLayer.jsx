import React from 'react';
import { GeoJSON } from 'react-leaflet';
import L from 'leaflet';

// Base layer GeoJSON for public lakes.
export default function BaseLakesLayer({ data, hidePredicate, onFeatureClick }) {
  if (!data) return null;
  const pointToLayer = (feature, latlng) => {
    // Only called for Point geometries; create a styled circle marker
    return L.circleMarker(latlng, {
      radius: 6,
      color: '#2563eb',
      weight: 2,
      opacity: 0.9,
      fillColor: '#3b82f6',
      fillOpacity: 0.65,
      className: 'lake-fallback-marker'
    });
  };
  return (
    <GeoJSON
      data={data}
      filter={(feat) => !hidePredicate?.(feat)}
      style={(feat) => feat.geometry?.type === 'Point' ? undefined : { color: '#3388ff', weight: 2, fillOpacity: 0.12 }}
      pointToLayer={pointToLayer}
      onEachFeature={(feat, layer) => {
        const name = (feat?.properties?.name) || (feat?.properties?.lake_name) || 'Lake';
        try { layer.bindTooltip(name, { sticky: true, direction: 'top' }); } catch (e) {}
        layer.on('click', () => onFeatureClick && onFeatureClick(feat, layer));
        if (feat.geometry?.type !== 'Point') {
          layer.on('mouseover', () => layer.setStyle({ weight: 3 }));
          layer.on('mouseout', () => layer.setStyle({ weight: 2 }));
        } else {
          layer.on('mouseover', () => layer.setStyle({ radius: 7 }));
          layer.on('mouseout', () => layer.setStyle({ radius: 6 }));
        }
      }}
    />
  );
}
