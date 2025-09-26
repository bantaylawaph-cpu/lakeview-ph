// Client-side statistical tests using stdlib-js when available, with safe fallbacks.
// Heavy routines are dynamically imported to keep the initial bundle small.
let _wilcoxon;
let _tcdf, _chisqCdf, _binomCdf;
async function loadWilcoxon() {
  if (_wilcoxon) return _wilcoxon;
  try {
    const mod = await import('@stdlib/stats-wilcoxon');
    _wilcoxon = mod?.default || mod;
    return _wilcoxon;
  } catch (e) {
    // Propagate; caller may choose to fall back to a lightweight approximation
    throw e;
  }
}

async function loadTcdf(){
  if (_tcdf) return _tcdf;
  try {
    const mod = await import('@stdlib/stats-base-dists-t-cdf');
    _tcdf = mod?.default || mod;
  } catch {}
  return _tcdf;
}
async function loadChisqCdf(){
  if (_chisqCdf) return _chisqCdf;
  try {
    const mod = await import('@stdlib/stats-base-dists-chisquare-cdf');
    _chisqCdf = mod?.default || mod;
  } catch {}
  return _chisqCdf;
}
async function loadBinomCdf(){
  if (_binomCdf) return _binomCdf;
  try {
    const mod = await import('@stdlib/stats-base-dists-binomial-cdf');
    _binomCdf = mod?.default || mod;
  } catch {}
  return _binomCdf;
}
// No explicit normal CDF loader; a lightweight approximation is implemented below.

// Import minimal submodules when wiring in real environment; here we outline structure
// Example minimal imports (adjust paths as needed with your bundler):
// import tcdf from '@stdlib/stats/base/dists/t/cdf';
// import chisqCdf from '@stdlib/stats/base/dists/chisquare/cdf';
// import binomCdf from '@stdlib/stats/base/dists/binomial/cdf';
// import erf from '@stdlib/math/base/special/erf';

function mean(a){ if(!a||!a.length) return NaN; return a.reduce((s,v)=>s+v,0)/a.length; }
function variance(a){ if(!a||a.length<2) return NaN; const m=mean(a); return a.reduce((s,v)=>s+(v-m)*(v-m),0)/(a.length-1); }
function sd(a){ const v=variance(a); return Number.isFinite(v)?Math.sqrt(v):NaN; }

// Normal CDF using Abramowitz-Stegun approximation of erf
function normalCdf(x){
  // erf approximation constants
  const a1=0.254829592,a2=-0.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,p=0.3275911;
  const sign = x < 0 ? -1 : 1;
  const z = Math.abs(x)/Math.SQRT2;
  const t = 1/(1+p*z);
  const y = 1 - (((((a5*t + a4)*t) + a3)*t + a2)*t + a1)*t*Math.exp(-z*z);
  const erf = sign * y;
  return 0.5 * (1 + erf);
}

function tPValueApprox(t, df, alt='two-sided'){
  // Approximate t by normal for p-value; acceptable for moderate/large df.
  const z = Math.abs(t); const pTwo = 2*(1 - normalCdf(z));
  if (alt==='two-sided') return Math.max(0, Math.min(1, pTwo));
  // For one-sided, direction matters; we assume H1: mean > mu0 when t>0
  const pOne = 1 - normalCdf(t);
  return Math.max(0, Math.min(1, pOne));
}

async function tPValueStdlib(t, df, alt='two-sided'){
  const F = await loadTcdf();
  if (!F) return tPValueApprox(t, df, alt);
  const cdf = (x)=> F(x, df);
  const Ft = cdf(t);
  const Fa = cdf(Math.abs(t));
  if (alt==='two-sided') return Math.min(1, 2*(1 - Fa));
  // greater (right-tail)
  return Math.max(0, 1 - Ft);
}

export async function tOneSampleAsync(x, mu0, alpha=0.05, alt='two-sided'){
  const n=x.length; const m=mean(x); const s=sd(x); const t=(m-mu0)/(s/Math.sqrt(n)); const df=n-1;
  const p = await tPValueStdlib(t, df, alt);
  return { n, mean:m, sd:s, t, df, p_value:p, alpha, alternative: alt, significant: (p<alpha) };
}

export async function tTwoSampleWelchAsync(x, y, alpha=0.05, alt='two-sided'){
  const n1=x.length, n2=y.length; const m1=mean(x), m2=mean(y); const v1=variance(x), v2=variance(y);
  const se=Math.sqrt(v1/n1+v2/n2);
  const t=(m1-m2)/se;
  const df=(v1/n1+v2/n2)**2/((v1*v1)/((n1*n1)*(n1-1))+(v2*v2)/((n2*n2)*(n2-1)));
  const p = await tPValueStdlib(t, df, alt);
  return { n1,n2,mean1:m1,mean2:m2,sd1:Math.sqrt(v1),sd2:Math.sqrt(v2), t, df, p_value:p, alpha, alternative: alt, significant:(p<alpha) };
}

