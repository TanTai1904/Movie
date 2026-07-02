import React, { useState, useEffect } from 'react';
import MovieCard from './MovieCard.jsx';
import SkeletonCard from './SkeletonCard.jsx';
import { fetchUnifiedNewMovies, fetchUnifiedCategory, fetchUnifiedDetail, fixImageURL, fixBackdropURL } from '../utils.js';

export default function HomeView({ watchlist, toggleWatchlist, onLogRequest, onLogResponse }) {
  const [newMovies, setNewMovies] = useState([]);
  const [phimLe, setPhimLe] = useState([]);
  const [phimBo, setPhimBo] = useState([]);
  const [hoatHinh, setHoatHinh] = useState([]);
  const [phimChieuRap, setPhimChieuRap] = useState([]);

  const [loadingNew, setLoadingNew] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [heroMovie, setHeroMovie] = useState(null);
  const [loadingHero, setLoadingHero] = useState(true);

  // Load Newly Updated Movies
  useEffect(() => {
    async function loadNewMovies() {
      setLoadingNew(true);
      try {
        if (onLogRequest) {
          onLogRequest('GET', 'Unified Multi-Source: New Movies (Page ' + currentPage + ')');
        }
        const data = await fetchUnifiedNewMovies(currentPage);
        if (onLogResponse) {
          onLogResponse(data);
        }
        const movies = data.items || [];
        setNewMovies(movies);
        setTotalPages(data.pagination?.totalPages || 1);

        // Load hero movie from this list (only on first page load or if not set)
        if (movies.length > 0 && currentPage === 1 && !heroMovie) {
          const randomIdx = Math.floor(Math.random() * Math.min(5, movies.length));
          loadHeroDetails(movies[randomIdx]);
        }
      } catch (err) {
        console.error('Error loading newly updated movies:', err);
      } finally {
        setLoadingNew(false);
      }
    }
    loadNewMovies();
  }, [currentPage]);

  // Load other categories
  useEffect(() => {
    async function loadOtherCategories() {
      setLoadingCategories(true);
      try {
        // Phim Lẻ
        fetchUnifiedCategory('phim-le', 1)
          .then(res => setPhimLe(res.data?.items?.slice(0, 5) || []))
          .catch(e => console.error(e));

        // Phim Bộ
        fetchUnifiedCategory('phim-bo', 1)
          .then(res => setPhimBo(res.data?.items?.slice(0, 5) || []))
          .catch(e => console.error(e));

        // Hoạt Hình
        fetchUnifiedCategory('hoat-hinh', 1)
          .then(res => setHoatHinh(res.data?.items?.slice(0, 5) || []))
          .catch(e => console.error(e));

        // Phim Chiếu Rạp
        fetchUnifiedCategory('phim-chieu-rap', 1)
          .then(res => setPhimChieuRap(res.data?.items?.slice(0, 5) || []))
          .catch(e => console.error(e));
      } catch (err) {
        console.error('Error loading other categories:', err);
      } finally {
        setLoadingCategories(false);
      }
    }
    loadOtherCategories();
  }, []);

  async function loadHeroDetails(movie) {
    setLoadingHero(true);
    try {
      if (onLogRequest) {
        onLogRequest('GET', 'Unified Multi-Source: Detail (' + movie.slug + ')');
      }
      const detailData = await fetchUnifiedDetail(movie.slug);
      if (onLogResponse) {
        onLogResponse(detailData);
      }
      setHeroMovie(detailData.movie);
    } catch (err) {
      console.error('Error loading hero movie detail:', err);
      setHeroMovie(movie); // fallback to simple item
    } finally {
      setLoadingHero(false);
    }
  }

  const isHeroFav = heroMovie && watchlist.some(m => m.slug === heroMovie.slug);

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePlayHero = () => {
    if (heroMovie) {
      window.location.hash = `#movie/${heroMovie.slug}`;
    }
  };

  const cleanDescription = (html) => {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '');
  };

  return (
    <section id="view-home" className="content-view active">
      {/* Hero Movie Banner */}
      <div
        id="hero-banner"
        className="hero-banner"
      >
        {heroMovie && (
          <img 
            src={fixBackdropURL(heroMovie.poster_url || heroMovie.thumb_url, heroMovie.apiSource)} 
            alt="" 
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        )}
        <div className="hero-overlay" style={{ zIndex: 1 }}></div>
        <div className="hero-content" style={{ zIndex: 2 }}>
          <span className="hero-badge">NỔI BẬT</span>
          {loadingHero ? (
            <>
              <h1 className="hero-title">Đang Tải...</h1>
              <p className="hero-origin-name">Loading original title...</p>
              <div className="hero-meta">
                <span className="hero-year"><i className="bx bx-calendar"></i> ----</span>
                <span className="hero-rating"><i className="bx bxs-star text-gold"></i> --</span>
                <span className="hero-lang">Vietsub</span>
              </div>
              <p className="hero-description">Vui lòng chờ trong giây lát khi chúng tôi tải dữ liệu phim nổi bật...</p>
            </>
          ) : (
            heroMovie && (
              <>
                <h1 className="hero-title">{heroMovie.name}</h1>
                <p className="hero-origin-name">{heroMovie.origin_name || ''}</p>
                <div className="hero-meta">
                  <span className="hero-year">
                    <i className="bx bx-calendar"></i> {heroMovie.year || '2026'}
                  </span>
                  <span className="hero-rating">
                    <i className="bx bxs-star text-gold"></i> {heroMovie.tmdb?.vote_average || 'N/A'}
                  </span>
                  <span className="hero-lang">{heroMovie.lang || 'Vietsub'}</span>
                </div>
                <p className="hero-description">{cleanDescription(heroMovie.content)}</p>
                <div className="hero-actions">
                  <button className="btn btn-primary btn-play-hero" onClick={handlePlayHero}>
                    <i className="bx bx-play"></i> Xem Ngay
                  </button>
                  <button
                    className={`btn btn-secondary btn-fav-hero ${isHeroFav ? 'active' : ''}`}
                    onClick={() => toggleWatchlist(heroMovie)}
                  >
                    <i className={`bx ${isHeroFav ? 'bxs-heart text-danger' : 'bx-heart'}`}></i>{' '}
                    {isHeroFav ? 'Đã Yêu Thích' : 'Yêu Thích'}
                  </button>
                </div>
              </>
            )
          )}
        </div>
      </div>

      {/* Movie Sections: Newly Updated */}
      <div className="movies-section">
        <div className="section-header">
          <h2 className="section-title">
            <i className="bx bx-trending-up accent-color"></i> Mới Cập Nhật
          </h2>
          <div className="pagination-controls">
            <button className="btn-page btn-prev-page" onClick={handlePrevPage} disabled={currentPage === 1 || loadingNew}>
              <i className="bx bx-chevron-left"></i>
            </button>
            <span className="page-indicator">
              Trang {currentPage} / {totalPages}
            </span>
            <button className="btn-page btn-next-page" onClick={handleNextPage} disabled={currentPage >= totalPages || loadingNew}>
              <i className="bx bx-chevron-right"></i>
            </button>
          </div>
        </div>
        <div id="new-movies-grid" className="movies-grid">
          {loadingNew ? (
            <SkeletonCard count={10} />
          ) : newMovies.length === 0 ? (
            <div className="empty-state">
              <i className="bx bx-confused"></i>
              <p>Không tìm thấy phim mới nào.</p>
            </div>
          ) : (
            newMovies.map(movie => (
              <MovieCard key={movie.slug} movie={movie} />
            ))
          )}
        </div>
      </div>

      {/* Phim Lẻ Mới Nhất */}
      <div className="movies-section mt-4">
        <div className="section-header">
          <h2 className="section-title">
            <i className="bx bx-film accent-color"></i> Phim Lẻ Hot
          </h2>
          <a href="#phim-le" className="btn-view-all">
            Xem Tất Cả <i className="bx bx-chevron-right"></i>
          </a>
        </div>
        <div id="home-phim-le-grid" className="movies-grid">
          {loadingCategories ? (
            <SkeletonCard count={5} />
          ) : phimLe.length === 0 ? (
            <p className="text-muted">Không có dữ liệu.</p>
          ) : (
            phimLe.map(movie => (
              <MovieCard key={movie.slug} movie={movie} />
            ))
          )}
        </div>
      </div>

      {/* Phim Bộ Mới Nhất */}
      <div className="movies-section mt-4">
        <div className="section-header">
          <h2 className="section-title">
            <i className="bx bx-tv accent-color"></i> Phim Bộ Mới
          </h2>
          <a href="#phim-bo" className="btn-view-all">
            Xem Tất Cả <i className="bx bx-chevron-right"></i>
          </a>
        </div>
        <div id="home-phim-bo-grid" className="movies-grid">
          {loadingCategories ? (
            <SkeletonCard count={5} />
          ) : phimBo.length === 0 ? (
            <p className="text-muted">Không có dữ liệu.</p>
          ) : (
            phimBo.map(movie => (
              <MovieCard key={movie.slug} movie={movie} />
            ))
          )}
        </div>
      </div>

      {/* Hoạt Hình Anime */}
      <div className="movies-section mt-4">
        <div className="section-header">
          <h2 className="section-title">
            <i className="bx bx-ghost accent-color"></i> Hoạt Hình & Anime
          </h2>
          <a href="#hoat-hinh" className="btn-view-all">
            Xem Tất Cả <i className="bx bx-chevron-right"></i>
          </a>
        </div>
        <div id="home-hoat-hinh-grid" className="movies-grid">
          {loadingCategories ? (
            <SkeletonCard count={5} />
          ) : hoatHinh.length === 0 ? (
            <p className="text-muted">Không có dữ liệu.</p>
          ) : (
            hoatHinh.map(movie => (
              <MovieCard key={movie.slug} movie={movie} />
            ))
          )}
        </div>
      </div>

      {/* Phim Chiếu Rạp */}
      <div className="movies-section mt-4">
        <div className="section-header">
          <h2 className="section-title">
            <i className="bx bx-camera-movie accent-color"></i> Phim Chiếu Rạp Hot
          </h2>
          <a href="#phim-chieu-rap" className="btn-view-all">
            Xem Tất Cả <i className="bx bx-chevron-right"></i>
          </a>
        </div>
        <div id="home-phim-chieu-rap-grid" className="movies-grid">
          {loadingCategories ? (
            <SkeletonCard count={5} />
          ) : phimChieuRap.length === 0 ? (
            <p className="text-muted">Không có dữ liệu.</p>
          ) : (
            phimChieuRap.map(movie => (
              <MovieCard key={movie.slug} movie={movie} />
            ))
          )}
        </div>
      </div>
    </section>
  );
}
