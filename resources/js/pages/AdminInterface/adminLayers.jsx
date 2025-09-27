// resources/js/pages/AdminInterface/AdminLayers.jsx
import React, { useState } from "react";
import { FiLayers } from "react-icons/fi";
import LayerWizard from "../../components/layers/LayerWizard";
import LayerList from "../../components/layers/LayerList";
import { ROLES } from "../../lib/roles";

const ADMIN_VISIBILITY_OPTIONS = [
  { value: "public", label: "Public" },
  { value: "admin", label: "Admin" },
];

export default function AdminLayers({ currentUserRole = ROLES.SUPERADMIN }) { // assume superadmin when mounted under admin interface
  // After a successful publish, remember which body was used
  const [lastBody, setLastBody] = useState({ type: "lake", id: "" });
  const [activeTab, setActiveTab] = useState("upload"); // 'upload' | 'view'

  return (
    <div className="admin-layers">
      {/* Header with right-aligned pill tabs */}
      <div className="dashboard-card" style={{ marginBottom: 12 }}>
        <div className="dashboard-card-header">
          <div className="dashboard-card-title">
            <FiLayers />
            <span>Base Layers</span>
          </div>
          <div className="org-actions-right">
            <button
              className={`pill-btn ${activeTab === 'upload' ? 'primary' : ''}`}
              onClick={() => setActiveTab('upload')}
            >
              Upload Layer
            </button>
            <button
              className={`pill-btn ${activeTab === 'view' ? 'primary' : ''}`}
              onClick={() => setActiveTab('view')}
            >
              View Layers
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'upload' && (
        <LayerWizard
          defaultBodyType="lake"
          defaultVisibility="public"
          visibilityOptions={ADMIN_VISIBILITY_OPTIONS}
          allowSetActive
          onPublished={(res) => {
            // Try to pick body_type/body_id from response payload shape
            // Supports {body_type, body_id} or {data:{body_type, body_id}}
            const r = res?.data ?? res ?? {};
            if (r.body_type && r.body_id) {
              setLastBody({ type: r.body_type, id: r.body_id });
            }
            // Switch to the View tab after a successful publish
            setActiveTab('view');
            console.log("Layer published:", res);
          }}
        />
      )}

      {activeTab === 'view' && (
        <LayerList
          initialBodyType={lastBody.type || "lake"}
          initialBodyId={lastBody.id || ""}
          allowActivate
          allowToggleVisibility
          allowDelete
          showPreview={false}
          visibilityOptions={ADMIN_VISIBILITY_OPTIONS}
          currentUserRole={currentUserRole}
        />
      )}
    </div>
  );
}
