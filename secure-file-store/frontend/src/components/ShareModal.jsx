import { useState } from 'react';
import { Copy, Check, X } from 'lucide-react';

export default function ShareModal({ file, onClose }) {
  const shareUrl = `${window.location.origin}/share/${file.shareToken}`;
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="modal-overlay" onClick={onClose} id="share-modal-overlay">
      <div className="modal" onClick={(e) => e.stopPropagation()} id="share-modal">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 className="modal-title" style={{ marginBottom: 0 }}>Share File</h3>
          <button className="icon-btn" onClick={onClose} id="btn-close-share-modal">
            <X size={16} />
          </button>
        </div>

        <div className="modal-section">
          <p className="modal-section-label">Anyone with this link can view and download the file.</p>
          <div className="share-link-row">
            <input
              className="share-link-input"
              readOnly
              value={shareUrl}
              onFocus={(e) => e.target.select()}
              id="share-link-input"
            />
            <button className="btn btn-primary btn-sm" onClick={handleCopy} id="btn-copy-link">
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        <div className="modal-section" style={{ marginTop: '1rem' }}>
          <p className="modal-section-label">File</p>
          <p style={{ fontSize: '0.85rem', fontWeight: 500 }}>{file.originalName}</p>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost btn-sm" onClick={onClose} id="btn-done-share">Done</button>
        </div>
      </div>
    </div>
  );
}
