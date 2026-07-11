export const API_SOURCES = {
  phimapi: 'https://phimapi.com',
  ophim: 'https://ophim1.com',
  nguonc: 'https://phim.nguonc.com/api'
};

export function getAPIBase(apiSource) {
  return API_SOURCES[apiSource] || 'https://phimapi.com';
}

export function fixImageURL(url, apiSource) {
  if (!url) return '/default-poster.png';
  
  let resolvedUrl = url;
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    const cleanUrl = url.startsWith('/') ? url.substring(1) : url;

    if (apiSource === 'ophim') {
      resolvedUrl = cleanUrl.startsWith('uploads/movies/') 
        ? `https://img.ophim.live/${cleanUrl}`
        : `https://img.ophim.live/uploads/movies/${cleanUrl}`;
    } else if (apiSource === 'phimapi') {
      resolvedUrl = cleanUrl.startsWith('upload/vod/')
        ? `https://phimimg.com/${cleanUrl}`
        : `https://phimimg.com/upload/vod/${cleanUrl}`;
    } else if (apiSource === 'nguonc') {
      resolvedUrl = `https://phim.nguonc.com/${cleanUrl}`;
    } else {
      resolvedUrl = `https://phimimg.com/upload/vod/${cleanUrl}`;
    }
  }

  // Route through global proxy CDN to bypass local ISP wall blocks and compress images to WebP
  return `https://images.weserv.nl/?url=${encodeURIComponent(resolvedUrl)}`;
}

export function fixBackdropURL(url, apiSource) {
  if (!url) return '/default-banner.png';
  
  let resolvedUrl = url;
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    const cleanUrl = url.startsWith('/') ? url.substring(1) : url;

    if (apiSource === 'ophim') {
      resolvedUrl = cleanUrl.startsWith('uploads/movies/')
        ? `https://img.ophim.live/${cleanUrl}`
        : `https://img.ophim.live/uploads/movies/${cleanUrl}`;
    } else if (apiSource === 'phimapi') {
      resolvedUrl = cleanUrl.startsWith('upload/vod/')
        ? `https://phimimg.com/${cleanUrl}`
        : `https://phimimg.com/upload/vod/${cleanUrl}`;
    } else if (apiSource === 'nguonc') {
      resolvedUrl = `https://phim.nguonc.com/${cleanUrl}`;
    } else {
      resolvedUrl = `https://phimimg.com/upload/vod/${cleanUrl}`;
    }
  }

  return `https://images.weserv.nl/?url=${encodeURIComponent(resolvedUrl)}`;
}

export function normalizeMovieItem(item, source) {
  if (!item) return null;
  const name = item.name || '';
  const slug = item.slug || '';
  const origin_name = item.origin_name || item.original_name || '';
  const poster_url = item.poster_url || item.poster || item.thumb_url || '';
  const thumb_url = item.thumb_url || item.thumbnail || item.poster_url || '';
  
  let year = item.year;
  if (!year && item.modified) {
    try {
      const dateStr = typeof item.modified === 'string' ? item.modified : (item.modified.time || '');
      year = new Date(dateStr).getFullYear();
    } catch {
      year = 2026;
    }
  }
  if (!year) year = 2026;

  return {
    name,
    slug,
    origin_name,
    poster_url,
    thumb_url,
    year: parseInt(year) || 2026,
    modified: item.modified || '',
    apiSource: source
  };
}

export function normalizePagination(data, source, fallbackLimit = 24) {
  if (source === 'nguonc') {
    const pag = data?.paginate || {};
    const totalItems = parseInt(pag.total_items) || 0;
    const limit = parseInt(pag.items_per_page) || fallbackLimit;
    const totalPages = parseInt(pag.total_page) || Math.ceil(totalItems / limit) || 1;
    return {
      totalItems,
      totalPages,
      currentPage: parseInt(pag.current_page) || 1
    };
  }

  // PhimAPI / OPhim new movies list
  if (data?.pagination) {
    const pag = data.pagination;
    const totalItems = pag.totalItems || 0;
    const limit = pag.totalItemsPerPage || fallbackLimit;
    const totalPages = pag.totalPages || Math.ceil(totalItems / limit) || 1;
    return {
      totalItems,
      totalPages,
      currentPage: pag.currentPage || 1
    };
  }

  // PhimAPI / OPhim v1/api list
  const pag = data?.data?.params?.pagination;
  if (pag) {
    const totalItems = pag.totalItems || 0;
    const limit = pag.totalItemsPerPage || fallbackLimit;
    const totalPages = pag.totalPages || Math.ceil(totalItems / limit) || 1;
    return {
      totalItems,
      totalPages,
      currentPage: pag.currentPage || 1
    };
  }

  return {
    totalItems: 0,
    totalPages: 1,
    currentPage: 1
  };
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
    console.error(`API Fetch Error [${apiSource}]:`, error);
    if (onLogResponse) {
      onLogResponse({ error: error.message });
    }
    throw error;
  }
}

