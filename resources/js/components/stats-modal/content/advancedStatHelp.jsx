import React from 'react';

// Help content for Advanced Statistics (JSX nodes allow bold/emphasis)
const infoSections = [
  {
    heading: 'Overview',
    text: (
      <>
        Analyze water quality by <strong>screening a single lake</strong> against guidelines or by <strong>comparing a parameter between two lakes</strong>.
      </>
    ),
  },
  {
    heading: 'Setup',
    bullets: [
      (
        <>
          Select your <strong>comparison</strong> to choose a mode: pick a <strong>class guideline</strong> to run <strong>Guideline Screening (one‑sample)</strong>, or pick a <strong>lake</strong> to run a <strong>Lake Comparison (two‑sample)</strong>. Then choose the parameter to analyze (for example: <strong>DO</strong>, <strong>pH</strong>).
        </>
      ),
      (
        <>
          Open the <strong>gear icon</strong> to adjust <strong>Year Range</strong> before running analyses.
        </>
      ),
    ],
  },
  {
    heading: 'Mode 1: Guideline Screening (One‑Sample)',
    bullets: [
      (
        <>
          Purpose: compare a lake’s observations to a guideline (a <strong>minimum</strong>, <strong>maximum</strong>, or a <strong>target band</strong>).
        </>
      ),
      (
        <>
          <strong>One‑sample t‑test</strong> — compares the <em>mean</em>; appropriate when data are approximately normal.
        </>
      ),
      (
        <>
          <strong>Wilcoxon Signed‑Rank</strong> — compares the <em>median</em>; robust to skew and outliers (non‑parametric).
        </>
      ),
      (
        <>
          <strong>Sign Test</strong> — simple median sign test; very robust but lower statistical power.
        </>
      ),
      (
        <>
          <strong>Equivalence TOST</strong> — checks whether the mean (t) or median (Wilcoxon) lies strictly within a target band (requires both lower and upper limits).
        </>
      ),
    ],
  },
  {
    heading: 'Mode 2: Lake Comparison',
    bullets: [
      (
        <>
          Purpose: decide which of two lakes is more favorable for the chosen parameter.
        </>
      ),
      (
        <>
          <strong>Student t‑test</strong> — compares <em>means</em> when groups look roughly normal and spreads are similar.
        </>
      ),
      (
        <>
          <strong>Welch’s t‑test</strong> — compares <em>means</em> when spreads differ (use when <strong>Levene</strong> indicates unequal variances).
        </>
      ),
      (
        <>
          <strong>Mann‑Whitney U</strong> — compares <em>medians/ranks</em>; a non‑parametric choice robust to outliers.
        </>
      ),
      (
        <>
          <strong>Mood’s Median</strong> — compares medians using counts above/below the median; highly robust.
        </>
      ),
    ],
  },
  {
    heading: 'Diagnostics & Interpretation',
    bullets: [
      (
        <>
          <strong>Diagnostics</strong>: <strong>Shapiro–Wilk</strong> checks normality; <strong>Levene</strong> checks equality of variances. Use diagnostics to guide which test to run.
        </>
      ),
      (
        <>
          <strong>Significance</strong>: results are considered significant when the <strong>p‑value</strong> is less than <strong>alpha</strong> (alpha = <em>1 − confidence level</em>).
        </>
      ),
      (
        <>
          <strong>Interpretation</strong>: the panel summarizes recommended tests and explains whether results indicate a difference or conformity with the guideline. For two‑lake comparisons, the output identifies which lake appears more favorable.
        </>
      ),
    ],
  },
];

export default infoSections;