export async function tTwoSampleStudentAsync(x, y, alpha=0.05, alt='two-sided'){
  const n1=x.length, n2=y.length; const m1=mean(x), m2=mean(y); const v1=variance(x), v2=variance(y);
  const df = n1 + n2 - 2;
  const sp2 = ((n1-1)*v1 + (n2-1)*v2)/df; // pooled variance
  const se = Math.sqrt(sp2*(1/n1 + 1/n2));
  const t = (m1-m2)/se;
  const p = await tPValueStdlib(t, df, alt);
  return { n1,n2,mean1:m1,mean2:m2,sd1:Math.sqrt(v1),sd2:Math.sqrt(v2), t, df, p_value:p, alpha, alternative: alt, significant:(p<alpha) };
}

// Preview functions removed in favor of full async implementations

export async function wilcoxonSignedRankAsync(x, mu0, alpha=0.05, alt='two-sided'){
  try {
    const arr = x.map(v => v - mu0);
    const wilcoxon = await loadWilcoxon();
    const out = wilcoxon(arr, { alpha, alternative: alt });
    return {
      n: arr.filter(v=>Math.abs(v)>1e-12).length,
      statistic: out.statistic,
      p_value: out.pValue,
      alpha: out.alpha,
      rejected: !!out.rejected,
      alt
    };
  } catch (e) {
    // Fallback: compute normal-approximate Wilcoxon stats with tie correction
    const diffs = x.map(v=>v-mu0).filter(d=>Math.abs(d)>1e-12); // discard zeros, like zeroMethod='wilcox'
    const n = diffs.length;
    if (n === 0) {
      return { n: 0, statistic: 0, p_value: 1, alpha, alt, Wplus: 0, Wminus: 0 };
    }
    const items = diffs.map((d,i)=>({a:Math.abs(d), sign: d>0?1:-1, i})).sort((a,b)=>a.a-b.a);
    let rank=1,i=0; const ranks=new Array(n).fill(0);
    // rank absolute values with average ranks for ties and accumulate tie groups for variance correction
    const tieGroups = [];
    while(i<n){ let j=i; while(j<n && Math.abs(items[j].a-items[i].a)<1e-12) j++; const len=j-i; const avg=(rank+rank+len-1)/2; for(let k=i;k<j;k++) ranks[items[k].i]=avg; tieGroups.push(len); rank+=len; i=j; }
    let Wplus=0, Wminus=0; for(let k=0;k<n;k++){ if(diffs[k]>0) Wplus+=ranks[k]; else Wminus+=ranks[k]; }
    const W = Math.min(Wplus, Wminus);
    const muW = n*(n+1)/4;
    let tieSum = 0; for(const t of tieGroups){ if(t>1) tieSum += t*(t*t-1); }
    const varW = (n*(n+1)*(2*n+1) - tieSum)/24;
    const sdW = Math.sqrt(Math.max(varW, 1e-12));
    let p;
    if (alt === 'greater') {
      const z = (Wplus - muW - 0.5)/sdW; // right-tail
      p = Math.max(0, Math.min(1, 1 - normalCdf(z)));
    } else if (alt === 'less') {
      const z = (Wplus - muW + 0.5)/sdW; // left-tail
      p = Math.max(0, Math.min(1, normalCdf(z)));
    } else {
      const z = (W - muW + 0.5)/sdW; // two-sided uses smaller of W+/W-
      p = Math.max(0, Math.min(1, 2*(1 - normalCdf(Math.abs(z)))));
    }
    return { n, statistic: W, p_value: p, alpha, alt, Wplus, Wminus };
  }
}

// Exact binomial tail using log-domain to avoid overflow for moderate n
function logFactorial(n){ let s=0; for(let i=2;i<=n;i++) s+=Math.log(i); return s; }
function logChoose(n,k){ if(k<0||k>n) return -Infinity; return logFactorial(n)-logFactorial(k)-logFactorial(n-k); }
function binomPmf(n,k,p){ if(k<0||k>n) return 0; const lf=logChoose(n,k) + (k*Math.log(p)) + ((n-k)*Math.log(1-p)); return Math.exp(lf); }
function binomCdf(n,k,p){ // sum_{i=0..k}
  if(k<0) return 0; if(k>=n) return 1; let s=0; for(let i=0;i<=k;i++) s+=binomPmf(n,i,p); return Math.min(1, s);
}
function signTest(x, mu0, alpha=0.05, alt='two-sided'){
  let pos=0,neg=0; for(const v of x){ const d=v-mu0; if(Math.abs(d)<1e-12) continue; if(d>0) pos++; else neg++; }
  const n = pos+neg; const k = pos; const p0 = 0.5;
  let p;
  if(alt==='greater'){ p = 1 - binomCdf(n, k-1, p0); }
  else if(alt==='less'){ p = binomCdf(n, k, p0); }
  else { // two-sided: doubling the smaller tail
    const lower = binomCdf(n, Math.min(k, n-k), p0);
    p = Math.min(1, 2*lower);
  }
  return { n, k_positive: pos, k_negative: neg, p_value: p, alpha, alternative: alt, significant: (p<alpha) };
}

