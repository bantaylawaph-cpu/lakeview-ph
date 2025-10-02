// resources/js/pages/AdminInterface/adminLogs.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import api, { buildQuery } from '../../lib/api';
import TableLayout from '../../layouts/TableLayout';
import TableToolbar from '../../components/table/TableToolbar';
import FilterPanel from '../../components/table/FilterPanel';
import { FiRefreshCw } from 'react-icons/fi';

// Local storage keys
const TABLE_ID = 'admin-audit-logs';
const VIS_KEY = `${TABLE_ID}::visible`;
const ADV_KEY = `${TABLE_ID}::filters_advanced`;

// Utility to format ISO -> local string
const fmt = (s) => (s ? new Date(s).toLocaleString() : '—');

export default function AdminAuditLogsPage() {
	const [me, setMe] = useState(null);
	const [rows, setRows] = useState([]);
	const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 25, total: 0 });
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	// Basic search placeholder (not wired to API param yet – backend has no generic q)
	const [q, setQ] = useState('');

	// Advanced filters
	const [fAction, setFAction] = useState(() => {
		try { return JSON.parse(localStorage.getItem(ADV_KEY) || '{}').action || ''; } catch { return ''; }
	});
	const [fModelType, setFModelType] = useState(() => {
		try { return JSON.parse(localStorage.getItem(ADV_KEY) || '{}').model_type || ''; } catch { return ''; }
	});
	const [fActorId, setFActorId] = useState(() => {
		try { return JSON.parse(localStorage.getItem(ADV_KEY) || '{}').actor_id || ''; } catch { return ''; }
	});
	const [fDateRange, setFDateRange] = useState(() => {
		try { const v = JSON.parse(localStorage.getItem(ADV_KEY) || '{}').date_range; return Array.isArray(v) ? v : [null,null]; } catch { return [null,null]; }
	});
	const [showAdvanced, setShowAdvanced] = useState(false);

	// Persist advanced filters
	useEffect(() => {
		try {
			localStorage.setItem(ADV_KEY, JSON.stringify({
				action: fAction || '',
				model_type: fModelType || '',
				actor_id: fActorId || '',
				date_range: fDateRange,
			}));
		} catch {}
	}, [fAction, fModelType, fActorId, fDateRange]);

	// Column visibility
	const defaultsVisible = useMemo(() => ({ event_at: true, model_type: true, model_id: true, action: true, actor_id: true, tenant_id: true, diff_keys: true }), []);
	const [visibleMap, setVisibleMap] = useState(() => {
		try { const raw = localStorage.getItem(VIS_KEY); return raw ? JSON.parse(raw) : defaultsVisible; } catch { return defaultsVisible; }
	});
	useEffect(() => { try { localStorage.setItem(VIS_KEY, JSON.stringify(visibleMap)); } catch {} }, [visibleMap]);

