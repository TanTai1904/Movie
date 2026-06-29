import Hls from 'hls.js';

// ==========================================================================
// STUDYFLIX - APPLICATION LOGIC & STATE
// ==========================================================================

let apiSource = localStorage.getItem('studyflix_api_source') || 'phimapi';

function getAPIBase() {
  return apiSource === 'ophim' ? 'https://ophim1.com' : 'https://phimapi.com';
}

// App State
const state = {
  watchlist: JSON.parse(localStorage.getItem('studyflix_watchlist')) || [],
  history: JSON.parse(localStorage.getItem('studyflix_history')) || [],
  currentMovie: null,
  currentEpisode: null,
  currentServer: 'hls', // 'hls' or 'embed'
  genres: [],
  countries: [],
  currentPage: 1,
  totalItems: 0,
  totalPages: 1,
  hlsInstance: null
};

// --- API Client with Logging for Dev Panel ---
async function fetchAPI(endpoint, isFullURL = false) {
  const url = isFullURL ? endpoint : `${getAPIBase()}${endpoint}`;
  logAPIRequest('GET', url);
  
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    logAPIResponse(data);
    return data;
  } catch (error) {
    console.error('API Fetch Error:', error);
    logAPIResponse({ error: error.message });
    throw error;
  }
}

// Logging for Developer Console
function logAPIRequest(method, url) {
  const methodEl = document.getElementById('dev-api-method');
  const urlEl = document.getElementById('dev-api-url');
  const openUrlEl = document.getElementById('dev-open-url');
  
  if (methodEl) methodEl.textContent = method;
  if (urlEl) urlEl.textContent = url;
  if (openUrlEl) {
    openUrlEl.href = url;
    openUrlEl.classList.remove('hidden');
  }
}

function logAPIResponse(data) {
  const jsonDisplay = document.getElementById('dev-json-display');
  if (!jsonDisplay) return;

  // Format JSON beautifully
  let displayData = data;
  
  // Truncate list size in dev view to avoid lagging the UI
  if (data && Array.isArray(data.items)) {
    displayData = {
      ...data,
      items: data.items.slice(0, 3).map(item => ({
        ...item,
        name: item.name,
        origin_name: item.origin_name,
        slug: item.slug,
        year: item.year,
        _id: item._id,
        comment: "... [truncated list in dev view for performance]"
      }))
    };
  }

  jsonDisplay.textContent = JSON.stringify(displayData, null, 2);
}

// --- LocalStorage Watchlist & History Operations ---
function updateWatchlistBadge() {
  const badges = document.querySelectorAll('.badge-favs');
  badges.forEach(b => {
    b.textContent = state.watchlist.length;
    if (state.watchlist.length > 0) {
      b.classList.remove('hidden');
    } else {
      b.classList.add('hidden');
    }
  });
}

function toggleWatchlist(movie) {
  const index = state.watchlist.findIndex(m => m.slug === movie.slug);
  if (index > -1) {
    state.watchlist.splice(index, 1);
  } else {
    state.watchlist.push({
      name: movie.name,
      origin_name: movie.origin_name,
      slug: movie.slug,
      poster_url: movie.poster_url,
      thumb_url: movie.thumb_url,
      year: movie.year
    });
  }
  localStorage.setItem('studyflix_watchlist', JSON.stringify(state.watchlist));
  updateWatchlistBadge();
  updateFavBtnUI(movie.slug);
}

function updateFavBtnUI(slug) {
  const isFav = state.watchlist.some(m => m.slug === slug);
  const favBtns = document.querySelectorAll('#btn-fav-detail, .btn-fav-hero');
  favBtns.forEach(btn => {
    if (isFav) {
      btn.innerHTML = `<i class='bx bxs-heart text-danger'></i> Đã Yêu Thích`;
      btn.classList.add('active');
    } else {
      btn.innerHTML = `<i class='bx bx-heart'></i> Yêu Thích`;
      btn.classList.remove('active');
    }
  });
}

function saveWatchHistory(movie, episode, currentTime, duration) {
  if (!movie || !episode || !duration) return;
  const progressPercent = Math.floor((currentTime / duration) * 100);
  
  const historyItem = {
    movieSlug: movie.slug,
    movieName: movie.name,
    movieOriginName: movie.origin_name,
    movieThumb: movie.thumb_url || movie.poster_url,
    episodeSlug: episode.slug,
    episodeName: episode.name,
    currentTime: currentTime,
    duration: duration,
    percent: progressPercent,
    updatedAt: new Date().toISOString()
  };

  // Remove existing entry for same movie
  state.history = state.history.filter(item => item.movieSlug !== movie.slug);
  state.history.unshift(historyItem);
  
  // Cap history at 30 items
  if (state.history.length > 30) state.history.pop();
  
  localStorage.setItem('studyflix_history', JSON.stringify(state.history));
}

function getMovieHistory(movieSlug) {
  return state.history.find(item => item.movieSlug === movieSlug);
}

// --- UI Skeleton Renderers ---
function showSkeleton(containerId, count = 10) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  let skeletonHtml = '';
  for (let i = 0; i < count; i++) {
    skeletonHtml += `<div class="skeleton-card"></div>`;
  }
  container.innerHTML = skeletonHtml;
}

