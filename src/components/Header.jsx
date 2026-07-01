import React, { useState, useEffect } from 'react';

export default function Header({ onToggleSidebar }) {
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
      {/* Mobile Toggle Button on left */}
      <button 
        type="button" 
        className="hamburger-menu" 
        onClick={onToggleSidebar}
        aria-label="Mở Menu"
      >
        <i className="bx bx-menu"></i>
      </button>

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
        <div className="profile-info">
          <span className="user-name">Guest Viewer</span>
          <span className="user-role">StudyFlix User</span>
        </div>
        <div className="profile-avatar">
          <i className="bx bx-user"></i>
        </div>
      </div>
    </header>
  );
}
