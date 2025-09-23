// src/components/SearchBar.jsx
import React from "react";
import { FiMenu, FiSearch, FiFilter } from "react-icons/fi";

function SearchBar({ onMenuClick, onFilterClick }) {
  return (
    <div className="search-bar">
      {/* ✅ Hamburger opens sidebar */}
      <button className="btn-floating" onClick={onMenuClick}>
        <FiMenu size={18} />
      </button>

      <input type="text" placeholder="Search LakeView" />

      <button className="btn-floating">
        <FiSearch size={18} />
      </button>

      <button className="btn-floating" onClick={onFilterClick} title="Filter lakes">
        <FiFilter size={18} />
      </button>
    </div>
  );
}

export default SearchBar;