// Convert image URL from relative to full if necessary
function fixImageURL(url) {
  if (!url) return 'https://placehold.co/300x450/1a1e24/66fcf1?text=No+Image';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  if (apiSource === 'ophim') {
    return `https://img.ophim.live/uploads/movies/${url}`;
  }
  return `https://phimimg.com/upload/vod/${url}`;
}

// --- Component Renderers ---
function buildMovieCardHTML(movie) {
  const coverUrl = fixImageURL(movie.poster_url || movie.thumb_url);
  const yearBadge = movie.year ? `<span class="card-badge-year">${movie.year}</span>` : '';
  
  return `
    <div class="movie-card" data-slug="${movie.slug}">
      <div class="movie-card-thumb-wrap">
        <img class="movie-card-thumb" src="${coverUrl}" alt="${movie.name}" loading="lazy">
        <div class="card-overlay">
          <i class="bx bx-play-circle"></i>
          <span class="card-overlay-btn">Xem chi tiết</span>
        </div>
        ${yearBadge}
      </div>
      <div class="movie-card-info">
        <h3 class="movie-card-title">${movie.name}</h3>
        <p class="movie-card-origin-title">${movie.origin_name || ''}</p>
      </div>
    </div>
  `;
}

function renderMoviesList(movies, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  if (!movies || movies.length === 0) {
    container.innerHTML = `<div class="empty-state"><i class="bx bx-confused"></i><p>Không tìm thấy phim nào phù hợp.</p></div>`;
    return;
  }
  
  container.innerHTML = movies.map(buildMovieCardHTML).join('');
  
  // Attach Event Listeners
  container.querySelectorAll('.movie-card').forEach(card => {
    card.addEventListener('click', () => {
      const slug = card.getAttribute('data-slug');
      window.location.hash = `#movie/${slug}`;
    });
  });
}

// --- Page & View Controller ---
function switchView(viewId) {
  // Hide all views
  document.querySelectorAll('.content-view').forEach(view => {
    view.classList.remove('active');
  });
  
  // Show selected view
  const targetView = document.getElementById(`view-${viewId}`);
  if (targetView) targetView.classList.add('active');
  
  // Update sidebar active state
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('data-nav') === viewId) {
      link.classList.add('active');
    }
  });

  // If returning to home or search, we might handle layout updates
  if (viewId !== 'watch') {
    destroyHLS();
  }
  
  // Smooth scroll main content to top
  const mainContent = document.querySelector('.main-content');
  if (mainContent) mainContent.scrollTop = 0;
}

// --- Load View Logic ---

// 1. Home View
async function loadHomeView() {
  switchView('home');
  showSkeleton('new-movies-grid', 10);
  showSkeleton('home-phim-le-grid', 5);
  showSkeleton('home-phim-bo-grid', 5);
  showSkeleton('home-hoat-hinh-grid', 5);
  showSkeleton('home-phim-chieu-rap-grid', 5);
  
  // 1. Load Newly Updated Movies (main paginated grid)
  try {
    const data = await fetchAPI(`/danh-sach/phim-moi-cap-nhat?page=${state.currentPage}`);
    const movies = data.items;
    
    // Render slider/hero with a random movie from this list
    if (movies && movies.length > 0) {
      const featuredMovie = movies[Math.floor(Math.random() * Math.min(5, movies.length))];
      loadHeroBanner(featuredMovie);
    }
    
    renderMoviesList(movies, 'new-movies-grid');
    
    // Update pagination
    state.totalPages = data.pagination.totalPages;
    updatePaginationUI();
  } catch (error) {
    document.getElementById('new-movies-grid').innerHTML = `<div class="empty-state"><i class="bx bx-error-circle text-danger"></i><p>Lỗi tải danh sách phim mới. Vui lòng kiểm tra kết nối mạng.</p></div>`;
  }

  // 2. Load Phim Lẻ (Top 5)
  fetchAPI('/v1/api/danh-sach/phim-le?page=1', false).then(res => {
    const items = res.data?.items?.slice(0, 5) || [];
    renderMoviesList(items, 'home-phim-le-grid');
  }).catch(e => {
    console.error("Error loading Phim Le:", e);
    document.getElementById('home-phim-le-grid').innerHTML = '<p class="text-muted">Lỗi tải danh sách phim lẻ.</p>';
  });

  // 3. Load Phim Bộ (Top 5)
  fetchAPI('/v1/api/danh-sach/phim-bo?page=1', false).then(res => {
    const items = res.data?.items?.slice(0, 5) || [];
    renderMoviesList(items, 'home-phim-bo-grid');
  }).catch(e => {
    console.error("Error loading Phim Bo:", e);
    document.getElementById('home-phim-bo-grid').innerHTML = '<p class="text-muted">Lỗi tải danh sách phim bộ.</p>';
  });

  // 4. Load Hoạt Hình / Anime (Top 5)
  fetchAPI('/v1/api/danh-sach/hoat-hinh?page=1', false).then(res => {
    const items = res.data?.items?.slice(0, 5) || [];
    renderMoviesList(items, 'home-hoat-hinh-grid');
  }).catch(e => {
    console.error("Error loading Hoat Hinh:", e);
    document.getElementById('home-hoat-hinh-grid').innerHTML = '<p class="text-muted">Lỗi tải danh sách hoạt hình.</p>';
  });

  // 5. Load Phim Chiếu Rạp (Top 5)
  fetchAPI('/v1/api/danh-sach/phim-chieu-rap?page=1', false).then(res => {
    const items = res.data?.items?.slice(0, 5) || [];
    renderMoviesList(items, 'home-phim-chieu-rap-grid');
  }).catch(e => {
    console.error("Error loading Phim Chieu Rap:", e);
    document.getElementById('home-phim-chieu-rap-grid').innerHTML = '<p class="text-muted">Lỗi tải danh sách phim chiếu rạp.</p>';
  });
}

