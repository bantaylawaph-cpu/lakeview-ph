// Revamped Help content for Advanced Statistics — student‑friendly and concise
const infoSections = [
  {
    heading: 'About Advanced Statistics',
    text: 'This tool helps you analyze lake water‑quality data. You can (1) screen a lake’s typical conditions against a guideline (one‑sample screening) or (2) compare two lakes for a specific parameter. It also offers quick diagnostic checks to guide which statistical test to choose.'
  },
  {
    heading: 'Two ways to compare',
    bullets: [
      'Pick one of the modes below, choose your parameter (e.g., DO, pH), set the year range, and then run a test.',
      'Tip: Use the gear button to set year range and confidence level; pick depth options if available.'
    ]
  },
  {
    heading: 'Guideline screening (one‑sample)',
    bullets: [
      'Goal: screen a lake’s parameter against a guideline (minimum, maximum, or target band).',
      'One‑sample t‑test — assesses whether the typical level (mean) differs from the guideline; best when data are roughly normal.',
      'Wilcoxon Signed‑Rank — assesses whether the typical level (median) differs from the guideline; robust to skew/outliers (non‑parametric).',
      'Sign Test — simple median screening using only +/- signs; most robust but lower statistical power.',
      'Equivalence TOST (t) — assesses whether the mean is within the target band (needs both lower and upper limits).',
      'Equivalence TOST (Wilcoxon) — assesses whether the median is within the target band when data are not normal.'
    ]
  },
  {
    heading: 'Compare two lakes on a parameter',
    bullets: [
      'Goal: decide which lake looks better for the chosen parameter (higher or lower can be better, depending on the parameter).',
      'Student t‑test — compares means; use when both groups look roughly normal and have similar spread.',
      'Welch’s t‑test — compares means when spreads differ (use this when Levene shows unequal variances).',
      'Mann‑Whitney U — compares medians/ranks; non‑parametric and robust to outliers.',
      'Mood’s Median — compares medians using counts above/below; very robust but usually less powerful.'
    ]
  },
  {
    heading: 'Diagnostic tests',
    bullets: [
      'Shapiro–Wilk (normality): tells you if data deviate from normal. If it does, prefer non‑parametric tests.',
      'Levene (variance): tells you if two groups have different spread. If they do, prefer Welch or non‑parametric tests.',
      'The interpretation panel will suggest good choices after running these diagnostics.'
    ]
  },
  {
    heading: 'How the interpretation works',
    bullets: [
      'Significance: the tool compares p‑value to your chosen alpha (alpha = 1 − confidence level). If p < alpha, we say “there is enough statistical evidence.”',
      'Center of data: tests use either the mean (t‑tests) or the median/ranks (Wilcoxon, Mann‑Whitney, Mood’s).',
      'Guidelines: the tool resolves a minimum, maximum, or range (or a single reference value) and explains screening results accordingly.',
      'Equivalence (TOST): both the lower and upper tests must pass (p’s less than alpha) to conclude “within the target band.”',
      'Two‑lake comparisons: the text reports if one lake is higher/lower. If the parameter is “higher is worse,” the interpretation also points out which lake looks more favorable for that parameter.',
    ]
  }
];

export default infoSections;
