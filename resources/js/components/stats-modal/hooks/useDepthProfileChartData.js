import { useMemo } from 'react';
import useParamThresholds from './useParamThresholds';
import { normalizeDepthDatasets } from '../utils/shared';

export default function useDepthProfileChartData({ depthProfile, paramCode, appliedStandardId, classCode }) {
  const thr = useParamThresholds({ paramCode, appliedStandardId, classCode: classCode || undefined });

  const chartData = useMemo(() => {
    if (!depthProfile || !Array.isArray(depthProfile.datasets)) return null;
    if (thr.loading) return null; // avoid flash before thresholds ready

    const base = depthProfile.datasets.slice();
    // Assign distinct colors per month for depth profile lines
    const monthColors = {
      Jan: { stroke: '#E69F00', fill: '#E69F001A' }, // orange
      Feb: { stroke: '#56B4E9', fill: '#56B4E91A' }, // sky blue
      Mar: { stroke: '#009E73', fill: '#009E731A' }, // bluish green
      Apr: { stroke: '#F0E442', fill: '#F0E4421A' }, // yellow
      May: { stroke: '#0072B2', fill: '#0072B21A' }, // deep blue
      Jun: { stroke: '#D55E00', fill: '#D55E001A' }, // vermillion
      Jul: { stroke: '#CC79A7', fill: '#CC79A71A' }, // pink-purple
      Aug: { stroke: '#9A6324', fill: '#9A63241A' }, // brown
      Sep: { stroke: '#9467BD', fill: '#9467BD1A' }, // purple
      Oct: { stroke: '#8C001A', fill: '#8C001A1A' }, // dark red
      Nov: { stroke: '#3A5FCD', fill: '#3A5FCD1A' }, // vivid indigo
      Dec: { stroke: '#00CED1', fill: '#00CED11A' }, // turquoise
    };
    for (let i = 0; i < base.length; i++) {
      const ds = base[i];
      const label = String(ds?.label || '');
      const key = label.slice(0,3); // assume labels like 'Jan', 'Feb', etc.
      const col = monthColors[key];
      if (col) {
        base[i] = { ...ds, borderColor: col.stroke, backgroundColor: col.fill };
      }
    }
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