async function loadHeroBanner(movie) {
  try {
    // We need complete details for the description and category tags
    const detailData = await fetchAPI(`/phim/${movie.slug}`);
    const fullMovie = detailData.movie;
    
    const bannerEl = document.getElementById('hero-banner');
    if (!bannerEl) return;
    
    bannerEl.style.backgroundImage = `url('${fixImageURL(fullMovie.poster_url || fullMovie.thumb_url)}')`;
    
    bannerEl.querySelector('.hero-title').textContent = fullMovie.name;
    bannerEl.querySelector('.hero-origin-name').textContent = fullMovie.origin_name || '';
    bannerEl.querySelector('.hero-year').innerHTML = `<i class="bx bx-calendar"></i> ${fullMovie.year || '2026'}`;
    bannerEl.querySelector('.hero-rating').innerHTML = `<i class="bx bxs-star text-gold"></i> ${fullMovie.tmdb?.vote_average || 'N/A'}`;
    bannerEl.querySelector('.hero-lang').textContent = fullMovie.lang || 'Vietsub';
    bannerEl.querySelector('.hero-description').textContent = fullMovie.content.replace(/<[^>]*>/g, ''); // strip HTML
    
    updateFavBtnUI(fullMovie.slug);
    
    // Wire Actions
    const playBtn = bannerEl.querySelector('.btn-play-hero');
    const favBtn = bannerEl.querySelector('.btn-fav-hero');
    
    playBtn.onclick = () => {
      window.location.hash = `#movie/${fullMovie.slug}`;
    };
    
    favBtn.onclick = () => {
      toggleWatchlist(fullMovie);
    };
  } catch (e) {
    console.error("Hero load error:", e);
  }
}

function updatePaginationUI() {
  const prevBtn = document.querySelector('.btn-prev-page');
  const nextBtn = document.querySelector('.btn-next-page');
  const pageIndicator = document.querySelector('.page-indicator');
  
  if (prevBtn) prevBtn.disabled = state.currentPage === 1;
  if (nextBtn) nextBtn.disabled = state.currentPage >= state.totalPages;
  if (pageIndicator) pageIndicator.textContent = `Trang ${state.currentPage} / ${state.totalPages}`;
}

// 2. Movie Detail View
async function loadDetailView(slug) {
  switchView('detail');
  
  // Clear layout placeholders
  document.getElementById('detail-title').textContent = 'Đang tải...';
  document.getElementById('detail-origin-title').textContent = '';
  document.getElementById('detail-content').textContent = 'Đang tải nội dung chi tiết...';
  document.getElementById('detail-poster').src = 'https://placehold.co/300x450/1a1e24/66fcf1?text=Loading';
  document.getElementById('detail-backdrop').style.backgroundImage = 'none';
  document.getElementById('detail-genres').innerHTML = '';
  document.getElementById('detail-episodes-grid').innerHTML = '';
  document.getElementById('detail-server-tabs').innerHTML = '';
  
  try {
    const data = await fetchAPI(`/phim/${slug}`);
    const movie = data.movie;
    movie.episodes = data.episodes;
    state.currentMovie = movie;
    
    // Set backdrop and posters
    document.getElementById('detail-backdrop').style.backgroundImage = `url('${fixImageURL(movie.poster_url || movie.thumb_url)}')`;
    document.getElementById('detail-poster').src = fixImageURL(movie.thumb_url || movie.poster_url);
    
    // Info details
    document.getElementById('detail-title').textContent = movie.name;
    document.getElementById('detail-origin-title').textContent = movie.origin_name || '';
    document.getElementById('detail-year').innerHTML = `<i class="bx bx-calendar"></i> ${movie.year || '--'}`;
    document.getElementById('detail-quality').innerHTML = `<i class="bx bx-badge"></i> ${movie.quality || 'HD'}`;
    document.getElementById('detail-time').innerHTML = `<i class="bx bx-time"></i> ${movie.time || '--'}`;
    document.getElementById('detail-episode-total').innerHTML = `<i class="bx bx-list-ol"></i> ${movie.episode_total || 'N/A'}`;
    
    document.getElementById('detail-content').innerHTML = movie.content || 'Không có mô tả nội dung cho phim này.';
    document.getElementById('detail-director').textContent = movie.director ? movie.director.join(', ') : 'Chưa cập nhật';
    document.getElementById('detail-country').textContent = movie.country ? movie.country.map(c => c.name).join(', ') : 'Chưa cập nhật';
    document.getElementById('detail-actors').textContent = movie.actor ? movie.actor.join(', ') : 'Chưa cập nhật';
    
    // Genres
    if (movie.category) {
      document.getElementById('detail-genres').innerHTML = movie.category.map(c => `<span class="genre-tag">${c.name}</span>`).join('');
    }
    
    // Render Episodes list
    renderEpisodesList(data.episodes, 'detail-server-tabs', 'detail-episodes-grid', slug);
    
    updateFavBtnUI(slug);
    
    // Wire detailed actions
    const favBtn = document.getElementById('btn-fav-detail');
    favBtn.onclick = () => toggleWatchlist(movie);
    
    const playNowBtn = document.querySelector('.btn-play-now');
    playNowBtn.onclick = () => {
      // Find the first episode available
      if (data.episodes && data.episodes.length > 0 && data.episodes[0].server_data.length > 0) {
        const firstEp = data.episodes[0].server_data[0];
        window.location.hash = `#watch/${slug}/${firstEp.slug}`;
      } else {
        alert("Hiện tại phim chưa cập nhật tập nào!");
      }
    };
  } catch (error) {
    document.getElementById('detail-title').textContent = 'Lỗi tải phim';
    document.getElementById('detail-content').textContent = 'Không thể tải được thông tin phim từ API.';
  }
}

