import React from 'react';
import Modal from '../Modal';
import SettingsForm from './SettingsForm';
import { getCurrentUser } from '../../lib/authState';

export default function PublicSettingsModal({ open, onClose }) {
  const user = getCurrentUser();
  if (!user) return null;
  return (
    <Modal open={open} onClose={onClose} title="Settings" width={520}>
      <SettingsForm context="public" />
    </Modal>
  );
}
