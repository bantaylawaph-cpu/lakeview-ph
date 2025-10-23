// Help content for Advanced Statistics – extracted to reduce component size
const infoSections = [
  {
    heading: 'Purpose',
    text: 'Answer water‑quality questions with your filtered data: check if a lake meets a standard, compare two lakes, or confirm values sit within a safe range.'
  },
  {
    heading: 'When to use it',
    bullets: [
      'One‑sample: One lake vs a standard/class or a target.',
      'Two‑sample: Compare two lakes in the same period.',
      'Equivalence (TOST): Show the typical value is inside a safe window.'
    ]
  },
  {
    heading: 'Dataset Sources (required)',
    text: 'Pick the dataset source. For two‑lake comparisons, select one dataset source per lake to avoid mixing sources. For lake vs threshold, optionally select a station to focus the analysis.'
  },
  {
    heading: 'Quick start',
    bullets: [
      'Select Applied Standard and Parameter (e.g., DO, pH).',
      'Choose Primary Lake + its Dataset Source.',
      'Optionally set Compare to a Class (then optionally pick a Station) or another Lake (then pick its Dataset Source).',
      'Open the gear to set years and (optionally) an exact depth.',
      'Pick a Test (disabled when not applicable) and click Run Test.',
      'Review the summary, p‑value, and advisories; use Export for PDF.'
    ]
  },
  {
    heading: 'Depth & date',
    bullets: [
      'All depths (mean): Use all available depths together.',
      'Exact depth: Focus on one depth (list responds to filters).',
      'Years: “From” must not exceed “To”.'
    ]
  },
  {
    heading: 'Test guide (plain English)',
    bullets: [
      'Shapiro–Wilk: Normality check; if not normal or n is small, prefer Wilcoxon/Sign.',
      'Levene: Compares variability; if unequal, prefer Welch or non‑parametric.',
      'One‑sample t: Is the average different from a target/limit?',
      'Wilcoxon (1‑sample): Robust alternative when not normal.',
      'Sign test (1‑sample): Very robust; uses above/below only.',
      'TOST (t/Wilcoxon): Show the mean is within lower/upper bounds.',
      'Student t (2‑sample): Averages with similar variability.',
      'Welch t (2‑sample): Safer when variability differs.',
      'Mann–Whitney U: Non‑parametric comparison of typical values.',
      'Mood median: Compares medians.'
    ]
  },
  {
    heading: 'Interpreting results',
    bullets: [
      'p‑value: Smaller (e.g., < 0.05) = stronger evidence.',
      'Confidence level: 95% is common; higher = wider intervals, stricter.',
      'TOST: Pass when both one‑sided p‑values are below alpha (e.g., 0.05).',
      'Advisories: Notes on sample size, imbalance, and distance to limits.'
    ]
  },
  {
    heading: 'Export & options',
    bullets: [
      'Export PDF: Saves selections and results (with events when available).',
      'Gear: Set year range and confidence level.',
      'Result toggles: “Exact p‑values” and “Show all values” for auditing.'
    ]
  },
  {
    heading: 'Tips & edge cases',
    bullets: [
      'Run disabled? Check Standard, Parameter, Lake, Dataset Source(s), Test, and years.',
      'Data minimums: Many tests need ≥2 samples (per group).',
      'Empty depth list? Adjust years, lake, parameter, or dataset source.',
      'Two‑lake mode uses server per‑lake aggregates; the client doesn’t average stations.'
    ]
  }
];

export default infoSections;
