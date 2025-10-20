import { useEffect, useMemo, useState } from 'react';
import { apiPublic, buildQuery } from '../../../lib/api';

export default function useStationsCache(lakeId) {
  const [orgOptions, setOrgOptions] = useState([]);
  const [stationsByOrg, setStationsByOrg] = useState({});
  const [allStations, setAllStations] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let aborted = false;
    (async () => {
      if (!lakeId) { if (!aborted) { setOrgOptions([]); setStationsByOrg({}); setAllStations([]); } return; }
      setLoading(true);
      try {
        const qs = buildQuery({ lake_id: lakeId, limit: 2000 });
        let res;
        try { res = await apiPublic(`/public/sample-events${qs}`); }
        catch (e) { if (e?.status === 429) { await new Promise(r => setTimeout(r, 600)); res = await apiPublic(`/public/sample-events${qs}`); } else throw e; }
        const rows = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        const orgMap = new Map(); const all = new Set(); const byOrg = new Map();
        rows.forEach((ev) => {
          const oid = ev.organization_id ?? ev.organization?.id ?? null;
          const oname = ev.organization_name ?? ev.organization?.name ?? null;
          if (oid && oname && !orgMap.has(String(oid))) orgMap.set(String(oid), { id: oid, name: oname });
          const stationName = ev?.station?.name || ev?.station_name || (ev.latitude != null && ev.longitude != null ? `${Number(ev.latitude).toFixed(6)}, ${Number(ev.longitude).toFixed(6)}` : '');
          const label = stationName || '';
          if (label) {
            all.add(label);
            if (oid) { const k = String(oid); if (!byOrg.has(k)) byOrg.set(k, new Set()); byOrg.get(k).add(label); }
          }
        });
        if (aborted) return;
        const byOrgObj = {}; for (const [k, v] of byOrg.entries()) byOrgObj[k] = Array.from(v.values());
        setOrgOptions(Array.from(orgMap.values()));
        setStationsByOrg(byOrgObj);
        setAllStations(Array.from(all.values()));
      } catch (e) {
        if (!aborted) { setOrgOptions([]); setStationsByOrg({}); setAllStations([]); }
      } finally { if (!aborted) setLoading(false); }
    })();
    return () => { aborted = true; };
  }, [lakeId]);

  return { orgOptions, stationsByOrg, allStations, loading };
}
