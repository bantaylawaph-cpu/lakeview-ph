// resources/js/components/WorldCoverLegend.jsx
import React from "react";
import { useMap } from "react-leaflet";

export default function WorldCoverLegend() {
  const map = useMap();
  const [legendWidth, setLegendWidth] = React.useState(360);
  const [ui, setUi] = React.useState({ fontSize: 12, padding: '4px 6px', gap: 4, swatch: { w: 12, h: 9 }, bottom: 54, right: 16 });
  const [offset, setOffset] = React.useState({ right: 16 });
  const [dock, setDock] = React.useState({ useLeft: false, left: 0, bottom: null, height: null });
  const [maxRowWidth, setMaxRowWidth] = React.useState(null);

  React.useEffect(() => {
    const measure = () => {
      try {
        // Prefer Leaflet attribution control container if available
        const el = map?.attributionControl?._container || document.querySelector('.leaflet-control-attribution');
        const vw = window.innerWidth || 1024;
        const w = el ? el.offsetWidth : Math.min(520, Math.max(280, Math.floor(vw * 0.35)));
        // Clamp to sensible range
        const clamped = Math.max(280, Math.min(w, 720));
        setLegendWidth(clamped);

        // Responsive UI breakpoints
        let fontSize = 13;
        let padding = '8px 10px';
        let gap = 8;
        let sw = { w: 14, h: 10 };
        let bottom = 54;
        let right = 12;
        if (vw >= 480) { fontSize = 14; padding = '6px 8px'; gap = 4; sw = { w: 12, h: 9 }; right = 12; }
        if (vw >= 768) { fontSize = 14; padding = '6px 8px'; gap = 4; sw = { w: 12, h: 9 }; right = 12; }
        if (vw >= 1024) { fontSize = 14; padding = '6px 8px'; gap = 5; sw = { w: 13, h: 9 }; right = 14; }
        if (vw >= 1440) { fontSize = 14; padding = '6px 8px'; gap = 5; sw = { w: 13, h: 9 }; right = 14; }
        if (vw >= 2560) { fontSize = 14; padding = '6px 8px'; gap = 6; sw = { w: 14, h: 10 }; right = 16; }
        setUi({ fontSize, padding, gap, swatch: sw, bottom, right });

        // Avoid overlapping floating map controls on the right side
        const controls = document.querySelector('.map-controls');
        if (controls) {
          const rect = controls.getBoundingClientRect();
          const approxRow = Math.max(sw.h, 14) + 6; // swatch height + padding per row
          const approxLegendHeight = (items.length * approxRow) + 16 /* padding */;
          const legendTop = (window.innerHeight || 0) - (bottom + approxLegendHeight);
          const legendBottom = (window.innerHeight || 0) - bottom;
          const legendRight = right;
          const legendLeft = (window.innerWidth || 0) - (legendRight + clamped);
          const overlapsVertically = !(rect.bottom < legendTop || rect.top > legendBottom);
          const overlapsHorizontally = !(rect.right < legendLeft || rect.left > (window.innerWidth || 0));
          if (overlapsVertically && overlapsHorizontally) {
            // Push legend inward by controls width + margin
            const push = (rect.width || 64) + 24;
            setOffset({ right: right + push });
          } else {
            setOffset({ right });
          }
        } else {
          setOffset({ right });
        }

        // Mobile/Tablet: attach center-left, ultra-compact single column
        if (vw < 1024) {
          const h = window.innerHeight || 0;
          const controls = document.querySelector('.map-controls');
          const controlsRect = controls ? controls.getBoundingClientRect() : null;
          // Match the vertical center of map controls; default to center if not found
          let centerY = controlsRect ? (controlsRect.top + controlsRect.bottom) / 2 : (h / 2);
          // Keep the legend within the visible window by clamping to available top/bottom space
          const cardHeight = Math.min(Math.floor(h * 0.45), 320); // slightly larger
          let top = Math.max(12, Math.round(centerY - (cardHeight / 2)));
          // Ensure minimum distance from top and bottom
          top = Math.min(top, Math.max(12, h - cardHeight - 12));
          // Convert top into bottom offset for absolute positioning
          const bottomOffset = Math.max(12, h - (top + cardHeight));
          // We prefer to anchor legend to left when space allows
          setDock({ useLeft: true, left: 12, bottom: bottomOffset, height: cardHeight });
          setMaxRowWidth(240);
          // tighten UI for compact column
          setUi(prev => ({
            ...prev,
            gap: 6,
            swatch: { w: 16, h: 12 },
          }));
        } else {
          // Desktop: Dock beside Coordinates Scale, matching its height when available
          const coords = document.querySelector('.coordinates-scale');
          if (coords) {
            const cr = coords.getBoundingClientRect();
            const bottomDock = Math.max(8, (window.innerHeight || 0) - cr.bottom); // align bottoms but avoid zeros
            const leftDock = cr.right + 8; // sit to the right of scale
            const heightDock = cr.height;  // match height of the scale component
            setDock({ useLeft: true, left: leftDock, bottom: bottomDock, height: heightDock });
            // Limit legend width to avoid overlapping the centered screenshot button
            const shot = document.querySelector('.screenshot-btn');
            if (shot) {
              const sr = shot.getBoundingClientRect();
              const available = Math.max(120, Math.floor(sr.left - leftDock - 16));
              setMaxRowWidth(available);
            } else {
              setMaxRowWidth(null);
            }
          } else {
            setDock({ useLeft: false, left: 0, bottom: null, height: null });
            setMaxRowWidth(null);
          }
        }
      } catch {}
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [map]);

  // ESA WorldCover 2021 legend (ordered rows)
  const items = [
    { label: 'Tree Cover', color: '#166400' },
    { label: 'Shrubland', color: '#fabb22' },
    { label: 'Grassland', color: '#fefe4c' },
    { label: 'Cropland', color: '#f197ff' },
    { label: 'Built-up', color: '#f60101' },
    { label: 'Bare/Sparse Vegetation', color: '#b5b5b4' },
    { label: 'Permanent Water Bodies', color: '#2065c9' },
    { label: 'Herbaceous Wetland', color: '#2a96a0' },
    { label: 'Mangroves', color: '#39ce74' },
    { label: 'Moss/Lichen', color: '#fbe6a1' },
  ];

  // Calculate available width and set container height to scale height when docked
  const availableWidth = dock.useLeft && maxRowWidth != null ? Math.min(maxRowWidth, 720) : Math.min(legendWidth, 300);

  const boxStyle = {
    position: 'absolute',
    // prefer top positioning when we set a `bottom` to ensure stable layout (avoid empty gap)
    top: dock.useLeft && dock.bottom != null ? undefined : undefined,
    bottom: dock.useLeft && dock.bottom != null ? dock.bottom : ui.bottom,
    right: dock.useLeft ? 'auto' : offset.right,
    left: dock.useLeft ? dock.left : 'auto',
    background: 'rgba(255,255,255,0.88)',
    border: '1px solid rgba(229,231,235,0.9)',
    borderRadius: 4,
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    padding: ui.padding,
    width: availableWidth,
    // Let content determine height, but constrain it if we suggested a dock height
    height: dock.useLeft && dock.height != null && dock.height > 0 ? 'auto' : 'auto',
    maxHeight: dock.useLeft && dock.height != null ? dock.height : 'none',
    overflow: 'auto',
    fontSize: ui.fontSize,
    color: '#374151',
    zIndex: 500,
    pointerEvents: 'auto',
  };

  const rowStyle = { display: 'flex', alignItems: 'center', gap: Math.max(2, ui.gap - 3), marginBottom: 2 };
  const swatchStyle = (c, b) => ({ width: ui.swatch.w, height: ui.swatch.h, background: c, border: b ? `1px solid ${b}` : '1px solid transparent', borderRadius: 0, display: 'inline-block' });

  // Desktop: fixed 5-column, 2-row grid; Mobile/Tablet: single column
  const isMobileTablet = (window.innerWidth || 0) < 1024;
  if (isMobileTablet) {
    return (
      <div style={{ ...boxStyle, padding: '6px 8px', width: 'auto', maxWidth: Math.min(availableWidth, 260), maxHeight: 'none' }} className="worldcover-legend" aria-label="ESA WorldCover Legend">
        <div style={{ display: 'flex', flexDirection: 'column', gap: Math.max(3, ui.gap - 2) }}>
          {items.map((it) => (
            <div key={it.label} style={{ display: 'flex', alignItems: 'center', gap: Math.max(6, ui.gap) }}>
              <span style={swatchStyle(it.color, it.border)} />
              <span style={{ color: '#6b7280', fontSize: Math.max(10, ui.fontSize - 2), lineHeight: '18px', display: 'inline-block' }}>{it.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const row1 = items.slice(0, 5);
  const row2 = items.slice(5, 10);
  const colGap = Math.max(2, ui.gap - 1);
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    columnGap: colGap,
    rowGap: Math.max(2, ui.gap - 1),
    alignItems: 'start',
    height: '100%',
  };
  const cellStyle = { display: 'flex', flexDirection: 'column', alignItems: 'center' };
  const labelStyle = { color: '#6b7280', marginTop: 1, textAlign: 'center', lineHeight: 1.1, fontSize: Math.max(10, ui.fontSize - 2), marginBottom: 0 };

  return (
    <div style={boxStyle} className="worldcover-legend" aria-label="ESA WorldCover Legend">
      <div style={{ display: 'flex', flexDirection: 'column', gap: Math.max(2, ui.gap - 1), height: '100%' }}>
        <div style={gridStyle}>
          {row1.map((it) => (
            <div key={`r1-${it.label}`} style={cellStyle}>
              <span style={swatchStyle(it.color, it.border)} />
              <span style={labelStyle}>{it.label}</span>
            </div>
          ))}
        </div>
        <div style={gridStyle}>
          {row2.map((it) => (
            <div key={`r2-${it.label}`} style={cellStyle}>
              <span style={swatchStyle(it.color, it.border)} />
              <span style={labelStyle}>{it.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
