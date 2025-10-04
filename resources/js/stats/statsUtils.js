// stats utilities (helpers and tests)
let _wilcoxon;
let _tcdf, _chisqCdf, _binomCdf, _normalCdf, _fCdf;
async function loadWilcoxon() {
  if (_wilcoxon) return _wilcoxon;
  try {
    const mod = await import('@stdlib/stats-wilcoxon');
    _wilcoxon = mod?.default || mod;
    return _wilcoxon;
  } catch (e) {
    // Let callers handle missing module: return null so callers can alert
    _wilcoxon = null;
    return null;
  }
}

async function loadTcdf(){
  if (_tcdf) return _tcdf;
  try { const mod = await import('@stdlib/stats-base-dists-t-cdf'); _tcdf = mod?.default || mod; } catch { _tcdf = null; }
  return _tcdf;
}
async function loadChisqCdf(){
  if (_chisqCdf) return _chisqCdf;
  try { const mod = await import('@stdlib/stats-base-dists-chisquare-cdf'); _chisqCdf = mod?.default || mod; } catch { _chisqCdf = null; }
  return _chisqCdf;
}
async function loadBinomCdf(){
  if (_binomCdf) return _binomCdf;
  try { const mod = await import('@stdlib/stats-base-dists-binomial-cdf'); _binomCdf = mod?.default || mod; } catch { _binomCdf = null; }
  return _binomCdf;
}

async function loadNormalCdf(){
  if (_normalCdf) return _normalCdf;
  try { const mod = await import('@stdlib/stats-base-dists-normal-cdf'); _normalCdf = mod?.default || mod; } catch { _normalCdf = null; }
  return _normalCdf;
}

async function loadFCdf(){
  if (_fCdf) return _fCdf;
  try { const mod = await import('@stdlib/stats-base-dists-f-cdf'); _fCdf = mod?.default || mod; } catch { _fCdf = null; }
  return _fCdf;
}

function mean(a){ if(!a||!a.length) return NaN; return a.reduce((s,v)=>s+v,0)/a.length; }
function variance(a){ if(!a||a.length<2) return NaN; const m=mean(a); return a.reduce((s,v)=>s+(v-m)*(v-m),0)/(a.length-1); }
function sd(a){ const v=variance(a); return Number.isFinite(v)?Math.sqrt(v):NaN; }
function median(a){ if(!a||!a.length) return NaN; const s=[...a].sort((x,y)=>x-y); const n=s.length; const m=Math.floor(n/2); return n%2? s[m] : (s[m-1]+s[m])/2; }

// Normal CDF using Abramowitz-Stegun approximation of erf
function normalCdf(x){
  // erf approximation constants (Abramowitz & Stegun 7.1.26)
  const a1=0.254829592,a2=-0.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,p=0.3275911;
  const sign = x < 0 ? -1 : 1;
  const z = Math.abs(x)/Math.SQRT2;
  const t = 1/(1+p*z);
  const y = 1 - (((((a5*t + a4)*t) + a3)*t + a2)*t + a1)*t*Math.exp(-z*z);
  const erf = sign * y;
  return 0.5 * (1 + erf);
}

// Complementary error function using A&S 7.1.26 arranged to avoid catastrophic cancellation
function _erfc(x){
  // Constants as above
  const a1=0.254829592,a2=-0.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,p=0.3275911;
  const z = Math.abs(x);
  const t = 1/(1 + p*z);
  // For x >= 0: erfc(x) ≈ P(t) * exp(-x^2), where
  // P(t) = (((((a5 t + a4) t + a3) t + a2) t + a1) t)
  const poly = (((((a5*t + a4)*t + a3)*t + a2)*t + a1)*t);
  const erfcPos = poly * Math.exp(-z*z);
  return x >= 0 ? erfcPos : 2 - erfcPos; // erfc(-x) = 2 - erfc(x)
}

// Numerically-stable upper tail for standard normal: Q(z) = 0.5 * erfc(z/sqrt(2))
function normalUpperTail(z){
  return 0.5 * _erfc(z/Math.SQRT2);
}

