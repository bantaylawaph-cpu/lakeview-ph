import React from 'react';

// Standalone Terms & Conditions content component.
// Used both inside the About the Data modal (as a tab)
// and by the Auth Terms modal.
export default function Terms() {
  const sections = [
    {
      title: 'Acceptance of Terms',
      body: [
        'By creating an account or using LakeView PH you agree to the final Terms & Conditions and Privacy Policy once they are formally published.'
      ]
    },
    {
      title: 'Appropriate Use',
      body: [
        'Do not engage in unlawful, abusive, disruptive, or fraudulent activities.',
        'Respect platform rate limits and security controls.',
        'Do not scrape or misuse data without written permission.'
      ]
    },
    {
      title: 'Data Handling',
      body: [
        'We store limited personal data (name, email, role) plus environmental contribution metadata.',
        'Aggregated or scientific data may be shared for public benefit.'
      ]
    },
    {
      title: 'Passwords & Security',
      body: [
        'Keep credentials confidential. Report suspected compromise promptly.',
        'System may revoke tokens after inactivity or policy changes.'
      ]
    },
    {
      title: 'Changes',
      body: [
        'These placeholder terms may change. Material updates will be announced in-app or via email.'
      ]
    },
    {
      title: 'Contact',
      body: [
        'Questions: support@lakeview.example (placeholder).'
      ]
    }
  ];

  return (
    <div className="terms-content">
      <h2>LakeView PH Terms & Conditions (Placeholder)</h2>
      <p><em>Last updated: TBD</em></p>
      {sections.map((sec, i) => (
        <section key={sec.title}>
          <h3>{i + 1}. {sec.title}</h3>
          {sec.body.length > 1 ? (
            <ul>
              {sec.body.map(line => <li key={line}>{line}</li>)}
            </ul>
          ) : (
            <p>{sec.body[0]}</p>
          )}
        </section>
      ))}
      <p className="terms-footer-note">Placeholder content — not legally binding until replaced.</p>
    </div>
  );
}
