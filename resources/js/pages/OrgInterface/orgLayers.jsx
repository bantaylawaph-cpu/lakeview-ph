// resources/js/pages/OrgInterface/OrgLayers.jsx
import React, { useState } from "react";
import { FiLayers } from "react-icons/fi";

import LayerWizard from "../../components/layers/LayerWizard";
import LayerList from "../../components/layers/LayerList";

const ORG_VISIBILITY_OPTIONS = [
  { value: "public", label: "Public" },
  { value: "admin", label: "Admin" },
];

export default function OrgLayers() {
  const [lastBody, setLastBody] = useState({ type: "lake", id: "" });
  const [activeTab, setActiveTab] = useState("upload");

  return (
    <div className="org-layers">
      <div className="dashboard-card" style={{ marginBottom: 12 }}>
        <div className="dashboard-card-header">
          <div className="dashboard-card-title">
            <FiLayers />
            <span>Organization Layers</span>
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
          allowedBodyTypes={["lake"]}
          defaultBodyType="lake"
          defaultVisibility="public"
          visibilityOptions={ORG_VISIBILITY_OPTIONS}
          allowSetActive={false}
          onPublished={(res) => {
            const payload = res?.data ?? res ?? {};
            if (payload.body_type && payload.body_id) {
              setLastBody({ type: payload.body_type, id: payload.body_id });
            }
            setActiveTab('view');
            console.log('Organization layer published', res);
          }}
        />
      )}

      {activeTab === 'view' && (
        <LayerList
          initialBodyType={lastBody.type || 'lake'}
          initialBodyId={lastBody.id || ''}
          allowActivate={false}
          allowToggleVisibility
          allowDelete
          showPreview={false}
          visibilityOptions={ORG_VISIBILITY_OPTIONS}
        />
      )}
    </div>
  );
}
