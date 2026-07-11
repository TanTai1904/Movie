import React, { useState, useEffect, useRef } from 'react';
import Hls from 'hls.js';
import { fetchUnifiedDetail, fetchUnifiedNewMovies, fixImageURL } from '../utils.js';

export default function WatchView({ slug, episodeSlug, history, saveWatchHistory, globalDownloads = {}, startGlobalDownload, cancelGlobalDownload, onLogRequest, onLogResponse }) {
  const [movie, setMovie] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [episode, setEpisode] = useState(null);
  const [activeServerIdx, setActiveServerIdx] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [videoLoading, setVideoLoading] = useState(true);

  const [playMode, setPlayMode] = useState('hls'); // 'hls' or 'embed'
  const [relatedMovies, setRelatedMovies] = useState([]);
  const [playerNotification, setPlayerNotification] = useState('');

  const videoRef = useRef(null);
  const hlsRef = useRef(null);

  // 1. Fetch movie details and episode list
  useEffect(() => {
    async function loadMovieAndEpisode() {
      setLoading(true);
      setError(null);
      try {
        if (onLogRequest) {
          onLogRequest('GET', 'Unified Multi-Source: Detail (' + slug + ')');
        }
        const data = await fetchUnifiedDetail(slug);
        if (onLogResponse) {
          onLogResponse(data);
        }
        if (data && data.movie) {
          setMovie(data.movie);
          const eps = data.episodes || [];
          setEpisodes(eps);
          
          // Find selected episode
          let foundEp = null;
          let serverIdx = 0;
          
          for (let s = 0; s < eps.length; s++) {
            const epMatch = eps[s].server_data.find(e => e.slug === episodeSlug);
            if (epMatch) {
              foundEp = epMatch;
              serverIdx = s;
              break;
            }
          }
          
          // Fallback to first episode if not found
          if (!foundEp && eps.length > 0 && eps[0].server_data.length > 0) {
            foundEp = eps[0].server_data[0];
          }
          
          if (foundEp) {
            setEpisode(foundEp);
            setActiveServerIdx(serverIdx);
            
            // Auto configure playMode: if link_m3u8 is empty but link_embed is present, default to 'embed'
            if (!foundEp.link_m3u8 && foundEp.link_embed) {
              setPlayMode('embed');
            } else {
              setPlayMode('hls');
            }
          } else {
            setError('Không tìm thấy tập phim tương ứng.');
          }
        } else {
          setError('Không tìm thấy thông tin phim.');
        }
      } catch (err) {
        console.error('Error fetching watch movie detail:', err);
        setError('Lỗi tải dữ liệu tập phim từ các máy chủ API.');
      } finally {
        setLoading(false);
      }
    }
    loadMovieAndEpisode();
  }, [slug, episodeSlug]);

  // 2. Fetch related movies (Newly updated page 2 as simple recommendations)
  useEffect(() => {
    async function loadRelated() {
      try {
        const data = await fetchUnifiedNewMovies(2);
        setRelatedMovies(data.items?.slice(0, 6) || []);
      } catch (e) {
        console.error('Error loading related movies:', e);
      }
    }
    loadRelated();
  }, []);

  // 3. Initialize HLS video stream
  useEffect(() => {
    if (loading || error || playMode !== 'hls' || !episode || !episode.link_m3u8) {
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    setVideoLoading(true);

    // Retrieve start playback time from watchlist history
    const savedHistory = history.find(
      item => item.movieSlug === slug && item.episodeSlug === episode.slug
    );
    const startOffset = savedHistory ? savedHistory.currentTime : 0;

    let hlsInstance;
    let networkErrorCount = 0;
    let fallbackTimeout = null;

    const handleLoadedData = () => {
      setVideoLoading(false);
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
    };

    video.addEventListener('loadeddata', handleLoadedData);

    if (Hls.isSupported()) {
      hlsInstance = new Hls({
        enableWorker: true,
        maxBufferLength: 30,
        lowLatencyMode: true
      });
      hlsRef.current = hlsInstance;
      hlsInstance.loadSource(episode.link_m3u8);
      hlsInstance.attachMedia(video);

      hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
        if (startOffset > 5) {
          video.currentTime = startOffset;
        }
        video.play().catch(() => console.log('Autoplay blocked'));
      });

      // 7-second loading fallback to embed mode if embed link is available
      if (episode.link_embed) {
        fallbackTimeout = setTimeout(() => {
          if (videoLoading && playMode === 'hls' && hlsInstance) {
            console.warn('HLS stream loading timed out, falling back to embed mode...');
            hlsInstance.destroy();
            setPlayMode('embed');
            setPlayerNotification('Tự động chuyển sang Server Nhúng do luồng HLS tải quá lâu/lỗi!');
            setVideoLoading(false);
          }
        }, 7000);
      }

      hlsInstance.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              networkErrorCount++;
              console.log(`HLS Network error (${networkErrorCount}) - retrying...`);
              if (networkErrorCount > 3) {
                console.warn('Too many HLS network errors, switching to embed...');
                hlsInstance.destroy();
                if (episode.link_embed) {
                  setPlayMode('embed');
                  setPlayerNotification('Tự động chuyển sang Server Nhúng do lỗi kết nối luồng phát HLS!');
                } else {
                  setError('Luồng video HLS gặp lỗi mạng liên tục và không có server dự phòng.');
                }
                setVideoLoading(false);
              } else {
                hlsInstance.startLoad();
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('HLS Media error - recovering...');
              hlsInstance.recoverMediaError();
              break;
            default:
              console.error('Fatal HLS error, switching to embed...');
              hlsInstance.destroy();
              if (episode.link_embed) {
                setPlayMode('embed');
                setPlayerNotification('Tự động chuyển sang Server Nhúng do trình phát HLS gặp sự cố!');
              } else {
                setError('Không thể phát video bằng HLS và không có server dự phòng.');
              }
              setVideoLoading(false);
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native support (Safari, iOS Safari)
      video.src = episode.link_m3u8;
      const onLoadedMetadata = () => {
        if (startOffset > 5) {
          video.currentTime = startOffset;
        }
        video.play().catch(() => console.log('Autoplay blocked'));
        setVideoLoading(false);
      };
      video.addEventListener('loadedmetadata', onLoadedMetadata);
      return () => {
        video.removeEventListener('loadedmetadata', onLoadedMetadata);
        video.removeEventListener('loadeddata', handleLoadedData);
      };
    } else {
      setVideoLoading(false);
      if (episode.link_embed) {
        setPlayMode('embed');
        setPlayerNotification('Trình duyệt không hỗ trợ m3u8, tự động chuyển sang Server Nhúng!');
      } else {
        alert('Trình duyệt của bạn không hỗ trợ phát HLS (.m3u8). Vui lòng chuyển sang Server Nhúng!');
      }
    }

    return () => {
      if (hlsInstance) {
        hlsInstance.destroy();
        hlsRef.current = null;
      }
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.pause();
      video.removeAttribute('src');
      video.load();
    };
  }, [episode, playMode, loading, error, slug]);

  // Reset notification on episode changes
  useEffect(() => {
    setPlayerNotification('');
  }, [episode]);

  // 4. Listen to time update to save history progress
  useEffect(() => {
    const video = videoRef.current;
    if (!video || playMode !== 'hls' || loading || error || !movie || !episode) {
      return;
    }

    const handleTimeUpdate = () => {
      if (video.duration && video.currentTime > 0) {
        saveWatchHistory(movie, episode, video.currentTime, video.duration);
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [movie, episode, playMode, loading, error]);

  const handleEpisodeClick = (epSlug) => {
    window.location.hash = `#watch/${slug}/${epSlug}`;
  };

  const handleRecommendClick = (recSlug) => {
    window.location.hash = `#movie/${recSlug}`;
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

  if (error || !episode) {
    return (
      <section id="view-watch" className="content-view active">
        <div className="watch-container">
          <div className="watch-main">
            <div className="player-wrapper">
              <div className="player-container">
                <div className="player-overlay">
                  <i className="bx bx-error-circle text-danger" style={{ fontSize: '40px' }}></i>
                  <p className="mt-2">{error || 'Không tìm thấy thông tin tập phim.'}</p>
                  <button className="btn btn-secondary mt-3" onClick={() => window.location.hash = `#movie/${slug}`}>
                    Quay Lại Chi Tiết
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="view-watch" className="content-view active">
      <div className="watch-container">
        <div className="watch-main">
          {/* Player Wrapper */}
          <div className="player-wrapper">
            
            {/* Video Players */}
            <div className="player-container">
              {/* Iframe Embed Player */}
              {playMode === 'embed' && (
                <iframe
                  id="embed-player"
                  src={episode.link_embed}
                  frameBorder="0"
                  allowFullScreen
                  className="player-element"
                  title={episode.name}
                  onLoad={() => setVideoLoading(false)}
                ></iframe>
              )}

              {/* Custom HLS HTML5 Video Player */}
              {playMode === 'hls' && (
                <div id="hls-player-container" className="hls-player-container player-element">
                  <video
                    ref={videoRef}
                    id="hls-video"
                    controls
                    autoPlay
                    playsInline
                  ></video>
                </div>
              )}

              {/* Loading Overlay inside Player */}
              {videoLoading && (
                <div id="player-loading" className="player-overlay">
                  <div className="spinner"></div>
                  <p>Đang chuẩn bị luồng video...</p>
                </div>
              )}
            </div>

            {playerNotification && (
              <div className="player-notification animate-slide-down" style={{
                backgroundColor: 'rgba(230, 126, 34, 0.15)',
                border: '1px solid #e67e22',
                color: '#f39c12',
                padding: '10px 16px',
                borderRadius: '6px',
                fontSize: '12.5px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                margin: '12px 0 12px 0'
              }}>
                <i className="bx bx-info-circle" style={{ fontSize: '18px' }}></i>
                <span>{playerNotification}</span>
                <button 
                  onClick={() => setPlayerNotification('')} 
                  style={{ marginLeft: 'auto', color: 'inherit', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', border: 'none', background: 'none' }}
                >
                  &times;
                </button>
              </div>
            )}

            {/* Player Controls & Info Bar */}
            <div className="player-info-bar">
              <div className="player-current-info">
                <h2 id="watch-movie-title" onClick={() => window.location.hash = `#movie/${slug}`} style={{ cursor: 'pointer' }}>
                  {movie?.name}
                </h2>
                <p id="watch-episode-title">
                  Đang Xem: {episode.name} ({episodes[activeServerIdx]?.server_name})
                </p>
              </div>
              <div className="player-server-selector">
                <label htmlFor="server-mode-select"><i className="bx bx-server"></i> Server Phát:</label>
                <select
                  id="server-mode-select"
                  className="form-select-sm"
                  value={playMode}
                  onChange={(e) => {
                    setPlayMode(e.target.value);
                    setVideoLoading(true);
                  }}
                >
                  <option value="hls" disabled={!episode.link_m3u8}>Server HLS (Khuyên Dùng, Hls.js)</option>
                  <option value="embed" disabled={!episode.link_embed}>Server Nhúng (Dự Phòng, Iframe)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Episodes Section below player */}
          <div className="watch-episodes-card">
            <div className="card-header">
              <h3>Chọn Tập Phim</h3>
              <div id="watch-server-tabs" className="server-tabs">
                {episodes.map((server, idx) => (
                  <button
                    key={idx}
                    className={`server-tab-btn ${idx === activeServerIdx ? 'active' : ''}`}
                    onClick={() => setActiveServerIdx(idx)}
                  >
                    {server.server_name}
                  </button>
                ))}
              </div>
            </div>
            <div id="watch-episodes-grid" className="episodes-grid">
              {episodes[activeServerIdx]?.server_data.map(ep => (
                <button
                  key={ep.slug}
                  className={`btn-episode ${ep.slug === episode.slug ? 'active' : ''}`}
                  title={ep.filename}
                  onClick={() => handleEpisodeClick(ep.slug)}
                >
                  {ep.name}
                </button>
              ))}
            </div>
          </div>

          {/* Download Current Episode Section */}
          {episode && episode.link_m3u8 && (
            <div className="watch-episodes-card" style={{ marginTop: '20px' }}>
              <div className="card-header">
                <h3 style={{ color: 'var(--accent-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="bx bx-cloud-download"></i> Tải Tập Này (.MP4)
                </h3>
              </div>
              <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <span style={{ fontSize: '13px', fontWeight: 'bold' }}>Tập đang phát: {movie?.name} - Tập {episode.name}</span>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.4' }}>Tiến trình tải sẽ chạy ngầm toàn cục. Bạn có thể nhấn tải rồi thoải mái tắt trang xem phim để lướt xem phim khác!</p>
                </div>
                <div>
                  {(() => {
                    const downloadId = episode.link_m3u8;
                    const currentDownload = globalDownloads[downloadId];
                    const isDownloading = currentDownload && ['parsing', 'downloading', 'merging', 'saving'].includes(currentDownload.status);

                    if (isDownloading) {
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--accent-color)', fontWeight: 'bold' }}>{currentDownload.percent}%</span>
                          <button 
                            className="btn" 
                            style={{ padding: '2px 8px', fontSize: '11px', height: '24px', backgroundColor: 'var(--bg-active)', border: '1px solid var(--border-color)', color: '#fff' }}
                            onClick={() => cancelGlobalDownload(downloadId)}
                          >
                            Hủy
                          </button>
                        </div>
                      );
                    } else if (currentDownload?.status === 'completed') {
                      return (
                        <span style={{ fontSize: '11px', color: 'var(--color-success)', fontWeight: 'bold' }}>
                          <i className="bx bx-check-circle"></i> Đã tải xong
                        </span>
                      );
                    } else {
                      return (
                        <button 
                          className="btn btn-primary" 
                          style={{ 
                            padding: '10px 28px', 
                            fontSize: '14px', 
                            height: 'auto', 
                            backgroundColor: '#27ae60', 
                            borderColor: '#27ae60', 
                            color: '#fff', 
                            fontWeight: '800', 
                            boxShadow: '0 4px 12px rgba(39, 174, 96, 0.4)',
                            letterSpacing: '0.5px'
                          }}
                          onClick={() => startGlobalDownload(
                            episode.link_m3u8,
                            movie.name,
                            episode.name,
                            `${movie.name}-Tap-${episode.name}.mp4`
                          )}
                        >
                          <i className="bx bx-cloud-download" style={{ marginRight: '6px', fontSize: '16px' }}></i> TẢI XUỐNG TẬP NÀY (.MP4)
                        </button>
                      );
                    }
                  })()}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Watch Sidebar (Related/Popular Movies) */}
        <div className="watch-sidebar">
          <div className="watchlist-sidebar-card">
            <h3>Phim Tương Tự</h3>
            <div id="watch-related-list" className="sidebar-movie-list">
              {relatedMovies.length === 0 ? (
                <div className="text-center text-muted">Không thể tải đề xuất.</div>
              ) : (
                relatedMovies.map(rec => (
                  <div
                    key={rec.slug}
                    className="sidebar-movie-item"
                    onClick={() => handleRecommendClick(rec.slug)}
                  >
                    <img
                      className="sidebar-movie-thumb"
                      src={fixImageURL(rec.poster_url || rec.thumb_url, rec.apiSource)}
                      alt={rec.name}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.target.src = '/default-poster.png';
                      }}
                    />
                    <div className="sidebar-movie-info">
                      <h4 className="sidebar-movie-title">{rec.name}</h4>
                      <p className="sidebar-movie-origin">{rec.origin_name || ''}</p>
                      <span className="sidebar-movie-meta">{rec.year} • Vietsub</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
