import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { TENANT_SCOPED } from "../lib/roles";

// allowed: array of role strings permitted to view the child content; empty = any authenticated user
export default function RequireRole({ allowed = [], children }) {
  const [checking, setChecking] = useState(true);
  const [ok, setOk] = useState(false);
  const [tenantOk, setTenantOk] = useState(true); // for tenant handling
  const nav = useNavigate();

  // 1. Check role & tenant from backend
  useEffect(() => {
    (async () => {
      try {
        const me = await api("/auth/me");

        const roleAllowed = allowed.length === 0 || allowed.includes(me.role);
        setOk(roleAllowed);
        // Tenant-scoped roles must have tenant_id
        if (TENANT_SCOPED.has(me.role) && !me.tenant_id) setTenantOk(false);
      } catch {
        setOk(false);
        setTenantOk(false);
      } finally {
        setChecking(false);
      }
    })();
  }, [allowed]);

  // 2. Redirects after render
  useEffect(() => {
    if (!checking) {
      if (!ok) {
        nav("/login");
      } else if (!tenantOk) {
        nav("/select-tenant");
      }
    }
  }, [checking, ok, tenantOk, nav]);

  // 3. Rendering logic
  if (checking) return null; // or a spinner/loading component
  if (!ok || !tenantOk) return null; // user is being redirected

  return <>{children}</>;
}
