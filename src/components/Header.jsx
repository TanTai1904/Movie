import React, { useState, useEffect } from 'react';

export default function Header({ apiSource, onApiSourceChange }) {
  const [query, setQuery] = useState('');

  // Update query state if url hash changes (e.g. going back to home clears query)
  useEffect(() => {
    const checkHash = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#search?q=')) {
        setQuery(decodeURIComponent(hash.substring(10)));
      } else if (hash === '#home' || !hash) {
        setQuery('');
      }
    };
    window.addEventListener('hashchange', checkHash);
    checkHash(); // run initially
    return () => window.removeEventListener('hashchange', checkHash);
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      const trimmed = query.trim();
      if (trimmed) {
        window.location.hash = `#search?q=${encodeURIComponent(trimmed)}`;
      }
    }
  };

  const handleClear = () => {
    setQuery('');
    window.location.hash = '#home';
  };

  return (
    <header className="top-header">
      <div className="header-search">
        <i className="bx bx-search search-icon"></i>
        <input
          type="text"
          id="search-input"
          placeholder="Tìm tên phim, diễn viên, đạo diễn..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        {query.length > 0 && (
          <button id="search-clear-btn" className="search-clear-btn" onClick={handleClear} style={{ display: 'block' }}>
            <i className="bx bx-x"></i>
          </button>
        )}
      </div>
      <div className="header-profile">
        <div className="header-source-selector">
          <i className="bx bx-cylinder select-icon"></i>
          <select
            id="api-source-select"
            className="form-select-sm header-select"
            value={apiSource}
            onChange={(e) => onApiSourceChange(e.target.value)}
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
