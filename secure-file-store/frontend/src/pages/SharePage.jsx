import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Download, Shield, AlertCircle } from 'lucide-react';
import axios from 'axios'; // raw axios — no auth interceptor, public endpoint

function formatBytes(bytes) {
  const n = parseInt(bytes, 10);
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

function getFileEmoji(mimeType) {
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.startsWith('video/')) return '🎬';
  if (mimeType.startsWith('audio/')) return '🎵';
  if (mimeType === 'application/pdf') return '📄';
  if (mimeType.includes('zip') || mimeType.includes('tar')) return '🗜️';
  if (mimeType.includes('word')) return '📝';
  return '📁';
}

export default function SharePage() {
  const { shareToken } = useParams();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!shareToken) return;
    // Use raw axios — this is a public endpoint, no auth needed and we
    // don't want the api interceptor trying to refresh tokens here.
    axios
      .get(`/api/v1/files/share/${shareToken}`)
      .then(({ data }) => setFile(data.file))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [shareToken]);

  return (
    <div className="share-page">
      {loading && <span className="spinner" style={{ width: 40, height: 40 }} />}

      {notFound && (
        <div className="share-card">
          <AlertCircle size={48} style={{ color: 'var(--danger)', margin: '0 auto 1rem' }} />
          <h2 style={{ marginBottom: '0.5rem' }}>File Not Found</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            This file doesn't exist or is no longer publicly shared.
          </p>
          <div style={{ marginTop: '1.5rem' }}>
            <Link to="/login" className="btn btn-primary" id="link-to-login">
              <Shield size={15} /> Go to SecureVault
            </Link>
          </div>
        </div>
      )}

      {file && (
        <div className="share-card">
          <div className="share-file-icon" style={{ background: 'var(--accent-dim)', fontSize: '2.5rem' }}>
            {getFileEmoji(file.mimeType)}
          </div>

          <h1 className="share-file-name">{file.originalName}</h1>
          <p className="share-meta">Shared by <strong>@{file.uploadedBy}</strong></p>

          <div className="share-divider" />

          {[
            { label: 'File size', value: formatBytes(file.sizeBytes) },
            { label: 'Type',      value: file.mimeType },
            { label: 'Uploaded',  value: formatDate(file.uploadedAt) },
          ].map(({ label, value }) => (
            <div className="share-info-row" key={label}>
              <span className="share-info-label">{label}</span>
              <span style={{ fontWeight: 500, wordBreak: 'break-all', textAlign: 'right', maxWidth: '60%' }}>{value}</span>
            </div>
          ))}

          <div style={{ marginTop: '2rem' }}>
            <a
              href={file.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
              id="btn-download-public"
            >
              <Download size={16} /> Download File
            </a>
          </div>

          <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
            <Link to="/login" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <Shield size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              Powered by SecureVault
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
