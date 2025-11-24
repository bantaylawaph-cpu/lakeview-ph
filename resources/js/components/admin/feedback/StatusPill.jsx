import React from 'react';
import { STATUS_LABEL } from './feedbackConstants';

export default function StatusPill({ status }) {
  return <span className={`feedback-status ${status}`}>{STATUS_LABEL[status] || status}</span>;
}
