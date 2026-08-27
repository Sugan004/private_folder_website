import { FolderOpen, Download, Eye, EyeOff, Trash2 } from 'lucide-react';
import FileCard from './FileCard';

function formatBytes(bytes) {
  const n = parseInt(bytes, 10);
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

function getMimeEmoji(mimeType) {
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.startsWith('video/')) return '🎬';
  if (mimeType.startsWith('audio/')) return '🎵';
  if (mimeType === 'application/pdf') return '📄';
  if (mimeType.includes('zip') || mimeType.includes('tar')) return '🗜️';
  if (mimeType.includes('word') || mimeType.includes('presentation') || mimeType.includes('spreadsheet')) return '📝';
  return '📁';
}

function ListRow({ file, onDeleted, onUpdated }) {
  const isPublic = file.visibility === 'PUBLIC';
  const date = new Date(file.uploadedAt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <div className="list-row">
      <span className="list-row-icon">{getMimeEmoji(file.mimeType)}</span>
      <div className="list-row-name" title={file.originalName}>{file.originalName}</div>
      <span className="list-row-size">{formatBytes(file.sizeBytes)}</span>
      <span className={`list-row-badge ${isPublic ? 'badge-public' : 'badge-private'}`}>
        {isPublic ? 'Public' : 'Private'}
      </span>
      <span className="list-row-date">{date}</span>
      {/* Reuse FileCard actions but in compact form — just render the full card invisible for logic */}
      <div className="list-row-actions">
        <FileCard file={file} onDeleted={onDeleted} onUpdated={onUpdated} listMode />
      </div>
    </div>
  );
}

export default function FileGrid({ files, onDeleted, onUpdated, viewMode = 'grid' }) {
  if (files.length === 0) {
    return (
      <div className={viewMode === 'grid' ? 'file-grid' : 'file-list'}>
        <div className="empty-state">
          <FolderOpen size={56} className="empty-state-icon" />
          <h3>No files yet</h3>
          <p>Upload your first file using the drop zone above.</p>
        </div>
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div className="file-list">
        <div className="list-header">
          <span style={{ width: 32 }} />
          <span style={{ flex: 1 }}>Name</span>
          <span style={{ width: 80 }}>Size</span>
          <span style={{ width: 72 }}>Visibility</span>
          <span style={{ width: 110 }}>Uploaded</span>
          <span style={{ width: 100 }}>Actions</span>
        </div>
        {files.map((file) => (
          <ListRow key={file.id} file={file} onDeleted={onDeleted} onUpdated={onUpdated} />
        ))}
      </div>
    );
  }

  return (
    <div className="file-grid">
      {files.map((file) => (
        <FileCard key={file.id} file={file} onDeleted={onDeleted} onUpdated={onUpdated} />
      ))}
    </div>
  );
}