// Unified coordinator for homepage movies
export async function fetchUnifiedNewMovies(page = 1) {
  const sources = ['phimapi', 'ophim', 'nguonc'];
  const promises = [
    fetchAPI('/danh-sach/phim-moi-cap-nhat?page=' + page, 'phimapi').catch(() => null),
    fetchAPI('/danh-sach/phim-moi-cap-nhat?page=' + page, 'ophim').catch(() => null),
    fetchAPI('/films/phim-moi-cap-nhat?page=' + page, 'nguonc').catch(() => null)
  ];

  const results = await Promise.all(promises);
  let mergedItems = [];
  let maxPages = 1;

  results.forEach((res, idx) => {
    if (!res) return;
    const src = sources[idx];
    const rawItems = res.items || [];
    const normalized = rawItems.map(item => normalizeMovieItem(item, src)).filter(Boolean);
    mergedItems = [...mergedItems, ...normalized];

    const pag = normalizePagination(res, src);
    if (pag.totalPages > maxPages) {
      maxPages = pag.totalPages;
    }
  });

  // Deduplicate by slug
  const seen = new Set();
  mergedItems = mergedItems.filter(item => {
    if (seen.has(item.slug)) return false;
    seen.add(item.slug);
    return true;
  });

  // Sort by update date (newest first)
  mergedItems.sort((a, b) => {
    const timeA = new Date(a.modified?.time || a.modified || 0);
    const timeB = new Date(b.modified?.time || b.modified || 0);
    return timeB - timeA;
  });

  return {
    items: mergedItems,
    pagination: {
      totalPages: maxPages,
      currentPage: page
    }
  };
}

// Unified coordinator for category list items
export async function fetchUnifiedCategory(type, page = 1, year = '', genre = '', country = '') {
  const sources = ['phimapi', 'ophim', 'nguonc'];
  
  const getEndpoint = (src) => {
    if (src === 'nguonc') {
      if (genre) {
        return `/films/the-loai/${genre}?page=${page}`;
      }
      if (country) {
        return `/films/quoc-gia/${country}?page=${page}`;
      }
      if (type && type !== 'phim-moi-cap-nhat') {
        return `/films/danh-sach/${type}?page=${page}`;
      }
      return `/films/phim-moi-cap-nhat?page=${page}`;
    }
    // phimapi / ophim
    if (genre) {
      return `/v1/api/the-loai/${genre}?page=${page}`;
    }
    if (country) {
      return `/v1/api/quoc-gia/${country}?page=${page}`;
    }
    if (type && type !== 'phim-moi-cap-nhat') {
      return `/v1/api/danh-sach/${type}?page=${page}&year=${year}`;
    }
    return `/danh-sach/phim-moi-cap-nhat?page=${page}`;
  };

  const promises = sources.map(src => {
    const ep = getEndpoint(src);
    return fetchAPI(ep, src, false).catch(() => null);
  });

  const results = await Promise.all(promises);
  let mergedItems = [];
  let maxPages = 1;

  results.forEach((res, idx) => {
    if (!res) return;
    const src = sources[idx];
    let rawItems = [];
    
    if (src === 'nguonc') {
      rawItems = res.items || [];
    } else {
      rawItems = res.data?.items || [];
    }

    const normalized = rawItems.map(item => normalizeMovieItem(item, src)).filter(Boolean);
    mergedItems = [...mergedItems, ...normalized];

    const pag = normalizePagination(res, src);
    if (pag.totalPages > maxPages) {
      maxPages = pag.totalPages;
    }
  });

  // Manual frontend filter by year if specified
  if (year) {
    const yInt = parseInt(year);
    mergedItems = mergedItems.filter(item => item.year === yInt);
  }

  // Deduplicate by slug
  const seen = new Set();
  mergedItems = mergedItems.filter(item => {
    if (seen.has(item.slug)) return false;
    seen.add(item.slug);
    return true;
  });

  return {
    data: {
      items: mergedItems,
      params: {
        pagination: {
          totalPages: maxPages,
          currentPage: page
        }
      }
    }
  };
}

