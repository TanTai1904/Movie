import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
import HomeView from './components/HomeView.jsx';
import DetailView from './components/DetailView.jsx';
import WatchView from './components/WatchView.jsx';
import FilterView from './components/FilterView.jsx';
import FavoritesView from './components/FavoritesView.jsx';
import HistoryView from './components/HistoryView.jsx';
import DownloadsView from './components/DownloadsView.jsx';
import { downloadHlsAsMp4 } from './downloader.js';

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

  // Background downloader state
  const [globalDownloads, setGlobalDownloads] = useState({});
  const [downloadsHistory, setDownloadsHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('sofaflix_downloads_history')) || [];
    } catch {
      return [];
    }
  });
  const abortControllersRef = useRef({});

  // Sync download history to localStorage
  useEffect(() => {
    localStorage.setItem('sofaflix_downloads_history', JSON.stringify(downloadsHistory));
  }, [downloadsHistory]);

  // Cancel abort controllers on unmount
  useEffect(() => {
    return () => {
      Object.values(abortControllersRef.current).forEach(c => c.abort());
    };
  }, []);

  const clearDownloadsHistory = () => {
    setDownloadsHistory([]);
  };

  const deleteDownloadHistoryItem = (id) => {
    setDownloadsHistory(prev => prev.filter(item => item.id !== id));
  };

  const startGlobalDownload = (m3u8Url, movieName, episodeName, fileName) => {
    if (!m3u8Url) return;

    const existing = globalDownloads[m3u8Url];
    if (existing && ['parsing', 'downloading', 'merging', 'saving'].includes(existing.status)) {
      alert('Tập phim này đang được tải xuống!');
      return;
    }

    const controller = new AbortController();
    abortControllersRef.current[m3u8Url] = controller;

    setGlobalDownloads(prev => ({
      ...prev,
      [m3u8Url]: {
        id: m3u8Url,
        movieName,
        episodeName,
        fileName,
        percent: 0,
        downloadedSegments: 0,
        totalSegments: 0,
        downloadedMb: 0,
        status: 'parsing',
        statusMessage: 'Đang chuẩn bị kết nối...'
      }
    }));

    downloadHlsAsMp4(
      m3u8Url,
      fileName,
      // onProgress callback
      (percent, current, total, mb) => {
        setGlobalDownloads(prev => {
          if (!prev[m3u8Url]) return prev;
          return {
            ...prev,
            [m3u8Url]: {
              ...prev[m3u8Url],
              percent,
              downloadedSegments: current,
              totalSegments: total,
              downloadedMb: mb
            }
          };
        });
      },
      // onStatusChange callback
      (status, message) => {
        setGlobalDownloads(prev => {
          if (!prev[m3u8Url]) return prev;
          const updated = {
            ...prev[m3u8Url],
            status,
            statusMessage: message
          };

          // Save to downloadsHistory when download reaches terminal state
          if (status === 'completed' || status === 'error' || status === 'cancelled') {
            setDownloadsHistory(historyPrev => {
              const filtered = historyPrev.filter(h => h.id !== m3u8Url);
              return [
                {
                  id: m3u8Url,
                  movieName: updated.movieName,
                  episodeName: updated.episodeName,
                  fileName: updated.fileName,
                  percent: updated.percent,
                  downloadedMb: updated.downloadedMb,
                  status,
                  statusMessage: message,
                  timestamp: new Date().toLocaleString('vi-VN')
                },
                ...filtered
              ];
            });
          }

          return {
            ...prev,
            [m3u8Url]: updated
          };
        });

        if (status === 'completed' || status === 'error' || status === 'cancelled') {
          delete abortControllersRef.current[m3u8Url];
        }
      },
      controller.signal
    );
  };

  const cancelGlobalDownload = (m3u8Url) => {
    const controller = abortControllersRef.current[m3u8Url];
    if (controller) {
      controller.abort();
      delete abortControllersRef.current[m3u8Url];
    }
  };

  // Background watchlist sync
  useEffect(() => {
    if (watchlist.length === 0) return;

    let isMounted = true;
    
    async function syncWatchlist() {
      let updatedList = [...watchlist];
      let hasChanges = false;

      // Import fetchUnifiedDetail dynamically to avoid blocking main bundle load
      const { fetchUnifiedDetail } = await import('./utils.js');

      // Check each item with a delay (throttle) of 800ms to avoid overwhelming APIs
      for (let i = 0; i < watchlist.length; i++) {
        if (!isMounted) break;
        const item = watchlist[i];

        try {
          const detail = await fetchUnifiedDetail(item.slug);
          if (detail && detail.movie) {
            const latestEpisode = detail.movie.episode_current || '';
            const latestModified = typeof detail.movie.modified === 'object' 
              ? (detail.movie.modified?.time || '') 
              : (detail.movie.modified || '');

            const savedEpisode = item.episode_current || '';
            const savedModified = typeof item.modified === 'object' 
              ? (item.modified?.time || '') 
              : (item.modified || '');

            const isEpisodeChanged = latestEpisode && latestEpisode !== savedEpisode;
            const isModifiedChanged = latestModified && latestModified !== savedModified;

            if (isEpisodeChanged || isModifiedChanged) {
              // Only trigger a new update badge if we already had a saved episode (i.e. not first time adding)
              const triggerBadge = savedEpisode !== '';

              updatedList[i] = {
                ...item,
                episode_current: latestEpisode,
                modified: latestModified,
                isNewUpdate: item.isNewUpdate || triggerBadge,
                poster_url: detail.movie.poster_url || item.poster_url,
                thumb_url: detail.movie.thumb_url || item.thumb_url
              };
              hasChanges = true;
            }
          }
        } catch (err) {
          console.warn(`Watchlist background sync failed for slug ${item.slug}:`, err);
        }

        // Delay between calls to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      if (isMounted && hasChanges) {
        setWatchlist(updatedList);
        localStorage.setItem('sofaflix_watchlist', JSON.stringify(updatedList));
      }
    }

    // Delay start of sync for 5 seconds after load so page loads smoothly first
    const timer = setTimeout(() => {
      syncWatchlist();
    }, 5000);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash || '#home';
      setRoute(hash);
      const mainContent = document.querySelector('.main-content');
      if (mainContent) mainContent.scrollTop = 0;
      setIsSidebarOpen(false);

      // Clear watchlist update flag when viewing the movie details or watch view
      if (hash.startsWith('#movie/') || hash.startsWith('#watch/')) {
        const slug = hash.split('/')[1];
        if (slug) {
          setWatchlist(prev => {
            const idx = prev.findIndex(m => m.slug === slug);
            if (idx > -1 && prev[idx].isNewUpdate) {
              const updated = [...prev];
              updated[idx] = { ...updated[idx], isNewUpdate: false };
              localStorage.setItem('sofaflix_watchlist', JSON.stringify(updated));
              return updated;
            }
            return prev;
          });
        }
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    // Run once on mount to handle initial load
    handleHashChange();
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
        episode_current: movie.episode_current || '',
        modified: movie.modified || '',
        apiSource: movie.apiSource,
        isNewUpdate: false
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
          globalDownloads={globalDownloads}
          startGlobalDownload={startGlobalDownload}
          cancelGlobalDownload={cancelGlobalDownload}
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
          globalDownloads={globalDownloads}
          startGlobalDownload={startGlobalDownload}
          cancelGlobalDownload={cancelGlobalDownload}
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

    let activeRoute = route;
    if (!['#home', '#phim-le', '#phim-bo', '#hoat-hinh', '#phim-chieu-rap', '#tv-shows', '#danh-muc', '#favorites', '#history', '#lich-su-tai'].includes(route)) {
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
      case '#lich-su-tai':
        return (
          <DownloadsView
            globalDownloads={globalDownloads}
            downloadsHistory={downloadsHistory}
            cancelGlobalDownload={cancelGlobalDownload}
            startGlobalDownload={startGlobalDownload}
            clearDownloadsHistory={clearDownloadsHistory}
            deleteDownloadHistoryItem={deleteDownloadHistoryItem}
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

  let activeNav = 'home';
  if (route.startsWith('#movie/') || route.startsWith('#watch/')) {
    activeNav = '';
  } else if (route.startsWith('#search?q=')) {
    activeNav = 'danh-muc';
  } else {
    activeNav = route.substring(1) || 'home';
  }

  return (
    <div className="app-layout">
      <Sidebar
        activeNav={activeNav}
        watchlistCount={watchlist.length}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        activeDownloadsCount={Object.values(globalDownloads).filter(d => ['parsing', 'downloading', 'merging', 'saving'].includes(d.status)).length}
      />

      {isSidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      <main className="main-content">
        <Header
          onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
        />

        {renderView()}

        <footer className="main-footer">
          <p>&copy; 2026 Studyflix Hub. Được thiết kế tối ưu và đồng bộ đa nguồn dữ liệu giải trí học tập.</p>
          <p className="disclaimer">Tuyên bố miễn trừ trách nhiệm: Nội dung truyền thông được lấy từ các API bên thứ ba phục vụ cho nhu cầu học tập và nghiên cứu phi thương mại.</p>
        </footer>
      </main>
    </div>
  );
}