// Inverse normal CDF (quantile) using algorithm from AS 241 / R's qnorm; adapted to JS
function normalQuantile(p, mu=0, sigma=1){
  if (!(p>0 && p<1) || sigma < 0) return NaN;
  if (sigma === 0) return mu;
  const q = p - 0.5;
  let r, val;
  if (p >= 0.075 && p <= 0.925){
    r = 0.180625 - q*q;
    val = q * (((((((r * 2509.0809287301226727 + 33430.575583588128105) * r + 67265.770927008700853) * r
      + 45921.953931549871457) * r + 13731.693765509461125) * r + 1971.5909503065514427) * r + 133.14166789178437745) * r
      + 3.387132872796366608) / (((((((r * 5226.495278852854561 + 28729.085735721942674) * r + 39307.89580009271061) * r
      + 21213.794301586595867) * r + 5394.1960214247511077) * r + 687.1870074920579083) * r + 42.313330701600911252) * r + 1);
  } else {
    // closer than 0.075 from {0,1} boundary
    r = q > 0 ? 1 - p : p;
    r = Math.sqrt(-Math.log(r));
    if (r <= 5){
      r += -1.6;
      val = (((((((r * 7.7454501427834140764e-4 + 0.0227238449892691845833) * r + .24178072517745061177) * r
        + 1.27045825245236838258) * r + 3.64784832476320460504) * r + 5.7694972214606914055) * r
        + 4.6303378461565452959) * r + 1.42343711074968357734) / (((((((r * 1.05075007164441684324e-9 + 5.475938084995344946e-4) * r
        + .0151986665636164571966) * r + 0.14810397642748007459) * r + 0.68976733498510000455) * r + 1.6763848301838038494) * r
        + 2.05319162663775882187) * r + 1);
    } else {
      r += -5;
      val = (((((((r * 2.01033439929228813265e-7 + 2.71155556874348757815e-5) * r + 0.0012426609473880784386) * r
        + 0.026532189526576123093) * r + .29656057182850489123) * r + 1.7848265399172913358) * r + 5.4637849111641143699) * r
        + 6.6579046435011037772) / (((((((r * 2.04426310338993978564e-15 + 1.4215117583164458887e-7)* r
        + 1.8463183175100546818e-5) * r + 7.868691311456132591e-4) * r + .0148753612908506148525) * r
        + .13692988092273580531) * r + .59983220655588793769) * r + 1);
    }
    if (q < 0) val = -val;
  }
  return mu + sigma * val;
}

function tPValueApprox(t, df, alt='two-sided'){
  // Approximate t by normal for p-value; acceptable for moderate/large df.
  const z = Math.abs(t); const pTwo = 2*normalUpperTail(z);
  if (alt==='two-sided') return Math.max(0, Math.min(1, pTwo));
  // For one-sided, direction matters; we assume H1: mean > mu0 when t>0
  const pOne = normalUpperTail(t);
  return Math.max(0, Math.min(1, pOne));
}

