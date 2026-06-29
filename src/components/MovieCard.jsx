import React from 'react';

export default function MovieCard({ movie, apiSource }) {
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

  const coverUrl = fixImageURL(movie.poster_url || movie.thumb_url);

  const handleClick = () => {
    window.location.hash = `#movie/${movie.slug}`;
  };

  return (
    <div className="movie-card" onClick={handleClick}>
      <div className="movie-card-thumb-wrap">
        <img className="movie-card-thumb" src={coverUrl} alt={movie.name} loading="lazy" />
        <div className="card-overlay">
          <i className="bx bx-play-circle"></i>
          <span className="card-overlay-btn">Xem chi tiết</span>
        </div>
        {movie.year && <span className="card-badge-year">{movie.year}</span>}
      </div>
      <div className="movie-card-info">
        <h3 className="movie-card-title">{movie.name}</h3>
        <p className="movie-card-origin-title">{movie.origin_name || ''}</p>
      </div>
    </div>
  );
}
