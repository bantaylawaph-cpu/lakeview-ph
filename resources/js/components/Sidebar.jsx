// resources/js/components/Sidebar.jsx
import React, { useEffect, useState, useRef } from "react";
import {
  FiX,
  FiInfo,
  FiBookOpen,
  FiSend,
  FiGithub,
  FiDatabase,
  FiSettings,
  FiGrid,
  FiLogIn,
  FiLogOut,
  FiUser,
  FiMapPin,
} from "react-icons/fi";
import { FiChevronDown } from "react-icons/fi";
import { MapContainer, TileLayer, Rectangle, useMap } from "react-leaflet";
import { useNavigate, useLocation } from "react-router-dom";
import { api, logout as apiLogout, clearToken, getToken, me as fetchMe } from "../lib/api";
import { getCurrentUser, setCurrentUser, ensureUser, isStale } from "../lib/authState";
import "leaflet/dist/leaflet.css";
import "../../css/util/scrollbars.css";
import { confirm, alertSuccess } from "../lib/alerts";

// ─────────────────────────────────────────────────────────────────────────────
// MiniMap that stays centered and updates live
function MiniMap({ parentMap }) {
  const [bounds, setBounds] = useState(parentMap.getBounds());
  const [center, setCenter] = useState(parentMap.getCenter());
  const [zoom, setZoom] = useState(parentMap.getZoom());
  const minimapRef = useRef();

  useEffect(() => {
    function update() {
      setBounds(parentMap.getBounds());
      setCenter(parentMap.getCenter());
      setZoom(parentMap.getZoom());

      const mini = minimapRef.current;
      if (mini) {
        mini.setView(parentMap.getCenter(), Math.max(parentMap.getZoom() - 3, 1));
      }
    }
    parentMap.on("move", update);
    parentMap.on("zoom", update);

    return () => {
      parentMap.off("move", update);
      parentMap.off("zoom", update);
    };
  }, [parentMap]);

  return (
    <MapContainer
      center={center}
      zoom={Math.max(zoom - 3, 1)}
      zoomControl={false}
      dragging={false}
      scrollWheelZoom={false}
      doubleClickZoom={false}
      attributionControl={false}
      style={{ height: "250px", width: "100%" }}
      ref={minimapRef}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Rectangle bounds={bounds} pathOptions={{ color: "red", weight: 1 }} />
    </MapContainer>
  );
}

function MiniMapWrapper() {
  const map = useMap();
  return <MiniMap parentMap={map} />;
}

