import { useMemo } from 'react';
import { anchorByTimeRange } from '../utils/dataUtils';

export default function useAnchoredTimeRange(events, timeRange, dateFrom, dateTo) {
  return useMemo(() => anchorByTimeRange(Array.isArray(events) ? events : [], timeRange, dateFrom, dateTo), [events, timeRange, dateFrom, dateTo]);
}