// Unified coordinator for search queries
export async function fetchUnifiedSearch(keyword, page = 1) {
  const sources = ['phimapi', 'ophim', 'nguonc'];
  
  const getEndpoint = (src) => {
    if (src === 'nguonc') {
      return `/films/search?keyword=${encodeURIComponent(keyword)}&page=${page}`;
    }
    return `/v1/api/tim-kiem?keyword=${encodeURIComponent(keyword)}&page=${page}`;
  };

  const promises = sources.map(src => {
    const ep = getEndpoint(src);
    return fetchAPI(ep, src, false).catch(() => null);
  });

  const results = await Promise.all(promises);
  let mergedItems = [];
  let maxPages = 1;
  let totalItemsCount = 0;

  results.forEach((res, idx) => {
    if (!res) return;
    const src = sources[idx];
    let rawItems = [];
    
    if (src === 'nguonc') {
      rawItems = res.items || [];
    } else {
      rawItems = res.data?.items || [];
    }

    const normalized = rawItems.map(item => normalizeMovieItem(item, src)).filter(Boolean);
    mergedItems = [...mergedItems, ...normalized];

    const pag = normalizePagination(res, src);
    totalItemsCount += pag.totalItems;
    if (pag.totalPages > maxPages) {
      maxPages = pag.totalPages;
    }
  });

  // Deduplicate by slug
  const seen = new Set();
  mergedItems = mergedItems.filter(item => {
    if (seen.has(item.slug)) return false;
    seen.add(item.slug);
    return true;
  });

  return {
    data: {
      items: mergedItems,
      params: {
        pagination: {
          totalPages: maxPages,
          currentPage: page,
          totalItems: totalItemsCount
        }
      }
    }
  };
}

