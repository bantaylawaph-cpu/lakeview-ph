import React, { useState } from "react";
import { FiMap } from "react-icons/fi";

import ManageLakesTab from "./water-bodies/ManageLakesTab";
import ManageWatershedsTab from "./water-bodies/ManageWatershedsTab";

function AdminWaterCat() {
  const [activeTab, setActiveTab] = useState("lakes");

  return (
    <div className="admin-watercat">
      <div className="dashboard-card" style={{ marginBottom: 16 }}>
        <div className="dashboard-card-header">
          <div className="dashboard-card-title">
            <FiMap />
            <span>Water Bodies Catalogue</span>
          </div>
          <div className="org-actions-right">
            <button
              type="button"
              className={`pill-btn ${activeTab === "lakes" ? "primary" : ""}`}
              onClick={() => setActiveTab("lakes")}
            >
              Manage Lakes
            </button>
            <button
              type="button"
              className={`pill-btn ${activeTab === "watersheds" ? "primary" : ""}`}
              onClick={() => setActiveTab("watersheds")}
            >
              Manage Watersheds
            </button>
          </div>
        </div>
        <p style={{ marginTop: 8, fontSize: 13, color: "#6b7280" }}>
          Switch between managing lake records and managing watershed records. Watershed updates save directly to the catalogue.
        </p>
      </div>

      {activeTab === "lakes" ? <ManageLakesTab /> : <ManageWatershedsTab />}
    </div>
  );
}

export default AdminWaterCat;
