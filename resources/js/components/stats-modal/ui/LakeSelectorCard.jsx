import React, { useEffect, useMemo, useState } from 'react';
import LakeSelect from './LakeSelect';
import OrgSelect from './OrgSelect';
import useStationsCache from '../hooks/useStationsCache';
import useSampleEvents from '../hooks/useSampleEvents';
import { lakeName } from '../utils/shared';

export default function LakeSelectorCard({
  idx = 0,
  selection = { lakeId: '', orgId: '', collapsed: false },
  lakeOptions = [],
  selectedLakeIds = [],
  timeRange = 'all',
  dateFrom = '',
  dateTo = '',
  onChange = () => {},
  onRemove = () => {},
  onEventsUpdate = () => {},
  hasData = null,
}) {
  const lakeId = selection?.lakeId || '';
  const orgId = selection?.orgId || '';
  const collapsed = !!selection?.collapsed;

  // fetch events for this lake + org for current filters and for "all" (used by parent)
  const { events: eventsFiltered, loading: loadingFiltered } = useSampleEvents(lakeId, orgId, timeRange, dateFrom, dateTo);
  const { events: eventsAll } = useSampleEvents(lakeId, orgId, 'all', '', '');

  // stations/org options cache
  const { orgOptions, stationsByOrg, allStations, loading: loadingStations } = useStationsCache(lakeId);

  // derive org options if cache empty, from events
  const derivedOrgOptions = useMemo(() => {
    if (Array.isArray(orgOptions) && orgOptions.length) return orgOptions;
    const map = new Map();
    (Array.isArray(eventsAll) ? eventsAll : []).forEach((ev) => {
      const oid = ev.organization_id ?? ev.organization?.id ?? null;
      const oname = ev.organization_name ?? ev.organization?.name ?? null;
      if (oid && oname && !map.has(String(oid))) map.set(String(oid), { id: oid, name: oname });
    });
    return Array.from(map.values());
  }, [orgOptions, eventsAll]);

  // filtered lake options to prevent duplicates across cards
  const lakeSelectOptions = useMemo(() => {
    const selectedSet = new Set((selectedLakeIds || []).map(String));
    return (lakeOptions || []).filter((l) => !selectedSet.has(String(l.id)) || String(l.id) === String(lakeId));
  }, [lakeOptions, selectedLakeIds, lakeId]);

  // push events upward when they change
  useEffect(() => {
    onEventsUpdate(lakeId, orgId, { eventsFiltered, eventsAll, loadingFiltered });
  }, [lakeId, orgId, eventsFiltered, eventsAll, loadingFiltered]);

  const lakeLabel = useMemo(() => lakeName(lakeOptions, lakeId) || `Lake ${idx + 1}`, [lakeOptions, lakeId, idx]);

  return (
    <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <strong style={{ fontSize: 13 }}>{lakeLabel}</strong>
          {hasData === false && lakeId && orgId ? (
            <span aria-live="polite" style={{ fontSize: 12, opacity: 0.9, color: '#fca5a5' }}>No data for selected filters</span>
          ) : null}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button aria-label={collapsed ? 'Expand lake card' : 'Collapse lake card'} className="pill-btn" onClick={() => onChange({ collapsed: !collapsed })}>{collapsed ? 'Expand' : 'Collapse'}</button>
          <button aria-label="Remove lake" className="pill-btn" onClick={onRemove}>Remove</button>
        </div>
      </div>

      {!collapsed && (
        <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
          <LakeSelect aria-label={`Select lake ${idx + 1}`} lakes={lakeSelectOptions} value={lakeId} onChange={(e) => onChange({ lakeId: e.target.value, orgId: '' })} />
          <OrgSelect aria-label={`Select dataset source for lake ${idx + 1}`} options={derivedOrgOptions} value={orgId} onChange={(e) => onChange({ orgId: e.target.value })} required={false} placeholder="Select a dataset source" style={{ width:'100%' }} loading={!!lakeId && loadingStations} disabled={!lakeId} />
        </div>
      )}
    </div>
  );
}
