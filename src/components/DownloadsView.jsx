import React from 'react';

export default function DownloadsView({ 
  globalDownloads, 
  downloadsHistory = [], 
  cancelGlobalDownload, 
  startGlobalDownload,
  clearDownloadsHistory,
  deleteDownloadHistoryItem 
}) {
  const activeDownloads = Object.values(globalDownloads).filter(item => 
    ['parsing', 'downloading', 'merging', 'saving'].includes(item.status)
  );

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'completed': return 'badge-success';
      case 'error': return 'badge-danger';
      case 'cancelled': return 'badge-warning';
      default: return 'badge-info';
    }
  };

  const getStatusText = (status, msg) => {
    switch (status) {
      case 'completed': return 'Đã hoàn tất';
      case 'error': return msg || 'Lỗi tải xuống';
      case 'cancelled': return 'Đã hủy';
      case 'parsing': return 'Đang kết nối...';
      case 'downloading': return 'Đang tải phân đoạn...';
      case 'merging': return 'Đang hợp nhất...';
      case 'saving': return 'Đang lưu về máy...';
      default: return 'Chờ xử lý';
    }
  };

  return (
    <section id="view-downloads" className="content-view active">
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h2 className="section-title">
          <i className="bx bx-cloud-download text-cyan"></i> Lịch Sử Tải Phim
        </h2>
        {downloadsHistory.length > 0 && (
          <button 
            className="btn btn-secondary" 
            style={{ padding: '6px 14px', fontSize: '12px', height: 'auto', backgroundColor: 'rgba(255, 77, 109, 0.1)', borderColor: 'rgba(255, 77, 109, 0.2)', color: 'var(--color-danger)' }}
            onClick={clearDownloadsHistory}
          >
            <i className="bx bx-trash"></i> Xóa Lịch Sử
          </button>
        )}
      </div>

      <p className="section-subtitle text-muted mb-4" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
        Theo dõi tiến trình tải phim chạy ngầm và lịch sử các tệp video đã lưu về thiết bị. Định dạng tệp lưu là MP4.
      </p>

      {/* 1. SECTION: ACTIVE DOWNLOADS */}
      {activeDownloads.length > 0 && (
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ fontSize: '15px', color: 'var(--accent-color)', fontWeight: 'bold', marginBottom: '14px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
            <i className="bx bx-loader-circle bx-spin"></i> Đang tải xuống ({activeDownloads.length})
          </h3>
          <div className="downloads-list-wrapper">
            {activeDownloads.map((item) => (
              <div key={item.id} className="download-card-item">
                <div className="download-card-header">
                  <div className="download-movie-info">
                    <h4 className="download-movie-title">{item.movieName}</h4>
                    <span className="download-episode-name">Tập: {item.episodeName}</span>
                  </div>
                  <span className={`badge-status ${getStatusBadgeClass(item.status)}`}>
                    {getStatusText(item.status, item.statusMessage)}
                  </span>
                </div>

                <div className="download-card-body mt-2">
                  <p className="download-filename">
                    <i className="bx bx-file"></i> {item.fileName}
                  </p>

                  <div className="downloader-progress-wrapper global mt-2">
                    <div className="progress-bar-container">
                      <div className="progress-bar-track">
                        <div 
                          className="progress-bar-fill" 
                          style={{ width: `${item.percent}%` }}
                        ></div>
                      </div>
                      <span className="progress-percent-label">{item.percent}%</span>
                    </div>
                    
                    <div className="progress-status-info mt-2">
                      <span>Đã tải: {item.downloadedMb} MB</span>
                      {item.status === 'downloading' && (
                        <span>Đang tải phân đoạn...</span>
                      )}
                    </div>
                  </div>

                  <div className="download-card-actions mt-3">
                    <button 
                      className="btn btn-cancel-global w-100" 
                      style={{ padding: '6px 12px', fontSize: '12px', height: 'auto', borderRadius: '4px' }}
                      onClick={() => cancelGlobalDownload(item.id)}
                    >
                      <i className="bx bx-stop-circle"></i> Hủy tải xuống
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. SECTION: COMPLETED & TERMINATED DOWNLOADS HISTORY */}
      <div>
        {activeDownloads.length > 0 && (
          <h3 style={{ fontSize: '15px', color: 'var(--text-main)', fontWeight: 'bold', marginBottom: '14px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
            <i className="bx bx-history"></i> Lịch sử tải về
          </h3>
        )}
        
        {downloadsHistory.length === 0 ? (
          activeDownloads.length === 0 && (
            <div className="empty-state" style={{ textAlign: 'center', padding: '60px 20px', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '12px' }}>
              <i className="bx bx-cloud-download text-muted" style={{ fontSize: '50px', color: 'var(--text-light)' }}></i>
              <h4 style={{ marginTop: '16px', fontSize: '15px', fontWeight: 'bold' }}>Không có lịch sử tải phim</h4>
              <p className="text-muted text-xs mt-1">Truy cập vào trang chi tiết tập phim để tải trực tiếp video về thiết bị của bạn.</p>
            </div>
          )
        ) : (
          <div className="downloads-list-wrapper">
            {downloadsHistory.map((item) => (
              <div key={item.id} className="download-card-item">
                <div className="download-card-header">
                  <div className="download-movie-info">
                    <h4 className="download-movie-title">{item.movieName}</h4>
                    <span className="download-episode-name">Tập: {item.episodeName} • {item.timestamp}</span>
                  </div>
                  <span className={`badge-status ${getStatusBadgeClass(item.status)}`}>
                    {getStatusText(item.status, item.statusMessage)}
                  </span>
                </div>

                <div className="download-card-body mt-2">
                  <p className="download-filename">
                    <i className="bx bx-file"></i> {item.fileName}
                  </p>

                  <div className="progress-status-info mt-2">
                    <span>Đã tải: {item.downloadedMb} MB</span>
                    <span>{item.status === 'completed' ? 'Thành công' : 'Đã dừng'}</span>
                  </div>

                  <div className="download-card-actions mt-3" style={{ display: 'flex', gap: '8px' }}>
                    {item.status !== 'completed' && (
                      <button 
                        className="btn btn-retry-global" 
                        style={{ padding: '6px 12px', fontSize: '11px', height: '28px', borderRadius: '4px', flexGrow: 1 }}
                        onClick={() => startGlobalDownload(item.id, item.movieName, item.episodeName, item.fileName)}
                      >
                        <i className="bx bx-refresh"></i> Tải lại
                      </button>
                    )}
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '6px 12px', fontSize: '11px', height: '28px', borderRadius: '4px', flexGrow: item.status === 'completed' ? 1 : 0, color: 'var(--text-muted)' }}
                      onClick={() => deleteDownloadHistoryItem(item.id)}
                      title="Xóa khỏi danh sách"
                    >
                      <i className="bx bx-trash"></i> {item.status === 'completed' ? 'Xóa khỏi danh sách' : ''}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
