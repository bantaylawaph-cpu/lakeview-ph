import React from 'react';

export default function StatusMessages({ error = '', yearError = '' }) {
  return (
    <div style={{ marginTop:8 }}>
      {error && <div style={{ color:'#ff8080', fontSize:12 }}>{error}</div>}
      {!error && yearError && <div style={{ color:'#ffb3b3', fontSize:12 }}>{yearError}</div>}
    </div>
  );
}
