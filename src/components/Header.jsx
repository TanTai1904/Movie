import React, { useState, useEffect } from 'react';

export default function Header({ apiSource, onApiSourceChange, currentHash }) {
  const [searchValue, setSearchValue] = useState('');

  // Sync search input value with URL hash if we are on search page
  useEffect(() => {
    if (currentHash.startsWith('#search?q=')) {
      const q = decodeURIComponent(currentHash.split('#search?q=')[1] || '');
      setSearchValue(q);
    } else if (currentHash === '#home') {
      setSearchValue('');
    }
  }, [currentHash]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      const query = searchValue.trim();
      if (query) {
        window.location.hash = `#search?q=${encodeURIComponent(query)}`;
      }
    }
  };

  const handleClear = () => {
    setSearchValue('');
    window.location.hash = '#home';
  };

  return (
    <header className="top-header">
      <div className="header-search">
        <i className="bx bx-search search-icon"></i>
        <input
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tìm tên phim, diễn viên, đạo diễn..."
        />
        {searchValue.length > 0 && (
          <button onClick={handleClear} className="search-clear-btn" style={{ display: 'block' }}>
            <i className="bx bx-x"></i>
          </button>
        )}
      </div>
      <div className="header-profile">
        <div className="header-source-selector">
          <i className="bx bx-cylinder select-icon"></i>
          <select
            value={apiSource}
            onChange={(e) => onApiSourceChange(e.target.value)}
            className="form-select-sm header-select"
          >
            <option value="phimapi">Nguồn PhimAPI</option>
            <option value="ophim">Nguồn Rổ Phim (OPhim)</option>
          </select>
        </div>
        <div className="profile-info">
          <span className="user-name">Guest Student</span>
          <span className="user-role">Developer Mode</span>
        </div>
        <div className="profile-avatar">
          <i className="bx bx-user"></i>
        </div>
      </div>
    </header>
  );
}
