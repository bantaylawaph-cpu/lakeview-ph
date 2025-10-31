import { apiPublic } from '../../../lib/api';
import { runOneSample, runTwoSample } from '../statsAdapter';
import { fmt } from '../formatters';

// Core orchestration for AdvancedStat execution.
// Returns { computed } or throws typed errors with .code.
export default async function runAdvancedStat({
  inferredTest,
  selectedTest,
  paramCode,
  lakeId,
  compareValue,
  appliedStandardId,
  yearFrom,
  yearTo,
  depthMode,
  depthValue,
  organizationId,
  secondaryOrganizationId,
  stationId,
  cl = '0.95',
}) {
  const alpha = 1 - Number(cl || '0.95');

  // Build request for /stats/series
  const body = {
    parameter_code: paramCode,
    date_from: yearFrom ? `${yearFrom}-01-01` : undefined,
    date_to: yearTo ? `${yearTo}-12-31` : undefined,
    applied_standard_id: appliedStandardId || undefined,
  };
  if (depthMode === 'single' && depthValue) body.depth_m = Number(depthValue);
  if (organizationId) body.organization_id = organizationId;
  if (stationId && stationId !== 'all') body.station_id = Number(stationId);

  const otherLake = (compareValue && String(compareValue).startsWith('lake:')) ? Number(String(compareValue).split(':')[1]) : undefined;
  if (inferredTest === 'one-sample') {
    body.lake_id = Number(lakeId);
    // If comparing against a class threshold, include explicit class override so backend uses that class's thresholds
    if (compareValue && String(compareValue).startsWith('class:')) {
      const code = String(compareValue).split(':')[1] || '';
      if (code) body.class_code = code;
    }
  } else {
    const lakeIds = [Number(lakeId), otherLake].filter(Boolean);
    body.lake_ids = lakeIds;
    const orgIds = [organizationId || null, secondaryOrganizationId || null];
    if (orgIds.some(v => v)) body.organization_ids = lakeIds.map((_, idx) => orgIds[idx] ?? null);
  }

  const series = await apiPublic('/stats/series', { method: 'POST', body });
  const evalType = series?.evaluation_type;

  let computed;

  if (inferredTest === 'one-sample') {
    const values = (series?.sample_values || []).map(Number).filter(Number.isFinite);
    if (values.length < 2) {
      const err = new Error('Not enough data');
      err.code = 'NOT_ENOUGH_DATA';
      err.details = { n: values.length };
      throw err;
    }

    let mu0 = null;
    const thrMin = series?.threshold_min ?? null;
    const thrMax = series?.threshold_max ?? null;
    let alt = 'two-sided';
    if (evalType === 'range') {
      if (thrMin == null || thrMax == null) {
        const err = new Error('threshold_missing_range');
        err.code = 'THRESHOLD_MISSING_RANGE';
        throw err;
      }
      computed = await runOneSample({ selectedTest, values, mu0, alpha, evalType, thrMin, thrMax });
    } else {
      if (thrMin != null || thrMax != null) {
        if (evalType === 'min') mu0 = thrMin != null ? thrMin : thrMax;
        else if (evalType === 'max') mu0 = thrMax != null ? thrMax : thrMin;
        else mu0 = thrMax != null ? thrMax : thrMin;
        if (selectedTest === 't_one_sample' || selectedTest === 'wilcoxon_signed_rank' || selectedTest === 'sign_test') {
          if (evalType === 'min') alt = 'greater'; else if (evalType === 'max') alt = 'less';
        }
      }
      computed = await runOneSample({ selectedTest, values, mu0, alpha, evalType, thrMin, thrMax, alt });
    }
    const mean = computed.mean != null ? computed.mean : (values.reduce((a,b)=>a+b,0)/values.length);
    const thrMinEff = series?.threshold_min ?? null;
    const thrMaxEff = series?.threshold_max ?? null;
    if (evalType === 'min' && thrMinEff != null) {
      const dist = mean - thrMinEff; computed.range_distance = dist;
    } else if (evalType === 'max' && thrMaxEff != null) {
      const dist = thrMaxEff - mean; computed.range_distance = dist;
    } else if (evalType === 'range' && thrMinEff != null && thrMaxEff != null) {
      let dist = 0; if (mean < thrMinEff) dist = thrMinEff - mean; else if (mean > thrMaxEff) dist = mean - thrMaxEff; computed.range_distance = dist;
    }
  } else {
    const x = (series?.sample1_values || []).map(Number).filter(Number.isFinite);
    const y = (series?.sample2_values || []).map(Number).filter(Number.isFinite);
    if (x.length < 2 || y.length < 2) {
      const err = new Error('Not enough data');
      err.code = 'NOT_ENOUGH_DATA';
      err.details = { n1: x.length, n2: y.length };
      throw err;
    }
    computed = await runTwoSample({ selectedTest, sample1: x, sample2: y, alpha, evalType });
    const n1 = x.length, n2 = y.length;
    const thrMin = series?.threshold_min ?? null; const thrMax = series?.threshold_max ?? null;
    if (thrMin != null || thrMax != null) {
      const mean1 = computed.mean1 != null ? computed.mean1 : (x.reduce((a,b)=>a+b,0)/x.length);
      const mean2 = computed.mean2 != null ? computed.mean2 : (y.reduce((a,b)=>a+b,0)/y.length);
      const distCalc = (m) => {
        if (evalType === 'min' && thrMin != null) return m - thrMin;
        if (evalType === 'max' && thrMax != null) return thrMax - m;
        if (evalType === 'range' && thrMin != null && thrMax != null) { if (m < thrMin) return thrMin - m; if (m > thrMax) return m - thrMax; return 0; }
        return null;
      };
      const d1 = distCalc(mean1); const d2 = distCalc(mean2);
      if (d1 != null) computed.range_distance1 = d1;
      if (d2 != null) computed.range_distance2 = d2;
    }
  }

  if (series?.events) computed = { ...computed, events: series.events };
  return { computed };
}
