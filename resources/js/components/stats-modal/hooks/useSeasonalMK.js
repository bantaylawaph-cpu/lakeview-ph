import { useEffect, useMemo, useState } from 'react';
import { anchorByTimeRange, depthBandKeyInt } from '../utils/dataUtils';
import { computeSMKFromEvents } from '../../../stats/seasonalMK';

/**
 * useSeasonalMK
 * Computes Seasonal Mann–Kendall (Wet/Dry) and Sen's slope overlay aligned to chart labels.
 * Inputs mirror SingleLake time-series controls.
 */
export default function useSeasonalMK({
  events,
  selectedParam,
  selectedStations,
  bucket,
  timeRange,
  dateFrom,
  dateTo,
  labels,
  alpha = 0.05,
  enabled = false,
  depthSelection = 'all',
}){
  const [state, setState] = useState({ loading: false, result: null, error: null });

  const scopedEvents = useMemo(() => anchorByTimeRange(Array.isArray(events)? events: [], timeRange, dateFrom, dateTo), [events, timeRange, dateFrom, dateTo]);

  // If a specific depth is selected, filter results to that depth band before computing SMK
  const filteredEventsByDepth = useMemo(() => {
    if (!scopedEvents || !Array.isArray(scopedEvents)) return [];
    if (!depthSelection || String(depthSelection) === 'all') return scopedEvents;
    const sel = String(depthSelection);
    const dkFn = depthBandKeyInt;
    return scopedEvents.map((ev) => {
      const results = Array.isArray(ev?.results) ? ev.results.filter((r) => {
        const dk = (r?.depth_m != null) ? String(dkFn(r.depth_m)) : 'NA';
        return String(dk) === sel;
      }) : [];
      // shallow-copy event with filtered results
      return { ...ev, results };
    }).filter(ev => Array.isArray(ev.results) && ev.results.length > 0);
  }, [scopedEvents, depthSelection]);

  useEffect(() => {
    let alive = true;
    async function run(){
      if (!enabled || !selectedParam || !labels?.length) { setState({ loading: false, result: null, error: null }); return; }
      setState(prev => ({ ...prev, loading: true, error: null }));
      try {
        const res = await computeSMKFromEvents({ events: (depthSelection && String(depthSelection) !== 'all') ? filteredEventsByDepth : scopedEvents, selectedParam, selectedStations, labels, bucket, alpha });
        if (!alive) return;
        setState({ loading: false, result: res, error: null });
      } catch (e) {
        if (!alive) return;
        setState({ loading: false, result: null, error: e });
      }
    }
    run();
    return () => { alive = false; };
  }, [enabled, JSON.stringify(scopedEvents), selectedParam, JSON.stringify(selectedStations), bucket, timeRange, dateFrom, dateTo, JSON.stringify(labels), alpha, depthSelection, JSON.stringify(filteredEventsByDepth)]);

  return state;
}
