// Revamped Help content for Advanced Statistics — student‑friendly and concise
const infoSections = [
  {
    heading: 'About Advanced Statistics',
    text: 'This tool helps you analyze lake water‑quality data. You can (1) check if a lake meets a guideline (compliance) or (2) compare two lakes for a specific parameter. It also offers quick diagnostic checks to guide which statistical test to choose.'
  },
  {
    heading: 'Two ways to compare',
    bullets: [
      'Pick one of the modes below, choose your parameter (e.g., DO, pH), set the year range, and then run a test.',
      'Tip: Use the gear button to set year range and confidence level; pick depth options if available.'
    ]
  },
  {
    heading: 'Compliance check (one‑sample)',
    bullets: [
      'Goal: test a lake’s parameter against a guideline (minimum, maximum, or acceptable range).',
      'One‑sample t‑test — checks if the mean differs from the guideline; best when data are roughly normal.',
      'Wilcoxon Signed‑Rank — checks if the median differs from the guideline; robust to skew/outliers (non‑parametric).',
      'Sign Test — very simple median check using only +/- signs; most robust but less statistical power.',
      'Equivalence TOST t — checks if the mean is inside an acceptable range (needs both lower and upper limits).',
      'Equivalence TOST Wilcoxon — like TOST but uses ranks/medians when data are not normal.'
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
      'Guidelines: the tool resolves a minimum, maximum, or range (or a single reference value) and explains compliance accordingly.',
      'Equivalence (TOST): both the lower and upper tests must pass (p’s less than alpha) to conclude “within the acceptable range.”',
      'Two‑lake comparisons: the text reports if one lake is higher/lower. If the parameter is “higher is worse,” the interpretation also points out which lake looks more favorable for that parameter.',
    ]
  }
];

export default infoSections;
