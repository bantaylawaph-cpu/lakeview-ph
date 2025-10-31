import React, { useState, useEffect, useRef, useImperativeHandle } from "react";
import { FiSettings, FiInfo } from 'react-icons/fi';
import Popover from "../common/Popover";
import { getToken } from "../../lib/api";
import { deriveOrgOptions } from "./data/fetchers";
import { alertSuccess, alertError } from '../../lib/alerts';
import ResultPanel from './ResultPanel';
import InfoModal from '../common/InfoModal';
import useDebounce from './hooks/useDebounce';
import useDisclosure from './hooks/useDisclosure';
import useSampleEvents from './hooks/useSampleEvents';
import YearClPopover from './ui/YearClPopover';
import TestSelector from './ui/TestSelector';
import LakeSelect from './ui/LakeSelect';
import CompareSelect from './ui/CompareSelect';
import OrgSelect from './ui/OrgSelect';
import StationSelect from './ui/StationSelect';
import StatusMessages from './ui/StatusMessages';
import ParamSelect from './ui/ParamSelect';
import StandardSelect from './ui/StandardSelect';
import DepthSelect from './ui/DepthSelect';
import useYearRange from './hooks/useYearRange';
import useParamEvaluationType from './hooks/useParamEvaluationType';
import useAvailableDepths from './hooks/useAvailableDepths';
import useStationsForLakeClass from './hooks/useStationsForLakeClass';
import useStandardsAndClasses from './hooks/useStandardsAndClasses';
import infoSectionsContent from './content/advancedStatHelp';
import { lakeName } from './utils/shared';
import { openPrintWindowWithStyle, buildAdvancedStatReport } from './utils/exportPdf';
import runAdvancedStat from './services/runAdvancedStat';

