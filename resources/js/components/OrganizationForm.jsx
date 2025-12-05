

import React, { useEffect, useState } from "react";
import { useWindowSize } from "../hooks/useWindowSize";
import Modal from "./Modal";
import { FiCheck, FiAlertCircle } from "react-icons/fi";
import Swal from "sweetalert2";

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
  const [errors, setErrors] = useState({ name: null, contact_email: null, phone: null });
  const isEdit = !!initialData?.id;

  // Validation functions (from adminUsersForm)
  const validateFullName = (name) => {
    if (!name || name.trim().length === 0) return "Organization name is required.";
    if (name.trim().length < 2) return "Organization name must be at least 2 characters.";
    if (name.length > 100) return "Organization name must not exceed 100 characters.";
    return null;
  };

  const validateEmail = (email) => {
    if (!email || email.trim().length === 0) return null; // Email is optional
    if (email.length > 254) return "Email must not exceed 254 characters.";
    if (/\s/.test(email)) return "Email must not contain spaces.";
    if (!/^[a-zA-Z0-9]/.test(email)) return "Email must start with a letter or number.";
    if (!/[a-zA-Z0-9]$/.test(email)) return "Email must end with a letter or number.";
    if (!email.includes('@')) return "Email must contain @.";
    const emailRegex = /^[a-zA-Z0-9][a-zA-Z0-9._-]*@[a-zA-Z0-9][a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) return "Please enter a valid email address.";
    return null;
  };

  const validatePhone = (phone) => {
    if (!phone || phone.trim().length === 0) return null; // Phone is optional
    // Philippine phone format: 09XXXXXXXXX or +639XXXXXXXXX
    const phoneRegex = /^(09|\+639)\d{9}$/;
    if (!phoneRegex.test(phone)) return "Phone number must be in format 09XXXXXXXXX or +639XXXXXXXXX.";
    return null;
  };

  // Derived validation states
  const validName = validateFullName(form.name) === null;
  const validEmail = validateEmail(form.contact_email) === null;
  const validPhone = validatePhone(form.phone) === null;

  useEffect(() => {
    setForm({
      ...empty,
      ...initialData,
    });
    setErrors({ name: null, contact_email: null, phone: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData?.id]);

  const disabled = !form.name?.trim() || !validName || !validEmail || !validPhone;

  const handleChange = (key) => (e) => {
    const v = (e && e.target)
      ? (e.target.type === "checkbox" ? e.target.checked : e.target.value)
      : e;
    setForm((s) => ({ ...s, [key]: v }));
    
    // Clear error for the field being edited
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    
    // Validate all fields
    const nameError = validateFullName(form.name);
    const emailError = validateEmail(form.contact_email);
    const phoneError = validatePhone(form.phone);
    
    // Set errors if any
    if (nameError || emailError || phoneError) {
      setErrors({ name: nameError, contact_email: emailError, phone: phoneError });
      return;
    }
    
    // Confirm before saving
    const result = await Swal.fire({
      title: isEdit ? 'Save Changes?' : 'Create Organization?',
      text: isEdit ? 'Are you sure you want to save these changes?' : 'Are you sure you want to create this organization?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: isEdit ? 'Save Changes' : 'Create',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#3b82f6'
    });
    
    if (!result.isConfirmed) return;
    
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
        <input 
          type="text" 
          value={form.name} 
          onChange={handleChange("name")} 
          required 
          placeholder="Organization name"
          className={errors.name ? "error" : validName && form.name ? "success" : ""}
        />
        {errors.name && (
          <div className="field-error" style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#dc2626', fontSize: 13, marginTop: 4 }}>
            <FiAlertCircle size={14} />
            <span>{errors.name}</span>
          </div>
        )}
        {!errors.name && validName && form.name && (
          <div className="field-success" style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#16a34a', fontSize: 13, marginTop: 4 }}>
            <FiCheck size={14} />
            <span>Valid name</span>
          </div>
        )}
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
        <input 
          type="email" 
          value={form.contact_email || ""} 
          onChange={handleChange("contact_email")} 
          placeholder="contact@email.com"
          className={errors.contact_email ? "error" : validEmail && form.contact_email ? "success" : ""}
        />
        {errors.contact_email && (
          <div className="field-error" style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#dc2626', fontSize: 13, marginTop: 4 }}>
            <FiAlertCircle size={14} />
            <span>{errors.contact_email}</span>
          </div>
        )}
        {!errors.contact_email && validEmail && form.contact_email && (
          <div className="field-success" style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#16a34a', fontSize: 13, marginTop: 4 }}>
            <FiCheck size={14} />
            <span>Valid email</span>
          </div>
        )}
      </label>
      <label className="lv-field">
        <span>Phone</span>
        <input 
          type="text" 
          value={form.phone || ""} 
          onChange={handleChange("phone")} 
          placeholder="09123456789 or +639123456789"
          className={errors.phone ? "error" : validPhone && form.phone ? "success" : ""}
        />
        {errors.phone && (
          <div className="field-error" style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#dc2626', fontSize: 13, marginTop: 4 }}>
            <FiAlertCircle size={14} />
            <span>{errors.phone}</span>
          </div>
        )}
        {!errors.phone && validPhone && form.phone && (
          <div className="field-success" style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#16a34a', fontSize: 13, marginTop: 4 }}>
            <FiCheck size={14} />
            <span>Valid phone</span>
          </div>
        )}
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
