import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
import DevPanel from './components/DevPanel.jsx';
import HomeView from './components/HomeView.jsx';
import DetailView from './components/DetailView.jsx';
import WatchView from './components/WatchView.jsx';
import FilterView from './components/FilterView.jsx';
import FavoritesView from './components/FavoritesView.jsx';
import HistoryView from './components/HistoryView.jsx';

export default function App() {
  const [apiSource, setApiSource] = useState(
    () => localStorage.getItem('studyflix_api_source') || 'phimapi'
  );
  
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

  const [devLog, setDevLog] = useState({
    method: 'GET',
    url: 'Chưa có request nào',
    data: null
  });

  const [isDevPanelOpen, setIsDevPanelOpen] = useState(false);
  const [route, setRoute] = useState(() => window.location.hash || '#home');

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(window.location.hash || '#home');
      // Scroll main content to top on view change
      const mainContent = document.querySelector('.main-content');
      if (mainContent) mainContent.scrollTop = 0;
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
        year: movie.year
      });
    }
    setWatchlist(updatedList);
    localStorage.setItem('studyflix_watchlist', JSON.stringify(updatedList));
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
      updatedAt: new Date().toISOString()
    };

    setHistory(prev => {
      const filtered = prev.filter(item => item.movieSlug !== movie.slug);
      const updated = [historyItem, ...filtered].slice(0, 30);
      localStorage.setItem('studyflix_history', JSON.stringify(updated));
      return updated;
    });
  };

  const deleteHistoryItem = (movieSlug) => {
    setHistory(prev => {
      const updated = prev.filter(item => item.movieSlug !== movieSlug);
      localStorage.setItem('studyflix_history', JSON.stringify(updated));
      return updated;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('studyflix_history');
  };

  const handleApiSourceChange = (source) => {
    localStorage.setItem('studyflix_api_source', source);
    setApiSource(source);
    // Force reload route by triggering fake change
    const currentHash = window.location.hash;
    window.location.hash = '';
    window.location.hash = currentHash || '#home';
  };

  const logAPIRequest = (method, url) => {
    setDevLog(prev => ({ ...prev, method, url }));
  };

  const logAPIResponse = (data) => {
    setDevLog(prev => ({ ...prev, data }));
  };

  const renderView = () => {
    if (route.startsWith('#movie/')) {
      const slug = route.substring(7);
      return (
        <DetailView
          slug={slug}
          apiSource={apiSource}
          watchlist={watchlist}
          toggleWatchlist={toggleWatchlist}
          onLogRequest={logAPIRequest}
          onLogResponse={logAPIResponse}
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
          apiSource={apiSource}
          history={history}
          saveWatchHistory={saveWatchHistory}
          onLogRequest={logAPIRequest}
          onLogResponse={logAPIResponse}
        />
      );
    }
    if (route.startsWith('#search?q=')) {
      const keyword = decodeURIComponent(route.substring(10) || '');
      return (
        <FilterView
          key={`search-${keyword}`}
          searchQuery={keyword}
          apiSource={apiSource}
          onLogRequest={logAPIRequest}
          onLogResponse={logAPIResponse}
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
            apiSource={apiSource}
            watchlist={watchlist}
            toggleWatchlist={toggleWatchlist}
            onLogRequest={logAPIRequest}
            onLogResponse={logAPIResponse}
          />
        );
      case '#phim-le':
        return (
          <FilterView
            key="phim-le"
            initialType="phim-le"
            apiSource={apiSource}
            onLogRequest={logAPIRequest}
            onLogResponse={logAPIResponse}
          />
        );
      case '#phim-bo':
        return (
          <FilterView
            key="phim-bo"
            initialType="phim-bo"
            apiSource={apiSource}
            onLogRequest={logAPIRequest}
            onLogResponse={logAPIResponse}
          />
        );
      case '#hoat-hinh':
        return (
          <FilterView
            key="hoat-hinh"
            initialType="hoat-hinh"
            apiSource={apiSource}
            onLogRequest={logAPIRequest}
            onLogResponse={logAPIResponse}
          />
        );
      case '#phim-chieu-rap':
        return (
          <FilterView
            key="phim-chieu-rap"
            initialType="phim-chieu-rap"
            apiSource={apiSource}
            onLogRequest={logAPIRequest}
            onLogResponse={logAPIResponse}
          />
        );
      case '#tv-shows':
        return (
          <FilterView
            key="tv-shows"
            initialType="tv-shows"
            apiSource={apiSource}
            onLogRequest={logAPIRequest}
            onLogResponse={logAPIResponse}
          />
        );
      case '#danh-muc':
        return (
          <FilterView
            key="danh-muc"
            apiSource={apiSource}
            onLogRequest={logAPIRequest}
            onLogResponse={logAPIResponse}
          />
        );
      case '#favorites':
        return (
          <FavoritesView
            watchlist={watchlist}
            apiSource={apiSource}
          />
        );
      case '#history':
        return (
          <HistoryView
            history={history}
            clearHistory={clearHistory}
            deleteHistoryItem={deleteHistoryItem}
            apiSource={apiSource}
          />
        );
      default:
        return (
          <HomeView
            apiSource={apiSource}
            watchlist={watchlist}
            toggleWatchlist={toggleWatchlist}
            onLogRequest={logAPIRequest}
            onLogResponse={logAPIResponse}
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
        isDevPanelOpen={isDevPanelOpen}
        setIsDevPanelOpen={setIsDevPanelOpen}
      />

      {/* Main Content Area */}
      <main className="main-content">
        {/* Top Header */}
        <Header
          apiSource={apiSource}
          onApiSourceChange={handleApiSourceChange}
        />

        {/* View Content */}
        {renderView()}

        {/* Footer */}
        <footer className="main-footer">
          <p>&copy; 2026 StudyFlix Project. Được phát triển dành riêng cho mục đích học tập & nghiên cứu API truyền thông.</p>
          <p className="disclaimer">Tuyên bố miễn trừ trách nhiệm: Dữ liệu và liên kết truyền thông được cung cấp từ API bên thứ ba. Dự án phi thương mại.</p>
        </footer>
      </main>

      {/* Developer Panel */}
      <DevPanel
        devLog={devLog}
        isOpen={isDevPanelOpen}
        onClose={() => setIsDevPanelOpen(false)}
      />
    </div>
  );
}
