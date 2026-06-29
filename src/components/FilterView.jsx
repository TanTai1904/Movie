import React, { useState, useEffect } from 'react';
import MovieCard from './MovieCard.jsx';
import SkeletonGrid from './SkeletonGrid.jsx';

export default function FilterView({
  initialType = 'phim-moi-cap-nhat',
  searchKeyword = '',
  apiSource,
  fetchAPI
}) {
  const [genres, setGenres] = useState([]);
  const [countries, setCountries] = useState([]);
  const [years, setYears] = useState([]);

  // Filter selections
  const [selectedType, setSelectedType] = useState(initialType);
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedYear, setSelectedYear] = useState('');

  // Results
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Sync initial type when prop changes
  useEffect(() => {
    setSelectedType(initialType);
    setSelectedGenre('');
    setSelectedCountry('');
    setSelectedYear('');
    setCurrentPage(1);
  }, [initialType]);

  // Sync page to 1 when search keyword changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchKeyword]);

  // Load Meta selectors (genres, countries, years) on mount or apiSource change
  useEffect(() => {
    let active = true;

    // Load genres
    fetchAPI('/the-loai')
      .then(res => {
        if (active) {
          const list = Array.isArray(res) ? res : (res.value || []);
          setGenres(list);
        }
      })
      .catch(e => console.error("Error loading genres:", e));

    // Load countries
    fetchAPI('/quoc-gia')
      .then(res => {
        if (active) {
          const list = Array.isArray(res) ? res : (res.value || []);
          setCountries(list);
        }
      })
      .catch(e => console.error("Error loading countries:", e));

    // Load years (from current down to 2010)
    const currentYear = new Date().getFullYear();
    const yearsList = [];
    for (let y = currentYear; y >= 2010; y--) {
      yearsList.push(y);
    }
    setYears(yearsList);

    return () => {
      active = false;
    };
  }, [apiSource]);

  // Execute query on filter change or page change or search change
  useEffect(() => {
    let active = true;
    setLoading(true);

    const base = apiSource === 'ophim' ? 'https://ophim1.com' : 'https://phimapi.com';
    let endpoint = '';
    let isFullURL = false;

    // Check if we are performing a search query
    if (searchKeyword) {
      endpoint = `${base}/v1/api/tim-kiem?keyword=${encodeURIComponent(searchKeyword)}&page=${currentPage}`;
      isFullURL = true;
    } else {
      // Normal filtering
      if (selectedGenre) {
        endpoint = `${base}/v1/api/the-loai/${selectedGenre}?page=${currentPage}`;
        isFullURL = true;
      } else if (selectedCountry) {
        endpoint = `${base}/v1/api/quoc-gia/${selectedCountry}?page=${currentPage}`;
        isFullURL = true;
      } else if (selectedType && selectedType !== 'phim-moi-cap-nhat') {
        endpoint = `${base}/v1/api/danh-sach/${selectedType}?page=${currentPage}&year=${selectedYear}`;
        isFullURL = true;
      } else {
        endpoint = `/danh-sach/phim-moi-cap-nhat?page=${currentPage}`;
        isFullURL = false;
      }
    }

    fetchAPI(endpoint, isFullURL)
      .then(data => {
        if (!active) return;
        let list = [];
        let pagesCount = 1;
        let itemsCount = 0;

        if (isFullURL) {
          list = data.data?.items || [];
          pagesCount = data.data?.params?.pagination?.totalPages || 1;
          itemsCount = data.data?.params?.pagination?.totalItems || list.length;
        } else {
          list = data.items || [];
          pagesCount = data.pagination?.totalPages || 1;
          itemsCount = data.pagination?.totalItems || list.length;
        }

        // Apply manual frontend filter for year if category/genre search doesn't filter it on server
        if (!searchKeyword && selectedYear && (selectedGenre || selectedCountry)) {
          list = list.filter(m => m.year === parseInt(selectedYear));
        }

        setMovies(list);
        setTotalPages(pagesCount);
        setTotalItems(itemsCount);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        if (active) {
          setMovies([]);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [selectedType, selectedGenre, selectedCountry, selectedYear, currentPage, searchKeyword, apiSource]);

  const handleApplyFilter = () => {
    // Just trigger page resets to 1 to refresh the effect
    setCurrentPage(1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  // Determine grid view header text
  const getResultsTitle = () => {
    if (searchKeyword) {
      return `Kết Quả Tìm Kiếm Cho: "${searchKeyword}" (${totalItems} kết quả)`;
    }
    return `Kết Quả Lọc (${movies.length} Phim)`;
  };

  return (
    <section id="view-filter" className="content-view active">
      {/* Display Filter box only if not in search view mode */}
      {!searchKeyword && (
        <div className="filter-header-card">
          <h1>Bộ Lọc Phim Thông Minh</h1>
          <p>Tìm kiếm và lọc phim theo nhiều tiêu chí khác nhau.</p>
          
          <div className="filter-controls-grid">
            <div className="filter-control">
              <label htmlFor="filter-type">Loại Phim</label>
              <select
                id="filter-type"
                value={selectedType}
                onChange={(e) => {
                  setSelectedType(e.target.value);
                  setSelectedGenre('');
                  setSelectedCountry('');
                  setCurrentPage(1);
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
                value={selectedGenre}
                onChange={(e) => {
                  setSelectedGenre(e.target.value);
                  setSelectedCountry(''); // exclusive selection like vanilla app
                  setCurrentPage(1);
                }}
              >
                <option value="">Tất Cả Thể Loại</option>
                {genres.map(g => (
                  <option key={g.slug || g.name} value={g.slug}>{g.name}</option>
                ))}
              </select>
            </div>

            <div className="filter-control">
              <label htmlFor="filter-country">Quốc Gia</label>
              <select
                id="filter-country"
                value={selectedCountry}
                onChange={(e) => {
                  setSelectedCountry(e.target.value);
                  setSelectedGenre(''); // exclusive selection like vanilla app
                  setCurrentPage(1);
                }}
              >
                <option value="">Tất Cả Quốc Gia</option>
                {countries.map(c => (
                  <option key={c.slug || c.name} value={c.slug}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="filter-control">
              <label htmlFor="filter-year">Năm</label>
              <select
                id="filter-year"
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">Tất Cả Năm</option>
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div className="filter-control d-flex align-items-end">
              <button onClick={handleApplyFilter} id="btn-apply-filter" className="btn btn-primary w-100">
                <i className="bx bx-filter-alt"></i> Lọc Phim
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results grid */}
      <div className="movies-section mt-4">
        <div className="section-header">
          <h2 id="filter-results-title">{getResultsTitle()}</h2>
          <div className="pagination-controls" id="filter-pagination">
            <button onClick={handlePrevPage} className="btn-page btn-prev-filter" disabled={currentPage === 1 || loading}>
              <i className="bx bx-chevron-left"></i>
            </button>
            <span className="page-indicator filter-page-indicator">Trang {currentPage} / {totalPages}</span>
            <button onClick={handleNextPage} className="btn-page btn-next-filter" disabled={currentPage >= totalPages || loading}>
              <i className="bx bx-chevron-right"></i>
            </button>
          </div>
        </div>
        <div className="movies-grid">
          {loading ? (
            <SkeletonGrid count={10} />
          ) : movies.length > 0 ? (
            movies.map(movie => (
              <MovieCard key={movie._id || movie.slug} movie={movie} apiSource={apiSource} />
            ))
          ) : (
            <div className="empty-state">
              <i className="bx bx-confused"></i>
              <p>Không tìm thấy phim nào phù hợp.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
