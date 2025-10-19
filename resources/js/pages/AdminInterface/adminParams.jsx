// resources/js/pages/AdminInterface/adminParams.jsx
import React, { useState } from "react";
import { FiSliders } from "react-icons/fi";

import ParametersTab from "./parameters/ParametersTab";
import StandardsTab from "./parameters/StandardsTab";
import ThresholdsTab from "./parameters/ThresholdsTab";
import DashboardHeader from '../../components/DashboardHeader';
import { FiSliders as FiSlidersIcon } from 'react-icons/fi';

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
      <DashboardHeader
        icon={<FiSlidersIcon />}
        title="Parameters, Standards, and Thresholds Catalogue"
        description="Manage parameters, water quality standards, and threshold rules used for automatic evaluations."
        actions={(
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
        )}
      />

      {renderTab()}
    </div>
  );
}