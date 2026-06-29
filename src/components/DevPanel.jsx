import React, { useState } from 'react';

export default function DevPanel({ isOpen, onClose, apiLog }) {
  const [activeTab, setActiveTab] = useState('dev-api');

  const copyToClipboard = () => {
    if (apiLog && apiLog.url) {
      navigator.clipboard.writeText(apiLog.url)
        .then(() => alert('Đã sao chép link API vào Clipboard!'))
        .catch(() => alert('Sao chép lỗi.'));
    }
  };

  // Process response formatting (truncate array items if long, similar to vanilla app.js)
  const getFormattedResponse = () => {
    if (!apiLog || !apiLog.response) {
      return '// Dữ liệu JSON sẽ được hiển thị tại đây...';
    }

    if (apiLog.response === 'Loading...') {
      return '// Đang tải dữ liệu...';
    }

    let displayData = apiLog.response;

    // Truncate list size in dev view to avoid lagging the UI
    if (displayData && Array.isArray(displayData.items)) {
      displayData = {
        ...displayData,
        items: displayData.items.slice(0, 3).map(item => ({
          name: item.name,
          origin_name: item.origin_name,
          slug: item.slug,
          year: item.year,
          _id: item._id,
          comment: "... [Đã ẩn bớt để tối ưu hiệu năng hiển thị]"
        }))
      };
    }

    return JSON.stringify(displayData, null, 2);
  };

  return (
    <aside className={`dev-panel ${isOpen ? 'active' : ''}`}>
      <div className="dev-panel-header">
        <h3><i className="bx bx-code-block text-cyan"></i> Console Học Tập</h3>
        <button onClick={onClose} className="btn-close-dev"><i className="bx bx-x"></i></button>
      </div>
      <div className="dev-panel-body">
        <div className="dev-tabs">
          <button
            onClick={() => setActiveTab('dev-api')}
            className={`dev-tab-btn ${activeTab === 'dev-api' ? 'active' : ''}`}
          >
            API Log
          </button>
          <button
            onClick={() => setActiveTab('dev-tech')}
            className={`dev-tab-btn ${activeTab === 'dev-tech' ? 'active' : ''}`}
          >
            Kiến Thức
          </button>
        </div>

        {activeTab === 'dev-api' ? (
          <div className="dev-tab-content active">
            <div className="dev-section">
              <h4>Đường Dẫn API Vừa Gọi:</h4>
              <div className="api-url-box">
                <span className="method-tag GET">{apiLog?.method || 'GET'}</span>
                <code>{apiLog?.url || 'Chưa có request nào'}</code>
                {apiLog?.url && apiLog.url !== 'Chưa có request nào' && (
                  <>
                    <button onClick={copyToClipboard} className="btn-icon-sm" title="Copy URL">
                      <i className="bx bx-copy"></i>
                    </button>
                    <a
                      className="btn-icon-sm"
                      href={apiLog.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Mở trên Tab mới"
                    >
                      <i className="bx bx-link-external"></i>
                    </a>
                  </>
                )}
              </div>
            </div>

            <div className="dev-section">
              <h4>Dữ Liệu JSON Phản Hồi (Tối đa 3 items mẫu):</h4>
              <pre className="json-viewer">
                <code>{getFormattedResponse()}</code>
              </pre>
            </div>
          </div>
        ) : (
          <div className="dev-tab-content active">
            <div className="tech-item">
              <h5><i className="bx bx-network-chart"></i> OPhim & PhimAPI Hoạt Động Thế Nào?</h5>
              <p>Hệ thống này cung cấp dữ liệu JSON chứa mô tả phim, hình ảnh poster và liên kết phát luồng video (stream links). Dữ liệu này được thu thập tự động từ nhiều nguồn khác nhau.</p>
            </div>

            <div className="tech-item">
              <h5><i className="bx bx-broadcast"></i> HLS (.m3u8) là gì?</h5>
              <p><strong>HLS (HTTP Live Streaming)</strong> là giao thức truyền tải dữ liệu video được phát triển bởi Apple. Thay vì tải toàn bộ file video lớn (như MP4), video được chia thành hàng ngàn phân đoạn nhỏ (.ts) dài khoảng 2-10 giây và lập chỉ mục trong một file playlist `.m3u8`.</p>
              <p>Khi sử dụng trình phát HLS, browser sẽ tải file `.m3u8`, sau đó tải tuần tự các mảnh `.ts` tương ứng. Điều này giúp tối ưu băng thông và giảm giật hình khi mạng yếu.</p>
            </div>

            <div className="tech-item">
              <h5><i className="bx bx-cube"></i> Thư viện Hls.js làm gì?</h5>
              <p>Vì hầu hết các trình duyệt trên Desktop (trừ Safari) không hỗ trợ phát file `.m3u8` tự nhiên bằng thẻ `&lt;video&gt;` thông thường, thư viện <strong>Hls.js</strong> được viết bằng Javascript sử dụng **Media Source Extensions (MSE)** của HTML5 để chuyển đổi luồng HLS thành định dạng mà trình duyệt Desktop hiểu được trực tiếp mà không cần cài thêm plugin ngoài.</p>
            </div>

            <div className="tech-item">
              <h5><i className="bx bx-window-open"></i> So sánh Embed Iframe vs HLS Player</h5>
              <table className="tech-table">
                <thead>
                  <tr>
                    <th>Tiêu chí</th>
                    <th>Iframe Embed</th>
                    <th>HLS Video Tag</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Tùy biến UI</td>
                    <td>Không (Bị khóa bởi bên thứ ba)</td>
                    <td>100% tự do (HTML5/CSS)</td>
                  </tr>
                  <tr>
                    <td>Quảng cáo</td>
                    <td>Bị chèn nhiều pop-up của server nguồn</td>
                    <td>Hạn chế tối đa (Sạch sẽ)</td>
                  </tr>
                  <tr>
                    <td>Học tập</td>
                    <td>Đơn giản (chỉ nhúng)</td>
                    <td>Nâng cao (học về phát luồng)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
