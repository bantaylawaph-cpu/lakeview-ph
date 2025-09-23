

import React, { useEffect, useState } from "react";
import Modal from "./Modal";

const TYPE_OPTIONS = [
  "LGU","Government Agency","LLDA","School/Academe","Research","NGO",
  "Community","Private","Utility","Other"
];

const empty = {
  name: "",
  type: "",
  domain: "",
  contact_email: "",
  phone: "",
  address: "",
  metadata: "",
  active: true,
};

export default function OrganizationForm({ initialData = {}, onSubmit, open, onClose, title = "Organization" }) {
  const [form, setForm] = useState(empty);
  const isEdit = !!initialData?.id;

  useEffect(() => {
    const metaString =
      typeof initialData?.metadata === "object" && initialData?.metadata !== null
        ? JSON.stringify(initialData.metadata, null, 2)
        : (initialData?.metadata || "");
    setForm({
      ...empty,
      ...initialData,
      metadata: metaString,
      active: initialData?.active ?? true,
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
    let metadata = undefined;
    if (form.metadata && String(form.metadata).trim() !== "") {
      try { metadata = JSON.parse(form.metadata); }
      catch { alert("Metadata must be valid JSON."); return; }
    }
    const payload = {
      name: form.name?.trim(),
      type: form.type || null,
      domain: form.domain || null,
      contact_email: form.contact_email || null,
      phone: form.phone || null,
      address: form.address || null,
      metadata,
      active: !!form.active,
    };
    onSubmit?.(payload);
  };

  return (
    <Modal open={open} onClose={onClose} title={title} width={640} ariaLabel="Organization form">
      <form onSubmit={handleSubmit} style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 20,
        width: '100%',
        maxWidth: 600,
        margin: '0 auto',
      }}>
        <label className="lv-field" style={{ gridColumn: '1/2' }}>
          <span>Name *</span>
          <input type="text" value={form.name} onChange={handleChange("name")}
            required placeholder="Organization name" />
        </label>

        <label className="lv-field" style={{ gridColumn: '2/3' }}>
          <span>Type</span>
          <select value={form.type || ""} onChange={handleChange("type")}> 
            <option value="">— Select —</option>
            {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>

        <label className="lv-field" style={{ gridColumn: '1/2' }}>
          <span>Domain</span>
          <input type="text" value={form.domain || ""} onChange={handleChange("domain")}
            placeholder="e.g., lgu-sanpablo" />
        </label>

        <label className="lv-field" style={{ gridColumn: '2/3' }}>
          <span>Contact Email</span>
          <input type="email" value={form.contact_email || ""} onChange={handleChange("contact_email")}
            placeholder="contact@email.com" />
        </label>

        <label className="lv-field" style={{ gridColumn: '1/2' }}>
          <span>Phone</span>
          <input type="text" value={form.phone || ""} onChange={handleChange("phone")}
            placeholder="" />
        </label>

        <label className="lv-field" style={{ gridColumn: '2/3' }}>
          <span>Address</span>
          <input type="text" value={form.address || ""} onChange={handleChange("address")}
            placeholder="" />
        </label>

        <label className="lv-field" style={{ gridColumn: '1/3' }}>
          <span>Metadata (JSON)</span>
          <textarea rows={3} value={form.metadata} onChange={handleChange("metadata")} />
        </label>

        <label className="lv-field" style={{ gridColumn: '1/3' }}>
          <input type="checkbox" checked={!!form.active} onChange={handleChange("active")} />
          <span style={{ marginLeft: 8 }}>Active</span>
        </label>

        <div style={{ gridColumn: '1/3', display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button type="submit" className="pill-btn primary" disabled={disabled}>{isEdit ? "Save Changes" : "Create"}</button>
        </div>
      </form>
    </Modal>
  );
}
