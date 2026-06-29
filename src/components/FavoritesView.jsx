import React from 'react';
import MovieCard from './MovieCard.jsx';

export default function FavoritesView({ watchlist, apiSource }) {
  return (
    <section id="view-favorites" className="content-view active">
      <div className="section-header">
        <h2 className="section-title">
          <i className="bx bxs-heart text-danger"></i> Phim Đã Lưu (Watchlist)
        </h2>
      </div>
      
      {watchlist.length === 0 ? (
        <div id="favorites-empty" className="empty-state">
          <i className="bx bx-heart-broken"></i>
          <p>Danh sách yêu thích của bạn trống. Hãy click nút trái tim khi xem phim để thêm vào đây!</p>
        </div>
      ) : (
        <div id="favorites-grid" className="movies-grid">
          {watchlist.map(movie => (
            <MovieCard key={movie.slug} movie={movie} apiSource={apiSource} />
          ))}
        </div>
      )}
    </section>
  );
}