function AdvancedStat({ lakes = [], params = [], paramOptions: parentParamOptions = [] }, ref) {
  const [paramCode, setParamCode] = useState('');
  const [selectedTest, setSelectedTest] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showExactP, setShowExactP] = useState(false);
  const [showAllValues, setShowAllValues] = useState(false);
  const [lakeId, setLakeId] = useState('');
  const [classCode, setClassCode] = useState('');
  const [compareValue, setCompareValue] = useState('');
  const { yearFrom, setYearFrom, yearTo, setYearTo, yearError } = useYearRange('', '');
  const [organizationId, setOrganizationId] = useState('');
  const [secondaryOrganizationId, setSecondaryOrganizationId] = useState('');
  const [appliedStandardId, setAppliedStandardId] = useState('');
  const [depthMode, setDepthMode] = useState('all');
  const [depthValue, setDepthValue] = useState('');
  const [availableDepths, setAvailableDepths] = useState([]);
  const [cl, setCl] = useState('0.95');
  const paramOptions = (parentParamOptions && parentParamOptions.length ? parentParamOptions : (params || []));
  const { standards, classes } = useStandardsAndClasses();
  const [paramEvaluationType, setParamEvaluationType] = useState(null);

  const [stationId, setStationId] = useState('');

  const containerRef = useRef(null);
  const gearBtnRef = useRef(null);
  const { isOpen: infoOpen, onOpen: setInfoOpen, onClose: closeInfo } = useDisclosure();
  const { isOpen: showGearPopover, onOpen: openGearPopover, onClose: closeGearPopover, onToggle: toggleGearPopover } = useDisclosure();

  const debouncedYearFrom = useDebounce(yearFrom);
  const debouncedYearTo = useDebounce(yearTo);
  const { events: primaryEvents } = useSampleEvents(lakeId, null, 'custom', yearFrom, yearTo);
  // Unbounded events for deriving stable org options and year dropdowns
  const { events: primaryAllEvents } = useSampleEvents(lakeId, null, 'all', '', '');
  const otherLakeId = compareValue && String(compareValue).startsWith('lake:') ? Number(String(compareValue).split(':')[1]) : null;
  const { events: secondaryEvents } = useSampleEvents(otherLakeId, null, 'custom', yearFrom, yearTo);

  const orgOptions = React.useMemo(() => deriveOrgOptions(primaryAllEvents), [primaryAllEvents]);
  const secondaryOrgOptions = React.useMemo(() => deriveOrgOptions(secondaryEvents), [secondaryEvents]);
  const inferredTest = React.useMemo(() => {
    if (!compareValue) return 'one-sample';
    if (String(compareValue).startsWith('lake:')) return 'two-sample';
    if (String(compareValue).startsWith('class:')) return 'one-sample';
    return 'one-sample';
  }, [compareValue]);

  const paramHasRange = React.useMemo(() => {
    return paramEvaluationType === 'range';
  }, [paramEvaluationType]);

  const allowedTests = React.useMemo(() => {
    if (inferredTest === 'one-sample') {
      return paramHasRange ? ['shapiro_wilk','tost','tost_wilcoxon'] : ['shapiro_wilk','t_one_sample','wilcoxon_signed_rank','sign_test'];
    }
    return ['t_student','t_welch','levene','mann_whitney','mood_median_test'];
  }, [inferredTest, paramHasRange]);

  useEffect(() => {
    if (selectedTest && !allowedTests.includes(selectedTest)) {
      setSelectedTest('');
      setResult(null);
    }
  }, [allowedTests, selectedTest]);

  const runDisabled = React.useMemo(() => {
    return false;
  }, []);
  

  const depthsFromHook = useAvailableDepths({
    paramCode,
    lakeId,
    compareValue,
    yearFrom: debouncedYearFrom,
    yearTo: debouncedYearTo,
    organizationId,
    stationId,
    inferredTest,
  });
  useEffect(() => { setAvailableDepths(depthsFromHook || []); }, [depthsFromHook]);
  useEffect(() => {
    if (depthMode === 'single' && depthValue && !availableDepths.includes(Number(depthValue))) setDepthValue('');
  }, [availableDepths, depthMode, depthValue]);

  const stationOptions = useStationsForLakeClass({ lakeId, organizationId, paramCode, yearFrom, yearTo, enabled: inferredTest === 'one-sample' }) || [];

  // Derive available years from the currently selected dataset (primary lake + selected organization)
  const availableYears = React.useMemo(() => {
    const events = Array.isArray(primaryAllEvents) ? primaryAllEvents : [];
    const filtered = organizationId
      ? events.filter(ev => {
          const oid = ev.organization_id ?? ev.organization?.id ?? null;
          return String(oid || '') === String(organizationId || '');
        })
      : events;
    const set = new Set();
    for (const ev of filtered) {
      const dstr = ev.sampled_at || ev.date;
      if (!dstr) continue;
      const y = new Date(dstr).getFullYear();
      if (!Number.isNaN(y)) set.add(String(y));
    }
    return Array.from(set).sort((a,b)=> Number(b) - Number(a));
  }, [primaryAllEvents, organizationId]);

  useEffect(() => {
    if ((selectedTest === 'tost' || selectedTest === 'tost_wilcoxon') && (!paramHasRange || inferredTest !== 'one-sample')) {
      setSelectedTest('');
      setResult(null);
    }
  }, [selectedTest, paramHasRange, inferredTest]);

  useEffect(() => {
    if (!compareValue || !String(compareValue).startsWith('lake:')) {
      if (secondaryOrganizationId) setSecondaryOrganizationId('');
    }
  }, [compareValue, secondaryOrganizationId]);

  // When switching to lake vs lake (two-sample), clear Applied Standard so it reverts to default/placeholder
  useEffect(() => {
    if (inferredTest === 'two-sample' && appliedStandardId) {
      setAppliedStandardId('');
    }
  }, [inferredTest]);

  useEffect(() => {
    const isLake = compareValue && String(compareValue).startsWith('lake:');
    const other = isLake ? String(compareValue).split(':')[1] : '';
    if (isLake && other && String(other) === String(lakeId)) {
      setCompareValue('');
      setSecondaryOrganizationId('');
    }
  }, [lakeId, compareValue]);

  useEffect(() => { if (result) setResult(null); }, [debouncedYearFrom, debouncedYearTo]);


  const evalTypeHook = useParamEvaluationType({
    enabled: inferredTest === 'one-sample',
    lakeId,
    paramCode,
    appliedStandardId,
    classCodeOverride: (inferredTest === 'one-sample' && compareValue && String(compareValue).startsWith('class:')) ? classCode : undefined,
  });
  useEffect(() => { setParamEvaluationType(evalTypeHook || null); }, [evalTypeHook]);

  const run = async () => {
    setLoading(true); setError(null); setResult(null); setShowExactP(false);
    if (!lakeId) { alertError('Missing Lake', 'Please select a Primary Lake before running the test.'); setLoading(false); return; }
    if (!organizationId) { alertError('Missing Dataset Source', 'Please select a Dataset Source before running the test.'); setLoading(false); return; }
  if (inferredTest !== 'two-sample' && !appliedStandardId) { alertError('Missing Applied Standard', 'Please select an Applied Standard before running the test.'); setLoading(false); return; }
    if (!paramCode) { alertError('Missing Parameter', 'Please select a Parameter before running the test.'); setLoading(false); return; }
    if (!selectedTest) { alertError('Missing Test', 'Please select a Test before running the test.'); setLoading(false); return; }
    if (!allowedTests.includes(selectedTest)) { alertError('Invalid Test Selection', 'The selected test is not applicable for the current comparison mode.'); setLoading(false); return; }
    if (inferredTest === 'two-sample') {
      if (!compareValue || !String(compareValue).startsWith('lake:')) { alertError('Missing Comparison Lake', 'For two-sample tests, please select a lake to compare against.'); setLoading(false); return; }
      if (!secondaryOrganizationId) { alertError('Missing Secondary Dataset Source', 'Please select a Secondary Dataset Source for the comparison lake.'); setLoading(false); return; }
    } else if (inferredTest === 'one-sample') {
      if (!compareValue) { alertError('Missing Comparison', 'Please select a Class or Lake to compare against.'); setLoading(false); return; }
      if (String(compareValue).startsWith('class:') && stationId === '') { alertError('Missing Station Selection', 'Please select a station or "All Stations" for lake vs class threshold tests.'); setLoading(false); return; }
    }
    if (yearError) { alertError('Invalid Year Range', yearError); setLoading(false); return; }
    try {
      const { computed } = await runAdvancedStat({
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
        cl,
      });
      
      const minVal = computed.threshold_min != null ? Number(computed.threshold_min) : null;
      const maxVal = computed.threshold_max != null ? Number(computed.threshold_max) : null;
      const mu0 = computed.mu0 != null ? Number(computed.mu0) : null;
      let hasThreshold = false;
      if (minVal != null && maxVal != null) hasThreshold = true;
      else if (minVal != null) hasThreshold = true;
      else if (maxVal != null) hasThreshold = true;
      else if (mu0 != null) hasThreshold = true;
      
      if (!hasThreshold) {
        const isThresholdComparison = inferredTest === 'one-sample' && compareValue && String(compareValue).startsWith('class:') && selectedTest !== 'shapiro_wilk';
        if (isThresholdComparison) {
          alertError('No Threshold Available', 'No threshold exists for this parameter under the selected standard. Please select a different parameter or standard.');
          setLoading(false);
          return;
        }
      }
      
      setResult(computed);
      alertSuccess('Test Result', 'Computed statistical test successfully.');
    } catch (e) {
      console.error('[Stats] run error', e);
      setError(e?.message || 'Failed');
      if (e?.code === 'THRESHOLD_MISSING_RANGE' || e?.message === 'threshold_missing_range') {
        alertError('Threshold missing', 'Range evaluation requires both lower and upper thresholds.');
      } else if (e?.code === 'NOT_ENOUGH_DATA') {
        if (inferredTest === 'two-sample' && e?.details?.n1 != null && e?.details?.n2 != null) {
          const otherLake = (compareValue && String(compareValue).startsWith('lake:')) ? Number(String(compareValue).split(':')[1]) : undefined;
          const primaryName = lakeName(lakes, lakeId) || `Lake ${lakeId}`;
          const secondaryName = otherLake ? (lakeName(lakes, otherLake) || `Lake ${otherLake}`) : 'Comparison lake';
          alertError('Not enough data', `Not enough samples: ${primaryName} has ${e.details.n1}, ${secondaryName} has ${e.details.n2}; need at least 2 each.`);
        } else {
          alertError('Not enough data', 'Not enough samples to run the test.');
        }
      } else {
        alertError('Test Error', e?.message || 'Failed');
      }
    } finally { setLoading(false); }
  };

  const clearAll = () => {
    setLakeId('');
    setClassCode('');
    setCompareValue('');
    setYearFrom('');
    setYearTo('');
    setOrganizationId('');
    setSecondaryOrganizationId('');
    setAppliedStandardId('');
    setParamCode('');
    setSelectedTest('');
    setResult(null);
    setError(null);
    setShowAllValues(false);
    setShowExactP(false);
    setParamEvaluationType(null);
    setStationId('');
  };

  const exportPdf = async () => {
    try {
      const token = getToken();
      if (!token) {
        await alertError('Sign in required', 'You must be a registered user to export results.');
        return;
      }
      if (!result) {
        await alertError('No results to export', 'Please run a test before exporting results to PDF.');
        return;
      }
      const title = `Advanced statistics - ${paramCode || ''}`;
      const { css, bodyHtml } = buildAdvancedStatReport({ result, paramCode, paramOptions, lakes, lakeId, compareValue, title });
      openPrintWindowWithStyle({ title, css, bodyHtml });
    } catch (e) {
      console.error('Export failed', e);
    }
  };

  useImperativeHandle(ref, () => ({ clearAll, exportPdf }));

  return (
  <div ref={containerRef} className="insight-card" style={{ position:'relative', minWidth: 0, maxWidth: '100%', padding: 8 }}>
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
      <h4 style={{ margin: '2px 0 8px' }}>Advanced Statistics</h4>
      <button
        type="button"
        className="pill-btn liquid"
        title="Explain this tool"
        onClick={() => setInfoOpen(true)}
        style={{ width:32, height:32, padding:0, borderRadius:'50%', display:'inline-flex', alignItems:'center', justifyContent:'center' }}
      >
        <FiInfo size={14} />
      </button>
    </div>
  <div>
  <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr 1fr 1fr', gridTemplateRows:'repeat(2, auto)', gap:10, alignItems:'start', fontSize:13, minWidth:0 }}>
      <div style={{ gridColumn: '1 / span 1', minWidth:0 }}>
        <LakeSelect lakes={lakes} value={lakeId} onChange={e=>{ setLakeId(e.target.value); setResult(null); }} />
      </div>
      <div style={{ gridColumn: '2 / span 1', minWidth:0 }}>
        <CompareSelect lakes={lakes} classes={classes} lakeId={lakeId} value={compareValue} onChange={e=>{
          const v = e.target.value; setCompareValue(v); setResult(null); if (v && String(v).startsWith('class:')) setClassCode(String(v).split(':')[1] || '');
        }} />
      </div>
      <div style={{ gridColumn: '3 / span 1', minWidth:0 }}>
        <OrgSelect required options={orgOptions} value={organizationId} onChange={e=>{ setOrganizationId(e.target.value); setResult(null); }} />
      </div>
      {compareValue && String(compareValue).startsWith('lake:') ? (
        <div style={{ gridColumn: '4 / span 1', minWidth:0 }}>
          <OrgSelect required options={secondaryOrgOptions} value={secondaryOrganizationId} onChange={e=>{ setSecondaryOrganizationId(e.target.value); setResult(null); }} placeholder="Secondary Dataset Source" />
        </div>
      ) : (
        <div style={{ gridColumn: '4 / span 1', minWidth:0 }}>
          <StationSelect options={stationOptions} value={stationId} onChange={e=>{ setStationId(e.target.value); setResult(null); }} disabled={!organizationId || !compareValue || !String(compareValue).startsWith('class:')} />
        </div>
      )}

      <div style={{ gridColumn: '1 / span 1', minWidth:0 }}>
        <StandardSelect
          required
          standards={standards}
          value={appliedStandardId}
          onChange={e=>{ setAppliedStandardId(e.target.value); setResult(null); }}
          disabled={inferredTest === 'two-sample'}
          title={inferredTest === 'two-sample' ? 'Not used for lake vs lake comparison' : undefined}
        />
      </div>
      <div style={{ gridColumn: '2 / span 1', minWidth:0 }}>
        <div style={{ display:'flex', gap:6 }}>
          <ParamSelect options={paramOptions} value={paramCode} onChange={e=>{ setParamCode(e.target.value); setResult(null); }} />
          <DepthSelect
            availableDepths={availableDepths}
            inferredTest={inferredTest}
            compareValue={compareValue}
            paramCode={paramCode}
            depthMode={depthMode}
            depthValue={depthValue}
            onChange={({ mode, value }) => { setDepthMode(mode); setDepthValue(value); setResult(null); }}
          />
        </div>
      </div>
      <div style={{ gridColumn: '3 / span 2', display:'flex', justifyContent:'flex-end', minWidth:0 }}>
        <div style={{ display:'flex', gap:8, width:'100%' }}>
            <TestSelector inferredTest={inferredTest} paramHasRange={paramHasRange} selectedTest={selectedTest} onChange={(v)=>{ setSelectedTest(v); setResult(null); }} />
        </div>
      </div>
    </div>

      <div style={{ marginTop:10, display:'flex', justifyContent:'flex-end', alignItems:'center', gap:8 }}>
      <div style={{ display:'flex', gap:8, marginLeft: 'auto' }}>
        <button ref={gearBtnRef} aria-label="Advanced options" title="Advanced options" className="pill-btn" onClick={toggleGearPopover} style={{ padding:'6px 10px', display:'inline-flex', alignItems:'center', justifyContent:'center' }}>
          <FiSettings size={16} />
        </button>
  <button className="pill-btn liquid" onClick={run} style={{ padding:'6px 10px' }}>{loading ? 'Running...' : 'Run Test'}</button>
      </div>
    </div>

    <Popover anchorRef={gearBtnRef} open={showGearPopover} onClose={closeGearPopover} minWidth={320}>
      <YearClPopover
        yearFrom={yearFrom}
        yearTo={yearTo}
        cl={cl}
        yearError={yearError}
        availableYears={availableYears}
        onChangeYearFrom={(v)=>setYearFrom(v)}
        onChangeYearTo={(v)=>setYearTo(v)}
        onChangeCl={(v)=>{ setCl(v); setResult(null); }}
        onClose={closeGearPopover}
      />
    </Popover>

    <StatusMessages error={error} yearError={yearError} />

    {result && (
      <div style={{ marginTop:8 }}>
        <ResultPanel
          result={result}
          paramCode={paramCode}
          paramOptions={paramOptions}
          classCode={classCode}
          lakes={lakes}
          cl={cl}
          lakeId={lakeId}
          compareValue={compareValue}
          showAllValues={showAllValues}
          setShowAllValues={setShowAllValues}
          showExactP={showExactP}
          setShowExactP={setShowExactP}
        />
      </div>
    )}
  <InfoModal open={infoOpen} onClose={() => setInfoOpen(false)} title="Advanced Statistics – What it does and how to use it" sections={infoSectionsContent} />
  </div>
    </div>
  );
}

export default React.forwardRef(AdvancedStat);