async function tPValueStdlib(t, df, alt='two-sided'){
  const F = await loadTcdf();
  if (!F) {
    const msg = 'Stats: @stdlib/stats-base-dists-t-cdf is not available. T-test p-values cannot be computed.';
    if (typeof window !== 'undefined' && typeof window.alert === 'function') window.alert(msg);
    throw new Error(msg);
  }
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

export async function wilcoxonSignedRankAsync(x, mu0, alpha=0.05, alt='two-sided'){
  const arr = x.map(v => v - mu0);
  const wilcoxon = await loadWilcoxon();
  if (!wilcoxon) {
    const msg = 'Stats: @stdlib/stats-wilcoxon is not available. Wilcoxon signed-rank test cannot run.';
    if (typeof window !== 'undefined' && typeof window.alert === 'function') window.alert(msg);
    throw new Error(msg);
  }
  const out = wilcoxon(arr, { alpha, alternative: alt });
  return {
    n: arr.filter(v=>Math.abs(v)>1e-12).length,
    statistic: out.statistic,
    p_value: out.pValue,
    alpha: out.alpha,
    rejected: !!out.rejected,
    alt
  };
}

// Exact binomial tail using log-domain to avoid overflow for moderate n
function signTest(){
  throw new Error('Synchronous signTest removed: use signTestAsync which requires @stdlib/stats-base-dists-binomial-cdf');
}

export async function signTestAsync(x, mu0, alpha=0.05, alt='two-sided'){
  let pos=0,neg=0; for(const v of x){ const d=v-mu0; if(Math.abs(d)<1e-12) continue; if(d>0) pos++; else neg++; }
  const n = pos+neg; const k = pos; const p0 = 0.5;
  const F = await loadBinomCdf();
  if (!F) {
    const msg = 'Stats: @stdlib/stats-base-dists-binomial-cdf is not available. Sign test cannot run.';
    if (typeof window !== 'undefined' && typeof window.alert === 'function') window.alert(msg);
    throw new Error(msg);
  }
  let p;
  if(alt==='greater'){ p = 1 - F(k-1, n, p0); }
  else if(alt==='less'){ p = F(k, n, p0); }
  else { const lower = Math.min(F(k, n, p0), F(n-k, n, p0)); p = Math.min(1, 2*lower); }
  return { n, k_positive: pos, k_negative: neg, p_value: p, alpha, alternative: alt, significant: (p<alpha) };
}

export async function mannWhitneyAsync(x, y, alpha=0.05, alt='two-sided'){
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
  // Use stdlib normal CDF if available synchronously via preloaded module; otherwise attempt to load it.
  let p;
  let F = _normalCdf;
  if (!F) {
    try { const mod = await import('@stdlib/stats-base-dists-normal-cdf'); F = mod?.default || mod; _normalCdf = F; } catch { F = null; }
  }
  if (!F) {
    const msg = 'Stats: @stdlib/stats-base-dists-normal-cdf is not available. Mann-Whitney test cannot compute tail probabilities.';
    if (typeof window !== 'undefined' && typeof window.alert === 'function') window.alert(msg);
    throw new Error(msg);
  }
  const pTwo = 2*(1 - F(Math.abs(z)));
  p = (alt==='two-sided') ? pTwo : (1 - F(z));
  return { n1,n2,U,U1,U2,z,p_value:p, alpha, alternative: alt, significant: (p<alpha) };
}

export async function moodMedianAsync(x, y, alpha=0.05){
  const all=[...x,...y].sort((a,b)=>a-b); const N=all.length; const mid=Math.floor(N/2); const med=(N%2)?all[mid]:(all[mid-1]+all[mid])/2;
  let c11=0,c12=0; for(const v of x){ if(v<=med) c11++; else c12++; }
  let c21=0,c22=0; for(const v of y){ if(v<=med) c21++; else c22++; }
  const row1=c11+c12, row2=c21+c22, col1=c11+c21, col2=c12+c22, total=row1+row2;
  const exp11=row1*col1/total, exp12=row1*col2/total, exp21=row2*col1/total, exp22=row2*col2/total;
  const chi2 = ((c11-exp11)**2/exp11) + ((c12-exp12)**2/exp12) + ((c21-exp21)**2/exp21) + ((c22-exp22)**2/exp22);
  // Use stdlib chi-square CDF; if unavailable, alert the user and abort (no fallback)
  const F = await loadChisqCdf();
  if (!F) {
    const msg = 'Stats: @stdlib/stats-base-dists-chisquare-cdf is not available. Mood\'s median test cannot run.';
    if (typeof window !== 'undefined' && typeof window.alert === 'function') window.alert(msg);
    throw new Error(msg);
  }
  const p = Math.max(0, Math.min(1, 1 - F(chi2, 1)));
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

// R-style Wilcoxon TOST for median in (lower, upper)
// Matches your R script’s tail directions & tie handling.
// Requires your existing helpers: loadWilcoxon(), mean(), sd(), median()

export async function tostEquivalenceWilcoxonAsync(x, lower, upper, alpha = 0.05) {
  const wilcoxon = await loadWilcoxon();
  if (!wilcoxon) throw new Error('@stdlib/stats-wilcoxon unavailable');

  const isFiniteN = (v) => Number.isFinite(v);
  const xx = x.filter(isFiniteN);
  const nRaw = xx.length;

  // Differences exactly like the R script:
  // - lower test: x - lower (greater)
  // - upper test: x - upper (less)
  const dLowerAll = xx.map(v => v - lower).filter(isFiniteN);
  const dUpperAll = xx.map(v => v - upper).filter(isFiniteN);

  // Drop zeros (ties to the bound), just like wilcox.test does
  const eps = 1e-12;
  const dLower = dLowerAll.filter(d => Math.abs(d) > eps);
  const dUpper = dUpperAll.filter(d => Math.abs(d) > eps);

  const nEffLower = dLower.length;
  const nEffUpper = dUpper.length;

  // If everything ties to a bound, we can’t conclude equivalence
  if (nEffLower === 0 || nEffUpper === 0) {
    return {
      type: 'wilcoxon-tost',
      method: 'Wilcoxon TOST (R-style tails)',
      n: nRaw,
      lower, upper, alpha,
      mean: mean(xx), median: median(xx), sd: sd(xx),
      n_eff_lower: nEffLower, n_eff_upper: nEffUpper,
      w_lower: 0, w_upper: 0,
      p_lower: 1, p_upper: 1, pTOST: 1,
      equivalent: false,
      note: 'All differences to a bound are ~0; cannot run signed-rank.'
    };
  }

  // Run the one-sided tests with the same alternatives as R
  const outLower = wilcoxon(dLower, { alpha, alternative: 'greater' }); // median(x) > lower
  const outUpper = wilcoxon(dUpper, { alpha, alternative: 'less'    }); // median(x) < upper

  // R-style W is the sum of positive ranks on the passed differences.
  // @stdlib returns a compatible statistic; keep as-is for display parity with R.
  const w_lower = outLower.statistic;
  const w_upper = outUpper.statistic;

  const p_lower = outLower.pValue;
  const p_upper = outUpper.pValue;

  // Single TOST p-value (standard): max of the two one-sided p's
  const pTOST = Math.max(p_lower, p_upper);
  const equivalent = (pTOST < alpha);

  return {
    type: 'wilcoxon-tost',
    method: 'Wilcoxon TOST (R-style tails)',
    n: nRaw,
    lower, upper, alpha,
    mean: mean(xx), median: median(xx), sd: sd(xx),
    n_eff_lower: nEffLower, n_eff_upper: nEffUpper,
    w_lower, w_upper,
    p_lower, p_upper, pTOST,
    equivalent
  };
}


// Shapiro–Wilk normality test (W and p-value)
export function shapiroWilk(x, alpha=0.05){
  const arr = (Array.isArray(x)? x: []).map(Number).filter(Number.isFinite).sort((a,b)=>a-b);
  const n = arr.length;
  if (n < 3) return { n, mean: NaN, median: NaN, sd: NaN, W: NaN, p_value: NaN, alpha, normal: null };

  // Build coefficients a[i] based on expected order stats of normal
  const nn2 = Math.floor(n/2);
  const a = new Array(nn2+1).fill(0); // 1-based indexing for convenience
  const an = n;
  let pw = 1; // p-value placeholder
  if (n === 3){
    a[1] = Math.SQRT1_2; // sqrt(1/2)
  } else {
    const an25 = an + 0.25;
    let summ2 = 0;
    for (let i=1;i<=nn2;i++){
      a[i] = normalQuantile((i - 0.375)/an25, 0, 1);
      summ2 += a[i]*a[i];
    }
    summ2 *= 2;
    const ssumm2 = Math.sqrt(summ2);
    const rsn = 1/Math.sqrt(an);
    const poly = (cc, nord, x) => {
      let ret = cc[0];
      if (nord > 1){
        let p = x * cc[nord-1];
        for (let j=nord-2; j>0; j--) p = (p + cc[j]) * x;
        ret += p;
      }
      return ret;
    };
    const c1 = [ 0, 0.221157, -0.147981, -2.07119, 4.434685, -2.706056 ];
    const c2 = [ 0, 0.042981, -0.293762, -1.752461, 5.682633, -3.582633 ];
    let a1 = poly(c1, 6, rsn) - a[1]/ssumm2;
    let fac, i1;
    if (n > 5){
      const a2 = -a[2]/ssumm2 + poly(c2, 6, rsn);
      fac = Math.sqrt((summ2 - 2*(a[1]*a[1]) - 2*(a[2]*a[2])) / (1 - 2*(a1*a1) - 2*(a2*a2)));
      a[2] = a2; i1 = 3;
    } else {
      fac = Math.sqrt((summ2 - 2*(a[1]*a[1])) / (1 - 2*(a1*a1)));
      i1 = 2;
    }
    a[1] = a1;
    for (let i=i1;i<=nn2;i++) a[i] /= -fac;
  }

  const small = 1e-19;
  const range = arr[n-1] - arr[0];
  if (range < small) return { n, mean: mean(arr), median: median(arr), sd: sd(arr), W: 1, p_value: 1, alpha, normal: true };

  // Compute W as correlation^2 between a and centered/scaled data
  let xx = arr[0] / range;
  let sx = xx;
  let sa = -a[1];
  for (let i=1, j=n-1; i<n; j--){
    const xi = arr[i] / range;
    if (xx - xi > small) return { n, mean: mean(arr), median: median(arr), sd: sd(arr), W: NaN, p_value: NaN, alpha, normal: null };
    sx += xi; i++;
    if (i !== j) sa += (i - j >= 0 ? 1 : -1) * a[Math.min(i, j)];
    xx = xi;
  }
  if (n > 5000) return { n, mean: mean(arr), median: median(arr), sd: sd(arr), W: NaN, p_value: NaN, alpha, normal: null };

  sa /= n; sx /= n;
  let ssa=0, ssx=0, sax=0;
  for (let i=0, j=n-1; i<n; i++, j--){
    const asa = (i !== j) ? ((i - j >= 0 ? 1 : -1) * a[1 + Math.min(i, j)] - sa) : -sa;
    const xsx = arr[i]/range - sx;
    ssa += asa*asa;
    ssx += xsx*xsx;
    sax += asa*xsx;
  }
  const ssassx = Math.sqrt(ssa*ssx);
  const w1 = (ssassx - sax) * (ssassx + sax) / (ssa * ssx);
  const w = 1 - w1;

  // p-value approximation
  let p;
  if (n === 3){
    const stqr = 1.04719755119660; // asin(sqrt(3/4))
    const pi6 = 1.90985931710274; // 6/pi
    p = pi6 * (Math.asin(Math.sqrt(w)) - stqr);
    if (p < 0) p = 0;
  } else {
    const g = [ -2.273, 0.459 ];
    const c3 = [ 0.544, -0.39978, 0.025054, -6.714e-4 ];
    const c4 = [ 1.3822, -0.77857, 0.062767, -0.0020322 ];
    const c5 = [ -1.5861, -0.31082, -0.083751, 0.0038915 ];
    const c6 = [ -0.4803, -0.082676, 0.0030302 ];
    const poly = (cc, nord, x) => {
      let ret = cc[0];
      if (nord > 1){
        let p = x * cc[nord-1];
        for (let j=nord-2; j>0; j--) p = (p + cc[j]) * x;
        ret += p;
      }
      return ret;
    };
    let y = Math.log(w1);
    const xxn = Math.log(n);
    let m, s;
    if (n <= 11){
      const gamma = poly(g, 2, n);
      if (y >= gamma){ p = 1e-99; return { n, mean: mean(arr), median: median(arr), sd: sd(arr), W: w, p_value: p, alpha, normal: p>=alpha };
      }
      y = -Math.log(gamma - y);
      m = poly(c3, 4, n);
      s = Math.exp(poly(c4, 4, n));
    } else {
      m = poly(c5, 4, xxn);
      s = Math.exp(poly(c6, 3, xxn));
    }
    const z = (y - m) / s;
    // upper tail p-value (use stable survival function)
    p = Math.max(0, Math.min(1, normalUpperTail(z)));
  }

  const M = mean(arr); const Md = median(arr); const S = sd(arr);
  return { n, mean: M, median: Md, sd: S, W: w, p_value: p, alpha, normal: !(p < alpha) };
}

export async function shapiroWilkAsync(x, alpha=0.05){
  return shapiroWilk(x, alpha);
}

// ---------------------------------------------------------------------------
// Levene / Brown-Forsythe variance equality test
// For k groups: compute absolute (or squared) deviations from group center (median by default)
// and perform a one-way ANOVA on these transformed values.
// Returns F statistic, df1=k-1, df2=N-k, p-value using F distribution CDF.
// equal_variances = p_value >= alpha (fail to reject homogeneity).
// ---------------------------------------------------------------------------

function _asNumericArray(a){
  return (Array.isArray(a)? a: []).map(Number).filter(Number.isFinite);
}

export async function leveneTestAsync(groups, alpha=0.05, center='median'){
  if (!Array.isArray(groups) || groups.length < 2) throw new Error('Levene test requires at least two groups');
  const cleanGroups = groups.map(g=>_asNumericArray(g));
  const k = cleanGroups.length;
  const sizes = cleanGroups.map(g=>g.length);
  const N = sizes.reduce((s,v)=>s+v,0);
  if (N === 0 || sizes.some(n=>n===0)) throw new Error('Each group must contain at least one numeric value');
  // choose center function
  const centerFn = (arr)=>{
    if (center === 'mean') return mean(arr);
    // default median (Brown-Forsythe)
    return median(arr);
  };
  const centers = cleanGroups.map(g=>centerFn(g));
  // Construct absolute deviations (robust) like Brown-Forsythe
  const zGroups = cleanGroups.map((g,i)=> g.map(v=> Math.abs(v - centers[i])));
  // Group means of z
  const zMeans = zGroups.map(g=> mean(g));
  const overallMean = mean(zGroups.flat());
  // Between-group and within-group sums of squares
  let ssBetween = 0, ssWithin = 0;
  for(let i=0;i<k;i++){
    ssBetween += sizes[i] * (zMeans[i]-overallMean)*(zMeans[i]-overallMean);
    for(const z of zGroups[i]) ssWithin += (z - zMeans[i])*(z - zMeans[i]);
  }
  const df1 = k - 1;
  const df2 = N - k;
  const msBetween = ssBetween / df1;
  const msWithin = ssWithin / df2;
  const F = msBetween / msWithin;
  const FCdf = await loadFCdf();
  if (!FCdf){
    const msg = 'Stats: @stdlib/stats-base-dists-f-cdf is not available. Levene test cannot run.';
    if (typeof window !== 'undefined' && typeof window.alert === 'function') window.alert(msg);
    throw new Error(msg);
  }
  // p-value = 1 - Fcdf(F, df1, df2)
  let p_value = 1 - FCdf(F, df1, df2);
  if (!Number.isFinite(p_value) || p_value < 0) p_value = 0; else if (p_value > 1) p_value = 1;
  const groupVariances = cleanGroups.map(g=>variance(g));
  return {
    test_used: 'levene',
    method: center === 'mean' ? 'Levene (mean-centered)' : 'Levene (Brown-Forsythe median-centered)',
    center: center === 'mean' ? 'mean' : 'median',
    k,
    n_total: N,
    sizes,
    centers,
    group_variances: groupVariances,
    ...(k===2 ? { var1: groupVariances[0], var2: groupVariances[1] } : {}),
    F,
    df1,
    df2,
    p_value,
    alpha,
    equal_variances: !(p_value < alpha)
  };
}

export async function leveneTwoSampleAsync(x, y, alpha=0.05, center='median'){
  return leveneTestAsync([x,y], alpha, center);
}
