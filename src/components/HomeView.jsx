import React, { useState, useEffect } from 'react';
import MovieCard from './MovieCard.jsx';
import SkeletonGrid from './SkeletonGrid.jsx';

export default function HomeView({ apiSource, fetchAPI, watchlist, onToggleWatchlist }) {
  const [newMovies, setNewMovies] = useState([]);
  const [phimLe, setPhimLe] = useState([]);
  const [phimBo, setPhimBo] = useState([]);
  const [hoatHinh, setHoatHinh] = useState([]);
  const [phimChieuRap, setPhimChieuRap] = useState([]);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [heroMovie, setHeroMovie] = useState(null);
  const [loadingHero, setLoadingHero] = useState(true);
  const [loadingGrids, setLoadingGrids] = useState(true);

  // Load Grids (Only fetch on mount or apiSource change, currentPage change)
  useEffect(() => {
    let active = true;
    setLoadingGrids(true);

    const loadNewMovies = async () => {
      try {
        const data = await fetchAPI(`/danh-sach/phim-moi-cap-nhat?page=${currentPage}`);
        if (!active) return;
        setNewMovies(data.items || []);
        setTotalPages(data.pagination?.totalPages || 1);

        // Render hero movie banner using a random movie from page 1
        if (currentPage === 1 && data.items && data.items.length > 0) {
          setLoadingHero(true);
          const randomMovie = data.items[Math.floor(Math.random() * Math.min(5, data.items.length))];
          try {
            const detailData = await fetchAPI(`/phim/${randomMovie.slug}`);
            if (active) {
              setHeroMovie(detailData.movie);
            }
          } catch (e) {
            console.error("Hero load error:", e);
          } finally {
            if (active) setLoadingHero(false);
          }
        }
      } catch (error) {
        console.error("Lỗi tải phim mới:", error);
      } finally {
        if (active) setLoadingGrids(false);
      }
    };

    loadNewMovies();

    // Fetch other lists (Phim le, phim bo, hoat hinh, phim chieu rap)
    fetchAPI('/v1/api/danh-sach/phim-le?page=1').then(res => {
      if (active) setPhimLe(res.data?.items?.slice(0, 5) || []);
    }).catch(e => console.error(e));

    fetchAPI('/v1/api/danh-sach/phim-bo?page=1').then(res => {
      if (active) setPhimBo(res.data?.items?.slice(0, 5) || []);
    }).catch(e => console.error(e));

    fetchAPI('/v1/api/danh-sach/hoat-hinh?page=1').then(res => {
      if (active) setHoatHinh(res.data?.items?.slice(0, 5) || []);
    }).catch(e => console.error(e));

    fetchAPI('/v1/api/danh-sach/phim-chieu-rap?page=1').then(res => {
      if (active) setPhimChieuRap(res.data?.items?.slice(0, 5) || []);
    }).catch(e => console.error(e));

    return () => {
      active = false;
    };
  }, [apiSource, currentPage]);

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

  const isFavorited = heroMovie ? watchlist.some(m => m.slug === heroMovie.slug) : false;

  const fixImageURL = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    if (apiSource === 'ophim') {
      return `https://img.ophim.live/uploads/movies/${url}`;
    }
    return `https://phimimg.com/upload/vod/${url}`;
  };

  return (
    <section id="view-home" className="content-view active">
      {/* Hero Banner */}
      <div
        id="hero-banner"
        className="hero-banner"
        style={{
          backgroundImage: heroMovie ? `url('${fixImageURL(heroMovie.poster_url || heroMovie.thumb_url)}')` : 'none',
          display: loadingHero ? 'flex' : 'block'
        }}
      >
        <div className="hero-overlay"></div>
        {loadingHero ? (
          <div className="hero-content">
            <span className="hero-badge">NỔI BẬT</span>
            <h1 className="hero-title">Đang Tải...</h1>
            <p className="hero-description">Vui lòng chờ trong giây lát khi chúng tôi tải dữ liệu phim...</p>
          </div>
        ) : (
          heroMovie && (
            <div className="hero-content">
              <span className="hero-badge">NỔI BẬT</span>
              <h1 className="hero-title">{heroMovie.name}</h1>
              <p className="hero-origin-name">{heroMovie.origin_name || ''}</p>
              <div className="hero-meta">
                <span className="hero-year"><i className="bx bx-calendar"></i> {heroMovie.year || '2026'}</span>
                <span className="hero-rating"><i className="bx bxs-star text-gold"></i> {heroMovie.tmdb?.vote_average || 'N/A'}</span>
                <span className="hero-lang">{heroMovie.lang || 'Vietsub'}</span>
              </div>
              <p className="hero-description">{heroMovie.content?.replace(/<[^>]*>/g, '') || ''}</p>
              <div className="hero-actions">
                <button
                  onClick={() => window.location.hash = `#movie/${heroMovie.slug}`}
                  className="btn btn-primary btn-play-hero"
                >
                  <i className="bx bx-play"></i> Xem Ngay
                </button>
                <button
                  onClick={() => onToggleWatchlist(heroMovie)}
                  className={`btn btn-secondary btn-fav-hero ${isFavorited ? 'active' : ''}`}
                >
                  <i className={`bx ${isFavorited ? 'bxs-heart text-danger' : 'bx-heart'}`}></i> {isFavorited ? 'Đã Yêu Thích' : 'Yêu Thích'}
                </button>
              </div>
            </div>
          )
        )}
      </div>

      {/* Newly Updated Grid Section */}
      <div className="movies-section">
        <div className="section-header">
          <h2 className="section-title"><i className="bx bx-trending-up accent-color"></i> Mới Cập Nhật</h2>
          <div className="pagination-controls">
            <button onClick={handlePrevPage} className="btn-page btn-prev-page" disabled={currentPage === 1 || loadingGrids}>
              <i className="bx bx-chevron-left"></i>
            </button>
            <span className="page-indicator">Trang {currentPage} / {totalPages}</span>
            <button onClick={handleNextPage} className="btn-page btn-next-page" disabled={currentPage >= totalPages || loadingGrids}>
              <i className="bx bx-chevron-right"></i>
            </button>
          </div>
        </div>
        <div className="movies-grid">
          {loadingGrids ? (
            <SkeletonGrid count={10} />
          ) : (
            newMovies.map(movie => (
              <MovieCard key={movie._id || movie.slug} movie={movie} apiSource={apiSource} />
            ))
          )}
        </div>
      </div>

      {/* Phim Lẻ Section */}
      <div className="movies-section mt-4">
        <div className="section-header">
          <h2 className="section-title"><i className="bx bx-film accent-color"></i> Phim Lẻ Hot</h2>
          <a href="#phim-le" className="btn-view-all">Xem Tất Cả <i className="bx bx-chevron-right"></i></a>
        </div>
        <div className="movies-grid">
          {loadingGrids ? (
            <SkeletonGrid count={5} />
          ) : (
            phimLe.map(movie => (
              <MovieCard key={movie._id || movie.slug} movie={movie} apiSource={apiSource} />
            ))
          )}
        </div>
      </div>

      {/* Phim Bộ Section */}
      <div className="movies-section mt-4">
        <div className="section-header">
          <h2 className="section-title"><i className="bx bx-tv accent-color"></i> Phim Bộ Mới</h2>
          <a href="#phim-bo" className="btn-view-all">Xem Tất Cả <i className="bx bx-chevron-right"></i></a>
        </div>
        <div className="movies-grid">
          {loadingGrids ? (
            <SkeletonGrid count={5} />
          ) : (
            phimBo.map(movie => (
              <MovieCard key={movie._id || movie.slug} movie={movie} apiSource={apiSource} />
            ))
          )}
        </div>
      </div>

      {/* Hoạt Hình Section */}
      <div className="movies-section mt-4">
        <div className="section-header">
          <h2 className="section-title"><i className="bx bx-ghost accent-color"></i> Hoạt Hình & Anime</h2>
          <a href="#hoat-hinh" className="btn-view-all">Xem Tất Cả <i className="bx bx-chevron-right"></i></a>
        </div>
        <div className="movies-grid">
          {loadingGrids ? (
            <SkeletonGrid count={5} />
          ) : (
            hoatHinh.map(movie => (
              <MovieCard key={movie._id || movie.slug} movie={movie} apiSource={apiSource} />
            ))
          )}
        </div>
      </div>

      {/* Phim Chiếu Rạp Section */}
      <div className="movies-section mt-4">
        <div className="section-header">
          <h2 className="section-title"><i className="bx bx-camera-movie accent-color"></i> Phim Chiếu Rạp Hot</h2>
          <a href="#phim-chieu-rap" className="btn-view-all">Xem Tất Cả <i className="bx bx-chevron-right"></i></a>
        </div>
        <div className="movies-grid">
          {loadingGrids ? (
            <SkeletonGrid count={5} />
          ) : (
            phimChieuRap.map(movie => (
              <MovieCard key={movie._id || movie.slug} movie={movie} apiSource={apiSource} />
            ))
          )}
        </div>
      </div>
    </section>
  );
}
