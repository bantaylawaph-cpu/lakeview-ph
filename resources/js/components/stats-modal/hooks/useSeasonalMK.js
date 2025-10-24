import { useEffect, useMemo, useState } from 'react';
import { anchorByTimeRange } from '../utils/dataUtils';
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
}){
  const [state, setState] = useState({ loading: false, result: null, error: null });

  const scopedEvents = useMemo(() => anchorByTimeRange(Array.isArray(events)? events: [], timeRange, dateFrom, dateTo), [events, timeRange, dateFrom, dateTo]);

  useEffect(() => {
    let alive = true;
    async function run(){
      if (!enabled || !selectedParam || !labels?.length) { setState({ loading: false, result: null, error: null }); return; }
      setState(prev => ({ ...prev, loading: true, error: null }));
      try {
        const res = await computeSMKFromEvents({ events: scopedEvents, selectedParam, selectedStations, labels, bucket, alpha });
        if (!alive) return;
        setState({ loading: false, result: res, error: null });
      } catch (e) {
        if (!alive) return;
        setState({ loading: false, result: null, error: e });
      }
    }
    run();
    return () => { alive = false; };
  }, [enabled, JSON.stringify(scopedEvents), selectedParam, JSON.stringify(selectedStations), bucket, timeRange, dateFrom, dateTo, JSON.stringify(labels), alpha]);

  return state;
}
