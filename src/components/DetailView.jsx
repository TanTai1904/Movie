import React, { useState, useEffect } from 'react';

export default function DetailView({ slug, apiSource, fetchAPI, watchlist, onToggleWatchlist }) {
  const [movie, setMovie] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedServerIndex, setSelectedServerIndex] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setSelectedServerIndex(0);

    fetchAPI(`/phim/${slug}`)
      .then(data => {
        if (!active) return;
        setMovie(data.movie);
        setEpisodes(data.episodes || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [slug, apiSource]);

  const handleBack = () => {
    window.history.back();
  };

  const handlePlayNow = () => {
    if (episodes && episodes.length > 0 && episodes[0].server_data.length > 0) {
      const firstEp = episodes[0].server_data[0];
      window.location.hash = `#watch/${slug}/${firstEp.slug}`;
    } else {
      alert("Hiện tại phim chưa cập nhật tập nào!");
    }
  };

  const isFavorited = movie ? watchlist.some(m => m.slug === movie.slug) : false;

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
      <section id="view-detail" className="content-view active">
        <div className="detail-container">
          <div className="detail-backdrop" style={{ background: 'var(--bg-secondary)', height: '300px' }}>
            <div className="backdrop-gradient"></div>
            <button onClick={handleBack} className="btn-back-home"><i className="bx bx-left-arrow-alt"></i> Quay Lại</button>
          </div>
          <div className="detail-content-wrap">
            <div className="detail-info-sec">
              <h1 id="detail-title">Đang tải...</h1>
              <p className="detail-description">Đang tải thông tin chi tiết phim...</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!movie) {
    return (
      <section id="view-detail" className="content-view active">
        <div className="detail-container">
          <div className="detail-backdrop" style={{ background: 'var(--bg-secondary)', height: '300px' }}>
            <div className="backdrop-gradient"></div>
            <button onClick={handleBack} className="btn-back-home"><i className="bx bx-left-arrow-alt"></i> Quay Lại</button>
          </div>
          <div className="detail-content-wrap">
            <div className="detail-info-sec">
              <h1 id="detail-title">Lỗi tải phim</h1>
              <p className="detail-description">Không thể tải thông tin phim từ API. Vui lòng thử lại sau.</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const currentServerData = episodes[selectedServerIndex]?.server_data || [];

  return (
    <section id="view-detail" className="content-view active">
      <div className="detail-container">
        <div
          id="detail-backdrop"
          className="detail-backdrop"
          style={{ backgroundImage: `url('${fixImageURL(movie.poster_url || movie.thumb_url)}')` }}
        >
          <div className="backdrop-gradient"></div>
          <button onClick={handleBack} className="btn-back-home">
            <i className="bx bx-left-arrow-alt"></i> Quay Lại
          </button>
        </div>
        <div className="detail-content-wrap">
          <div className="detail-poster-sec">
            <img id="detail-poster" src={fixImageURL(movie.thumb_url || movie.poster_url)} alt={movie.name} />
            <button onClick={handlePlayNow} className="btn btn-primary btn-play-now w-100 mt-3">
              <i className="bx bx-play"></i> Xem Phim
            </button>
            <button
              onClick={() => onToggleWatchlist(movie)}
              className={`btn btn-secondary w-100 mt-2 ${isFavorited ? 'active' : ''}`}
            >
              <i className={`bx ${isFavorited ? 'bxs-heart text-danger' : 'bx-heart'}`}></i> {isFavorited ? 'Đã Yêu Thích' : 'Thêm Yêu Thích'}
            </button>
          </div>
          <div className="detail-info-sec">
            <h1 id="detail-title">{movie.name}</h1>
            <h3 id="detail-origin-title">{movie.origin_name || ''}</h3>
            <div className="detail-meta">
              <span id="detail-year" className="meta-tag"><i className="bx bx-calendar"></i> {movie.year || '--'}</span>
              <span id="detail-quality" className="meta-tag"><i className="bx bx-badge"></i> {movie.quality || 'HD'}</span>
              <span id="detail-time" className="meta-tag"><i className="bx bx-time"></i> {movie.time || '--'}</span>
              <span id="detail-episode-total" className="meta-tag"><i className="bx bx-list-ol"></i> {movie.episode_total || 'N/A'}</span>
            </div>
            <div className="detail-genres" id="detail-genres">
              {movie.category && movie.category.map((c, i) => (
                <span key={i} className="genre-tag">{c.name}</span>
              ))}
            </div>
            
            <div className="detail-group">
              <h4>Nội Dung Phim</h4>
              <p id="detail-content" className="detail-description" dangerouslySetInnerHTML={{ __html: movie.content || 'Không có mô tả nội dung cho phim này.' }}></p>
            </div>

            <div className="detail-grid-meta">
              <div className="meta-item">
                <span className="meta-label">Đạo diễn:</span>
                <span className="meta-value">{movie.director ? movie.director.join(', ') : 'Chưa cập nhật'}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Quốc gia:</span>
                <span className="meta-value">{movie.country ? movie.country.map(c => c.name).join(', ') : 'Chưa cập nhật'}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Diễn viên:</span>
                <span className="meta-value">{movie.actor ? movie.actor.join(', ') : 'Chưa cập nhật'}</span>
              </div>
            </div>

            {/* Episode List Area in Detail */}
            <div className="detail-episodes-section mt-4">
              <h4>Danh Sách Tập Phim</h4>
              {episodes.length > 0 ? (
                <>
                  <div className="server-tabs">
                    {episodes.map((server, sIndex) => (
                      <button
                        key={sIndex}
                        onClick={() => setSelectedServerIndex(sIndex)}
                        className={`server-tab-btn ${selectedServerIndex === sIndex ? 'active' : ''}`}
                      >
                        {server.server_name}
                      </button>
                    ))}
                  </div>
                  <div className="episodes-grid">
                    {currentServerData.map((ep, eIndex) => (
                      <button
                        key={eIndex}
                        onClick={() => window.location.hash = `#watch/${slug}/${ep.slug}`}
                        className="btn-episode"
                        title={ep.filename}
                      >
                        {ep.name}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="w-100 text-center text-muted py-3">Danh sách tập chưa được cập nhật.</div>
              )}
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
