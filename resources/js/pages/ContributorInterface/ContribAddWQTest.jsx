import React, { useMemo, useState, useEffect } from "react";
import WQTestWizard from "../../components/water-quality-test/WQTestWizard";
import { FiDroplet } from "react-icons/fi";
import { api } from "../../lib/api";
import { alertError, alertSuccess } from "../../utils/alerts";

/**
 * Contributor-facing WQ Test creation page.
 * Contributors cannot publish events and cannot create/update/delete stations.
 */
export default function ContribAddWQTest() {
  const [organization, setOrganization] = useState(null);
  const lakeGeoms = useMemo(() => ({}), []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const me = await api('/auth/me');
        if (!mounted) return;
        if (me && (me.organization || me.tenant || me.tenant_id || me.organization_id)) {
          const org = me.organization || (me.tenant ? { id: me.tenant.id, name: me.tenant.name } : null);
          if (!org && me.organization_id) {
            setOrganization({ id: me.organization_id, name: me.organization_name || '' });
          } else if (org) {
            setOrganization({ id: org.id, name: org.name || '' });
          }
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="dashboard-content">
      <div className="dashboard-card" style={{ marginBottom: 12 }}>
        <div className="dashboard-card-header">
          <div className="dashboard-card-title">
            <FiDroplet />
            <span>Add Water Quality Test </span>
          </div>
        </div>
      </div>

      <WQTestWizard
        organization={organization}
        lakeGeoms={lakeGeoms}
        currentUserRole="contributor"
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
