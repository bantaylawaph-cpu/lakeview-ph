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
  FiLogIn,
  FiLogOut,
  FiUser,
  FiMapPin,
} from "react-icons/fi";
import { MapContainer, TileLayer, Rectangle, useMap } from "react-leaflet";
import { Link, useNavigate } from "react-router-dom";
import { api, clearToken, getToken } from "../lib/api";
import "leaflet/dist/leaflet.css";
import { confirm, alertSuccess } from "../utils/alerts";

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
function Sidebar({ isOpen, onClose, pinned, setPinned, onOpenAuth }) {
  const [me, setMe] = useState(null); // { id, name, role }
  const navigate = useNavigate();

  // Centralized fetch for /auth/me
  const fetchMe = async () => {
    try {
      const u = await api("/auth/me");
      setMe(u && u.id ? u : null);
    } catch {
      setMe(null);
    }
  };

  useEffect(() => {
    const fetchMe = async () => {
      try { setMe(await api("/auth/me")); } catch { setMe(null); }
    };
    if (getToken()) fetchMe(); // gate initial fetch

    const onAuthChange = () => (getToken() ? fetchMe() : setMe(null));
    const onFocus = () => (getToken() ? fetchMe() : setMe(null));

    window.addEventListener("lv-auth-change", onAuthChange);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("lv-auth-change", onAuthChange);
      window.removeEventListener("focus", onFocus);
    };
  }, []);


  const isLoggedIn = !!me?.id;
  const isPublic = isLoggedIn && (me.role === "public" || !me.role);

  return (
    <div className={`sidebar ${isOpen ? "open" : ""} ${pinned ? "pinned" : ""}`}>
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <img src="/lakeview-logo-alt.png" alt="LakeView PH Logo" />
          <h2 className="sidebar-title">LakeView PH</h2>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {/* Pin */}
          <button
            className={`sidebar-icon-btn ${pinned ? "active" : ""}`}
            onClick={() => setPinned(!pinned)}
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

      {/* Menu Links */}
      <ul className="sidebar-menu">
        

        <li>
          <Link className="sidebar-row" to="/about" onClick={!pinned ? onClose : undefined}>
            <FiInfo className="sidebar-icon" />
            <span>About LakeView PH</span>
          </Link>
        </li>
        <li>
          <Link className="sidebar-row" to="/manual" onClick={!pinned ? onClose : undefined}>
            <FiBookOpen className="sidebar-icon" />
            <span>How to use LakeView?</span>
          </Link>
        </li>
        <li>
          <Link className="sidebar-row" to="/feedback" onClick={!pinned ? onClose : undefined}>
            <FiSend className="sidebar-icon" />
            <span>Submit Feedback</span>
          </Link>
        </li>
        <li>
          <a
            className="sidebar-row"
            href="https://github.com/"
            target="_blank"
            rel="noopener noreferrer"
            onClick={!pinned ? onClose : undefined}
          >
            <FiGithub className="sidebar-icon" />
            <span>GitHub Page</span>
          </a>
        </li>
        <li>
          <Link className="sidebar-row" to="/data" onClick={!pinned ? onClose : undefined}>
            <FiDatabase className="sidebar-icon" />
            <span>About the Data</span>
          </Link>
        </li>
      </ul>

      {/* Bottom Menu */}
      <ul className="sidebar-bottom">
        <li>
          <Link className="sidebar-row" to="/settings" onClick={!pinned ? onClose : undefined}>
            <FiSettings className="sidebar-icon" />
            <span>Settings</span>
          </Link>
        </li>

        {isLoggedIn ? (
          <>
            {/* (Optional) Keep a compact user row near Sign out */}
            <li aria-label="Logged-in user" title={me?.name || ""}>
              <div className="sidebar-row" style={{ cursor: "default" }}>
                <FiUser className="sidebar-icon" />
                <span>{me?.name}</span>
              </div>
            </li>

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

                  try {
                    await api("/auth/logout", { method: "POST" });
                  } catch {}
                  clearToken(); // dispatches lv-auth-change if you patched api.js
                  setMe(null);
                  if (!pinned) onClose?.();

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
              <Link className="sidebar-row" to="/login" onClick={!pinned ? onClose : undefined}>
                <FiLogIn className="sidebar-icon" />
                <span>Log in</span>
              </Link>
            )}
          </li>
        )}
      </ul>
    </div>
  );
}

export default Sidebar;
