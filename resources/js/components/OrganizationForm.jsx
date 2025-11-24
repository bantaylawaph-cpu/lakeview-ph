

import React, { useEffect, useState } from "react";
import { useWindowSize } from "../hooks/useWindowSize";
import Modal from "./Modal";

export const TYPE_OPTIONS = [
  "LGU","Government Agency","LLDA","School/Academe","Research","NGO",
  "Community","Private","Utility","Other"
];

const empty = {
  name: "",
  type: "",
  contact_email: "",
  phone: "",
  address: "",
};

export default function OrganizationForm({ initialData = {}, onSubmit, open, onClose, title = "Organization", inline = false }) {
  const [form, setForm] = useState(empty);
  const isEdit = !!initialData?.id;

  useEffect(() => {
    setForm({
      ...empty,
      ...initialData,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData?.id]);

  const disabled = !form.name?.trim();

  const handleChange = (key) => (e) => {
    const v = (e && e.target)
      ? (e.target.type === "checkbox" ? e.target.checked : e.target.value)
      : e;
    setForm((s) => ({ ...s, [key]: v }));
  };

  const handleSubmit = (e) => {
    e?.preventDefault?.();
    const payload = {
      name: form.name?.trim(),
      type: form.type || null,
      contact_email: form.contact_email || null,
      phone: form.phone || null,
      address: form.address || null,
      // status is being deprecated from UI; keep active unchanged unless backend requires it
    };
    onSubmit?.(payload);
  };
  const { width: windowW } = useWindowSize();

  // Compute a responsive width to pass down to the Modal (keeps the modal comfortable
  // across Mobile S/M/L, Tablet, Laptop, Laptop-L and 4K screens)
  const computeModalWidth = (w) => {
    if (!w) return 640;
    if (w >= 2561) return 1400; // 4k
    if (w >= 1441) return 1080; // Laptop L
    if (w >= 1025) return 860;  // Laptop
    if (w >= 769) return 720;   // Tablet
    // mobile: keep it responsive to viewport rather than fixed pixels
    if (w <= 420) return '92vw';
    return '94vw';
  };

  const formMarkup = (
    <form onSubmit={handleSubmit} className="lv-grid-2 org-form" style={{ gap: 20, maxWidth: 640 }}>
      <label className="lv-field">
        <span>Name*</span>
        <input type="text" value={form.name} onChange={handleChange("name")} required placeholder="Organization name" />
      </label>
      <label className="lv-field">
        <span>Type</span>
        <select value={form.type || ""} onChange={handleChange("type")}>
          <option value="">— Select —</option>
          {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </label>
      <label className="lv-field">
        <span>Contact Email</span>
        <input type="email" value={form.contact_email || ""} onChange={handleChange("contact_email")} placeholder="contact@email.com" />
      </label>
      <label className="lv-field">
        <span>Phone</span>
        <input type="text" value={form.phone || ""} onChange={handleChange("phone")} placeholder="" />
      </label>
      <label className="lv-field full">
        <span>Address</span>
        <input type="text" value={form.address || ""} onChange={handleChange("address")} placeholder="" />
      </label>
      <div className="full" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
        <button type="submit" className="pill-btn primary" disabled={disabled}>{isEdit ? "Save Changes" : "Create"}</button>
      </div>
    </form>
  );

  if (inline) {
    return formMarkup;
  }

  return (
    <Modal open={open} onClose={onClose} title={title} width={computeModalWidth(windowW)} ariaLabel={title} cardClassName="org-modal">
      {formMarkup}
    </Modal>
  );

}
