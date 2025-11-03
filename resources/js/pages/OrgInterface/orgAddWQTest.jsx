import React, { useMemo, useState, useEffect } from "react";
import { FiDroplet } from "react-icons/fi";
import DashboardHeader from '../../components/DashboardHeader';
import WQTestWizard from "../../components/water-quality-test/WQTestWizard";
import { api } from "../../lib/api";
import { cachedGet, invalidateHttpCache } from "../../lib/httpCache";
import { alertError, alertSuccess, showLoading, closeLoading } from "../../lib/alerts";

export default function OrgAddWQTest() {
  const [organization, setOrganization] = useState(null);
  const lakeGeoms = useMemo(() => ({}), []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const me = await cachedGet('/auth/me', { ttlMs: 60 * 1000 });
        if (!mounted) return;
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
            // Do not await showLoading; it resolves only when closed.
            showLoading('Saving test…', 'Almost there — this may take a few seconds.');
            const res = await api('/admin/sample-events', { method: 'POST', body: payload });
            try {
              invalidateHttpCache('/admin/sample-events');
              if (organization?.id) invalidateHttpCache(`/org/${organization.id}/sample-events`);
            } catch {}
            closeLoading();
            await alertSuccess('Saved', 'Your water quality test has been saved.');
            return res?.data;
          } catch (e) {
            const msg = e?.message || String(e);
            await alertError('Save failed', msg);
            throw e;
          } finally {
            // Ensure the loader is closed even if an exception bubbles.
            closeLoading();
          }
        }}
      />
    </div>
  );
}
