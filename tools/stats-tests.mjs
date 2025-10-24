#!/usr/bin/env node
// Statistical tests harness for lakeview-ph
// Runs all available tests in resources/js/stats/statsUtils.js against provided mock data
// and prints p-values and key statistics for comparison with R scripts.

import {
  shapiroWilkAsync,
  tOneSampleAsync,
  wilcoxonSignedRankAsync,
  signTestAsync,
  tostEquivalenceAsync,
  tostEquivalenceWilcoxonAsync,
  tTwoSampleStudentAsync,
  tTwoSampleWelchAsync,
  mannWhitneyAsync,
  moodMedianAsync,
  leveneTwoSampleAsync
} from '../resources/js/stats/statsUtils.js';

import { computeSMKFromSeasonSeries } from '../resources/js/stats/seasonalMK.js';

const conf_level = 0.95;
const alpha = 1 - conf_level; // 0.05

// Lake vs Parameter Threshold (single bound)
let LakeA_single = [
  3.6, 5.3, 4.7, 2.5, 1.9, 1.3, 1.8, 5.7, 3.4, 3.8, 2.3, 3.5, 3, 2.8, 9, 8, 5, 7, 5, 7, 8, 8, 5, 5, 20, 4, 6, 4, 6, 7, 6, 5, 5, 4, 9, 4, 7, 6, 5, 10, 6, 6, 9, 6, 5, 3, 6, 5, 4, 4, 7, 6, 11, 7, 10, 7, 7, 7, 7, 2, 7, 7, 5, 8, 7, 8, 7, 5, 11, 8, 5, 5, 2, 14, 10, 6, 4, 4, 17, 4, 27, 6, 10, 11, 9
];
let mu0 = 7;

// Lake vs Parameter Threshold (range)
let LakeA_range = [
  7.5, 7.9, 8.1, 8.8, 8.9, 8.6, 8, 7.4, 8.6, 8, 8.5, 7.5, 7.6, 7.9, 7.3, 7.5, 7.3, 7.6, 7.3, 7.4, 7.2, 7.1, 7.1, 6.8, 7, 7.1, 7.7, 7.2, 7.3, 7.1, 6.8, 6.9, 7, 7, 6.7, 7.1, 7.2, 7.2, 7.3, 7.1, 7.3, 7, 7, 6.9, 7.3, 7.4, 8.7, 9.3, 9, 7.9, 7.4, 7.8, 7, 7.3, 7.6, 7.2, 7.1, 7.1, 8.2, 7.6, 7, 7.1, 8.1, 7.3, 6.7, 7.2, 6.6, 7, 7.3, 6.9, 8.5, 8.4, 7.2, 8.1, 8.3, 6.9, 6.7, 7.6, 7.4, 7.2, 7.1, 7.7, 7.3, 7.8, 7, 7, 7
];
let lower = 6.5, upper = 8.5;

// Dataset override via CLI: --dataset=B (default A)
const _args = process.argv.slice(2);
const _argLower = _args.map(s=>s.toLowerCase());
const _dsArg = _argLower.find(a=>a.startsWith('--dataset='));
const _dsVal = _dsArg ? _dsArg.split('=')[1] : (_argLower.includes('--dataset=b') ? 'b' : (_argLower.includes('--dataset=a') ? 'a' : 'a'));
if (_dsVal === 'b'){
  // Test B values
  LakeA_single = [
    1, 2, 2, 2, 2, 2, 1, 2, 1, 2, 1, 1, 1, 2, 2, 4, 3, 6, 2, 4, 4, 7, 4, 4, 4, 2, 3, 3, 3, 3, 2, 4, 4, 6, 6, 4, 2, 2, 2, 2, 2, 2, 2, 3, 3, 4, 4
  ];
  LakeA_range = [
    8.2, 8.1, 8.4, 8.3, 8.5, 8.4, 8.5, 8.4, 8.4, 8.3, 8.7, 8.2, 8.1, 8.3, 8.1, 9.4, 8.7, 9.3, 8.6, 9.1, 7.7, 9.4, 9.2, 8.9, 9, 8.8, 9.1, 8.8, 7.8, 7.6, 7.8, 8.9, 8.7, 7.8, 7.7, 8, 7.9, 8.1, 8.7, 8.6, 7.6, 7.8, 7.3, 7.4, 7.6, 9.4, 7.8
  ];
  lower = 6.5; upper = 9;
}

// Lake vs Lake comparison
let LakeA = [...LakeA_single];
let LakeB = (_dsVal === 'b')
  ? [ 3.2, 3.5, 3.8, 4.1, 3.9, 3.7, 4.5, 4.8, 3.6, 3.3, 3.1, 4 ]
  : [
    7, 6, 13, 7, 5, 5, 4, 34, 6, 6, 6, 10, 5, 8, 8, 20, 5, 5, 7, 11, 9, 8, 16, 18, 36, 9, 9, 5, 7, 30, 6, 5, 6, 15, 7, 4, 8, 7, 10, 11, 13, 10, 5, 19, 8, 9, 10, 14, 3, 9, 8, 11, 10, 10, 16, 8, 13, 8, 6, 1, 14, 14, 13, 11, 15, 10, 12, 14, 18, 9, 14, 14
  ];

