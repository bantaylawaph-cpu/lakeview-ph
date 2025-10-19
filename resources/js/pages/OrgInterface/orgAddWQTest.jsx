import React, { useMemo, useState, useEffect } from "react";
import { FiDroplet } from "react-icons/fi";
import DashboardHeader from '../../components/DashboardHeader';
import WQTestWizard from "../../components/water-quality-test/WQTestWizard";
import { api } from "../../lib/api";
import { alertError, alertSuccess } from "../../lib/alerts";

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
      <DashboardHeader icon={<FiDroplet />} title="Add Water Quality Test" description="Create a new water quality test record for your organization." />

      <WQTestWizard
        organization={organization}
        lakeGeoms={lakeGeoms}
        onSubmit={async (payload) => {
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
