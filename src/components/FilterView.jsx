import React, { useState, useEffect } from 'react';
import MovieCard from './MovieCard.jsx';
import SkeletonCard from './SkeletonCard.jsx';
import { fetchAPI, getAPIBase } from '../utils.js';

export default function FilterView({ initialType = 'phim-moi-cap-nhat', searchQuery = '', apiSource, onLogRequest, onLogResponse }) {
  const [type, setType] = useState(initialType);
  const [genre, setGenre] = useState('');
  const [country, setCountry] = useState('');
  const [year, setYear] = useState('');

  const [genresList, setGenresList] = useState([]);
  const [countriesList, setCountriesList] = useState([]);
  const [yearsList, setYearsList] = useState([]);

  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [resultsTitle, setResultsTitle] = useState('Kết Quả Lọc');

  // 1. Generate years list from current year down to 2010
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = currentYear; y >= 2010; y--) {
      years.push(y);
    }
    setYearsList(years);
  }, []);

  // 2. Fetch genres and countries metadata
  useEffect(() => {
    async function loadMetadata() {
      try {
        const genresData = await fetchAPI('/the-loai', apiSource, false);
        setGenresList(Array.isArray(genresData) ? genresData : (genresData.value || []));

        const countriesData = await fetchAPI('/quoc-gia', apiSource, false);
        setCountriesList(Array.isArray(countriesData) ? countriesData : (countriesData.value || []));
      } catch (err) {
        console.error('Error loading metadata:', err);
      }
    }
    loadMetadata();
  }, [apiSource]);

  // 3. Trigger initial filtering or search query execution
  useEffect(() => {
    if (searchQuery) {
      executeSearch(1);
    } else {
      executeFilter(1);
    }
  }, [searchQuery, apiSource]);

  const executeSearch = async (page = 1) => {
    setLoading(true);
    setCurrentPage(page);
    try {
      const data = await fetchAPI(
        `/v1/api/tim-kiem?keyword=${encodeURIComponent(searchQuery)}&page=${page}`,
        apiSource,
        false,
        onLogRequest,
        onLogResponse
      );
      const items = data.data?.items || [];
      setMovies(items);
      setTotalPages(data.data?.params?.pagination?.totalPages || 1);
      
      const totalItems = data.data?.params?.pagination?.totalItems || items.length;
      setResultsTitle(`Kết Quả Tìm Kiếm Cho: "${searchQuery}" (${totalItems} kết quả)`);
    } catch (err) {
      console.error('Search request error:', err);
      setMovies([]);
      setResultsTitle('Lỗi Tìm Kiếm');
    } finally {
      setLoading(false);
    }
  };

  const executeFilter = async (page = 1) => {
    setLoading(true);
    setCurrentPage(page);
    
    let endpoint = '';
    let isFullURL = false;
    
    const apiBase = getAPIBase(apiSource);

    if (genre) {
      endpoint = `${apiBase}/v1/api/the-loai/${genre}?page=${page}`;
      isFullURL = true;
    } else if (country) {
      endpoint = `${apiBase}/v1/api/quoc-gia/${country}?page=${page}`;
      isFullURL = true;
    } else if (type && type !== 'phim-moi-cap-nhat') {
      endpoint = `${apiBase}/v1/api/danh-sach/${type}?page=${page}&year=${year}`;
      isFullURL = true;
    } else {
      endpoint = `/danh-sach/phim-moi-cap-nhat?page=${page}`;
      isFullURL = false;
    }

    try {
      const data = await fetchAPI(
        endpoint,
        apiSource,
        isFullURL,
        onLogRequest,
        onLogResponse
      );

      let items = [];
      let pages = 1;

      if (isFullURL) {
        items = data.data?.items || [];
        pages = data.data?.params?.pagination?.totalPages || 1;
      } else {
        items = data.items || [];
        pages = data.pagination?.totalPages || 1;
      }

      // Handle frontend manual filtering of year if year is specified but API endpoint doesn't support it directly
      if (year && (genre || country)) {
        items = items.filter(m => m.year === parseInt(year));
      }

      setMovies(items);
      setTotalPages(pages);
      setResultsTitle(`Kết Quả Lọc (${items.length} Phim)`);
    } catch (err) {
      console.error('Filter request error:', err);
      setMovies([]);
      setResultsTitle('Lỗi Lọc Phim');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilter = () => {
    executeFilter(1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      if (searchQuery) {
        executeSearch(currentPage - 1);
      } else {
        executeFilter(currentPage - 1);
      }
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      if (searchQuery) {
        executeSearch(currentPage + 1);
      } else {
        executeFilter(currentPage + 1);
      }
    }
  };

  return (
    <section id="view-filter" className="content-view active">
      {/* Search has no filter panel headers */}
      {!searchQuery && (
        <div className="filter-header-card">
          <h1>Bộ Lọc Phim Thông Minh</h1>
          <p>Tìm kiếm và lọc phim theo nhiều tiêu chí khác nhau.</p>

          <div className="filter-controls-grid">
            <div className="filter-control">
              <label htmlFor="filter-type">Loại Phim</label>
              <select
                id="filter-type"
                value={type}
                onChange={(e) => {
                  setType(e.target.value);
                  // Reset conflicting genres/countries to execute normal type queries
                  setGenre('');
                  setCountry('');
                }}
              >
                <option value="phim-moi-cap-nhat">Mới cập nhật</option>
                <option value="phim-le">Phim Lẻ (Một tập)</option>
                <option value="phim-bo">Phim Bộ (Nhiều tập)</option>
                <option value="hoat-hinh">Hoạt Hình</option>
                <option value="tv-shows">TV Shows</option>
                <option value="phim-chieu-rap">Phim Chiếu Rạp</option>
              </select>
            </div>
            <div className="filter-control">
              <label htmlFor="filter-genre">Thể Loại</label>
              <select
                id="filter-genre"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
              >
                <option value="">Tất Cả Thể Loại</option>
                {genresList.map(g => (
                  <option key={g.slug} value={g.slug}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-control">
              <label htmlFor="filter-country">Quốc Gia</label>
              <select
                id="filter-country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              >
                <option value="">Tất Cả Quốc Gia</option>
                {countriesList.map(c => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-control">
              <label htmlFor="filter-year">Năm</label>
              <select
                id="filter-year"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              >
                <option value="">Tất Cả Năm</option>
                {yearsList.map(y => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-control d-flex align-items-end">
              <button id="btn-apply-filter" className="btn btn-primary w-100" onClick={handleApplyFilter}>
                <i className="bx bx-filter-alt"></i> Lọc Phim
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results grid */}
      <div className="movies-section mt-4">
        <div className="section-header">
          <h2 id="filter-results-title">{resultsTitle}</h2>
          <div className="pagination-controls" id="filter-pagination">
            <button className="btn-page btn-prev-filter" onClick={handlePrevPage} disabled={currentPage === 1 || loading}>
              <i className="bx bx-chevron-left"></i>
            </button>
            <span className="page-indicator filter-page-indicator">
              Trang {currentPage} / {totalPages}
            </span>
            <button className="btn-page btn-next-filter" onClick={handleNextPage} disabled={currentPage >= totalPages || loading}>
              <i className="bx bx-chevron-right"></i>
            </button>
          </div>
        </div>
        <div id="filter-movies-grid" className="movies-grid">
          {loading ? (
            <SkeletonCard count={10} />
          ) : movies.length === 0 ? (
            <div className="empty-state">
              <i className="bx bx-confused"></i>
              <p>Không tìm thấy phim nào phù hợp.</p>
            </div>
          ) : (
            movies.map(movie => (
              <MovieCard key={movie.slug} movie={movie} apiSource={apiSource} />
            ))
          )}
        </div>
      </div>
    </section>
  );
}
