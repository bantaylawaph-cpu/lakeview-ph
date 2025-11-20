import React from 'react';
import Modal from '../Modal';
import Terms from '../../pages/PublicInterface/Terms';

// Placeholder Terms & Conditions modal; replace content with real policy later.
export default function TermsModal({ open, onClose }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Terms & Conditions"
      ariaLabel="Terms and Conditions"
      width={760}
      overlayZIndex={12000}
      bodyClassName="modern-scrollbar terms-modal-body"
    >
      <Terms />
    </Modal>
  );
}
