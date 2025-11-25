// Run two-sample tests using existing helpers
// Run: node resources/js/stats/run_group_tests.mjs


import * as stats from './statsUtils.js';


const alpha = 0.05;
const groupA = [3.6,5.3,4.7,2.5,1.9,1.3,1.8,5.7,3.4,3.8,2.3,3.5,3,2.8,9,8,5,7,5,7,8,8,5,5,20,4,6,4,6,7,6,5,5,4,9,4,7,6,5,10,6,6,9,6,5,3,6,5,4,4,7,6,11,7,10,7,7,7,7,2,7,7,5,8,7,8,7,5,11,8,5,5,2,14,10,6,4,4,17,4,27,6,10,11,9];
const groupB = [7,6,13,7,5,5,4,34,6,6,6,10,5,8,8,20,5,5,7,11,9,8,16,18,36,9,9,5,7,30,6,5,6,15,7,4,8,7,10,11,13,10,5,19,8,9,10,14,3,9,8,11,10,10,16,8,13,8,6,1,14,14,13,11,15,10,12,14,18,9,14,14];


function mean(a){ return a.reduce((s,v)=>s+v,0)/a.length; }
function median(a){ const s=[...a].sort((x,y)=>x-y); const n=s.length; const m=Math.floor(n/2); return n%2? s[m] : (s[m-1]+s[m])/2; }


(async ()=>{
  console.log('\n=== Two-sample tests (alpha=0.05) ===\n');
  console.log('Group A: n=', groupA.length, ' mean=', mean(groupA).toFixed(4), ' median=', median(groupA).toFixed(4));
  console.log('Group B: n=', groupB.length, ' mean=', mean(groupB).toFixed(4), ' median=', median(groupB).toFixed(4));


  // Shapiro-Wilk for each group (synchronous function available)
  try {
    const swA = stats.shapiroWilk(groupA, alpha);
    const swB = stats.shapiroWilk(groupB, alpha);
    console.log('\nShapiro-Wilk:');
    console.log('  Group A p =', swA.p_value);
    console.log('  Group B p =', swB.p_value);
  } catch (e) { console.log('Shapiro-Wilk error:', e); }


  // Levene test (async)
  let leveneRes;
  try {
    leveneRes = await stats.leveneTestAsync([groupA, groupB], alpha, 'median');
    console.log('\nLevene (Brown-Forsythe) p-value =', leveneRes.p_value);
  } catch (e) { console.log('Levene error:', e.message || e); }


  // Student t-test (pooled)
  try {
    const stud = await stats.tTwoSampleStudentAsync(groupA, groupB, alpha, 'two-sided');
    console.log('\nStudent t-test (pooled) p-value =', stud.p_value);
  } catch (e) { console.log('Student t error:', e.message || e); }


  // Welch t-test
  try {
    const welch = await stats.tTwoSampleWelchAsync(groupA, groupB, alpha, 'two-sided');
    console.log('\nWelch t-test p-value =', welch.p_value);
  } catch (e) { console.log('Welch t error:', e.message || e); }


  // Mann-Whitney U
  try {
    const mw = await stats.mannWhitneyAsync(groupA, groupB, alpha, 'two-sided');
    console.log('\nMann-Whitney U test p-value =', mw.p_value);
  } catch (e) { console.log('Mann-Whitney error:', e.message || e); }


  // Mood's median test
  try {
    const mood = await stats.moodMedianAsync(groupA, groupB, alpha);
    console.log('\nMood\'s median test p-value =', mood.p_value);
  } catch (e) { console.log('Mood median error:', e.message || e); }


})();
