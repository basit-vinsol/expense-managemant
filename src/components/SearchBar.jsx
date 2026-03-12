import React from 'react';
import './SearchBar.css';

const SearchBar = ({ searchTerm, setSearchTerm }) => {
  return (
    <div className="search-container-v5">
      <span className="search-icon-v5">🔍</span>
      <input
        type="text"
        className="search-input-v5"
        placeholder="Search description..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      {searchTerm && (
        <button 
          className="clear-search-v5" 
          onClick={() => setSearchTerm('')}
          title="Clear search"
        >
          ✕
        </button>
      )}
    </div>
  );
};

export default SearchBar;