export function getAPIBase(apiSource) {
  return apiSource === 'ophim' ? 'https://ophim1.com' : 'https://phimapi.com';
}

export async function fetchAPI(endpoint, apiSource, isFullURL = false, onLogRequest = null, onLogResponse = null) {
  const url = isFullURL ? endpoint : `${getAPIBase(apiSource)}${endpoint}`;
  if (onLogRequest) {
    onLogRequest('GET', url);
  }
  
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    if (onLogResponse) {
      onLogResponse(data);
    }
    return data;
  } catch (error) {
    console.error('API Fetch Error:', error);
    if (onLogResponse) {
      onLogResponse({ error: error.message });
    }
    throw error;
  }
}

export function fixImageURL(url, apiSource) {
  if (!url) return 'https://placehold.co/300x450/1a1e24/66fcf1?text=No+Image';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  if (apiSource === 'ophim') {
    return `https://img.ophim.live/uploads/movies/${url}`;
  }
  return `https://phimimg.com/upload/vod/${url}`;
}
