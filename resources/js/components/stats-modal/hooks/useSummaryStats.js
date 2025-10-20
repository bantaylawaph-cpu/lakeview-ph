import { useEffect, useState } from 'react';
import { eventStationName } from '../utils/dataUtils';

const _mean = (arr) => { const a = (Array.isArray(arr) ? arr.filter(Number.isFinite) : []); if (!a.length) return NaN; return a.reduce((s,v)=>s+v,0)/a.length; };
const _median = (arr) => { const a = (Array.isArray(arr) ? arr.filter(Number.isFinite) : []); if (!a.length) return NaN; const s = a.slice().sort((x,y)=>x-y); const n = s.length; const m = Math.floor(n/2); return (n%2) ? s[m] : (s[m-1]+s[m])/2; };

export default function useSummaryStats({ applied, events, selectedStations = [], selectedParam }) {
  const [summary, setSummary] = useState({ n: 0, mean: NaN, median: NaN });

  useEffect(() => {
    if (!applied) { setSummary({ n: 0, mean: NaN, median: NaN }); return; }
    try {
      const vals = [];
      for (const ev of events || []) {
        const sName = eventStationName(ev) || '';
        if (Array.isArray(selectedStations) && selectedStations.length && !selectedStations.includes(sName)) continue;
        const results = Array.isArray(ev?.results) ? ev.results : [];
        for (const r of results) {
          const p = r?.parameter; if (!p) continue;
          const match = (String(p.code) === String(selectedParam)) || (String(p.id) === String(selectedParam)) || (String(r.parameter_id) === String(selectedParam));
          if (!match) continue;
          const v = Number(r.value); if (!Number.isFinite(v)) continue;
          vals.push(v);
        }
      }
      setSummary({ n: vals.length, mean: _mean(vals), median: _median(vals) });
    } catch (e) {
      setSummary({ n: 0, mean: NaN, median: NaN });
    }
  }, [applied, events, selectedParam, JSON.stringify(selectedStations)]);

  return summary;
}
