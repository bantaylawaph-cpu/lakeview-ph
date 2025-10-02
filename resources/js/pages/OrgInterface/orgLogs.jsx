// resources/js/pages/OrgInterface/orgLogs.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import api from '../../lib/api';
import TableLayout from '../../layouts/TableLayout';
import TableToolbar from '../../components/table/TableToolbar';
import FilterPanel from '../../components/table/FilterPanel';
import { FiRefreshCw } from 'react-icons/fi';

// Local storage keys
const TABLE_ID = 'org-audit-logs';
const ADV_KEY = `${TABLE_ID}::filters_advanced`;

const fmt = (s) => (s ? new Date(s).toLocaleString() : '—');

export default function OrgAuditLogsPage() {
  const [me, setMe] = useState(null);
  // No tenant picker; this page is strictly for org_admins using their own tenant_id
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 25, total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [q, setQ] = useState('');

  // Advanced filters (action + date range only for simplicity)
  const [fAction, setFAction] = useState(() => { try { return JSON.parse(localStorage.getItem(ADV_KEY) || '{}').action || ''; } catch { return ''; } });
  const [fDateRange, setFDateRange] = useState(() => { try { const v = JSON.parse(localStorage.getItem(ADV_KEY) || '{}').date_range; return Array.isArray(v) ? v : [null,null]; } catch { return [null,null]; } });
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(ADV_KEY, JSON.stringify({ action: fAction, date_range: fDateRange })); } catch {}
  }, [fAction, fDateRange]);

  const debounceRef = useRef(null);
  const page = meta.current_page ?? 1;
  const perPage = meta.per_page ?? 25;

  const fetchMe = async () => {
    try { const u = await api.get('/auth/me'); setMe(u); } catch { setMe(null); }
  };

  const isOrgAdmin = me?.role === 'org_admin';
  const effectiveTenantId = isOrgAdmin ? me?.tenant_id : null;

  const buildParams = (overrides={}) => {
    const params = { page, per_page: perPage, ...overrides };
    if (fAction) params.action = fAction;
    const [from, to] = fDateRange; if (from) params.date_from = from; if (to) params.date_to = to;
    return params;
  };

  const fetchLogs = async (params={}) => {
    if (!effectiveTenantId) return; // need a tenant for org route
    setLoading(true); setError(null);
    try {
      const base = `/org/${effectiveTenantId}/audit-logs`;
      const res = await api.get(base, { params });
      const items = Array.isArray(res?.data) ? res.data : (res?.data?.data || res.data || res);
      setRows(items);
      // Laravel paginator puts pagination keys at top-level (no meta object)
      const m = res && typeof res === 'object' && !Array.isArray(res) ? res : {};
      setMeta({
        current_page: m.current_page ?? params.page ?? 1,
        last_page: m.last_page ?? 1,
        per_page: m.per_page ?? params.per_page ?? perPage,
        total: m.total ?? items.length,
      });
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchMe(); }, []);
  useEffect(() => { if (effectiveTenantId) fetchLogs(buildParams({ page: 1 })); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [effectiveTenantId]);

  useEffect(() => {
  if (!effectiveTenantId) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { fetchLogs(buildParams({ page: 1 })); }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fAction, fDateRange]);

  const columns = useMemo(() => {
    const truncate = (s, max=40) => (s.length > max ? s.slice(0, max) + '…' : s);
    const summarize = (r) => {
      const actor = r.actor_name || 'System';
      const model = r.model_type ? r.model_type.split('\\').pop() : 'Record';
      const idPart = r.model_id ? `#${r.model_id}` : '';
      let verb;
      switch (r.action) {
        case 'created': verb = 'created'; break;
        case 'updated': verb = 'updated'; break;
        case 'deleted': verb = 'soft-deleted'; break;
        case 'force_deleted': verb = 'permanently deleted'; break;
        case 'restored': verb = 'restored'; break;
        default: verb = r.action || 'acted on';
      }
      let changeFrag = '';
      if (r.action === 'updated' && r.before && r.after) {
        try {
          const keys = new Set([...Object.keys(r.before), ...Object.keys(r.after)]);
          const diffs = [];
          for (const k of keys) {
            const bv = r.before[k]; const av = r.after[k];
            if (JSON.stringify(bv) !== JSON.stringify(av)) {
              const safeB = truncate(bv === null ? 'NULL' : String(bv));
              const safeA = truncate(av === null ? 'NULL' : String(av));
              diffs.push(`${k}: '${safeB}' -> '${safeA}'`);
            }
            if (diffs.length >= 3) break;
          }
          if (diffs.length) {
            changeFrag = ' (' + diffs.join('; ') + (r.diff_keys && r.diff_keys.length > diffs.length ? ` +${r.diff_keys.length - diffs.length} more` : '') + ')';
          }
        } catch {}
      }
      const time = fmt(r.event_at);
      return `${actor} ${verb} ${model}${idPart}${changeFrag} at ${time}.`;
    };
    return [
      { id: 'summary', header: 'Summary', render: r => summarize(r), width: 900 },
    ];
  }, []);

  const filtered = useMemo(() => {
    if (!q) return rows;
    const lc = q.toLowerCase();
    return rows.filter(r => (columns[0].render(r) || '').toLowerCase().includes(lc));
  }, [rows, q, columns]);

  const advancedFields = [
    { id: 'action', label: 'Action', type: 'text', value: fAction, onChange: v => setFAction(v) },
    { id: 'date_range', label: 'Date Range', type: 'date-range', value: fDateRange, onChange: v => setFDateRange(v) },
  ];
  const activeAdvCount = [fAction, fDateRange[0], fDateRange[1]].filter(Boolean).length;
  const clearAdvanced = () => { setFAction(''); setFDateRange([null,null]); fetchLogs(buildParams({ page: 1 })); };

  return (
    <div className="container" style={{ padding: 16 }}>
      <div className="flex-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Organization Audit Logs</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="pill-btn ghost" onClick={() => fetchLogs(buildParams())} title="Refresh"><FiRefreshCw /></button>
        </div>
      </div>
      {!isOrgAdmin && (
        <div className="card" style={{ padding: 16, borderRadius: 12, marginBottom: 12 }}>
          <div style={{ fontSize: 14 }}>
            This page is only available to organization administrators.
          </div>
        </div>
      )}
      {isOrgAdmin && <div className="card" style={{ padding: 12, borderRadius: 12, marginBottom: 12 }}>
        <TableToolbar
          tableId={TABLE_ID}
          search={{ value: q, onChange: setQ, placeholder: 'Search summaries…' }}
          filters={[]}
          columnPicker={false}
          onRefresh={() => fetchLogs(buildParams())}
          onToggleFilters={() => setShowAdvanced(s => !s)}
          filtersBadgeCount={activeAdvCount}
        />
        <FilterPanel open={showAdvanced} fields={advancedFields} onClearAll={clearAdvanced} />
        {error && <div className="lv-error" style={{ padding: 8, color: 'var(--danger)' }}>{error}</div>}
      </div>}
      {isOrgAdmin && <div className="card" style={{ padding: 12, borderRadius: 12 }}>
        {loading && <div style={{ padding: 16 }}>Loading…</div>}
        {!loading && filtered.length === 0 && <div style={{ padding: 16 }}>No audit logs.</div>}
        {!loading && filtered.length > 0 && (
          <TableLayout
            tableId={TABLE_ID}
            columns={columns}
            data={filtered}
            pageSize={perPage}
            actions={[]}
            resetSignal={0}
            columnPicker={false}
            hidePager={true}
          />
        )}
        <div className="lv-table-pager" style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="pill-btn ghost sm" disabled={page <= 1} onClick={() => fetchLogs(buildParams({ page: page - 1 }))}>{'< Prev'}</button>
          <span className="pager-text">Page {meta.current_page} of {meta.last_page} · {meta.total} total</span>
          <button className="pill-btn ghost sm" disabled={page >= meta.last_page} onClick={() => fetchLogs(buildParams({ page: page + 1 }))}>{'Next >'}</button>
        </div>
      </div>}
    </div>
  );
}
