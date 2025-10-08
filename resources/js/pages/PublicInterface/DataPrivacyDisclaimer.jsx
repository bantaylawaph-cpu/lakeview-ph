import React from "react";
import Modal from "../../components/Modal";

function DataPrivacyDisclaimer({ open, onClose }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Data Privacy Disclaimer"
      width={860}
      cardClassName="privacy-card"
      bodyClassName="content-page"
      ariaLabel="Data Privacy Disclaimer"
      footer={
        <button className="btn-primary" type="button" onClick={onClose}>
          Close
        </button>
      }
    >
      <style>{`html:focus-within { scroll-behavior: smooth; }`}</style>
      <h1>Data Privacy</h1>
      <p className="muted">Effective: {new Date().toLocaleDateString()}</p>

      <nav className="privacy-toc" aria-label="Table of contents">
        <a href="#p1">1. Purpose of Data Collection</a>
        <a href="#p2">2. Personal Data We Collect</a>
        <a href="#p3">3. How We Use Data</a>
        <a href="#p4">4. Data Retention</a>
        <a href="#p5">5. Sharing and Disclosure</a>
        <a href="#p6">6. Security Measures</a>
        <a href="#p7">7. Your Rights</a>
        <a href="#p8">8. Contact Information</a>
        <a href="#p9">9. Consent</a>
        <a href="#p10">10. Updates</a>
      </nav>

      <section id="p1">
        <h2>1. Purpose of Data Collection</h2>
        <p>
          LakeView PH collects and processes personal information to create and manage user accounts, enable participation in organizations, handle Know Your Customer (KYC) verification for contributor access, receive and address feedback, and secure access to platform features. We also process limited technical information (such as a hashed user agent and masked IP) for security, abuse prevention, and service diagnostics.
        </p>
      </section>

      <section id="p2">
        <h2>2. Personal Data We Collect</h2>
        <ul>
          <li>Account information: name, email address, password (hashed).</li>
          <li>Organizational context: desired role and selected organization when applying to join.</li>
          <li>KYC details (when applicable for contributor/org roles): full name, date of birth, ID type and number, address (street, city/municipality, province, postal code), and uploaded identity/supporting documents (file name, type, size, and MIME type).</li>
          <li>Feedback submission details: title, message, category; optional guest name and email when feedback is submitted without an account.</li>
          <li>System metadata: masked IP address, hashed user agent, language settings; and basic audit logs of actions performed within the application.</li>
        </ul>
      </section>

      <section id="p3">
        <h2>3. How We Use and Process Data</h2>
        <ul>
          <li>Account creation, authentication, and role-based authorization (using secure tokens).</li>
          <li>Processing KYC profiles and documents to verify eligibility for organization participation.</li>
          <li>Handling organizational join applications and notifying users of decisions.</li>
          <li>Receiving, triaging, and responding to user feedback and service-related inquiries.</li>
          <li>Operating, maintaining, and improving platform security, integrity, and performance.</li>
          <li>Complying with legal obligations and responding to lawful requests, when required.</li>
        </ul>
      </section>

      <section id="p4">
        <h2>4. Data Retention</h2>
        <p>
          We retain personal data only for as long as necessary to fulfill the purposes described above or as required by law. KYC documents and profiles are kept while the verification process and related organizational participation remain relevant. Feedback records are retained for service improvement and accountability. When data is no longer needed, we will securely delete or anonymize it in accordance with our retention practices.
        </p>
      </section>

      <section id="p5">
        <h2>5. Data Sharing and Disclosure</h2>
        <ul>
          <li>Internal processing: authorized administrators and organization administrators may access KYC/application data strictly to perform reviews and decisions.</li>
          <li>Service providers: we may use cloud storage or email delivery services to operate the platform; such providers are bound by confidentiality and data protection obligations.</li>
          <li>Legal compliance: we may disclose data when required by law, regulation, subpoena, or court order.</li>
          <li>We do not sell personal information.</li>
        </ul>
      </section>

      <section id="p6">
        <h2>6. Security Measures</h2>
        <p>
          We implement organizational, physical, and technical safeguards appropriate to the risks, including:
        </p>
        <ul>
          <li>Access controls and role-based permissions for administrative functions.</li>
          <li>Password hashing and secure token-based authentication.</li>
          <li>Audit logging for key actions to enhance accountability.</li>
          <li>Use of a public storage disk for documents with controlled links and deletion routines.</li>
          <li>Input validation and basic anti-spam heuristics on public forms.</li>
        </ul>
        <p>
          While we strive to protect your data, no method of transmission or storage is completely secure. Users are encouraged to use strong, unique passwords and keep credentials confidential.
        </p>
      </section>

      <section id="p7">
        <h2>7. Your Rights</h2>
        <p>
          In accordance with the Philippine Data Privacy Act of 2012 (RA 10173) and its implementing rules and regulations, you may exercise the following rights, subject to applicable limitations:
        </p>
        <ul>
          <li>Right to be informed: know how your personal data is collected and processed.</li>
          <li>Right to access: request a copy of your personal data that we hold.</li>
          <li>Right to rectification: request corrections to inaccurate or incomplete data.</li>
          <li>Right to erasure/blocking: request deletion or blocking of personal data where legally and operationally feasible.</li>
          <li>Right to object: object to processing based on legitimate interests or withdraw consent where processing relies on consent.</li>
          <li>Right to data portability: request available electronic copies of personal data you provided.</li>
          <li>Right to file a complaint: lodge a complaint with the National Privacy Commission (NPC).</li>
        </ul>
        <p>
          Requests can be made through the contact details below. We may require verification to confirm your identity and protect your account.
        </p>
      </section>

      <section id="p8">
        <h2>8. Contact Information</h2>
        <p>
          For privacy concerns, requests, or questions, please contact our Data Protection Officer (DPO):
        </p>
        <p>
          Email: privacy@lakeview.ph (sample) — or submit a request via the in-app Feedback feature.
        </p>
      </section>

      <section id="p9">
        <h2>9. Consent</h2>
        <p>
          By creating an account, submitting feedback, applying to an organization, uploading KYC documents, or otherwise using the LakeView PH services, you acknowledge that you have read this Data Privacy Disclaimer and consent to the collection and processing of your personal data as described herein, in accordance with RA 10173.
        </p>
      </section>

      <section id="p10">
        <h2>10. Updates to this Disclaimer</h2>
        <p>
          We may update this notice from time to time to reflect changes in our processes or legal requirements. The effective date will be revised accordingly. Continued use of the service after updates constitutes acceptance of the revised notice.
        </p>
      </section>
    </Modal>
  );
}

export default DataPrivacyDisclaimer;