// Unified coordinator for metadata details (category, actors, directors)
export async function fetchUnifiedDetail(slug) {
  const sources = ['phimapi', 'ophim', 'nguonc'];
  
  const getEndpoint = (src) => {
    if (src === 'nguonc') {
      return `/film/${slug}`;
    }
    return `/phim/${slug}`;
  };

  const promises = sources.map(src => {
    const ep = getEndpoint(src);
    return fetchAPI(ep, src, false).catch(() => null);
  });

  const results = await Promise.all(promises);
  
  let primaryMovie = null;
  let allEpisodes = [];

  results.forEach((res, idx) => {
    if (!res || !res.movie) return;
    const src = sources[idx];
    const rawMovie = res.movie;
    
    // Normalize detail fields for standard components representation
    let actorList = [];
    if (src === 'nguonc') {
      actorList = typeof rawMovie.casts === 'string' ? rawMovie.casts.split(',').map(s => s.trim()) : [];
    } else {
      actorList = Array.isArray(rawMovie.actor) ? rawMovie.actor : [];
    }

    let directorList = [];
    if (src === 'nguonc') {
      directorList = typeof rawMovie.director === 'string' ? rawMovie.director.split(',').map(s => s.trim()) : [];
    } else {
      directorList = Array.isArray(rawMovie.director) ? rawMovie.director : [];
    }

    let categoryList = [];
    if (src === 'nguonc') {
      if (rawMovie.category && typeof rawMovie.category === 'object') {
        Object.values(rawMovie.category).forEach(grp => {
          const groupName = String(grp?.group?.name || '').toLowerCase();
          if (groupName === 'thể loại' || groupName === 'the loai') {
            categoryList = (grp.list || []).map(cat => ({
              name: cat.name,
              slug: cat.slug || cat.name.toLowerCase().replace(/ /g, '-')
            }));
          }
        });
      }
    } else {
      categoryList = Array.isArray(rawMovie.category) ? rawMovie.category : [];
    }

    let countryList = [];
    if (src === 'nguonc') {
      if (rawMovie.category && typeof rawMovie.category === 'object') {
        Object.values(rawMovie.category).forEach(grp => {
          const groupName = String(grp?.group?.name || '').toLowerCase();
          if (groupName === 'quốc gia' || groupName === 'quoc gia') {
            countryList = (grp.list || []).map(c => ({
              name: c.name,
              slug: c.slug || c.name.toLowerCase().replace(/ /g, '-')
            }));
          }
        });
      }
    } else {
      countryList = Array.isArray(rawMovie.country) ? rawMovie.country : [];
    }

    const movieDetail = {
      name: rawMovie.name || '',
      slug: rawMovie.slug || '',
      origin_name: rawMovie.origin_name || rawMovie.original_name || '',
      content: rawMovie.content || rawMovie.description || 'Chưa có tóm tắt.',
      poster_url: rawMovie.poster_url || rawMovie.thumb_url || '',
      thumb_url: rawMovie.thumb_url || rawMovie.poster_url || '',
      year: parseInt(rawMovie.year) || 2026,
      time: rawMovie.time || 'N/A',
      episode_current: rawMovie.episode_current || rawMovie.current_episode || 'N/A',
      episode_total: rawMovie.episode_total || rawMovie.total_episodes || 'N/A',
      quality: rawMovie.quality || 'HD',
      lang: rawMovie.lang || rawMovie.language || 'Vietsub',
      actor: actorList,
      director: directorList,
      category: categoryList,
      country: countryList,
      apiSource: src
    };

    if (!primaryMovie) {
      primaryMovie = movieDetail;
    }

    // Merge episodes mapping
    const rawEpisodes = res.episodes || [];
    if (src === 'nguonc') {
      // Nguồn C formats is episodes: [ { server_name, items: [ { name, slug, embed, m3u8 } ] } ]
      rawEpisodes.forEach(server => {
        const serverName = `${server.server_name || 'Nguồn C'} (Nguồn C)`;
        const serverItems = (server.items || []).map(ep => ({
          name: ep.name || '',
          slug: ep.slug || '',
          filename: ep.name || '',
          link_embed: ep.embed || ep.link_embed || '',
          link_m3u8: ep.m3u8 || ep.link_m3u8 || ''
        }));
        if (serverItems.length > 0) {
          allEpisodes.push({
            server_name: serverName,
            server_data: serverItems
          });
        }
      });
    } else {
      // PhimAPI / OPhim is: [ { server_name, server_data: [ { name, slug, filename, link_embed, link_m3u8 } ] } ]
      rawEpisodes.forEach(server => {
        const serverSuffix = src === 'phimapi' ? 'PhimAPI' : 'OPhim';
        const serverName = `${server.server_name || 'Mặc định'} (${serverSuffix})`;
        const serverItems = (server.server_data || []).map(ep => ({
          name: ep.name || '',
          slug: ep.slug || '',
          filename: ep.filename || ep.name || '',
          link_embed: ep.link_embed || '',
          link_m3u8: ep.link_m3u8 || ''
        }));
        if (serverItems.length > 0) {
          allEpisodes.push({
            server_name: serverName,
            server_data: serverItems
          });
        }
      });
    }
  });

  if (!primaryMovie) {
    throw new Error('Không tìm thấy thông tin phim.');
  }

  return {
    movie: primaryMovie,
    episodes: allEpisodes
  };
}

// Fetch single-source genres & countries lists (PhimAPI is the most complete metadata source)
export async function fetchMetadataList(endpoint) {
  try {
    return await fetchAPI(endpoint, 'phimapi', false);
  } catch {
    // Fallback to OPhim if PhimAPI fails
    return await fetchAPI(endpoint, 'ophim', false);
  }
}

// ==========================================================================
// TMDB IMAGE RESOLUTION & SEARCH FALLBACK
// ==========================================================================

const TMDB_API_KEYS = [
  '3fd2be3f0f70a115659b856729b4e546',
  '844dba0bfd8f3a2eb86c1f2de6e8ab9e',
  'a7d368411c858e4bcd454e58362ad0f8'
];

const bannerCache = {};
const posterCache = {};

