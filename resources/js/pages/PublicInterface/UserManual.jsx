import React from "react";
import Modal from "../../components/Modal";

// Modal variant of User Manual; shown on top of MapPage
function UserManual({ open, onClose }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="How to Use LakeView PH"
      width={760}
      bodyClassName="content-page modern-scrollbar"
      ariaLabel="How to Use LakeView PH"
    >
      <div className="content-page" style={{ paddingTop: 4 }}>
        <h1 style={{ marginTop: 0 }}>How to Use LakeView PH</h1>
        <p>
          This is a placeholder for the user manual. Here you can explain how to use the features
          of the map, sidebar, and tools within LakeView PH.
        </p>
      </div>
    </Modal>
  );
}

export default UserManual;