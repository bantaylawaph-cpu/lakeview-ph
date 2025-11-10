import React from 'react';

// Encapsulates test selection + disabled logic
export default function TestSelector({ inferredTest, paramHasRange, selectedTest, onChange }) {
  return (
    <select className="pill-btn" value={selectedTest} onChange={(e)=>onChange(e.target.value)} style={{ flex:1, minWidth:0, boxSizing:'border-box', padding:'10px 12px', fontSize:12, height:40, lineHeight:'20px' }}>
      <option value="" disabled>Select test</option>
      {inferredTest === 'one-sample' && (
        <option value="diagnostic_one">Shapiro–Wilk Test</option>
      )}
      {inferredTest === 'two-sample' && (
        <option value="diagnostic_two">Shapiro–Wilk + Levene Test</option>
      )}
      <option value="t_one_sample" disabled={inferredTest!=='one-sample' || paramHasRange}>One-sample t-test</option>
      <option value="wilcoxon_signed_rank" disabled={inferredTest!=='one-sample' || paramHasRange}>Wilcoxon signed-rank</option>
      <option value="sign_test" disabled={inferredTest!=='one-sample' || paramHasRange}>Sign test</option>
      <option value="tost" disabled={inferredTest!=='one-sample' || !paramHasRange}>Equivalence TOST t</option>
      <option value="tost_wilcoxon" disabled={inferredTest!=='one-sample' || !paramHasRange}>Equivalence TOST Wilcoxon</option>
      <option value="t_student" disabled={inferredTest!=='two-sample'}>Student t-test</option>
      <option value="t_welch" disabled={inferredTest!=='two-sample'}>Welch t-test</option>
      <option value="mann_whitney" disabled={inferredTest!=='two-sample'}>Mann–Whitney U</option>
      <option value="mood_median_test" disabled={inferredTest!=='two-sample'}>Mood median test</option>
    </select>
  );
}
