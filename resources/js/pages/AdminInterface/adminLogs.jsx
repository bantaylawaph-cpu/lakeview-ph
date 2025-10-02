// resources/js/pages/AdminInterface/adminLogs.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import api, { buildQuery } from '../../lib/api';
import TableLayout from '../../layouts/TableLayout';
import TableToolbar from '../../components/table/TableToolbar';
import FilterPanel from '../../components/table/FilterPanel';
import { FiRefreshCw, FiEye } from 'react-icons/fi';
import LoadingSpinner from '../../components/LoadingSpinner';

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

	// Detail modal state
	const [detailRow, setDetailRow] = useState(null);
	const openDetail = (row) => setDetailRow(row);
	const closeDetail = () => setDetailRow(null);

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
	const defaultsVisible = useMemo(() => ({ summary: true, actions: true }), []);
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
		// Helper utils for improved summaries
		const truncate = (s, max = 80) => (s && s.length > max ? s.slice(0, max) + '…' : s);
		const labelize = (k) => {
			if (!k) return k;
			const overrides = { phone: 'Phone', address: 'Address', type: 'Type', tenant_type: 'Type' };
			if (overrides[k]) return overrides[k];
			return k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
		};
		const summarize = (r) => {
			const actor = r.actor_name || 'System';
			const modelBase = r.model_type ? r.model_type.split('\\').pop() : 'Record';
			const modelIdPart = r.model_id ? `#${r.model_id}` : '';
			const entityName = (
				// Prefer an explicit name (after -> before fallbacks)
				(r.after && (r.after.name || r.after.title)) ||
				(r.before && (r.before.name || r.before.title)) ||
				r.tenant_name ||
				null
			);
			let verb;
			switch (r.action) {
				case 'created': verb = 'created'; break;
				case 'updated': verb = 'updated'; break;
				case 'deleted': verb = 'soft-deleted'; break;
				case 'force_deleted': verb = 'permanently deleted'; break;
				case 'restored': verb = 'restored'; break;
				default: verb = r.action || 'acted on';
			}
			// Special richer formatting for updates w/ before & after
			if (verb === 'updated' && r.before && r.after) {
				try {
					const keys = r.diff_keys && Array.isArray(r.diff_keys) && r.diff_keys.length
						? r.diff_keys
						: Array.from(new Set([...Object.keys(r.before), ...Object.keys(r.after)]));
					const diffs = [];
					for (const k of keys) {
						const bv = r.before[k];
						const av = r.after[k];
						if (JSON.stringify(bv) === JSON.stringify(av)) continue;
						const safeB = truncate(bv === null ? 'NULL' : String(bv));
						const safeA = truncate(av === null ? 'NULL' : String(av));
						diffs.push(`${labelize(k)} from '${safeB}' to '${safeA}'`);
					}
					// Limit very long lists but show +N more
					const MAX_SHOW = 8;
					let changesTxt;
					if (diffs.length > MAX_SHOW) {
						changesTxt = diffs.slice(0, MAX_SHOW).join('; ') + `; +${diffs.length - MAX_SHOW} more`;
					} else {
						changesTxt = diffs.join('; ');
					}
					const displayEntity = entityName
						? `${entityName}${modelIdPart ? ` (${modelBase}${modelIdPart})` : ''}`
						: `${modelBase}${modelIdPart}`;
					return `${actor} updated ${displayEntity}. Changes: ${changesTxt} at ${fmt(r.event_at)}.`;
				} catch (e) {
					// Fallback to generic below
				}
			}
			// Generic fallback (create/delete/etc or failed diff)
			const displayEntity = entityName
				? `${entityName}${modelIdPart ? ` (${modelBase}${modelIdPart})` : ''}`
				: `${modelBase}${modelIdPart}`;
			return `${actor} ${verb} ${displayEntity} at ${fmt(r.event_at)}.`;
		};
		return [
			{ id: 'summary', header: 'Summary', render: r => {
				const actor = r.actor_name || 'System Admin';
				const modelBase = r.model_type ? r.model_type.split('\\').pop() : 'Record';
				const idPart = r.model_id ? `#${r.model_id}` : '';
				let verb;
				switch (r.action) {
					case 'created': verb = 'Created'; break;
					case 'updated': verb = 'Updated'; break;
					case 'deleted': verb = 'Deleted'; break;
					case 'force_deleted': verb = 'Force Deleted'; break;
					case 'restored': verb = 'Restored'; break;
					default: verb = (r.action || 'Did').replace(/\b\w/g, c=>c.toUpperCase());
				}
				return `${actor} ${verb} ${modelBase} ${idPart}`.trim();
			}, width: 520 },
			{ id: 'actions', header: 'Action', width: 80, render: r => (
				<button className="pill-btn ghost sm" title="View Details" onClick={() => openDetail(r)} style={{ display:'flex', alignItems:'center', gap:4 }}>
					<FiEye />
				</button>
			)},
		];
	}, [openDetail]);

	const visibleColumns = useMemo(() => columns.filter(c => visibleMap[c.id] !== false), [columns, visibleMap]);

	const normalized = useMemo(() => rows, [rows]);

	const actions = [];

	// Build change lines for modal
	const buildChanges = (row) => {
		if (!row || !row.before || !row.after) return [];
		const keys = row.diff_keys && Array.isArray(row.diff_keys) && row.diff_keys.length
			? row.diff_keys
			: Array.from(new Set([...Object.keys(row.before), ...Object.keys(row.after)]));
		const lines = [];
		const prettify = (k) => k.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
		for (const k of keys) {
			const b = row.before[k];
			const a = row.after[k];
			if (JSON.stringify(b) === JSON.stringify(a)) continue;
			const show = (v) => (v === null || v === undefined || v === '') ? 'NULL' : String(v);
			lines.push(`${prettify(k)}: ${show(b)} → ${show(a)}`);
		}
		return lines;
	};

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
		<div className="container" style={{ padding: 16, position:'relative' }}>
			<div className="dashboard-card" style={{ marginBottom: 12 }}>
				<div className="dashboard-card-header">
					<div className="dashboard-card-title">
						<FiEye />
						<span>Audit Logs</span>
					</div>
				</div>
				<p className="muted" style={{ marginTop: 4 }}>View system audit logs and activity history.</p>
			</div>
			<div className="card" style={{ padding: 12, borderRadius: 12, marginBottom: 12 }}>
				<TableToolbar
					tableId={TABLE_ID}
					search={{ value: q, onChange: (val) => setQ(val), placeholder: 'Search...' }}
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
				{loading && <div style={{ padding: 16 }}><LoadingSpinner label="Loading audit logs…" /></div>}
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

		{detailRow && (
			<div className="lv-modal-backdrop" style={{ position:'absolute', inset:0, background:'transparent', display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'40px 20px', zIndex:20 }} onClick={closeDetail}>
				<div className="lv-modal" style={{ background:'#fff', borderRadius:14, padding:24, maxWidth:720, width:'100%', position:'relative', boxShadow:'0 10px 24px -4px rgba(0,0,0,0.25)', animation:'fadeInScale .18s ease' }} onClick={e=>e.stopPropagation()}>
					<button onClick={closeDetail} style={{ position:'absolute', top:10, right:10 }} className="pill-btn ghost sm">✕</button>
					<h3 style={{ marginTop:0, marginBottom:16, fontSize:20 }}>Audit Log Details</h3>
					<div style={{ fontSize:14, lineHeight:1.55, display:'grid', rowGap:6, paddingBottom:12, borderBottom:'1px solid #e5e7eb' }}>
						<div style={{ padding:'4px 0' }}><strong style={{ width:90, display:'inline-block' }}>User:</strong> {detailRow.actor_name || 'System Admin'}</div>
						<div style={{ padding:'4px 0' }}><strong style={{ width:90, display:'inline-block' }}>Action:</strong> {(() => {
							const model = detailRow.model_type ? detailRow.model_type.split('\\').pop() : 'Record';
							return `${(detailRow.action || 'updated').replace(/_/g,' ')} ${model} #${detailRow.model_id || ''}`.trim();
						})()}</div>
						<div style={{ padding:'4px 0' }}><strong style={{ width:90, display:'inline-block' }}>Timestamp:</strong> {fmt(detailRow.event_at)}</div>
					</div>
					{detailRow.action === 'updated' && detailRow.before && detailRow.after && (
						<div style={{ marginTop:18 }}>
							<strong style={{ fontSize:13, letterSpacing:0.5, textTransform:'uppercase', color:'#374151' }}>Changes</strong>
							<ul style={{ marginTop:10, paddingLeft:18, display:'flex', flexDirection:'column', gap:6 }}>
								{buildChanges(detailRow).map((ln,i)=>(<li key={i} style={{ fontSize:13.5, background:'#f9fafb', padding:'6px 10px', borderRadius:6, border:'1px solid #f0f2f5' }}>{ln}</li>))}
								{buildChanges(detailRow).length === 0 && <li style={{ fontSize:14 }}>No field differences detected.</li>}
							</ul>
						</div>
					)}
					{detailRow.action !== 'updated' && (
						<div style={{ marginTop:18, fontSize:13.5, fontStyle:'italic', color:'#4b5563' }}>No granular change list for this action.</div>
					)}
				</div>
			</div>
		)}
	</div>
	);
}

