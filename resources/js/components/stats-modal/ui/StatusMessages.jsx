import React from 'react';

export default function StatusMessages({ error = '', yearError = '', advisories = [] }) {
  return (
    <div style={{ marginTop:8 }}>
      {error && <div style={{ color:'#ff8080', fontSize:12 }}>{error}</div>}
      {!error && yearError && <div style={{ color:'#ffb3b3', fontSize:12 }}>{yearError}</div>}
      {advisories.length ? (
        <div style={{ marginTop:6, fontSize:12, color:'#f0f0f0' }}>
          <strong>Advisories:</strong>
          <ul style={{ margin:'4px 0 0 16px', padding:0 }}>
            {advisories.map((a,i)=>(<li key={`adv-${i}`}>{a}</li>))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
