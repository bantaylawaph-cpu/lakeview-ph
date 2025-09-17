// resources/js/pages/AdminInterface/adminParams.jsx
import React, { useState } from "react";
import { FiSliders } from "react-icons/fi";

import ParametersTab from "./parameters/ParametersTab";
import StandardsTab from "./parameters/StandardsTab";
import ThresholdsTab from "./parameters/ThresholdsTab";

const TABS = [
  { key: "parameters", label: "Parameters" },
  { key: "standards", label: "Standards" },
  { key: "thresholds", label: "Thresholds" },
];

export default function AdminParameters() {
  const [activeTab, setActiveTab] = useState("parameters");

  const renderTab = () => {
    switch (activeTab) {
      case "standards":
        return <StandardsTab />;
      case "thresholds":
        return <ThresholdsTab />;
      default:
        return <ParametersTab />;
    }
  };

  return (
    <div className="admin-parameters">
      <div className="dashboard-card" style={{ marginBottom: 16 }}>
        <div className="dashboard-card-header">
          <div className="dashboard-card-title">
            <FiSliders />
            <span>Water Quality Catalogue</span>
          </div>
          <div className="org-actions-right">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`pill-btn ${activeTab === tab.key ? "primary" : ""}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <p style={{ marginTop: 8, fontSize: 13, color: "#6b7280" }}>
          Manage parameters, water quality standards, and threshold rules used for automatic evaluations.
        </p>
      </div>

      {renderTab()}
    </div>
  );
}