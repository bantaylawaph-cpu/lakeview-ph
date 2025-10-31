// Help content for Advanced Statistics — concise and user-friendly
const infoSections = [
  {
    heading: 'What this tool does',
    text: 'Run simple statistical checks on lake water‑quality data: compare a lake to a threshold or class (compliance), compare two lakes, or test whether values fall inside a safe range.'
  },
  {
    heading: 'Quick steps',
    bullets: [
      'Pick a Parameter (e.g., DO, pH) and a Standard if needed.',
      'Choose Primary Lake and its Dataset Source (or use a custom dataset).',
      'Choose a comparison: Class/Threshold, Station, or another Lake (and its Dataset Source).',
      'Open the gear to set year range and optional exact depth.',
      'Pick a Test and click Run Test. Review summary and export if needed.'
    ]
  },
  {
    heading: 'Short explanations you should know',
    bullets: [
      'Shapiro–Wilk: tests normality of your dataset (helps choose the right test).',
      'Levene: tests whether two groups have similar spread — if not, use Welch or non‑parametric tests.',
      'Comparing a Parameter vs its Threshold: used for compliance checking — are values above/below the regulatory limit?',
      'Comparing lake vs lake: answers which lake is “better” for this parameter (based on the chosen test and direction).'
    ]
  },
  {
    heading: 'Export & options',
    bullets: [
      'Export PDF: saves your selections and the test results (requires sign in).',
      'Gear: adjust the year range and (optionally) choose an exact depth.'
    ]
  }
];

export default infoSections;
