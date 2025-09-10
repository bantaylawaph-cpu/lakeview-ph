// resources/js/pages/AdminInterface/AdminLayers.jsx
import React, { useState } from "react";
import LayerWizard from "../../components/layers/LayerWizard";
import LayerList from "../../components/layers/LayerList";

export default function AdminLayers() {
  // After a successful publish, remember which body was used
  const [lastBody, setLastBody] = useState({ type: "lake", id: "" });

  return (
    <div className="admin-layers">
      <LayerWizard
        defaultBodyType="lake"
        defaultVisibility="public"
        allowSetActive
        onPublished={(res) => {
          // Try to pick body_type/body_id from response payload shape
          // Supports {body_type, body_id} or {data:{body_type, body_id}}
          const r = res?.data ?? res ?? {};
          if (r.body_type && r.body_id) {
            setLastBody({ type: r.body_type, id: r.body_id });
          }
          // Optionally toast or notify
          console.log("Layer published:", res);
        }}
      />

      {/* Reusable list, focused on last published body if available */}
      <LayerList
        initialBodyType={lastBody.type || "lake"}
        initialBodyId={lastBody.id || ""}
        allowActivate
        allowToggleVisibility
        allowDelete
        showPreview={false}     // set to true and pass onPreview if you want a map preview handler
      />
    </div>
  );
}
