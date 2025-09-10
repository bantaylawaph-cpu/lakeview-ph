import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../js/lib/api";

export default function RequireRole({ allowed = [], children }) {
  const [checking, setChecking] = useState(true);
  const [ok, setOk] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const me = await api('/auth/me');
        setOk(allowed.includes(me.role));
      } catch {
        setOk(false);
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  if (checking) return null; // or spinner
  if (!ok) { nav('/signin'); return null; }
  return children;
}
