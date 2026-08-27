import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, LayoutGrid, List, ArrowUpDown } from 'lucide-react';
import Navbar from '../components/Navbar';
import FileUploader from '../components/FileUploader';
import FileGrid from '../components/FileGrid';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

const PAGE_SIZE = 50;

const SORT_OPTIONS = [
  { value: 'uploadedAt:desc', label: 'Newest first' },
  { value: 'uploadedAt:asc',  label: 'Oldest first' },
  { value: 'originalName:asc', label: 'Name A → Z' },
  { value: 'originalName:desc', label: 'Name Z → A' },
  { value: 'sizeBytes:desc',  label: 'Largest first' },
  { value: 'sizeBytes:asc',   label: 'Smallest first' },
];

export default function DashboardPage() {
  const { user } = useAuth();

  const [files, setFiles]       = useState([]);
  const [total, setTotal]       = useState(0);
  const [quota, setQuota]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  const [search, setSearch]     = useState('');
  const [filter, setFilter]     = useState('all');
  const [sort, setSort]         = useState('uploadedAt:desc');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [offset, setOffset]     = useState(0);

  const debounceRef = useRef(null);

  const fetchFiles = useCallback(async (searchVal, filterVal, sortVal, offsetVal) => {
    try {
      setError('');
      setLoading(true);

      const [sortBy, sortOrder] = sortVal.split(':');
      const params = { limit: PAGE_SIZE, offset: offsetVal, sortBy, sortOrder };
      if (searchVal)           params.search     = searchVal;
      if (filterVal !== 'all') params.visibility = filterVal.toUpperCase();

      const { data } = await api.get('/files', { params });
      setFiles(data.files);
      setTotal(data.total);
      if (data.quota) setQuota(data.quota);
    } catch {
      setError('Failed to load files. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles(search, filter, sort, offset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, sort, offset]);

  function handleSearchChange(e) {
    const val = e.target.value;
    setSearch(val);
    setOffset(0);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchFiles(val, filter, sort, 0), 350);
  }

  function handleFilterChange(f) { setFilter(f); setOffset(0); }
  function handleSortChange(e)   { setSort(e.target.value); setOffset(0); }

  function handleUploaded(file) { setFiles((p) => [file, ...p]); setTotal((t) => t + 1); }
  function handleDeleted(id)    { setFiles((p) => p.filter((f) => f.id !== id)); setTotal((t) => t - 1); }
  function handleUpdated(upd)   { setFiles((p) => p.map((f) => f.id === upd.id ? upd : f)); }

  function formatBytes(n) {
    n = parseInt(n, 10);
    if (n < 1024) return `${n} B`;
    if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
    if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
    return `${(n / 1024 ** 3).toFixed(2)} GB`;
  }

  const totalSize    = files.reduce((s, f) => s + parseInt(f.sizeBytes, 10), 0);
  const publicCount  = files.filter((f) => f.visibility === 'PUBLIC').length;
  const privateCount = files.filter((f) => f.visibility === 'PRIVATE').length;
  const totalPages   = Math.ceil(total / PAGE_SIZE);
  const currentPage  = Math.floor(offset / PAGE_SIZE) + 1;

  // Quota bar
  const quotaUsed  = quota ? parseInt(quota.usedBytes, 10) : 0;
  const quotaLimit = quota ? parseInt(quota.limitBytes, 10) : 1;
  const quotaPct   = Math.min(100, (quotaUsed / quotaLimit) * 100);
  const quotaColor = quotaPct > 90 ? 'var(--danger)' : quotaPct > 70 ? '#f59e0b' : 'var(--accent)';

  return (
    <>
      <Navbar />
      <main className="dashboard">
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">My Vault</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Welcome back, <strong style={{ color: 'var(--text-primary)' }}>@{user?.username}</strong>
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="dashboard-stats">
          {[
            { value: total,                label: 'Total Files' },
            { value: publicCount,          label: 'Public' },
            { value: privateCount,         label: 'Private' },
            { value: formatBytes(totalSize), label: 'Page Storage' },
          ].map(({ value, label }) => (
            <div className="stat-card" key={label}>
              <div className="stat-value">{value}</div>
              <div className="stat-label">{label}</div>
            </div>
          ))}
        </div>

        {/* Quota bar */}
        {quota && (
          <div className="quota-bar-wrap">
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              <span>Storage Quota</span>
              <span style={{ color: quotaColor }}>
                {formatBytes(quota.usedBytes)} / {formatBytes(quota.limitBytes)}
              </span>
            </div>
            <div className="quota-bar-track">
              <div className="quota-bar-fill" style={{ width: `${quotaPct}%`, background: quotaColor }} />
            </div>
          </div>
        )}

        <FileUploader onUploaded={handleUploaded} />

        {/* Toolbar */}
        <div className="toolbar">
          <div className="search-wrap">
            <Search size={15} className="search-icon" />
            <input
              id="search-files"
              className="input-field search-input"
              placeholder="Search files…"
              value={search}
              onChange={handleSearchChange}
            />
          </div>

          {/* Visibility filter */}
          {['all', 'public', 'private'].map((f) => (
            <button
              key={f}
              className={`filter-btn${filter === f ? ' active' : ''}`}
              onClick={() => handleFilterChange(f)}
              id={`filter-${f}`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}

          {/* Sort dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginLeft: 'auto' }}>
            <ArrowUpDown size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <select
              id="sort-files"
              value={sort}
              onChange={handleSortChange}
              className="filter-select"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* View mode toggle */}
          <div className="view-toggle">
            <button
              className={`view-toggle-btn${viewMode === 'grid' ? ' active' : ''}`}
              onClick={() => setViewMode('grid')}
              id="btn-view-grid"
              title="Grid view"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              className={`view-toggle-btn${viewMode === 'list' ? ' active' : ''}`}
              onClick={() => setViewMode('list')}
              id="btn-view-list"
              title="List view"
            >
              <List size={15} />
            </button>
          </div>
        </div>

        {error && <p style={{ color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</p>}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <span className="spinner" style={{ width: 32, height: 32 }} />
          </div>
        ) : (
          <>
            <FileGrid files={files} onDeleted={handleDeleted} onUpdated={handleUpdated} viewMode={viewMode} />

            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={offset === 0}
                  onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
                  id="btn-prev-page"
                >
                  ← Prev
                </button>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setOffset((o) => o + PAGE_SIZE)}
                  id="btn-next-page"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
