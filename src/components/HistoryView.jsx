import React from 'react';
import { fixImageURL } from '../utils.js';

export default function HistoryView({ history, clearHistory, deleteHistoryItem, apiSource }) {
  
  const handleClearAll = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử xem phim?')) {
      clearHistory();
    }
  };

  const handleItemClick = (e, item) => {
    // Prevent navigation if trash button was clicked
    if (e.target.closest('.btn-remove-history') || e.target.closest('i.bx-trash')) {
      return;
    }
    window.location.hash = `#watch/${item.movieSlug}/${item.episodeSlug}`;
  };

  const formatWatchTime = (isoString) => {
    try {
      return new Date(isoString).toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit'
      });
    } catch {
      return '';
    }
  };

  return (
    <section id="view-history" className="content-view active">
      <div className="section-header">
        <h2 className="section-title">
          <i className="bx bx-history text-info"></i> Lịch Sử Xem Phim
        </h2>
        {history.length > 0 && (
          <button id="btn-clear-history" className="btn btn-secondary btn-sm" onClick={handleClearAll}>
            <i className="bx bx-trash"></i> Xóa Tất Cả
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div id="history-empty" className="empty-state">
          <i className="bx bx-history"></i>
          <p>Bạn chưa xem bộ phim nào. Hãy cùng khám phá và học tập ngay!</p>
        </div>
      ) : (
        <div id="history-list" className="history-list-container">
          {history.map((item, idx) => (
            <div
              key={`${item.movieSlug}-${idx}`}
              className="history-item"
              onClick={(e) => handleItemClick(e, item)}
              style={{ cursor: 'pointer' }}
            >
              <img
                className="history-thumb"
                src={fixImageURL(item.movieThumb, apiSource)}
                alt={item.movieName}
                onError={(e) => {
                  e.target.src = 'https://placehold.co/300x450/1a1e24/66fcf1?text=No+Image';
                }}
              />
              <div className="history-info">
                <h4 className="history-title">{item.movieName}</h4>
                <span className="history-episode">Tập tiếp theo: {item.episodeName}</span>
                <span className="history-time">
                  <i className="bx bx-time-five"></i> Xem lúc: {formatWatchTime(item.updatedAt)}
                </span>
                <div className="history-percent-bar-container">
                  <div className="history-percent-bar" style={{ width: `${item.percent}%` }}></div>
                </div>
              </div>
              <button
                className="btn-remove-history"
                title="Xóa lịch sử phim này"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteHistoryItem(item.movieSlug);
                }}
              >
                <i className="bx bx-trash"></i>
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
