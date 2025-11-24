import React from 'react';
import { alertSuccess, alertError } from '../../lib/alerts';

export default function ValuesTable({ result, lakes, lakeId, compareValue, showAllValues, setShowAllValues, fmt }) {
  if (!result) return null;
  const events = Array.isArray(result.events) ? result.events : null;
  const one = Array.isArray(result.sample_values) ? result.sample_values : null;
  const two1 = Array.isArray(result.sample1_values) ? result.sample1_values : null;
  const two2 = Array.isArray(result.sample2_values) ? result.sample2_values : null;
  if (!events && !one && !(two1 && two2)) return null;

  const limit = 20;
  const showAll = showAllValues;
  const slice = (arr) => (showAll ? arr : arr.slice(0, limit));

  const lakeName = (id) => {
    const lk = lakes.find(l => String(l.id) === String(id));
    return lk ? (lk.name || `Lake ${lk.id}`) : (id == null ? '' : `Lake ${id}`);
  };

  const groupLabel = (a,b,idx) => {
    if (!(a && b)) return idx === 1 ? 'Group 1' : 'Group 2';
    if (idx === 1) {
      if (String(lakeId) === 'custom') return 'Custom dataset';
      const lake = lakes.find(l => String(l.id) === String(lakeId));
      return lake?.name ? `${lake.name}` : 'Group 1';
    }
    if (compareValue && String(compareValue).startsWith('lake:')){
      const otherId = String(compareValue).split(':')[1];
      const lake2 = lakes.find(l => String(l.id) === String(otherId));
      return lake2?.name ? `${lake2.name}` : 'Group 2';
    }
    return 'Group 2';
  };

  const copyValues = async () => {
    try {
      let text = '';
      if (events) {
        const lines = [ 'sampled_at,lake,station_id,value' ];
        slice(events).forEach(ev => lines.push(`${ev.sampled_at || ''},"${lakeName(ev.lake_id)}",${ev.station_id ?? ''},${ev.value ?? ''}`));
        text = lines.join('\n');
      } else if (one) {
        text = slice(one).join(', ');
      } else {
        const maxLen = Math.max(two1.length, two2.length);
        const lines = [ [groupLabel(two1,two2,1), groupLabel(two1,two2,2)].join(',') ];
        for (let i=0;i<maxLen;i++) {
          const a = i < two1.length ? two1[i] : '';
          const b = i < two2.length ? two2[i] : '';
          lines.push(`${a},${b}`);
        }
        text = lines.join('\n');
      }
      if (navigator?.clipboard?.writeText) await navigator.clipboard.writeText(text); else {
        const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
      }
      alertSuccess('Copied', 'Values copied to clipboard.');
    } catch (e) {
      alertError('Copy failed', 'Could not copy values to clipboard.');
    }
  };

  const copyValuesOnly = async () => {
    try {
      let text = '';
      if (events) text = slice(events).map(ev => (ev.value != null ? ev.value : '')).join(', ');
      else if (one) text = slice(one).join(', ');
      else if (two1 && two2) {
        const a = slice(two1).join(', ');
        const b = slice(two2).join(', ');
        text = `${groupLabel(two1,two2,1)}: ${a}\n${groupLabel(two1,two2,2)}: ${b}`;
      }
      if (!text) throw new Error('No values to copy');
      if (navigator?.clipboard?.writeText) await navigator.clipboard.writeText(text); else {
        const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
      }
      alertSuccess('Copied', 'Values copied to clipboard.');
    } catch (e) {
      alertError('Copy failed', 'Could not copy values to clipboard.');
    }
  };

  return (
    <div style={{ marginTop:10, padding:10, background:'rgba(255,255,255,0.02)', borderRadius:6 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <strong>{String(lakeId) === 'custom' && one ? `Custom dataset values (${one.length})` : 'Data used'}</strong>
        <div style={{ display:'flex', gap:8 }}>
          <button className="pill-btn" onClick={()=>setShowAllValues(s=>!s)}>{showAll ? `Show first ${limit}` : 'Show all'}</button>
          <button className="pill-btn" onClick={copyValues}>Copy</button>
          <button className="pill-btn" onClick={copyValuesOnly}>Copy values</button>
        </div>
      </div>
      {events ? (
        <div style={{ marginTop:8 }}>
          <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.02)', borderRadius:6, minWidth:0 }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13, tableLayout:'fixed', minWidth:0 }}>
              <thead>
                <tr style={{ textAlign:'left', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                  <th style={{ padding:'6px 8px' }}>Sampled at</th>
                  <th style={{ padding:'6px 8px' }}>Lake</th>
                  <th style={{ padding:'6px 8px' }}>Station</th>
                  <th style={{ padding:'6px 8px' }}>Value</th>
                </tr>
              </thead>
              <tbody>
                {slice(events).map((ev,i)=>(
                  <tr key={i} style={{ borderBottom:'1px solid rgba(255,255,255,0.02)' }}>
                    <td style={{ padding:'6px 8px', fontSize:12 }}>{(() => {
                      try {
                        if (!ev.sampled_at) return '';
                        const d = new Date(ev.sampled_at);
                        if (!d || Number.isNaN(d.getTime())) return (ev.sampled_at || '').split(' ')[0] || '';
                        const day = d.getDate();
                        const month = d.toLocaleString(undefined, { month: 'long' });
                        const year = d.getFullYear();
                        return `${day} ${month} ${year}`;
                      } catch (e) { return (ev.sampled_at || '').split(' ')[0] || ''; }
                    })()}</td>
                    <td style={{ padding:'6px 8px', fontSize:12 }}>{lakeName(ev.lake_id)}</td>
                    <td style={{ padding:'6px 8px', fontSize:12 }}>{ev.station_name ?? (ev.station_id ?? '')}</td>
                    <td style={{ padding:'6px 8px', fontSize:12 }}>{ev.value != null ? fmt(ev.value) : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!showAll && events.length > limit && (
            <div style={{ marginTop:6, fontSize:11, opacity:0.65 }}>Showing first {limit} of {events.length} events</div>
          )}
        </div>
      ) : one ? (
        <div style={{ marginTop:8, fontFamily:'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize:12, lineHeight:'18px', whiteSpace:'pre-wrap', wordBreak:'break-word' }}>
          {slice(one).join(', ')}
          {!showAll && one.length > limit && (
            <div style={{ marginTop:6, fontSize:11, opacity:0.65 }}>Showing first {limit} of {one.length} values</div>
          )}
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:8 }}>
          <div>
            <div style={{ fontSize:12, opacity:0.8, marginBottom:6 }}>{groupLabel(two1, two2, 1)} ({two1.length})</div>
            <div style={{ fontFamily:'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize:12, lineHeight:'18px', whiteSpace:'pre-wrap', wordBreak:'break-word' }}>
              {slice(two1).join(', ')}
              {!showAll && two1.length > limit && (
                <div style={{ marginTop:6, fontSize:11, opacity:0.65 }}>Showing first {limit} of {two1.length} values</div>
              )}
            </div>
          </div>
          <div>
            <div style={{ fontSize:12, opacity:0.8, marginBottom:6 }}>{groupLabel(two1, two2, 2)} ({two2.length})</div>
            <div style={{ fontFamily:'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize:12, lineHeight:'18px', whiteSpace:'pre-wrap', wordBreak:'break-word' }}>
              {slice(two2).join(', ')}
              {!showAll && two2.length > limit && (
                <div style={{ marginTop:6, fontSize:11, opacity:0.65 }}>Showing first {limit} of {two2.length} values</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
