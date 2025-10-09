import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { getCurrentUser, isStale, setCurrentUser, ensureUser } from "../lib/authState";
import { TENANT_SCOPED } from "../lib/roles";

// allowed: array of role strings permitted to view the child content; empty = any authenticated user
export default function RequireRole({ allowed = [], children }) {
  const [checking, setChecking] = useState(() => !getCurrentUser());
  const [ok, setOk] = useState(() => {
    const user = getCurrentUser();
    return !!user && (allowed.length === 0 || allowed.includes(user.role));
  });
  const [tenantOk, setTenantOk] = useState(() => {
    const user = getCurrentUser();
    if (!user) return true;
    return !TENANT_SCOPED.has(user.role) || !!user.tenant_id;
  }); // for tenant handling
  const nav = useNavigate();

  const evaluateUser = (user) => {
    const roleAllowed = !!user && (allowed.length === 0 || allowed.includes(user.role));
    const tenantAllowed = !!user && (!TENANT_SCOPED.has(user.role) || !!user.tenant_id);
    setOk(roleAllowed);
    setTenantOk(tenantAllowed);
  };

  // 1. Check role & tenant using cached user first, then refresh in background if needed
  useEffect(() => {
    let aborted = false;

    const markFailure = () => {
      if (aborted) return;
      setOk(false);
      setTenantOk(false);
    };

    const syncFromUser = (user) => {
      if (aborted) return;
      evaluateUser(user);
    };

    const fetchFresh = async () => {
      try {
        const fresh = await api("/auth/me");
        setCurrentUser(fresh);
        syncFromUser(fresh);
      } catch {
        markFailure();
      }
    };

    const cached = getCurrentUser();
    if (cached) {
      syncFromUser(cached);
      setChecking(false);
      if (isStale()) {
        fetchFresh();
      }
    } else {
      setChecking(true);
      (async () => {
        try {
          const user = await ensureUser(() => api("/auth/me"));
          syncFromUser(user);
        } catch {
          markFailure();
        } finally {
          if (!aborted) setChecking(false);
        }
      })();
    }

    const handleUserUpdate = (event) => {
      syncFromUser(event?.detail ?? getCurrentUser());
    };

    if (typeof window !== "undefined") {
      window.addEventListener("lv-user-update", handleUserUpdate);
    }

    return () => {
      aborted = true;
      if (typeof window !== "undefined") {
        window.removeEventListener("lv-user-update", handleUserUpdate);
      }
    };
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
