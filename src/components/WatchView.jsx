import React, { useState, useEffect, useRef } from 'react';
import Hls from 'hls.js';

export default function WatchView({
  movieSlug,
  episodeSlug,
  apiSource,
  fetchAPI,
  history,
  onSaveHistory
}) {
  const [movie, setMovie] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedServerIndex, setSelectedServerIndex] = useState(0);
  const [currentEpisode, setCurrentEpisode] = useState(null);
  const [serverMode, setServerMode] = useState('hls'); // 'hls' or 'embed'
  const [relatedMovies, setRelatedMovies] = useState([]);
  const [loadingRelated, setLoadingRelated] = useState(true);
  const [playerLoading, setPlayerLoading] = useState(true);

  const videoRef = useRef(null);
  const hlsInstanceRef = useRef(null);

  // Load movie data
  useEffect(() => {
    let active = true;
    setLoading(true);

    fetchAPI(`/phim/${movieSlug}`)
      .then(data => {
        if (!active) return;
        setMovie(data.movie);
        const fetchedEpisodes = data.episodes || [];
        setEpisodes(fetchedEpisodes);

        // Find episode matching slug
        let foundEp = null;
        let foundServerIdx = 0;
        for (let s = 0; s < fetchedEpisodes.length; s++) {
          const ep = fetchedEpisodes[s].server_data.find(e => e.slug === episodeSlug);
          if (ep) {
            foundEp = ep;
            foundServerIdx = s;
            break;
          }
        }

        // Fallback to first episode of first server
        if (!foundEp && fetchedEpisodes.length > 0 && fetchedEpisodes[0].server_data.length > 0) {
          foundEp = fetchedEpisodes[0].server_data[0];
          foundServerIdx = 0;
        }

        setCurrentEpisode(foundEp);
        setSelectedServerIndex(foundServerIdx);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [movieSlug, apiSource]);

  // Sync current episode when episodeSlug changes in URL
  useEffect(() => {
    if (episodes.length === 0) return;

    let foundEp = null;
    let foundServerIdx = 0;
    for (let s = 0; s < episodes.length; s++) {
      const ep = episodes[s].server_data.find(e => e.slug === episodeSlug);
      if (ep) {
        foundEp = ep;
        foundServerIdx = s;
        break;
      }
    }

    if (foundEp) {
      setCurrentEpisode(foundEp);
      setSelectedServerIndex(foundServerIdx);
    }
  }, [episodeSlug, episodes]);

  // Load related movies recommendation list
  useEffect(() => {
    let active = true;
    setLoadingRelated(true);
    fetchAPI('/danh-sach/phim-moi-cap-nhat?page=2')
      .then(data => {
        if (active) {
          setRelatedMovies(data.items?.slice(0, 6) || []);
          setLoadingRelated(false);
        }
      })
      .catch(e => {
        console.error(e);
        if (active) setLoadingRelated(false);
      });

    return () => {
      active = false;
    };
  }, [apiSource]);

  // Initialize and teardown video player
  useEffect(() => {
    if (serverMode !== 'hls' || !currentEpisode || !videoRef.current || !movie) {
      return;
    }

    setPlayerLoading(true);
    const video = videoRef.current;
    const m3u8Url = currentEpisode.link_m3u8;

    if (!m3u8Url) {
      alert("Không tìm thấy đường dẫn luồng HLS (M3U8). Vui lòng đổi sang Server Nhúng.");
      setPlayerLoading(false);
      return;
    }

    // Get watched history offset to resume
    const matchHistory = history.find(item => item.movieSlug === movie.slug);
    const startOffset = (matchHistory && matchHistory.episodeSlug === currentEpisode.slug) ? matchHistory.currentTime : 0;

    let hls = null;

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        maxBufferLength: 30,
        lowLatencyMode: true
      });
      hlsInstanceRef.current = hls;

      hls.loadSource(m3u8Url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setPlayerLoading(false);
        if (startOffset > 5) {
          video.currentTime = startOffset;
        }
        video.play().catch(() => console.log("Auto-play blocked, user interaction needed."));
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              console.error("Fatal error, cannot recover.");
              if (hlsInstanceRef.current) {
                hlsInstanceRef.current.destroy();
                hlsInstanceRef.current = null;
              }
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Safari support
      video.src = m3u8Url;
      video.addEventListener('loadedmetadata', () => {
        setPlayerLoading(false);
        if (startOffset > 5) {
          video.currentTime = startOffset;
        }
        video.play().catch(() => {});
      });
    } else {
      alert("Trình duyệt không hỗ trợ phát HLS, vui lòng chọn Server Nhúng.");
      setPlayerLoading(false);
    }

    // Progress updates tracking
    const handleTimeUpdate = () => {
      if (video.duration) {
        onSaveHistory({
          movie,
          episode: currentEpisode,
          currentTime: video.currentTime,
          duration: video.duration
        });
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      if (hls) {
        hls.destroy();
        hlsInstanceRef.current = null;
      }
      video.pause();
      video.removeAttribute('src');
      video.load();
    };
  }, [currentEpisode, serverMode, movie]);

  const fixImageURL = (url) => {
    if (!url) return 'https://placehold.co/300x450/1a1e24/66fcf1?text=No+Image';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    if (apiSource === 'ophim') {
      return `https://img.ophim.live/uploads/movies/${url}`;
    }
    return `https://phimimg.com/upload/vod/${url}`;
  };

  if (loading) {
    return (
      <section id="view-watch" className="content-view active">
        <div className="watch-container">
          <div className="watch-main">
            <div className="player-wrapper">
              <div className="player-container">
                <div className="player-overlay">
                  <div className="spinner"></div>
                  <p>Đang tải tập phim...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!movie || !currentEpisode) {
    return (
      <section id="view-watch" className="content-view active">
        <div className="watch-container">
          <div className="watch-main">
            <div className="player-wrapper">
              <div className="player-container">
                <div className="player-overlay">
                  <i className="bx bx-error-circle text-danger" style={{ fontSize: '40px' }}></i>
                  <p className="mt-2">Lỗi tải tập phim hoặc lỗi đường dẫn phát.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const currentServerName = episodes[selectedServerIndex]?.server_name || '';
  const currentServerEpisodes = episodes[selectedServerIndex]?.server_data || [];

  return (
    <section id="view-watch" className="content-view active">
      <div className="watch-container">
        <div className="watch-main">
          {/* Player Wrapper */}
          <div className="player-wrapper">
            <div className="player-container">
              {/* Iframe Embed Player */}
              {serverMode === 'embed' && (
                <iframe
                  id="embed-player"
                  src={currentEpisode.link_embed}
                  frameBorder="0"
                  allowFullScreen
                  className="player-element"
                  title="Video Embed Player"
                ></iframe>
              )}

              {/* Custom HLS Player */}
              {serverMode === 'hls' && (
                <div id="hls-player-container" className="hls-player-container player-element">
                  <video ref={videoRef} controls autoPlay playsInline id="hls-video"></video>
                </div>
              )}

              {/* Loading overlay inside player (HLS only) */}
              {serverMode === 'hls' && playerLoading && (
                <div id="player-loading" className="player-overlay">
                  <div className="spinner"></div>
                  <p>Đang chuẩn bị luồng video...</p>
                </div>
              )}
            </div>

            {/* Info bar */}
            <div className="player-info-bar">
              <div className="player-current-info">
                <h2 id="watch-movie-title">{movie.name}</h2>
                <p id="watch-episode-title">
                  Đang Xem: {currentEpisode.name} ({currentServerName})
                </p>
              </div>
              <div className="player-server-selector">
                <label htmlFor="server-mode-select"><i className="bx bx-server"></i> Server Phát:</label>
                <select
                  id="server-mode-select"
                  value={serverMode}
                  onChange={(e) => setServerMode(e.target.value)}
                  className="form-select-sm"
                >
                  <option value="hls">Server HLS (Khuyên Dùng, Hls.js)</option>
                  <option value="embed">Server Nhúng (Dự Phòng, Iframe)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Episode selector card */}
          <div className="watch-episodes-card">
            <div className="card-header">
              <h3>Chọn Tập Phim</h3>
              <div className="server-tabs">
                {episodes.map((server, sIdx) => (
                  <button
                    key={sIdx}
                    onClick={() => setSelectedServerIndex(sIdx)}
                    className={`server-tab-btn ${selectedServerIndex === sIdx ? 'active' : ''}`}
                  >
                    {server.server_name}
                  </button>
                ))}
              </div>
            </div>
            <div className="episodes-grid">
              {currentServerEpisodes.map((ep, eIdx) => (
                <button
                  key={eIdx}
                  onClick={() => window.location.hash = `#watch/${movieSlug}/${ep.slug}`}
                  className={`btn-episode ${ep.slug === episodeSlug ? 'active' : ''}`}
                  title={ep.filename}
                >
                  {ep.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Watch Recommendations Sidebar */}
        <div className="watch-sidebar">
          <div className="watchlist-sidebar-card">
            <h3>Phim Tương Tự</h3>
            <div className="sidebar-movie-list">
              {loadingRelated ? (
                <div className="text-center text-muted">Đang tải đề xuất...</div>
              ) : relatedMovies.length > 0 ? (
                relatedMovies.map((m) => (
                  <div
                    key={m._id || m.slug}
                    onClick={() => window.location.hash = `#movie/${m.slug}`}
                    className="sidebar-movie-item"
                    style={{ cursor: 'pointer' }}
                  >
                    <img className="sidebar-movie-thumb" src={fixImageURL(m.poster_url || m.thumb_url)} alt={m.name} />
                    <div className="sidebar-movie-info">
                      <h4 className="sidebar-movie-title">{m.name}</h4>
                      <p className="sidebar-movie-origin">{m.origin_name || ''}</p>
                      <span className="sidebar-movie-meta">{m.year} • Vietsub</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-muted text-center">Không thể tải đề xuất.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