function renderEpisodesList(episodes, serverTabId, episodeGridId, movieSlug, currentEpSlug = null) {
  const serverTabContainer = document.getElementById(serverTabId);
  const episodeGridContainer = document.getElementById(episodeGridId);
  
  if (!serverTabContainer || !episodeGridContainer) return;
  serverTabContainer.innerHTML = '';
  episodeGridContainer.innerHTML = '';
  
  if (!episodes || episodes.length === 0 || episodes[0].server_data.length === 0) {
    episodeGridContainer.innerHTML = `<div class="w-100 text-center text-muted py-3">Danh sách tập chưa được cập nhật.</div>`;
    return;
  }
  
  // 1. Render Server Tabs
  episodes.forEach((server, sIndex) => {
    const sBtn = document.createElement('button');
    sBtn.className = `server-tab-btn ${sIndex === 0 ? 'active' : ''}`;
    sBtn.textContent = server.server_name;
    sBtn.dataset.index = sIndex;
    
    sBtn.addEventListener('click', () => {
      serverTabContainer.querySelectorAll('.server-tab-btn').forEach(btn => btn.classList.remove('active'));
      sBtn.classList.add('active');
      renderEpisodesForServer(server.server_data, episodeGridContainer, movieSlug, currentEpSlug);
    });
    
    serverTabContainer.appendChild(sBtn);
  });
  
  // 2. Render initial server episodes
  renderEpisodesForServer(episodes[0].server_data, episodeGridContainer, movieSlug, currentEpSlug);
}

function renderEpisodesForServer(epList, container, movieSlug, currentEpSlug) {
  container.innerHTML = '';
  
  epList.forEach(ep => {
    const epBtn = document.createElement('button');
    epBtn.className = `btn-episode ${ep.slug === currentEpSlug ? 'active' : ''}`;
    epBtn.textContent = ep.name;
    epBtn.title = ep.filename;
    
    epBtn.addEventListener('click', () => {
      window.location.hash = `#watch/${movieSlug}/${ep.slug}`;
    });
    
    container.appendChild(epBtn);
  });
}

// 3. Watch View (Player View)
async function loadWatchView(slug, episodeSlug) {
  switchView('watch');
  
  // Show Loading Player
  document.getElementById('player-loading').classList.remove('hidden');
  document.getElementById('embed-player').classList.add('hidden');
  document.getElementById('hls-player-container').classList.add('hidden');
  destroyHLS();
  
  try {
    // Fetch movie details if not already loaded or if different
    if (!state.currentMovie || state.currentMovie.slug !== slug || !state.currentMovie.episodes) {
      const data = await fetchAPI(`/phim/${slug}`);
      state.currentMovie = data.movie;
      state.currentMovie.episodes = data.episodes;
    }
    
    const movie = state.currentMovie;
    const episodes = state.currentMovie.episodes;
    
    // Find selected episode
    let currentEpisode = null;
    let foundServerIndex = 0;
    
    for (let s = 0; s < episodes.length; s++) {
      const ep = episodes[s].server_data.find(e => e.slug === episodeSlug);
      if (ep) {
        currentEpisode = ep;
        foundServerIndex = s;
        break;
      }
    }
    
    // Fallback to first episode if not found
    if (!currentEpisode && episodes.length > 0 && episodes[0].server_data.length > 0) {
      currentEpisode = episodes[0].server_data[0];
      episodeSlug = currentEpisode.slug;
    }
    
    if (!currentEpisode) {
      throw new Error("Không tìm thấy tập phim tương ứng.");
    }
    
    state.currentEpisode = currentEpisode;
    
    // Render Watch UI Headers
    document.getElementById('watch-movie-title').textContent = movie.name;
    document.getElementById('watch-episode-title').textContent = `Đang Xem: ${currentEpisode.name} (${episodes[foundServerIndex].server_name})`;
    
    // Render episode list in watch view
    renderEpisodesList(episodes, 'watch-server-tabs', 'watch-episodes-grid', slug, episodeSlug);
    
    // Initialize stream
    initializeVideoPlayer(currentEpisode);
    
    // Load watch-related list (fetch new movies as recommendations)
    loadRelatedMovies();
  } catch (error) {
    console.error("Watch load error:", error);
    document.getElementById('player-loading').innerHTML = `<i class="bx bx-error-circle text-danger" style="font-size:40px;"></i><p class="mt-2">Lỗi tải tập phim hoặc lỗi đường dẫn phát.</p>`;
  }
}