export async function signTestAsync(x, mu0, alpha=0.05, alt='two-sided'){
  let pos=0,neg=0; for(const v of x){ const d=v-mu0; if(Math.abs(d)<1e-12) continue; if(d>0) pos++; else neg++; }
  const n = pos+neg; const k = pos; const p0 = 0.5;
  const F = await loadBinomCdf();
  if (F){
    let p;
    if(alt==='greater'){ p = 1 - F(k-1, n, p0); }
    else if(alt==='less'){ p = F(k, n, p0); }
    else { const lower = Math.min(F(k, n, p0), F(n-k, n, p0)); p = Math.min(1, 2*lower); }
    return { n, k_positive: pos, k_negative: neg, p_value: p, alpha, alternative: alt, significant: (p<alpha) };
  }
  return signTest(x, mu0, alpha, alt);
}

export function mannWhitney(x, y, alpha=0.05, alt='two-sided'){
  const n1=x.length, n2=y.length; const comb=[...x.map(v=>({v,g:1})), ...y.map(v=>({v,g:2}))].sort((a,b)=>a.v-b.v);
  const N=n1+n2; const ranks=new Array(N).fill(0); let i=0,rank=1;
  while(i<N){ let j=i; while(j<N && Math.abs(comb[j].v-comb[i].v)<1e-12) j++; const len=j-i; const avg=(rank+rank+len-1)/2; for(let k=i;k<j;k++) ranks[k]=avg; rank+=len; i=j; }
  let R1=0; for(let k=0;k<N;k++){ if(comb[k].g===1) R1+=ranks[k]; }
  const U1 = R1 - n1*(n1+1)/2; const U2 = n1*n2 - U1;
  // Normal approximation with tie correction
  let tieSum = 0; i=0;
  while(i<N){ let j=i; while(j<N && Math.abs(comb[j].v-comb[i].v)<1e-12) j++; const t=j-i; if(t>1) tieSum += t*(t*t-1); i=j; }
  const mu = n1*n2/2;
  let varU = n1*n2*(N+1)/12;
  if (tieSum>0) varU -= n1*n2* tieSum /(12*N*(N-1));
  const U = Math.min(U1,U2);
  const z = (U - mu + 0.5)/Math.sqrt(varU); // continuity correction
  const pTwo = 2*(1 - normalCdf(Math.abs(z)));
  const p = (alt==='two-sided') ? pTwo : (1 - normalCdf(z));
  return { n1,n2,U,U1,U2,z,p_value:p, alpha, alternative: alt, significant: (p<alpha) };
}

export async function moodMedianAsync(x, y, alpha=0.05){
  const all=[...x,...y].sort((a,b)=>a-b); const N=all.length; const mid=Math.floor(N/2); const med=(N%2)?all[mid]:(all[mid-1]+all[mid])/2;
  let c11=0,c12=0; for(const v of x){ if(v<=med) c11++; else c12++; }
  let c21=0,c22=0; for(const v of y){ if(v<=med) c21++; else c22++; }
  const row1=c11+c12, row2=c21+c22, col1=c11+c21, col2=c12+c22, total=row1+row2;
  const exp11=row1*col1/total, exp12=row1*col2/total, exp21=row2*col1/total, exp22=row2*col2/total;
  const chi2 = ((c11-exp11)**2/exp11) + ((c12-exp12)**2/exp12) + ((c21-exp21)**2/exp21) + ((c22-exp22)**2/exp22);
  // Prefer stdlib chi-square CDF if available; otherwise use normal approx via Z^2
  let p;
  try {
    const F = await loadChisqCdf();
    if (F) {
      // p = 1 - CDF(chi2; df=1)
      p = Math.max(0, Math.min(1, 1 - F(chi2, 1)));
    } else {
      p = 2*(1 - normalCdf(Math.sqrt(Math.max(0,chi2))));
    }
  } catch {
    p = 2*(1 - normalCdf(Math.sqrt(Math.max(0,chi2))));
  }
  return { median: med, table: [[c11,c12],[c21,c22]], chi2, df:1, p_value: p, alpha, significant: (p<alpha) };
}

export async function tostEquivalenceAsync(x, lower, upper, alpha=0.05){
  const n=x.length; const m=mean(x); const s=sd(x); const se=s/Math.sqrt(n); const df=n-1;
  const t1=(m - lower)/se; const t2=(upper - m)/se;
  const p1 = await tPValueStdlib(t1, df, 'greater');
  const p2 = await tPValueStdlib(t2, df, 'greater');
  const equivalent = (p1 < alpha) && (p2 < alpha);
  return { type:'tost', n, mean:m, sd:s, df, t1, t2, p1, p2, alpha, equivalent };
}
