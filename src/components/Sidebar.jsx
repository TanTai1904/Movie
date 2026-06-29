import React from 'react';

export default function Sidebar({ currentHash, watchlistCount, onToggleDev }) {
  const getNavKey = () => {
    if (currentHash === '#home') return 'home';
    if (currentHash === '#phim-le') return 'phim-le';
    if (currentHash === '#phim-bo') return 'phim-bo';
    if (currentHash === '#hoat-hinh') return 'hoat-hinh';
    if (currentHash === '#phim-chieu-rap') return 'phim-chieu-rap';
    if (currentHash === '#tv-shows') return 'tv-shows';
    if (currentHash === '#danh-muc') return 'danh-muc';
    if (currentHash === '#favorites') return 'favorites';
    if (currentHash === '#history') return 'history';
    return '';
  };

  const navKey = getNavKey();

  const links = [
    { hash: '#home', key: 'home', icon: 'bx-home-alt-2', label: 'Trang Chủ' },
    { hash: '#phim-le', key: 'phim-le', icon: 'bx-movie-play', label: 'Phim Lẻ' },
    { hash: '#phim-bo', key: 'phim-bo', icon: 'bx-tv', label: 'Phim Bộ' },
    { hash: '#hoat-hinh', key: 'hoat-hinh', icon: 'bx-ghost', label: 'Hoạt Hình' },
    { hash: '#phim-chieu-rap', key: 'phim-chieu-rap', icon: 'bx-camera-movie', label: 'Phim Chiếu Rạp' },
    { hash: '#tv-shows', key: 'tv-shows', icon: 'bx-slideshow', label: 'TV Shows' },
    { hash: '#danh-muc', key: 'danh-muc', icon: 'bx-category', label: 'Bộ Lọc' },
  ];

  return (
    <aside className="sidebar">
      <div className="brand" onClick={() => window.location.hash = '#home'} style={{ cursor: 'pointer' }}>
        <i className="bx bx-play-circle logo-icon"></i>
        <span className="logo-text">Study<span>Flix</span></span>
      </div>
      <nav className="nav-menu">
        {links.map((link) => (
          <a
            key={link.key}
            href={link.hash}
            className={`nav-link ${navKey === link.key ? 'active' : ''}`}
          >
            <i className={`bx ${link.icon}`}></i>
            <span>{link.label}</span>
          </a>
        ))}
        <div className="nav-divider"></div>
        <a
          href="#favorites"
          className={`nav-link ${navKey === 'favorites' ? 'active' : ''}`}
        >
          <i className="bx bx-heart"></i>
          <span>Yêu Thích</span>
          <span className={`badge badge-favs ${watchlistCount === 0 ? 'hidden' : ''}`}>
            {watchlistCount}
          </span>
        </a>
        <a
          href="#history"
          className={`nav-link ${navKey === 'history' ? 'active' : ''}`}
        >
          <i className="bx bx-history"></i>
          <span>Lịch Sử</span>
        </a>
      </nav>
      <div className="sidebar-footer">
        <button onClick={onToggleDev} className="btn-dev-mode">
          <i className="bx bx-code-alt"></i>
          <span>Developer Panel</span>
        </button>
      </div>
    </aside>
  );
}