function initializeVideoPlayer(episode) {
  const selectServerMode = document.getElementById('server-mode-select');
  const activeMode = selectServerMode ? selectServerMode.value : 'hls';
  state.currentServer = activeMode;
  
  const iframe = document.getElementById('embed-player');
  const hlsContainer = document.getElementById('hls-player-container');
  const loading = document.getElementById('player-loading');
  const video = document.getElementById('hls-video');
  
  loading.classList.add('hidden');
  
  if (activeMode === 'embed') {
    // Hide HLS Player, Show Iframe Embed
    destroyHLS();
    hlsContainer.classList.add('hidden');
    iframe.classList.remove('hidden');
    iframe.src = episode.link_embed;
  } else {
    // Hide Iframe Embed, Show HLS Custom Video Player
    iframe.classList.add('hidden');
    iframe.src = '';
    hlsContainer.classList.remove('hidden');
    
    setupHLSStream(episode.link_m3u8, video);
  }
}

function setupHLSStream(m3u8Url, videoElement) {
  destroyHLS();
  
  if (!m3u8Url) {
    alert("Không tìm thấy đường dẫn luồng HLS (M3U8). Vui lòng đổi sang Server Nhúng.");
    return;
  }

  // Load and Resume playback from history
  const savedHistory = getMovieHistory(state.currentMovie.slug);
  const startOffset = (savedHistory && savedHistory.episodeSlug === state.currentEpisode.slug) ? savedHistory.currentTime : 0;
  
  if (Hls.isSupported()) {
    const hls = new Hls({
      enableWorker: true,
      maxBufferLength: 30,
      lowLatencyMode: true
    });
    
    state.hlsInstance = hls;
    hls.loadSource(m3u8Url);
    hls.attachMedia(videoElement);
    
    hls.on(Hls.Events.MANIFEST_PARSED, function() {
      if (startOffset > 5) {
        videoElement.currentTime = startOffset;
      }
      videoElement.play().catch(e => console.log("Auto-play blocked, user action required."));
    });
    
    hls.on(Hls.Events.ERROR, function(event, data) {
      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            console.error('Fatal network error encountered, trying to recover...');
            hls.startLoad();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            console.error('Fatal media error encountered, trying to recover...');
            hls.recoverMediaError();
            break;
          default:
            console.error('Fatal error, cannot recover. Fallback to iframe recommended.');
            destroyHLS();
            break;
        }
      }
    });
  }
  // Native HLS support (Safari)
  else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
    videoElement.src = m3u8Url;
    videoElement.addEventListener('loadedmetadata', function() {
      if (startOffset > 5) {
        videoElement.currentTime = startOffset;
      }
      videoElement.play();
    });
  } else {
    alert("Trình duyệt của bạn không hỗ trợ phát luồng video HLS. Vui lòng chuyển sang Server Nhúng!");
  }

  // Track playback updates for History
  const onTimeUpdate = () => {
    if (videoElement.duration) {
      saveWatchHistory(
        state.currentMovie,
        state.currentEpisode,
        videoElement.currentTime,
        videoElement.duration
      );
    }
  };

  videoElement.removeEventListener('timeupdate', onTimeUpdate);
  videoElement.addEventListener('timeupdate', onTimeUpdate);
}

function destroyHLS() {
  if (state.hlsInstance) {
    state.hlsInstance.destroy();
    state.hlsInstance = null;
  }
  const video = document.getElementById('hls-video');
  if (video) {
    video.pause();
    video.removeAttribute('src');
    video.load();
  }
}

async function loadRelatedMovies() {
  const container = document.getElementById('watch-related-list');
  if (!container) return;
  container.innerHTML = '<div class="text-center text-muted">Đang tải...</div>';
  
  try {
    const data = await fetchAPI('/danh-sach/phim-moi-cap-nhat?page=2');
    const movies = data.items.slice(0, 6);
    
    container.innerHTML = movies.map(movie => `
      <div class="sidebar-movie-item" data-slug="${movie.slug}">
        <img class="sidebar-movie-thumb" src="${fixImageURL(movie.poster_url || movie.thumb_url)}" alt="${movie.name}">
        <div class="sidebar-movie-info">
          <h4 class="sidebar-movie-title">${movie.name}</h4>
          <p class="sidebar-movie-origin">${movie.origin_name || ''}</p>
          <span class="sidebar-movie-meta">${movie.year} • Vietsub</span>
        </div>
      </div>
    `).join('');
    
    container.querySelectorAll('.sidebar-movie-item').forEach(item => {
      item.addEventListener('click', () => {
        const slug = item.getAttribute('data-slug');
        window.location.hash = `#movie/${slug}`;
      });
    });
  } catch (e) {
    container.innerHTML = '<div class="text-muted text-center">Không thể tải đề xuất.</div>';
  }
}

