import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import WQTestWizard from "../../components/water-quality-test/WQTestWizard";
import { fetchOrgContext, createOrgWqTest } from "../../lib/waterQuality";
import { alertError, alertSuccess } from "../../utils/alerts";
import { extractErrorMessage } from "../../utils/errors";

/**
 * IMPORTANT: Route-level layout (DashboardLayout) should wrap this page.
 * Do NOT wrap this component with DashboardLayout here to avoid double chrome.
 */

export default function OrgAddWQTest() {
  const [organization, setOrganization] = useState(null);
  const [role, setRole] = useState("org-admin");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const ctx = await fetchOrgContext();
        if (cancelled) return;

        const membership = ctx.membership;
        if (!membership) {
          setError("You must belong to an active organization to log tests.");
          alertError("No organization", "You must belong to an active organization to log tests.");
          return;
        }

        setOrganization({
          id: membership.organization_id,
          name: membership.organization_name,
        });
        setRole(membership.role === "contributor" ? "contributor" : "org-admin");
      } catch (err) {
        if (!cancelled) {
          const message = extractErrorMessage(err);
          setError(message);
          alertError("Failed to load organization", message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (payload) => {
    if (!organization) {
      alertError("No organization", "Please wait for the organization context to load.");
      return;
    }

    try {
      await createOrgWqTest({
        ...payload,
        organization_id: organization.id,
      });

      const published = payload.status === "published";
      alertSuccess(
        published ? "Water quality test published" : "Draft saved",
        published ? "The water quality test has been published." : "Your draft has been saved."
      );

      navigate("/org-dashboard/wq-tests");
    } catch (err) {
      alertError("Failed to save test", extractErrorMessage(err));
    }
  };

  return (
    <div className="dashboard-content">
      <div className="dashboard-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h2 className="page-title">Add Water Quality Test</h2>
          <p className="page-subtitle">
            Use the wizard below to log a water quality test for your organization.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="dashboard-card">
          <div className="dashboard-card-body">Loading organization context…</div>
        </div>
      ) : error ? (
        <div className="dashboard-card">
          <div className="dashboard-card-body">{error}</div>
        </div>
      ) : (
        <WQTestWizard
          organization={organization}
          currentUserRole={role === "contributor" ? "contributor" : "org-admin"}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
