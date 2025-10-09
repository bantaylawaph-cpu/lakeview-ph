import React from "react";
import { FiDatabase, FiArrowUp } from 'react-icons/fi';
import Modal from "../../components/Modal";

function AboutData({ open, onClose }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="About the Data"
      width={860}
      cardClassName="auth-card"
      bodyClassName="content-page modern-scrollbar"
      ariaLabel="About the Data"
    >
      <style>{`
        .about-data .back-to-top-bar { position: sticky; bottom: 8px; display: flex; justify-content: flex-end; margin-top: 16px; }
        .about-data .back-to-top-floating {
          width: 40px; height: 40px; border-radius: 999px;
          display: inline-flex; align-items: center; justify-content: center;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(148,163,184,0.25);
          color: #ffffff; box-shadow: 0 6px 18px rgba(0,0,0,0.25);
          backdrop-filter: blur(2px);
          transition: background .2s ease, border-color .2s ease, transform .1s ease;
        }
        .about-data .back-to-top-floating svg { stroke: #ffffff; stroke-width: 2.6; }
        .about-data .back-to-top-fixed { position: fixed; right: 24px; bottom: 24px; z-index: 50; }
        .about-data .back-to-top-floating:hover { background: rgba(255,255,255,0.12); border-color: rgba(148,163,184,0.4); }
        .about-data .back-to-top-floating:active { transform: translateY(1px); }
      `}</style>
      <div className="about-data content-page" style={{ paddingTop: 4 }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 26, margin: '0 0 14px' }}>
          <FiDatabase /> <span>About the Data</span>
        </h1>
        <p style={{ marginTop: 0, fontSize: 14, lineHeight: 1.55 }}>
          Learn about the origin, processing, and limitations of the datasets powering LakeView PH.
        </p>

        <h2 style={{ fontSize: 18, margin: '30px 0 8px' }}>Data Sources</h2>
        <p className="muted" style={{ lineHeight: 1.55 }}>
          Provide a concise list of data providers (e.g., government hydrological agencies, environmental monitoring groups,
          satellite-derived datasets). Clarify licensing or attribution requirements here.
        </p>

        <h2 style={{ fontSize: 18, margin: '30px 0 8px' }}>Data Processing & Quality</h2>
        <p className="muted" style={{ lineHeight: 1.55 }}>
          Summarize validation steps, cleaning routines, interpolation approaches, and quality control thresholds. Mention how often data is refreshed and any automated anomaly detection.
        </p>

        <h2 style={{ fontSize: 18, margin: '30px 0 8px' }}>Limitations & Caveats</h2>
        <p className="muted" style={{ lineHeight: 1.55 }}>
          Explain temporal gaps, spatial resolution limits, instrument precision, or potential biases. Encourage users to treat outputs as indicative rather than absolute where applicable.
        </p>

        <h2 style={{ fontSize: 18, margin: '30px 0 8px' }}>Methodologies</h2>
        <p className="muted" style={{ lineHeight: 1.55 }}>
          Outline calculation formulas, classification schemes, and modeling techniques. Reference any publicly available technical documentation or peer-reviewed sources.
        </p>

        <h2 style={{ fontSize: 18, margin: '30px 0 8px' }}>Attribution & Licensing</h2>
        <p className="muted" style={{ lineHeight: 1.55 }}>
          Add required attribution statements and links to source licenses. Provide a contact or feedback mechanism for corrections or takedown requests.
        </p>

        <h2 style={{ fontSize: 18, margin: '30px 0 8px' }}>Contact & Feedback</h2>
        <p className="muted" style={{ lineHeight: 1.55, marginBottom: 16 }}>
          Direct users to the feedback form in the sidebar or an email channel for inquiries about data provenance or requests for additional indicators.
        </p>
        <div className="back-to-top-bar">
          <button
            aria-label="Back to top"
            className="back-to-top-floating back-to-top-fixed"
            type="button"
            onClick={() => { const c = document.querySelector('.lv-modal-body'); if (c) c.scrollTo({ top: 0, behavior: 'smooth' }); }}
            title="Back to top"
          >
            <FiArrowUp size={20} color="#ffffff" />
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default AboutData;