// 4. Filters & Categories View
async function loadFilterView(type = 'phim-moi-cap-nhat') {
  switchView('filter');
  
  // Set type value
  const typeSelect = document.getElementById('filter-type');
  if (typeSelect) typeSelect.value = type;

  showSkeleton('filter-movies-grid', 10);
  
  // Load meta dropdown filters once
  if (state.genres.length === 0 || state.countries.length === 0) {
    try {
      const genresData = await fetchAPI('/the-loai');
      state.genres = Array.isArray(genresData) ? genresData : (genresData.value || []);
      populateSelect('filter-genre', state.genres, 'Tất Cả Thể Loại');
      
      const countriesData = await fetchAPI('/quoc-gia');
      state.countries = Array.isArray(countriesData) ? countriesData : (countriesData.value || []);
      populateSelect('filter-country', state.countries, 'Tất Cả Quốc Gia');
      
      // Populate Years Filter
      const yearSelect = document.getElementById('filter-year');
      if (yearSelect) {
        let yearsHTML = '<option value="">Tất Cả Năm</option>';
        const currentYear = new Date().getFullYear();
        for (let y = currentYear; y >= 2010; y--) {
          yearsHTML += `<option value="${y}">${y}</option>`;
        }
        yearSelect.innerHTML = yearsHTML;
      }
    } catch (e) {
      console.error("Meta filters load error:", e);
    }
  }
  
  await executeFilterQuery(1);
}

function populateSelect(selectId, items, defaultLabel) {
  const select = document.getElementById(selectId);
  if (!select) return;
  
  let html = `<option value="">${defaultLabel}</option>`;
  items.forEach(item => {
    html += `<option value="${item.slug}">${item.name}</option>`;
  });
  select.innerHTML = html;
}

async function executeFilterQuery(page = 1) {
  state.currentPage = page;
  showSkeleton('filter-movies-grid', 10);
  
  const type = document.getElementById('filter-type').value;
  const genre = document.getElementById('filter-genre').value;
  const country = document.getElementById('filter-country').value;
  const year = document.getElementById('filter-year').value;
  
  let endpoint = '';
  let isFullURL = false;
  
  // Define endpoint path depending on combination
  // phimapi.com filters endpoint logic:
  if (genre) {
    endpoint = `${getAPIBase()}/v1/api/the-loai/${genre}?page=${page}`;
    isFullURL = true;
  } else if (country) {
    endpoint = `${getAPIBase()}/v1/api/quoc-gia/${country}?page=${page}`;
    isFullURL = true;
  } else if (type && type !== 'phim-moi-cap-nhat') {
    endpoint = `${getAPIBase()}/v1/api/danh-sach/${type}?page=${page}&year=${year}`;
    isFullURL = true;
  } else {
    endpoint = `/danh-sach/phim-moi-cap-nhat?page=${page}`;
    isFullURL = false;
  }
  
  try {
    const data = await fetchAPI(endpoint, isFullURL);
    let movies = [];
    
    if (isFullURL) {
      // V1 categories response wrapping format
      movies = data.data?.items || [];
      state.totalPages = data.data?.params?.pagination?.totalPages || 1;
    } else {
      // phim-moi-cap-nhat format
      movies = data.items || [];
      state.totalPages = data.pagination?.totalPages || 1;
    }
    
    // Handle manual frontend filtering of year if not supported by endpoint
    if (year && (genre || country)) {
      movies = movies.filter(m => m.year === parseInt(year));
    }
    
    document.getElementById('filter-results-title').textContent = `Kết Quả Lọc (${movies.length} Phim)`;
    renderMoviesList(movies, 'filter-movies-grid');
    updateFilterPaginationUI();
  } catch (error) {
    console.error("Filter request error:", error);
    document.getElementById('filter-movies-grid').innerHTML = `<div class="empty-state"><i class="bx bx-error-circle text-danger"></i><p>Lỗi thực hiện truy vấn lọc từ API.</p></div>`;
  }
}

function updateFilterPaginationUI() {
  const prevBtn = document.querySelector('.btn-prev-filter');
  const nextBtn = document.querySelector('.btn-next-filter');
  const indicator = document.querySelector('.filter-page-indicator');
  
  if (prevBtn) prevBtn.disabled = state.currentPage === 1;
  if (nextBtn) nextBtn.disabled = state.currentPage >= state.totalPages;
  if (indicator) indicator.textContent = `Trang ${state.currentPage} / ${state.totalPages}`;
}

