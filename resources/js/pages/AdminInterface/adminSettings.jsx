import React, { useEffect, useState } from 'react';
import DashboardSettingsPanel from '../../components/settings/DashboardSettingsPanel';
import { getCurrentUser, setCurrentUser } from '../../lib/authState';
import api from '../../lib/api';

export default function AdminSettingsPage() {
	const [user, setUser] = useState(() => getCurrentUser());
	useEffect(() => {
		if (!user) {
			(async () => {
				try { const res = await api('/auth/me'); const u = res?.data || res; if (u?.id) { setCurrentUser(u); setUser(u); } } catch {}
			})();
		}
		const onUpdate = (e) => setUser(e.detail);
		window.addEventListener('lv-user-update', onUpdate);
		return () => window.removeEventListener('lv-user-update', onUpdate);
	}, [user]);
	if (!user) return <div className="content-page"><p>Loading account…</p></div>;
	return (
		<div className="content-page">
			<div className="dashboard-card" style={{ marginBottom: 16 }}>
				<div className="dashboard-card-header">
					<div className="dashboard-card-title">
						<span>System Settings</span>
					</div>
				</div>
				<p style={{ marginTop: 8, fontSize: 13, color: '#6b7280' }}>
					Configure system-level settings, integrations, and global options.
				</p>
			</div>
			<DashboardSettingsPanel />
		</div>
	);
}
