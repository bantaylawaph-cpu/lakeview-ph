
import React, { useEffect, useState } from "react";
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import api from "../lib/api";
import Modal from "./Modal";
import Swal from "sweetalert2";
import LoadingSpinner from "./LoadingSpinner";

export default function OrganizationManageModal({ org, open, onClose }) {
	const [activeTab, setActiveTab] = useState("members");
	const [members, setMembers] = useState([]); // org_admin + contributor
	const [publicUsers, setPublicUsers] = useState([]);
	const [loading, setLoading] = useState(false);
	const [editing, setEditing] = useState(null); // user being edited
	const [editForm, setEditForm] = useState({ name: "", email: "" });
	const [saving, setSaving] = useState(false);

	// Client-side filters
	const [memberRoleFilter, setMemberRoleFilter] = useState(""); // '', 'org_admin', 'contributor'
	const [memberNameFilter, setMemberNameFilter] = useState("");
	const [publicNameFilter, setPublicNameFilter] = useState("");

	useEffect(() => {
		if (open && org) fetchTabs();
		// eslint-disable-next-line
	}, [open, org, activeTab]);

	const fetchTabs = async () => {
		setLoading(true);
		try {
			const promises = [];
			// Members: reuse admin users index filtered by tenant_id and roles
			promises.push(api.get('/admin/users', { params: { tenant_id: org.id } }).catch(() => ({ data: { data: [] } })));
			// Public users list
			promises.push(api.get('/admin/users', { params: { role: 'public', tenant_null: true } }).catch(() => ({ data: { data: [] } })));
			const [membersRes, publicRes] = await Promise.all(promises);
			const mm = Array.isArray(membersRes?.data?.data) ? membersRes.data.data : (Array.isArray(membersRes?.data) ? membersRes.data : []);
			setMembers(mm.filter(u => ['org_admin','contributor'].includes(u.role)));
			const pu = Array.isArray(publicRes?.data?.data) ? publicRes.data.data : (Array.isArray(publicRes?.data) ? publicRes.data : []);
			setPublicUsers(pu);
		} catch (e) {
			// ignore, show empty states
			setMembers([]); setPublicUsers([]);
		} finally {
			setLoading(false);
		}
	};

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
			await fetchTabs();
			Swal.fire('Promoted','User is now an organization admin.','success');
		} catch (e) {
			Swal.fire('Failed', e?.response?.data?.message || 'Could not promote user.', 'error');
		}
	};
	const demoteToContributor = async (user) => {
		try {
			await api.put(`/admin/users/${user.id}`, { role: 'contributor', tenant_id: org.id, name: user.name, email: user.email });
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
			await fetchTabs();
			Swal.fire('Removed','User removed from organization.','success');
		} catch (e) {
			Swal.fire('Failed', e?.response?.data?.message || 'Could not remove user.', 'error');
		}
	};

	// Public user -> add as contributor
	const addAsContributor = async (user) => {
		try {
			await api.put(`/admin/users/${user.id}`, { role: 'contributor', tenant_id: org.id, name: user.name || user.email, email: user.email });
			await fetchTabs();
			Swal.fire('Added','User added as contributor.','success');
		} catch (e) {
			Swal.fire('Failed', e?.response?.data?.message || 'Could not add user.', 'error');
		}
	};

	return (
		<Modal
			open={open}
			onClose={onClose}
			title={`Manage Organization: ${org?.name || ""}`}
			width={900}
			ariaLabel="Organization Manage Modal"
			footer={
				<div className="lv-modal-actions">
					<button type="button" className="pill-btn ghost" onClick={onClose}>
						Close
					</button>
				</div>
			}
		>
			{/* Tabs */}
			<div className="lv-tabs" style={{ display:'flex', gap:8, marginBottom:12 }}>
				<button className={`pill-btn ${activeTab==='members'?'primary':''}`} onClick={()=>setActiveTab('members')}>Members</button>
				<button className={`pill-btn ${activeTab==='public'?'primary':''}`} onClick={()=>setActiveTab('public')}>Public Users</button>
			</div>
			<div className="lv-modal-section" style={{ minHeight: 360, background: '#f8fafc', borderRadius: 12, padding: 16, boxShadow: '0 2px 8px #0001', marginBottom: 0 }}>
				{loading ? (
					<div style={{ padding: 24 }}><LoadingSpinner label="Loading…" /></div>
				) : (
					<>
						{activeTab === 'members' && (
							<div style={{ overflowX:'auto' }}>
								{/* Filters */}
								<div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:12 }}>
									<label className="lv-field" style={{ minWidth: 180 }}>
										<span>Role</span>
										<select value={memberRoleFilter} onChange={e=>setMemberRoleFilter(e.target.value)}>
											<option value="">All</option>
											<option value="org_admin">Org Admin</option>
											<option value="contributor">Contributor</option>
										</select>
									</label>
									<label className="lv-field" style={{ flex:1 }}>
										<span>Search name</span>
										<input placeholder="Type a name…" value={memberNameFilter} onChange={e=>setMemberNameFilter(e.target.value)} />
									</label>
								</div>
								<table className="lv-table" style={{ minWidth: 520, width:'100%', background:'#fff', borderRadius:8, overflow:'hidden', boxShadow:'0 1px 4px #0001' }}>
									<thead style={{ background:'#f1f5f9' }}>
										<tr style={{ fontWeight:500 }}><th>Name</th><th>Email</th><th>Role</th><th style={{ width: 220 }}>Actions</th></tr>
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
											<tr key={u.id}>
												<td>{u.name}</td>
												<td>{u.email}</td>
												<td>{u.role || '—'}</td>
												<td style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
													{u.role === 'contributor' && (
														<button className="pill-btn ghost sm" onClick={()=>promoteToAdmin(u)}>Promote to Admin</button>
													)}
													{u.role === 'org_admin' && (
														<button className="pill-btn ghost sm" onClick={()=>demoteToContributor(u)}>Demote to Contributor</button>
													)}
													<button className="pill-btn ghost sm red-text" onClick={()=>removeFromOrg(u)}>Remove</button>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
						{activeTab === 'public' && (
							<div style={{ overflowX:'auto' }}>
								{/* Filters */}
								<div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:12 }}>
									<label className="lv-field" style={{ flex:1 }}>
										<span>Search name</span>
										<input placeholder="Type a name…" value={publicNameFilter} onChange={e=>setPublicNameFilter(e.target.value)} />
									</label>
								</div>
								<table className="lv-table" style={{ minWidth: 520, width:'100%', background:'#fff', borderRadius:8, overflow:'hidden', boxShadow:'0 1px 4px #0001' }}>
									<thead style={{ background:'#f1f5f9' }}>
										<tr style={{ fontWeight:500 }}><th>Name</th><th>Email</th><th style={{ width: 200 }}>Actions</th></tr>
									</thead>
									<tbody>
										{(publicUsers
											.filter(u => !publicNameFilter || (u.name || '').toLowerCase().includes(publicNameFilter.toLowerCase()))
										).length === 0 ? (
											<tr><td colSpan={3} style={{ textAlign:'center', color:'#888', padding:24 }}>No public users found</td></tr>
										) : publicUsers
											.filter(u => !publicNameFilter || (u.name || '').toLowerCase().includes(publicNameFilter.toLowerCase()))
											.map(u => (
											<tr key={u.id}>
												<td>{u.name || '—'}</td>
												<td>{u.email}</td>
												<td>
													<button className="pill-btn ghost sm" onClick={()=>addAsContributor(u)}>Add as Contributor</button>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
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
