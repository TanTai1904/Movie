import React from 'react';

export default function Sidebar({ activeNav, watchlistCount, isDevPanelOpen, setIsDevPanelOpen }) {
  const menuItems = [
    { id: 'home', hash: '#home', icon: 'bx-home-alt-2', label: 'Trang Chủ' },
    { id: 'phim-le', hash: '#phim-le', icon: 'bx-movie-play', label: 'Phim Lẻ' },
    { id: 'phim-bo', hash: '#phim-bo', icon: 'bx-tv', label: 'Phim Bộ' },
    { id: 'hoat-hinh', hash: '#hoat-hinh', icon: 'bx-ghost', label: 'Hoạt Hình' },
    { id: 'phim-chieu-rap', hash: '#phim-chieu-rap', icon: 'bx-camera-movie', label: 'Phim Chiếu Rạp' },
    { id: 'tv-shows', hash: '#tv-shows', icon: 'bx-slideshow', label: 'TV Shows' },
    { id: 'danh-muc', hash: '#danh-muc', icon: 'bx-category', label: 'Bộ Lọc' },
  ];

  return (
    <aside className="sidebar">
      <div className="brand" onClick={() => window.location.hash = '#home'} style={{ cursor: 'pointer' }}>
        <i className="bx bx-play-circle logo-icon"></i>
        <span className="logo-text">Study<span>Flix</span></span>
      </div>
      <nav className="nav-menu">
        {menuItems.map(item => (
          <a
            key={item.id}
            href={item.hash}
            className={`nav-link ${activeNav === item.id ? 'active' : ''}`}
            data-nav={item.id}
          >
            <i className={`bx ${item.icon}`}></i>
            <span>{item.label}</span>
          </a>
        ))}
        <div className="nav-divider"></div>
        <a
          href="#favorites"
          className={`nav-link ${activeNav === 'favorites' ? 'active' : ''}`}
          data-nav="favorites"
        >
          <i className="bx bx-heart"></i>
          <span>Yêu Thích</span>
          <span className={`badge badge-favs ${watchlistCount > 0 ? '' : 'hidden'}`}>
            {watchlistCount}
          </span>
        </a>
        <a
          href="#history"
          className={`nav-link ${activeNav === 'history' ? 'active' : ''}`}
          data-nav="history"
        >
          <i className="bx bx-history"></i>
          <span>Lịch Sử</span>
        </a>
      </nav>
      <div className="sidebar-footer">
        <button
          id="btn-toggle-dev"
          className={`btn-dev-mode ${isDevPanelOpen ? 'active' : ''}`}
          onClick={() => setIsDevPanelOpen(prev => !prev)}
        >
          <i className="bx bx-code-alt"></i>
          <span>Developer Panel</span>
        </button>
      </div>
    </aside>
  );
}
