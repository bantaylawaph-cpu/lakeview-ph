import React, { useEffect, useState, useRef } from 'react';

// Legend / explanation panel for the population heatmap layer
export default function HeatmapLegend({  }) {
  const [style, setStyle] = useState(null);
  const elRef = useRef(null);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    let ro = null;
    let pollTimer = null;
    let mounted = true;

    const update = () => {
      const coord = document.querySelector('.coordinates-scale');
      if (!coord || !mounted) return setStyle(null);
      // Use bounding boxes to compute exact width/position
      const rect = coord.getBoundingClientRect();
      const cs = window.getComputedStyle(coord);
      // bottom computed style (e.g. '20px')
      const bottomPx = parseFloat(cs.bottom || '20') || 20;
      // element height/width
      const height = Math.round(rect.height);
      const width = Math.round(rect.width);

      // Check for any visible attribution / controls that might overlap on the left
      const attrib = document.querySelector('[class*="attribution"], .leaflet-control-attribution, .mapboxgl-ctrl-attrib');
      let extraOffset = 0;
      if (attrib) {
        const aRect = attrib.getBoundingClientRect();
        // If attribution sits near the bottom-left area and could overlap the stacked boxes,
        // add extra offset equal to its height + small padding.
        const overlapHoriz = (aRect.left < rect.right && aRect.right > rect.left);
        if (overlapHoriz && aRect.bottom > (window.innerHeight - 80)) {
          extraOffset = Math.round(aRect.height + 8);
        }
      }

      const margin = 8;
      // bottom position should be (coord bottom offset from viewport) + coord height + margin + extraOffset
      // We compute in px relative to viewport bottom, but CSS absolute uses bottom from parent -- keep numeric px which should match.
      const computedBottom = bottomPx + height + margin + extraOffset;

      // left offset should match the coord's computed left value
      // Use pixel value for exact alignment (rect.left is viewport-based).
      const leftPx = `${Math.round(rect.left)}px`;

      // On small mobile screens we no longer force matching widths. Allow the legend
      // to size naturally but constrain it with a max-width to avoid overlapping
      // map controls/attribution. On larger screens keep exact matching width.
      const isMobile = window.innerWidth <= 639;
      const s = { bottom: `${computedBottom}px`, left: leftPx };
      if (!isMobile) {
        s.width = `${width}px`;
      } else {
        s.maxWidth = '70vw';
      }

      setStyle(s);
    };

    // Initial update
    update();
    // Observe size changes on the coordinates element so width can track when the scale updates
    const setupObserver = () => {
      const target = document.querySelector('.coordinates-scale');
      if (!target) return;
      try {
        ro = new ResizeObserver(() => update());
        ro.observe(target);
      } catch {
        // ResizeObserver may not be supported in some envs — fall back to polling
        pollTimer = setInterval(update, 500);
      }
    };

    setupObserver();
    window.addEventListener('resize', update);

    return () => {
      mounted = false;
      window.removeEventListener('resize', update);
      try { if (ro) ro.disconnect(); } catch {}
      try { if (pollTimer) clearInterval(pollTimer); } catch {}
    };
  }, []);

  return (
    <div ref={elRef} className="heatmap-legend" style={style}>
      <div className="legend-title">Population Density</div>
      {/* Bar with left/right labels to match expectation: low → high */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 2px' }}>
          <span style={{ opacity: 0.85 }}>low</span>
          <span style={{ opacity: 0.85 }}>high</span>
        </div>
        <div style={{
          position: 'relative',
          height: 10,
          borderRadius: 5,
          overflow: 'hidden',
          background: 'linear-gradient(90deg, #2563eb, #10b981, #fbbf24, #ef4444)'
        }}>
          {/* Add a subtle inner outline to improve contrast over any basemap */}
          <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.25)' }} />
        </div>
      </div>
      <div className="legend-desc" style={{ marginTop: 6, lineHeight: 1.3, opacity: 0.85 }}>
        Relative density (not exact counts). Brighter colors indicate more people compared with nearby areas.
      </div>
    </div>
  );
}