// Detail modal removed (no actions column)

	// Debounce ref for auto fetch
	const debounceRef = useRef(null);

	const page = meta.current_page ?? 1;
	const perPage = meta.per_page ?? 25;

	// Build params for API
	const buildParams = (overrides = {}) => {
		const params = { page, per_page: perPage, ...overrides };
		if (fAction) params.action = fAction;
		if (fModelType) params.model_type = fModelType;
		if (fActorId) params.actor_id = fActorId;
		const [from, to] = fDateRange;
		if (from) params.date_from = from;
		if (to) params.date_to = to;
		return params;
	};

	const fetchMe = async () => {
		try { const u = await api.get('/auth/me'); setMe(u); } catch { setMe(null); }
	};

	const effectiveBase = (me && me.role === 'org_admin' && me.tenant_id)
		? `/org/${me.tenant_id}/audit-logs`
		: '/admin/audit-logs';

	const fetchLogs = async (params = {}) => {
		setLoading(true); setError(null);
		try {
			const res = await api.get(effectiveBase, { params });
			const items = Array.isArray(res?.data) ? res.data : (res?.data?.data || res.data || res); // adapt paginator
			setRows(items);
			const m = res?.meta || {};
			setMeta({
				current_page: m.current_page || params.page || 1,
				last_page: m.last_page || 1,
				per_page: m.per_page || params.per_page || perPage,
				total: m.total || items.length,
			});
		} catch (e) {
			console.error('Failed to load audit logs', e);
			setError(e?.response?.data?.message || 'Failed to load');
		} finally { setLoading(false); }
	};

	// Initial load (user then logs)
	useEffect(() => { (async () => { await fetchMe(); })(); }, []);
	useEffect(() => { if (me) fetchLogs(buildParams({ page: 1 })); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [me]);

	// Auto refetch on advanced filter changes (debounced)
	useEffect(() => {
		if (!me) return;
		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => {
			fetchLogs(buildParams({ page: 1 }));
		}, 400);
		return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [fAction, fModelType, fActorId, fDateRange]);

// openDetail removed

	const columns = useMemo(() => {
		const truncate = (s, max=40) => (s.length > max ? s.slice(0, max) + '…' : s);
		const summarize = (r) => {
			const actor = r.actor_name || 'System';
			const model = r.model_type ? r.model_type.split('\\').pop() : 'Record';
			const idPart = r.model_id ? `#${r.model_id}` : '';
			const tenantFrag = r.tenant_name ? ` in tenant "${r.tenant_name}"` : '';
			let verb;
			switch (r.action) {
				case 'created': verb = 'created'; break;
				case 'updated': verb = 'updated'; break;
				case 'deleted': verb = 'soft-deleted'; break;
				case 'force_deleted': verb = 'permanently deleted'; break;
				case 'restored': verb = 'restored'; break;
				default: verb = r.action || 'acted on';
			}
			// Build change snippet for updated
			let changeFrag = '';
			if (r.action === 'updated' && r.before && r.after) {
				try {
					const keys = new Set([...Object.keys(r.before), ...Object.keys(r.after)]);
					const diffs = [];
					for (const k of keys) {
						const bv = r.before[k];
						const av = r.after[k];
						if (JSON.stringify(bv) !== JSON.stringify(av)) {
							const safeB = truncate(bv === null ? 'NULL' : String(bv));
							const safeA = truncate(av === null ? 'NULL' : String(av));
							diffs.push(`${k}: '${safeB}' -> '${safeA}'`);
						}
						if (diffs.length >= 3) break; // limit
					}
					if (diffs.length) {
						changeFrag = ' (' + diffs.join('; ') + (r.diff_keys && r.diff_keys.length > diffs.length ? ` +${r.diff_keys.length - diffs.length} more` : '') + ')';
					}
				} catch {}
			}
			const time = fmt(r.event_at);
			return `${actor} ${verb} ${model}${idPart}${tenantFrag}${changeFrag} at ${time}.`;
		};
		return [
			{ id: 'summary', header: 'Summary', render: r => summarize(r), width: 880 },
		];
	}, []);

	const visibleColumns = useMemo(() => columns.filter(c => visibleMap[c.id] !== false), [columns, visibleMap]);

	const normalized = useMemo(() => rows, [rows]);

const actions = [];

	const columnPickerAdapter = {
		columns: columns.map(c => ({ id: c.id, header: c.header })),
		visibleMap,
		onVisibleChange: (m) => setVisibleMap(m),
	};

	const advancedFields = [
		{ id: 'action', label: 'Action', type: 'text', value: fAction, onChange: v => setFAction(v) },
		{ id: 'model_type', label: 'Model Type', type: 'text', value: fModelType, onChange: v => setFModelType(v) },
		{ id: 'actor_id', label: 'Actor ID', type: 'number', value: fActorId, onChange: v => setFActorId(v) },
		{ id: 'date_range', label: 'Date Range', type: 'date-range', value: fDateRange, onChange: rng => setFDateRange(rng) },
	];

	const activeAdvCount = [fAction, fModelType, fActorId, fDateRange[0], fDateRange[1]].filter(Boolean).length;

	const clearAdvanced = () => {
		setFAction(''); setFModelType(''); setFActorId(''); setFDateRange([null,null]); fetchLogs(buildParams({ page: 1 }));
	};

	const goPage = (p) => fetchLogs(buildParams({ page: p }));

	return (
		<div className="container" style={{ padding: 16 }}>
			<div className="flex-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
				<h2 style={{ margin: 0 }}>Audit Logs</h2>
				<div style={{ display: 'flex', gap: 8 }}>
					<button className="pill-btn ghost" onClick={() => fetchLogs(buildParams())} title="Refresh"><FiRefreshCw /></button>
				</div>
			</div>
			<div className="card" style={{ padding: 12, borderRadius: 12, marginBottom: 12 }}>
				<TableToolbar
					tableId={TABLE_ID}
					search={{ value: q, onChange: (val) => setQ(val), placeholder: 'Search (local highlight only)…' }}
					filters={[]}
					columnPicker={columnPickerAdapter}
					onRefresh={() => fetchLogs(buildParams())}
					onToggleFilters={() => setShowAdvanced(s => !s)}
					filtersBadgeCount={activeAdvCount}
				/>
				<FilterPanel open={showAdvanced} fields={advancedFields} onClearAll={clearAdvanced} />
				{error && <div className="lv-error" style={{ padding: 8, color: 'var(--danger)' }}>{error}</div>}
			</div>
			<div className="card" style={{ padding: 12, borderRadius: 12 }}>
				{loading && <div className="lv-empty" style={{ padding: 16 }}>Loading…</div>}
				{!loading && normalized.length === 0 && <div className="lv-empty" style={{ padding: 16 }}>No audit logs.</div>}
				{!loading && normalized.length > 0 && (
					<TableLayout
							tableId={TABLE_ID}
							columns={visibleColumns}
							data={normalized.filter(r => {
								if (!q) return true;
								const summaryText = columns[0].render(r) || '';
								return summaryText.toLowerCase().includes(q.toLowerCase());
							})}
							pageSize={perPage}
							actions={actions}
							resetSignal={0}
							columnPicker={false}
							hidePager={true}
					/>
				)}
				<div className="lv-table-pager" style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
					<button className="pill-btn ghost sm" disabled={page <= 1} onClick={() => goPage(page - 1)}>&lt; Prev</button>
					<span className="pager-text">Page {page} of {meta.last_page} · {meta.total} total</span>
					<button className="pill-btn ghost sm" disabled={page >= meta.last_page} onClick={() => goPage(page + 1)}>Next &gt;</button>
				</div>
			</div>

			{/* Modal removed */}
		</div>
	);
}

