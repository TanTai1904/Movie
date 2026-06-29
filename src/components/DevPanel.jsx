import React, { useState } from 'react';

export default function DevPanel({ devLog, isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('dev-api');

  const handleCopy = () => {
    if (devLog.url && devLog.url !== 'Chưa có request nào') {
      navigator.clipboard.writeText(devLog.url)
        .then(() => alert('Đã sao chép link API vào Clipboard!'))
        .catch(() => alert('Sao chép lỗi.'));
    }
  };

  const getBeautifiedJSON = () => {
    if (!devLog.data) return '// Dữ liệu JSON phản hồi sẽ được hiển thị ở đây...';
    
    let displayData = devLog.data;
    
    // Truncate list size to avoid lagging UI (like vanilla app)
    if (displayData && Array.isArray(displayData.items)) {
      displayData = {
        ...displayData,
        items: displayData.items.slice(0, 3).map(item => ({
          name: item.name,
          origin_name: item.origin_name,
          slug: item.slug,
          year: item.year,
          _id: item._id,
          comment: "... [Đã thu gọn danh sách trong giao diện Developer để tối ưu hiệu năng]"
        }))
      };
    } else if (displayData && displayData.data && Array.isArray(displayData.data.items)) {
      displayData = {
        ...displayData,
        data: {
          ...displayData.data,
          items: displayData.data.items.slice(0, 3).map(item => ({
            name: item.name,
            origin_name: item.origin_name,
            slug: item.slug,
            year: item.year,
            _id: item._id,
            comment: "... [Đã thu gọn danh sách trong giao diện Developer để tối ưu hiệu năng]"
          }))
        }
      };
    }

    return JSON.stringify(displayData, null, 2);
  };

  return (
    <aside id="dev-panel" className={`dev-panel ${isOpen ? 'active' : ''}`}>
      <div className="dev-panel-header">
        <h3><i className="bx bx-code-block text-cyan"></i> Console Học Tập</h3>
        <button id="btn-close-dev" className="btn-close-dev" onClick={onClose}>
          <i className="bx bx-x"></i>
        </button>
      </div>
      <div className="dev-panel-body">
        {/* Dev Tab System */}
        <div className="dev-tabs">
          <button
            className={`dev-tab-btn ${activeTab === 'dev-api' ? 'active' : ''}`}
            onClick={() => setActiveTab('dev-api')}
          >
            API Log
          </button>
          <button
            className={`dev-tab-btn ${activeTab === 'dev-tech' ? 'active' : ''}`}
            onClick={() => setActiveTab('dev-tech')}
          >
            Kiến Thức
          </button>
        </div>

        {/* Tab: API Log */}
        {activeTab === 'dev-api' && (
          <div id="tab-dev-api" className="dev-tab-content active">
            <div className="dev-section">
              <h4>Đường Dẫn API Vừa Gọi:</h4>
              <div className="api-url-box">
                <span id="dev-api-method" className={`method-tag ${devLog.method || 'GET'}`}>
                  {devLog.method || 'GET'}
                </span>
                <code id="dev-api-url" style={{ wordBreak: 'break-all' }}>{devLog.url}</code>
                {devLog.url && devLog.url !== 'Chưa có request nào' && (
                  <>
                    <button id="dev-copy-url" className="btn-icon-sm" title="Copy URL" onClick={handleCopy}>
                      <i className="bx bx-copy"></i>
                    </button>
                    <a
                      id="dev-open-url"
                      className="btn-icon-sm"
                      href={devLog.url}
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
              <h4>Dữ Liệu JSON Phản Hồi (Mẫu 3 items):</h4>
              <pre className="json-viewer">
                <code id="dev-json-display">{getBeautifiedJSON()}</code>
              </pre>
            </div>
          </div>
        )}

        {/* Tab: Technical Explanation */}
        {activeTab === 'dev-tech' && (
          <div id="tab-dev-tech" className="dev-tab-content active">
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
