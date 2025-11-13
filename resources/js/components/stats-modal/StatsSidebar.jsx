import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiChevronUp, FiChevronDown, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

/**
 * StatsSidebar: Control sidebar for stats modal content.
 * Can render inline (default) or as a fixed, page-level sidebar via portal.
 * In portal mode, when closed, the header remains visible at the bottom of the viewport and animates upwards when opened.
 *
 * Props:
 * - isOpen: boolean – controls visibility
 * - width: number – sidebar width in pixels
 * - className: string – extra class names
 * - usePortal: boolean – when true, renders as fixed sidebar attached to document.body (outside modal)
 * - side: 'left' | 'right' – which side of the viewport to stick to in portal mode
 * - top: number – offset from top (in pixels) in portal mode when open
 * - zIndex: number – layer order in portal mode
 * - onToggle: function – callback to toggle the sidebar open/close
 */
export default function StatsSidebar({
  isOpen = true,
  width = 320,
  children,
  className = '',
  usePortal = false,
  side = 'left',
  top = 0,
  zIndex = 3000,
  onToggle = () => {},
}) {
  // Desktop-only left slide per requirements; fallback to bottom header on small screens
  const [isDesktop, setIsDesktop] = useState(true);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(min-width: 768px)');
    const set = () => setIsDesktop(!!mq.matches);
    set();
    try { mq.addEventListener ? mq.addEventListener('change', set) : mq.addListener(set); } catch {}
    return () => { try { mq.removeEventListener ? mq.removeEventListener('change', set) : mq.removeListener(set); } catch {} };
  }, []);

  const tabWidth = 40; // protruding tab
  const tabHeight = 72;

  const containerStyle = useMemo(() => {
    const base = {
      overflow: 'hidden',
      transition: 'width 260ms ease, opacity 200ms ease, transform 260ms ease, padding 200ms ease, border 200ms ease, top 260ms ease, height 260ms ease',
      opacity: isOpen ? 1 : 0,
      // Match Lake Info panel background color
      background: 'rgba(30, 60, 120, 0.65)',
      backdropFilter: 'blur(12px) saturate(180%)',
      WebkitBackdropFilter: 'blur(12px) saturate(180%)',
      border: isOpen ? '1px solid rgba(255,255,255,0.25)' : 'none',
      borderRadius: 8,
      padding: isOpen ? 12 : 0,
      pointerEvents: isOpen ? 'auto' : 'none',
      width: isOpen ? width : 0,
      color: '#fff',
      boxSizing: 'border-box',
    };
    if (!usePortal) {
      return {
        ...base,
        flex: isOpen ? '0 0 auto' : '0 0 0px',
        transform: isOpen ? 'translateX(0)' : 'translateX(-8px)',
      };
    }
    // Portal mode: fixed sidebar on page
    const isLeft = side !== 'right';
    if (isDesktop) {
      // Desktop: left/right slide with protruding tab; map remains full size (overlay)
      return {
        ...base,
        position: 'fixed',
        top,
        [isLeft ? 'left' : 'right']: 0,
        height: `calc(100vh - ${top}px)`,
        transform: isOpen
          ? 'translateX(0)'
          : `translateX(${isLeft ? -(width - tabWidth) : (width - tabWidth)}px)`,
        zIndex,
        display: 'flex',
        flexDirection: 'column',
        width: width,
        opacity: 1,
        pointerEvents: 'auto',
        padding: 8,
        border: '1px solid rgba(255,255,255,0.25)',
      };
    }
    // Mobile/tablet fallback: previous bottom header behavior
    return {
      ...base,
      position: 'fixed',
      top: isOpen ? top : `calc(100vh - 40px)`,
      [isLeft ? 'left' : 'right']: 0,
      height: isOpen ? `calc(100vh - ${top}px)` : '40px',
      transform: isOpen
        ? 'translateX(0)'
        : `translateX(${isLeft ? '-8px' : '8px'})`,
      zIndex,
      display: 'flex',
      flexDirection: 'column',
      width: width,
      opacity: 1,
      pointerEvents: 'auto',
      padding: 8,
      border: '1px solid rgba(255,255,255,0.25)',
    };
  }, [isOpen, width, usePortal, side, top, zIndex]);

  const tabStyle = useMemo(() => ({
    position: 'absolute',
    top: '50%',
    right: -tabWidth + 2,
    transform: 'translateY(-50%)',
    width: tabWidth,
    height: tabHeight,
    borderRadius: isDesktop ? '0 8px 8px 0' : 8,
    background: 'rgba(30, 60, 120, 0.75)',
    border: '1px solid rgba(255,255,255,0.25)',
    color: '#fff',
    display: isDesktop ? 'flex' : 'none',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0,0,0,0.25)'
  }), [isDesktop]);

  const content = (
    <aside className={className} style={containerStyle} aria-hidden={false}>
      {/* Header inside when open */}
      <div style={{ padding: '8px', borderBottom: isOpen ? '1px solid rgba(255,255,255,0.25)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 14, fontWeight: 'bold', opacity: 0.9 }}>Filters</span>
        {/* Keep a header toggle for non-desktop fallback and quick access */}
        <button
          type="button"
          aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
          onClick={onToggle}
          style={{ background: 'transparent', border: 'none', color: '#fff', padding: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          {isDesktop ? (isOpen ? <FiChevronLeft size={18} /> : <FiChevronRight size={18} />) : (isOpen ? <FiChevronDown size={18} /> : <FiChevronUp size={18} />)}
        </button>
      </div>
      <div style={{ display: 'grid', gap: 8, width: '100%', overflow: 'auto', opacity: isOpen ? 1 : 0, transition: 'opacity 200ms ease' }}>{children}</div>

      {/* Protruding toggle tab (desktop only) */}
      <button
        type="button"
        aria-label={isOpen ? 'Hide statistics sidebar' : 'Show statistics sidebar'}
        onClick={onToggle}
        style={tabStyle}
      >
        {isOpen ? <FiChevronLeft size={18} /> : <FiChevronRight size={18} />}
        <span style={{ position: 'absolute', transform: 'rotate(-90deg)', whiteSpace: 'nowrap', fontSize: 12, fontWeight: 600, opacity: 0.9 }}>
          Stats
        </span>
      </button>
    </aside>
  );

  if (usePortal && typeof document !== 'undefined' && document.body) {
    return createPortal(content, document.body);
  }
  return content;
}
