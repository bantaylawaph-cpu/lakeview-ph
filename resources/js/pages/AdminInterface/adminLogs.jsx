// resources/js/pages/AdminInterface/adminLogs.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import api, { buildQuery, me as fetchMe } from '../../lib/api';
import { cachedGet } from '../../lib/httpCache';
import TableLayout from '../../layouts/TableLayout';
import TableToolbar from '../../components/table/TableToolbar';
import FilterPanel from '../../components/table/FilterPanel';
import { FiRefreshCw, FiEye } from 'react-icons/fi';
import LoadingSpinner from '../../components/LoadingSpinner';
import Modal from '../../components/Modal';

// Local storage keys
const TABLE_ID = 'admin-audit-logs';
const VIS_KEY = `${TABLE_ID}::visible`;
const ADV_KEY = `${TABLE_ID}::filters_advanced`;

// Utility to format ISO -> local string
const fmt = (s) => (s ? new Date(s).toLocaleString() : '—');

export default function AdminAuditLogsPage() {
	// Helper to coerce before/after payloads into plain objects
	const parseMaybeJSON = (v) => {
		if (v === null || v === undefined || v === '') return {};
		if (typeof v === 'string') {
			try {
				const parsed = JSON.parse(v);
				return parsed && typeof parsed === 'object' ? parsed : {};
			} catch { return {}; }
		}
		if (typeof v === 'object') return v; // already object / array
		return {};
	};
	// Helper to extract lake name from row or payloads
	const extractLakeName = (r) => {
		if (!r) return null;
		// direct field
		if (r.lake_name) return r.lake_name;
		// sometimes backend provides entity_name for lakes
		if (r.entity_name && /(lake)$/i.test((r.model_type || '').split('\\').pop())) return r.entity_name;
		// payloads
		const scan = (obj) => {
			if (!obj || typeof obj !== 'object') return null;
			if (obj.lake_name) return obj.lake_name;
			if (obj.lake && typeof obj.lake === 'object' && obj.lake.name) return obj.lake.name;
			if (obj.name && typeof obj.name === 'string') return obj.name;
			return null;
		};
		let v = scan(r.after) || scan(r.before) || scan(r);
		return v || null;
	};
	const [me, setMe] = useState(null);
	const [rows, setRows] = useState([]);
	// Legacy hydration cache (kept for backward compatibility but backend now provides entity_name)
	const [entityNameCache, setEntityNameCache] = useState({});
	const pendingHydrateRef = useRef(new Set());
	const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 10, total: null });
	const clientMetaCacheRef = useRef(new Map()); // key -> { total, last_page, per_page }
	const [clientMetaLoading, setClientMetaLoading] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	// Stable (union) option catalogs so selects don't collapse when a filter narrows rows
	const [allRoles, setAllRoles] = useState([]); // array of strings
	const [allTenants, setAllTenants] = useState([]); // array of { value, label }
	const [allEntities, setAllEntities] = useState([]); // array of { base, full }

	// Detail modal state
	const [detailRow, setDetailRow] = useState(null);
	const openDetail = (row) => setDetailRow(row);
	const closeDetail = () => setDetailRow(null);

	// Basic search placeholder (not wired to API param yet – backend has no generic q)
	const [q, setQ] = useState('');

	// Advanced filters (revised)
	// action: dropdown; name: actor_name text; date: single date (event date)
	const [fAction, setFAction] = useState(() => {
		try { return JSON.parse(localStorage.getItem(ADV_KEY) || '{}').action || ''; } catch { return ''; }
	});
	const [fActorName, setFActorName] = useState(() => {
		try { return JSON.parse(localStorage.getItem(ADV_KEY) || '{}').actor_name || ''; } catch { return ''; }
	});
	// Additional new filters: role, tenant, entity, time window preset
	const [fRole, setFRole] = useState(() => {
		try { return JSON.parse(localStorage.getItem(ADV_KEY) || '{}').role || ''; } catch { return ''; }
	});
	const [fTenant, setFTenant] = useState(() => {
		try { return JSON.parse(localStorage.getItem(ADV_KEY) || '{}').tenant_id || ''; } catch { return ''; }
	});
	const [fEntity, setFEntity] = useState(() => {
		try { return JSON.parse(localStorage.getItem(ADV_KEY) || '{}').model_type || ''; } catch { return ''; }
	});
	// time window presets: '', '24h', '7d', '30d'
	const [fTimeWindow, setFTimeWindow] = useState(() => {
		try { return JSON.parse(localStorage.getItem(ADV_KEY) || '{}').time_window || ''; } catch { return ''; }
	});
	const [showAdvanced, setShowAdvanced] = useState(false);

	// Persist advanced filters
	useEffect(() => {
		try {
			localStorage.setItem(ADV_KEY, JSON.stringify({
				action: fAction || '',
				actor_name: fActorName || '',
				role: fRole || '',
				tenant_id: fTenant || '',
				model_type: fEntity || '',
				time_window: fTimeWindow || '',
			}));
		} catch {}
	}, [fAction, fActorName, fRole, fTenant, fEntity, fTimeWindow]);

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
		if (fActorName) params.actor_name = fActorName; // assuming backend supports actor_name; if not, will filter client-side
		if (fRole) params.role = fRole;
		if (fTenant) params.tenant_id = fTenant;
		if (fEntity) params.model_type = fEntity; // fEntity now stores full FQCN
		if (fTimeWindow) {
			const now = new Date();
			let from;
			switch (fTimeWindow) {
				case '24h': from = new Date(now.getTime() - 24*60*60*1000); break;
				case '7d': from = new Date(now.getTime() - 7*24*60*60*1000); break;
				case '30d': from = new Date(now.getTime() - 30*24*60*60*1000); break;
				default: from = null;
			}
			if (from) {
				const two = (n)=> String(n).padStart(2,'0');
				params.date_from = `${from.getFullYear()}-${two(from.getMonth()+1)}-${two(from.getDate())}`;
			}
		}
		return params;
	};

	const fetchMeCached = async () => {
		try { const u = await fetchMe({ maxAgeMs: 5 * 60 * 1000 }); setMe(u || null); } catch { setMe(null); }
	};

	const effectiveBase = (me && me.role === 'org_admin' && me.tenant_id)
		? `/org/${me.tenant_id}/audit-logs`
		: '/admin/audit-logs';

	const fetchLogs = async (params = {}) => {
		setLoading(true); setError(null);
    try {
      const res = await cachedGet(effectiveBase, { params, ttlMs: 2 * 60 * 1000 });
      // api.get returns the parsed JSON body; for Laravel paginator, it's an object with `data` and meta fields
      const body = res;
			let items = Array.isArray(body) ? body : (Array.isArray(body?.data) ? body.data : []); // adapt paginator
			// Remove SampleResult rows (database-only artifacts)
			if (Array.isArray(items)) {
				items = items.filter(it => {
					const mt = it.model_type || '';
					const base = String(mt).split('\\').pop();
					return base !== 'SampleResult';
				});
			}
			const normalizedItems = Array.isArray(items)
				? items.map(r => ({
					...r,
					before: parseMaybeJSON(r.before),
					after: parseMaybeJSON(r.after),
				}))
				: [];
			setRows(normalizedItems);
			// Schedule hydration for rows missing recognizable name
			queueHydration(normalizedItems);
			// Update stable option catalogs (union)
			if (Array.isArray(normalizedItems)) {
				// Roles
				setAllRoles(prev => {
					const set = new Set(prev);
					for (const r of normalizedItems) {
						const role = r.actor_role || (r.actor && r.actor.role);
						if (role) set.add(role);
					}
					return Array.from(set).sort();
				});
				// Tenants
				setAllTenants(prev => {
					const map = new Map(prev.map(t => [String(t.value), t.label]));
					for (const r of normalizedItems) {
						if (r.tenant_id) {
							const key = String(r.tenant_id);
							if (!map.has(key)) map.set(key, r.tenant_name || `Tenant ${key}`);
						}
					}
					return Array.from(map.entries()).map(([value,label])=>({ value, label })).sort((a,b)=>a.label.localeCompare(b.label));
				});
				// Entities (FQCN)
				setAllEntities(prev => {
					const map = new Map(prev.map(e => [e.full, e.base])); // full -> base
					for (const r of normalizedItems) if (r.model_type) {
						const full = r.model_type;
						const base = full.split('\\').pop();
						// exclude SampleResult from entity catalog
						if (base === 'SampleResult') continue;
						if (!map.has(full)) map.set(full, base);
					}
					return Array.from(map.entries()).map(([full, base]) => ({ base, full })).sort((a,b)=>a.base.localeCompare(b.base));
				});
			}
			const pg = Array.isArray(body) ? null : (body || null);
			// Handle both shapes: top-level meta fields or nested meta
			const metaObj = pg && typeof pg === 'object' && pg.meta && typeof pg.meta === 'object' ? pg.meta : pg;
			const effectivePage = params.page || 1;
			const effectivePerPage = params.per_page || perPage;
			const metaPresent = !!(metaObj && (typeof metaObj.current_page === 'number' || typeof metaObj.last_page === 'number' || typeof metaObj.total === 'number'));
			// If server meta exists, trust it
			if (metaPresent) {
				setMeta({
					current_page: typeof metaObj.current_page === 'number' ? metaObj.current_page : effectivePage,
					last_page: typeof metaObj.last_page === 'number' ? metaObj.last_page : Math.max(1, Math.ceil((typeof metaObj.total === 'number' ? metaObj.total : normalizedItems.length) / effectivePerPage)),
					per_page: typeof metaObj.per_page === 'number' ? metaObj.per_page : effectivePerPage,
					total: typeof metaObj.total === 'number' ? metaObj.total : null,
				});
			} else {
				// No server meta. Set provisional meta, then compute total/last_page client-side.
				setMeta({ current_page: effectivePage, last_page: 1, per_page: effectivePerPage, total: null });
				// Kick off background computation of totals
				const baseParams = { ...params };
				delete baseParams.page;
				await ensureClientMeta(baseParams, effectivePage, effectivePerPage, normalizedItems.length);
			}
		} catch (e) {
			console.error('Failed to load audit logs', e);
			setError(e?.response?.data?.message || 'Failed to load');
		} finally { setLoading(false); }
	};

	// Compute and cache total/last_page when server doesn't provide meta.
	const ensureClientMeta = async (baseParams, currentPage, perPageVal, currentPageCount) => {
		try {
			const key = `${effectiveBase}?${buildQuery({ ...baseParams, per_page: perPageVal })}`;
			const cached = clientMetaCacheRef.current.get(key);
			if (cached && typeof cached.total === 'number' && typeof cached.last_page === 'number') {
				setMeta(m => ({ ...m, last_page: cached.last_page, total: cached.total, per_page: cached.per_page || perPageVal }));
				return;
			}
			setClientMetaLoading(true);
			let total = 0;
			let pageIdx = 1;
			const maxPages = 500; // safety cap to avoid excessive requests
			for (; pageIdx <= maxPages; pageIdx++) {
				let len;
				if (pageIdx === currentPage && typeof currentPageCount === 'number') {
					len = currentPageCount;
				} else {
					const resp = await api.get(effectiveBase, { params: { ...baseParams, page: pageIdx, per_page: perPageVal } });
					const b = resp?.data;
					const arr = Array.isArray(b) ? b : (Array.isArray(b?.data) ? b.data : []);
					len = Array.isArray(arr) ? arr.filter(it => {
						const mt = it.model_type || '';
						const base = String(mt).split('\\').pop();
						return base !== 'SampleResult';
					}).length : 0;
				}
				total += len;
				if (len < perPageVal) break; // last page reached
			}
			const lastPage = Math.max(1, Math.ceil(total / perPageVal));
			const computed = { total, last_page: lastPage, per_page: perPageVal };
			clientMetaCacheRef.current.set(key, computed);
			setMeta(m => ({ ...m, last_page: lastPage, total, per_page: perPageVal }));
		} catch (err) {
			// If computing meta fails, keep provisional values and show without total.
			console.warn('Failed to compute client-side pagination meta', err);
		} finally {
			setClientMetaLoading(false);
		}
	};

	// Separate light fetch (unfiltered) to seed option catalogs so they aren't empty when filters active
	const seedOptions = async () => {
		// Try broader admin scope first (if available) to populate full catalogs, then fallback
		const candidateBases = me && me.role && me.role.includes('admin')
			? ['/admin/audit-logs', effectiveBase]
			: [effectiveBase];
		for (const base of candidateBases) {
			try {
				const res = await api.get(base, { params: { page:1, per_page:100 } });
				const items = Array.isArray(res?.data) ? res.data : (res?.data?.data || res.data || res);
				if (Array.isArray(items) && items.length) {
					setAllRoles(prev => {
						const set = new Set(prev);
						for (const r of items) {
							const role = r.actor_role || (r.actor && r.actor.role);
							if (role) set.add(role);
						}
						return Array.from(set).sort();
					});
					setAllTenants(prev => {
						const map = new Map(prev.map(t => [String(t.value), t.label]));
						for (const r of items) {
							if (r.tenant_id) {
								const key = String(r.tenant_id);
								if (!map.has(key)) map.set(key, r.tenant_name || `Tenant ${key}`);
							}
						}
						return Array.from(map.entries()).map(([value,label])=>({ value, label })).sort((a,b)=>a.label.localeCompare(b.label));
					});
					setAllEntities(prev => {
						const map = new Map(prev.map(e => [e.full, e.base]));
						for (const r of items) if (r.model_type) {
							const full = r.model_type;
							const base = full.split('\\').pop();
							// exclude SampleResult from seed catalog
							if (base === 'SampleResult') continue;
							if (!map.has(full)) map.set(full, base);
						}
						return Array.from(map.entries()).map(([full, base]) => ({ base, full })).sort((a,b)=>a.base.localeCompare(b.base));
					});
					// If we populated something meaningful, break early
					if (allRoles.length || allTenants.length || allEntities.length) break;
				}
			} catch {/* continue to next base */}
		}
	};

	// Initial load (user then logs)
	useEffect(() => { (async () => { await fetchMeCached(); })(); }, []);
	useEffect(() => { if (me) { seedOptions(); fetchLogs(buildParams({ page: 1 })); } /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [me]);

	// Auto refetch on advanced filter changes (debounced)
	useEffect(() => {
		if (!me) return;
		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => {
			fetchLogs(buildParams({ page: 1 }));
		}, 400);
		return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [fAction, fActorName, fRole, fTenant, fEntity, fTimeWindow]);

// openDetail removed

		const columns = useMemo(() => {
		const truncate = (s, max = 60) => (s && s.length > max ? s.slice(0, max) + '…' : s);
			const extractEntityName = (r) => r.entity_name || null;
		return [
			{ id: 'summary', header: 'Summary', render: r => {
					const actor = r.actor_name || 'System Admin';
					const modelBase = r.model_type ? r.model_type.split('\\').pop() : 'Record';
					let verb;
					switch (r.action) {
						case 'created': verb = 'Created'; break;
						case 'updated': verb = 'Updated'; break;
						case 'deleted': verb = 'Deleted'; break;
						case 'force_deleted': verb = 'Force Deleted'; break;
						case 'restored': verb = 'Restored'; break;
						default: verb = (r.action || 'Did').replace(/\b\w/g, c=>c.toUpperCase());
					}
					// Special formatting for SamplingEvent (show Lake name/id)
					const base = modelBase;
					if (base === 'SamplingEvent') {
						const nm = r.entity_name || extractLakeName(r);
						const lakeLabel = nm ? truncate(nm) : null;
						return lakeLabel
							? `${actor} ${verb} Sampling Event of ${lakeLabel} at ${fmt(r.event_at)}`
							: `${actor} ${verb} Sampling Event at ${fmt(r.event_at)}`;
					}
					const entityName = extractEntityName(r);
					if (entityName) return `${actor} ${verb} ${truncate(entityName)}`;
					const idTag = r.model_id ? `${modelBase}#${r.model_id}` : modelBase;
					return `${actor} ${verb} ${idTag}`;
			}, width: 560 },
			{ id: 'target', header: 'Target', render: r => {
				const modelBase = r.model_type ? r.model_type.split('\\').pop() : 'Record';
				return modelBase;
			}, width: 140 },
			{ id: 'actions', header: 'Action', width: 80, render: r => (
				<button className="pill-btn ghost sm" title="View Details" onClick={() => openDetail(r)} style={{ display:'flex', alignItems:'center', gap:4 }}>
					<FiEye />
				</button>
			)},
		];
	}, [openDetail, entityNameCache]);

	// Backend now provides entity_name; legacy hydration no-op
	const hydrateEntityName = async () => {};
	const queueHydration = () => {};

	const visibleColumns = useMemo(() => columns.filter(c => visibleMap[c.id] !== false), [columns, visibleMap]);

	const normalized = useMemo(() => rows, [rows]);

	// Use stable catalogs (do not shrink when filters applied)
	// Fallback derive from current rows if catalogs are still empty (first render or seed failed)
	const derivedRoles = allRoles.length ? allRoles : Array.from(new Set(rows.map(r => r.actor_role || (r.actor && r.actor.role)).filter(Boolean))).sort();
	const derivedTenants = allTenants.length ? allTenants : (() => {
		const map = new Map();
		for (const r of rows) if (r.tenant_id) {
			const key = String(r.tenant_id);
			if (!map.has(key)) map.set(key, r.tenant_name || `Tenant ${key}`);
		}
		return Array.from(map.entries()).map(([value,label])=>({ value, label })).sort((a,b)=>a.label.localeCompare(b.label));
	})();
	const derivedEntities = allEntities.length ? allEntities : (() => {
		const map = new Map();
		for (const r of rows) if (r.model_type) {
			const full = r.model_type; const base = full.split('\\').pop();
			// exclude SampleResult from derived entities
			if (base === 'SampleResult') continue;
			if (!map.has(full)) map.set(full, base);
		}
		return Array.from(map.entries()).map(([full, base])=>({ base, full })).sort((a,b)=>a.base.localeCompare(b.base));
	})();

	// If a stale persisted entity filter (e.g., SampleResult) exists that's not in options, clear it
	useEffect(() => {
		const allowed = new Set(derivedEntities.map(e => e.full));
		if (fEntity && !allowed.has(fEntity)) {
			setFEntity('');
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [derivedEntities]);

	const actions = [];

	// Build structured changes for modal table: [{fieldLabel, fromVal, toVal}]
	const buildChanges = (row) => {
		if (!row || !row.before || !row.after) return [];
		const keys = row.diff_keys && Array.isArray(row.diff_keys) && row.diff_keys.length
			? row.diff_keys
			: Array.from(new Set([...Object.keys(row.before), ...Object.keys(row.after)]));
		const prettify = (k) => k.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
		const normalize = (v) => {
			if (v === null || v === undefined || v === '') return 'NULL';
			if (typeof v === 'object') {
				try { return JSON.stringify(v); } catch { return String(v); }
			}
			return String(v);
		};
		const changes = [];
		for (const k of keys) {
			const before = row.before[k];
			const after = row.after[k];
			if (JSON.stringify(before) === JSON.stringify(after)) continue; // skip unchanged
			changes.push({ fieldLabel: prettify(k), fromVal: normalize(before), toVal: normalize(after) });
		}
		return changes;
	};

	const columnPickerAdapter = {
		columns: columns.map(c => ({ id: c.id, header: c.header })),
		visibleMap,
		onVisibleChange: (m) => setVisibleMap(m),
	};

	const advancedFields = [
		{ id: 'action', label: 'Action', type: 'select', value: fAction, onChange: v => setFAction(v), options: [
			{ value: '', label: 'All' },
			{ value: 'created', label: 'Created' },
			{ value: 'updated', label: 'Updated' },
			{ value: 'deleted', label: 'Deleted' },
			{ value: 'force_deleted', label: 'Force Deleted' },
			{ value: 'restored', label: 'Restored' },
		] },
		{ id: 'actor_name', label: 'Name', type: 'text', value: fActorName, onChange: v => setFActorName(v) },
		{ id: 'role', label: 'Role', type: 'select', value: fRole, onChange: v => setFRole(v), options: [ { value:'', label:'All' }, ...derivedRoles.map(r=>({ value:r, label:r })) ] },
		{ id: 'group_tei', label: 'Scope', type: 'group', children: [
			{ id: 'tenant_id', label: 'Tenant', type: 'select', value: fTenant, onChange: v => setFTenant(v), options: [ { value:'', label:'All' }, ...derivedTenants ] },
			{ id: 'model_type', label: 'Entity', type: 'select', value: fEntity, onChange: v => setFEntity(v), options: [ { value:'', label:'All' }, ...derivedEntities.map(e=>({ value:e.full, label:e.base })) ] },
			{ id: 'time_window', label: 'Time Window', type: 'select', value: fTimeWindow, onChange: v => setFTimeWindow(v), options: [
				{ value:'', label:'All' }, { value:'24h', label:'Last 24h' }, { value:'7d', label:'Last 7d' }, { value:'30d', label:'Last 30d' }
			] },
		]},
	];

	const activeAdvCount = [fAction, fActorName, fRole, fTenant, fEntity, fTimeWindow].filter(Boolean).length;

	const clearAdvanced = () => {
		setFAction(''); setFActorName(''); setFRole(''); setFTenant(''); setFEntity(''); setFTimeWindow(''); fetchLogs(buildParams({ page: 1 }));
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
								// Basic text search on summary
								if (q) {
									const summaryText = columns[0].render(r) || '';
									if (!summaryText.toLowerCase().includes(q.toLowerCase())) return false;
								}
								// Client-side fallback filters
								if (fActorName) {
									const nm = (r.actor_name || '').toLowerCase();
									if (!nm.includes(fActorName.toLowerCase())) return false;
								}
								if (fRole) {
									const rv = (r.actor_role || (r.actor && r.actor.role) || '').toLowerCase();
									if (rv !== fRole.toLowerCase()) return false;
								}
								if (fTenant) {
									if (String(r.tenant_id) !== String(fTenant)) return false;
								}
								if (fEntity) {
									if (r.model_type !== fEntity) return false;
								}
								if (fTimeWindow) {
									const ev = r.event_at ? new Date(r.event_at) : null;
									if (!ev) return false;
									const now = new Date();
									const diff = now - ev;
									const day = 24*60*60*1000;
									if (fTimeWindow === '24h' && diff > day) return false;
									if (fTimeWindow === '7d' && diff > 7*day) return false;
									if (fTimeWindow === '30d' && diff > 30*day) return false;
								}
								return true;
							})}
							pageSize={perPage}
							virtualize={true}
							rowHeight={48}
							actions={actions}
							resetSignal={0}
							columnPicker={false}
							hidePager={true}
					/>
				)}
				<div className="lv-table-pager" style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
					<button className="pill-btn ghost sm" disabled={loading || page <= 1} onClick={() => goPage(page - 1)}>&lt; Prev</button>
					{loading || clientMetaLoading ? (
						<span className="pager-text">Loading…</span>
					) : (
						<span className="pager-text">Page {meta.current_page ?? page} of {meta.last_page}{meta?.total != null ? ` · ${meta.total} total` : ''}</span>
					)}
					<button className="pill-btn ghost sm" disabled={loading || clientMetaLoading || page >= meta.last_page} onClick={() => goPage(page + 1)}>Next &gt;</button>
				</div>
			</div>

		{detailRow && (
			<Modal
				open={!!detailRow}
				onClose={closeDetail}
				title={`Audit Log #${detailRow.id || ''}`}
				width={720}
				ariaLabel="Audit log detail dialog"
				bodyClassName="audit-log-detail-body"
				footer={(
					<div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
						<button className="pill-btn ghost" onClick={closeDetail}>Close</button>
					</div>
				)}
			>
				<div className="lv-settings-panel" style={{ gap: 14 }}>
					<h3 style={{ margin: 0, fontSize: '1rem' }}>Event</h3>
					<div style={{ display:'grid', rowGap:6, fontSize:13.5 }}>
						<div><strong style={{ width:110, display:'inline-block' }}>User:</strong> {detailRow.actor_name || 'System Admin'}</div>
						<div><strong style={{ width:110, display:'inline-block' }}>Role:</strong> {detailRow.actor_role || detailRow.actor?.role || '—'}</div>
						<div><strong style={{ width:110, display:'inline-block' }}>Action:</strong> {detailRow.action}</div>
						<div><strong style={{ width:110, display:'inline-block' }}>Entity:</strong>{' '}
							{(() => {
								const base = detailRow.model_type ? detailRow.model_type.split('\\').pop() : 'Record';
								if (base === 'SamplingEvent') {
									const nm = detailRow.entity_name || extractLakeName(detailRow);
									return nm ? `Sampling Event of ${nm}` : 'Sampling Event';
								}
								return detailRow.entity_name ? detailRow.entity_name : base;
							})()}
							{detailRow.model_id ? ` #${detailRow.model_id}` : ''}
						</div>
						<div><strong style={{ width:110, display:'inline-block' }}>Timestamp:</strong> {fmt(detailRow.event_at)}</div>
						{detailRow.tenant_id && (
							<div><strong style={{ width:110, display:'inline-block' }}>Tenant:</strong> {detailRow.tenant_name || detailRow.tenant_id}</div>
						)}
						{detailRow.ip_address && (
							<div><strong style={{ width:110, display:'inline-block' }}>IP:</strong> {detailRow.ip_address}</div>
						)}
					</div>
				</div>

				<div className="lv-settings-panel" style={{ gap: 12 }}>
					<h3 style={{ margin: 0, fontSize: '1rem' }}>Changes</h3>
					{detailRow.before && detailRow.after ? (
						(() => {
							const changes = buildChanges(detailRow);
							if (changes.length === 0) {
								return <div style={{ fontStyle:'italic', fontSize:13, color:'#64748b' }}>No field differences detected.</div>;
							}
							return (
								<div style={{ border:'1px solid #e5e7eb', borderRadius:8, overflow:'hidden' }}>
									<table style={{ width:'100%', borderCollapse:'collapse', fontSize:13.5 }}>
										<thead style={{ background:'#f3f4f6' }}>
											<tr>
												<th style={{ textAlign:'left', padding:'8px 10px', fontSize:12, textTransform:'uppercase', letterSpacing:0.5 }}>Field</th>
												<th style={{ textAlign:'left', padding:'8px 10px', fontSize:12, textTransform:'uppercase', letterSpacing:0.5 }}>From</th>
												<th style={{ textAlign:'left', padding:'8px 10px', fontSize:12, textTransform:'uppercase', letterSpacing:0.5 }}>To</th>
											</tr>
										</thead>
										<tbody>
											{changes.map((ch,i) => (
												<tr key={i} style={{ background: i % 2 ? '#f9fafb' : 'white' }}>
													<td style={{ padding:'6px 10px', fontWeight:500 }}>{ch.fieldLabel}</td>
													<td style={{ padding:'6px 10px', color:'#b91c1c', whiteSpace:'pre-wrap', wordBreak:'break-word' }}>{ch.fromVal}</td>
													<td style={{ padding:'6px 10px', color:'#065f46', whiteSpace:'pre-wrap', wordBreak:'break-word' }}>{ch.toVal}</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							);
						})()
					) : (
						<div style={{ fontStyle:'italic', fontSize:13, color:'#64748b' }}>No before/after payload to diff.</div>
					)}
				</div>
			</Modal>
		)}
	</div>
	);
}
