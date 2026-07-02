import React from 'react';

export default function Sidebar({ activeNav, watchlistCount, isSidebarOpen, setIsSidebarOpen, activeDownloadsCount = 0 }) {
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
    <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
      <div className="brand" onClick={() => {
        window.location.hash = '#home';
        setIsSidebarOpen(false);
      }} style={{ cursor: 'pointer' }}>
        <i className="bx bx-movie-play logo-icon"></i>
        <span className="logo-text">Study<span>flix</span></span>
      </div>
      <nav className="nav-menu">
        {menuItems.map(item => (
          <a
            key={item.id}
            href={item.hash}
            className={`nav-link ${activeNav === item.id ? 'active' : ''}`}
            data-nav={item.id}
            onClick={() => setIsSidebarOpen(false)}
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
          onClick={() => setIsSidebarOpen(false)}
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
          onClick={() => setIsSidebarOpen(false)}
        >
          <i className="bx bx-history"></i>
          <span>Lịch Sử Xem</span>
        </a>
        <a
          href="#lich-su-tai"
          className={`nav-link ${activeNav === 'lich-su-tai' ? 'active' : ''}`}
          data-nav="lich-su-tai"
          onClick={() => setIsSidebarOpen(false)}
        >
          <i className="bx bx-cloud-download"></i>
          <span>Lịch Sử Tải</span>
          {activeDownloadsCount > 0 && (
            <span className="badge badge-downloads">
              {activeDownloadsCount}
            </span>
          )}
        </a>
      </nav>
    </aside>
  );
}