function fmt(x) {
  if (x === null || x === undefined) return String(x);
  if (typeof x === 'number') return Number.isFinite(x) ? x.toFixed(6) : String(x);
  return String(x);
}

function pfmt(p){
  if (p === null || p === undefined) return String(p);
  if (!Number.isFinite(p)) return String(p);
  if (p < 0.001) return `<0.001 (p=${p.toExponential(2)})`;
  if (p > 0.999) return `>0.999 (p=${p.toFixed(6)})`;
  return p.toFixed(6);
}

function printBlock(title, rows) {
  console.log(`\n=== ${title} ===`);
  for (const [k, v] of rows) {
    const kLower = String(k).toLowerCase();
    if (typeof v === 'object' && v && !Array.isArray(v)) {
      console.log(`${k}:`);
      for (const [kk, vv] of Object.entries(v)) {
        const kkLower = String(kk).toLowerCase();
        const isP = kkLower.startsWith('p') || kkLower.includes('p_value');
        const out = (typeof vv === 'number' && isP) ? pfmt(vv) : fmt(vv);
        console.log(`  - ${kk}: ${out}`);
      }
    } else {
      const isP = kLower.startsWith('p') || kLower.includes('p_value');
      const out = (typeof v === 'number' && isP) ? pfmt(v) : fmt(v);
      console.log(`${k}: ${out}`);
    }
  }
}

async function safeRun(title, fn) {
  try {
    const out = await fn();
    return out;
  } catch (e) {
    printBlock(title, [['status', 'SKIPPED'], ['reason', e?.message || String(e)]]);
    return null;
  }
}

(async function main(){
  console.log(`Stats Tester — alpha=${alpha} (conf_level=${conf_level})`);

  // Normality (run on Lake A single and Lake B)
  {
    const resA = await safeRun('Shapiro–Wilk (Lake A, single-bound dataset)', async ()=> shapiroWilkAsync(LakeA_single, alpha));
    if (resA) printBlock('Shapiro–Wilk (Lake A)', [['n', resA.n], ['W', resA.W], ['p_value', resA.p_value], ['normal', resA.normal]]);
    const resB = await safeRun('Shapiro–Wilk (Lake B)', async ()=> shapiroWilkAsync(LakeB, alpha));
    if (resB) printBlock('Shapiro–Wilk (Lake B)', [['n', resB.n], ['W', resB.W], ['p_value', resB.p_value], ['normal', resB.normal]]);
  }

  // Variance (A vs B)
  {
    const res = await safeRun('Levene (Brown–Forsythe median-centered)', async ()=> leveneTwoSampleAsync(LakeA, LakeB, alpha, 'median'));
    if (res) printBlock('Levene (A vs B)', [['method', res.method], ['F', res.F], ['df1', res.df1], ['df2', res.df2], ['p_value', res.p_value], ['equal_variances', res.equal_variances]]);
  }

  // Lake vs Parameter Threshold (mu0=7)
  {
    const alts = ['greater', 'less', 'two-sided'];
    for (const alt of alts){
      const t1 = await safeRun(`One-sample t-test (A vs 7, ${alt})`, async ()=> tOneSampleAsync(LakeA_single, mu0, alpha, alt));
      if (t1) printBlock(`One-sample t-test (${alt})`, [['n', t1.n], ['mean', t1.mean], ['sd', t1.sd], ['t', t1.t], ['df', t1.df], ['p_value', t1.p_value], ['alternative', t1.alternative], ['significant', t1.significant]]);

      const w1 = await safeRun(`Wilcoxon signed-rank (A vs 7, ${alt})`, async ()=> wilcoxonSignedRankAsync(LakeA_single, mu0, alpha, alt));
      if (w1) printBlock(`Wilcoxon signed-rank (${alt})`, [['n', w1.n], ['statistic', w1.statistic], ['p_value', w1.p_value], ['alternative', w1.alt || alt], ['rejected', w1.rejected]]);

      const s1 = await safeRun(`Sign test (A vs 7, ${alt})`, async ()=> signTestAsync(LakeA_single, mu0, alpha, alt));
      if (s1) printBlock(`Sign test (${alt})`, [['n', s1.n], ['k_positive', s1.k_positive], ['k_negative', s1.k_negative], ['p_value', s1.p_value], ['alternative', s1.alternative], ['significant', s1.significant]]);
    }
  }

  // Lake vs Parameter Threshold (Range)
  {
    const tTOST = await safeRun(`TOST t (A vs [${lower}, ${upper}])`, async ()=> tostEquivalenceAsync(LakeA_range, lower, upper, alpha));
    if (tTOST) {
      const pTOST = Math.max(tTOST.p1, tTOST.p2);
      printBlock('TOST t', [['n', tTOST.n], ['mean', tTOST.mean], ['sd', tTOST.sd], ['df', tTOST.df], ['t1 (mean>lower)', tTOST.t1], ['t2 (mean<upper)', tTOST.t2], ['p1', tTOST.p1], ['p2', tTOST.p2], ['pTOST', pTOST], ['equivalent', tTOST.equivalent]]);
    }

  const wTOST = await safeRun(`TOST Wilcoxon (A vs [${lower}, ${upper}])`, async ()=> tostEquivalenceWilcoxonAsync(LakeA_range, lower, upper, alpha));
    if (wTOST) printBlock('TOST Wilcoxon', [['n', wTOST.n], ['median', wTOST.median], ['mean', wTOST.mean], ['sd', wTOST.sd], ['w_lower', wTOST.w_lower], ['w_upper', wTOST.w_upper], ['p_lower', wTOST.p_lower], ['p_upper', wTOST.p_upper], ['pTOST', wTOST.pTOST], ['equivalent', wTOST.equivalent], ['note', wTOST.note || '']]);
  }

  // Lake vs Lake
  {
    const tStu = await safeRun('Student t-test (A vs B, two-sided)', async ()=> tTwoSampleStudentAsync(LakeA, LakeB, alpha, 'two-sided'));
    if (tStu) printBlock('Student t-test', [['n1', tStu.n1], ['n2', tStu.n2], ['mean1', tStu.mean1], ['mean2', tStu.mean2], ['sd1', tStu.sd1], ['sd2', tStu.sd2], ['t', tStu.t], ['df', tStu.df], ['p_value', tStu.p_value], ['significant', tStu.significant]]);

    const tWelch = await safeRun('Welch t-test (A vs B, two-sided)', async ()=> tTwoSampleWelchAsync(LakeA, LakeB, alpha, 'two-sided'));
    if (tWelch) printBlock('Welch t-test', [['n1', tWelch.n1], ['n2', tWelch.n2], ['mean1', tWelch.mean1], ['mean2', tWelch.mean2], ['sd1', tWelch.sd1], ['sd2', tWelch.sd2], ['t', tWelch.t], ['df', tWelch.df], ['p_value', tWelch.p_value], ['significant', tWelch.significant]]);

    const mw = await safeRun('Mann–Whitney U (A vs B, two-sided)', async ()=> mannWhitneyAsync(LakeA, LakeB, alpha, 'two-sided'));
    if (mw) printBlock('Mann–Whitney U', [['n1', mw.n1], ['n2', mw.n2], ['U', mw.U], ['U1', mw.U1], ['U2', mw.U2], ['z', mw.z], ['p_value', mw.p_value], ['significant', mw.significant]]);

    const mood = await safeRun("Mood's median (A vs B)", async ()=> moodMedianAsync(LakeA, LakeB, alpha));
    if (mood) printBlock("Mood's median", [['median (global)', mood.median], ['table [[A<=, A>],[B<=, B>]]', JSON.stringify(mood.table)], ['chi2', mood.chi2], ['df', mood.df], ['p_value', mood.p_value], ['significant', mood.significant]]);
  }

  console.log('\nDone.');
})();

