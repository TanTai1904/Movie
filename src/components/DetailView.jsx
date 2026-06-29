import React, { useState, useEffect } from 'react';
import { fetchAPI, fixImageURL } from '../utils.js';

export default function DetailView({ slug, apiSource, watchlist, toggleWatchlist, onLogRequest, onLogResponse }) {
  const [movie, setMovie] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeServerIdx, setActiveServerIdx] = useState(0);

  useEffect(() => {
    async function loadMovieDetail() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchAPI(
          `/phim/${slug}`,
          apiSource,
          false,
          onLogRequest,
          onLogResponse
        );
        if (data && data.movie) {
          setMovie(data.movie);
          setEpisodes(data.episodes || []);
          setActiveServerIdx(0);
        } else {
          setError('Không tìm thấy thông tin phim.');
        }
      } catch (err) {
        console.error('Error fetching movie details:', err);
        setError('Lỗi tải dữ liệu phim từ API.');
      } finally {
        setLoading(false);
      }
    }
    loadMovieDetail();
  }, [slug, apiSource]);

  if (loading) {
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
            <div className="detail-poster-sec">
              <img id="detail-poster" src="https://placehold.co/300x450/1a1e24/66fcf1?text=Loading" alt="Loading" />
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
          style={{
            backgroundImage: `url('${fixImageURL(movie.poster_url || movie.thumb_url, apiSource)}')`
          }}
        >
          <div className="backdrop-gradient"></div>
          <button className="btn-back-home" onClick={() => window.location.hash = '#home'}>
            <i className="bx bx-left-arrow-alt"></i> Quay Lại
          </button>
        </div>
        <div className="detail-content-wrap">
          <div className="detail-poster-sec">
            <img
              id="detail-poster"
              src={fixImageURL(movie.thumb_url || movie.poster_url, apiSource)}
              alt={movie.name}
              onError={(e) => {
                e.target.src = 'https://placehold.co/300x450/1a1e24/66fcf1?text=No+Image';
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
              {movie.category?.map(c => (
                <span key={c.slug} className="genre-tag">
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
                <div id="detail-server-tabs" className="server-tabs">
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
          </div>
        </div>
      </div>
    </section>
  );
}
