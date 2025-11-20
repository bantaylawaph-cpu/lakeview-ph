import React from "react";
import Modal from "../../components/Modal";
import Terms from "./Terms";

function AboutData({ open, onClose }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Terms & Conditions"
      width={860}
      cardClassName="auth-card"
      bodyClassName="content-page modern-scrollbar"
      ariaLabel="Terms and Conditions"
    >
      <div className="content-page" style={{ paddingTop: 4 }}>
        <Terms />
      </div>
    </Modal>
  );
}

export default AboutData;