// src/components/SearchBar.jsx
import React, { useState, useCallback, useRef } from "react";
import { FiMenu, FiSearch, FiFilter, FiX } from "react-icons/fi";

function SearchBar({ onMenuClick, onFilterClick, onSearch, onClear }) {
  const [text, setText] = useState("");
  const inputRef = useRef(null);

  const triggerSearch = useCallback(() => {
    const q = (text || "").trim();
    if (!q) return;
    if (typeof onSearch === "function") onSearch(q);
  }, [text, onSearch]);

  const onKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      triggerSearch();
    }
  };

  const clearText = () => {
    setText("");
    try { inputRef.current?.focus(); } catch (_) {}
    if (typeof onClear === "function") onClear();
  };

  return (
    <div className="search-bar">
      {/* ✅ Hamburger opens sidebar */}
      <button className="btn-floating" onClick={onMenuClick}>
        <FiMenu size={18} />
      </button>

      <input
        type="text"
        placeholder="Search LakeView"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        ref={inputRef}
      />

      {text?.length > 0 && (
        <button className="btn-floating" onClick={clearText} title="Clear">
          <FiX size={18} />
        </button>
      )}

      <button className="btn-floating" onClick={triggerSearch}>
        <FiSearch size={18} />
      </button>

      <button className="btn-floating" onClick={onFilterClick} title="Filter lakes">
        <FiFilter size={18} />
      </button>
    </div>
  );
}

export default SearchBar;