// ─────────────────────────────────────────────────────────────────────────────
function Sidebar({ isOpen, onClose, pinned, setPinned, onOpenAuth, onOpenFeedback, onOpenKyc, onAboutDataToggle, appBadgeCount = 0 }) {
  const [me, setMe] = useState(() => getCurrentUser()); // start with cached user if available
  const containerRef = useRef(null);
  const suppressNextOutsideCloseRef = useRef(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [aboutDataOpen, setAboutDataOpen] = useState(() => {
    // Restore persisted preference if available; fallback to route-based default
    try {
      const persisted = sessionStorage.getItem('lv-about-data-open');
      if (persisted === 'true') return true;
      if (persisted === 'false') return false;
    } catch {}
    return /^\/data(\/.*)?$/.test(location.pathname || "");
  });

  // Keep submenu open when navigating to any /data route
  useEffect(() => {
    if (/^\/data(\/.*)?$/.test(location.pathname || "")) {
      setAboutDataOpen(true);
    }
  }, [location.pathname]);

  // Persist submenu open state
  useEffect(() => {
    try { sessionStorage.setItem('lv-about-data-open', aboutDataOpen ? 'true' : 'false'); } catch {}
  }, [aboutDataOpen]);

  // Fetch and cache user (avoids duplicate network calls across components)
  const fetchAndCache = async () => {
    try {
      const u = await fetchMe({ maxAgeMs: 5 * 60 * 1000 });
      const finalUser = u && u.id ? u : null;
      setCurrentUser(finalUser);
      setMe(finalUser);
    } catch {
      setCurrentUser(null);
      setMe(null);
    }
  };

  useEffect(() => {
    // Initial hydrate: if we already have a cached user, skip fetch unless stale
    if (getToken()) {
      if (!me || isStale()) {
        fetchAndCache();
      }
    } else {
      setMe(null);
    }

    const onAuthChange = () => {
      if (getToken()) {
        // Optimistic: if login flow has already set user via event, just use it; otherwise fetch
        const cached = getCurrentUser();
        if (!cached) fetchAndCache();
        else setMe(cached);
      } else {
        setCurrentUser(null);
        setMe(null);
      }
    };

    const onUserUpdate = (e) => {
      setMe(e.detail || getCurrentUser());
    };

    // Optional: refresh on focus only if stale (avoid spamming)
    const onFocus = () => {
      if (getToken() && isStale()) fetchAndCache();
    };

    window.addEventListener("lv-auth-change", onAuthChange);
    window.addEventListener("lv-user-update", onUserUpdate);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("lv-auth-change", onAuthChange);
      window.removeEventListener("lv-user-update", onUserUpdate);
      window.removeEventListener("focus", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const isLoggedIn = !!me?.id;
  const isPublic = isLoggedIn && (me.role === "public" || !me.role);

  // Close sidebar on outside click when open and not pinned
  useEffect(() => {
    if (!isOpen || pinned) return;
    const handlePointerDown = (e) => {
      try {
        if (suppressNextOutsideCloseRef.current) {
          suppressNextOutsideCloseRef.current = false;
          return; // ignore this one outside-close cycle
        }
        const el = containerRef.current;
        if (!el) return;
        if (!el.contains(e.target)) {
          onClose?.();
        }
      } catch {}
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen, pinned, onClose]);

  const onSettingsClick = (e) => {
    if (!isLoggedIn) return; // guard
    e.preventDefault();
    if (location.pathname === '/') {
      try { window.dispatchEvent(new Event('lv-open-settings')); } catch {}
      if (!pinned) onClose?.();
    } else {
      // Navigate to map with state requesting modal open
      navigate('/', { state: { openSettings: true } });
      if (!pinned) onClose?.();
    }
  };

  // Centralized navigation handler to preserve SPA behavior while using <a>
  const handleNav = (path, { keepOpen = false } = {}) => (e) => {
    e.preventDefault();
    // Avoid redundant navigation
    if (location.pathname !== path) {
      navigate(path);
    }
    if (!keepOpen && !pinned) onClose?.();
  };
  const isActive = (path) => location.pathname === path;

  return (
    <div
      className={`sidebar ${isOpen ? "open" : ""} ${pinned ? "pinned" : ""}`}
      ref={containerRef}
      style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
    >
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <img src="/lakeview-logo-alt.webp" alt="LakeView PH Logo" />
          <h2 className="sidebar-title">LakeView PH</h2>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {/* Pin */}
          <button
            className={`sidebar-icon-btn ${pinned ? "active" : ""}`}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPinned(!pinned); }}
            title={pinned ? "Unpin Sidebar" : "Pin Sidebar"}
          >
            <FiMapPin size={18} />
          </button>

          {/* Close (hidden if pinned) */}
          {!pinned && (
            <button
              className="sidebar-icon-btn"
              onClick={onClose}
              title="Close Sidebar"
            >
              <FiX size={20} />
            </button>
          )}
        </div>
      </div>

      {/* MiniMap */}
      <div className="sidebar-minimap">
        <MiniMapWrapper />
      </div>

      {/* Scrollable middle content (menu, about data, etc.) */}
      <div className="sidebar-scroll modern-scrollbar" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {/* Menu Links */}
        <ul className="sidebar-menu">
        

        {isLoggedIn && (isPublic) && (
          <li>
            <a
              href="/kyc"
              className={`sidebar-row ${isActive('/kyc') ? 'active' : ''}`}
              onClick={onOpenKyc ? (e) => { e.preventDefault(); onOpenKyc(); if (!pinned) onClose?.(); } : handleNav('/kyc')}
            >
              <FiUser className="sidebar-icon" />
              <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', paddingRight: 8 }}>
                Contribute / Join an Org
                {appBadgeCount > 0 && (
                  <span
                    aria-label={`${appBadgeCount} application update${appBadgeCount>1?'s':''}`}
                    title={`${appBadgeCount} application update${appBadgeCount>1?'s':''}`}
                    style={{
                      position: 'absolute',
                      top: -8,
                      right: -18,
                      background: '#dc2626',
                      color: '#fff',
                      minWidth: 18,
                      height: 18,
                      borderRadius: 9,
                      fontSize: 11,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 0 0 2px #fff, 0 2px 4px rgba(0,0,0,0.25)',
                      padding: '0 4px',
                      pointerEvents: 'none'
                    }}
                  >{appBadgeCount > 99 ? '99+' : appBadgeCount}</span>
                )}
              </span>
            </a>
          </li>
        )}

        {/**
         * Temporarily disabled: About LakeView PH link
         *
         * <li>
         *   <a
         *     href="/about"
         *     className={`sidebar-row ${isActive('/about') ? 'active' : ''}`}
         *     onClick={handleNav('/about')}
         *   >
         *     <FiInfo className="sidebar-icon" />
         *     <span>About LakeView PH</span>
         *   </a>
         * </li>
         */}
        {/**
         * Temporarily disabled: How to use LakeView PH link
         *
         * <li>
         *   <a
         *     href="/manual"
         *     className={`sidebar-row ${isActive('/manual') ? 'active' : ''}`}
         *     onClick={handleNav('/manual')}
         *   >
         *     <FiBookOpen className="sidebar-icon" />
         *     <span>How to use LakeView?</span>
         *   </a>
         * </li>
         */}
        <li>
          <a
            href="#feedback"
            className="sidebar-row feedback-trigger"
            onClick={(e) => { e.preventDefault(); onOpenFeedback?.(); if (!pinned) onClose?.(); }}
          >
            <FiSend className="sidebar-icon" />
            <span>Submit Feedback</span>
          </a>
        </li>
        {/**
         * Temporarily disabled: GitHub Page link
         *
         * <li>
         *   <a
         *     className="sidebar-row"
         *     href="https://github.com/"
         *     target="_blank"
         *     rel="noopener noreferrer"
         *     onClick={!pinned ? onClose : undefined}
         *   >
         *     <FiGithub className="sidebar-icon" />
         *     <span>GitHub Page</span>
         *   </a>
         * </li>
         */}
        {/* About the Data (dropdown) */}
        <li className="has-submenu">
          <a
            href="#about-data"
            className={`sidebar-row ${aboutDataOpen ? 'open' : ''}`}
            role="button"
            onPointerDown={(e) => {
              // Prevent the global document pointerdown outside-close from firing
              suppressNextOutsideCloseRef.current = true;
              try { e.stopPropagation(); } catch {}
              try { e.nativeEvent && e.nativeEvent.stopImmediatePropagation && e.nativeEvent.stopImmediatePropagation(); } catch {}
            }}
            onMouseDown={(e) => {
              suppressNextOutsideCloseRef.current = true;
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setAboutDataOpen((v) => {
                const nv = !v;
                try {
                  onAboutDataToggle && onAboutDataToggle(nv);
                } catch {}
                return nv;
              });
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setAboutDataOpen((v) => {
                  const nv = !v;
                  try {
                    onAboutDataToggle && onAboutDataToggle(nv);
                  } catch {}
                  return nv;
                });
              }
              if (e.key === 'ArrowDown' && !aboutDataOpen) {
                setAboutDataOpen(true);
                // focus first submenu item after opening
                setTimeout(() => {
                  try {
                    const first = document.querySelector(
                      '#about-data-submenu .sidebar-row'
                    );
                    first && first.focus && first.focus();
                  } catch {}
                }, 10);
              }
              if (e.key === 'ArrowUp' && aboutDataOpen) {
                setAboutDataOpen(true);
              }
            }}
            aria-expanded={aboutDataOpen ? 'true' : 'false'}
            aria-controls="about-data-submenu"
            style={{ width: '100%', textAlign: 'left' }}
          >
            <FiDatabase className="sidebar-icon" />
            <span style={{ flex: 1 }}>About the Data</span>
            <FiChevronDown className={`chev ${aboutDataOpen ? 'open' : ''}`} />
          </a>

          <ul
            id="about-data-submenu"
            className={`sidebar-submenu ${aboutDataOpen ? 'open' : ''}`}
            style={{
              listStyle: 'none',
              paddingLeft: 0,
              marginTop: 6,
              marginBottom: 0,
            }}
          >
            <li>
              <a
                href="#terms"
                className="sidebar-row"
                onClick={(e) => {
                  e.preventDefault();
                  try {
                    window.dispatchEvent(new Event('lv-open-about-data'));
                  } catch {}
                }}
              >
                <span>Terms & Conditions</span>
              </a>
            </li>
            <li>
              <a
                href="#privacy"
                className={`sidebar-row ${
                  location.pathname === '/data/privacy' ? 'active' : ''
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  try {
                    window.dispatchEvent(new Event('lv-open-privacy'));
                  } catch {}
                  // Keep sidebar open
                }}
              >
                <span>Data Privacy Disclaimer</span>
              </a>
            </li>
          </ul>
        </li>

        {isLoggedIn && (
          <li className="force-border">
            <a className="sidebar-row" href="#settings" onClick={onSettingsClick}>
              <FiSettings className="sidebar-icon" />
              <span>Settings</span>
            </a>
          </li>
        )}
        </ul>
      </div>

      {/* Bottom Menu */}
      <ul className="sidebar-bottom">

        {isLoggedIn ? (
          <>
            {/* Profile row showing logged-in user */}
            <li aria-label="Logged-in user" title={me?.name || ""}>
              <div className="sidebar-row" style={{ cursor: 'default' }}>
                <FiUser className="sidebar-icon" />
                <span>{me?.name}</span>
              </div>
            </li>

            {/* Back to Dashboard button for privileged roles */}
            {(me?.role === 'superadmin' || me?.role === 'admin' || me?.role === 'org_admin' || me?.role === 'contributor') && (
              <li>
                <button
                  type="button"
                  className="sidebar-row"
                  onClick={(e) => {
                    e.preventDefault();
                    const role = me?.role;
                    // Support both 'superadmin' and potential 'admin' value
                    if (role === 'superadmin' || role === 'admin') {
                      navigate('/admin-dashboard');
                    } else if (role === 'org_admin') {
                      navigate('/org-dashboard');
                    } else if (role === 'contributor') {
                      navigate('/contrib-dashboard');
                    }
                    if (!pinned) onClose?.();
                  }}
                  title="Back to your dashboard"
                >
                  <FiGrid className="sidebar-icon" />
                  <span>Back to Dashboard</span>
                </button>
              </li>
            )}

            <li>
              <button
                className="sidebar-row"
                onClick={async () => {
                  const ok = await confirm(
                    "Sign out?",
                    "You will be logged out of LakeView PH.",
                    "Yes, sign out"
                  );
                  if (!ok) return;

                  // Fast, optimistic logout: clear immediately; fire server call in background
                  try { await apiLogout(); } catch {}
                  setCurrentUser(null);
                  setMe(null);
                  if (!pinned) onClose?.();
                  // Show confirmation and navigate without waiting on network
                  await alertSuccess("Signed out", "You have been signed out successfully.");
                  navigate("/");
                }}
              >
                <FiLogOut className="sidebar-icon" />
                <span>Sign out</span>
              </button>
            </li>
          </>
        ) : (
          <li>
            {onOpenAuth ? (
              <button
                className="sidebar-row"
                onClick={() => {
                  onOpenAuth("login");
                  if (!pinned) onClose?.();
                }}
              >
                <FiLogIn className="sidebar-icon" />
                <span>Log in</span>
              </button>
            ) : (
              <a
                href="/login"
                className={`sidebar-row ${isActive('/login') ? 'active' : ''}`}
                onClick={handleNav('/login')}
              >
                <FiLogIn className="sidebar-icon" />
                <span>Log in</span>
              </a>
            )}
          </li>
        )}
      </ul>
    </div>
  );
}

export default Sidebar;
