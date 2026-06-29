import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
import DevPanel from './components/DevPanel.jsx';

// Import Views
import HomeView from './components/HomeView.jsx';
import FilterView from './components/FilterView.jsx';
import DetailView from './components/DetailView.jsx';
import WatchView from './components/WatchView.jsx';
import FavoritesView from './components/FavoritesView.jsx';
import HistoryView from './components/HistoryView.jsx';

export default function App() {
  // Sync URL hash
  const [hash, setHash] = useState(window.location.hash || '#home');

  // Config/Persistence states
  const [apiSource, setApiSource] = useState(() => {
    return localStorage.getItem('studyflix_api_source') || 'phimapi';
  });

  const [watchlist, setWatchlist] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('studyflix_watchlist')) || [];
    } catch {
      return [];
    }
  });

  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('studyflix_history')) || [];
    } catch {
      return [];
    }
  });

  // Developer panel drawers
  const [isDevOpen, setIsDevOpen] = useState(false);
  const [apiLog, setApiLog] = useState({
    method: 'GET',
    url: 'Chưa có request nào',
    response: null
  });

  // Listen to hash updates
  useEffect(() => {
    const handleHashChange = () => {
      setHash(window.location.hash || '#home');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Sync states to LocalStorage
  const handleApiSourceChange = (newSource) => {
    localStorage.setItem('studyflix_api_source', newSource);
    setApiSource(newSource);
  };

  const handleToggleWatchlist = (movie) => {
    setWatchlist((prev) => {
      const idx = prev.findIndex((m) => m.slug === movie.slug);
      let updated;
      if (idx > -1) {
        updated = prev.filter((m) => m.slug !== movie.slug);
      } else {
        updated = [
          ...prev,
          {
            name: movie.name,
            origin_name: movie.origin_name,
            slug: movie.slug,
            poster_url: movie.poster_url,
            thumb_url: movie.thumb_url,
            year: movie.year
          }
        ];
      }
      localStorage.setItem('studyflix_watchlist', JSON.stringify(updated));
      return updated;
    });
  };

  const handleSaveHistory = ({ movie, episode, currentTime, duration }) => {
    const percent = Math.floor((currentTime / duration) * 100);
    const historyItem = {
      movieSlug: movie.slug,
      movieName: movie.name,
      movieOriginName: movie.origin_name,
      movieThumb: movie.thumb_url || movie.poster_url,
      episodeSlug: episode.slug,
      episodeName: episode.name,
      currentTime: currentTime,
      duration: duration,
      percent: percent,
      updatedAt: new Date().toISOString()
    };

    setHistory((prev) => {
      // Remove older record of same movie
      const filtered = prev.filter((item) => item.movieSlug !== movie.slug);
      const updated = [historyItem, ...filtered].slice(0, 30);
      localStorage.setItem('studyflix_history', JSON.stringify(updated));
      return updated;
    });
  };

  const handleRemoveHistory = (movieSlug) => {
    setHistory((prev) => {
      const updated = prev.filter((item) => item.movieSlug !== movieSlug);
      localStorage.setItem('studyflix_history', JSON.stringify(updated));
      return updated;
    });
  };

  const handleClearHistory = () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử xem phim?")) {
      setHistory([]);
      localStorage.removeItem('studyflix_history');
    }
  };

  // Centralized fetch logging wrapper
  const fetchAPI = async (endpoint, isFullURL = false) => {
    const base = apiSource === 'ophim' ? 'https://ophim1.com' : 'https://phimapi.com';
    const url = isFullURL ? endpoint : `${base}${endpoint}`;

    setApiLog({
      method: 'GET',
      url: url,
      response: 'Loading...'
    });

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      
      setApiLog({
        method: 'GET',
        url: url,
        response: data
      });

      return data;
    } catch (error) {
      console.error('API Fetch Error:', error);
      setApiLog({
        method: 'GET',
        url: url,
        response: { error: error.message }
      });
      throw error;
    }
  };

  // Route router logic
  const renderView = () => {
    if (hash === '#home' || hash === '') {
      return (
        <HomeView
          apiSource={apiSource}
          fetchAPI={fetchAPI}
          watchlist={watchlist}
          onToggleWatchlist={handleToggleWatchlist}
        />
      );
    }

    if (hash === '#phim-le') {
      return <FilterView initialType="phim-le" apiSource={apiSource} fetchAPI={fetchAPI} />;
    }
    if (hash === '#phim-bo') {
      return <FilterView initialType="phim-bo" apiSource={apiSource} fetchAPI={fetchAPI} />;
    }
    if (hash === '#hoat-hinh') {
      return <FilterView initialType="hoat-hinh" apiSource={apiSource} fetchAPI={fetchAPI} />;
    }
    if (hash === '#phim-chieu-rap') {
      return <FilterView initialType="phim-chieu-rap" apiSource={apiSource} fetchAPI={fetchAPI} />;
    }
    if (hash === '#tv-shows') {
      return <FilterView initialType="tv-shows" apiSource={apiSource} fetchAPI={fetchAPI} />;
    }
    if (hash === '#danh-muc') {
      return <FilterView initialType="phim-moi-cap-nhat" apiSource={apiSource} fetchAPI={fetchAPI} />;
    }

    if (hash === '#favorites') {
      return <FavoritesView watchlist={watchlist} apiSource={apiSource} />;
    }

    if (hash === '#history') {
      return (
        <HistoryView
          history={history}
          onRemoveHistory={handleRemoveHistory}
          onClearHistory={handleClearHistory}
        />
      );
    }

    if (hash.startsWith('#movie/')) {
      const slug = hash.replace('#movie/', '');
      return (
        <DetailView
          slug={slug}
          apiSource={apiSource}
          fetchAPI={fetchAPI}
          watchlist={watchlist}
          onToggleWatchlist={handleToggleWatchlist}
        />
      );
    }

    if (hash.startsWith('#watch/')) {
      const parts = hash.replace('#watch/', '').split('/');
      const movieSlug = parts[0];
      const episodeSlug = parts[1] || '';
      return (
        <WatchView
          movieSlug={movieSlug}
          episodeSlug={episodeSlug}
          apiSource={apiSource}
          fetchAPI={fetchAPI}
          history={history}
          onSaveHistory={handleSaveHistory}
        />
      );
    }

    if (hash.startsWith('#search?q=')) {
      const q = decodeURIComponent(hash.split('#search?q=')[1] || '');
      return <FilterView searchKeyword={q} apiSource={apiSource} fetchAPI={fetchAPI} />;
    }

    // Default fallback
    return (
      <div className="empty-state">
        <i className="bx bx-confused"></i>
        <p>Không tìm thấy trang yêu cầu.</p>
      </div>
    );
  };

  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <Sidebar
        currentHash={hash}
        watchlistCount={watchlist.length}
        onToggleDev={() => setIsDevOpen((prev) => !prev)}
      />

      {/* Main Content Area */}
      <main className="main-content">
        {/* Top Header */}
        <Header
          apiSource={apiSource}
          onApiSourceChange={handleApiSourceChange}
          currentHash={hash}
        />

        {/* Content routing wrapper */}
        {renderView()}

        {/* Footer */}
        <footer className="main-footer">
          <p>&copy; 2026 StudyFlix Project. Được phát triển dành riêng cho mục đích học tập & nghiên cứu API truyền thông.</p>
          <p className="disclaimer">Tuyên bố miễn trừ trách nhiệm: Dữ liệu và liên kết truyền thông được cung cấp từ API bên thứ ba. Dự án phi thương mại.</p>
        </footer>
      </main>

      {/* API Logs & Tech Explanation panel drawer */}
      <DevPanel
        isOpen={isDevOpen}
        onClose={() => setIsDevOpen(false)}
        apiLog={apiLog}
      />
    </div>
  );
}
