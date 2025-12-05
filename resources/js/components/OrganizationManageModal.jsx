import React, { useEffect, useState } from "react";
import api from "../lib/api";
import { cachedGet, invalidateHttpCache } from "../lib/httpCache";
import Modal from "./Modal";
import Swal from "sweetalert2";
import LoadingSpinner from "./LoadingSpinner";
import OrganizationForm from "./OrganizationForm";
import { useWindowSize } from "../hooks/useWindowSize";
import { FiTrash2 } from 'react-icons/fi';

export default function OrganizationManageModal({ org, open, onClose }) {
	const { width: windowW } = useWindowSize();
	const [activeTab, setActiveTab] = useState("overview");
	const [orgDetail, setOrgDetail] = useState(null);
	const [members, setMembers] = useState([]); // org_admin + contributor
	const [loading, setLoading] = useState(false);
	const [editing, setEditing] = useState(null); // user being edited
	const [editForm, setEditForm] = useState({ name: "", email: "" });
	const [saving, setSaving] = useState(false);
	const [deleting, setDeleting] = useState(false);
	// Settings tab removed

	// Audit removed

	const loadOrgDetail = async () => {
		if (!org?.id) return;
		try {
			const res = await api.get(`/admin/tenants/${org.id}`);
			// Laravel returns { data: { ..tenant.. } }, ensure we unwrap
			const tenant = res?.data?.data ?? res?.data ?? res;
			setOrgDetail(tenant);
			setSettingsForm({
				name: tenant.name || "",
				contact_email: tenant.contact_email || "",
			});
		} catch { /* ignore */ }
	};

	// Check if organization has existing data across key resources
	const getOrgUsage = async (tenantId) => {
		try {
			// users (paginator with total)
			const usersRes = await cachedGet('/admin/users', { params: { tenant_id: tenantId, per_page: 1 }, ttlMs: 0 }).catch(() => null);
			const usersPayload = usersRes?.data ?? usersRes ?? {};
			const usersTotal = usersPayload?.meta?.total ?? usersPayload?.total ?? 0;

			// sampling events (paginator with total)
			const eventsRes = await cachedGet('/admin/sample-events', { params: { organization_id: tenantId, per_page: 1 }, ttlMs: 0 }).catch(() => null);
			const eventsPayload = eventsRes?.data ?? eventsRes ?? {};
			const eventsTotal = eventsPayload?.meta?.total ?? eventsPayload?.total ?? 0;

			// stations (array)
			const stationsRes = await cachedGet('/admin/stations', { params: { organization_id: tenantId }, ttlMs: 0 }).catch(() => ({ data: { data: [] } }));
			const stationsPayload = stationsRes?.data ?? stationsRes ?? {};
			const stationsData = Array.isArray(stationsPayload?.data) ? stationsPayload.data : (Array.isArray(stationsPayload) ? stationsPayload : []);
			const stationsTotal = Array.isArray(stationsData) ? stationsData.length : 0;

			return { users: Number(usersTotal) || 0, events: Number(eventsTotal) || 0, stations: Number(stationsTotal) || 0 };
		} catch {
			return { users: 0, events: 0, stations: 0 };
		}
	};

	const handleDeleteOrg = async () => {
		if (!org?.id) return;
		setDeleting(true);
		try {
			const usage = await getOrgUsage(org.id);
			const total = (usage.users || 0) + (usage.events || 0) + (usage.stations || 0);
			if (total > 0) {
				await Swal.fire({
					title: 'Cannot delete organization',
					html: `This organization still has existing data:<br/>`
						+ `• Users: <b>${usage.users}</b><br/>`
						+ `• Sampling events: <b>${usage.events}</b><br/>`
						+ `• Stations: <b>${usage.stations}</b><br/><br/>`
						+ `Please detach/delete these first, then try again.`,
					icon: 'warning',
					confirmButtonText: 'Close'
				});
				return;
			}

			const ok = await Swal.fire({
				title: 'Delete organization?',
				text: `This will delete ${org?.name || 'this organization'}.`,
				icon: 'warning',
				showCancelButton: true,
				confirmButtonText: 'Delete',
				confirmButtonColor: '#dc2626'
			}).then(r => r.isConfirmed);
			if (!ok) return;

			await api.delete(`/admin/tenants/${org.id}`);
			try { invalidateHttpCache('/admin/tenants'); } catch {}
			await Swal.fire('Deleted', 'Organization deleted.', 'success');
			if (onClose) onClose();
		} catch (e) {
			Swal.fire('Delete failed', formatApiError(e), 'error');
		} finally {
			setDeleting(false);
		}
	};

	const formatApiError = (e) => {
		if (!e) return 'Unknown error';
		const resp = e.response;
		if (!resp) return e.message || 'Network error';
		const data = resp.data || {};
		if (typeof data.message === 'string' && data.message.length) return data.message;
		if (data.errors && typeof data.errors === 'object') {
			for (const k of Object.keys(data.errors)) {
				const val = data.errors[k];
				if (Array.isArray(val) && val.length) return val.join(' ');
				if (typeof val === 'string') return val;
			}
		}
		return resp.statusText || `HTTP ${resp.status}`;
	};

	// Overview now always shows edit form directly (no separate summary state)

	// Client-side filters
	const [memberRoleFilter, setMemberRoleFilter] = useState(""); // '', 'org_admin', 'contributor'
	const [memberNameFilter, setMemberNameFilter] = useState("");
	// Public users tab removed

	useEffect(() => {
		if (open && org) {
			loadOrgDetail();
			if (activeTab === 'members') fetchTabs();
		}
		// eslint-disable-next-line
	}, [open, org, activeTab]);

	const fetchTabs = async () => {
		setLoading(true);
		try {
			// Members only
			const membersRes = await cachedGet('/admin/users', { params: { tenant_id: org.id }, ttlMs: 5 * 60 * 1000 }).catch(() => ({ data: { data: [] } }));
			const mm = Array.isArray(membersRes?.data?.data) ? membersRes.data.data : (Array.isArray(membersRes?.data) ? membersRes.data : []);
			setMembers(mm.filter(u => ['org_admin','contributor'].includes(u.role)));
		} catch (e) {
			// ignore, show empty states
			setMembers([]);
		} finally {
			setLoading(false);
		}
	};

	// Audit fetch removed

	// Remove org admin
	const handleRemove = async (user) => {
		const ok = await Swal.fire({
			title: `Remove Org Admin?`,
			text: `Are you sure you want to remove ${user.name} (${user.email})?`,
			icon: "warning",
			showCancelButton: true,
			confirmButtonText: "Remove",
			confirmButtonColor: "#dc2626",
		}).then(r => r.isConfirmed);
		if (!ok) return;
		try {
			await api.delete(`/admin/tenants/${org.id}/admins/${user.id}`);
			try { invalidateHttpCache('/admin/users'); } catch {}
			await fetchTabs();
			Swal.fire("Removed", `${user.name} removed.`, "success");
		} catch (e) {
			Swal.fire("Failed", e?.response?.data?.message || "Could not remove user.", "error");
		}
	};

	// Edit user info (name/email only)
	const openEdit = (user) => {
		setEditing(user);
		setEditForm({ name: user.name, email: user.email });
	};
	const closeEdit = () => {
		setEditing(null);
		setEditForm({ name: "", email: "" });
	};
	const submitEdit = async (e) => {
		e.preventDefault();
		setSaving(true);
		try {
			await api.put(`/admin/users/${editing.id}`, {
				name: editForm.name,
				email: editForm.email,
				role: "org_admin",
				tenant_id: org.id
			});
			try { invalidateHttpCache('/admin/users'); } catch {}
			await fetchTabs();
			Swal.fire("Updated", "User info updated.", "success");
			closeEdit();
		} catch (e) {
			Swal.fire("Failed", e?.response?.data?.message || "Could not update user.", "error");
		} finally {
			setSaving(false);
		}
	};

	// Member actions (promote/demote/remove)
	const promoteToAdmin = async (user) => {
		try {
			await api.put(`/admin/users/${user.id}`, { role: 'org_admin', tenant_id: org.id, name: user.name, email: user.email });
			try { invalidateHttpCache('/admin/users'); } catch {}
			await fetchTabs();
			Swal.fire('Promoted','User is now an organization admin.','success');
		} catch (e) {
			Swal.fire('Failed', e?.response?.data?.message || 'Could not promote user.', 'error');
		}
	};
	const demoteToContributor = async (user) => {
		try {
			await api.put(`/admin/users/${user.id}`, { role: 'contributor', tenant_id: org.id, name: user.name, email: user.email });
			try { invalidateHttpCache('/admin/users'); } catch {}
			await fetchTabs();
			Swal.fire('Updated','User is now a contributor.','success');
		} catch (e) {
			Swal.fire('Failed', e?.response?.data?.message || 'Could not update user.', 'error');
		}
	};
	const removeFromOrg = async (user) => {
		const ok = await Swal.fire({ title:'Remove from organization?', text:`${user.name} will lose access to ${org.name}.`, icon:'warning', showCancelButton:true, confirmButtonText:'Remove', confirmButtonColor:'#dc2626' }).then(r=>r.isConfirmed);
		if (!ok) return;
		try {
			await api.put(`/admin/users/${user.id}`, { role: 'public', tenant_id: null, name: user.name, email: user.email });
			try { invalidateHttpCache('/admin/users'); } catch {}
			await fetchTabs();
			Swal.fire('Removed','User removed from organization.','success');
		} catch (e) {
			Swal.fire('Failed', e?.response?.data?.message || 'Could not remove user.', 'error');
		}
	};

	// Settings save
	// Settings update removed

	// Feature flags removed.

	// Public user -> add as contributor
	// Public users contribution feature removed

	const roleLabel = (role) => {
		if (!role) return '—';
		switch (role) {
			case 'org_admin': return 'Organization admin';
			case 'contributor': return 'Contributor';
			case 'public': return 'Public';
			case 'superadmin': return 'Super admin';
			default: return role.replace(/_/g, ' ');
		}
	};

	const computeModalWidth = (w) => {
		if (!w) return 640;
		if (w >= 2561) return 1400; // 4k
		if (w >= 1441) return 1080; // Laptop L
		if (w >= 1025) return 860;  // Laptop
		if (w >= 769) return 720;   // Tablet
		// mobile: keep it responsive to viewport rather than fixed pixels
		if (w <= 420) return '92vw';
		return '94vw';
	};

	return (
		<Modal
			open={open}
			onClose={onClose}
			title={`Manage Organization: ${org?.name || ""}`}
			width={computeModalWidth(windowW)}
			ariaLabel="Organization Manage Modal"
			cardClassName="organization-manage-modal"
			footer={
				<div className="lv-modal-actions" style={{ padding: '12px 16px' }}>
					<button type="button" className="pill-btn ghost" onClick={onClose}>
						Close
					</button>
				</div>
			}
		>
			{/* Tabs */}
			<div className="lv-tabs" style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
				<button className={`pill-btn ${activeTab==='overview'?'primary':''}`} onClick={()=>setActiveTab('overview')} style={{ padding: '8px 16px', borderRadius: '8px' }}>Overview</button>
				<button className={`pill-btn ${activeTab==='members'?'primary':''}`} onClick={()=>setActiveTab('members')} style={{ padding: '8px 16px', borderRadius: '8px' }}>Members</button>
			</div>
			<div className="lv-modal-section" style={{ minHeight: 360, background: '#f8fafc', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px #0001', marginBottom: 16 }}>
				{loading ? (
					<div style={{ padding: 24 }}><LoadingSpinner label="Loading…" /></div>
				) : (
					<>
						{activeTab === 'overview' && (
							<div style={{ display:'grid', gap:16 }}>
								<h3 style={{ margin:0 }}>Edit Organization</h3>
								{orgDetail ? (
									<div style={{ padding:16, background:'#fff', borderRadius:8, boxShadow: '0 1px 4px #0001' }}>
										<OrganizationForm inline initialData={orgDetail} onSubmit={async (payload) => {
											try {
												await api.put(`/admin/tenants/${org.id}`, payload);
												await loadOrgDetail();
												try { invalidateHttpCache('/admin/tenants'); } catch {}
												Swal.fire('Saved','Organization updated.','success');
											} catch (e) {
												Swal.fire('Failed', formatApiError(e), 'error');
											}
										}} />
										<div style={{ marginTop:16, padding:16, borderRadius:8, background:'#fff7f7', border:'1px solid #fecaca', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
											<div>
												<div style={{ fontWeight:600, color:'#b91c1c' }}>Danger zone</div>
												<div style={{ color:'#7f1d1d' }}>Deleting an organization is permanent. Ensure there is no associated data.</div>
											</div>
											<button className="pill-btn danger" onClick={handleDeleteOrg} disabled={deleting} style={{ display:'inline-flex', alignItems:'center', gap:8 }}>
												<FiTrash2 /> {deleting ? 'Deleting…' : 'Delete'}
											</button>
										</div>
									</div>
								) : <div style={{ color:'#555' }}>Loading…</div>}
							</div>
						)}
						{activeTab === 'members' && (
							<div style={{ overflowX:'auto' }}>
								<div style={{ display:'flex', gap:16, alignItems:'center', marginBottom:16 }}>
									<label className="lv-field" style={{ minWidth: 180 }}>
										<span>Role</span>
										<select value={memberRoleFilter} onChange={e=>setMemberRoleFilter(e.target.value)} style={{ padding: '8px', borderRadius: '8px' }}>
											<option value="">All</option>
											<option value="org_admin">Org Admin</option>
											<option value="contributor">Contributor</option>
										</select>
									</label>
									<label className="lv-field" style={{ flex:1 }}>
										<span>Search name</span>
										<input placeholder="Type a name…" value={memberNameFilter} onChange={e=>setMemberNameFilter(e.target.value)} style={{ padding: '8px', borderRadius: '8px' }} />
									</label>
								</div>
								<table className="lv-table" style={{ minWidth: 520, width:'100%', background:'#fff', borderRadius:8, overflow:'hidden', boxShadow:'0 1px 4px #0001' }}>
									<thead style={{ background:'#f1f5f9', borderBottom: '2px solid #e2e8f0' }}>
										<tr style={{ fontWeight:500 }}><th>Name</th><th>Email</th><th>Role</th></tr>
									</thead>
									<tbody>
										{(members
											.filter(u => !memberRoleFilter || u.role === memberRoleFilter)
											.filter(u => !memberNameFilter || (u.name || '').toLowerCase().includes(memberNameFilter.toLowerCase()))
										).length === 0 ? (
											<tr><td colSpan={4} style={{ textAlign:'center', color:'#888', padding:24 }}>No members yet</td></tr>
										) : members
											.filter(u => !memberRoleFilter || u.role === memberRoleFilter)
											.filter(u => !memberNameFilter || (u.name || '').toLowerCase().includes(memberNameFilter.toLowerCase()))
											.map(u => (
											<tr key={u.id} style={{ transition: 'background 0.3s', cursor: 'pointer', ':hover': { background: '#f1f5f9' } }}>
												<td>{u.name}</td>
												<td>{u.email}</td>
												<td>{roleLabel(u.role)}</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
						{/* Public Users & Settings content removed */}
						{/* Audit tab removed */}
					</>
				)}
			</div>
			{/* Edit Modal */}
			{editing && (
				<Modal
					open={!!editing}
					onClose={closeEdit}
					title="Edit User"
					width={400}
					ariaLabel="Edit User Modal"
					footer={
						<div className="lv-modal-actions">
							<button type="button" className="pill-btn ghost" onClick={closeEdit} disabled={saving}>Cancel</button>
							<button type="submit" className="pill-btn primary" form="org-edit-user-form" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
						</div>
					}
				>
					<form id="org-edit-user-form" onSubmit={submitEdit} style={{ display: 'grid', gap: 16 }}>
						<label className="lv-field">
							<span>Name</span>
							<input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} required />
						</label>
						<label className="lv-field">
							<span>Email</span>
							<input value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} required />
						</label>
					</form>
				</Modal>
			)}
		</Modal>
	);
}

// DangerHardDelete removed
