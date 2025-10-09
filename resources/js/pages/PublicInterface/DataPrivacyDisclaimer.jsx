import React from "react";
import { FiArrowUp } from "react-icons/fi";
import Modal from "../../components/Modal";

function DataPrivacyDisclaimer({ open, onClose }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Data Privacy Disclaimer"
      width={860}
      cardClassName="auth-card"
      bodyClassName="content-page modern-scrollbar"
      ariaLabel="Data Privacy Disclaimer"
    >
      <style>{`
        html:focus-within { scroll-behavior: smooth; }
        .privacy-content h1 {
          margin: 0 0 8px;
          font-weight: 700;
        }
        .privacy-content {
          padding: 0 12px;
        }
        .privacy-content .intro { margin: 0 0 14px; }
        .privacy-content h2 {
          font-size: 22px;
          margin: 22px 0 10px;
          line-height: 1.25;
        }
        .privacy-content section {
          padding: 0;
          border-radius: 0;
          border: none;
          background: transparent;
          margin: 16px 0;
        }
        .privacy-content p {
          margin: 8px 0;
          line-height: 1.8;
          text-align: justify;
          text-justify: inter-word;
        }
        .privacy-content ul {
          margin: 8px 0;
          list-style: disc;
          list-style-position: outside;
          padding-left: 1.25rem;
        }
        .privacy-content ol {
          margin: 8px 0;
          list-style: decimal;
          list-style-position: outside;
          padding-left: 1.25rem;
        }
        .privacy-content ul ul { list-style: circle; }
        .privacy-content ul ul ul { list-style: square; }
        .privacy-content li {
          margin: 6px 0;
          line-height: 1.8;
          text-align: justify;
          text-justify: inter-word;
        }
        .privacy-content .privacy-toc {
          display: grid;
          grid-template-columns: 1fr;
          gap: 8px;
          padding: 12px;
          margin: 10px 0 18px;
          border-radius: 10px;
          border: 1px solid #334155;
          background: rgba(15,23,42,0.55);
          color: inherit;
        }
        @media (min-width: 640px) {
          .privacy-content { padding: 0 18px; max-width: 720px; margin: 0 auto; }
          .privacy-content .privacy-toc { grid-template-columns: 1fr 1fr; }
        }
        @media (min-width: 1024px) { .privacy-content { max-width: 760px; } }
        .privacy-content .privacy-toc a {
          color: inherit; text-decoration: none; display: block;
          padding: 8px 10px; border-radius: 8px;
          background: rgba(15,23,42,0.35);
          border: 1px solid rgba(51,65,85,0.7);
        }
        .privacy-content .privacy-toc a:hover { background: rgba(15,23,42,0.5); }
        .privacy-content .back-to-top-bar { position: sticky; bottom: 8px; display: flex; justify-content: flex-end; margin-top: 16px; }
        .privacy-content .back-to-top-floating {
          width: 40px; height: 40px; border-radius: 999px;
          display: inline-flex; align-items: center; justify-content: center;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(148,163,184,0.25);
          color: #ffffff; box-shadow: 0 6px 18px rgba(0,0,0,0.25);
          backdrop-filter: blur(2px);
          transition: background .2s ease, border-color .2s ease, transform .1s ease;
        }
        .privacy-content .back-to-top-floating svg { stroke: #ffffff; stroke-width: 2.6; color: #ffffff; }
        .privacy-content .back-to-top-fixed { position: fixed; right: 24px; bottom: 24px; z-index: 50; color: #ffffff; }
        .privacy-content .back-to-top-floating:hover { background: rgba(255,255,255,0.12); border-color: rgba(148,163,184,0.4); }
        .privacy-content .back-to-top-floating:active { transform: translateY(1px); }
      `}</style>

      <div className="privacy-content">

        <nav className="privacy-toc" aria-label="Table of contents">
          <a href="#p1">1. Purpose of Collecting Your Data</a>
          <a href="#p2">2. What Information We Collect</a>
          <a href="#p3">3. How We Use Your Information</a>
          <a href="#p4">4. How Long We Keep Your Data</a>
          <a href="#p5">5. Sharing Your Data</a>
          <a href="#p6">6. How We Protect Your Data</a>
          <a href="#p7">7. Your Rights</a>
          <a href="#p8">8. Contact Us</a>
          <a href="#p9">9. Your Consent</a>
          <a href="#p10">10. Updates to This Notice</a>
        </nav>

        <section id="p1">
          <h2>1. Purpose of Collecting Your Data</h2>
          <p>
            LakeView PH collects your information to create and manage your account,
            help you join organizations, handle your feedback, and keep the platform safe and reliable.
            We also gather a small amount of technical data, like your browser type and IP address,
            to improve performance and prevent misuse.
          </p>
        </section>

        <section id="p2">
          <h2>2. What Information We Collect</h2>
          <ul>
            <li>Account details: name, email, and password (securely encrypted).</li>
            <li>Organization details: the role you want and the group you apply to join.</li>
            <li>Identification details: your name, birthday, ID type and number, address, and uploaded ID files (if needed).</li>
            <li>Feedback details: your message, title, and optional name or email if you send feedback without an account.</li>
            <li>System info: your IP address, browser type, and records of actions made in the app.</li>
          </ul>
        </section>

        <section id="p3">
          <h2>3. How We Use Your Information</h2>
          <ul>
            <li>Create and log you into your account safely.</li>
            <li>Verify your identity for certain roles or groups.</li>
            <li>Review and process your applications.</li>
            <li>Respond to your feedback and questions.</li>
            <li>Improve and secure our platform.</li>
            <li>Follow legal requirements when necessary.</li>
          </ul>
        </section>

        <section id="p4">
          <h2>4. How Long We Keep Your Data</h2>
          <p>
            We only keep your information for as long as it is needed for our services or legal purposes.
            When it’s no longer required, we delete or anonymize it securely.
          </p>
        </section>

        <section id="p5">
          <h2>5. Sharing Your Data</h2>
          <ul>
            <li>Our trusted team members may review certain data for approval or verification.</li>
            <li>We use partners like email or cloud services who must follow strict privacy rules.</li>
            <li>We may share data if required by law or authorities.</li>
          </ul>
          <p>We never sell your personal information.</p>
        </section>

        <section id="p6">
          <h2>6. How We Protect Your Data</h2>
          <ul>
            <li>Secure passwords and login tokens.</li>
            <li>Access limits for admins only.</li>
            <li>Tracking important actions for safety.</li>
            <li>Secure handling and deletion of uploaded files.</li>
            <li>Basic spam and security checks on forms.</li>
          </ul>
          <p>
            No system is 100% secure. Please use strong passwords and keep them private.
          </p>
        </section>

        <section id="p7">
          <h2>7. Your Rights</h2>
          <p>
            Under the Philippine Data Privacy Act of 2012, you have the right to:
          </p>
          <ul>
            <li>Know how your data is collected and used.</li>
            <li>Ask for a copy of your data.</li>
            <li>Correct wrong or missing information.</li>
            <li>Request deletion or blocking of your data when possible.</li>
            <li>Withdraw consent or object to certain uses.</li>
            <li>Get an electronic copy of your data.</li>
            <li>File a complaint with the National Privacy Commission (NPC).</li>
          </ul>
          <p>
            To make a request, contact us using the details below. We may ask for proof of identity.
          </p>
        </section>

        <section id="p8">
          <h2>8. Contact Us</h2>
          <p>
            If you have questions or privacy requests, contact our Data Protection Officer (DPO):
          </p>
          <p>Email: privacy@lakeview.ph (sample)  
          Or send a message through the in-app Feedback form.</p>
        </section>

        <section id="p9">
          <h2>9. Your Consent</h2>
          <p>
            By creating an account, joining an organization, sending feedback, or using LakeView PH,
            you agree that we can collect and use your information as explained in this notice.
          </p>
        </section>

        <div className="back-to-top-bar">
          <button
            aria-label="Back to top"
            className="back-to-top-floating back-to-top-fixed"
            type="button"
            onClick={() => {
              const c = document.querySelector(".lv-modal-body");
              if (c) c.scrollTo({ top: 0, behavior: "smooth" });
            }}
            title="Back to top"
          >
            <FiArrowUp size={20} color="#ffffff" />
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default DataPrivacyDisclaimer;
