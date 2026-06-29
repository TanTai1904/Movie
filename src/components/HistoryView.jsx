import React from 'react';

export default function HistoryView({ history, onRemoveHistory, onClearHistory }) {
  const handleItemClick = (e, movieSlug, episodeSlug) => {
    // Skip if clicking the trash remove button
    if (e.target.closest('.btn-remove-history') || e.target.closest('.bx-trash')) {
      return;
    }
    window.location.hash = `#watch/${movieSlug}/${episodeSlug}`;
  };

  const formatDateTime = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (e) {
      return 'Chưa rõ thời gian';
    }
  };

  return (
    <section id="view-history" className="content-view active">
      <div className="section-header">
        <h2 className="section-title">
          <i className="bx bx-history text-info"></i> Lịch Sử Xem Phim
        </h2>
        {history.length > 0 && (
          <button onClick={onClearHistory} className="btn btn-secondary btn-sm">
            <i className="bx bx-trash"></i> Xóa Tất Cả
          </button>
        )}
      </div>

      {history.length > 0 ? (
        <div className="history-list-container">
          {history.map((item) => (
            <div
              key={item.movieSlug}
              onClick={(e) => handleItemClick(e, item.movieSlug, item.episodeSlug)}
              className="history-item"
              style={{ cursor: 'pointer' }}
            >
              <img className="history-thumb" src={item.movieThumb} alt={item.movieName} />
              <div className="history-info">
                <h3 className="history-title">{item.movieName}</h3>
                <p className="history-origin">{item.movieOriginName}</p>
                <span className="history-episode">Tập tiếp theo: {item.episodeName}</span>
                <span className="history-time">
                  <i className="bx bx-time-five"></i> Xem lúc: {formatDateTime(item.updatedAt)}
                </span>
                <div className="history-percent-bar-container">
                  <div className="history-percent-bar" style={{ width: `${item.percent}%` }}></div>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveHistory(item.movieSlug);
                }}
                className="btn-remove-history"
                title="Xóa lịch sử phim này"
              >
                <i className="bx bx-trash"></i>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <i className="bx bx-history"></i>
          <p>Bạn chưa xem bộ phim nào. Hãy cùng khám phá và học tập ngay!</p>
        </div>
      )}
    </section>
  );
}
