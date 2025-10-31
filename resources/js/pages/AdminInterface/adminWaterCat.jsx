import React, { useState } from "react";
import { FiMap } from "react-icons/fi";

import ManageLakesTab from "./water-bodies/ManageLakesTab";
import ManageWatershedsTab from "./water-bodies/ManageWatershedsTab";
import ManageFlowsTab from "./water-bodies/ManageFlowsTab";
import DashboardHeader from '../../components/DashboardHeader';
import { FiMap as FiMapIcon } from 'react-icons/fi';

function AdminWaterCat() {
  const [activeTab, setActiveTab] = useState("lakes");

  return (
    <div className="admin-watercat">
      <DashboardHeader
        icon={<FiMapIcon />}
        title="Water Bodies Catalogue"
        description="Switch between managing lake records and managing watershed records. Watershed updates save directly to the catalogue."
        actions={(
          <div className="org-actions-right">
            <button
              type="button"
              className={`pill-btn ${activeTab === "lakes" ? "primary" : ""}`}
              onClick={() => setActiveTab("lakes")}
            >
              Manage Lakes
            </button>
            <button type="button" className={`pill-btn ${activeTab === "watersheds" ? "primary" : ""}`} onClick={() => setActiveTab("watersheds")}>Manage Watersheds</button>
            <button type="button" className={`pill-btn ${activeTab === "flows" ? "primary" : ""}`} onClick={() => setActiveTab("flows")}>Manage Tributaries</button>
          </div>
        )}
      />

  {activeTab === "lakes" && <ManageLakesTab />}
  {activeTab === "watersheds" && <ManageWatershedsTab />}
  {activeTab === "flows" && <ManageFlowsTab />}
    </div>
  );
}

export default AdminWaterCat;
