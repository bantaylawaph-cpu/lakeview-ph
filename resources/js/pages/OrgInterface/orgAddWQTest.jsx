import React, { useMemo, useState, useEffect } from "react";
import WQTestWizard from "../../components/water-quality-test/WQTestWizard";
import { api } from "../../lib/api";
import { alertError, alertSuccess } from "../../utils/alerts";

/**
 * IMPORTANT: Route-level layout (DashboardLayout) should wrap this page.
 * Do NOT wrap this component with DashboardLayout here to avoid double chrome.
 */

export default function OrgAddWQTest() {
  const [organization, setOrganization] = useState(null);
  const lakeGeoms = useMemo(() => ({}), []); // plug real GeoJSON per lake later

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const me = await api('/auth/me');
        if (!mounted) return;
        // If backend provides tenant/organization info, use it; otherwise leave null
        if (me && (me.organization || me.tenant || me.tenant_id || me.organization_id)) {
          const org = me.organization || (me.tenant ? { id: me.tenant.id, name: me.tenant.name } : null);
          // fallback shapes
          if (!org && me.organization_id) {
            setOrganization({ id: me.organization_id, name: me.organization_name || '' });
          } else if (org) {
            setOrganization({ id: org.id, name: org.name || '' });
          }
        }
      } catch (e) {
        // ignore — allow organization to remain null
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="dashboard-content">
      <div className="dashboard-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h2 className="page-title">Add Water Quality Test</h2>
          <p className="page-subtitle">
            Full-page wizard (LayerWizard style). Frontend-only for now; Submit emits a payload to wire later.
          </p>
        </div>
      </div>

      <WQTestWizard
        organization={organization}
        lakeGeoms={lakeGeoms}
        onSubmit={async (payload) => {
          console.debug('[orgAddWQTest] submit', payload);
          try {
            const res = await api('/admin/sample-events', { method: 'POST', body: payload });
            alertSuccess('Saved', 'Water quality test saved to server.');
            return res?.data;
          } catch (e) {
            const msg = e?.message || String(e);
            alertError('Save failed', msg);
            throw e;
          }
        }}
      />
    </div>
  );
}