async function fetchFromTMDB(urlPath) {
  for (const key of TMDB_API_KEYS) {
    try {
      const separator = urlPath.includes('?') ? '&' : '?';
      const targetUrl = `https://api.themoviedb.org/3/${urlPath}${separator}api_key=${key}&language=vi-VN`;
      
      let res;
      try {
        res = await fetch(targetUrl);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      } catch (directErr) {
        console.warn(`Direct TMDB fetch failed for path ${urlPath}, trying CORS proxy...`, directErr);
        // Fallback to CORS proxy
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
        res = await fetch(proxyUrl);
      }
      
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn(`TMDB fetch error for key ${key} and path ${urlPath}:`, e);
    }
  }
  return null;
}

export async function getHighQualityBanner(movie) {
  if (!movie) return '/default-banner.png';
  const cacheKey = movie.slug;
  if (bannerCache[cacheKey]) return bannerCache[cacheKey];

  // Try direct ID lookup if tmdb ID exists
  if (movie.tmdb?.id) {
    const type = (movie.tmdb.type === 'tv' || movie.tmdb.type === 'series') ? 'tv' : 'movie';
    const data = await fetchFromTMDB(`${type}/${movie.tmdb.id}`);
    if (data?.backdrop_path) {
      const url = `https://image.tmdb.org/t/p/w1280${data.backdrop_path}`;
      bannerCache[cacheKey] = url;
      return url;
    }
  }

  // Fallback to text search
  const query = movie.origin_name || movie.name;
  if (query) {
    const year = movie.year;
    // Clean query (e.g. remove "Interview with the Vampire Season 3" parentheses/suffixes)
    const cleanQuery = query.replace(/\(.*?\)/g, '').split('Season')[0].trim();
    const data = await fetchFromTMDB(`search/multi?query=${encodeURIComponent(cleanQuery)}`);
    const results = data?.results || [];
    
    // Find result with matching title and approximate year
    let match = results.find(item => {
      const relDate = item.release_date || item.first_air_date;
      if (!relDate) return false;
      const itemYear = new Date(relDate).getFullYear();
      return !year || Math.abs(itemYear - year) <= 1;
    });

    if (!match && results.length > 0) {
      match = results.find(item => item.backdrop_path);
    }
    if (!match && results.length > 0) {
      match = results[0];
    }

    if (match?.backdrop_path) {
      const url = `https://image.tmdb.org/t/p/w1280${match.backdrop_path}`;
      bannerCache[cacheKey] = url;
      return url;
    }
  }

  // Final fallback to the original API's landscape thumbnail
  const fallback = fixBackdropURL(movie.thumb_url || movie.poster_url, movie.apiSource);
  bannerCache[cacheKey] = fallback;
  return fallback;
}

export async function getHighQualityPoster(movie) {
  if (!movie) return '/default-poster.png';
  const cacheKey = movie.slug;
  if (posterCache[cacheKey]) return posterCache[cacheKey];

  // Try direct ID lookup if tmdb ID exists
  if (movie.tmdb?.id) {
    const type = (movie.tmdb.type === 'tv' || movie.tmdb.type === 'series') ? 'tv' : 'movie';
    const data = await fetchFromTMDB(`${type}/${movie.tmdb.id}`);
    if (data?.poster_path) {
      const url = `https://image.tmdb.org/t/p/w500${data.poster_path}`;
      posterCache[cacheKey] = url;
      return url;
    }
  }

  // Fallback to text search
  const query = movie.origin_name || movie.name;
  if (query) {
    const year = movie.year;
    const cleanQuery = query.replace(/\(.*?\)/g, '').split('Season')[0].trim();
    const data = await fetchFromTMDB(`search/multi?query=${encodeURIComponent(cleanQuery)}`);
    const results = data?.results || [];

    let match = results.find(item => {
      const relDate = item.release_date || item.first_air_date;
      if (!relDate) return false;
      const itemYear = new Date(relDate).getFullYear();
      return !year || Math.abs(itemYear - year) <= 1;
    });

    if (!match && results.length > 0) {
      match = results.find(item => item.poster_path);
    }
    if (!match && results.length > 0) {
      match = results[0];
    }

    if (match?.poster_path) {
      const url = `https://image.tmdb.org/t/p/w500${match.poster_path}`;
      posterCache[cacheKey] = url;
      return url;
    }
  }

  const fallback = fixImageURL(movie.poster_url || movie.thumb_url, movie.apiSource);
  posterCache[cacheKey] = fallback;
  return fallback;
}

