import React from 'react';
import { FiSettings } from 'react-icons/fi';
import Modal from '../Modal';
import SettingsForm from './SettingsForm';
import { getCurrentUser } from '../../lib/authState';

export default function PublicSettingsModal({ open, onClose }) {
  const user = getCurrentUser();
  if (!user) return null;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><FiSettings aria-hidden /> Settings</span>}
      width={520}
      cardClassName="auth-card"
      bodyClassName="content-page modern-scrollbar"
    >
      <SettingsForm context="public" />
    </Modal>
  );
}
