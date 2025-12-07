import React, { useEffect, useState } from 'react';
import DashboardSettingsPanel from '../../components/settings/DashboardSettingsPanel';
import { getCurrentUser, setCurrentUser } from '../../lib/authState';
import api, { me as fetchMe } from '../../lib/api';

export default function AdminSettingsPage() {
	const [user, setUser] = useState(() => getCurrentUser());
	const [defaultBasemap, setDefaultBasemap] = useState(() => {
		try { return localStorage.getItem('lv.defaultBasemap') || 'topographic'; } catch { return 'topographic'; }
	});
	useEffect(() => {
		if (!user) {
			(async () => {
				try { const u = await fetchMe({ maxAgeMs: 60 * 1000 }); if (u?.id) { setCurrentUser(u); setUser(u); } } catch {}
			})();
		}
		const onUpdate = (e) => setUser(e.detail);
		window.addEventListener('lv-user-update', onUpdate);
		return () => window.removeEventListener('lv-user-update', onUpdate);
	}, [user]);

	const handleBasemapChange = (e) => {
		const value = e.target.value;
		setDefaultBasemap(value);
		// Persist globally via admin endpoint
		(async () => {
			try {
				await api.post('/admin/app-config', { default_basemap: value });
				try { localStorage.setItem('lv.defaultBasemap', value); } catch {}
				// Notify live clients
				const evt = new CustomEvent('lv-default-basemap', { detail: value });
				window.dispatchEvent(evt);
			} catch (err) {
				// Roll back UI if save fails
				try { const prev = localStorage.getItem('lv.defaultBasemap') || 'topographic'; setDefaultBasemap(prev); } catch { setDefaultBasemap('topographic'); }
			}
		})();
	};

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
					Configure super administrator account and default basemap.
				</p>
			</div>

			{/* Global Basemap Card */}
			<div className="dashboard-card" style={{ marginBottom: 16 }}>
				<div className="dashboard-card-header">
					<div className="dashboard-card-title">
						<span>Default Basemap</span>
					</div>
				</div>
				<p style={{ marginTop: 8, fontSize: 13, color: '#6b7280' }}>
					Select the global default basemap for maps across the app.
				</p>
				<div style={{ marginTop: 12 }}>
					<label htmlFor="lv-default-basemap" style={{ display: 'block', fontSize: 13, color: '#374151', marginBottom: 6 }}>
						Basemap style
					</label>
					<select
						id="lv-default-basemap"
						value={defaultBasemap}
						onChange={handleBasemapChange}
						className="form-select"
						style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #e5e7eb' }}
					>
						<option value="satellite">Esri World Imagery</option>
						<option value="topographic">Esri Topographic</option>
						<option value="street">Esri Streets</option>
						<option value="osm">OpenStreetMap</option>
						<option value="stamen_terrain">Stamen Terrain (Stadia Maps)</option>
						<option value="worldcover_2021">ESA WorldCover 2021</option>
					</select>
				</div>
			</div>
			<DashboardSettingsPanel />
		</div>
	);
}
