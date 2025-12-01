import { useMemo } from 'react';
import useParamThresholds from './useParamThresholds';
import { normalizeDepthDatasets } from '../utils/shared';

export default function useDepthProfileChartData({ depthProfile, paramCode, appliedStandardId, classCode }) {
  const thr = useParamThresholds({ paramCode, appliedStandardId, classCode: classCode || undefined });

  const chartData = useMemo(() => {
    if (!depthProfile || !Array.isArray(depthProfile.datasets)) return null;
    if (thr.loading) return null; // avoid flash before thresholds ready

    const base = depthProfile.datasets.slice();
    const maxDepth = depthProfile.maxDepth || 0;
    const tMin = (thr.min != null && Number.isFinite(Number(thr.min))) ? Number(thr.min) : null;
    const tMax = (thr.max != null && Number.isFinite(Number(thr.max))) ? Number(thr.max) : null;
    if (tMin != null) {
      base.push({
        label: 'Min',
        data: [{ x: tMin, y: 0 }, { x: tMin, y: Math.max(1, maxDepth) }],
        borderColor: 'rgba(16,185,129,1)',
        backgroundColor: 'transparent',
        pointRadius: 0,
        borderDash: [4,4],
        tension: 0,
        spanGaps: true,
        showLine: true,
        parsing: false,
      });
    }
    if (tMax != null) {
      base.push({
        label: 'Max',
        data: [{ x: tMax, y: 0 }, { x: tMax, y: Math.max(1, maxDepth) }],
        borderColor: 'rgba(239,68,68,1)',
        backgroundColor: 'transparent',
        pointRadius: 0,
        borderDash: [4,4],
        tension: 0,
        spanGaps: true,
        showLine: true,
        parsing: false,
      });
    }

    return { datasets: normalizeDepthDatasets(base) };
  }, [depthProfile, thr.min, thr.max, thr.loading]);

  return {
    chartData,
    loadingThresholds: thr.loading,
    unit: depthProfile?.unit || null,
    maxDepth: depthProfile?.maxDepth || null,
    hasMultipleDepths: depthProfile?.hasMultipleDepths || false,
    onlySurface: depthProfile?.onlySurface || false,
  };
}