// 5. Search Results View
async function loadSearchView(keyword) {
  switchView('filter'); // Search uses the grid elements on filter page for clean display
  document.getElementById('filter-results-title').textContent = `Đang Tìm Kiếm: "${keyword}"`;
  showSkeleton('filter-movies-grid', 10);
  
  try {
    const data = await fetchAPI(`/v1/api/tim-kiem?keyword=${encodeURIComponent(keyword)}&page=1`);
    const movies = data.data?.items || [];
    state.totalPages = data.data?.params?.pagination?.totalPages || 1;
    state.currentPage = 1;
    
    document.getElementById('filter-results-title').textContent = `Kết Quả Tìm Kiếm Cho: "${keyword}" (${data.data?.params?.pagination?.totalItems || movies.length} kết quả)`;
    renderMoviesList(movies, 'filter-movies-grid');
    updateFilterPaginationUI();
    
    // Wire Search page changes to search execution
    document.querySelector('.btn-prev-filter').onclick = () => executeSearchPage(keyword, state.currentPage - 1);
    document.querySelector('.btn-next-filter').onclick = () => executeSearchPage(keyword, state.currentPage + 1);
  } catch (error) {
    document.getElementById('filter-movies-grid').innerHTML = `<div class="empty-state"><i class="bx bx-x-circle text-danger"></i><p>Lỗi kết nối khi tìm kiếm.</p></div>`;
  }
}

async function executeSearchPage(keyword, page) {
  if (page < 1 || page > state.totalPages) return;
  state.currentPage = page;
  showSkeleton('filter-movies-grid', 10);
  
  try {
    const data = await fetchAPI(`/v1/api/tim-kiem?keyword=${encodeURIComponent(keyword)}&page=${page}`);
    const movies = data.data?.items || [];
    renderMoviesList(movies, 'filter-movies-grid');
    updateFilterPaginationUI();
  } catch (e) {
    console.error("Search page pagination error:", e);
  }
}

// 6. Favorites View (Watchlist)
function loadFavoritesView() {
  switchView('favorites');
  const container = document.getElementById('favorites-grid');
  const emptyEl = document.getElementById('favorites-empty');
  
  if (state.watchlist.length === 0) {
    container.innerHTML = '';
    emptyEl.classList.remove('hidden');
  } else {
    emptyEl.classList.add('hidden');
    renderMoviesList(state.watchlist, 'favorites-grid');
  }
}

// 7. History View
function loadHistoryView() {
  switchView('history');
  renderHistoryList();
}

function renderHistoryList() {
  const container = document.getElementById('history-list');
  const emptyEl = document.getElementById('history-empty');
  
  if (state.history.length === 0) {
    container.innerHTML = '';
    emptyEl.classList.remove('hidden');
  } else {
    emptyEl.classList.add('hidden');
    
    container.innerHTML = state.history.map(item => {
      const timeDate = new Date(item.updatedAt).toLocaleString('vi-VN', {
        hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit'
      });
      
      return `
        <div class="history-item" data-movie-slug="${item.movieSlug}" data-ep-slug="${item.episodeSlug}">
          <img class="history-thumb" src="${fixImageURL(item.movieThumb)}" alt="${item.movieName}">
          <div class="history-info">
            <h4 class="history-title">${item.movieName}</h4>
            <span class="history-episode">Tập tiếp theo: ${item.episodeName}</span>
            <span class="history-time"><i class="bx bx-time-five"></i> Xem lúc: ${timeDate}</span>
            <div class="history-percent-bar-container">
              <div class="history-percent-bar" style="width: ${item.percent}%"></div>
            </div>
          </div>
          <button class="btn-remove-history" data-movie-slug="${item.movieSlug}" title="Xóa lịch sử phim này">
            <i class="bx bx-trash"></i>
          </button>
        </div>
      `;
    }).join('');
    
    // History Click Listeners
    container.querySelectorAll('.history-item').forEach(el => {
      el.addEventListener('click', (e) => {
        // Skip click event if trash button was clicked
        if (e.target.closest('.btn-remove-history')) return;
        
        const mSlug = el.dataset.movieSlug;
        const eSlug = el.dataset.epSlug;
        window.location.hash = `#watch/${mSlug}/${eSlug}`;
      });
    });
    
    // Trash items logic
    container.querySelectorAll('.btn-remove-history').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const mSlug = btn.dataset.movieSlug;
        state.history = state.history.filter(item => item.movieSlug !== mSlug);
        localStorage.setItem('studyflix_history', JSON.stringify(state.history));
        renderHistoryList();
      });
    });
  }
}

// --- URL Router parsing logic ---
function router() {
  const hash = window.location.hash || '#home';
  
  if (hash === '#home') {
    state.currentPage = 1;
    loadHomeView();
  } else if (hash === '#phim-le') {
    loadFilterView('phim-le');
  } else if (hash === '#phim-bo') {
    loadFilterView('phim-bo');
  } else if (hash === '#hoat-hinh') {
    loadFilterView('hoat-hinh');
  } else if (hash === '#phim-chieu-rap') {
    loadFilterView('phim-chieu-rap');
  } else if (hash === '#tv-shows') {
    loadFilterView('tv-shows');
  } else if (hash === '#danh-muc') {
    loadFilterView();
  } else if (hash === '#favorites') {
    loadFavoritesView();
  } else if (hash === '#history') {
    loadHistoryView();
  } else if (hash.startsWith('#movie/')) {
    const slug = hash.replace('#movie/', '');
    loadDetailView(slug);
  } else if (hash.startsWith('#watch/')) {
    // Hash format: #watch/movie-slug/episode-slug
    const parts = hash.replace('#watch/', '').split('/');
    const slug = parts[0];
    const episodeSlug = parts[1] || '';
    loadWatchView(slug, episodeSlug);
  } else if (hash.startsWith('#search?q=')) {
    const keyword = decodeURIComponent(hash.split('#search?q=')[1] || '');
    loadSearchView(keyword);
  }
}

