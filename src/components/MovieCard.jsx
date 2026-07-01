import React from 'react';
import { fixImageURL } from '../utils.js';

export default function MovieCard({ movie }) {
  const coverUrl = fixImageURL(movie.poster_url || movie.thumb_url, movie.apiSource);

  const handleClick = () => {
    window.location.hash = `#movie/${movie.slug}`;
  };

  return (
    <div className="movie-card" onClick={handleClick}>
      <div className="movie-card-thumb-wrap">
        <img
          className="movie-card-thumb"
          src={coverUrl}
          alt={movie.name}
          loading="lazy"
          onError={(e) => {
            e.target.src = '/default-poster.png';
          }}
        />
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
