import React from 'react';
import { FiInfo } from 'react-icons/fi';

export default function GraphInfoButton({ disabled, titleWhenDisabled='Generate a chart first', onClick }) {
  return (
    <button
      type="button"
      className="pill-btn liquid"
      title={disabled ? titleWhenDisabled : 'Explain this graph'}
      disabled={disabled}
      onClick={onClick}
      style={{ padding: '4px 6px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <FiInfo size={14} />
    </button>
  );
}
