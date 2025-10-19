import React from 'react';

export default function DashboardHeader({ icon = null, title = '', description = '', actions = null }) {
  return (
    <div className="dashboard-card" style={{ marginBottom: 12 }}>
      <div className="dashboard-card-header">
        <div className="dashboard-card-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {icon ? <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span> : null}
          <span>{title}</span>
        </div>
        {actions ? <div className="org-actions-right">{actions}</div> : null}
      </div>
      {description ? (
        <p style={{ marginTop: 8, fontSize: 13, color: '#6b7280' }}>{description}</p>
      ) : null}
    </div>
  );
}
