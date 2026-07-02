/**
 * Utility to download HLS streams (.m3u8) as a merged .mp4 file directly in the browser.
 * Uses parallel segment downloading with retry logic and combines them on the client side.
 */
export async function downloadHlsAsMp4(m3u8Url, outputFileName, onProgress, onStatusChange, abortControllerSignal) {
  try {
    onStatusChange('parsing', 'Đang phân tích danh sách phát m3u8...');
    const response = await fetch(m3u8Url, { signal: abortControllerSignal });
    if (!response.ok) throw new Error(`Không thể tải playlist m3u8. Mã lỗi HTTP: ${response.status}`);
    
    let playlistText = await response.text();
    let mediaPlaylistUrl = m3u8Url;

    // Check if it's a master playlist (contains references to sub-playlists)
    if (playlistText.includes('#EXT-X-STREAM-INF')) {
      const lines = playlistText.split('\n');
      let bestStreamUrl = null;
      let maxBandwidth = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('#EXT-X-STREAM-INF')) {
          // Parse bandwidth to find the highest quality stream
          const bwMatch = line.match(/BANDWIDTH=(\d+)/i);
          const bandwidth = bwMatch ? parseInt(bwMatch[1]) : 0;

          // Find the URL line following #EXT-X-STREAM-INF
          let nextLine = '';
          for (let j = i + 1; j < lines.length; j++) {
            const l = lines[j].trim();
            if (l && !l.startsWith('#')) {
              nextLine = l;
              break;
            }
          }

          if (nextLine) {
            const absoluteStreamUrl = new URL(nextLine, m3u8Url).href;
            if (bandwidth > maxBandwidth || !bestStreamUrl) {
              maxBandwidth = bandwidth;
              bestStreamUrl = absoluteStreamUrl;
            }
          }
        }
      }

      if (bestStreamUrl) {
        mediaPlaylistUrl = bestStreamUrl;
        onStatusChange('parsing', 'Đang tải danh sách phân đoạn của luồng tốt nhất...');
        const res2 = await fetch(mediaPlaylistUrl, { signal: abortControllerSignal });
        if (!res2.ok) throw new Error(`Không thể tải playlist phân đoạn phụ. Mã lỗi HTTP: ${res2.status}`);
        playlistText = await res2.text();
      }
    }

    // Extract all segments (.ts urls)
    const lines = playlistText.split('\n');
    const segmentUrls = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line && !line.startsWith('#')) {
        // Resolve path relative to the media playlist URL
        const segmentUrl = new URL(line, mediaPlaylistUrl).href;
        segmentUrls.push(segmentUrl);
      }
    }

    const totalSegments = segmentUrls.length;
    if (totalSegments === 0) {
      throw new Error('Không tìm thấy phân đoạn video (.ts) nào trong danh sách phát.');
    }

    onStatusChange('downloading', `Bắt đầu tải: 0/${totalSegments} phân đoạn`);

    const segmentsData = new Array(totalSegments);
    let downloadedCount = 0;
    let totalBytes = 0;

    // Number of simultaneous downloads. 6 is standard to be fast but respect browser limits.
    const CONCURRENCY = 6;
    
    // We process segment downloading using a worker pool pattern to handle concurrent slots
    let activeIdx = 0;

    const downloadWorker = async () => {
      while (activeIdx < totalSegments) {
        if (abortControllerSignal.aborted) {
          throw new Error('Tải xuống đã bị hủy.');
        }

        const currentIdx = activeIdx++;
        const url = segmentUrls[currentIdx];

        let attempt = 0;
        const maxAttempts = 3;
        let success = false;
        let segmentBuffer = null;

        while (attempt < maxAttempts && !success) {
          if (abortControllerSignal.aborted) {
            throw new Error('Tải xuống đã bị hủy.');
          }

          try {
            const res = await fetch(url, { signal: abortControllerSignal });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            segmentBuffer = await res.arrayBuffer();
            success = true;
          } catch (err) {
            attempt++;
            if (attempt >= maxAttempts) {
              throw new Error(`Lỗi tải phân đoạn số ${currentIdx + 1} sau ${maxAttempts} lần thử: ${err.message}`);
            }
            // Wait 1s before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        if (segmentBuffer) {
          segmentsData[currentIdx] = new Uint8Array(segmentBuffer);
          downloadedCount++;
          totalBytes += segmentBuffer.byteLength;

          const percent = Math.floor((downloadedCount / totalSegments) * 100);
          const mbLoaded = (totalBytes / (1024 * 1024)).toFixed(1);
          onProgress(percent, downloadedCount, totalSegments, mbLoaded);
        }
      }
    };

    // Spin up concurrent worker promises
    const pool = [];
    for (let w = 0; w < Math.min(CONCURRENCY, totalSegments); w++) {
      pool.push(downloadWorker());
    }

    // Wait for all workers to finish
    await Promise.all(pool);

    if (abortControllerSignal.aborted) {
      throw new Error('Tải xuống đã bị hủy.');
    }

    onStatusChange('merging', `Đang hợp nhất ${totalSegments} phân đoạn thành file MP4 (${(totalBytes / (1024 * 1024)).toFixed(1)} MB)...`);
    // Wait briefly for UI responsiveness
    await new Promise(resolve => setTimeout(resolve, 300));

    // Concatenate segments
    const mergedArray = new Uint8Array(totalBytes);
    let offset = 0;
    for (let i = 0; i < totalSegments; i++) {
      if (segmentsData[i]) {
        mergedArray.set(segmentsData[i], offset);
        offset += segmentsData[i].length;
      }
    }

    onStatusChange('saving', 'Đang lưu video về thiết bị của bạn...');
    const blob = new Blob([mergedArray], { type: 'video/mp4' });
    const downloadUrl = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = downloadUrl;
    // Slugify filename slightly if needed
    const safeName = outputFileName.endsWith('.mp4') ? outputFileName : `${outputFileName}.mp4`;
    a.download = safeName;
    document.body.appendChild(a);
    a.click();

    // Cleanup
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    onStatusChange('completed', 'Tải xuống hoàn thành! Video đã được lưu thành công.');
  } catch (err) {
    if (err.name === 'AbortError' || abortControllerSignal.aborted) {
      onStatusChange('cancelled', 'Đã hủy tải xuống thành công.');
    } else {
      console.error('Downloader Error:', err);
      onStatusChange('error', `Thất bại: ${err.message}`);
    }
  }
}
