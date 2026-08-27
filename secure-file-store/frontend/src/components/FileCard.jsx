import { useState } from 'react';
import { Download, Share2, Trash2, Globe, Lock } from 'lucide-react';
import api from '../lib/api';
import ShareModal from './ShareModal';
import ConfirmDeleteModal from './ConfirmDeleteModal';

const FILE_ICONS = {
  image: { emoji: '🖼️', bg: 'rgba(251,191,36,0.12)' },
  video: { emoji: '🎬', bg: 'rgba(239,68,68,0.1)' },
  audio: { emoji: '🎵', bg: 'rgba(168,85,247,0.1)' },
  pdf:   { emoji: '📄', bg: 'rgba(239,68,68,0.1)' },
  zip:   { emoji: '🗜️', bg: 'rgba(245,158,11,0.1)' },
  doc:   { emoji: '📝', bg: 'rgba(59,130,246,0.1)' },
  default: { emoji: '📁', bg: 'rgba(108,99,255,0.1)' },
};

function getFileIcon(mimeType) {
  if (mimeType.startsWith('image/')) return FILE_ICONS.image;
  if (mimeType.startsWith('video/')) return FILE_ICONS.video;
  if (mimeType.startsWith('audio/')) return FILE_ICONS.audio;
  if (mimeType === 'application/pdf') return FILE_ICONS.pdf;
  if (mimeType.includes('zip') || mimeType.includes('tar') || mimeType.includes('gzip')) return FILE_ICONS.zip;
  if (mimeType.includes('word') || mimeType.includes('document')) return FILE_ICONS.doc;
  return FILE_ICONS.default;
}

function formatBytes(bytes) {
  const n = parseInt(bytes, 10);
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function FileCard({ file, onDeleted, onUpdated, listMode = false }) {
  const [showShare, setShowShare] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [actionError, setActionError] = useState('');

  const icon = getFileIcon(file.mimeType);

  async function handleDownload() {
    const win = window.open('', '_blank');
    setDownloading(true);
    setActionError('');
    try {
      const { data } = await api.get(`/files/${file.id}`);
      if (win) win.location.href = data.file.downloadUrl;
    } catch {
      if (win) win.close();
      setActionError('Download failed. Please try again.');
    } finally {
      setDownloading(false);
    }
  }

  async function handleToggleVisibility() {
    setToggling(true);
    setActionError('');
    try {
      const newVisibility = file.visibility === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC';
      const { data } = await api.patch(`/files/${file.id}/visibility`, { visibility: newVisibility });
      onUpdated(data.file);
    } catch {
      setActionError('Failed to update visibility.');
    } finally {
      setToggling(false);
    }
  }

  async function handleDelete() {
    setShowConfirm(false);
    setDeleting(true);
    setActionError('');
    try {
      await api.delete(`/files/${file.id}`);
      onDeleted(file.id);
    } catch {
      setActionError('Delete failed. Please try again.');
    } finally {
      setDeleting(false);
    }
  }

  // Shared action buttons (used in both grid and list view)
  const actionButtons = (
    <div className="file-actions">
      <button
        className="icon-btn accent"
        title="Download"
        onClick={handleDownload}
        disabled={downloading}
        id={`btn-download-${file.id}`}
      >
        {downloading ? <span className="spinner" style={{ width: 13, height: 13 }} /> : <Download size={15} />}
      </button>

      <button
        className="icon-btn"
        title={file.visibility === 'PUBLIC' ? 'Make Private' : 'Make Public'}
        onClick={handleToggleVisibility}
        disabled={toggling}
        id={`btn-toggle-${file.id}`}
      >
        {toggling
          ? <span className="spinner" style={{ width: 13, height: 13 }} />
          : file.visibility === 'PUBLIC' ? <Lock size={15} /> : <Globe size={15} />}
      </button>

      {file.visibility === 'PUBLIC' && (
        <button
          className="icon-btn accent"
          title="Copy share link"
          onClick={() => setShowShare(true)}
          id={`btn-share-${file.id}`}
        >
          <Share2 size={15} />
        </button>
      )}

      <button
        className="icon-btn danger"
        title="Delete"
        onClick={() => setShowConfirm(true)}
        disabled={deleting}
        id={`btn-delete-${file.id}`}
      >
        {deleting ? <span className="spinner" style={{ width: 13, height: 13 }} /> : <Trash2 size={15} />}
      </button>
    </div>
  );

  // ── List mode: only actions, no card shell (FileGrid renders the row)
  if (listMode) {
    return (
      <>
        {actionButtons}
        {showShare && <ShareModal file={file} onClose={() => setShowShare(false)} />}
        {showConfirm && (
          <ConfirmDeleteModal
            fileName={file.originalName}
            onConfirm={handleDelete}
            onCancel={() => setShowConfirm(false)}
          />
        )}
      </>
    );
  }

  // ── Grid mode: full card
  return (
    <>
      <div className="file-card">
        <div className="file-card-header">
          <div className="file-icon" style={{ background: icon.bg }}>
            {icon.emoji}
          </div>
          <div className="file-meta">
            <div className="file-name" title={file.originalName}>{file.originalName}</div>
            <div className="file-info">{formatBytes(file.sizeBytes)} · {formatDate(file.uploadedAt)}</div>
          </div>
        </div>

        <div className="file-card-footer">
          <span className={`badge badge-${file.visibility.toLowerCase()}`}>
            {file.visibility === 'PUBLIC' ? <Globe size={10} /> : <Lock size={10} />}
            {file.visibility}
          </span>
          {actionButtons}
        </div>

        {actionError && (
          <p style={{ fontSize: '0.72rem', color: 'var(--danger)', marginTop: '0.25rem' }}>
            {actionError}
          </p>
        )}
      </div>

      {showShare && <ShareModal file={file} onClose={() => setShowShare(false)} />}
      {showConfirm && (
        <ConfirmDeleteModal
          fileName={file.originalName}
          onConfirm={handleDelete}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  );
}
