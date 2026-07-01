import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
import HomeView from './components/HomeView.jsx';
import DetailView from './components/DetailView.jsx';
import WatchView from './components/WatchView.jsx';
import FilterView from './components/FilterView.jsx';
import FavoritesView from './components/FavoritesView.jsx';
import HistoryView from './components/HistoryView.jsx';

export default function App() {
  const [watchlist, setWatchlist] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('sofaflix_watchlist')) || [];
    } catch {
      return [];
    }
  });

  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('sofaflix_history')) || [];
    } catch {
      return [];
    }
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [route, setRoute] = useState(() => window.location.hash || '#home');

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(window.location.hash || '#home');
      // Scroll main content to top on view change
      const mainContent = document.querySelector('.main-content');
      if (mainContent) mainContent.scrollTop = 0;
      // Auto-close sidebar on mobile hash change
      setIsSidebarOpen(false);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const toggleWatchlist = (movie) => {
    const index = watchlist.findIndex(m => m.slug === movie.slug);
    let updatedList = [...watchlist];
    if (index > -1) {
      updatedList.splice(index, 1);
    } else {
      updatedList.push({
        name: movie.name,
        origin_name: movie.origin_name,
        slug: movie.slug,
        poster_url: movie.poster_url,
        thumb_url: movie.thumb_url,
        year: movie.year,
        apiSource: movie.apiSource
      });
    }
    setWatchlist(updatedList);
    localStorage.setItem('sofaflix_watchlist', JSON.stringify(updatedList));
  };

  const saveWatchHistory = (movie, episode, currentTime, duration) => {
    if (!movie || !episode || !duration) return;
    const progressPercent = Math.floor((currentTime / duration) * 100);

    const historyItem = {
      movieSlug: movie.slug,
      movieName: movie.name,
      movieOriginName: movie.origin_name,
      movieThumb: movie.thumb_url || movie.poster_url,
      episodeSlug: episode.slug,
      episodeName: episode.name,
      currentTime: currentTime,
      duration: duration,
      percent: progressPercent,
      updatedAt: new Date().toISOString(),
      apiSource: movie.apiSource
    };

    setHistory(prev => {
      const filtered = prev.filter(item => item.movieSlug !== movie.slug);
      const updated = [historyItem, ...filtered].slice(0, 30);
      localStorage.setItem('sofaflix_history', JSON.stringify(updated));
      return updated;
    });
  };

  const deleteHistoryItem = (movieSlug) => {
    setHistory(prev => {
      const updated = prev.filter(item => item.movieSlug !== movieSlug);
      localStorage.setItem('sofaflix_history', JSON.stringify(updated));
      return updated;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('sofaflix_history');
  };

  const renderView = () => {
    if (route.startsWith('#movie/')) {
      const slug = route.substring(7);
      return (
        <DetailView
          slug={slug}
          watchlist={watchlist}
          toggleWatchlist={toggleWatchlist}
        />
      );
    }
    if (route.startsWith('#watch/')) {
      const parts = route.substring(7).split('/');
      const slug = parts[0];
      const episodeSlug = parts[1] || '';
      return (
        <WatchView
          slug={slug}
          episodeSlug={episodeSlug}
          history={history}
          saveWatchHistory={saveWatchHistory}
        />
      );
    }
    if (route.startsWith('#search?q=')) {
      const keyword = decodeURIComponent(route.substring(10) || '');
      return (
        <FilterView
          key={`search-${keyword}`}
          searchQuery={keyword}
        />
      );
    }

    // Determine normalized current route
    let activeRoute = route;
    if (!['#home', '#phim-le', '#phim-bo', '#hoat-hinh', '#phim-chieu-rap', '#tv-shows', '#danh-muc', '#favorites', '#history'].includes(route)) {
      activeRoute = '#home';
    }

    switch (activeRoute) {
      case '#home':
        return (
          <HomeView
            watchlist={watchlist}
            toggleWatchlist={toggleWatchlist}
          />
        );
      case '#phim-le':
        return (
          <FilterView
            key="phim-le"
            initialType="phim-le"
          />
        );
      case '#phim-bo':
        return (
          <FilterView
            key="phim-bo"
            initialType="phim-bo"
          />
        );
      case '#hoat-hinh':
        return (
          <FilterView
            key="hoat-hinh"
            initialType="hoat-hinh"
          />
        );
      case '#phim-chieu-rap':
        return (
          <FilterView
            key="phim-chieu-rap"
            initialType="phim-chieu-rap"
          />
        );
      case '#tv-shows':
        return (
          <FilterView
            key="tv-shows"
            initialType="tv-shows"
          />
        );
      case '#danh-muc':
        return (
          <FilterView
            key="danh-muc"
          />
        );
      case '#favorites':
        return (
          <FavoritesView
            watchlist={watchlist}
          />
        );
      case '#history':
        return (
          <HistoryView
            history={history}
            clearHistory={clearHistory}
            deleteHistoryItem={deleteHistoryItem}
          />
        );
      default:
        return (
          <HomeView
            watchlist={watchlist}
            toggleWatchlist={toggleWatchlist}
          />
        );
    }
  };

  // Determine active view label for Sidebar highlighting
  let activeNav = 'home';
  if (route.startsWith('#movie/') || route.startsWith('#watch/')) {
    activeNav = ''; // No active nav in sidebar for details or watch view
  } else if (route.startsWith('#search?q=')) {
    activeNav = 'danh-muc'; // Search results fit inside filter page layout
  } else {
    activeNav = route.substring(1) || 'home';
  }

  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <Sidebar
        activeNav={activeNav}
        watchlistCount={watchlist.length}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />

      {/* Mobile Sidebar overlay */}
      {isSidebarOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* Main Content Area */}
      <main className="main-content">
        {/* Top Header */}
        <Header
          onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
        />

        {/* View Content */}
        {renderView()}

        {/* Footer */}
        <footer className="main-footer">
          <p>&copy; 2026 Studyflix Hub. Được thiết kế tối ưu và đồng bộ đa nguồn dữ liệu giải trí học tập.</p>
          <p className="disclaimer">Tuyên bố miễn trừ trách nhiệm: Nội dung truyền thông được lấy từ các API bên thứ ba phục vụ cho nhu cầu học tập và nghiên cứu phi thương mại.</p>
        </footer>
      </main>
    </div>
  );
}