// ----------------------- Seasonal MK quick checks ---------------------------
// Synthetic season-series to sanity-check SMK direction and p-values roughly.
(async function seasonalChecks(){
  const header = (t)=> console.log(`\n=== Seasonal MK – ${t} ===`);
  // Build increasing trend: Wet values grow by 1 each year, Dry values grow by 0.5
  const years = [2016,2017,2018,2019,2020,2021,2022];
  const wet = years.map((y,i)=>({ year:y, value: 10 + i*1 }));
  const dry = years.map((y,i)=>({ year:y, value:  8 + i*0.5 }));
  header('increasing');
  try {
    const res = await computeSMKFromSeasonSeries({ wet, dry });
    console.log(`Z=${res.Z?.toFixed(3)} p=${res.p_value?.toFixed(6)} dir=${res.direction}`);
  } catch(e){ console.log('SKIPPED seasonal increasing:', e?.message||String(e)); }

  // Decreasing trend
  const wetD = years.map((y,i)=>({ year:y, value: 10 - i*1 }));
  const dryD = years.map((y,i)=>({ year:y, value:  8 - i*0.5 }));
  header('decreasing');
  try {
    const res = await computeSMKFromSeasonSeries({ wet: wetD, dry: dryD });
    console.log(`Z=${res.Z?.toFixed(3)} p=${res.p_value?.toFixed(6)} dir=${res.direction}`);
  } catch(e){ console.log('SKIPPED seasonal decreasing:', e?.message||String(e)); }

  // Flat (no trend)
  const wetF = years.map((y)=>({ year:y, value: 5 }));
  const dryF = years.map((y)=>({ year:y, value: 5 }));
  header('no-trend');
  try {
    const res = await computeSMKFromSeasonSeries({ wet: wetF, dry: dryF });
    console.log(`Z=${res.Z?.toFixed(3)} p=${res.p_value?.toFixed(6)} dir=${res.direction}`);
  } catch(e){ console.log('SKIPPED seasonal no-trend:', e?.message||String(e)); }
})();