// --- Application Bootstrapping ---
document.addEventListener('DOMContentLoaded', () => {
  // 1. Initial State Sync
  updateWatchlistBadge();
  
  // Initialize API Source Selector Dropdown state
  const apiSourceSelect = document.getElementById('api-source-select');
  if (apiSourceSelect) {
    apiSourceSelect.value = apiSource;
    apiSourceSelect.addEventListener('change', () => {
      const selectedValue = apiSourceSelect.value;
      localStorage.setItem('studyflix_api_source', selectedValue);
      apiSource = selectedValue;
      
      // Clear metadata cache for dropdowns to trigger fresh reload
      state.genres = [];
      state.countries = [];
      
      // Force reload the current view by running router
      router();
    });
  }
  
  // 2. Setup Hash Router
  window.addEventListener('hashchange', router);
  router(); // Run initially
  
  // 3. Search Bar Event Listeners
  const searchInput = document.getElementById('search-input');
  const searchClearBtn = document.getElementById('search-clear-btn');
  
  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        if (query) {
          window.location.hash = `#search?q=${encodeURIComponent(query)}`;
        }
      }
    });
    
    searchInput.addEventListener('input', () => {
      if (searchInput.value.length > 0) {
        searchClearBtn.style.display = 'block';
      } else {
        searchClearBtn.style.display = 'none';
      }
    });
  }
  
  if (searchClearBtn) {
    searchClearBtn.addEventListener('click', () => {
      searchInput.value = '';
      searchClearBtn.style.display = 'none';
      window.location.hash = '#home';
    });
  }
  
  // 4. Developer Panel Interactions
  const devPanel = document.getElementById('dev-panel');
  const devBtn = document.getElementById('btn-toggle-dev');
  const closeDevBtn = document.getElementById('btn-close-dev');
  
  if (devBtn && devPanel) {
    devBtn.addEventListener('click', () => {
      devPanel.classList.toggle('active');
    });
  }
  
  if (closeDevBtn && devPanel) {
    closeDevBtn.addEventListener('click', () => {
      devPanel.classList.remove('active');
    });
  }
  
  // Copy URL button in dev panel
  const copyBtn = document.getElementById('dev-copy-url');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const urlText = document.getElementById('dev-api-url').textContent;
      if (urlText && urlText !== 'Chưa có request nào') {
        navigator.clipboard.writeText(urlText)
          .then(() => alert('Đã sao chép link API vào Clipboard!'))
          .catch(() => alert('Sao chép lỗi.'));
      }
    });
  }
  
  // Dev Tab Navigation
  const devTabButtons = document.querySelectorAll('.dev-tab-btn');
  devTabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      devTabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const tabTarget = btn.getAttribute('data-tab');
      document.querySelectorAll('.dev-tab-content').forEach(c => c.classList.remove('active'));
      document.getElementById(tabTarget).classList.add('active');
    });
  });
  
  // 5. Watch Settings Changes (Server toggle HLS/Embed)
  const serverSelect = document.getElementById('server-mode-select');
  if (serverSelect) {
    serverSelect.addEventListener('change', () => {
      if (state.currentEpisode) {
        initializeVideoPlayer(state.currentEpisode);
      }
    });
  }
  
  // 6. Pagination Page button hooks (Home & Filter)
  // Home Pagination
  document.querySelector('.btn-prev-page').onclick = () => {
    if (state.currentPage > 1) {
      state.currentPage--;
      loadHomeView();
    }
  };
  document.querySelector('.btn-next-page').onclick = () => {
    if (state.currentPage < state.totalPages) {
      state.currentPage++;
      loadHomeView();
    }
  };
  
  // Filter Apply
  const filterBtn = document.getElementById('btn-apply-filter');
  if (filterBtn) {
    filterBtn.onclick = () => executeFilterQuery(1);
  }
  
  // Filter Pagination buttons
  document.querySelector('.btn-prev-filter').onclick = () => {
    if (state.currentPage > 1) {
      executeFilterQuery(state.currentPage - 1);
    }
  };
  document.querySelector('.btn-next-filter').onclick = () => {
    if (state.currentPage < state.totalPages) {
      executeFilterQuery(state.currentPage + 1);
    }
  };
  
  // Clear History
  const clearHistoryBtn = document.getElementById('btn-clear-history');
  if (clearHistoryBtn) {
    clearHistoryBtn.onclick = () => {
      if (confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử xem phim?")) {
        state.history = [];
        localStorage.removeItem('studyflix_history');
        renderHistoryList();
      }
    };
  }
});
