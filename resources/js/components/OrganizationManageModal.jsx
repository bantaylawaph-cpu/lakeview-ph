
import React, { useEffect, useState } from "react";
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import api from "../lib/api";
import Modal from "./Modal";
import Swal from "sweetalert2";
import LoadingSpinner from "./LoadingSpinner";

export default function OrganizationManageModal({ org, open, onClose }) {
	const [activeTab, setActiveTab] = useState("admins");
	// Contributors logic removed
	const [admins, setAdmins] = useState([]);
	const [loading, setLoading] = useState(false);
	const [editing, setEditing] = useState(null); // user being edited
	const [editForm, setEditForm] = useState({ name: "", email: "" });
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (open && org) fetchTabs();
		// eslint-disable-next-line
	}, [open, org]);

	const fetchTabs = async () => {
		setLoading(true);
		try {
			const adminsRes = await api.get(`/admin/tenants/${org.id}/admins`).catch(() => ({ data: [] }));
			setAdmins(adminsRes.data || []);
		} catch (e) {
			// fallback: show nothing
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

	return (
		<Modal
			open={open}
			onClose={onClose}
			title={`Manage Organization: ${org?.name || ""}`}
			width={600}
			ariaLabel="Organization Manage Modal"
			footer={
				<div className="lv-modal-actions">
					<button type="button" className="pill-btn ghost" onClick={onClose}>
						Close
					</button>
				</div>
			}
		>
			<div style={{ fontWeight: 600, fontSize: 18, marginBottom: 18 }}>Organization Admins</div>
			<div className="lv-modal-section" style={{ minHeight: 320, background: '#f8fafc', borderRadius: 12, padding: 16, boxShadow: '0 2px 8px #0001', marginBottom: 0 }}>
				{loading ? (
					<div style={{ padding: 24 }}><LoadingSpinner label="Loading organization admins…" /></div>
				) : (
					<>
						<div>
							<div style={{ overflowX: 'auto', width: '100%' }}>
								<table className="lv-table" style={{ minWidth: 420, width: '100%', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 4px #0001' }}>
									<thead style={{ background: '#f1f5f9' }}>
										<tr style={{ fontWeight: 500 }}><th>Name</th><th>Email</th><th style={{ width: 120 }}>Actions</th></tr>
									</thead>
									<tbody>
										{admins.length === 0 ? (
											<tr><td colSpan={3} style={{ textAlign: 'center', color: '#888', padding: 24 }}>No org admins found</td></tr>
										) : admins.map((a) => (
											<tr key={a.id}>
												<td>{a.name}</td>
												<td>{a.email}</td>
												<td style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
													<button title="Edit" aria-label={`Edit ${a.email}`} type="button" className="pill-btn ghost sm" onClick={() => openEdit(a)}>
														<FiEdit2 />
													</button>
													<button title="Remove" aria-label={`Remove ${a.email}`} type="button" className="pill-btn ghost sm red-text" onClick={() => handleRemove(a)}>
														<FiTrash2 />
													</button>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
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
