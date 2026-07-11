import React, { useState, useEffect } from 'react';
import { fixImageURL, getHighQualityPoster } from '../utils.js';

export default function MovieCard({ movie }) {
  const [posterUrl, setPosterUrl] = useState(() => 
    fixImageURL(movie.poster_url || movie.thumb_url, movie.apiSource)
  );

  useEffect(() => {
    let isMounted = true;
    
    // Fetch high quality poster from TMDB in background
    getHighQualityPoster(movie).then(url => {
      if (isMounted && url) {
        setPosterUrl(url);
      }
    });

    return () => { isMounted = false; };
  }, [movie]);

  const handleClick = () => {
    window.location.hash = `#movie/${movie.slug}`;
  };

  return (
    <div className="movie-card" onClick={handleClick}>
      <div className="movie-card-thumb-wrap">
        <img
          className="movie-card-thumb image-fade-in"
          src={posterUrl}
          alt={movie.name}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.target.src = '/default-poster.png';
          }}
        />
        <div className="card-overlay">
          <i className="bx bx-play-circle"></i>
          <span className="card-overlay-btn">Xem chi tiết</span>
        </div>
        {movie.year && <span className="card-badge-year">{movie.year}</span>}
        {movie.episode_current && (
          <span className="card-badge-episode">{movie.episode_current}</span>
        )}
        {movie.isNewUpdate && (
          <span className="card-badge-update animate-pulse-glow">TẬP MỚI</span>
        )}
      </div>
      <div className="movie-card-info">
        <h3 className="movie-card-title">{movie.name}</h3>
        <p className="movie-card-origin-title">{movie.origin_name || ''}</p>
      </div>
    </div>
  );
}
