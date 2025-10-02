import React from 'react';
import SettingsForm from './SettingsForm';
import { getCurrentUser } from '../../lib/authState';

// Simple wrapper now; can evolve into tabbed layout later.
export default function DashboardSettingsPanel() {
  const user = getCurrentUser();
  if (!user) return <div className="content-page"><p>Loading account…</p></div>;
  return (
    <div className="content-page dashboard-settings-panel">
      <SettingsForm context="dashboard" />
    </div>
  );
}
