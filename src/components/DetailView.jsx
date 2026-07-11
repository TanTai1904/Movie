import React, { useState, useEffect } from 'react';
import { fetchUnifiedDetail, fixImageURL, fixBackdropURL, getHighQualityBanner, getHighQualityPoster } from '../utils.js';

export default function DetailView({ slug, watchlist, toggleWatchlist, globalDownloads = {}, startGlobalDownload, cancelGlobalDownload, onLogRequest, onLogResponse }) {
  const [movie, setMovie] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeServerIdx, setActiveServerIdx] = useState(0);

  const [backdropUrl, setBackdropUrl] = useState('/default-banner.png');
  const [posterUrl, setPosterUrl] = useState('/default-poster.png');

  // Dynamic high-quality image loader
  useEffect(() => {
    if (!movie) return;
    let isMounted = true;

    // Fast preview with corrected layouts (swapped bug fixed!)
    setBackdropUrl(fixBackdropURL(movie.thumb_url || movie.poster_url, movie.apiSource));
    setPosterUrl(fixImageURL(movie.poster_url || movie.thumb_url, movie.apiSource));

    // Fetch high quality versions in the background
    getHighQualityBanner(movie).then(url => {
      if (isMounted && url) setBackdropUrl(url);
    });

    getHighQualityPoster(movie).then(url => {
      if (isMounted && url) setPosterUrl(url);
    });

    return () => { isMounted = false; };
  }, [movie]);

  useEffect(() => {
    async function loadMovieDetail() {
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
          setEpisodes(data.episodes || []);
          setActiveServerIdx(0);
        } else {
          setError('Không tìm thấy thông tin phim.');
        }
      } catch (err) {
        console.error('Error fetching movie details:', err);
        setError('Lỗi tải dữ liệu phim từ các máy chủ API.');
      } finally {
        setLoading(false);
      }
    }
    loadMovieDetail();
  }, [slug]);

  if (loading) {
    return (
      <section id="view-detail" className="content-view active">
        <div className="detail-container">
          <div className="detail-backdrop animate-pulse">
            <div className="backdrop-gradient"></div>
            <button className="btn-back-home" onClick={() => window.location.hash = '#home'}>
              <i className="bx bx-left-arrow-alt"></i> Quay Lại
            </button>
          </div>
          <div className="detail-content-wrap">
            <div className="detail-poster-sec">
              <img id="detail-poster" src="/default-poster.png" alt="Loading" />
            </div>
            <div className="detail-info-sec">
              <h1 id="detail-title">Đang tải...</h1>
              <p className="detail-description">Đang tải nội dung chi tiết...</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (error || !movie) {
    return (
      <section id="view-detail" className="content-view active">
        <div className="detail-container">
          <div className="detail-backdrop">
            <div className="backdrop-gradient"></div>
            <button className="btn-back-home" onClick={() => window.location.hash = '#home'}>
              <i className="bx bx-left-arrow-alt"></i> Quay Lại
            </button>
          </div>
          <div className="detail-content-wrap">
            <div className="detail-info-sec">
              <h1 id="detail-title" className="text-danger">Đã xảy ra lỗi</h1>
              <p className="detail-description">{error || 'Không thể tải được thông tin phim.'}</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const isFav = watchlist.some(m => m.slug === movie.slug);

  const handlePlayNow = () => {
    if (episodes && episodes.length > 0 && episodes[0].server_data.length > 0) {
      const firstEp = episodes[0].server_data[0];
      window.location.hash = `#watch/${movie.slug}/${firstEp.slug}`;
    } else {
      alert('Hiện tại phim chưa cập nhật tập nào!');
    }
  };

  const handleEpisodeClick = (epSlug) => {
    window.location.hash = `#watch/${movie.slug}/${epSlug}`;
  };

  return (
    <section id="view-detail" className="content-view active">
      <div className="detail-container">
        <div
          id="detail-backdrop"
          className="detail-backdrop"
        >
          {movie && (
            <img
              src={backdropUrl}
              alt=""
              className="image-fade-in"
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          )}
          <div className="backdrop-gradient" style={{ zIndex: 1 }}></div>
          <button className="btn-back-home" style={{ zIndex: 2 }} onClick={() => window.location.hash = '#home'}>
            <i className="bx bx-left-arrow-alt"></i> Quay Lại
          </button>
        </div>
        <div className="detail-content-wrap">
          <div className="detail-poster-sec">
            <img
              id="detail-poster"
              className="image-fade-in"
              src={posterUrl}
              alt={movie.name}
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.target.src = '/default-poster.png';
              }}
            />
            <button className="btn btn-primary btn-play-now w-100 mt-3" onClick={handlePlayNow}>
              <i className="bx bx-play"></i> Xem Phim
            </button>
            <button
              id="btn-fav-detail"
              className={`btn btn-secondary w-100 mt-2 ${isFav ? 'active' : ''}`}
              onClick={() => toggleWatchlist(movie)}
            >
              <i className={`bx ${isFav ? 'bxs-heart text-danger' : 'bx-heart'}`}></i>{' '}
              {isFav ? 'Đã Yêu Thích' : 'Thêm Yêu Thích'}
            </button>
            <button
              className="btn btn-success w-100 mt-2"
              style={{ 
                backgroundColor: '#27ae60', 
                borderColor: '#27ae60', 
                color: '#fff', 
                fontSize: '14px', 
                fontWeight: 'bold', 
                padding: '10px 16px', 
                height: 'auto',
                boxShadow: '0 4px 12px rgba(39, 174, 96, 0.3)' 
              }}
              onClick={() => {
                document.getElementById('download-section-anchor')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <i className="bx bx-cloud-download" style={{ fontSize: '16px', marginRight: '4px' }}></i> TẢI PHIM VỀ MÁY
            </button>
          </div>
          <div className="detail-info-sec">
            <h1 id="detail-title">{movie.name}</h1>
            <h3 id="detail-origin-title">{movie.origin_name || ''}</h3>
            <div className="detail-meta">
              <span id="detail-year" className="meta-tag">
                <i className="bx bx-calendar"></i> {movie.year || '--'}
              </span>
              <span id="detail-quality" className="meta-tag">
                <i className="bx bx-badge"></i> {movie.quality || 'HD'}
              </span>
              <span id="detail-time" className="meta-tag">
                <i className="bx bx-time"></i> {movie.time || '--'}
              </span>
              <span id="detail-episode-total" className="meta-tag">
                <i className="bx bx-list-ol"></i> {movie.episode_total || 'N/A'}
              </span>
            </div>
            <div className="detail-genres" id="detail-genres">
              {movie.category?.map((c, i) => (
                <span key={c.slug || i} className="genre-tag">
                  {c.name}
                </span>
              ))}
            </div>

            <div className="detail-group">
              <h4>Nội Dung Phim</h4>
              <p
                id="detail-content"
                className="detail-description"
                dangerouslySetInnerHTML={{ __html: movie.content || 'Không có mô tả cho phim này.' }}
              ></p>
            </div>

            <div className="detail-grid-meta">
              <div className="meta-item">
                <span className="meta-label">Đạo diễn:</span>
                <span id="detail-director" className="meta-value">
                  {movie.director && movie.director.length > 0 ? movie.director.join(', ') : 'Chưa cập nhật'}
                </span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Quốc gia:</span>
                <span id="detail-country" className="meta-value">
                  {movie.country && movie.country.length > 0 ? movie.country.map(c => c.name).join(', ') : 'Chưa cập nhật'}
                </span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Diễn viên:</span>
                <span id="detail-actors" className="meta-value">
                  {movie.actor && movie.actor.length > 0 ? movie.actor.join(', ') : 'Chưa cập nhật'}
                </span>
              </div>
            </div>

            {/* Episode List Area in Detail */}
            {episodes.length > 0 && episodes[0].server_data.length > 0 && (
              <div className="detail-episodes-section mt-4">
                <h4>Danh Sách Tập Phim</h4>
                <div id="detail-server-tabs" className="server-tabs animate-fade-in">
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
                <div id="detail-episodes-grid" className="episodes-grid">
                  {episodes[activeServerIdx]?.server_data.map(ep => (
                    <button
                      key={ep.slug}
                      className="btn-episode"
                      title={ep.filename}
                      onClick={() => handleEpisodeClick(ep.slug)}
                    >
                      {ep.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Download Section (MP4 Background Downloader) */}
            {episodes.length > 0 && episodes[0].server_data.length > 0 && (
              <div id="download-section-anchor" className="detail-episodes-section mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <h4 style={{ color: 'var(--accent-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="bx bx-cloud-download"></i> Tải Phim Về Máy (.MP4)
                </h4>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: '1.4' }}>
                  Tải phim tốc độ cao trực tiếp về thiết bị dưới dạng tệp MP4. Bạn có thể nhấn tải rồi thoải mái chuyển sang xem phim khác hoặc tìm kiếm, tiến trình tải sẽ chạy ngầm và không bị ảnh hưởng.
                </p>
                <div className="server-tabs">
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px' }}>
                  {episodes[activeServerIdx]?.server_data.map(ep => {
                    const downloadId = ep.link_m3u8;
                    const currentDownload = globalDownloads[downloadId];
                    const isDownloading = currentDownload && ['parsing', 'downloading', 'merging', 'saving'].includes(currentDownload.status);

                    return (
                      <div key={ep.slug} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600' }}>Tập {ep.name}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {isDownloading ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '80px', height: '4px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{ width: `${currentDownload.percent}%`, height: '100%', backgroundColor: 'var(--accent-color)' }}></div>
                              </div>
                              <span style={{ fontSize: '11px', color: 'var(--accent-color)', fontWeight: 'bold' }}>{currentDownload.percent}%</span>
                              <button 
                                className="btn" 
                                style={{ padding: '2px 8px', fontSize: '11px', height: '24px', backgroundColor: 'var(--bg-active)', border: '1px solid var(--border-color)', color: '#fff' }}
                                onClick={() => cancelGlobalDownload(downloadId)}
                              >
                                Hủy
                              </button>
                            </div>
                          ) : currentDownload?.status === 'completed' ? (
                            <span style={{ fontSize: '11px', color: 'var(--color-success)', fontWeight: 'bold' }}>
                              <i className="bx bx-check-circle"></i> Đã tải xong
                            </span>
                          ) : (
                            <button 
                              className="btn btn-success" 
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
                                ep.link_m3u8,
                                movie.name,
                                ep.name,
                                `${movie.name}-Tap-${ep.name}.mp4`
                              )}
                              disabled={!ep.link_m3u8}
                            >
                              <i className="bx bx-cloud-download" style={{ marginRight: '6px', fontSize: '16px' }}></i> Tải MP4
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
